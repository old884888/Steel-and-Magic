import { ZOOM_MIN, ZOOM_MAX, MAP_W, MAP_H, TILE } from '../config';

/** 镜头：以世界坐标 cam.x/y 为屏幕中心 */
export class Camera {
  x = 0; y = 0;
  zoom = 1;
  viewW = 800; viewH = 600;

  setViewport(w: number, h: number): void { this.viewW = w; this.viewH = h; }

  /** 移动并钳制在地图范围内（留半屏余量给黑边） */
  pan(dx: number, dy: number): void {
    this.x += dx; this.y += dy;
    this.clamp();
  }

  /** 以屏幕点(screenX,screenY)为锚缩放 */
  zoomAt(screenX: number, screenY: number, factor: number): void {
    const before = this.screenToWorld(screenX, screenY);
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * factor));
    const after = this.screenToWorld(screenX, screenY);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clamp();
  }

  jumpTo(wx: number, wy: number): void { this.x = wx; this.y = wy; this.clamp(); }

  clamp(): void {
    const halfW = this.viewW / 2 / this.zoom, halfH = this.viewH / 2 / this.zoom;
    const mapW = MAP_W * TILE, mapH = MAP_H * TILE;
    const marginX = Math.min(halfW, mapW / 2), marginY = Math.min(halfH, mapH / 2);
    this.x = Math.max(marginX - 80, Math.min(mapW - marginX + 80, this.x));
    this.y = Math.max(marginY - 80, Math.min(mapH - marginY + 80, this.y));
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.viewW / 2) / this.zoom + this.x, y: (sy - this.viewH / 2) / this.zoom + this.y };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.x) * this.zoom + this.viewW / 2, y: (wy - this.y) * this.zoom + this.viewH / 2 };
  }
}
