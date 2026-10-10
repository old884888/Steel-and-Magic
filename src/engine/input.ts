import type { Vec } from '../types';
import { Camera } from './camera';

/**
 * 统一输入层（Pointer Events，鼠标/触摸通吃）
 * - 左键点选/拖框选、双击选同类、右键指令、滚轮缩放、中键拖拽平移
 * - 触屏：单指=左键、双指捏合缩放
 * - 建造放置/攻击移动模式下重定义左键，右键/Esc取消
 * - 浏览器原生手势全灭（右键菜单/中键自动滚屏/文本选中/拖拽）
 */
export interface InputCallbacks {
  onClickSelect(worldPos: Vec, additive: boolean): void;
  onBoxSelect(a: Vec, b: Vec, additive: boolean): void;      // 屏幕坐标角点
  onContext(worldPos: Vec): void;                             // 右键指令（由game判定移动/攻击/修理/采集）
  onPlacementClick(worldPos: Vec): void;
  onAttackMoveClick(worldPos: Vec): void;                     // 攻击移动模式下的左键落点
  onDoubleClickSelect(worldPos: Vec): void;                   // 双击：选中屏幕内同类
  onHotkey(key: string): void;                                // 'a'|'s'|'h'|'N'|'ctrl+N'
  onCancel(): void;
}

export class Input {
  placementMode = false;
  attackMoveMode = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private downPos: Vec | null = null;       // 左键按下时的屏幕位置
  private dragging = false;
  private panning = false;
  private panLast: Vec | null = null;
  private pinchLastDist = 0;
  private keys = new Set<string>();
  private lastClick = { t: 0, x: 0, y: 0 };

  // 框选框当前状态（渲染层读取）
  dragBox: { ax: number; ay: number; bx: number; by: number } | null = null;
  /** 当前光标屏幕位置（放置模式幽灵跟随用） */
  cur: Vec = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private cam: Camera,
    private cb: InputCallbacks,
  ) {
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('dblclick', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      this.cam.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    // ---- 浏览器原生手势全灭 ----
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('selectstart', (e) => e.preventDefault());
    window.addEventListener('dragstart', (e) => e.preventDefault());
    window.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault(); // 中键自动滚屏
    });
  }

  /** 每帧取键盘平移方向（世界增量由game乘速度） */
  panAxis(): Vec {
    let dx = 0, dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    return { x: dx, y: dy };
  }

  cancelModes(): void {
    this.placementMode = false;
    this.attackMoveMode = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    // 游戏按键吞掉浏览器默认行为（页面滚动等）
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    this.keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') {
      this.placementMode = false;
      this.attackMoveMode = false;
      this.cb.onCancel();
      return;
    }
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 's' || k === 'h') { this.cb.onHotkey(k); return; }
    if (/^[1-9]$/.test(k)) {
      this.cb.onHotkey(e.ctrlKey ? `ctrl+${k}` : k);
    }
  }

  private local(e: PointerEvent): Vec {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent): void {
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* 合成指针无法捕获，忽略 */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = this.local(e);

    // 双指进入捏合模式，取消框选
    if (this.pointers.size === 2) {
      this.dragging = false; this.dragBox = null; this.downPos = null;
      const [a, b] = [...this.pointers.values()];
      this.pinchLastDist = Math.hypot(a.x - b.x, a.y - b.y);
      return;
    }

    if (e.button === 1) { // 中键拖拽平移
      this.panning = true; this.panLast = p;
      return;
    }
    if (e.button === 2) { // 右键
      if (this.placementMode || this.attackMoveMode) {
        this.placementMode = false;
        this.attackMoveMode = false;
        this.cb.onCancel();
        return;
      }
      this.cb.onContext(this.cam.screenToWorld(p.x, p.y));
      return;
    }
    if (e.button === 0) {
      this.downPos = p;
      this.dragging = false;
    }
  }

  private onMove(e: PointerEvent): void {
    this.cur = this.local(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 双指捏合缩放
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchLastDist > 0 && d > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - rect.left, my = (a.y + b.y) / 2 - rect.top;
        this.cam.zoomAt(mx, my, d / this.pinchLastDist);
      }
      this.pinchLastDist = d;
      return;
    }

    const p = this.local(e);
    if (this.panning && this.panLast) {
      this.cam.pan(-(p.x - this.panLast.x) / this.cam.zoom, -(p.y - this.panLast.y) / this.cam.zoom);
      this.panLast = p;
      return;
    }
    if (this.downPos) {
      if (!this.dragging && Math.hypot(p.x - this.downPos.x, p.y - this.downPos.y) > 6) this.dragging = true;
      if (this.dragging && !this.placementMode && !this.attackMoveMode) {
        this.dragBox = { ax: this.downPos.x, ay: this.downPos.y, bx: p.x, by: p.y };
      }
    }
  }

  private onUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    const p = this.local(e);

    if (e.button === 1) { this.panning = false; this.panLast = null; return; }

    if (e.button === 0 && this.downPos) {
      const worldPos = this.cam.screenToWorld(p.x, p.y);
      if (this.placementMode) {
        this.cb.onPlacementClick(worldPos);
      } else if (this.attackMoveMode) {
        this.attackMoveMode = false;
        this.cb.onAttackMoveClick(worldPos);
      } else if (this.dragging && this.dragBox) {
        const b = this.dragBox;
        this.cb.onBoxSelect({ x: b.ax, y: b.ay }, { x: b.bx, y: b.by }, e.shiftKey);
      } else {
        // 双击检测：350ms内、12px内、非拖拽
        const now = performance.now();
        const isDouble = now - this.lastClick.t < 350 &&
          Math.hypot(p.x - this.lastClick.x, p.y - this.lastClick.y) < 12;
        this.lastClick = { t: now, x: p.x, y: p.y };
        if (isDouble) {
          this.cb.onDoubleClickSelect(worldPos);
        } else {
          this.cb.onClickSelect(worldPos, e.shiftKey);
        }
      }
      this.downPos = null; this.dragging = false; this.dragBox = null;
    }
    if (this.pointers.size < 2) this.pinchLastDist = 0;
  }
}
