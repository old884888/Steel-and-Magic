import { MAP_W, MAP_H, T_GRASS, T_WATER, T_TREE, T_ORE, T_RAMP, T_FORD } from '../config';
import { RNG } from '../engine/rng';

export interface MapData {
  terrain: Uint8Array;
  height: Uint8Array;      // 每格高度层 0..3
  treeWood: Float32Array;
  oreLeft: Float32Array;
  playerBase: { tx: number; ty: number };
  enemyBase: { tx: number; ty: number };
}

export type MapVariant = 'standard' | 'islands';

const idx = (x: number, y: number): number => y * MAP_W + x;

/**
 * 对称地图生成：双基地对角、湖面、树林、矿脉（基地矿+中路争夺矿）
 * + 高地系统：西/东两块2层高地（坡道上下）、中央1层土坡
 * 种子固定 → 地图确定，录像回放/联机锁步友好
 */
export function generateMap(seed = 20261009, variant: 'standard' | 'islands' = 'standard'): MapData {
  const rng = new RNG(seed);
  const terrain = new Uint8Array(MAP_W * MAP_H).fill(T_GRASS);
  const height = new Uint8Array(MAP_W * MAP_H);
  const treeWood = new Float32Array(MAP_W * MAP_H);
  const oreLeft = new Float32Array(MAP_W * MAP_H);

  const playerBase = { tx: 6, ty: 6 };
  const enemyBase = { tx: MAP_W - 9, ty: MAP_H - 9 };

  const inBaseZone = (x: number, y: number): boolean => {
    const d1 = Math.abs(x - (playerBase.tx + 1)) + Math.abs(y - (playerBase.ty + 1));
    const d2 = Math.abs(x - (enemyBase.tx + 1)) + Math.abs(y - (enemyBase.ty + 1));
    return d1 < 6 || d2 < 6;
  };

  // ================= 高地（先于湖/树，湖会避开高地） =================
  // 西高地 2层（玩家侧），东高地镜像
  const plateau = (x0: number, y0: number, x1: number, y1: number, h: number): void => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
        height[idx(x, y)] = h;
      }
    }
  };
  // 坡道：贴在高地边缘外侧，自身高度 = 高地-1，打通爬层
  const ramp = (x: number, y: number, h: number): void => {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return;
    terrain[idx(x, y)] = T_RAMP;
    height[idx(x, y)] = h;
    treeWood[idx(x, y)] = 0;
    oreLeft[idx(x, y)] = 0;
  };

  plateau(8, 24, 15, 31, 2);          // 西高地
  ramp(16, 26, 1); ramp(16, 27, 1);   // 东坡道（2格宽）
  terrain[idx(10, 32)] = T_RAMP; height[idx(10, 32)] = 1;  // 南坡道
  terrain[idx(11, 32)] = T_RAMP; height[idx(11, 32)] = 1;
  // 东高地（对角镜像：63-x, 63-y）
  plateau(48, 32, 55, 39, 2);
  ramp(47, 36, 1); ramp(47, 37, 1);
  terrain[idx(52, 31)] = T_RAMP; height[idx(52, 31)] = 1;
  terrain[idx(53, 31)] = T_RAMP; height[idx(53, 31)] = 1;
  // 中央土坡 1层
  plateau(29, 29, 34, 34, 1);
  ramp(31, 28, 0); ramp(32, 28, 0);
  ramp(31, 35, 0); ramp(32, 35, 0);

  // ================= 群岛变体：双水带分隔三陆地 + 滩头连接 =================
  if (variant === 'islands') {
    const bands: [number, number][] = [[12, 20], [44, 52]];
    for (const [y0, y1] of bands) {
      for (let x = 0; x < MAP_W; x++) {
        const jag = (x * 7) % 4;                 // 锯齿边缘（确定性）
        const wy0 = y0 + jag, wy1 = y1 - ((x * 5) % 3);
        for (let y = wy0; y <= wy1; y++) {
          if (y < 1 || y >= MAP_H - 1) continue;
          terrain[idx(x, y)] = T_WATER;
        }
      }
    }
    // 滩头（T_FORD）：每条水带左右各一组，陆地可走、舰船禁行
    for (const [y0, y1] of bands) {
      for (let y = y0; y <= y1; y++) {
        for (const fx of [10, 11, 52, 53]) {
          terrain[idx(fx, y)] = T_FORD;
        }
      }
    }
  }

  // ================= 湖泊（避开高地） =================
  const lakes = 4;
  for (let i = 0; i < lakes; i++) {
    let x = rng.int(10, MAP_W - 11), y = rng.int(10, MAP_H - 11);
    if (inBaseZone(x, y) || height[idx(x, y)] > 0) continue;
    const size = rng.int(14, 30);
    for (let s = 0; s < size; s++) {
      if (!inBaseZone(x, y) && height[idx(x, y)] === 0 && x > 1 && y > 1 && x < MAP_W - 2 && y < MAP_H - 2) {
        terrain[idx(x, y)] = T_WATER;
        if (rng.next() < 0.7 && height[idx(Math.min(MAP_W - 2, x + 1), y)] === 0) terrain[idx(Math.min(MAP_W - 2, x + 1), y)] = T_WATER;
        if (rng.next() < 0.7 && height[idx(x, Math.min(MAP_H - 2, y + 1))] === 0) terrain[idx(x, Math.min(MAP_H - 2, y + 1))] = T_WATER;
      }
      x += rng.int(-1, 1); y += rng.int(-1, 1);
      x = Math.max(2, Math.min(MAP_W - 3, x));
      y = Math.max(2, Math.min(MAP_H - 3, y));
    }
  }

  // ================= 树林团块 =================
  const clusters = 12;
  for (let i = 0; i < clusters; i++) {
    let x: number, y: number;
    if (i < 4) {
      const base = i % 2 === 0 ? playerBase : enemyBase;
      const sign = i % 2 === 0 ? 1 : -1;
      x = base.tx + 1 + sign * rng.int(5, 8);
      y = base.ty + 1 - sign * rng.int(2, 5);
    } else {
      x = rng.int(4, MAP_W - 5); y = rng.int(4, MAP_H - 5);
    }
    x = Math.max(2, Math.min(MAP_W - 3, x));
    y = Math.max(2, Math.min(MAP_H - 3, y));
    const size = rng.int(10, 22);
    for (let s = 0; s < size; s++) {
      if (!inBaseZone(x, y) && terrain[idx(x, y)] === T_GRASS) {
        terrain[idx(x, y)] = T_TREE;
        treeWood[idx(x, y)] = 60;
      }
      x += rng.int(-1, 1); y += rng.int(-1, 1);
      x = Math.max(2, Math.min(MAP_W - 3, x));
      y = Math.max(2, Math.min(MAP_H - 3, y));
    }
  }

  // ================= 矿脉 =================
  const placeOre = (cx: number, cy: number, w: number, h: number): void => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
        if (terrain[idx(x, y)] === T_WATER) continue; // 矿不泡水里
        terrain[idx(x, y)] = T_ORE;
        oreLeft[idx(x, y)] = 900;
      }
    }
  };
  placeOre(playerBase.tx + 5, playerBase.ty + 5, 3, 2);
  placeOre(enemyBase.tx - 4, enemyBase.ty - 4, 3, 2);
  const mid = (MAP_W / 2) | 0;
  placeOre(mid - 6, mid + 4, 3, 3);
  placeOre(mid + 3, mid - 7, 3, 3);

  // ================= 连通性校验（高度感知）：不通就沿对角线铺平 =================
  if (!connected(height, terrain, playerBase.tx + 1, playerBase.ty + 1, enemyBase.tx + 1, enemyBase.ty + 1)) {
    const steps = 200;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(playerBase.tx + 1 + (enemyBase.tx + 1 - playerBase.tx - 1) * t);
      const cy = Math.round(playerBase.ty + 1 + (enemyBase.ty + 1 - playerBase.ty - 1) * t);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) {
            terrain[idx(x, y)] = T_GRASS;
            height[idx(x, y)] = 0; // 走廊铺平
          }
        }
      }
    }
  }

  return { terrain, height, treeWood, oreLeft, playerBase, enemyBase };
}

/** 高度感知的通行规则（与 World.canStand 同源逻辑） */
export function passable(terrain: Uint8Array, height: Uint8Array, from: number, to: number): boolean {
  const t = terrain[to];
  if (t === T_WATER || t === T_TREE || t === T_ORE) return false;
  const hf = height[from], ht = height[to];
  if (hf === ht) return true;
  if (Math.abs(hf - ht) > 1) return false;
  return terrain[from] === T_RAMP || terrain[to] === T_RAMP;
}

function connected(height: Uint8Array, terrain: Uint8Array, sx: number, sy: number, tx: number, ty: number): boolean {
  const seen = new Uint8Array(MAP_W * MAP_H);
  const start = sy * MAP_W + sx, goal = ty * MAP_W + tx;
  const stack: number[] = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === goal) return true;
    const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const ni = ny * MAP_W + nx;
      if (!seen[ni] && passable(terrain, height, cur, ni)) { seen[ni] = 1; stack.push(ni); }
    }
  }
  return false;
}
