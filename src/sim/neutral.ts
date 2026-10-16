import { UNIT_DEFS } from '../data/units';
import {
  MAP_W, MAP_H, TILE, OWNER_NEUTRAL, T_GRASS,
  DEER_ALERT_RADIUS, DEER_FLEE_RADIUS, DEER_FLEE_DIST,
  WOLF_TERRITORY, WOLF_LEASH,
  CARCASS_DECAY_STEP, CARCASS_DECAY_PCT, CARCASS_PICKUP_RADIUS,
} from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 中立生态系统：蛮族营地（刷兵+劫掠派遣）、动物AI（FID/狼群/拴绳）、繁殖、尸体腐烂。
 * 全部 owner 2；不参与经济/人口/胜负，只给地图添麻烦和肉。
 * 确定性红线：全程禁随机数，游荡/决策全走 id/tick 混淆伪随机（selftest 友好）。
 */

/** 鹿繁殖判定周期：90秒（tick） */
const BREED_PERIOD = 90 * 60;

/** 在世界创建时布置中立生态：双营地、鹿群、狼群（坐标随地图尺寸缩放） */
export function spawnNeutrals(w: World): void {
  const S = MAP_W / 64; // 地图尺寸倍率
  // 蛮族营地：中路两侧（离双基地都有一段距离）
  spawnCamp(w, 44 * S, 18 * S);
  spawnCamp(w, 18 * S, 44 * S);
  // 鹿群：靠近林区
  let deer = 0;
  deer += spawnHerd(w, 12 * S, 40 * S, 'deer', 3);
  deer += spawnHerd(w, 50 * S, 22 * S, 'deer', 3);
  deer += spawnHerd(w, 32 * S, 6 * S, 'deer', 3);
  deer += spawnHerd(w, 32 * S, 58 * S, 'deer', 3);
  deer += spawnHerd(w, 50 * S, 50 * S, 'deer', 3);
  // 狼群：营地附近当门卫，中路再来一窝
  spawnHerd(w, 42 * S, 16 * S, 'wolf', 2);
  spawnHerd(w, 20 * S, 46 * S, 'wolf', 2);
  spawnHerd(w, 36 * S, 36 * S, 'wolf', 2);
  spawnHerd(w, 14 * S, 14 * S, 'wolf', 2);
  w.deerCap = deer + 4; // 繁殖上限：初始数量+4（防爆炸）
}

function spawnCamp(w: World, tx: number, ty: number): void {
  const spot = findFree(w, tx, ty, 4);
  if (spot) w.spawnBuilding('camp', OWNER_NEUTRAL, spot.tx, spot.ty, true);
}

function spawnHerd(w: World, tx: number, ty: number, defId: 'deer' | 'wolf', count: number): number {
  const anchor = findFree(w, tx, ty, 4);
  if (!anchor) return 0;
  const hx = (anchor.tx + 0.5) * TILE, hy = (anchor.ty + 0.5) * TILE;
  let n = 0;
  for (let i = 0; i < count; i++) {
    const spot = findFree(w, anchor.tx + ((i * 3) % 5) - 2, anchor.ty + ((i * 2) % 5) - 2, 2);
    if (!spot) continue;
    const u = w.spawnUnit(defId, OWNER_NEUTRAL, (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE);
    u.homeX = hx; u.homeY = hy;
    n++;
  }
  return n;
}

/** 螺旋找一块可站人的草地 */
function findFree(w: World, tx: number, ty: number, maxR: number): { tx: number; ty: number } | null {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r && r > 0) continue;
        const x = tx + dx, y = ty + dy;
        if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) continue;
        const i = y * MAP_W + x;
        if (w.terrain[i] === T_GRASS && !w.occupied[i]) return { tx: x, ty: y };
      }
    }
  }
  return null;
}

/** 找非owner2的最近地面单位威胁（建筑不算——塔楼不惊鹿/不诱狼） */
function nearestIntruder(w: World, x: number, y: number): { e: Entity | null; d: number } {
  let best: Entity | null = null, bestD = Infinity;
  for (const o of w.entities.values()) {
    if (o.owner === OWNER_NEUTRAL || o.kind !== 'unit') continue;
    if (UNIT_DEFS[o.defId]?.moveClass === 'air') continue; // 空中够不着也不算入侵
    const d = dist(o.x, o.y, x, y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return { e: best, d: bestD };
}

/** 每帧：营地运转 + 动物行为 + 繁殖 */
export function updateNeutrals(w: World, dt: number): void {
  updateBreeding(w);

  for (const e of w.entities.values()) {
    if (e.owner !== OWNER_NEUTRAL) continue;

    // ---- 蛮族营地：刷兵 + 派劫掠队 ----
    if (e.kind === 'building' && e.defId === 'camp') {
      e.nSpawnT = (e.nSpawnT ?? 40) - dt;
      e.nRaidT = (e.nRaidT ?? 25) - dt;

      const raiders: Entity[] = [];
      for (const u of w.entities.values()) {
        if (u.owner === OWNER_NEUTRAL && u.defId === 'barbarian' && u.homeX === e.homeX && u.homeY === e.homeY) {
          raiders.push(u);
        }
      }
      const alive = raiders.filter(r => r.hp > 0).length;

      if (e.nSpawnT <= 0) {
        e.nSpawnT = 40;
        if (alive < 3) {
          const spot = findFree(w, e.tx + ((w.tick >> 3) % 3) - 1, e.ty + ((w.tick >> 5) % 3) - 1, 3);
          if (spot) {
            const u = w.spawnUnit('barbarian', OWNER_NEUTRAL, (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE);
            u.homeX = e.x; u.homeY = e.y;
          }
        }
      }

      if (e.nRaidT <= 0) {
        // 通商停战（商队到访刷新）：贸易即纳贡，劫掠暂停
        if ((e.nTruceUntil ?? 0) > w.time) { e.nRaidT = 10; continue; }
        e.nRaidT = 30;
        const ready = raiders.filter(r => r.order.kind === 'idle' && !isFleeing(r));
        if (ready.length >= 2) {
          // 劫掠目标：最近的非中立建筑（25格内）
          let target: Entity | null = null, bestD = 25 * TILE;
          for (const o of w.entities.values()) {
            if (o.owner === OWNER_NEUTRAL || o.kind !== 'building') continue;
            const d = dist(e.x, e.y, o.x, o.y);
            if (d < bestD) { bestD = d; target = o; }
          }
          if (target) {
            w.issueAttackMove(ready.map(r => r.id), { x: target.x, y: target.y });
            w.addLog('military', '蛮族营地派出劫掠队！', undefined, 'raid:' + e.id, 60);
          }
        }
      }
      continue;
    }

    // ---- 动物行为（鹿/狼） ----
    if (e.kind !== 'unit') continue;

    // 鹿：FID 状态机（游荡→警戒→逃窜）——绕后驱赶即可"赶鹿"
    if (e.defId === 'deer') {
      // 确定性错峰决策：每10tick判一次（0.17s反应延迟，省性能）
      if ((w.tick + e.id * 3) % 10 === 0) {
        const { e: threat, d: td } = nearestIntruder(w, e.x, e.y);
        const scared = e.hp < UNIT_DEFS.deer.hp; // 受过伤就一直怕（8格内见人就跑）
        if (threat && (td <= DEER_FLEE_RADIUS * TILE || (scared && td <= DEER_FLEE_DIST * TILE))) {
          // 逃窜：威胁反方向狂奔8格（order move期间不重复决策，跑完再看）
          if (e.order.kind !== 'move') {
            const dx = e.x - threat.x, dy = e.y - threat.y;
            const len = Math.hypot(dx, dy) || 1;
            w.issueMove([e.id], { x: e.x + (dx / len) * DEER_FLEE_DIST * TILE, y: e.y + (dy / len) * DEER_FLEE_DIST * TILE });
            w.addFx(e.x, e.y - 16, 'mark', 0, 0.9, undefined, '!', '#ffe28a');
          }
        } else if (threat && td <= DEER_ALERT_RADIUS * TILE) {
          // 警戒：驻足、面向威胁（不逃但盯梢）
          if (e.order.kind === 'move') { e.order = { kind: 'idle' }; e.path = null; e.pathPending = false; }
          e.angle = Math.atan2(threat.y - e.y, threat.x - e.x);
        } else if (e.order.kind === 'idle' && (w.tick + e.id * 97) % 240 < 10) {
          // 游荡：安全时在巢附近溜达（确定性触发）
          const ox = ((e.id * 37 + w.tick * 31) % 160) - 80;
          const oy = ((e.id * 53 + w.tick * 17) % 160) - 80;
          const tx = e.homeX + ox, ty = e.homeY + oy;
          if (w.canStandAtWorld(e.x, e.y, tx, ty) || w.walkableAtWorld(tx, ty)) {
            w.issueMove([e.id], { x: tx, y: ty });
          }
        }
      }
      continue;
    }

    // 狼：家域巡逻 → 群体仇恨 → 追击 → 拴绳折返（防风筝）
    if (e.defId === 'wolf') {
      if ((w.tick + e.id * 7) % 10 === 0) {
        const homeD = dist(e.x, e.y, e.homeX, e.homeY);
        const returning = e.order.kind === 'move' && e.order.target
          && Math.hypot(e.order.target.x - e.homeX, e.order.target.y - e.homeY) < TILE;
        // 拴绳：离家超8格 → 弃目标回家；回程不索敌，到家才恢复
        if (homeD > WOLF_LEASH * TILE || returning) {
          if (!returning) w.issueMove([e.id], { x: e.homeX, y: e.homeY });
          continue;
        }
        // 群体仇恨：家域5格内有入侵者 → 追最近者（同锚点每只狼各自判定，天然同窝齐上）
        const { e: intruder, d: id } = nearestIntruder(w, e.x, e.y);
        const homeThreat = intruder && dist(intruder.x, intruder.y, e.homeX, e.homeY) <= WOLF_TERRITORY * TILE;
        if (intruder && homeThreat) {
          if (e.order.kind !== 'attack' || e.engagedId !== intruder.id) w.issueAttack([e.id], intruder.id);
          continue;
        }
        // 家域巡逻：无敌情时在5格内溜达（确定性）
        if (e.order.kind === 'idle' && (w.tick + e.id * 97) % 240 < 10) {
          const ox = ((e.id * 37 + w.tick * 31) % (WOLF_TERRITORY * TILE * 2)) - WOLF_TERRITORY * TILE;
          const oy = ((e.id * 53 + w.tick * 17) % (WOLF_TERRITORY * TILE * 2)) - WOLF_TERRITORY * TILE;
          const tx = e.homeX + ox, ty = e.homeY + oy;
          if (w.canStandAtWorld(e.x, e.y, tx, ty) || w.walkableAtWorld(tx, ty)) {
            w.issueMove([e.id], { x: tx, y: ty });
          }
        }
      }
      continue;
    }

    // 游荡：久站的动物溜达回巢附近（蛮族等，确定性触发，不用随机数）
    if (e.order.kind === 'idle' && (w.tick + e.id * 97) % 240 === 0) {
      const ox = ((e.id * 37 + w.tick * 31) % 160) - 80;
      const oy = ((e.id * 53 + w.tick * 17) % 160) - 80;
      const tx = e.homeX + ox, ty = e.homeY + oy;
      if (w.canStandAtWorld(e.x, e.y, tx, ty) || w.walkableAtWorld(tx, ty)) {
        w.issueMove([e.id], { x: tx, y: ty });
      }
    }
  }
}

/** 鹿群确定性繁殖：群≥2且<5、全图<上限时，每90秒在锚点附近添1只（自家发明，喂和平路线） */
function updateBreeding(w: World): void {
  if (w.tick === 0 || w.tick % 60 !== 0) return; // 每秒扫一次（判定闸门精确到tick，确定性）
  const herds = new Map<string, Entity[]>();
  let total = 0;
  for (const e of w.entities.values()) {
    if (e.defId !== 'deer') continue;
    total++;
    const key = `${Math.round(e.homeX)},${Math.round(e.homeY)}`;
    const arr = herds.get(key);
    if (arr) arr.push(e); else herds.set(key, [e]);
  }
  if (total >= w.deerCap) return;
  for (const [key, herd] of herds) {
    if (herd.length < 2 || herd.length >= 5) continue;
    // 每90秒一判，锚点坐标哈希错峰（确定性，两倍速模拟计数精确）
    const [hx, hy] = key.split(',').map(Number);
    if ((w.tick + hx * 7 + hy * 13) % BREED_PERIOD !== 0) continue;
    const a = herd[0];
    const spot = findFree(w, Math.round(a.homeX / TILE), Math.round(a.homeY / TILE), 3);
    if (!spot) continue;
    const fawn = w.spawnUnit('deer', OWNER_NEUTRAL, (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE);
    fawn.homeX = a.homeX; fawn.homeY = a.homeY;
    w.addLog('econ', '鹿群添了新丁——旷野生生不息', undefined, 'fawn', 30);
    break; // 每秒至多添一只（防同帧爆生；各群闸门天然错峰）
  }
}

/** 尸体腐烂：份额每10秒-25%（按初始份额），40秒蒸发；击杀方阵营任意单位走近3格自动拾取（零指令） */
export function updateCarcasses(w: World): void {
  for (let i = w.carcasses.length - 1; i >= 0; i--) {
    const c = w.carcasses[i];
    const age = w.time - c.born;
    if (age >= CARCASS_DECAY_STEP * 4) { w.carcasses.splice(i, 1); continue; }
    const amt = c.amount0 * Math.max(0, 1 - (CARCASS_DECAY_PCT / 100) * Math.floor(age / CARCASS_DECAY_STEP));
    if (amt <= 0) { w.carcasses.splice(i, 1); continue; }
    for (const u of w.entities.values()) {
      if (u.kind !== 'unit' || u.owner !== c.credit) continue;
      if (dist(u.x, u.y, c.x, c.y) <= CARCASS_PICKUP_RADIUS * TILE) {
        const got = Math.round(amt);
        if (got > 0) {
          w.addRes(c.credit, c.res, got);
          w.addFx(c.x, c.y, 'mark', 0, 1.2, undefined, `+${got}`, '#ffd76e');
        }
        w.carcasses.splice(i, 1);
        break;
      }
    }
  }
}

function isFleeing(e: Entity): boolean {
  return e.order.kind === 'move';
}
