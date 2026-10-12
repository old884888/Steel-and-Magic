import { TILE, MAP_W, GOLD_TRADE_BASE, GOLD_TRADE_PER_10, GOLD_TRADE_CAP } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 商路系统（v0.11）：商队全自动循环——
 * 商贸站出发 → 蛮族营地交割（通商=停战，贸易即纳贡）→ 驮金返回入库。
 * 收益 = 8金 + 2金/10格路长，上限24金：近路稳而薄，远路肥而险。
 * 零指令；营地被剿自动改签最近营地，没有营地则待命。
 */

const TRADE_DWELL = 1.2;  // 交割停留（秒）

function tileCenter(i: number): { x: number; y: number } {
  return { x: (i % MAP_W) * TILE + TILE / 2, y: ((i / MAP_W) | 0) * TILE + TILE / 2 };
}

function walkTo(w: World, e: Entity, p: { x: number; y: number }): void {
  e.order = { kind: 'move', target: p };
  e.path = null;
  e.pathPending = false;
}

function nearestOf(w: World, e: Entity, defId: string, requireDone: boolean): Entity | null {
  let best: Entity | null = null, bestD = Infinity;
  for (const o of w.entities.values()) {
    if (o.kind !== 'building' || o.defId !== defId) continue;
    if (requireDone && !o.done) continue;
    if (defId === 'tradePost' && o.owner !== e.owner) continue;
    const d = dist(e.x, e.y, o.x, o.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function updateCaravan(w: World, e: Entity, dt: number): void {
  // ---- 交割停留 ----
  if ((e.jobT ?? 0) > 0) {
    e.jobT = (e.jobT ?? 0) - dt;
    if ((e.jobT ?? 0) <= 0) {
      if (e.tradeState === 'toCamp') {
        w.addGold(e.owner, e.payout ?? 0);
        w.addLog('econ', `商队交割 金+${Math.round(e.payout ?? 0)}`, e.owner, 'trade:' + e.id, 15);
        e.tradeState = 'toHome';
        const home = (e.homePostId != null ? w.entities.get(e.homePostId) : null) ?? nearestOf(w, e, 'tradePost', true);
        if (home) { e.homePostId = home.id; walkTo(w, e, { x: home.x, y: home.y }); }
        else e.tradeState = null; // 没商贸站可回：原地待命
      }
    }
    return;
  }

  // ---- 去程：奔向绑定的蛮族营地 ----
  if (e.tradeState === 'toCamp') {
    const camp = e.tradeCampId != null ? w.entities.get(e.tradeCampId) : null;
    if (!camp || camp.defId !== 'camp') {
      // 营地没了（被剿）：自动改签最近营地
      const alt = nearestOf(w, e, 'camp', false);
      if (alt) { e.tradeCampId = alt.id; walkTo(w, e, { x: alt.x, y: alt.y }); }
      else e.tradeState = null; // 全图无营地：待命
      return;
    }
    if (dist(e.x, e.y, camp.x, camp.y) <= camp.radius() + TILE * 2) {
      // 到站交割：按路程结算 + 刷新营地停战（贸易即纳贡）
      const post = (e.homePostId != null ? w.entities.get(e.homePostId) : null) ?? nearestOf(w, e, 'tradePost', true);
      const distTiles = post ? Math.hypot(post.x - camp.x, post.y - camp.y) / 32 : 10;
      e.payout = Math.min(GOLD_TRADE_CAP, GOLD_TRADE_BASE + GOLD_TRADE_PER_10 * Math.floor(distTiles / 10));
      e.jobT = TRADE_DWELL;
      e.jobDur = TRADE_DWELL;
      camp.nTruceUntil = w.time + 120;
      return;
    }
    if (e.order.kind !== 'move') walkTo(w, e, { x: camp.x, y: camp.y });
    return;
  }

  // ---- 回程：驮金回商贸站 ----
  if (e.tradeState === 'toHome') {
    const post = (e.homePostId != null ? w.entities.get(e.homePostId) : null) ?? nearestOf(w, e, 'tradePost', true);
    if (!post) return; // 没商贸站可回：原地待命
    e.homePostId = post.id;
    if (dist(e.x, e.y, post.x, post.y) <= post.radius() + TILE * 2) {
      e.tradeState = 'toCamp';
      const camp = e.tradeCampId != null ? w.entities.get(e.tradeCampId) : null;
      if (camp && camp.defId === 'camp') walkTo(w, e, { x: camp.x, y: camp.y });
      return;
    }
    if (e.order.kind !== 'move') walkTo(w, e, { x: post.x, y: post.y });
    return;
  }

  // ---- 待命：找最近营地开跑 ----
  const camp = nearestOf(w, e, 'camp', false);
  if (camp) {
    e.tradeCampId = camp.id;
    e.tradeState = 'toCamp';
    walkTo(w, e, { x: camp.x, y: camp.y });
  }
}

export function updateTrade(w: World, dt: number): void {
  for (const e of w.entities.values()) {
    if (e.kind !== 'unit' || e.defId !== 'caravan') continue;
    updateCaravan(w, e, dt);
  }
}
