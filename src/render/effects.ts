import type { World } from '../sim/world';
import type { Projectile } from '../types';

/** 特效与投射物绘制。子弹贴图为Kenney CC0素材（public/assets/fx/），加载失败回退为圆点 */
export class EffectsRenderer {
  private imgs: Record<string, HTMLImageElement> = {};
  private loaded = false;

  load(): void {
    const files: Record<string, string> = {
      bullet: '/assets/fx/bulletYellow.png',
      shell: '/assets/fx/bulletBeige.png',
      cannon: '/assets/fx/bulletRed.png',
    };
    let pending = Object.keys(files).length;
    for (const [kind, src] of Object.entries(files)) {
      const img = new Image();
      img.onload = () => { if (--pending === 0) this.loaded = true; };
      img.onerror = () => { if (--pending === 0) this.loaded = true; };
      img.src = src;
      this.imgs[kind] = img;
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: World): void {
    // 投射物
    for (const p of w.projectiles) {
      const a = Math.atan2(p.ty - p.y, p.tx - p.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a + Math.PI / 2); // Kenney贴图朝上
      const img = this.imgs[p.kind];
      if (this.loaded && img && img.complete && img.naturalWidth > 0) {
        // 原图12x26偏大，按弹种缩到正常子弹观感
        const scale = p.kind === 'cannon' ? 0.7 : p.kind === 'shell' ? 0.55 : 0.45;
        ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale);
      } else if (p.kind === 'fire') {
        ctx.fillStyle = '#ff9a3c';
        ctx.beginPath(); ctx.arc(0, 0, 3 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd76e';
        ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'missile') {
        ctx.strokeStyle = 'rgba(200,210,220,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = '#dceaf2';
        ctx.beginPath(); ctx.ellipse(0, 0, 2, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff8a5e';
        ctx.beginPath(); ctx.arc(0, -4, 1.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.kind === 'cannon' ? '#ff8a5e' : p.kind === 'shell' ? '#ffe28a' : '#ffd76e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5, p.kind === 'bullet' ? 5 : 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 特效
    for (const f of w.fx) {
      const k = f.t / f.dur; // 0→1
      ctx.save();
      ctx.translate(f.x, f.y);
      if (f.type === 'boom') {
        const r = f.size * (0.35 + 0.75 * k);
        ctx.globalAlpha = 1 - k;
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
        g.addColorStop(0, '#fff3c0');
        g.addColorStop(0.4, '#ff9a3c');
        g.addColorStop(1, 'rgba(200,60,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        // 碎屑环
        ctx.strokeStyle = 'rgba(255,220,150,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2); ctx.stroke();
      } else if (f.type === 'muzzle') {
        ctx.rotate(f.a ?? 0);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#ffe9a0';
        ctx.beginPath();
        ctx.moveTo(f.size, 0);
        ctx.lineTo(0, -f.size * 0.4);
        ctx.lineTo(0, f.size * 0.4);
        ctx.closePath(); ctx.fill();
      } else if (f.type === 'wake') {
        // 舰船尾浪：V字扩散波纹
        const a = (f.a ?? 0) + Math.PI;
        const k = f.t / f.dur;
        ctx.globalAlpha = (1 - k) * 0.55;
        ctx.strokeStyle = '#dceaf2';
        ctx.lineWidth = 1.5;
        const len = 10 + 30 * k;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(a + s * 0.45) * 9, Math.sin(a + s * 0.45) * 9);
          ctx.lineTo(Math.cos(a + s * 0.95) * len, Math.sin(a + s * 0.95) * len);
          ctx.stroke();
        }
        // 指令落点标签：上浮+淡出的文字气泡
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        const rise = -14 * k;
        ctx.font = `bold ${13}px "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        // 底衬板
        const w = ctx.measureText(f.text ?? '').width + 14;
        ctx.fillStyle = 'rgba(20,26,34,.85)';
        ctx.fillRect(-w / 2, rise - 10, w, 20);
        ctx.strokeStyle = f.color ?? '#f0a63c';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-w / 2, rise - 10, w, 20);
        // 下方小三角指向落点
        ctx.fillStyle = 'rgba(20,26,34,.85)';
        ctx.beginPath();
        ctx.moveTo(-5, rise + 10); ctx.lineTo(5, rise + 10); ctx.lineTo(0, rise + 16);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = f.color ?? '#ffd9a0';
        ctx.fillText(f.text ?? '', 0, rise + 4);
      } else { // hit
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#cfd6de';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + f.x * 0.1;
          const r0 = f.size * (0.3 + k * 0.9);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0 * 0.5, Math.sin(a) * r0 * 0.5);
          ctx.lineTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
}

export type { Projectile };
