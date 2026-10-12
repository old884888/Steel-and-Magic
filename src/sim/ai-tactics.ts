import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { MAP_W, MAP_H, TILE } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';
import type { AIConfig } from './ai-config';

/**
 * AI战术模块库：
 * - takeSnapshot：每次思考先拍一张"局势快照"（单次O(n)扫描，战术全部读快照不重复扫场）
 * - 战术行为函数：由 ai.ts 按配置开关逐个调用，互不抢跑道（并行正交决策）
 */

export interface AISnapshot {
  time: number;
  myBuildings: Entity[];
  myUnits: Entity[];
  army: Entity[];                              // 有武器的战斗单位
  foeBuildings: Entity[];
  foeUnits: Entity[];
  foeComposition: Record<string, number>;      // 敌方部队构成（克制配兵用）
  wood: number; food: number; ore: number;
  gold: number;                                // 金币（纪元/买粮决策用）
  era: number;                                 // 纪元（0拓荒/1工业/2钢铁，奇观打分用）
  myPierceShare: number;                       // 己方破甲火力占比（反装甲配兵用）
  foeHeavyShare: number;                       // 敌方重甲单位占比
  storageCap: number;
  incomeWood: number;
  incomeFood: number;
  pop: number; popCap: number;
  threatened: { building: Entity; foe: Entity } | null;  // 家被偷（建筑受损+敌人近身）
}

export interface TacticCtx {
  w: World;
  owner: 0 | 1;
  foe: 0 | 1;
  cfg: AIConfig;
  snap: AISnapshot;
  army: Entity[];
}

/** 单次全实体扫描生成局势快照 */
export function takeSnapshot(w: World, owner: 0 | 1, foe: 0 | 1): AISnapshot {
  const myBuildings: Entity[] = [];
  const myUnits: Entity[] = [];
  const army: Entity[] = [];
  const foeBuildings: Entity[] = [];
  const foeUnits: Entity[] = [];
  const foeComposition: Record<string, number> = {};

  for (const e of w.entities.values()) {
    if (e.owner === owner) {
      if (e.kind === 'building') myBuildings.push(e);
      else {
        myUnits.push(e);
        if (UNIT_DEFS[e.defId].weapon) army.push(e);
      }
    } else if (e.owner === foe) {
      if (e.kind === 'building') foeBuildings.push(e);
      else {
        foeUnits.push(e);
        foeComposition[e.defId] = (foeComposition[e.defId] ?? 0) + 1;
      }
    }
  }

  // 家被偷判定：建筑受损（建成状态）+ 敌人近身
  let threatened: AISnapshot['threatened'] = null;
  for (const b of myBuildings) {
    if (!b.done || b.hp >= BUILDING_DEFS[b.defId].hp) continue;
    let nearestFoe: Entity | null = null, nearestD = Infinity;
    for (const f of foeUnits) {
      const d = dist(f.x, f.y, b.x, b.y);
      if (d < 13 * TILE && d < nearestD) { nearestD = d; nearestFoe = f; }
    }
    if (nearestFoe) { threatened = { building: b, foe: nearestFoe }; break; }
  }

  let pierceCount = 0;
  for (const u of army) if (UNIT_DEFS[u.defId].weapon?.pierce) pierceCount++;
  let foeHeavyCount = 0;
  for (const u of foeUnits) if ((UNIT_DEFS[u.defId].armor ?? 'light') === 'heavy') foeHeavyCount++;

  const p = w.players[owner];
  return {
    time: w.time,
    myBuildings, myUnits, army,
    foeBuildings, foeUnits, foeComposition,
    wood: p.res.wood, food: p.res.food, ore: p.res.ore,
    gold: p.gold, era: p.era,
    myPierceShare: army.length ? pierceCount / army.length : 0,
    foeHeavyShare: foeUnits.length ? foeHeavyCount / foeUnits.length : 0,
    storageCap: p.storageCap,
    incomeWood: p.income.wood,
    incomeFood: p.income.food,
    pop: p.pop, popCap: p.popCap,
    threatened,
  };
}

/**
 * 撤退止损：血量低于35%的单位撤向最近仓库/HQ。
 * 锁定期内（cfg.retreatLockSec，默认8~12秒）AI不给它派新活，杜绝反复横跳。
 */
export function applyRetreat(ctx: TacticCtx): void {
  for (const u of ctx.army) {
    if ((u.aiRetreatUntil ?? 0) > ctx.snap.time) continue;
    const maxHp = UNIT_DEFS[u.defId].hp;
    if (u.hp > maxHp * 0.35) continue;
    const depot = ctx.w.nearestDepot(u.owner, u.x, u.y);
    if (!depot) continue;
    ctx.w.issueMove([u.id], { x: depot.x, y: depot.y });
    u.aiRetreatUntil = ctx.snap.time + ctx.cfg.retreatLockSec;
    u.engagedId = null;
    ctx.w.addLog('military', '残血单位撤离前线整编', u.owner, 'retreat:' + u.owner, 15);
  }
}

/** 判断单位是否处于撤退锁定期（ai.ts派单时跳过） */
export function isRetreating(e: Entity, time: number): boolean {
  return (e.aiRetreatUntil ?? 0) > time;
}

/**
 * 保炮车：火炮被敌人近身（小于最小射程）时向后撤离，打一枪换一个地方。
 */
export function applySpareArtillery(ctx: TacticCtx): void {
  for (const u of ctx.army) {
    if (u.defId !== 'artillery') continue;
    if ((u.aiSpareUntil ?? 0) > ctx.snap.time) continue;
    const minRange = UNIT_DEFS['artillery'].weapon?.minRange ?? 60;
    let threat: Entity | null = null;
    for (const f of ctx.snap.foeUnits) {
      if (dist(f.x, f.y, u.x, u.y) < minRange) { threat = f; break; }
    }
    if (!threat) continue;
    // 背向敌人撤5格
    const dx = u.x - threat.x, dy = u.y - threat.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = u.x + (dx / len) * TILE * 5, ty = u.y + (dy / len) * TILE * 5;
    ctx.w.issueMove([u.id], { x: tx, y: ty });
    u.aiSpareUntil = ctx.snap.time + 6;
    u.engagedId = null;
  }
}

/** 抢高地：目标点附近半径内找最高可站立格 */
export function findHighGroundNear(w: World, x: number, y: number, radius = 3): { x: number; y: number } | null {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  let best: { x: number; y: number } | null = null, bestH = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const i = ny * MAP_W + nx;
      if (!w.walkable[i] || w.height[i] <= bestH) continue;
      bestH = w.height[i];
      best = { x: (nx + 0.5) * TILE, y: (ny + 0.5) * TILE };
    }
  }
  return best;
}

/**
 * 克制配兵：依据敌方构成返回生产权重修正。
 * 对面坦克多 → 多造火炮（溅射）和哨戒炮？坦克对位——多上火炮；
 * 对面步兵海 → 多上坦克；
 * 对面火炮多 → 多造快车贴脸（坦克）。
 */
export function counterCompWeights(comp: Record<string, number>): Record<string, number> {
  const adj: Record<string, number> = {};
  const tanks = comp['tank'] ?? 0;
  const infantry = comp['infantry'] ?? 0;
  const artillery = comp['artillery'] ?? 0;
  if (tanks > infantry) {
    adj['artillery'] = 1.5;
    adj['turret'] = 1.3;
  } else if (infantry > 0) {
    adj['tank'] = 1.3;
  }
  if (artillery > 0) {
    adj['tank'] = (adj['tank'] ?? 1) * 1.3;
  }
  return adj;
}
