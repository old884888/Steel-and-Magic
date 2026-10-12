import { TILE, CARAVAN_CAP_PER_POST } from '../config';
import { nearestWalkable } from '../engine/astar';
import type { Res } from '../types';
import type { World } from './world';

/** 金币子系统（v0.11 自 world.ts 迁出）：市场买卖 + 商队雇佣 + 加金币 */

export function addGold(w: World, owner: number, v: number): void {
  if (owner > 1) return;
  w.players[owner].gold += v;
}

/** 市场卖出：100资源→40金（手动决策，不自动） */
export function marketSell(w: World, owner: number, res: Res): boolean {
  const p = w.players[owner];
  if (p.res[res] < 100) return false;
  p.res[res] -= 100;
  p.gold += 40;
  return true;
}

/** 市场买入：70金→100资源（受存储上限钳制，空间不足100拒买） */
export function marketBuy(w: World, owner: number, res: Res): boolean {
  const p = w.players[owner];
  if (p.gold < 70) return false;
  if (p.storageCap - p.res[res] < 100) return false;
  p.gold -= 70;
  w.addRes(owner, res, 100);
  return true;
}

/** 雇佣商队：食30/个，每座商贸站上限3个，出生在站旁并自动绑定路线 */
export function hireCaravan(w: World, postId: number): boolean {
  const post = w.entities.get(postId);
  if (!post || post.kind !== 'building' || post.defId !== 'tradePost' || !post.done || post.owner > 1) return false;
  const owner = post.owner as 0 | 1;
  const count = [...w.entities.values()].filter(e => e.defId === 'caravan' && (e.homePostId ?? -1) === postId).length;
  if (count >= CARAVAN_CAP_PER_POST) return false;
  if (!w.canAfford(owner, { food: 30 })) return false;
  w.payCost(owner, { food: 30 });
  const spawnX = post.x, spawnY = post.y + post.radius() + TILE;
  const c = w.spawnUnit('caravan', owner, spawnX, spawnY);
  if (!w.walkableAtWorld(c.x, c.y)) {
    // 站旁被水/建筑占了：吸附到最近可走格，别让商队出生即卡死
    const g = nearestWalkable(w.walkable, Math.floor(spawnX / TILE), Math.floor(spawnY / TILE));
    c.x = (g.x + 0.5) * TILE;
    c.y = (g.y + 0.5) * TILE;
  }
  c.homePostId = postId;
  w.addLog('econ', '雇佣商队：踏上商路', owner);
  return true;
}
