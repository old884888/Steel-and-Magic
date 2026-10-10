import type { Vec } from '../types';

/**
 * 空间哈希网格：邻居查询（单位分离）/ 范围搜索 / 点选命中
 * 每模拟帧整体重建一次，查询零成本
 */
export class SpatialHash {
  private cell: number;
  private buckets = new Map<number, number[]>(); // cellKey -> entity ids
  /** id -> {x,y,r} 位置缓存，供查询方读取 */
  pos = new Map<number, { x: number; y: number; r: number }>();

  constructor(cell = 48) { this.cell = cell; }

  private key(cx: number, cy: number): number { return cx * 100000 + cy; }

  clear(): void { this.buckets.clear(); this.pos.clear(); }

  insert(id: number, x: number, y: number, r: number): void {
    this.pos.set(id, { x, y, r });
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    const k = this.key(cx, cy);
    let arr = this.buckets.get(k);
    if (!arr) { arr = []; this.buckets.set(k, arr); }
    arr.push(id);
  }

  /** 收集圆范围内的所有id（含边界），结果写入 out */
  queryCircle(x: number, y: number, radius: number, out: number[]): number[] {
    out.length = 0;
    const minCx = Math.floor((x - radius) / this.cell), maxCx = Math.floor((x + radius) / this.cell);
    const minCy = Math.floor((y - radius) / this.cell), maxCy = Math.floor((y + radius) / this.cell);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const arr = this.buckets.get(this.key(cx, cy));
        if (arr) for (const id of arr) out.push(id);
      }
    }
    return out;
  }

  /** 距离最近的点选目标（点选容差用） */
  nearest(x: number, y: number, maxDist: number): number | null {
    const cand: number[] = [];
    this.queryCircle(x, y, maxDist, cand);
    let best: number | null = null, bestD = maxDist * maxDist;
    for (const id of cand) {
      const p = this.pos.get(id)!;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) { bestD = d; best = id; }
    }
    return best;
  }
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function lerpVec(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
