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

export type MapVariant = 'standard' | 'islands' | 'random';

const idx = (x: number, y: number): number => y * MAP_W + x;

/**
 * 对称地图生成：双基地对角、湖面、树林、矿脉（基地矿+中路争夺矿）
 * + 高地系统：西/东两块2层高地（坡道上下）、中央1层土坡
 * 种子固定 → 地图确定，录像回放/联机锁步友好
 */
export function generateMap(seed = 20261009, variant: MapVariant = 'standard'): MapData {
  const rng = new RNG(seed);
  const terrain = new Uint8Array(MAP_W * MAP_H).fill(T_GRASS);
  const height = new Uint8Array(MAP_W * MAP_H);
  const treeWood = new Float32Array(MAP_W * MAP_H);
  const oreLeft = new Float32Array(MAP_W * MAP_H);

  const playerBase = { tx: 6 * (MAP_W / 64), ty: 6 * (MAP_H / 64) };
  const enemyBase = { tx: MAP_W - 9 * (MAP_W / 64), ty: MAP_H - 9 * (MAP_H / 64) };
  const S = MAP_W / 64;                 // 尺寸倍率（v0.10.1 起地图边长翻倍，要素坐标×S）
  const M = MAP_W - 1;

  const inBaseZone = (x: number, y: number): boolean => {
    const d1 = Math.abs(x - (playerBase.tx + 1)) + Math.abs(y - (playerBase.ty + 1));
    const d2 = Math.abs(x - (enemyBase.tx + 1)) + Math.abs(y - (enemyBase.ty + 1));
    return d1 < 6 * S || d2 < 6 * S;
  };

  // ================= 随机大陆：种子驱动 + 对角镜像（完全公平） =================
  if (variant === 'random') {
    // 基地位置随机但严格对角镜像（HQ 3×3 足迹互为镜像）
    playerBase.tx = 4 * S + rng.int(0, 4 * S);
    playerBase.ty = 4 * S + rng.int(0, 4 * S);
    enemyBase.tx = MAP_W - 3 - (playerBase.tx + 2);
    enemyBase.ty = MAP_H - 3 - (playerBase.ty + 2);

    const mirror = (x: number, y: number): [number, number] => [MAP_W - 1 - x, MAP_H - 1 - y];
    /** 双侧同步写地块（对角镜像），基地净空区跳过 */
    const set2 = (x: number, y: number, t: number): void => {
      const [mx, my] = mirror(x, y);
      if (!inBaseZone(x, y) && x >= 1 && y >= 1 && x < MAP_W - 1 && y < MAP_H - 1) terrain[idx(x, y)] = t;
      if (!inBaseZone(mx, my) && mx >= 1 && my >= 1 && mx < MAP_W - 1 && my < MAP_H - 1) terrain[idx(mx, my)] = t;
    };
    const setH2 = (x: number, y: number, hh: number): void => {
      if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return;
      height[idx(x, y)] = hh;
      const [mx, my] = mirror(x, y);
      height[idx(mx, my)] = hh;
    };

    // ---- 高地：1~2对随机2层高原（坡道贴右缘，镜像自动在对面左缘） ----
    const plateauPairs = (1 + rng.int(0, 1)) * S;
    for (let p = 0; p < plateauPairs; p++) {
      const pw = rng.int(4 * S, 7 * S), ph = rng.int(4 * S, 7 * S);
      const px0 = rng.int(6 * S, 26 * S - pw), py0 = rng.int(8 * S, 40 * S - ph);
      for (let y = py0; y < py0 + ph; y++) for (let x = px0; x < px0 + pw; x++) setH2(x, y, 2);
      const ry = py0 + rng.int(1, Math.max(1, ph - 2));
      set2(px0 + pw, ry, T_RAMP); setH2(px0 + pw, ry, 1);
      set2(px0 + pw, ry + 1, T_RAMP); setH2(px0 + pw, ry + 1, 1);
    }
    // 中央1层土坡（占位对称，无需镜像）
    const cw = (4 + rng.int(0, 3)) * S;
    const cx0 = 32 - (cw >> 1), cy0 = 32 - (cw >> 1);
    for (let y = cy0; y < cy0 + cw; y++) for (let x = cx0; x < cx0 + cw; x++) setH2(x, y, 1);
    const cr = cx0 + (cw >> 1);
    set2(cr, cy0 - 1, T_RAMP); setH2(cr, cy0 - 1, 0);
    set2(cr + 1, cy0 - 1, T_RAMP); setH2(cr + 1, cy0 - 1, 0);

    // ---- 湖泊：2~4对镜像随机游走 ----
    const lakes = rng.int(2 * S, 4 * S);
    for (let i = 0; i < lakes; i++) {
      let x = rng.int(14, MAP_W - 15), y = rng.int(6, MAP_H - 7);
      const size = rng.int(16 * S, 34 * S);
      for (let s = 0; s < size; s++) {
        const [mx, my] = mirror(x, y);
        if (!inBaseZone(x, y) && !inBaseZone(mx, my) && height[idx(x, y)] === 0 && height[idx(mx, my)] === 0
          && x > 2 && y > 2 && x < MAP_W - 3 && y < MAP_H - 3) {
          terrain[idx(x, y)] = T_WATER; terrain[idx(mx, my)] = T_WATER;
        }
        x += rng.int(-1, 1); y += rng.int(-1, 1);
        x = Math.max(3, Math.min(MAP_W - 4, x));
        y = Math.max(3, Math.min(MAP_H - 4, y));
      }
    }

    // ---- 树林：基地旁各1团 + 野生4~7对镜像 ----
    for (const base of [playerBase, enemyBase]) {
      let x = base.tx + 1 + (rng.next() < 0.5 ? 1 : -1) * rng.int(5 * S, 8 * S);
      let y = base.ty + 1 + (rng.next() < 0.5 ? 1 : -1) * rng.int(2 * S, 5 * S);
      x = Math.max(2, Math.min(MAP_W - 3, x)); y = Math.max(2, Math.min(MAP_H - 3, y));
      for (let s = 0, size = rng.int(10 * S, 20 * S); s < size; s++) {
        if (!inBaseZone(x, y) && terrain[idx(x, y)] === T_GRASS) { terrain[idx(x, y)] = T_TREE; treeWood[idx(x, y)] = 60; }
        x += rng.int(-1, 1); y += rng.int(-1, 1);
        x = Math.max(2, Math.min(MAP_W - 3, x)); y = Math.max(2, Math.min(MAP_H - 3, y));
      }
    }
    const wildForest = rng.int(4 * S, 7 * S);
    for (let i = 0; i < wildForest; i++) {
      let x = rng.int(4, MAP_W - 5), y = rng.int(4, MAP_H - 5);
      for (let s = 0, size = rng.int(10 * S, 20 * S); s < size; s++) {
        const [mx, my] = mirror(x, y);
        if (!inBaseZone(x, y) && terrain[idx(x, y)] === T_GRASS) { terrain[idx(x, y)] = T_TREE; treeWood[idx(x, y)] = 60; }
        if (!inBaseZone(mx, my) && terrain[idx(mx, my)] === T_GRASS) { terrain[idx(mx, my)] = T_TREE; treeWood[idx(mx, my)] = 60; }
        x += rng.int(-1, 1); y += rng.int(-1, 1);
        x = Math.max(2, Math.min(MAP_W - 3, x)); y = Math.max(2, Math.min(MAP_H - 3, y));
      }
    }

    // ---- 矿脉：基地矿（镜像）+ 中路争夺矿1~2对 ----
    const orePair = (cx: number, cy: number, w2: number, h2: number): void => {
      for (let dy = 0; dy < h2; dy++) for (let dx = 0; dx < w2; dx++) {
        const [mx, my] = mirror(cx + dx, cy + dy);
        for (const [ox, oy] of [[cx + dx, cy + dy], [mx, my]] as [number, number][]) {
          if (ox < 1 || oy < 1 || ox >= MAP_W - 1 || oy >= MAP_H - 1) continue;
          if (terrain[idx(ox, oy)] === T_WATER) continue;
          terrain[idx(ox, oy)] = T_ORE;
          oreLeft[idx(ox, oy)] = 900;
        }
      }
    };
    orePair(playerBase.tx + 5, playerBase.ty + 5, 3, 2);
    orePair(26 * S, 36 * S, 3 * S, 3 * S);
    if (rng.next() < 0.7) orePair(35 * S, 25 * S, 3 * S, 3 * S);

    // ---- 基地净空：HQ落点强制草地（麦田/水/树都清） ----
    for (const base of [playerBase, enemyBase]) {
      for (let dy = -1; dy <= 3; dy++) for (let dx = -1; dx <= 3; dx++) {
        const i = idx(base.tx + dx, base.ty + dy);
        terrain[i] = T_GRASS;
        treeWood[i] = 0;
        oreLeft[i] = 0;
        height[i] = 0;
      }
    }

    // ---- 连通性：不通就对角走廊；仍不通就抽干全部水面（保底） ----
    if (!connected(height, terrain, playerBase.tx + 1, playerBase.ty + 1, enemyBase.tx + 1, enemyBase.ty + 1)) {
      const steps = 200;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = Math.round(playerBase.tx + 1 + (enemyBase.tx + 1 - playerBase.tx - 1) * t);
        const cy = Math.round(playerBase.ty + 1 + (enemyBase.ty + 1 - playerBase.ty - 1) * t);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) { terrain[idx(x, y)] = T_GRASS; height[idx(x, y)] = 0; }
        }
      }
    }
    if (!connected(height, terrain, playerBase.tx + 1, playerBase.ty + 1, enemyBase.tx + 1, enemyBase.ty + 1)) {
      for (let i = 0; i < terrain.length; i++) if (terrain[i] === T_WATER) terrain[i] = T_GRASS;
    }
    return { terrain, height, treeWood, oreLeft, playerBase, enemyBase };
  }


  // ================= 高地（先于湖/树，湖会避开高地）——坐标全部×S =================
  // 西高地 2层（玩家侧），东高地对角镜像
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

  plateau(8 * S, 24 * S, 15 * S, 31 * S, 2);          // 西高地
  ramp(16 * S, 26 * S, 1); ramp(16 * S, 27 * S, 1);   // 东坡道（2格宽）
  terrain[idx(10 * S, 32 * S)] = T_RAMP; height[idx(10 * S, 32 * S)] = 1;  // 南坡道
  terrain[idx(11 * S, 32 * S)] = T_RAMP; height[idx(11 * S, 32 * S)] = 1;
  // 东高地（对角镜像：M-x, M-y）
  plateau(M - 15 * S, M - 31 * S, M - 8 * S, M - 24 * S, 2);
  ramp(M - 16 * S, M - 27 * S, 1); ramp(M - 16 * S, M - 26 * S, 1);
  terrain[idx(M - 10 * S, M - 32 * S)] = T_RAMP; height[idx(M - 10 * S, M - 32 * S)] = 1;
  terrain[idx(M - 11 * S, M - 32 * S)] = T_RAMP; height[idx(M - 11 * S, M - 32 * S)] = 1;
  // 中央土坡 1层
  plateau(29 * S, 29 * S, 34 * S, 34 * S, 1);
  ramp(31 * S, 28 * S, 0); ramp(32 * S, 28 * S, 0);
  ramp(31 * S, 35 * S, 0); ramp(32 * S, 35 * S, 0);

  // ================= 群群岛变体：双水带分隔三陆地 + 滩头连接 =================
  if (variant === 'islands') {
    const bands: [number, number][] = [[12 * S, 20 * S], [44 * S, 52 * S]];
    for (const [y0, y1] of bands) {
      for (let x = 0; x < MAP_W; x++) {
        const jag = (x * 7) % (4 * S);                 // 锯齿边缘（确定性）
        const wy0 = y0 + jag, wy1 = y1 - ((x * 5) % (3 * S));
        for (let y = wy0; y <= wy1; y++) {
          if (y < 1 || y >= MAP_H - 1) continue;
          terrain[idx(x, y)] = T_WATER;
        }
      }
    }
    // 滩头（T_FORD）：每条水带左右各一组，陆地可走、舰船禁行
    for (const [y0, y1] of bands) {
      for (let y = y0; y <= y1; y++) {
        for (const fx of [10 * S, 11 * S, M - 11 * S, M - 10 * S]) {
          terrain[idx(fx, y)] = T_FORD;
        }
      }
    }
  }

  // ================= 湖泊（避开高地） =================
  const lakes = 4 * S;
  for (let i = 0; i < lakes; i++) {
    let x = rng.int(10 * S, MAP_W - 11 * S), y = rng.int(10 * S, MAP_H - 11 * S);
    if (inBaseZone(x, y) || height[idx(x, y)] > 0) continue;
    const size = rng.int(14 * S, 30 * S);
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
  const clusters = 12 * S;
  for (let i = 0; i < clusters; i++) {
    let x: number, y: number;
    if (i < 4) {
      const base = i % 2 === 0 ? playerBase : enemyBase;
      const sign = i % 2 === 0 ? 1 : -1;
      x = base.tx + 1 + sign * rng.int(5 * S, 8 * S);
      y = base.ty + 1 - sign * rng.int(2 * S, 5 * S);
    } else {
      x = rng.int(4 * S, MAP_W - 5 * S); y = rng.int(4 * S, MAP_H - 5 * S);
    }
    x = Math.max(2, Math.min(MAP_W - 3, x));
    y = Math.max(2, Math.min(MAP_H - 3, y));
    const size = rng.int(10 * S, 22 * S);
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
  placeOre(playerBase.tx + 5 * S, playerBase.ty + 5 * S, 3 * S, 2 * S);
  placeOre(enemyBase.tx - 4 * S, enemyBase.ty - 4 * S, 3 * S, 2 * S);
  const mid = (MAP_W / 2) | 0;
  placeOre(mid - 6 * S, mid + 4 * S, 3 * S, 3 * S);
  placeOre(mid + 3 * S, mid - 7 * S, 3 * S, 3 * S);

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
