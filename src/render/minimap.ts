import { MAP_W, MAP_H, TILE } from '../config';
import type { World } from '../sim/world';
import { isVisible } from '../sim/fog';
import type { Camera } from '../engine/camera';

/** 小地图：地形底图缓存 + 迷雾 + 单位点 + 视口框，点击/拖动跳转镜头 */
export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  readonly size = 176;
  private scale = this.size / MAP_W;

  constructor(
    private canvas: HTMLCanvasElement,
    private world: World,
    private cam: Camera,
    onJump: (wx: number, wy: number) => void,
  ) {
    canvas.width = this.size; canvas.height = this.size;
    this.ctx = canvas.getContext('2d')!;
    this.terrain = document.createElement('canvas');
    this.terrain.width = this.size; this.terrain.height = this.size;
    this.tctx = this.terrain.getContext('2d')!;
    this.rebuildTerrain();

    let down = false;
    const jump = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      onJump(fx * MAP_W * TILE, fy * MAP_H * TILE);
    };
    canvas.addEventListener('pointerdown', (e) => { down = true; jump(e); });
    canvas.addEventListener('pointermove', (e) => { if (down) jump(e); });
    window.addEventListener('pointerup', () => { down = false; });
  }

  rebuildTerrain(): void {
    const t = this.world.terrain;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.drawTile(x, y, t[y * MAP_W + x]);
      }
    }
  }

  patchTile(i: number): void {
    this.drawTile(i % MAP_W, (i / MAP_W) | 0, this.world.terrain[i]);
  }

  private drawTile(x: number, y: number, kind: number): void {
    const s = this.scale;
    const h = this.world.height[y * MAP_W + x] ?? 0;
    // 高地略微提亮，坡道土色
    let base = '#4a7c3a';
    if (h >= 2) base = '#5d9448';
    else if (h === 1) base = '#528641';
    this.tctx.fillStyle = kind === 1 ? '#2d6a9e'
      : kind === 2 ? '#2e5e2a'
      : kind === 3 ? '#8f8f6a'
      : kind === 4 ? '#a09060'
      : kind === 6 ? '#d9b44a'
      : base;
    this.tctx.fillRect(x * s, y * s, s + 0.5, s + 0.5);
  }

  draw(): void {
    const c = this.ctx, s = this.scale;
    c.drawImage(this.terrain, 0, 0);

    // 迷雾
    const fog = this.world.fog[0];
    c.fillStyle = 'rgba(0,0,0,.92)';
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const f = fog[y * MAP_W + x];
        if (f === 0) c.fillRect(x * s, y * s, s + 0.5, s + 0.5);
      }
    }
    c.fillStyle = 'rgba(0,0,0,.4)';
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (fog[y * MAP_W + x] === 1) c.fillRect(x * s, y * s, s + 0.5, s + 0.5);
      }
    }

    // 实体点
    for (const e of this.world.entities.values()) {
      if (e.owner !== 0 && !isVisible(this.world, 0, e.x, e.y)) continue;
      c.fillStyle = e.owner === 0 ? '#6ea8ff' : e.owner === 2 ? '#b0a890' : '#ff7a6a';
      const x = (e.x / TILE) * s, y = (e.y / TILE) * s;
      if (e.kind === 'building') {
        const w = e.radius() * 2 / TILE * s;
        c.fillRect(x - w / 2, y - w / 2, w, w);
      } else {
        c.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }

    // 视口框
    const vw = this.cam.viewW / this.cam.zoom / TILE * s;
    const vh = this.cam.viewH / this.cam.zoom / TILE * s;
    c.strokeStyle = 'rgba(255,255,255,.8)';
    c.lineWidth = 1;
    c.strokeRect((this.cam.x / TILE) * s - vw / 2, (this.cam.y / TILE) * s - vh / 2, vw, vh);
  }
}
