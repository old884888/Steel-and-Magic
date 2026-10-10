import { UNIT_DEFS } from '../data/units';
import { MAP_W, MAP_H, TILE, OWNER_NEUTRAL, T_GRASS } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 中立生态系统：蛮族营地（刷兵+劫掠派遣）、动物（游荡/逃走）。
 * 全部 owner 2；不参与经济/人口/胜负，只给地图添麻烦和肉。
 */

/** 在世界创建时布置中立生态：双营地、鹿群、狼群 */
export function spawnNeutrals(w: World): void {
  // 蛮族营地：中路两侧（离双基地都有一段距离）
  spawnCamp(w, 44, 18);
  spawnCamp(w, 18, 44);
  // 鹿群：靠近林区
  spawnHerd(w, 12, 40, 'deer', 3);
  spawnHerd(w, 50, 22, 'deer', 3);
  spawnHerd(w, 32, 6, 'deer', 3);
  spawnHerd(w, 32, 58, 'deer', 3);
  // 狼群：营地附近当门卫，中路再来一窝
  spawnHerd(w, 42, 16, 'wolf', 2);
  spawnHerd(w, 20, 46, 'wolf', 2);
  spawnHerd(w, 36, 36, 'wolf', 2);
}

function spawnCamp(w: World, tx: number, ty: number): void {
  const spot = findFree(w, tx, ty, 4);
  if (spot) w.spawnBuilding('camp', OWNER_NEUTRAL, spot.tx, spot.ty, true);
}

function spawnHerd(w: World, tx: number, ty: number, defId: 'deer' | 'wolf', count: number): void {
  const anchor = findFree(w, tx, ty, 4);
  if (!anchor) return;
  const hx = (anchor.tx + 0.5) * TILE, hy = (anchor.ty + 0.5) * TILE;
  for (let i = 0; i < count; i++) {
    const spot = findFree(w, anchor.tx + ((i * 3) % 5) - 2, anchor.ty + ((i * 2) % 5) - 2, 2);
    if (!spot) continue;
    const u = w.spawnUnit(defId, OWNER_NEUTRAL, (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE);
    u.homeX = hx; u.homeY = hy;
    if (defId === 'wolf') u.order = { kind: 'hold' }; // 狼：守窝，绝不追出领地
  }
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

/** 每帧：营地运转 + 动物行为 */
export function updateNeutrals(w: World, dt: number): void {
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
        // 停战期（事件卡「蛮族使者」）：掠袭暂停，稍后再问
        if (w.time < w.barbTruceUntil) { e.nRaidT = 10; continue; }
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

    // 鹿：受伤就逃（远离最近威胁8格外）
    if (e.defId === 'deer' && e.hp < UNIT_DEFS[e.defId].hp && e.order.kind !== 'move') {
      let threat: Entity | null = null, bestD = 8 * TILE;
      for (const o of w.entities.values()) {
        if (o.owner === OWNER_NEUTRAL && o.kind === 'unit') continue;
        if (o.kind === 'building') continue;
        const d = dist(o.x, o.y, e.x, e.y);
        if (d < bestD) { bestD = d; threat = o; }
      }
      if (threat) {
        const dx = e.x - threat.x, dy = e.y - threat.y;
        const len = Math.hypot(dx, dy) || 1;
        w.issueMove([e.id], { x: e.x + (dx / len) * TILE * 6, y: e.y + (dy / len) * TILE * 6 });
        continue;
      }
    }

    // 游荡：久站的动物溜达回巢附近（确定性触发，不用随机数）
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

function isFleeing(e: Entity): boolean {
  return e.order.kind === 'move';
}

void UNIT_DEFS;
