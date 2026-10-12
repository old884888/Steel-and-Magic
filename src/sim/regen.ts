import { REGEN_DELAY, REGEN_RATE } from '../config';
import { BUILDING_DEFS } from '../data/buildings';
import { UNIT_DEFS } from '../data/units';
import type { World } from './world';

/** 三十息再生（v0.14 全阵营通用律）：脱战30秒后回血2%/s；实际掉血重置计时；只回血不回甲 */
export function updateRegen(w: World, dt: number): void {
  for (const e of w.entities.values()) {
    if (e.kind === 'building' && !e.done) continue; // 工地不回血
    const defHp = e.kind === 'unit' ? UNIT_DEFS[e.defId]?.hp : BUILDING_DEFS[e.defId]?.hp;
    if (!defHp || e.hp >= defHp) continue;
    if (w.time - (e.lastDamagedAt ?? -1e9) < REGEN_DELAY) continue;
    e.hp = Math.min(defHp, e.hp + defHp * REGEN_RATE * dt);
  }
}
