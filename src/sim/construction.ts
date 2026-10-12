import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { TILE, MAP_W } from '../config';
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
    if (!inRange) {
      // 还在路上，movement负责走。但若持续无路径（工地被围死/不可达），8秒后弃单并拆除烂尾工地
      if (e.path) { e.buildWait = 0; continue; }
      e.buildWait = (e.buildWait ?? 0) + dt;
      if (e.buildWait > 8) {
        e.order = { kind: 'idle' };
        e.buildWait = 0;
        b.progress = 0;
        w.removeEntity(b.id);
        w.addLog('system', `${def.name}工地无法抵达，已放弃并拆除`, e.owner, 'abandon:' + b.id, 60);
      }
      continue;
    }

    if (!b.done) {
      // 施工（法令/科技：工程提速/流水作业）
      faceToward2(e, b.x, b.y, dt);
      b.progress += dt * w.mult(b.owner, 'build') / def.buildTime;
      if ((w.tick & 15) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y + (Math.random() - 0.5) * b.radius(), 'hit', 5, 0.2);
      if (b.progress >= 1) {
        b.progress = 1;
        b.done = true;
        b.hp = def.hp;
        w.addFx(b.x, b.y, 'hit', 18, 0.35);
        w.addLog('build', `建成：${def.name}`, b.owner);
        finished.push(b);
        if (b.defId === 'monument') w.startCoronation(b.owner as 0 | 1, b.id); // 奇观落成：90秒加冕启动
      }
    } else {
      // 修理（甲血双修）：结构与装甲同速率恢复（钢铁靠车间）
      const armorPool = def.armorPool ?? 0;
      const hpLow = b.hp < def.hp;
      const armorLow = (b.armorHp ?? 0) < armorPool;
      if (!hpLow && !armorLow) { e.order = { kind: 'idle' }; continue; }
      faceToward2(e, b.x, b.y, dt);
      const rate = 30 * w.mult(e.owner, 'build') * dt;
      if (hpLow) b.hp = Math.min(def.hp, b.hp + rate);
      if (armorLow) b.armorHp = Math.min(armorPool, (b.armorHp ?? 0) + rate);
      if ((w.tick & 31) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y - b.radius() * 0.6, 'hit', 4, 0.2);
      if (b.hp >= def.hp && (b.armorHp ?? 0) >= armorPool) e.order = { kind: 'idle' };
    }
  }

  // 建筑完工后，所有指向它的建造指令收工
  for (const e of w.entities.values()) {
    if (e.kind === 'unit' && e.order.kind === 'build' && e.order.targetId != null) {
      const b = w.entities.get(e.order.targetId);
      if (b && finished.includes(b)) e.order = { kind: 'idle' };
    }
  }
  // 有新建筑落成 → 重算地利加成
  if (finished.length > 0) w.recomputeAdjacency();

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

  // ---- 科技研究（全局单线，需已建成研究所；研究所损毁则进度冻结） ----
  for (const owner of [0, 1] as const) {
    const p = w.players[owner];
    if (!p.research || !w.hasLab(owner)) continue;
    p.research.remaining -= dt;
    if (p.research.remaining <= 0) w.completeResearch(owner);
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
          if (w.terrain[y * MAP_W + x] !== 1) continue; // 船舶下水点：水面格
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
