import { OWNER_NEUTRAL } from '../config';
import { dist } from '../engine/spatialHash';
import { damage } from './combat';
import type { World } from './world';
import type { Entity } from './entity';

/**
 * 地面火区：爆炸弹落地后残留的持续燃烧区域。
 * 范围内敌方单位持续受灼烧伤害（不含空中），持续数秒后自然熄灭。
 */
export function updateFireZones(w: World, dt: number): void {
  for (let i = w.fireZones.length - 1; i >= 0; i--) {
    const fz = w.fireZones[i];
    const age = w.time - fz.born;
    if (age >= fz.dur) { w.fireZones.splice(i, 1); continue; }

    // 范围内敌方地面单位持续灼烧
    for (const o of w.entities.values()) {
      if (o.owner === fz.owner || o.owner === OWNER_NEUTRAL) continue;
      const d = dist(fz.x, fz.y, o.x, o.y) - o.radius();
      if (d <= fz.radius && o.hp > 0) {
        // 每帧微量伤害（60Hz下dps*dt极小，直接扣）
        damage(w, o, fz.dps * dt, fz.owner);
      }
    }
  }
}
