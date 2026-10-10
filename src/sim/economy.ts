import { BUILDING_DEFS } from '../data/buildings';
import { TILE, MAP_W, MAP_H, T_GRASS, T_TREE, STORAGE_BASE, STORAGE_PER_STOREHOUSE } from '../config';
import { LOGISTICS_STORAGE, DEEP_STORAGE_BONUS } from '../data/policies';
import type { World } from './world';
import type { Entity } from './entity';
import type { Res } from '../types';

/**
 * 经济系统：
 * - 全资源共用存储上限（HQ基础 + 仓库加成），一切入账经 world.addRes 钳制
 * - 自动机（伐木站/采矿场）：开采进内部缓冲仓，缓冲仓按转运速率入库；满仓停机
 * - 农场/HQ：直接入库（同样受上限）
 * - 树木/矿脉耗竭后变草地
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

    if (!def.income) continue;

    // 采集乘数：法令/科技 × 地利加成 × 富矿脉事件
    const gm = w.mult(e.owner, 'gather')
      * (e.defId === 'lumber' || e.defId === 'mine' || e.defId === 'farm' ? (e.adjBonus ?? 1) : 1)
      * ((e.boostUntil ?? 0) > w.time ? 2 : 1);

    let active = true;
    if (e.defId === 'lumber') active = runExtractor(w, e, 'wood', (def.income.wood ?? 0) * gm, def.bufferCap ?? 30, dt);
    else if (e.defId === 'mine') active = runExtractor(w, e, 'ore', (def.income.ore ?? 0) * gm, def.bufferCap ?? 40, dt);
    else if (e.owner <= 1) {
      // 农场/HQ 直接入库
      for (const [res, rate] of Object.entries(def.income) as [Res, number][]) {
        const added = w.addRes(e.owner, res, rate * gm * dt);
        if (added <= 0) active = false;
        income[e.owner][res] += rate * gm;
      }
    }

    if (active) {
      const inc = income[e.owner];
      inc.wood += (def.income.wood ?? 0) * gm;
      inc.food += (def.income.food ?? 0) * gm;
      inc.ore += (def.income.ore ?? 0) * gm;
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

/**
 * 自动机运转：资源格 →(开采进缓冲仓)→ 缓冲仓 →(转运入库)
 * 满仓（库存到上限且缓冲仓满）时停机保息，资源格不白耗
 */
function runExtractor(w: World, e: Entity, res: 'wood' | 'ore', rate: number, bufferCap: number, dt: number): boolean {
  // 1) 缓冲仓 → 库存（转运速率 8/秒，受上限钳制）
  if (e.buffer > 0) {
    const moved = w.addRes(e.owner, res, Math.min(e.buffer, 8 * dt));
    e.buffer -= moved;
  }
  e.bufferStalled = e.buffer >= bufferCap - 0.01 && w.players[e.owner].res[res] >= w.players[e.owner].storageCap - 0.01;
  if (e.bufferStalled) return false; // 满仓停机

  // 2) 资源格 → 缓冲仓（开采）
  if (e.linkedTile < 0 || !hasResourceAt(w, e, res)) {
    e.linkedTile = res === 'wood' ? findTreeNear(w, e) : w.pickOreTile(e.tx, e.ty, BUILDING_DEFS[e.defId].size);
    if (e.linkedTile < 0) return false;
  }
  const take = Math.min(rate * dt, bufferCap - e.buffer);
  if (take <= 0) return true;
  if (res === 'wood') {
    w.treeWood[e.linkedTile] -= take;
    if (w.treeWood[e.linkedTile] <= 0) exhaustTile(w, e, '树林');
  } else {
    w.oreLeft[e.linkedTile] -= take;
    if (w.oreLeft[e.linkedTile] <= 0) exhaustTile(w, e, '矿脉');
  }
  e.buffer += take;
  return true;
}

function hasResourceAt(w: World, e: Entity, res: 'wood' | 'ore'): boolean {
  if (e.linkedTile < 0) return false;
  return res === 'wood'
    ? w.terrain[e.linkedTile] === T_TREE && w.treeWood[e.linkedTile] > 0
    : w.oreLeft[e.linkedTile] > 0;
}

function exhaustTile(w: World, e: Entity, name: string): void {
  w.terrain[e.linkedTile] = T_GRASS;
  w.treeWood[e.linkedTile] = 0;
  w.oreLeft[e.linkedTile] = 0;
  w.walkable[e.linkedTile] = 1;
  w.dirtyTiles.add(e.linkedTile);
  w.addLog('econ', `${name}被开采殆尽`, e.owner);
  e.linkedTile = -1;
}

/** 找建筑周围4格内最近的树格（供伐木站与人工砍树共用） */
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
