import { MAP_W, MAP_H, TILE, T_RAMP } from '../config';

/**
 * 8方向A*寻路（二叉堆），不走斜角穿缝，高度感知：同层直走、跨层必须经坡道。
 * 返回世界坐标路径点（格中心），不含起点；不可达返回 null
 */
export function findPath(
  terrain: Uint8Array,
  walkable: Uint8Array,
  height: Uint8Array,
  sx: number, sy: number,
  tx: number, ty: number,
): { x: number; y: number }[] | null {
  // 同格：返回单点路标，让单位走完最后几像素（空数组会被movement当成永久卡死）
  if (sx === tx && sy === ty) return [{ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }];
  if (!inBounds(tx, ty) || !walkable[ty * MAP_W + tx]) return null;

  const size = MAP_W * MAP_H;
  const gScore = new Float32Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);

  const heap = new MinHeap();
  const start = sy * MAP_W + sx, goal = ty * MAP_W + tx;
  gScore[start] = 0;
  heap.push(heuristic(sx, sy, tx, ty), start);

  const DIRS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
  ];

  // 高度通行：同层直走，跨层须坡道且只跨1层（与 World.canStand 同源）
  const canStep = (from: number, to: number): boolean => {
    if (!walkable[to] || closed[to]) return false;
    const hf = height[from], ht = height[to];
    if (hf === ht) return true;
    if (Math.abs(hf - ht) > 1) return false;
    return terrain[from] === T_RAMP || terrain[to] === T_RAMP;
  };

  let found = false;
  let iter = 0;
  while (heap.size > 0 && iter++ < 20000) {
    const cur = heap.pop();
    if (cur === goal) { found = true; break; }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(nx, ny)) continue;
      const ni = ny * MAP_W + nx;
      if (!canStep(cur, ni)) continue;
      // 斜向不允许穿缝（两个正交邻格都得可走）
      if (dx !== 0 && dy !== 0) {
        if (!walkable[cy * MAP_W + nx] || !walkable[ny * MAP_W + cx]) continue;
        if (height[cy * MAP_W + nx] !== height[cur] || height[ny * MAP_W + cx] !== height[cur]) continue;
      }
      const ng = gScore[cur] + cost;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        cameFrom[ni] = cur;
        heap.push(ng + heuristic(nx, ny, tx, ty), ni);
      }
    }
  }
  if (!found) return null;

  // 回溯成路径点（格中心世界坐标）
  const path: { x: number; y: number }[] = [];
  let node = goal;
  while (node !== start && node !== -1) {
    const nx = node % MAP_W, ny = (node / MAP_W) | 0;
    path.push({ x: (nx + 0.5) * TILE, y: (ny + 0.5) * TILE });
    node = cameFrom[node];
  }
  path.reverse();
  return path;
}

/** 目标格不可走时，从目标格向外找最近可走格（同环内取欧氏距离最近者，避免先撞对角角落） */
export function nearestWalkable(walkable: Uint8Array, tx: number, ty: number): { x: number; y: number } {
  if (inBounds(tx, ty) && walkable[ty * MAP_W + tx]) return { x: tx, y: ty };
  for (let r = 1; r < Math.max(MAP_W, MAP_H); r++) {
    let best: { x: number; y: number } | null = null, bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // 只看外圈
        const nx = tx + dx, ny = ty + dy;
        if (inBounds(nx, ny) && walkable[ny * MAP_W + nx]) {
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
        }
      }
    }
    if (best) return best;
  }
  return { x: tx, y: ty };
}

function heuristic(x: number, y: number, tx: number, ty: number): number {
  const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
  return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
}

function inBounds(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }

/** 最小堆（f优先，存节点索引） */
class MinHeap {
  private fs: number[] = [];
  private idxs: number[] = [];
  get size(): number { return this.fs.length; }

  push(f: number, idx: number): void {
    this.fs.push(f); this.idxs.push(idx);
    let i = this.fs.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.fs[p] <= this.fs[i]) break;
      this.swap(i, p); i = p;
    }
  }

  pop(): number {
    const top = this.idxs[0];
    const lastF = this.fs.pop()!, lastIdx = this.idxs.pop()!;
    if (this.fs.length > 0) {
      this.fs[0] = lastF; this.idxs[0] = lastIdx;
      let i = 0;
      const n = this.fs.length;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < n && this.fs[l] < this.fs[m]) m = l;
        if (r < n && this.fs[r] < this.fs[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const tf = this.fs[a]; this.fs[a] = this.fs[b]; this.fs[b] = tf;
    const ti = this.idxs[a]; this.idxs[a] = this.idxs[b]; this.idxs[b] = ti;
  }
}
