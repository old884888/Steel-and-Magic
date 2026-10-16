import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import {
  TILE, MAP_W, MAP_H, T_ORE,
  WORKER_RATE, WORKER_CARRY, JOB_R_LUMBER, JOB_R_MINE,
  HAULER_RANGE, HAULER_LOAD, HAULER_TRIG,
  MORALE_GROW_AT, MORALE_LOSS_AT, GROW_EVERY, LOSS_EVERY,
  FOOD_PER_POP, TAX_FACTORS, TAX_COMFORT,
  W_HYGIENE, W_FOOD, W_TAX,
} from '../config';
import { dist } from '../engine/spatialHash';
import { nearestWalkable } from '../engine/astar';
import type { World } from './world';
import type { Entity } from './entity';
import type { JobKind, Res } from '../types';

/**
 * 居民与家园（v0.18）：民心/人口税/岗位劳动循环/搬运物流。
 * 红线：全程确定性（无随机数）；民心永不直接杀死单位；待业居民不是实体（受雇才从住房走出来）。
 * 农夫（farm job）的麦田链在 farm.ts；本文件管伐木工/矿工/搬运工与全国账目。
 */

/** 岗位产出的资源类型 */
export function jobRes(kind: JobKind): Res {
  return kind === 'farmer' ? 'food' : kind === 'lumberjack' ? 'wood' : 'ore';
}

/** 每帧：民心重算/增长流失节拍（每秒一拍）+ 人口税入账（每帧）+ 岗位劳动循环 */
export function updatePop(w: World, dt: number): void {
  // ---- 人口税：人口 × 档位系数 / 60（金/人/分钟 → 每帧） ----
  for (const owner of [0, 1] as const) {
    const p = w.players[owner];
    if (p.pop > 0 && p.gold < 1e6) {
      p.gold += (p.pop * TAX_FACTORS[p.taxTier] / 60) * dt;
    }
  }

  // ---- 民心与增长/流失：每秒一拍（确定性） ----
  if (w.tick % 60 === 0) {
    for (const owner of [0, 1] as const) {
      const p = w.players[owner];
      const popCap = p.popCap, pop = p.pop;

      // 卫生覆盖：民居被任一卫生源罩住的比例（无民居=满分）
      const houses: Entity[] = [];
      for (const e of w.entities.values()) {
        if (e.kind === 'building' && e.done && e.owner === owner && e.defId === 'house') houses.push(e);
      }
      let hygiene = 1;
      if (houses.length > 0) {
        let covered = 0;
        for (const h of houses) {
          let hit = false;
          for (const s of w.entities.values()) {
            if (s.kind !== 'building' || !s.done || s.owner !== owner) continue;
            const r = (BUILDING_DEFS[s.defId].hygieneR ?? 0) * TILE;
            if (r <= 0) continue;
            if (dist(s.x, s.y, h.x, h.y) <= r) { hit = true; break; }
          }
          if (hit) covered++;
        }
        hygiene = covered / houses.length;
      }
      // 食物充足率：库存 ≥ 人口×10 满分，线性衰减到 0
      const foodRate = Math.max(0, Math.min(1, pop > 0 ? p.res.food / (pop * FOOD_PER_POP) : 1));
      p.morale = Math.round(100 * (W_HYGIENE * hygiene + W_FOOD * foodRate + W_TAX * TAX_COMFORT[p.taxTier]));

      // 战争豁免：敌军（非中立）逼近本方建筑 → 流失暂停（不双重惩罚）
      let invaded = false;
      outer: for (const e of w.entities.values()) {
        if (e.kind !== 'building' || !e.done || e.owner !== owner) continue;
        for (const o of w.entities.values()) {
          if (o.owner === owner || o.owner > 1 || o.kind !== 'unit') continue;
          if (dist(o.x, o.y, e.x, e.y) <= 8 * TILE) { invaded = true; break outer; }
        }
      }

      // 增长：民心≥60 且人口<容量 → 每30秒 +1（移民到来）
      if (p.morale >= MORALE_GROW_AT && pop < popCap) {
        p.growT += 1;
        if (p.growT >= GROW_EVERY) {
          p.growT = 0;
          p.residents += 1;
          w.addLog('econ', '移民到来：待业居民+1（民心高，人往这里走）', owner, 'grow:' + owner, 30);
        }
      } else p.growT = 0;

      // 流失：民心≤30 → 每60秒 -1（先走待业；地板=初始人口；入侵豁免）
      if (p.morale <= MORALE_LOSS_AT && pop > 5 && p.residents > 0 && !invaded) {
        p.lossT += 1;
        if (p.lossT >= LOSS_EVERY) {
          p.lossT = 0;
          p.residents -= 1;
          w.addLog('system', '居民流失：待业-1（民心低，人往别处跑）', owner, 'loss:' + owner, 30);
        }
      } else p.lossT = 0;
    }
  }

  updateWorkers(w, dt);
}

// ================= 岗位劳动循环 =================

function walkTo(w: World, e: Entity, x: number, y: number): void {
  const g = nearestWalkable(w.walkable, Math.floor(x / TILE), Math.floor(y / TILE));
  e.order = { kind: 'move', target: { x: (g.x + 0.5) * TILE, y: (g.y + 0.5) * TILE } };
  e.path = null;
  e.pathPending = false;
}

function atHost(e: Entity, host: Entity): boolean {
  return dist(e.x, e.y, host.x, host.y) <= host.radius() + TILE * 1.6;
}

function updateWorkers(w: World, dt: number): void {
  for (const e of w.entities.values()) {
    if (e.kind !== 'unit' || !UNIT_DEFS[e.defId].resident) continue;
    const host = w.entities.get(e.jobBuilding ?? 0);
    if (!host || host.kind !== 'building' || !host.done || host.owner !== e.owner) continue;
    const jobs = BUILDING_DEFS[host.defId].jobs;
    if (!jobs || jobs.kind !== e.jobKind) continue;
    if (e.order.kind === 'move') continue; // 赶路交给movement
    if (e.jobKind === 'farmer') continue;  // 农夫麦田链在 farm.ts

    // 正在干活（动作计时）
    if ((e.jobT ?? 0) > 0) {
      e.jobT = (e.jobT ?? 0) - dt;
      if ((e.jobT ?? 0) <= 0) e.jobT = 0;
      continue;
    }
    // 未就位：先回岗
    if (!atHost(e, host)) { walkTo(w, e, host.x, host.y); continue; }

    if (e.jobKind === 'lumberjack') workerChop(w, e, host, dt);
    else if (e.jobKind === 'miner') workerDig(w, e, host, dt);
    else if (e.jobKind === 'hauler') haulerLoop(w, e, host);
  }
}

/** 缓冲入库：返回实际入库量（缓冲满则滞留） */
function bufferAdd(host: Entity, amt: number): number {
  const cap = BUILDING_DEFS[host.defId].jobs?.bufferCap ?? 0;
  const room = Math.max(0, cap - host.buffer);
  const put = Math.min(room, amt);
  host.buffer += put;
  host.bufferStalled = room <= 0.01;
  return put;
}

/** 在雇主建筑半径内找资源格（树/矿） */
function findResourceNear(w: World, host: Entity, kind: 'tree' | 'ore', radius: number): number {
  const tx = Math.floor(host.x / TILE), ty = Math.floor(host.y / TILE);
  let best = -1, bestD = Infinity;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      const i = y * MAP_W + x;
      const ok = kind === 'tree'
        ? (w.terrain[i] === 2 && w.treeWood[i] > 0)
        : (w.terrain[i] === T_ORE && w.oreLeft[i] > 0);
      if (ok) {
        const d = dx * dx + dy * dy;
        if (d > 0 && d < bestD) { bestD = d; best = i; }
      }
    }
  }
  return best;
}

function tileCenter(i: number): { x: number; y: number } {
  return { x: (i % MAP_W) * TILE + TILE / 2, y: ((i / MAP_W) | 0) * TILE + TILE / 2 };
}

/** 伐木工/矿工共用循环：找资源→走去→开采入cargo→扛回→入缓冲 */
function workerChop(w: World, e: Entity, host: Entity, dt: number): void {
  workerMineLoop(w, e, host, dt, 'tree');
}

function workerDig(w: World, e: Entity, host: Entity, dt: number): void {
  workerMineLoop(w, e, host, dt, 'ore');
}

function workerMineLoop(w: World, e: Entity, host: Entity, dt: number, kind: 'tree' | 'ore'): void {
  const radius = kind === 'tree' ? JOB_R_LUMBER : JOB_R_MINE;
  switch (e.gatherState) {
    case 'toRes': {
      const c = tileCenter(e.resTile);
      const has = kind === 'tree'
        ? (w.terrain[e.resTile] === 2 && w.treeWood[e.resTile] > 0)
        : (w.terrain[e.resTile] === T_ORE && w.oreLeft[e.resTile] > 0);
      if (!has) { e.gatherState = null; break; }
      if (dist(e.x, e.y, c.x, c.y) <= TILE * 2.2) {
        e.gatherState = 'gathering';
        e.path = null;
      }
      break;
    }
    case 'gathering': {
      if (!e.cargo) e.cargo = { res: kind === 'tree' ? 'wood' : 'ore', amt: 0 };
      if (e.cargo.amt >= WORKER_CARRY - 0.01) { e.gatherState = 'toDepot'; e.path = null; break; }
      const has = kind === 'tree'
        ? (w.terrain[e.resTile] === 2 && w.treeWood[e.resTile] > 0)
        : (w.terrain[e.resTile] === T_ORE && w.oreLeft[e.resTile] > 0);
      if (!has) {
        // 资源枯竭：货有多少扛多少
        if ((e.cargo?.amt ?? 0) > 0) { e.gatherState = 'toDepot'; e.path = null; }
        else e.gatherState = null;
        break;
      }
      const gm = w.mult(e.owner, 'gather') * (host.adjBonus ?? 1);
      const take = Math.min(WORKER_RATE * gm * dt, WORKER_CARRY - (e.cargo?.amt ?? 0));
      if (!e.cargo) e.cargo = { res: kind === 'tree' ? 'wood' : 'ore', amt: 0 };
      if (kind === 'tree') {
        const put = Math.min(take, w.treeWood[e.resTile]);
        w.treeWood[e.resTile] -= put;
        e.cargo.amt += put;
        if (w.treeWood[e.resTile] <= 0.01) exhaustTile(w, e.resTile, '一棵树被砍完', e.owner);
      } else {
        const put = Math.min(take, w.oreLeft[e.resTile]);
        w.oreLeft[e.resTile] -= put;
        e.cargo.amt += put;
        if (w.oreLeft[e.resTile] <= 0.01) exhaustTile(w, e.resTile, '一处矿脉被采空', e.owner);
      }
      if (e.cargo.amt >= WORKER_CARRY - 0.01) { e.cargo.amt = WORKER_CARRY; e.gatherState = 'toDepot'; e.path = null; }
      break;
    }
    case 'toDepot': {
      if (atHost(e, host)) {
        // 入缓冲（满则扛着等）
        if (e.cargo && e.cargo.amt > 0) {
          const put = bufferAdd(host, e.cargo.amt);
          e.cargo.amt -= put;
          if (put > 0) w.addFx(host.x, host.y - host.radius() * 0.5, 'hit', 7, 0.25);
          if (e.cargo.amt <= 0.01) { e.cargo = null; e.gatherState = null; }
        } else { e.cargo = null; e.gatherState = null; }
      } else {
        walkTo(w, e, host.x, host.y);
      }
      break;
    }
    default: {
      // 空手：找活。缓冲快满就先别跑（免得白扛）
      const cap = BUILDING_DEFS[host.defId].jobs?.bufferCap ?? 0;
      if (host.buffer >= cap - 0.01) { host.bufferStalled = true; break; }
      const tile = findResourceNear(w, host, kind, radius);
      if (tile < 0) break; // 岗位闲置（树尽/矿尽）
      e.resTile = tile;
      e.gatherState = 'toRes';
      const c = tileCenter(tile);
      walkTo(w, e, c.x, c.y);
      break;
    }
  }
}

function exhaustTile(w: World, i: number, msg: string, owner: number): void {
  w.terrain[i] = 0; // T_GRASS
  w.treeWood[i] = 0;
  w.oreLeft[i] = 0;
  w.walkable[i] = 1;
  w.dirtyTiles.add(i);
  w.addLog('econ', msg, owner);
}

/** 搬运工：辖内（半径12格）岗位建筑缓冲>50% 自动来扛，最满优先；扛回本仓入库 */
function haulerLoop(w: World, e: Entity, host: Entity): void {
  if (e.cargo && e.cargo.amt > 0) {
    // 扛着货：回仓入库（自己就是仓库）
    if (atHost(e, host)) {
      const added = w.addRes(e.owner, e.cargo.res as Res, e.cargo.amt);
      if (added > 0) {
        w.addFx(host.x, host.y - host.radius() * 0.5, 'hit', 8, 0.3);
        w.addLog('econ', `搬运入库 +${added.toFixed(0)}`, e.owner, 'haul:' + host.id, 20);
      }
      if (added >= e.cargo.amt - 0.01) e.cargo = null;
      // 仓库满载：货物留住，原地等空位
    } else if (e.order.kind !== 'move') {
      walkTo(w, e, host.x, host.y);
    }
    return;
  }
  // 找最满的辖内建筑（缓冲>50%触发）
  let src: Entity | null = null, bestRatio = HAULER_TRIG;
  for (const o of w.entities.values()) {
    if (o.kind !== 'building' || !o.done || o.owner !== e.owner || o.id === host.id) continue;
    const jobs = BUILDING_DEFS[o.defId].jobs;
    if (!jobs || jobs.bufferCap <= 0 || o.buffer <= 0) continue;
    if (dist(o.x, o.y, host.x, host.y) > HAULER_RANGE * TILE) continue;
    const ratio = o.buffer / jobs.bufferCap;
    if (ratio > bestRatio) { bestRatio = ratio; src = o; }
  }
  if (!src) return;
  if (atHost(e, src)) {
    const take = Math.min(src.buffer, HAULER_LOAD);
    src.buffer -= take;
    src.bufferStalled = false;
    e.cargo = { res: jobRes(BUILDING_DEFS[src.defId].jobs!.kind), amt: take };
  } else if (e.order.kind !== 'move') {
    walkTo(w, e, src.x, src.y);
  }
}
