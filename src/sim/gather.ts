import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { TILE, MAP_W, MAP_H, T_TREE } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';
import type { Res } from '../types';

/**
 * 人工采集系统（帝国时代式）：
 * 右键树/矿 → 走到资源旁开采 → 载货满 → 走到最近仓库/HQ 卸货 → 循环
 * 资源枯竭：找附近同类型资源续班（半径3格），没有则卸货后待命
 * 仓库满载：在卸货点待机等空位（货物不掉）
 */
export function updateGather(w: World, dt: number): void {
  for (const e of w.entities.values()) {
    if (e.kind !== 'unit' || e.order.kind !== 'gather') continue;
    const def = UNIT_DEFS[e.defId];
    const g = def.gather;
    if (!g) continue;

    switch (e.gatherState) {
      case 'toRes': {
        // 移动由 movement 负责（moveGoal 给出资源旁的接近点）；进入采集光束射程即转入开采
        const tc = tileCenter(e.resTile);
        if (!tc) { e.order = { kind: 'idle' }; continue; }
        // TILE*2.6：密集树丛/矿脉中心的邻近可走格可能隔两格，靠"光束射程"覆盖
        if (dist(e.x, e.y, tc.x, tc.y) <= TILE * 2.6) {
          e.gatherState = 'gathering';
          e.path = null;
        }
        break;
      }
      case 'gathering': {
        if (e.cargo && e.cargo.amt >= g.capacity) { e.gatherState = 'toDepot'; break; }
        // 资源还在吗
        const has = e.order.res === 'wood'
          ? (w.terrain[e.resTile] === T_TREE && w.treeWood[e.resTile] > 0)
          : w.oreLeft[e.resTile] > 0;
        if (!has) {
          const next = findNextResource(w, e.resTile, e.order.res!);
          if (next >= 0) {
            e.resTile = next;
            e.gatherState = 'toRes';
            e.path = null;
          } else {
            e.resExhausted = true;
            if (e.cargo && e.cargo.amt > 0) {
              e.gatherState = 'toDepot';
            } else {
              e.order = { kind: 'idle' };
              e.gatherState = null;
            }
          }
          break;
        }
        // 开采（不超过载货上限与资源余量）
        faceToward(e, tileCenter(e.resTile)!, dt);
        const take = Math.min(g.rate * dt, g.capacity - (e.cargo?.amt ?? 0));
        let deposited = 0;
        if (e.order.res === 'wood') {
          const avail = w.treeWood[e.resTile];
          deposited = Math.min(take, avail);
          w.treeWood[e.resTile] -= deposited;
          if (w.treeWood[e.resTile] <= 0.01) {
            w.treeWood[e.resTile] = 0;
            w.terrain[e.resTile] = 0; w.walkable[e.resTile] = 1;
            w.dirtyTiles.add(e.resTile);
            w.addLog('econ', '一棵树被砍完', e.owner);
          }
        } else {
          const avail = w.oreLeft[e.resTile];
          deposited = Math.min(take, avail);
          w.oreLeft[e.resTile] -= deposited;
          if (w.oreLeft[e.resTile] <= 0.01) {
            w.oreLeft[e.resTile] = 0;
            w.terrain[e.resTile] = 0; w.walkable[e.resTile] = 1;
            w.dirtyTiles.add(e.resTile);
            w.addLog('econ', '一处矿脉被采空', e.owner);
          }
        }
        if (!e.cargo || e.cargo.res !== e.order.res) e.cargo = { res: e.order.res!, amt: 0 };
        e.cargo.amt += deposited;
        if (e.cargo.amt >= g.capacity - 0.01) { e.cargo.amt = g.capacity; e.gatherState = 'toDepot'; e.path = null; }
        break;
      }
      case 'toDepot': {
        const depot = nearestDepot(w, e);
        if (!depot) break; // 没仓库可去，扛着货罚站（HQ没了也没辙）
        if (dist(e.x, e.y, depot.x, depot.y) <= depot.radius() + TILE * 1.6) {
          e.gatherState = 'deposit';
          e.path = null;
        }
        break;
      }
      case 'deposit': {
        const depot = nearestDepot(w, e);
        if (!depot) { e.gatherState = null; e.order = { kind: 'idle' }; continue; }
        if (dist(e.x, e.y, depot.x, depot.y) > depot.radius() + TILE * 2.2) { e.gatherState = 'toDepot'; break; }
        if (e.cargo && e.cargo.amt > 0) {
          const added = w.addRes(e.owner, e.cargo.res, e.cargo.amt);
          e.cargo.amt -= added;
          if (added > 0) {
            w.addLog('econ', `入库 ${e.cargo.res === 'wood' ? '木头' : '矿石'}+${added.toFixed(0)}`, e.owner, `deposit:${e.owner}`, 20);
            w.addFx(depot.x, depot.y - depot.radius() * 0.6, 'hit', 9, 0.3); // 卸货闪光
          }
          if (e.cargo.amt <= 0.01) {
            e.cargo = null;
            // 卸完：资源还活着就继续，枯竭了就地待命
            if (e.resExhausted) { e.order = { kind: 'idle' }; e.gatherState = null; e.resExhausted = false; }
            else {
              const has = e.order.res === 'wood'
                ? (w.terrain[e.resTile] === T_TREE && w.treeWood[e.resTile] > 0)
                : w.oreLeft[e.resTile] > 0;
              if (!has) {
                const next = findNextResource(w, e.resTile, e.order.res!);
                if (next >= 0) e.resTile = next;
                else { e.order = { kind: 'idle' }; e.gatherState = null; break; }
              }
              e.gatherState = 'toRes';
              e.path = null;
            }
          }
          // 仓库满载：addRes 返回0，货物留住，原地等空位
        } else {
          e.cargo = null;
          e.gatherState = 'toRes';
          e.path = null;
        }
        break;
      }
      default:
        break; // toRes 途中的等待（寻路冷却等）交给 movement
    }
  }
}

/** 找半径3格内的同类资源续班 */
function findNextResource(w: World, fromTile: number, res: 'wood' | 'ore'): number {
  const tx = fromTile % MAP_W, ty = (fromTile / MAP_W) | 0;
  let best = -1, bestD = Infinity;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      const i = y * MAP_W + x;
      const ok = res === 'wood'
        ? (w.terrain[i] === T_TREE && w.treeWood[i] > 0)
        : w.oreLeft[i] > 0;
      if (ok) {
        const d = dx * dx + dy * dy;
        if (d > 0 && d < bestD) { bestD = d; best = i; }
      }
    }
  }
  return best;
}

/** 最近的卸货点（HQ / 仓库，已完成） */
function nearestDepot(w: World, e: Entity): Entity | null {
  return w.nearestDepot(e.owner, e.x, e.y);
}

function tileCenter(i: number): { x: number; y: number } | null {
  const x = i % MAP_W, y = (i / MAP_W) | 0;
  return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
}

function faceToward(e: Entity, target: { x: number; y: number }, dt: number): void {
  const angle = Math.atan2(target.y - e.y, target.x - e.x);
  let d = angle - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.angle += d * Math.min(1, dt * 12);
}
