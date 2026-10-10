import { SIM_DT, MAX_STEPS_PER_FRAME } from '../config';

/** 固定时间步主循环：渲染跟 rAF，模拟按 60Hz 固定步推进，卡顿限时追帧 */
export class GameLoop {
  private raf = 0;
  private lastT = 0;
  private acc = 0;
  running = false;

  constructor(
    private update: (dt: number) => void,   // 模拟步
    private render: () => void,             // 渲染帧
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    const frame = (t: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(frame);
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      if (dt > 0.25) dt = 0.25; // 切后台回来防雪崩
      this.acc += dt;
      let steps = 0;
      while (this.acc >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
        this.update(SIM_DT);
        this.acc -= SIM_DT;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.acc = 0; // 追不上就丢弃
      this.render();
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
