import { MAP_W, MAP_H, TILE, T_TREE, T_RAMP, T_GRASS, T_WATER, T_ORE, T_FORD, T_FARM, COLORS, MAX_HEIGHT, HEIGHT_OFFSET, AIR_HOVER, REGEN_DELAY, CARCASS_DECAY_STEP, CARCASS_DECAY_PCT } from '../config';
import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import type { World } from '../sim/world';
import { isVisible } from '../sim/fog';
import { dist } from '../engine/spatialHash';
import type { Camera } from '../engine/camera';
import type { Entity } from '../sim/entity';
import { getUnitSprites, getBuildingSprites, getTreeSprite, drawTerrainTile, drawWreck } from './sprites';
import { EffectsRenderer } from './effects';

export interface PlacementView { defId: string; valid: boolean; tx: number; ty: number; reason: string }

const TOPAD = MAX_HEIGHT * HEIGHT_OFFSET; // 顶部预留抬升空间

/** 渲染总编排（伪3D）：地形(带岩壁)→实体深度排序→光束→特效→迷雾→放置幽灵→框选 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;             // 系统缩放（fitCanvas注入），世界变换必须乘上它，否则小屏/缩放屏点击错位
  private terrainC: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private fogC: HTMLCanvasElement;
  private fctx: CanvasRenderingContext2D;
  attackMarks = new Map<number, number>(); // 攻击目标标记：targetId -> 过期游戏时间
  effects = new EffectsRenderer();

  constructor(private canvas: HTMLCanvasElement, private world: World) {
    this.ctx = canvas.getContext('2d')!;
    this.terrainC = document.createElement('canvas');
    this.terrainC.width = MAP_W * TILE;
    this.terrainC.height = MAP_H * TILE + TOPAD;
    this.tctx = this.terrainC.getContext('2d')!;
    this.fogC = document.createElement('canvas');
    this.fogC.width = MAP_W * TILE;
    this.fogC.height = MAP_H * TILE + TOPAD;
    this.fctx = this.fogC.getContext('2d')!;
    this.rebuildTerrain();
    this.effects.load();
  }

  rebuildTerrain(): void {
    const t = this.world.terrain;
    for (let i = 0; i < t.length; i++) this.drawTile(i, t[i]);
  }

  /** 重绘世界标记的脏地块（树被砍/矿采完） */
  patchDirty(): void {
    if (this.world.dirtyTiles.size === 0) return;
    for (const i of this.world.dirtyTiles) this.drawTile(i, this.world.terrain[i]);
    this.world.dirtyTiles.clear();
  }

  private tileY(py: number, h: number): number { return py + TOPAD - h * HEIGHT_OFFSET; }

  private drawTile(i: number, kind: number): void {
    const tx = i % MAP_W, ty = (i / MAP_W) | 0;
    const px = tx * TILE, py = ty * TILE;
    const h = this.world.height[i];
    const ctx = this.tctx;

    // 基础地块（抬高绘制）
    const dy = this.tileY(py, h);
    ctx.save();
    ctx.translate(0, dy - py);
    drawTerrainTile(ctx, kind, px, py, i, h, kind === T_FARM ? this.world.farmStage[i] : -1);
    if (kind === T_TREE) {
      const spr = getTreeSprite(i * 7 + 3);
      ctx.drawImage(spr, px + TILE / 2 - spr.width / 2, py + TILE / 2 - spr.height / 2);
    }
    ctx.restore();

    // 坡道：斜纹表现坡面
    if (kind === T_RAMP) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(px + 4 + k * 10, dy + TILE - 2);
        ctx.lineTo(px + TILE - 4 - k * 10, dy + 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 高地层块感：只在真实边界画沿——北侧更低画亮沿（崖顶），东西更低画细暗线
    if (h > 0) {
      const hN = ty > 0 ? this.world.height[(ty - 1) * MAP_W + tx] : 0;
      const hW = tx > 0 ? this.world.height[ty * MAP_W + (tx - 1)] : 0;
      const hE = tx < MAP_W - 1 ? this.world.height[ty * MAP_W + (tx + 1)] : 0;
      if (hN < h) {
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(px, dy, TILE, 2);
      }
      if (hW < h) {
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        ctx.fillRect(px, dy, 2, TILE);
      }
      if (hE < h) {
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        ctx.fillRect(px + TILE - 2, dy, 2, TILE);
      }
    }

    // 悬崖南壁：正下方邻格更低 → 画垂直岩壁
    if (ty + 1 < MAP_H) {
      const hS = this.world.height[(ty + 1) * MAP_W + tx];
      if (hS < h) {
        const faceH = (h - hS) * HEIGHT_OFFSET;
        const top = dy + TILE;
        ctx.fillStyle = '#63503c';
        ctx.fillRect(px, top, TILE, faceH);
        ctx.fillStyle = '#4c3b2c';
        ctx.fillRect(px, top + faceH * 0.55, TILE, faceH * 0.45);
        ctx.fillStyle = '#8a7052';
        ctx.fillRect(px, top, TILE, 2); // 崖顶亮沿
        // 岩壁裂纹点缀
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        for (let k = 0; k < 2; k++) {
          const rx = px + 6 + ((i * 13 + k * 7) % (TILE - 12));
          const ry = top + 4 + ((i * 5 + k * 11) % Math.max(1, faceH - 8));
          ctx.fillRect(rx, ry, 2, Math.min(5, faceH - 6));
        }
      }
    }
  }

  /** 注入系统缩放比（在fitCanvas时调用），画布底层像素 = CSS尺寸 × dpr */
  setDpr(dpr: number): void { this.dpr = dpr; }

  render(cam: Camera, sel: Set<number>, placement: PlacementView | null, dragBox: { ax: number; ay: number; bx: number; by: number } | null, paintTiles?: { x0: number; y0: number; x1: number; y1: number } | null): void {
    const ctx = this.ctx;
    const { viewW, viewH, zoom } = cam;

    // 每帧自建DPR基座，不受外部transform污染
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#07090c';
    ctx.fillRect(0, 0, viewW, viewH);

    // 相机世界变换（叠加在DPR基座之上）
    ctx.save();
    ctx.setTransform(zoom * this.dpr, 0, 0, zoom * this.dpr,
      (viewW / 2 - cam.x * zoom) * this.dpr, (viewH / 2 - cam.y * zoom) * this.dpr);
    ctx.imageSmoothingEnabled = true;

    // 地形（画布自带顶部预留，向上一吐为快）
    ctx.drawImage(this.terrainC, 0, -TOPAD);

    // 麦田铺设预览：金色=可开垦，暗红=不可
    if (paintTiles) {
      for (let ty = paintTiles.y0; ty <= paintTiles.y1; ty++) {
        for (let tx = paintTiles.x0; tx <= paintTiles.x1; tx++) {
          const i = ty * MAP_W + tx;
          const ok = this.world.terrain[i] === T_GRASS && !this.world.occupied[i] && this.world.farmOwner[i] === 0;
          const fy = this.tileY(ty * TILE, this.world.height[i]);
          ctx.fillStyle = ok ? 'rgba(240,200,90,.30)' : 'rgba(200,70,50,.28)';
          ctx.fillRect(tx * TILE, fy, TILE, TILE);
          ctx.strokeStyle = ok ? 'rgba(255,220,120,.75)' : 'rgba(255,110,90,.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx * TILE + 0.5, fy + 0.5, TILE - 1, TILE - 1);
        }
      }
    }

    // ---- 地面火区（橙红闪烁+烟雾粒） ----
    for (const fz of this.world.fireZones) {
      const age = this.world.time - fz.born;
      const k = age / fz.dur;
      if (k >= 1) continue;
      const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const flick = 0.7 + 0.3 * Math.sin(performance.now() / 80 + fz.x);
      // 地面焦红底
      ctx.fillStyle = `rgba(200,70,20,${0.22 * fade})`;
      ctx.beginPath(); ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2); ctx.fill();
      // 内圈闪烁火焰
      ctx.fillStyle = `rgba(255,${Math.floor(120 + 60 * flick)},30,${0.18 * fade})`;
      ctx.beginPath(); ctx.arc(fz.x, fz.y, fz.radius * 0.6, 0, Math.PI * 2); ctx.fill();
      // 火苗簇
      ctx.fillStyle = `rgba(255,180,60,${0.5 * fade * flick})`;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + fz.seed * 0.1;
        const fx2 = fz.x + Math.cos(a) * fz.radius * 0.5;
        const fy2 = fz.y + Math.sin(a) * fz.radius * 0.5;
        ctx.beginPath(); ctx.arc(fx2, fy2, 3 + flick * 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- 战场遗迹（地面层：尸体/残骸/废墟，末段淡出） ----
    for (const wr of this.world.wrecks) {
      const age = this.world.time - wr.born;
      if (age >= wr.dur) continue;
      const alpha = age > wr.dur - 8 ? Math.max(0, (wr.dur - age) / 8) : 1;
      const hOff = this.world.heightAt(wr.x, wr.y) * HEIGHT_OFFSET;
      ctx.globalAlpha = alpha;
      drawWreck(ctx, wr.kind, wr.x, wr.y - hOff, wr.size, wr.seed);
      ctx.globalAlpha = 1;
    }

    // ---- 野物尸体（剩余bounty份额：肉堆随衰减缩水，提示"快收"） ----
    for (const c of this.world.carcasses) {
      const age = this.world.time - c.born;
      const ratio = Math.max(0, 1 - Math.floor(age / CARCASS_DECAY_STEP) * CARCASS_DECAY_PCT / 100);
      if (ratio <= 0) continue;
      if (c.credit !== 0 && !isVisible(this.world, 0, c.x, c.y)) continue;
      const hOff = this.world.heightAt(c.x, c.y) * HEIGHT_OFFSET;
      const cy = c.y - hOff;
      const r = 3 + 5 * ratio;
      ctx.fillStyle = '#7a2e22';
      ctx.beginPath(); ctx.ellipse(c.x, cy, r, r * 0.6, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a44a35';
      ctx.beginPath(); ctx.ellipse(c.x - r * 0.2, cy - 1, r * 0.55, r * 0.35, 0.4, 0, Math.PI * 2); ctx.fill();
      // 露出的骨头
      ctx.strokeStyle = '#e8dcc0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.x + r * 0.5, cy + r * 0.3);
      ctx.lineTo(c.x + r * 1.1, cy - r * 0.4);
      ctx.stroke();
    }

    // ---- 实体（建筑+单位 按屏幕深度排序，伪3D遮挡正确） ----
    interface D { e: Entity; kind: 'b' | 'u'; depth: number }
    const list: D[] = [];
    for (const e of this.world.entities.values()) {
      if (e.kind === 'unit') {
        if (UNIT_DEFS[e.defId]?.moveClass === 'air') continue; // 空军单独在迷雾上层绘制
        if (e.owner !== 0 && !isVisible(this.world, 0, e.x, e.y)) continue;
      }
      if (e.kind === 'building' && e.owner !== 0 && !explored(this.world, e.x, e.y)) continue;
      list.push({ e, kind: e.kind === 'building' ? 'b' : 'u', depth: e.y - this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET });
    }
    list.sort((a, b) => a.depth - b.depth);

    for (const d of list) {
      const e = d.e;
      if (d.kind === 'b') {
        this.drawBuilding(e, sel, cam.zoom);
      } else {
        this.drawUnit(e, sel, cam.zoom);
      }
    }

    // ---- 岗位空缺标记（v0.18）：缺人的岗位建筑头顶黄色感叹号 ----
    for (const d of list) {
      const e = d.e;
      if (d.kind !== 'b' || !e.done || e.owner !== 0) continue;
      const jobs = BUILDING_DEFS[e.defId].jobs;
      if (!jobs || (e.staffIds?.length ?? 0) >= jobs.slots) continue;
      const hOff = this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET;
      const ty = e.y - e.radius() - 16 - hOff;
      ctx.fillStyle = 'rgba(20,26,34,.85)';
      ctx.beginPath(); ctx.arc(e.x, ty, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd75e';
      ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', e.x, ty + 4);
    }

    // ---- 护盾穹顶 ----
    for (const e of this.world.entities.values()) {
      if (e.kind !== 'building' || e.defId !== 'shieldGen' || !e.done) continue;
      if (e.owner !== 0 && !explored(this.world, e.x, e.y)) continue;
      if ((e.shield ?? 0) <= 0) continue;
      const hOff = this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET;
      const cy = e.y - hOff;
      ctx.fillStyle = 'rgba(110,190,255,.06)';
      ctx.beginPath(); ctx.arc(e.x, cy, 180, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(110,190,255,.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, cy, 180, Math.PI, 0); ctx.stroke();
    }

    // ---- 工作光束（建造/修理/采集）+ 采集目标框 ----
    interface Beam { x0: number; y0: number; x1: number; y1: number; color: string }
    const beams: Beam[] = [];
    const gatherTiles = new Map<number, 'wood' | 'ore'>();
    const now = performance.now();
    for (const e of this.world.entities.values()) {
      if (e.kind !== 'unit') continue;
      if (e.owner !== 0 && !isVisible(this.world, 0, e.x, e.y)) continue;
      if (e.order.kind === 'build' && e.order.targetId != null) {
        const b = this.world.entities.get(e.order.targetId);
        if (b && dist(e.x, e.y, b.x, b.y) <= b.radius() + TILE * 2.6) {
          beams.push({ x0: e.x, y0: e.y - this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET, x1: b.x, y1: b.y - this.world.heightAt(b.x, b.y) * HEIGHT_OFFSET, color: '#ffd76e' });
        }
      } else if (e.order.kind === 'gather' && e.gatherState === 'gathering') {
        const tx = e.resTile % MAP_W, ty = (e.resTile / MAP_W) | 0;
        const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE - this.world.height[e.resTile] * HEIGHT_OFFSET;
        const color = e.order.res === 'wood' ? '#9adf9a' : '#ffd76e';
        beams.push({ x0: e.x, y0: e.y - this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET, x1: cx, y1: cy, color });
        gatherTiles.set(e.resTile, e.order.res!);
      } else if (e.order.kind === 'gather' && e.gatherState === 'toRes') {
        gatherTiles.set(e.resTile, e.order.res!);
      }
    }
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -(now / 40) % 12;
    for (const b of beams) {
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 90);
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x1, b.y1, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    for (const [tile, res] of gatherTiles) {
      const tx = tile % MAP_W, ty = (tile / MAP_W) | 0;
      const hOff = this.world.height[tile] * HEIGHT_OFFSET;
      const x0 = tx * TILE, y0 = ty * TILE - hOff;
      ctx.strokeStyle = res === 'wood' ? 'rgba(154,223,154,.9)' : 'rgba(255,215,110,.9)';
      ctx.lineWidth = 1.5;
      const L = 8;
      const corners: [number, number, number, number][] = [
        [x0, y0, 1, 1], [x0 + TILE, y0, -1, 1], [x0, y0 + TILE, 1, -1], [x0 + TILE, y0 + TILE, -1, -1],
      ];
      for (const [cx2, cy2, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx2 + sx * L, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy * L);
        ctx.stroke();
      }
    }

    // ---- 特效与投射物 ----
    this.effects.draw(ctx, this.world);

    // ---- 迷雾（随高度抬升） ----
    // 集结点旗（选中的生产建筑）：细线连接建筑→旗，认得出是哪个建筑的
    for (const id of sel) {
      const b = this.world.entities.get(id);
      if (!b || b.kind !== 'building' || !b.done || !b.rally) continue;
      if (!BUILDING_DEFS[b.defId].produces) continue;
      const r = b.rally;
      const hOff = this.world.heightAt(b.x, b.y) * HEIGHT_OFFSET;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(240,166,60,.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(b.x, b.y - hOff); ctx.lineTo(r.x, r.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#1a2530';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r.x, r.y - 2); ctx.lineTo(r.x, r.y - 22); ctx.stroke();
      ctx.fillStyle = '#f0a63c';
      ctx.beginPath();
      ctx.moveTo(r.x, r.y - 22); ctx.lineTo(r.x + 12, r.y - 18); ctx.lineTo(r.x, r.y - 14);
      ctx.closePath(); ctx.fill();
    }

    // 贸易路线虚线（选中的商贸站）：金色动脉，己方可见
    for (const id of sel) {
      const b = this.world.entities.get(id);
      if (!b || b.kind !== 'building' || b.defId !== 'tradePost' || !b.done) continue;
      for (const u of this.world.entities.values()) {
        if (u.defId !== 'caravan' || (u.homePostId ?? -1) !== id || u.tradeCampId == null) continue;
        const camp = this.world.entities.get(u.tradeCampId);
        if (!camp) continue;
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255,215,110,.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(camp.x, camp.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,215,110,.9)';
        const mx = (b.x + camp.x) / 2, my = (b.y + camp.y) / 2;
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 攻击目标标记：旋转的红色四段括号，锁定谁一目了然
    for (const [tid, until] of this.attackMarks) {
      if (this.world.time > until) { this.attackMarks.delete(tid); continue; }
      const t = this.world.entities.get(tid);
      if (!t) { this.attackMarks.delete(tid); continue; }
      const tOff = this.world.heightAt(t.x, t.y) * HEIGHT_OFFSET;
      const r = t.radius() + 7;
      const pulse = 0.5 + 0.4 * Math.sin(performance.now() / 110);
      ctx.strokeStyle = `rgba(255,82,58,${pulse})`;
      ctx.lineWidth = 2;
      const spin = performance.now() / 500;
      for (let k = 0; k < 4; k++) {
        const a = spin + k * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y - tOff, r, a, a + Math.PI / 3.2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,82,58,.9)';
      ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼ 攻击', t.x, t.y - tOff - r - 4);
    }

    this.drawFog();
    ctx.drawImage(this.fogC, 0, -TOPAD);

    // ---- 空中层（迷雾之上：悬停+旋翼+投影） ----
    for (const e of this.world.entities.values()) {
      if (e.kind !== 'unit' || UNIT_DEFS[e.defId]?.moveClass !== 'air') continue;
      if (e.owner !== 0 && !isVisible(this.world, 0, e.x, e.y)) continue;
      const def = UNIT_DEFS[e.defId];
      const { hull } = getUnitSprites(e.defId, e.owner);
      const cy = e.y - AIR_HOVER;
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 5, def.radius, def.radius * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      if (sel.has(e.id)) {
        ctx.strokeStyle = COLORS.select;
        ctx.lineWidth = 1.5 / zoom + 0.5;
        ctx.beginPath(); ctx.arc(e.x, cy, def.radius + 5, 0, Math.PI * 2); ctx.stroke();
        const weapon = def.weapon;
        if (weapon && sel.size === 1) {
          ctx.strokeStyle = 'rgba(240,166,60,.42)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(e.x, cy, weapon.range, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,.16)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(e.x, cy, def.vision * TILE, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(e.x, cy);
      ctx.rotate(e.angle);
      ctx.drawImage(hull, -hull.width / 2, -hull.height / 2);
      ctx.restore();
      const spin = performance.now() / 60;
      ctx.save();
      ctx.translate(e.x, cy - 6);
      ctx.rotate(spin);
      ctx.strokeStyle = 'rgba(220,230,240,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 15); ctx.stroke();
      ctx.restore();
      if ((e.armorMax ?? 0) > 0) this.armorBar(e.x, cy - def.radius - 14, 24, (e.armorHp ?? 0) / (e.armorMax ?? 1));
      if (e.hp < def.hp) {
        this.hpBar(e.x, cy - def.radius - 9, 24, e.hp / def.hp);
        if (this.regenActive(e, def.hp)) this.regenDot(e.x - 12, cy - def.radius - 11);
      }
    }

    // ---- 放置幽灵 ----
    if (placement) {
      const def = BUILDING_DEFS[placement.defId];
      const { base } = getBuildingSprites(placement.defId, 0);
      const h = this.world.height[placement.ty * MAP_W + placement.tx] ?? 0;
      const hOff = h * HEIGHT_OFFSET;
      const x0 = placement.tx * TILE - 10, y0 = placement.ty * TILE - 10 - hOff;
      const w = def.size * TILE + 20;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(base, x0, y0, w, w);
      ctx.restore();
      ctx.fillStyle = placement.valid ? 'rgba(90,255,90,.18)' : 'rgba(255,70,50,.28)';
      ctx.fillRect(placement.tx * TILE, placement.ty * TILE - hOff, def.size * TILE, def.size * TILE);
      ctx.strokeStyle = placement.valid ? '#7dff7d' : '#ff6450';
      ctx.lineWidth = 2 / zoom + 0.5;
      ctx.strokeRect(placement.tx * TILE, placement.ty * TILE - hOff, def.size * TILE, def.size * TILE);
    }

    ctx.restore();

    // ---- 屏幕空间 ----
    if (placement && !placement.valid && placement.reason) {
      const s = cam.worldToScreen((placement.tx + BUILDING_DEFS[placement.defId].size / 2) * TILE, placement.ty * TILE);
      ctx.font = '13px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#ffb0a0';
      ctx.textAlign = 'center';
      ctx.fillText(placement.reason, s.x, s.y - 8);
    }
    if (dragBox) {
      const x = Math.min(dragBox.ax, dragBox.bx), y = Math.min(dragBox.ay, dragBox.by);
      const w = Math.abs(dragBox.bx - dragBox.ax), h = Math.abs(dragBox.by - dragBox.ay);
      ctx.fillStyle = 'rgba(120,255,140,.12)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(140,255,160,.85)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }
  }

  private drawBuilding(e: Entity, sel: Set<number>, zoom: number): void {
    const ctx = this.ctx;
    const def = BUILDING_DEFS[e.defId];
    const { base, top } = getBuildingSprites(e.defId, e.owner);
    const hOff = this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET;
    const x0 = e.tx * TILE - 10, y0 = e.ty * TILE - 10 - hOff;
    const w = def.size * TILE + 20;

    if (sel.has(e.id)) {
      ctx.strokeStyle = COLORS.select;
      ctx.lineWidth = 2 / zoom + 1;
      ctx.strokeRect(e.tx * TILE + 1, e.ty * TILE + 1 - hOff, def.size * TILE - 2, def.size * TILE - 2);
      if (sel.size === 1) this.drawRangeRings(e, def.vision); // 多选不画范围圈（防杂乱）
    }

    if (!e.done) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(base, x0, y0, w, w);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      const hh = w * Math.min(1, e.progress);
      ctx.rect(x0, y0 + w - hh, w, hh);
      ctx.clip();
      ctx.drawImage(base, x0, y0, w, w);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,214,110,.75)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(e.tx * TILE + 2, e.ty * TILE + 2 - hOff, def.size * TILE - 4, def.size * TILE - 4);
      ctx.setLineDash([]);
    } else {
      ctx.drawImage(base, x0, y0, w, w);
      if (top) {
        ctx.save();
        ctx.translate(e.x, e.y - hOff);
        ctx.rotate(e.turretAngle);
        ctx.drawImage(top, -top.width / 2, -top.height / 2);
        ctx.restore();
      }
    }
    // 生产中：建筑上方显示进度条 + 单位名 + 脉冲边框
    if (e.done && e.queue && e.queue.length > 0) {
      const item = e.queue[0];
      const udef = UNIT_DEFS[item.unitId];
      const prog = 1 - item.remaining / udef.buildTime;
      const barW = def.size * TILE, barH = 6;
      const barX = e.x - barW / 2, barY = e.y - hOff - (def.size * TILE) / 2 - 14;
      // 背景
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      // 进度条（琥珀色渐变）
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#f0a63c');
      grad.addColorStop(1, '#ffd76e');
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW * prog, barH);
      // 脉冲边框（生产中的呼吸灯）
      const pulse = 0.3 + 0.3 * Math.sin(performance.now() / 200);
      ctx.strokeStyle = `rgba(240,166,60,${0.3 + pulse * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);
      // 单位名
      ctx.fillStyle = '#ffd9a0';
      ctx.font = `bold ${10}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(udef.name, e.x, barY - 4);
    }
    if (e.done && (e.hp < def.hp || (e.armorMax ?? 0) > 0 || sel.has(e.id))) {
      const bw = e.radius() * 2;
      if ((e.armorMax ?? 0) > 0) {
        this.armorBar(e.x, e.y - e.radius() - 14 - hOff, bw, (e.armorHp ?? 0) / (e.armorMax ?? 1));
        if (this.regenActive(e, def.hp)) this.regenDot(e.x - bw / 2 - 5, e.y - e.radius() - 12 - hOff);
      }
      this.hpBar(e.x, e.y - e.radius() - 8 - hOff, bw, e.hp / def.hp);
    }
    if (!e.done) this.hpBar(e.x, e.ty * TILE - 6 - hOff, def.size * TILE, e.progress, true);
  }

  private drawUnit(e: Entity, sel: Set<number>, zoom: number): void {
    const ctx = this.ctx;
    const def = UNIT_DEFS[e.defId];
    const { hull, turret } = getUnitSprites(e.defId, e.owner);
    const hOff = this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET;

    if (sel.has(e.id)) {
      ctx.strokeStyle = COLORS.select;
      ctx.lineWidth = 1.5 / zoom + 0.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y - hOff, def.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      if (sel.size === 1) this.drawRangeRings(e, def.vision); // 多选不画范围圈（防杂乱）
    }

    // 机甲：先画双腿（底层），再画车身盖住腿根——只露伸出部分
    if (e.defId === 'mech') {
      const legLen1 = 12;
      const legLen2 = 14;
      const gaitPhase = this.world.time * 4;
      // 只有真正在移动时才播放步态动画；站桩/开火时腿钉死不动
      const isMovingUnit = e.order.kind === 'move' || e.order.kind === 'attackMove' ||
        (e.order.kind === 'attack' && e.path !== null);
      const stride = isMovingUnit ? 12 : 0;

      // ① 先画双腿（底层）
      for (const side of [-1, 1] as const) {
        const hipAng = e.angle + side * Math.PI / 2;
        const hipX = e.x + Math.cos(hipAng) * 14;
        const hipY = e.y - hOff + Math.sin(hipAng) * 14;
        const idealX = e.x + Math.cos(e.angle) * 10 + Math.cos(hipAng) * 16;
        const idealY = e.y - hOff + Math.sin(e.angle) * 8 + Math.sin(hipAng) * 16;
        const gaitOffset = Math.sin(gaitPhase + (side > 0 ? 0 : Math.PI)) * stride;
        const footX = idealX + Math.cos(e.angle) * gaitOffset;
        const footY = idealY + Math.sin(e.angle) * gaitOffset;
        const dx = footX - hipX, dy = footY - hipY;
        const dd = Math.min(Math.hypot(dx, dy), legLen1 + legLen2 - 1);
        const a1 = Math.atan2(dy, dx);
        const cosA = (legLen1 * legLen1 + dd * dd - legLen2 * legLen2) / (2 * legLen1 * dd);
        const a2 = Math.acos(Math.max(-1, Math.min(1, cosA)));
        const kneeAng = a1 - a2 * side;
        const kneeX = hipX + Math.cos(kneeAng) * legLen1;
        const kneeY = hipY + Math.sin(kneeAng) * legLen1;

        // 大腿（粗银灰色金属管）
        ctx.strokeStyle = '#8a8f96';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
        // 小腿（稍细）
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
        // 膝盖关节圆（青铜色）
        ctx.fillStyle = '#8a7a5a';
        ctx.beginPath(); ctx.arc(kneeX, kneeY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5d4223'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(kneeX, kneeY, 5, 0, Math.PI * 2); ctx.stroke();
        // 足垫（宽大金属底座）
        ctx.fillStyle = '#3d444e';
        ctx.beginPath(); ctx.ellipse(footX, footY, 7, 5, e.angle, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(footX, footY, 7, 5, e.angle, 0, Math.PI * 2); ctx.stroke();
      }

      // ② 再画车身（顶层，盖住腿根）
      ctx.save();
      ctx.translate(e.x, e.y - hOff);
      ctx.rotate(e.angle);
      ctx.drawImage(hull, -hull.width / 2, -hull.height / 2);
      ctx.restore();
    } else {
      // 非机甲：正常绘制
      ctx.save();
      ctx.translate(e.x, e.y - hOff);
      if (hOff > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.beginPath();
        ctx.ellipse(0, def.radius * 0.8, def.radius * 0.9, def.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.rotate(e.angle);
      ctx.drawImage(hull, -hull.width / 2, -hull.height / 2);
      ctx.restore();
      if (turret) {
        ctx.save();
        ctx.translate(e.x, e.y - hOff);
        ctx.rotate(e.turretAngle);
        ctx.drawImage(turret, -turret.width / 2, -turret.height / 2);
        ctx.restore();
      }
    }
    // 农夫劳作进度条：收割/回种时显示琥珀条（分清在干活还是在发呆）
    if (e.defId === 'farmer' && (e.jobT ?? 0) > 0 && e.jobDur) {
      this.hpBar(e.x, e.y - hOff - def.radius - 10, 16, 1 - (e.jobT ?? 0) / e.jobDur, true);
    }
    // 搬运货物可视化：车顶堆原木/矿石
    if (e.cargo && e.cargo.amt > 0.5) {
      const pieces = Math.min(3, 1 + Math.floor(e.cargo.amt / 4));
      ctx.save();
      ctx.translate(e.x, e.y - hOff);
      ctx.rotate(e.angle);
      if (e.cargo.res === 'wood') {
        ctx.fillStyle = '#8a6238';
        ctx.strokeStyle = '#5d4223';
        ctx.lineWidth = 1;
        for (let i = 0; i < pieces; i++) {
          const oy = -def.radius * 0.55 + i * 4;
          ctx.fillRect(-def.radius * 0.55, oy - 1.8, def.radius * 0.9, 3.6);
          ctx.strokeRect(-def.radius * 0.55, oy - 1.8, def.radius * 0.9, 3.6);
        }
      } else {
        ctx.fillStyle = '#e8c25a';
        ctx.strokeStyle = '#a8842e';
        ctx.lineWidth = 1;
        for (let i = 0; i < pieces; i++) {
          ctx.save();
          ctx.translate(-def.radius * 0.5 + i * 5, -def.radius * 0.5);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-2.5, -2.5, 5, 5);
          ctx.strokeRect(-2.5, -2.5, 5, 5);
          ctx.restore();
        }
      }
      ctx.restore();
    }
    if ((e.armorMax ?? 0) > 0) this.armorBar(e.x, e.y - def.radius - 14 - hOff, 24, (e.armorHp ?? 0) / (e.armorMax ?? 1));
    if (e.hp < def.hp) {
      this.hpBar(e.x, e.y - def.radius - 9 - hOff, 24, e.hp / def.hp);
      if (this.regenActive(e, def.hp)) this.regenDot(e.x - 12, e.y - def.radius - 11 - hOff);
    }
  }

  /** 选中单位/建筑的范围可视化：白色虚线视野圈 + 琥珀射程圈 + 红色最小射程圈 */
  private drawRangeRings(e: Entity, vision: number): void {
    const ctx = this.ctx;
    const hOff = this.world.heightAt(e.x, e.y) * HEIGHT_OFFSET;
    const cx = e.x, cy = e.y - hOff;
    const weapon = e.kind === 'unit' ? UNIT_DEFS[e.defId].weapon : BUILDING_DEFS[e.defId].weapon;
    // 视野圈
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, vision * TILE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (weapon) {
      ctx.strokeStyle = 'rgba(240,166,60,.42)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, weapon.range, 0, Math.PI * 2); ctx.stroke();
      if (weapon.minRange) {
        ctx.strokeStyle = 'rgba(255,90,70,.4)';
        ctx.beginPath(); ctx.arc(cx, cy, weapon.minRange, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  private hpBar(cx: number, y: number, width: number, ratio: number, amber = false, color?: string): void {
    const ctx = this.ctx;
    const h = 4;
    ctx.fillStyle = COLORS.hpBarBack;
    ctx.fillRect(cx - width / 2 - 1, y - 1, width + 2, h + 2);
    ctx.fillStyle = color ?? (amber ? '#f0a63c' : ratio > 0.4 ? COLORS.hpBar : COLORS.hpBarLow);
    ctx.fillRect(cx - width / 2, y, width * Math.max(0, Math.min(1, ratio)), h);
  }

  /** 装甲池条（钢蓝，画在血条上层）+ 三十息回血呼吸灯 */
  private armorBar(cx: number, y: number, width: number, ratio: number): void {
    this.hpBar(cx, y, width, ratio, false, '#6fa8dc');
  }

  private regenActive(e: Entity, maxHp: number): boolean {
    return this.world.time - (e.lastDamagedAt ?? -1e9) >= REGEN_DELAY && e.hp < maxHp;
  }

  private regenDot(x: number, y: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 250);
    this.ctx.fillStyle = `rgba(120,255,140,${0.35 + pulse * 0.5})`;
    this.ctx.beginPath(); this.ctx.arc(x, y, 2.5 + pulse, 0, Math.PI * 2); this.ctx.fill();
  }

  private drawFog(): void {
    const f = this.world.fog[0];
    const ctx = this.fctx;
    ctx.clearRect(0, 0, this.fogC.width, this.fogC.height);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const i = ty * MAP_W + tx;
        const v = f[i];
        if (v === 0 || v === 1) {
          const h = this.world.height[i];
          const fy = this.tileY(ty * TILE, h);
          ctx.fillStyle = v === 0 ? '#000' : 'rgba(0,0,0,.45)';
          // 迷雾要连同南向岩壁一起盖住，否则未探索区会漏出悬浮色带
          let faceH = 0;
          if (ty + 1 < MAP_H) {
            const hS = this.world.height[(ty + 1) * MAP_W + tx];
            if (hS < h) faceH = (h - hS) * HEIGHT_OFFSET;
          }
          ctx.fillRect(tx * TILE, fy, TILE, TILE + faceH);
        }
      }
    }
  }
}

function explored(w: World, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return w.fog[0][ty * MAP_W + tx] >= 1;
}
