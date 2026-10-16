import { TILE, FARM_GROWTH, MAP_W, JOB_R_FARM } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 麦田链（v0.18 农庄版）：耕地自己生长；农庄的居民（jobKind='farmer'）驱动劳动循环——
 * 收割(成熟格) → 扛回农庄(入本庄小缓冲) → 回种(茬格)。
 * 农夫只服务雇主农庄管辖半径（JOB_R_FARM 格）内的田；小缓冲由搬运工/帝国中心劳役班转运。
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
    if (e.kind === 'unit' && e.jobKind === 'farmer') updateFarmer(w, e, dt);
  }
}

function tileCenter(i: number): { x: number; y: number } {
  return { x: (i % MAP_W) * TILE + TILE / 2, y: ((i / MAP_W) | 0) * TILE + TILE / 2 };
}

function walkTo(e: Entity, p: { x: number; y: number }): void {
  e.order = { kind: 'move', target: p };
  e.path = null;
  e.pathPending = false;
}

/** 扫雇主农庄管辖半径内的指定阶段自家麦田（收割优先于回种，由调用方控制先后） */
function nearestTile(w: World, host: Entity, stage: number): number {
  let best = -1, bestD = Infinity;
  const R = JOB_R_FARM * TILE;
  const r2 = R * R; // 管辖半径（格）换算像素再平方
  for (const i of w.farmTiles) {
    if (w.farmOwner[i] !== host.owner || w.farmStage[i] !== stage) continue;
    const c = tileCenter(i);
    const d = (c.x - host.x) ** 2 + (c.y - host.y) ** 2;
    if (d <= r2 && d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function tileValid(w: World, host: Entity, i: number | undefined, stage: number): boolean {
  if (i == null) return false;
  if (w.farmOwner[i] !== host.owner || w.farmStage[i] !== stage) return false;
  const c = tileCenter(i);
  const R = JOB_R_FARM * TILE;
  return (c.x - host.x) ** 2 + (c.y - host.y) ** 2 <= R * R;
}

function updateFarmer(w: World, e: Entity, dt: number): void {
  const host = w.entities.get(e.jobBuilding ?? 0);
  if (!host || host.kind !== 'building' || !host.done || host.owner !== e.owner) return; // 雇主没了：罚站
  const cap = 24; // 农庄小缓冲（与buildings.ts jobs.bufferCap一致）

  // ---- 正在收割/回种：动作计时 ----
  if ((e.jobT ?? 0) > 0) {
    e.jobT = (e.jobT ?? 0) - dt;
    if ((e.jobT ?? 0) <= 0) finishJob(w, e, host, cap);
    return;
  }

  // ---- 1) 扛着麦子：送回农庄入缓冲（最高优先） ----
  if (e.cargo && e.cargo.res === 'wheat' && e.cargo.amt > 0) {
    if (dist(e.x, e.y, host.x, host.y) <= host.radius() + TILE * 1.6) {
      const room = Math.max(0, cap - host.buffer);
      const put = Math.min(room, e.cargo.amt);
      host.buffer += put;
      e.cargo.amt -= put;
      if (put > 0) {
        w.addFx(host.x, host.y - host.radius() * 0.5, 'hit', 8, 0.3);
        w.addLog('econ', `农庄收成入缓冲 食+${put.toFixed(0)}`, e.owner, 'farmBuffer:' + host.id, 30);
      }
      if (e.cargo.amt <= 0.01) {
        e.cargo = null;
        // 空手返程：回刚才那块茬地补种（断了才找最近的）
        e.farmState = 'toPlant';
        if (!tileValid(w, host, e.farmTile, 0)) e.farmTile = nearestTile(w, host, 0);
        if (e.farmTile != null) walkTo(e, tileCenter(e.farmTile));
      }
      // 缓冲满：扛着等（搬运工快来）
      return;
    }
    if (e.order.kind !== 'move') walkTo(e, { x: host.x, y: host.y });
    return;
  }

  // ---- 2) 收割途中：目标仍成熟吗 ----
  if (e.farmState === 'toHarvest') {
    if (!tileValid(w, host, e.farmTile, 3)) {
      e.farmState = null;
      e.farmTile = undefined;
    } else if (e.order.kind === 'idle') {
      e.jobT = HARVEST_T; e.jobDur = HARVEST_T; // 到田头，弯腰开割
      return;
    } else if (e.order.kind !== 'move') {
      walkTo(e, tileCenter(e.farmTile!));
    }
    return;
  }

  // ---- 3) 回种途中：茬地还在吗 ----
  if (e.farmState === 'toPlant') {
    if (!tileValid(w, host, e.farmTile, 0)) {
      e.farmState = null;
      e.farmTile = undefined;
    } else if (e.order.kind === 'idle') {
      e.jobT = PLANT_T; e.jobDur = PLANT_T; // 弯腰补种
      return;
    } else if (e.order.kind !== 'move') {
      walkTo(e, tileCenter(e.farmTile!));
    }
    return;
  }

  // ---- 4) 扫新活：先收后种；缓冲满则只补种不收割 ----
  if (host.buffer < cap - 0.01) {
    const mature = nearestTile(w, host, 3);
    if (mature >= 0) {
      e.farmState = 'toHarvest';
      e.farmTile = mature;
      walkTo(e, tileCenter(mature));
      return;
    }
  }
  const stubble = nearestTile(w, host, 0);
  if (stubble >= 0) {
    e.farmState = 'toPlant';
    e.farmTile = stubble;
    walkTo(e, tileCenter(stubble));
  }
}

/** 动作完成结算（产量由 harvestFarm 内部结算地利与采集乘数） */
function finishJob(w: World, e: Entity, host: Entity, cap: number): void {
  const i = e.farmTile;
  if (e.farmState === 'toHarvest' && i != null) {
    const amt = w.harvestFarm(i, e.owner);
    if (amt > 0) e.cargo = { res: 'wheat', amt };
    e.farmState = 'toDepot'; // farmTile保留：卸完货回这块茬地补种
    void cap; void host;
  } else if (e.farmState === 'toPlant' && i != null) {
    w.plantFarm(i, e.owner);
    e.farmState = null;
    e.farmTile = undefined;
  }
}
