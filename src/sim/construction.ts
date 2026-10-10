import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { TILE } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 建造系统：工程车施工/修理 + 建筑生产队列出兵
 */
export function updateConstruction(w: World, dt: number): void {
  const finished: Entity[] = [];

  for (const e of w.entities.values()) {
    if (e.kind !== 'unit') continue;
    if (e.order.kind !== 'build' || e.order.targetId == null) continue;
    const b = w.entities.get(e.order.targetId);
    if (!b || b.kind !== 'building' || b.owner !== e.owner) { e.order = { kind: 'idle' }; continue; }
    const def = BUILDING_DEFS[b.defId];

    const inRange = dist(e.x, e.y, b.x, b.y) <= b.radius() + TILE * 2;
    if (!inRange) continue; // 还在路上，movement负责走

    if (!b.done) {
      // 施工
      faceToward2(e, b.x, b.y, dt);
      b.progress += dt / def.buildTime;
      if ((w.tick & 15) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y + (Math.random() - 0.5) * b.radius(), 'hit', 5, 0.2);
      if (b.progress >= 1) {
        b.progress = 1;
        b.done = true;
        b.hp = def.hp;
        w.addFx(b.x, b.y, 'hit', 18, 0.35);
        w.addLog('build', `建成：${def.name}`, b.owner);
        finished.push(b);
      }
    } else if (b.hp < def.hp) {
      // 修理
      faceToward2(e, b.x, b.y, dt);
      b.hp = Math.min(def.hp, b.hp + 30 * dt);
      if ((w.tick & 31) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y - b.radius() * 0.6, 'hit', 4, 0.2);
      if (b.hp >= def.hp) e.order = { kind: 'idle' };
    } else {
      e.order = { kind: 'idle' };
    }
  }

  // 建筑完工后，所有指向它的建造指令收工
  for (const e of w.entities.values()) {
    if (e.kind === 'unit' && e.order.kind === 'build' && e.order.targetId != null) {
      const b = w.entities.get(e.order.targetId);
      if (b && finished.includes(b)) e.order = { kind: 'idle' };
    }
  }

  // ---- 生产队列 ----
  for (const e of w.entities.values()) {
    if (e.kind !== 'building' || !e.done) continue;
    const def = BUILDING_DEFS[e.defId];
    if (!def.produces || e.queue.length === 0) continue;
    const item = e.queue[0];
    item.remaining -= dt;
    if (item.remaining <= 0) {
      const spot = findFreeSpot(w, e, UNIT_DEFS[item.unitId].moveClass);
      if (!spot) { item.remaining = 0.3; continue; } // 被围死：暂停生产等待空位
      e.queue.shift();
      const u = w.spawnUnit(item.unitId, e.owner, spot.x, spot.y);
      w.addLog('military', `训练完成：${UNIT_DEFS[item.unitId].name}`, e.owner);
      const rally = e.rally ?? { x: e.x, y: e.y + e.radius() + TILE * 1.5 };
      w.issueMove([u.id], rally);
    }
  }
}

/** 在建筑旁找空位（先找位后出兵）：naval单位找临水格，其余找陆地格 */
function findFreeSpot(w: World, b: Entity, moveClass?: string): { x: number; y: number } | null {
  const size = BUILDING_DEFS[b.defId].size;
  const wantWater = moveClass === 'naval';
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= size + r - 1; dy++) {
      for (let dx = -r; dx <= size + r - 1; dx++) {
        const edge = dx < 0 || dy < 0 || dx >= size || dy >= size;
        if (!edge) continue;
        const x = b.tx + dx, y = b.ty + dy;
        const wx = (x + 0.5) * TILE, wy = (y + 0.5) * TILE;
        if (wantWater) {
          if (w.terrain[y * 64 + x] !== 1) continue; // 船舶下水点：水面格
        } else if (!w.walkableAtTile(x, y)) continue;
        let occupied = false;
        for (const o of w.entities.values()) {
          if (o.kind === 'unit' && dist(o.x, o.y, wx, wy) < 14) { occupied = true; break; }
        }
        if (!occupied) return { x: wx, y: wy };
      }
    }
  }
  return null;
}

function faceToward2(e: Entity, tx: number, ty: number, dt: number): void {
  const target = Math.atan2(ty - e.y, tx - e.x);
  let d = target - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.angle += d * Math.min(1, dt * 12);
}

/** 排队生产（UI/AI共用）：检查资源与人口 */
export function tryEnqueue(w: World, building: Entity, unitId: string): boolean {
  const def = UNIT_DEFS[unitId];
  if (building.owner > 1) return false;
  const p = w.players[building.owner];
  if (!def || building.queue.length >= 5) return false;
  if (p.pop + countQueued(w, building.owner) >= p.popCap) return false;
  if (!w.canAfford(building.owner, def.cost)) return false;
  w.payCost(building.owner, def.cost);
  building.queue.push({ unitId, remaining: def.buildTime });
  return true;
}

function countQueued(w: World, owner: number): number {
  let n = 0;
  for (const e of w.entities.values()) {
    if (e.kind === 'building' && e.owner === owner) n += e.queue.length;
  }
  return n;
}
