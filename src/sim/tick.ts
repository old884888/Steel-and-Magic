import { FOG_INTERVAL, PATH_BUDGET } from '../config';
import type { World } from './world';
import { updateMovement } from './movement';
import { updateCombat } from './combat';
import { updateEconomy } from './economy';
import { updateConstruction } from './construction';
import { updateFarms } from './farm';
import { updateTrade } from './trade';
import { updateRegen } from './regen';
import { updateNeutrals, updateCarcasses } from './neutral';
import { updatePop } from './pop';
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
  updatePop(w, dt);
  updateFarms(w, dt);
  updateTrade(w, dt);
  updateNeutrals(w, dt);
  updateCarcasses(w);                             // 尸体腐烂：份额衰减+走近自动拾取
  updateFireZones(w, dt);
  updateCombat(w, dt);
  updateMovement(w, dt);
  if (w.tick % FOG_INTERVAL === 0) updateFog(w);
  if (w.tick % 30 === 0) {
    w.recomputePop();
    // 岗位对账：殉职/失踪的居民从在岗表除名（岗位空缺可见）
    for (const e of w.entities.values()) {
      if (e.kind !== 'building' || !e.staffIds) continue;
      if (e.staffIds.some(id => !w.entities.get(id))) e.staffIds = e.staffIds.filter(id => w.entities.get(id));
    }
  }
  if (w.tick % 300 === 0) w.recomputeAdjacency(); // 地利加成每5秒重算（完工时也会即时算）
  updateRegen(w, dt);                             // 三十息再生：脱战30秒回血2%/s
  w.checkCoronation();                            // 奇观加冕倒计时判定
}
