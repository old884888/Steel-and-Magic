import { TILE, PATH_BUDGET, MAP_W, MAP_H } from '../config';
import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { findPath, nearestWalkable } from '../engine/astar';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 移动系统：路径请求（预算分摊）→ 路径跟随（LOS抄近路）→ 分离推挤 → 卡死重寻
 * firingHold 为真时不移动（战斗系统判定射程内停火）
 */
export function updateMovement(w: World, dt: number): void {
  // 处理上一帧排队等预算的寻路请求
  for (let i = 0; i < w.pendingPaths.length && w.pathBudget > 0; i++) {
    const u = w.entities.get(w.pendingPaths[i]);
    if (u && u.kind === 'unit' && u.pathPending) requestPathNow(w, u);
  }
  w.pendingPaths.length = 0;

  for (const e of w.entities.values()) {
    if (e.kind !== 'unit') continue;
    const def = UNIT_DEFS[e.defId];

    // ---- 空军：无视地形直线飞行（不寻路/不分离/不受高地） ----
    if (def.moveClass === 'air') {
      if (e.firingHold) { e.stuck = 0; continue; }
      const goal = moveGoal(w, e);
      if (goal) {
        const dx = goal.x - e.x, dy = goal.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = def.speed * dt;
        if (d <= step) {
          e.x = goal.x; e.y = goal.y;
          if (e.order.kind === 'move' || e.order.kind === 'attackMove') e.order = { kind: 'idle' };
          e.path = null;
        } else {
          e.x += (dx / d) * step;
          e.y += (dy / d) * step;
          faceToward(e, goal.x, goal.y, dt);
        }
        e.x = Math.max(TILE, Math.min(MAP_W * TILE - TILE, e.x));
        e.y = Math.max(TILE, Math.min(MAP_H * TILE - TILE, e.y));
      }
      continue;
    }
    // ---- 海军：走水面通行网 ----
    const isNaval = def.moveClass === 'naval';

    // 停车架炮（自行火炮）：射程内正在开火时原地不动
    if (e.firingHold && def.stopToFire) continue;

    const goal = moveGoal(w, e);
    if (!goal) { e.path = null; continue; }

    // 需要（重新）寻路的情况（带冷却：追击限频/失败限频，防预算烧穿）
    const needPath = !e.path || e.pathIdx >= (e.path?.length ?? 0);
    if (needPath && e.repathTimer <= 0) {
      requestPath(w, e, goal.x, goal.y, isNaval);
      if (e.order.kind === 'attack') e.repathTimer = 0.5;
      else if (!e.path) e.repathTimer = 1.0; // 寻路失败：1秒后再试
    }
    if (e.repathTimer > 0) e.repathTimer -= dt;

    if (e.path && e.pathIdx < e.path.length) {
      // LOS 抄近路
      while (e.pathIdx + 1 < e.path.length && lineWalkable(w, e.x, e.y, e.path[e.pathIdx + 1].x, e.path[e.pathIdx + 1].y)) {
        e.pathIdx++;
      }
      const wp = e.path[e.pathIdx];
      const d = dist(e.x, e.y, wp.x, wp.y);
      const step = def.speed * dt;
      if (d <= Math.max(step, 6)) {
        e.pathIdx++;
        if (e.pathIdx >= e.path.length) { e.path = null; arrive(w, e); }
      } else {
        const nx = e.x + ((wp.x - e.x) / d) * step;
        const ny = e.y + ((wp.y - e.y) / d) * step;
        tryMove(w, e, nx, ny, step);
        faceToward(e, wp.x, wp.y, dt);
      }
    }

    // 分离推挤（与邻居单位）
    separate(w, e);
  }
}

/** 该单位的移动目标点（依据当前指令） */
function moveGoal(w: World, e: Entity): { x: number; y: number } | null {
  if (e.order.kind === 'move' && e.order.target) {
    const t = e.order.target;
    if (dist(e.x, e.y, t.x, t.y) < 10) { e.order = { kind: 'idle' }; return null; } // 已到场
    return t;
  }
  if (e.order.kind === 'attack' && e.order.targetId != null) {
    const t = w.entities.get(e.order.targetId);
    if (!t) return null;
    // RW式攻击走位：推进到自身射程的60%处站桩开火（火炮=全射程外停车），到位即不再移动
    const weapon = UNIT_DEFS[e.defId].weapon;
    const stopAt = weapon ? (UNIT_DEFS[e.defId].stopToFire ? weapon.range : weapon.range * 0.6) : 0;
    if (dist(e.x, e.y, t.x, t.y) - t.radius() <= stopAt) return null;
    return { x: t.x, y: t.y };
  }
  if (e.order.kind === 'build' && e.order.targetId != null) {
    const b = w.entities.get(e.order.targetId);
    if (!b) return null;
    // 已进入施工/修理范围：站桩干活，别再寻路
    if (dist(e.x, e.y, b.x, b.y) <= b.radius() + TILE * 2) return null;
    return { x: b.x, y: b.y };
  }
  if (e.order.kind === 'gather') {
    if (e.gatherState === 'toRes') {
      // 资源格本身不可走，走到其最近可走邻格
      const tx = e.resTile % MAP_W, ty = (e.resTile / MAP_W) | 0;
      const g = nearestWalkable(w.walkable, tx, ty);
      return { x: (g.x + 0.5) * TILE, y: (g.y + 0.5) * TILE };
    }
    if (e.gatherState === 'toDepot' || e.gatherState === 'deposit') {
      const depot = w.nearestDepot(e.owner, e.x, e.y);
      if (!depot) return null;
      if (e.gatherState === 'deposit') {
        // 卸货中：如果被挤开超出范围，重新走回去
        if (dist(e.x, e.y, depot.x, depot.y) <= depot.radius() + TILE * 1.6) return null;
      }
      return { x: depot.x, y: depot.y };
    }
    return null; // gathering/等待：站桩
  }
  if (e.order.kind === 'attackMove') {
    // 交战中追向交战目标；无目标则继续向命令点推进
    if (e.engagedId != null) {
      const t = w.entities.get(e.engagedId);
      if (t) return { x: t.x, y: t.y };
    }
    const t = e.order.target;
    if (t) {
      if (dist(e.x, e.y, t.x, t.y) < 12) { e.order = { kind: 'idle' }; return null; }
      return t;
    }
    return null;
  }
  if (e.order.kind === 'hold') return null; // 驻守：绝不挪窝
  return null;
}

function arrive(w: World, e: Entity): void {
  if (e.order.kind === 'move') e.order = { kind: 'idle' };
  void w;
}

function requestPath(w: World, e: Entity, gx: number, gy: number, isNaval = false): void {
  if (w.pathBudget > 0) requestPathNow(w, e, gx, gy, isNaval);
  else { e.pathPending = true; w.pendingPaths.push(e.id); }
}

function requestPathNow(w: World, e: Entity, gx?: number, gy?: number, isNaval = false): void {
  w.pathBudget--;
  e.pathPending = false;
  let tx: number, ty: number;
  if (gx != null && gy != null) { tx = Math.floor(gx / TILE); ty = Math.floor(gy / TILE); }
  else if (e.order.kind === 'move' && e.order.target) {
    tx = Math.floor(e.order.target.x / TILE); ty = Math.floor(e.order.target.y / TILE);
  } else return;
  const grid = isNaval ? w.navalWalkable : w.walkable;
  const g = nearestWalkable(grid, tx, ty);
  const path = findPath(w.terrain, grid, w.height, Math.floor(e.x / TILE), Math.floor(e.y / TILE), g.x, g.y);
  e.path = path;
  e.pathIdx = 0;
  e.stuck = 0;
}

function tryMove(w: World, e: Entity, nx: number, ny: number, step: number): void {
  if (w.canStandClassAt(e, e.x, e.y, nx, ny)) { e.x = nx; e.y = ny; e.stuck = 0; return; }
  // 滑动：分别试单轴
  if (w.canStandClassAt(e, e.x, e.y, nx, e.y)) { e.x = nx; return; }
  if (w.canStandClassAt(e, e.x, e.y, e.x, ny)) { e.y = ny; return; }
  // 完全卡住计数，超阈值重寻路
  e.stuck += step;
  if (e.stuck > TILE * 2 && !e.pathPending) {
    e.path = null;
    e.stuck = 0;
  }
}

function separate(w: World, e: Entity): void {
  const def = UNIT_DEFS[e.defId];
  const near: number[] = [];
  w.hash.queryCircle(e.x, e.y, def.radius + 14, near);
  for (const id of near) {
    if (id === e.id) continue;
    const o = w.entities.get(id);
    if (!o || o.kind !== 'unit') continue;
    if (UNIT_DEFS[o.defId]?.moveClass !== undefined && UNIT_DEFS[e.defId]?.moveClass !== UNIT_DEFS[o.defId]?.moveClass) continue;
    const od = UNIT_DEFS[o.defId];
    const dx = e.x - o.x, dy = e.y - o.y;
    const d2 = dx * dx + dy * dy;
    const minD = def.radius + od.radius;
    if (d2 > 0.0001 && d2 < minD * minD) {
      const d = Math.sqrt(d2);
      // 实体化碰撞：重叠量双方各承担一半，互相推开——单位无法互相穿越
      const push = minD - d;
      const px = (dx / d) * push * 0.5, py = (dy / d) * push * 0.5;
      if (w.canStandClassAt(e, e.x, e.y, e.x + px, e.y + py)) { e.x += px; e.y += py; }
      if (w.canStandClassAt(o, o.x, o.y, o.x - px, o.y - py)) { o.x -= px; o.y -= py; }
    } else if (d2 <= 0.0001) {
      e.x += 0.5; e.y += 0.5;
    }
  }
}

export function faceToward(e: Entity, tx: number, ty: number, dt: number): void {
  const target = Math.atan2(ty - e.y, tx - e.x);
  let d = target - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.angle += d * Math.min(1, dt * 12);
}

function lineWalkable(w: World, x0: number, y0: number, x1: number, y1: number): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(d / (TILE / 2));
  let lx = x0, ly = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = x0 + (x1 - x0) * t, ny = y0 + (y1 - y0) * t;
    if (!w.canStandAtWorld(lx, ly, nx, ny)) return false;
    lx = nx; ly = ny;
  }
  return true;
}

export function buildingDef(e: Entity) { return BUILDING_DEFS[e.defId]; }
