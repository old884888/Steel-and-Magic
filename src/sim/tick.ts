import { FOG_INTERVAL, PATH_BUDGET } from '../config';
import type { World } from './world';
import { updateMovement } from './movement';
import { updateCombat } from './combat';
import { updateEconomy } from './economy';
import { updateConstruction } from './construction';
import { updateGather } from './gather';
import { updateFarms } from './farm';
import { updateNeutrals } from './neutral';
import { updateFireZones } from './firezone';
import { updateFog } from './fog';
import type { AIController } from './ai';

/** 一个模拟步：60Hz 固定推进。simTick之外无任何状态变更入口 */
export function simTick(w: World, dt: number, ais: (AIController | null)[]): void {
  w.tick++;
  w.time += dt;
  w.pathBudget = PATH_BUDGET;

  // 空间哈希重建（单位位置供本帧查询）
  w.hash.clear();
  for (const e of w.entities.values()) {
    if (e.kind === 'unit') w.hash.insert(e.id, e.x, e.y, 12);
  }

  for (const ai of ais) if (ai) ai.update(w, dt);
  updateEconomy(w, dt);
  updateConstruction(w, dt);
  updateGather(w, dt);
  updateFarms(w, dt);
  updateNeutrals(w, dt);
  updateFireZones(w, dt);
  updateCombat(w, dt);
  updateMovement(w, dt);
  if (w.tick % FOG_INTERVAL === 0) updateFog(w);
  if (w.tick % 30 === 0) w.recomputePop();
  if (w.tick % 300 === 0) w.recomputeAdjacency(); // 地利加成每5秒重算（完工时也会即时算）
  w.events.update(w, dt);                          // 事件卡调度（AI秒决/玩家弹卡）
}
