import { TILE, FARM_GROWTH, MAP_W } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 麦田链：耕地自己生长；农夫驱动完整的劳动循环——
 * 收割(成熟格) → 搬运 → 入库(小麦折算成食物) → 回种(茬格)。
 * 一切自动，零指令：玩家的决策只有"铺多少田、雇多少人、护好谁"。
 */

const HARVEST_T = 1.0;  // 收割动作时长（秒）
const PLANT_T = 0.8;    // 回种动作时长（秒）

/** 生长推进：跨过段位界就标脏重绘（成熟=stage3） */
function updateStages(w: World): void {
  for (const i of w.farmTiles) {
    if (w.farmPlanted[i] < 0) continue;
    const elapsed = w.time - w.farmPlanted[i];
    const st = elapsed >= FARM_GROWTH ? 3 : elapsed >= FARM_GROWTH * (2 / 3) ? 2 : 1;
    if (w.farmStage[i] !== st) {
      w.farmStage[i] = st;
      w.dirtyTiles.add(i);
    }
  }
}

export function updateFarms(w: World, dt: number): void {
  updateStages(w);
  for (const e of w.entities.values()) {
    if (e.kind === 'unit' && e.defId === 'farmer') updateFarmer(w, e, dt);
  }
}

function tileCenter(i: number): { x: number; y: number } {
  return { x: (i % MAP_W) * TILE + TILE / 2, y: ((i / MAP_W) | 0) * TILE + TILE / 2 };
}

function walkTo(w: World, e: Entity, p: { x: number; y: number }): void {
  e.order = { kind: 'move', target: p };
  e.path = null;
  e.pathPending = false;
}

/** 扫最近的指定阶段自家麦田（收割优先于回种，由调用方控制先后） */
function nearestTile(w: World, e: Entity, stage: number): number {
  let best = -1, bestD = Infinity;
  for (const i of w.farmTiles) {
    if (w.farmOwner[i] !== e.owner || w.farmStage[i] !== stage) continue;
    const c = tileCenter(i);
    const d = (c.x - e.x) ** 2 + (c.y - e.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function tileValid(w: World, e: Entity, i: number | undefined, stage: number): boolean {
  return i != null && w.farmOwner[i] === e.owner && w.farmStage[i] === stage;
}

function updateFarmer(w: World, e: Entity, dt: number): void {
  // ---- 正在收割/回种：动作计时 ----
  if ((e.jobT ?? 0) > 0) {
    e.jobT = (e.jobT ?? 0) - dt;
    if ((e.jobT ?? 0) <= 0) finishJob(w, e);
    return;
  }

  // ---- 1) 扛着麦子：送仓（最高优先） ----
  if (e.cargo && e.cargo.res === 'wheat' && e.cargo.amt > 0) {
    const depot = w.nearestDepot(e.owner, e.x, e.y);
    if (!depot) return; // 没仓库可去：扛着货罚站（和工程车同款待遇）
    if (dist(e.x, e.y, depot.x, depot.y) <= depot.radius() + TILE * 1.6) {
      const added = w.addRes(e.owner, 'food', e.cargo.amt);
      e.cargo = null;
      if (added > 0) {
        w.addLog('econ', `耕收入库 食+${added.toFixed(0)}`, e.owner, 'farmDeposit:' + e.owner, 20);
        w.addFx(depot.x, depot.y - depot.radius() * 0.6, 'hit', 9, 0.3);
      }
      // 空手返程：回刚才那块茬地补种（断了才找最近的）
      e.farmState = 'toPlant';
      if (!tileValid(w, e, e.farmTile, 0)) e.farmTile = nearestTile(w, e, 0);
      if (e.farmTile != null) walkTo(w, e, tileCenter(e.farmTile));
      return;
    }
    if (e.order.kind !== 'move') walkTo(w, e, { x: depot.x, y: depot.y });
    return;
  }

  // ---- 2) 收割途中：目标仍成熟吗 ----
  if (e.farmState === 'toHarvest') {
    if (!tileValid(w, e, e.farmTile, 3)) {
      e.farmState = null;
      e.farmTile = undefined;
    } else if (e.order.kind === 'idle') {
      e.jobT = HARVEST_T; e.jobDur = HARVEST_T; // 到田头，弯腰开割
      return;
    } else if (e.order.kind !== 'move') {
      walkTo(w, e, tileCenter(e.farmTile!));
    }
    return;
  }

  // ---- 3) 回种途中：茬地还在吗 ----
  if (e.farmState === 'toPlant') {
    if (!tileValid(w, e, e.farmTile, 0)) {
      e.farmState = null;
      e.farmTile = undefined;
    } else if (e.order.kind === 'idle') {
      e.jobT = PLANT_T; e.jobDur = PLANT_T; // 弯腰补种
      return;
    } else if (e.order.kind !== 'move') {
      walkTo(w, e, tileCenter(e.farmTile!));
    }
    return;
  }

  // ---- 4) 扫新活：先收后种 ----
  const mature = nearestTile(w, e, 3);
  if (mature >= 0) {
    e.farmState = 'toHarvest';
    e.farmTile = mature;
    walkTo(w, e, tileCenter(mature));
    return;
  }
  const stubble = nearestTile(w, e, 0);
  if (stubble >= 0) {
    e.farmState = 'toPlant';
    e.farmTile = stubble;
    walkTo(w, e, tileCenter(stubble));
  }
}

/** 动作完成结算 */
function finishJob(w: World, e: Entity): void {
  const i = e.farmTile;
  if (e.farmState === 'toHarvest' && i != null) {
    const amt = w.harvestFarm(i, e.owner);
    if (amt > 0) e.cargo = { res: 'wheat', amt };
    e.farmState = 'toDepot'; // farmTile保留：卸完货回这块茬地补种
  } else if (e.farmState === 'toPlant' && i != null) {
    w.plantFarm(i, e.owner);
    e.farmState = null;
    e.farmTile = undefined;
  }
}
