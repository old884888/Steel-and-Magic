import { BUILDING_DEFS } from '../data/buildings';
import { TILE, MAP_W, MAP_H, T_GRASS, T_TREE, STORAGE_BASE, STORAGE_PER_STOREHOUSE, HQ_LABOR_RATE, HQ_LABOR_RANGE } from '../config';
import { LOGISTICS_STORAGE, DEEP_STORAGE_BONUS } from '../data/policies';
import { dist } from '../engine/spatialHash';
import { jobRes } from './pop';
import type { World } from './world';
import type { Entity } from './entity';
import type { Res } from '../types';

/**
 * 经济系统（v0.18 居民与家园重构后）：
 * - 全资源共用存储上限（HQ基础 + 仓库加成），一切入账经 world.addRes 钳制
 * - 岗位建筑产出先落小缓冲；转运靠 仓库搬运工（物理扛运，pop.ts）+ 帝国中心劳役班（半径内慢速漏斗，保底物流）
 * - HQ 保底产出直接入库；树木/矿脉耗竭后变草地
 * 自动机（runExtractor）已随双轨采集退役。
 */
export function updateEconomy(w: World, dt: number): void {
  const income = w.players.map(() => ({ wood: 0, food: 0, ore: 0 }));
  const storehouses = w.players.map(() => 0);

  for (const e of w.entities.values()) {
    if (e.kind !== 'building' || !e.done) continue;
    const def = BUILDING_DEFS[e.defId];

    // 统计仓库数量（决定存储上限）
    if (def.capBonus && e.owner <= 1) storehouses[e.owner]++;

    // 护盾回充：脱战5秒后每秒回充
    if (def.shieldPool && e.shield !== undefined) {
      if (w.time - (e.shieldHitAt ?? -99) > 5) {
        e.shield = Math.min(def.shieldPool, e.shield + (def.shieldRegen ?? 15) * dt);
      }
    }

    if (!def.income || e.owner > 1) continue;

    // HQ/生命古树保底产出：直接入库（受上限钳制）
    const gm = w.mult(e.owner, 'gather');
    let active = true;
    for (const [res, rate] of Object.entries(def.income) as [Res, number][]) {
      const added = w.addRes(e.owner, res, rate * gm * dt);
      if (added <= 0) active = false;
      income[e.owner][res] += rate * gm;
    }
    void active;
  }

  // ---- 帝国中心劳役班：半径内岗位建筑缓冲漏斗入库（无搬运工时的保底物流，1.5/秒） ----
  for (const e of w.entities.values()) {
    if (e.kind !== 'building' || !e.done || e.owner > 1) continue;
    if (!BUILDING_DEFS[e.defId].isMain) continue;
    for (const o of w.entities.values()) {
      if (o.kind !== 'building' || !o.done || o.owner !== e.owner || o.buffer <= 0) continue;
      const jobs = BUILDING_DEFS[o.defId].jobs;
      if (!jobs || jobs.bufferCap <= 0) continue;
      if (dist(o.x, o.y, e.x, e.y) > HQ_LABOR_RANGE * TILE) continue;
      const drain = Math.min(o.buffer, HQ_LABOR_RATE * dt);
      const added = w.addRes(e.owner, jobRes(jobs.kind), drain);
      o.buffer -= added;
      if (added > 0) o.bufferStalled = false;
    }
  }

  for (const owner of [0, 1] as const) {
    const p = w.players[owner];
    const mul = p.incomeMul;
    p.income = { wood: income[owner].wood * mul, food: income[owner].food * mul, ore: income[owner].ore * mul };
    p.res.wood += p.income.wood * dt;
    p.res.food += p.income.food * dt;
    p.res.ore += p.income.ore * dt;
    p.storageCap = STORAGE_BASE + STORAGE_PER_STOREHOUSE * storehouses[owner]
      + (p.edict === 'logistics' ? LOGISTICS_STORAGE : 0)
      + (p.techs.includes('deepStorage') ? DEEP_STORAGE_BONUS : 0);
    p.edictCd = Math.max(0, p.edictCd - dt);
  }
}

/** 找建筑周围radius格内最近的树格（供伐木场选点校验等共用） */
export function findTreeNear(w: World, e: { x: number; y: number }, radius = 4): number {
  const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
  let best = -1, bestD = Infinity;
  for (let dy = -radius; dy <= radius + 1; dy++) {
    for (let dx = -radius; dx <= radius + 1; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      const i = y * MAP_W + x;
      if (w.terrain[i] === T_TREE && w.treeWood[i] > 0) {
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
  }
  return best;
}
