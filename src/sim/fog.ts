import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { MAP_W, MAP_H, HEIGHT_VISION_BONUS } from '../config';
import type { World } from './world';

/**
 * 战争迷雾：每玩家三态 0未探（黑）/ 1已探（半暗）/ 2可见
 * 每 FOG_INTERVAL 模拟帧全量重算；高地每层视野+1格
 */
export function updateFog(w: World): void {
  for (const owner of [0, 1] as const) {
    const f = w.fog[owner];
    for (let i = 0; i < f.length; i++) if (f[i] === 2) f[i] = 1;
    for (const e of w.entities.values()) {
      if (e.owner !== owner) continue;
      const base = e.kind === 'unit' ? UNIT_DEFS[e.defId].vision : BUILDING_DEFS[e.defId].vision;
      const vision = base + w.heightAt(e.x, e.y) * HEIGHT_VISION_BONUS;
      revealCircle(f, Math.floor(e.x / 32), Math.floor(e.y / 32), vision);
    }
  }
}

function revealCircle(f: Uint8Array, cx: number, cy: number, r: number): void {
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= MAP_H) continue;
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= MAP_W) continue;
      if (dx * dx + dy * dy <= r2) f[y * MAP_W + x] = 2;
    }
  }
}

/** 该坐标对某玩家是否当前可见 */
export function isVisible(w: World, owner: 0 | 1, x: number, y: number): boolean {
  const tx = Math.floor(x / 32), ty = Math.floor(y / 32);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return w.fog[owner][ty * MAP_W + tx] === 2;
}
