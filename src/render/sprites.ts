import { TILE, PALETTES, METAL, METAL_DARK, COLORS, T_GRASS, T_WATER, T_TREE, T_ORE, T_RAMP, T_FORD, T_FARM } from '../config';

/**
 * 运行时程序化贴图生成器 —— 全部单位/建筑/地块贴图在浏览器离屏Canvas上绘制并缓存。
 * 朝向规范：车体与炮管一律朝右(+X)，渲染时rotate(实际角度)。
 */

const cache = new Map<string, HTMLCanvasElement>();

/** 晨曦王国调色板：owner0=翡翠绿（玩家），owner1=暗紫（敌国） */
const KINGDOM_PALETTES = [
  { primary: '#3f8f6a', secondary: '#2c6b4a', dark: '#1d4a34' },
  { primary: '#7a5fa8', secondary: '#5a4278', dark: '#3d2b52' },
];
const isKingdomDef = (defId: string): boolean =>
  ['serf', 'militia', 'spearman', 'palaceCart', 'lifeTree', 'orchard', 'lumberShed', 'silverMine', 'granary', 'sageTower', 'warHall'].indexOf(defId) >= 0;

function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
  ctx.fill();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ================= 单位 =================

export interface UnitSprites { hull: HTMLCanvasElement; turret: HTMLCanvasElement | null }

/** 通用：给形状叠加"亮上暗下"渐变，产生3D立体感 */
function shade3D(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,.18)');
  g.addColorStop(0.35, 'rgba(255,255,255,.04)');
  g.addColorStop(0.65, 'rgba(0,0,0,.04)');
  g.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}
/** 通用：暗色描边 */
function outline(ctx: CanvasRenderingContext2D, color = 'rgba(0,0,0,.4)', w = 1): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
/** 通用：装甲高光线 */
function edgeHi(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color = 'rgba(255,255,255,.25)'): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 1.5);
}


/** 渐变圆角矩形（亮上暗下） */
function rrG(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  const rad = Math.min(r, w / 2, h / 2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
  ctx.fill();
}

export function getUnitSprites(defId: string, owner: number): UnitSprites {
  const key = `u:${defId}:${owner}`;
  let hull = cache.get(key + ':h') ?? null;
  let turret = cache.get(key + ':t') ?? null;
  if (!hull) {
    const p = isKingdomDef(defId) ? (KINGDOM_PALETTES[owner] ?? KINGDOM_PALETTES[0]) : (PALETTES[owner] ?? PALETTES[0]);
    switch (defId) {
      case 'builder': {
        // 车体：小型工程车，四轮+驾驶舱+警示条
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(40, 32);
        circle(ctx, 8, 6, 5, '#22262c'); circle(ctx, 8, 26, 5, '#22262c');
        circle(ctx, 32, 7, 5, '#22262c'); circle(ctx, 32, 25, 5, '#22262c');
        circle(ctx, 8, 6, 2.5, METAL_DARK); circle(ctx, 8, 26, 2.5, METAL_DARK);
        circle(ctx, 32, 7, 2.5, METAL_DARK); circle(ctx, 32, 25, 2.5, METAL_DARK);
        rr(ctx, 6, 8, 28, 16, 5, p.primary);
        rr(ctx, 20, 9, 13, 14, 4, p.secondary); // 驾驶舱
        ctx.fillStyle = '#ffe28a';
        ctx.fillRect(24, 10, 2, 12); ctx.fillRect(28, 10, 2, 12); // 警示条
        rr(ctx, 4, 12, 5, 8, 2, p.dark);
        cache.set(key + ':h', hull);
        // 炮塔：起重机臂
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(34, 22);
        circle(tc, 10, 11, 5.5, METAL);
        circle(tc, 10, 11, 3, p.primary);
        tc.fillStyle = METAL_DARK;
        tc.fillRect(12, 9, 16, 4);
        tc.strokeStyle = '#ffd76e'; tc.lineWidth = 1.5;
        tc.beginPath(); tc.moveTo(26, 11); tc.lineTo(31, 17); tc.stroke();
        circle(tc, 31, 17, 2, '#ffd76e');
        cache.set(key + ':t', turret);
        break;
      }
      case 'infantry': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(18, 18);
        circle(ctx, 9, 9, 6.5, p.dark);          // 外圈
        circle(ctx, 9, 9, 5, p.primary);          // 身体
        circle(ctx, 9, 9, 2.2, p.secondary);      // 背包心
        ctx.fillStyle = '#e8c9a0';
        circle(ctx, 11, 7, 1.6, '#e8c9a0');       // 头盔下的脸
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(20, 8);
        tc.fillStyle = '#2c2f34';
        tc.fillRect(3, 3, 15, 2.4);               // 步枪
        tc.fillRect(2, 2.4, 4, 3.6);
        cache.set(key + ':t', turret);
        break;
      }
      case 'mcv': {
        // 车体：重型六轮指挥载具（展开后即指挥基地）
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(56, 40);
        for (const [wx, wy] of [[9, 7], [22, 6], [35, 7], [9, 33], [22, 34], [35, 33]]) {
          circle(ctx, wx, wy, 6, '#1a1e24');
          circle(ctx, wx, wy, 2.6, '#3a4049');
        }
        rr(ctx, 4, 10, 48, 20, 6, '#000');
        rrG(ctx, 5, 11, 46, 18, 5, p.primary, p.dark);
        rr(ctx, 36, 12, 14, 16, 4, p.secondary);  // 指挥舱
        ctx.fillStyle = '#9fd8ff';
        ctx.fillRect(42, 14, 6, 12);              // 观察窗
        ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10, 14); ctx.lineTo(30, 26); ctx.stroke();
        ctx.strokeStyle = '#20242a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(12, 11); ctx.lineTo(12, 2); ctx.stroke();
        circle(ctx, 12, 3, 2.2, '#ff5e4e');
        ctx.fillStyle = p.primary;
        ctx.fillRect(16, 24, 12, 4);
        cache.set(key + ':h', hull);
        // 炮塔位：折叠指挥桅杆（无武器）
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(20, 10);
        tc.fillStyle = '#565c66';
        tc.fillRect(6, 3, 8, 4);
        tc.fillStyle = '#ffd76e';
        tc.fillRect(14, 4, 3, 2);
        cache.set(key + ':t', turret);
        break;
      }
      case 'farmer': {
        // 车体…不对，是人体：粗布衣+草帽的田间劳作者
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(18, 18);
        circle(ctx, 9, 10, 6, p.primary);
        ctx.fillStyle = '#e8c9a0';
        circle(ctx, 9, 6.5, 2, '#e8c9a0');
        ctx.fillStyle = '#d8b545';                       // 草帽
        ctx.beginPath(); ctx.ellipse(9, 4.6, 6.8, 2.3, 0, 0, Math.PI * 2); ctx.fill();
        circle(ctx, 9, 4.2, 2.5, '#c9a53c');
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(18, 8);
        tc.fillStyle = '#6b4f2a';                        // 锄头柄
        tc.fillRect(3, 3.2, 12, 2);
        tc.fillStyle = '#8a919c';                        // 锄头铁头
        tc.fillRect(13, 1.8, 3.4, 4.4);
        cache.set(key + ':t', turret);
        break;
      }
      case 'tank': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(46, 36);
        // 履带：暗色底+履带齿纹
        rr(ctx, 3, 1, 40, 10, 4, '#1a1e24');
        rr(ctx, 3, 25, 40, 10, 4, '#1a1e24');
        ctx.fillStyle = '#3a4049';
        for (let i = 0; i < 8; i++) {
          circle(ctx, 7 + i * 5.3, 6, 2.2, '#3a4049');
          circle(ctx, 7 + i * 5.3, 30, 2.2, '#3a4049');
        }
        ctx.strokeStyle = '#4a5560'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 10; i++) {
          const lx = 4 + i * 4;
          ctx.beginPath(); ctx.moveTo(lx, 2); ctx.lineTo(lx - 1, 10); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx, 26); ctx.lineTo(lx - 1, 34); ctx.stroke();
        }
        // 车体：渐变装甲（亮上暗下）+ 暗色描边
        const hullG = ctx.createLinearGradient(0, 8, 0, 28);
        hullG.addColorStop(0, p.primary);
        hullG.addColorStop(0.4, p.primary);
        hullG.addColorStop(1, p.dark);
        rr(ctx, 7, 8, 34, 20, 5, '#000');
        rrG(ctx, 8, 9, 32, 18, 4, p.primary, p.dark);
        // 装甲面板线
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(10, 16); ctx.lineTo(38, 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24, 9); ctx.lineTo(24, 27); ctx.stroke();
        // 前装甲斜面
        rr(ctx, 33, 10, 8, 16, 3, p.secondary);
        edgeHi(ctx, 8, 9, 32);
        // 铆钉
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        for (const [rx, ry] of [[12, 11], [12, 25], [36, 11], [36, 25]]) {
          circle(ctx, rx, ry, 1.2, 'rgba(0,0,0,.35)');
        }
        // 高光
        edgeHi(ctx, 9, 10, 30);
        // 划痕
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(14, 20); ctx.lineTo(30, 14); ctx.stroke();
        // 舷侧机枪座（左右各一，独立于主炮，射步兵弹）
        ctx.fillStyle = '#2c2f34';
        ctx.fillRect(13, 7.4, 6, 1.8);
        ctx.fillRect(13, 26.8, 6, 1.8);
        circle(ctx, 12.5, 8.3, 1.4, METAL_DARK);
        circle(ctx, 12.5, 27.7, 1.4, METAL_DARK);
        cache.set(key + ':h', hull);
        // 炮塔：渐变装甲+描边+高光
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(44, 26);
        tc.fillStyle = METAL_DARK;
        tc.fillRect(18, 11, 24, 4.5);              // 炮管
        tc.fillStyle = '#0f0d0a';
        tc.fillRect(18, 12.5, 24, 1.5);            // 炮管暗部
        tc.fillRect(38, 9.5, 4, 7);                // 炮口制退器
        // 炮塔体：渐变
        const turG = tc.createLinearGradient(0, 4, 0, 22);
        turG.addColorStop(0, p.primary);
        turG.addColorStop(1, p.dark);
        circle(tc, 14, 13, 9, '#000');
        tc.fillStyle = turG;
        circle(tc, 14, 13, 8, turG as unknown as string);
        tc.fillStyle = turG;
        tc.beginPath(); tc.arc(14, 13, 8, 0, Math.PI * 2); tc.fill();
        // 炮塔高光+描边
        circle(tc, 12, 11, 2.5, 'rgba(255,255,255,.3)');
        outline(tc, 'rgba(0,0,0,.3)', 1);
        // 舱盖
        circle(tc, 16, 16, 2.5, p.dark);
        outline(tc, 'rgba(255,255,255,.1)', 0.8);
        cache.set(key + ':t', turret);
        break;
      }
      case 'flamethrower': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(20, 20);
        circle(ctx, 10, 11, 6.5, '#3d5230');
        circle(ctx, 10, 11, 5, '#5d7a3a');
        ctx.fillStyle = '#b5443a';
        ctx.fillRect(6, 9, 8, 2);
        circle(ctx, 11, 6, 2.4, '#e8c9a0');
        // 背负燃料罐
        ctx.fillStyle = '#b5443a';
        ctx.fillRect(3, 6, 3, 9);
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(16, 10);
        tc.fillStyle = '#5d4223';
        tc.fillRect(4, 4, 9, 2.4);
        tc.fillStyle = '#e8843c';
        tc.fillRect(12, 3, 3, 4);
        cache.set(key + ':t', turret);
        break;
      }
      case 'barbarian': {
        // 蛮族：皮毛+战绘+体格壮硕
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(22, 22);
        circle(ctx, 11, 12, 7.5, '#3a3129');
        circle(ctx, 11, 12, 5.5, '#8a7a5a');
        ctx.fillStyle = '#b5443a';
        ctx.fillRect(7, 10, 8, 2.2);
        circle(ctx, 12, 7, 2.4, '#e8c9a0');
        cache.set(key + ':h', hull);
        // 斧头当炮塔层（视觉上抡斧）
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(18, 10);
        tc.fillStyle = '#5d4223';
        tc.fillRect(4, 4, 12, 2.2);
        tc.fillStyle = '#9aa4ad';
        tc.fillRect(13, 2, 4, 6);
        cache.set(key + ':t', turret);
        break;
      }
      case 'bomber': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(30, 22);
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.ellipse(15, 17, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a7dd6';
        ctx.beginPath(); ctx.ellipse(15, 10, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d3560';
        ctx.beginPath(); ctx.moveTo(2, 6); ctx.lineTo(28, 6); ctx.lineTo(24, 14); ctx.lineTo(6, 14); ctx.closePath(); ctx.fill();
        circle(ctx, 25, 9, 2.5, '#9fc5f5');
        cache.set(key + ':h', hull);
        break;
      }
      case 'helicopter': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(26, 26);
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.ellipse(13, 20, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a7dd6';
        ctx.beginPath(); ctx.ellipse(13, 12, 8, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d3560';
        ctx.fillRect(11, 4, 4, 6);
        circle(ctx, 13, 11, 3, '#9fc5f5');
        ctx.fillStyle = '#2c4f8a';
        ctx.fillRect(9, 17, 8, 2.5);
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(16, 12);
        tc.fillStyle = '#2c2f34';
        tc.fillRect(5, 5, 8, 2.4);
        cache.set(key + ':t', turret);
        break;
      }
      case 'gunboat': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(32, 20);
        ctx.fillStyle = '#4a5056';
        ctx.beginPath();
        ctx.moveTo(4, 4); ctx.lineTo(26, 4); ctx.lineTo(31, 10); ctx.lineTo(26, 16); ctx.lineTo(4, 16); ctx.lineTo(1, 10);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2c343c';
        ctx.fillRect(8, 7, 10, 6);
        circle(ctx, 22, 10, 3, '#f0a63c');
        cache.set(key + ':h', hull);
        break;
      }
      case 'mech': {
        // 步战机甲：大型双足机甲，棱角装甲+独眼核心+侧肩武器
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(52, 52);
        const cx = 26, cy = 26;
        // 底盘阴影
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 8, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
        // 主体装甲（棱角多边形）
        const bodyG = ctx.createLinearGradient(0, cy - 16, 0, cy + 16);
        bodyG.addColorStop(0, '#5a6068');
        bodyG.addColorStop(0.5, '#3d444e');
        bodyG.addColorStop(1, '#2a3038');
        ctx.fillStyle = bodyG;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 12);
        ctx.lineTo(cx - 8, cy - 18);
        ctx.lineTo(cx + 10, cy - 18);
        ctx.lineTo(cx + 18, cy - 10);
        ctx.lineTo(cx + 18, cy + 10);
        ctx.lineTo(cx + 10, cy + 16);
        ctx.lineTo(cx - 10, cy + 16);
        ctx.lineTo(cx - 18, cy + 8);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 'rgba(0,0,0,.45)', 1.5);
        // 装甲面板线
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 14, cy - 4); ctx.lineTo(cx + 14, cy - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 14, cy + 6); ctx.lineTo(cx + 14, cy + 6); ctx.stroke();
        // 独眼核心
        circle(ctx, cx, cy - 4, 6, '#1a1e24');
        circle(ctx, cx, cy - 4, 4, '#22343f');
        circle(ctx, cx, cy - 4, 2.5, '#6ecbff');
        circle(ctx, cx - 1, cy - 5, 1, 'rgba(255,255,255,.5)');
        // 肩炮（两侧凸出）
        rr(ctx, cx - 22, cy - 8, 6, 10, 2, '#35455c');
        rr(ctx, cx + 16, cy - 8, 6, 10, 2, '#35455c');
        ctx.fillStyle = '#f0a63c';
        ctx.fillRect(cx - 21, cy - 5, 4, 2);
        ctx.fillRect(cx + 17, cy - 5, 4, 2);
        // 顶部通风口
        ctx.fillStyle = '#1a1e24';
        for (let i = 0; i < 3; i++) ctx.fillRect(cx - 8 + i * 6, cy - 16, 4, 3);
        cache.set(key + ':h', hull);
        break;
      }
      case 'caravan': {
        // 车体：双轮货车+货袋（移动钱包）
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(30, 26);
        circle(ctx, 8, 19, 5.5, '#1a1e24'); circle(ctx, 22, 19, 5.5, '#1a1e24');
        circle(ctx, 8, 19, 2.4, '#5d4a2f'); circle(ctx, 22, 19, 2.4, '#5d4a2f');
        rr(ctx, 3, 8, 24, 10, 3, '#8a6238');
        circle(ctx, 10, 8, 4.5, '#c9a53c');
        circle(ctx, 17, 7, 4, '#a8842e');
        ctx.fillStyle = p.primary;
        ctx.fillRect(3, 16, 24, 2);
        cache.set(key + ':h', hull);
        // 炮塔位：无武器——小商旗
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(14, 12);
        tc.strokeStyle = '#20242a'; tc.lineWidth = 1.6;
        tc.beginPath(); tc.moveTo(4, 10); tc.lineTo(4, 2); tc.stroke();
        tc.fillStyle = p.primary;
        tc.fillRect(4, 2, 7, 3.5);
        cache.set(key + ':t', turret);
        break;
      }
      case 'palaceCart': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(56, 40);
        for (const [wx, wy] of [[10, 8], [24, 7], [38, 8], [10, 32], [24, 33], [38, 32]]) {
          circle(ctx, wx, wy, 6, '#3d2b1a');
          circle(ctx, wx, wy, 2.6, '#7a5f3d');
        }
        rr(ctx, 4, 10, 48, 20, 6, '#000');
        rrG(ctx, 5, 11, 46, 18, 5, '#8a6238', '#5d4223');
        rr(ctx, 34, 12, 14, 16, 4, '#e8e0d0');
        circle(ctx, 41, 12, 3, '#ffd76e');
        ctx.fillStyle = '#3f8f6a';
        ctx.fillRect(6, 24, 40, 3);
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(20, 10);
        tc.strokeStyle = '#20242a'; tc.lineWidth = 2;
        tc.beginPath(); tc.moveTo(6, 8); tc.lineTo(6, 2); tc.stroke();
        tc.fillStyle = '#3f8f6a'; tc.fillRect(6, 2, 8, 3.5);
        cache.set(key + ':t', turret);
        break;
      }
      case 'serf': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(18, 18);
        circle(ctx, 9, 10, 6, '#8a9a6a');
        ctx.fillStyle = '#e8c9a0';
        circle(ctx, 9, 6.5, 2, '#e8c9a0');
        ctx.fillStyle = '#c9b06a';
        ctx.beginPath(); ctx.ellipse(9, 4.6, 6.8, 2.3, 0, 0, Math.PI * 2); ctx.fill();
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(16, 8);
        tc.fillStyle = '#6b4f2a'; tc.fillRect(3, 3.2, 10, 2);
        tc.fillStyle = '#8a919c'; tc.fillRect(12, 1.8, 3, 4);
        cache.set(key + ':t', turret);
        break;
      }
      case 'militia': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(18, 18);
        circle(ctx, 9, 10, 6, '#5d8a4a');
        ctx.fillStyle = '#e8c9a0';
        circle(ctx, 9, 6.5, 2, '#e8c9a0');
        ctx.fillStyle = '#4a3823';
        circle(ctx, 9, 5, 2.6, '#4a3823');
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(20, 8);
        tc.fillStyle = '#2c2f34'; tc.fillRect(3, 3.2, 14, 2.2);
        tc.fillStyle = '#8a919c'; tc.fillRect(15, 2, 3, 3.4);
        cache.set(key + ':t', turret);
        break;
      }
      case 'spearman': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(20, 18);
        circle(ctx, 10, 10, 6.5, '#3f8f6a');
        ctx.fillStyle = '#e8c9a0';
        circle(ctx, 10, 6, 2.2, '#e8c9a0');
        ctx.fillStyle = '#2c6b4a';
        ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(15, 8); ctx.lineTo(5, 8); ctx.closePath(); ctx.fill();
        cache.set(key + ':h', hull);
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(24, 10);
        tc.strokeStyle = '#6b4f2a'; tc.lineWidth = 2;
        tc.beginPath(); tc.moveTo(3, 5); tc.lineTo(20, 5); tc.stroke();
        tc.fillStyle = '#dceaf2';
        tc.beginPath(); tc.moveTo(20, 2.5); tc.lineTo(24, 5); tc.lineTo(20, 7.5); ctx.closePath(); tc.fill();
        cache.set(key + ':t', turret);
        break;
      }
      case 'deer': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(20, 18);
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.beginPath(); ctx.ellipse(10, 13, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b98d5a';
        ctx.beginPath(); ctx.ellipse(9, 9, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        circle(ctx, 16, 6, 2.6, '#a37a4a');
        ctx.strokeStyle = '#6b5233'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(18, 1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(17, 4); ctx.lineTo(15, 1); ctx.stroke();
        ctx.fillStyle = '#f0e6d0';
        ctx.fillRect(2, 8, 3, 2.4);
        cache.set(key + ':h', hull);
        break;
      }
      case 'wolf': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(22, 16);
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(11, 12, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7a8087';
        ctx.beginPath(); ctx.ellipse(10, 8, 7, 3.6, 0, 0, Math.PI * 2); ctx.fill();
        circle(ctx, 17, 6, 2.6, '#8a9096');
        ctx.fillStyle = '#4a5056';
        ctx.fillRect(0, 5, 5, 2.2);
        ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(17.5, 1.5); ctx.lineTo(18.5, 4.5); ctx.closePath(); ctx.fill();
        cache.set(key + ':h', hull);
        break;
      }
      case 'artillery': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(50, 34);
        rr(ctx, 2, 1, 46, 9, 4, '#22262c');
        rr(ctx, 2, 24, 46, 9, 4, '#22262c');
        ctx.fillStyle = '#3a4049';
        for (let i = 0; i < 7; i++) {
          circle(ctx, 7 + i * 6, 5.5, 2.2, '#3a4049');
          circle(ctx, 7 + i * 6, 28.5, 2.2, '#3a4049');
        }
        rr(ctx, 6, 8, 38, 18, 4, p.secondary);
        rr(ctx, 6, 8, 38, 6, 3, p.dark);           // 后部驻锄平台
        ctx.fillStyle = '#ffd76e';
        ctx.fillRect(8, 22, 12, 2);                 // 警示条
        cache.set(key + ':h', hull);
        // 炮塔：长管榴弹炮
        let tc: CanvasRenderingContext2D;
        [turret, tc] = mk(56, 28);
        tc.fillStyle = METAL_DARK;
        tc.fillRect(16, 12, 38, 4);                 // 长炮管
        tc.fillRect(48, 10, 5, 8);                  // 炮口
        circle(tc, 13, 14, 8, p.secondary);
        rr(tc, 8, 8, 12, 12, 3, p.primary);         // 防盾
        cache.set(key + ':t', turret);
        break;
      }
    }
  }
  if (!hull) throw new Error(`未知的兵种贴图: ${defId}`);
  return { hull, turret };
}

// ================= 建筑 =================

export interface BuildingSprites { base: HTMLCanvasElement; top: HTMLCanvasElement | null }

const M = 10; // 建筑贴图出血

export function getBuildingSprites(defId: string, owner: number): BuildingSprites {
  const key = `b:${defId}:${owner}`;
  let base = cache.get(key + ':b') ?? null;
  let top = cache.get(key + ':t') ?? null;
  if (!base) {
    const p = isKingdomDef(defId) ? (KINGDOM_PALETTES[owner] ?? KINGDOM_PALETTES[0]) : (PALETTES[owner] ?? PALETTES[0]);
    const def = BUILDING_SIZE[defId] ?? 1;
    const S = def * TILE;
    let ctx: CanvasRenderingContext2D;
    [base, ctx] = mk(S + M * 2, S + M * 2);
    ctx.translate(M, M);

    switch (defId) {
      case 'hq': {
        rr(ctx, 1, 1, S - 2, S - 2, 8, '#3d444e');           // 混凝土基座
        rr(ctx, 5, 5, S - 10, S - 10, 6, METAL_DARK);
        rr(ctx, 12, 12, S - 24, S - 24, 5, p.secondary);
        rr(ctx, 20, 20, S - 40, S - 30, 4, p.primary);        // 主楼
        ctx.fillStyle = p.dark;
        ctx.fillRect(24, S - 34, S - 48, 4);                  // 面板线
        // 中央塔
        circle(ctx, S / 2, S / 2 - 4, 13, METAL);
        circle(ctx, S / 2, S / 2 - 4, 8, p.primary);
        circle(ctx, S / 2, S / 2 - 4, 3, '#ffd76e');
        // 天线
        ctx.strokeStyle = '#20242a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(S / 2, S / 2 - 16); ctx.lineTo(S / 2, 14); ctx.stroke();
        circle(ctx, S / 2, 13, 3, '#ff5e4e');
        // 大门
        rr(ctx, S / 2 - 10, S - 20, 20, 12, 2, '#20242a');
        // 舷侧机枪巢（左右下角，独立开火，可对空）
        rr(ctx, 14, S - 24, 13, 9, 2, '#2c2f34');
        rr(ctx, S - 27, S - 24, 13, 9, 2, '#2c2f34');
        circle(ctx, 20, S - 19.5, 2, '#4a5560');
        circle(ctx, S - 20, S - 19.5, 2, '#4a5560');
        // 阵营徽带
        ctx.fillStyle = p.primary;
        ctx.fillRect(10, 8, S - 20, 5);
        // 防卫炮塔（随目标旋转，火炮对空对地溅射）
        let tc: CanvasRenderingContext2D;
        [top, tc] = mk(38, 20);
        circle(tc, 9, 10, 8.5, METAL);
        circle(tc, 9, 10, 5.5, p.primary);
        circle(tc, 9, 10, 2.4, p.dark);
        tc.fillStyle = '#2c2f34';
        tc.fillRect(15, 8.4, 18, 3.2);
        tc.fillStyle = METAL_DARK;
        tc.fillRect(13, 7, 3.4, 6);
        break;
      }
      case 'farm': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#6d5a35');            // 田埂
        rr(ctx, 4, 4, S - 8, S - 8, 4, '#8a7040');            // 耕地
        ctx.fillStyle = '#c9a53c';
        for (let i = 8; i < S - 10; i += 8) ctx.fillRect(6, i, S - 16, 3);  // 麦垄
        // 筒仓
        circle(ctx, S - 16, 16, 9, METAL);
        circle(ctx, S - 16, 16, 6, '#c9c9c9');
        circle(ctx, S - 16, 16, 2.5, p.primary);
        break;
      }
      case 'lumber': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#5d4a2f');
        rr(ctx, 6, 6, S - 20, S - 12, 4, '#7a5f3d');          // 木屋
        ctx.strokeStyle = '#4a3823'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(S - 14, S - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(S - 14, 6); ctx.lineTo(6, S - 6); ctx.stroke();
        // 原木堆
        for (let i = 0; i < 3; i++) circle(ctx, S - 9, 14 + i * 8, 4.5, '#9c7a4d');
        for (let i = 0; i < 3; i++) circle(ctx, S - 9, 14 + i * 8, 2, '#c9a06a');
        break;
      }
      case 'mine': {
        rr(ctx, 1, 1, S - 2, S - 2, 8, '#4c4f56');            // 岩盘
        // 岩堆多边形
        ctx.fillStyle = COLORS.oreRock;
        ctx.beginPath();
        ctx.moveTo(6, S - 8); ctx.lineTo(10, 14); ctx.lineTo(S / 2, 5);
        ctx.lineTo(S - 10, 14); ctx.lineTo(S - 6, S - 8);
        ctx.closePath(); ctx.fill();
        // 竖井架
        ctx.fillStyle = '#3a2f22';
        ctx.fillRect(S / 2 - 3, S / 2 - 8, 6, 14);
        ctx.strokeStyle = '#7a5f3d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(S / 2 - 9, S - 10); ctx.lineTo(S / 2, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(S / 2 + 9, S - 10); ctx.lineTo(S / 2, 12); ctx.stroke();
        circle(ctx, S / 2, 11, 4, '#ffd76e');
        // 矿石晶粒
        ctx.fillStyle = COLORS.oreCrystal;
        for (const [ox, oy] of [[14, 20], [S - 18, 18], [16, S - 16], [S - 20, S - 14]]) {
          ctx.save(); ctx.translate(ox, oy); ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6); ctx.restore();
        }
        break;
      }
      case 'barracks': {
        rr(ctx, 1, 1, S - 2, S - 2, 7, '#3d444e');
        rr(ctx, 6, 10, S - 12, S - 18, 4, p.secondary);       // 营房
        ctx.fillStyle = p.primary;
        for (let i = 0; i < 4; i++) ctx.fillRect(10 + i * ((S - 24) / 4), 14, (S - 24) / 5, S - 26); // 帐篷列
        rr(ctx, S / 2 - 9, S - 22, 18, 10, 2, '#20242a');     // 门
        // 旗杆
        ctx.strokeStyle = '#20242a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(10, 3); ctx.stroke();
        ctx.fillStyle = p.primary;
        ctx.fillRect(10, 3, 14, 7);
        break;
      }
      case 'factory': {
        rr(ctx, 1, 1, S - 2, S - 2, 7, '#3d444e');
        // 锯齿屋顶厂房
        rr(ctx, 5, 8, S - 10, S - 18, 4, METAL_DARK);
        ctx.fillStyle = METAL;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const x0 = 9 + i * ((S - 20) / 3);
          ctx.moveTo(x0, S - 14);
          ctx.lineTo(x0, 18); ctx.lineTo(x0 + (S - 20) / 6, 12);
          ctx.lineTo(x0 + (S - 20) / 6, S - 14);
          ctx.closePath(); ctx.fill();
        }
        // 烟囱
        circle(ctx, S - 16, 16, 7, '#22262c');
        circle(ctx, S - 16, 16, 4, '#565c66');
        // 卷帘门
        ctx.fillStyle = '#20242a';
        ctx.fillRect(S / 2 - 12, S - 16, 24, 8);
        ctx.fillStyle = p.primary;
        ctx.fillRect(S / 2 - 12, S - 16, 24, 2.5);
        // 徽带
        ctx.fillStyle = p.primary;
        ctx.fillRect(8, 8, S - 16, 4);
        break;
      }
      case 'turret': {
        rr(ctx, 2, 2, S - 4, S - 4, 6, '#3d444e');            // 底座
        circle(ctx, S / 2, S / 2, S / 2 - 7, METAL_DARK);
        ctx.fillStyle = '#22262c';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          circle(ctx, S / 2 + Math.cos(a) * (S / 2 - 5), S / 2 + Math.sin(a) * (S / 2 - 5), 1.8, '#22262c');
        }
        circle(ctx, S / 2, S / 2, 6, p.dark);
        // 顶部旋转炮（top层）
        let tc: CanvasRenderingContext2D;
        [top, tc] = mk(52, 20);
        tc.fillStyle = METAL_DARK;
        tc.fillRect(22, 8, 28, 4.5);
        tc.fillRect(46, 6.5, 4, 7);
        circle(tc, 18, 10, 8, p.secondary);
        circle(tc, 18, 10, 5.5, p.primary);
        break;
      }
      case 'shipyard': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#3d444e');
        ctx.fillStyle = '#2d6a9e';
        ctx.fillRect(S - 26, 8, 18, S - 16);
        ctx.fillStyle = '#3d7fb5';
        ctx.fillRect(S - 24, 10, 14, S - 20);
        ctx.strokeStyle = '#f0a63c'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(14, S - 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(S - 20, 8); ctx.stroke();
        circle(ctx, S - 20, 10, 3, '#f0a63c');
        rr(ctx, 6, 12, 18, S - 24, 3, METAL_DARK);
        ctx.fillStyle = METAL;
        for (let i = 0; i < 3; i++) ctx.fillRect(8 + i * 5, 16, 3, S - 32);
        break;
      }
      case 'shieldGen': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#3d444e');
        circle(ctx, S / 2, S / 2, S / 2 - 8, '#22343f');
        circle(ctx, S / 2, S / 2, S / 2 - 12, '#1a2a38');
        ctx.fillStyle = '#6ecbff';
        ctx.beginPath(); ctx.moveTo(S / 2, 8); ctx.lineTo(S / 2 + 8, S / 2); ctx.lineTo(S / 2, S - 8); ctx.lineTo(S / 2 - 8, S / 2); ctx.closePath(); ctx.fill();
        circle(ctx, S / 2, S / 2, 4, '#c9ecff');
        ctx.strokeStyle = '#6ecbff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'aaTurret': {
        rr(ctx, 2, 2, S - 4, S - 4, 6, '#3d444e');
        circle(ctx, S / 2, S / 2, S / 2 - 7, '#22343f');
        for (let i = 0; i < 4; i++) {
          const a2 = (i / 4) * Math.PI * 2 + 0.4;
          rr(ctx, S / 2 + Math.cos(a2) * (S / 2 - 10) - 3, S / 2 + Math.sin(a2) * (S / 2 - 10) - 3, 6, 6, 1, '#35455c');
        }
        circle(ctx, S / 2, S / 2, 5, '#6ecbff');
        let tc: CanvasRenderingContext2D;
        [top, tc] = mk(48, 18);
        tc.fillStyle = METAL_DARK;
        tc.fillRect(20, 7, 16, 4);
        tc.fillStyle = '#6ecbff';
        tc.fillRect(33, 6, 6, 6);
        circle(tc, 16, 9, 7, p.secondary);
        circle(tc, 16, 9, 4.5, p.primary);
        break;
      }
      case 'artTurret': {
        rr(ctx, 2, 2, S - 4, S - 4, 6, '#4a4030');
        circle(ctx, S / 2, S / 2, S / 2 - 6, '#57503f');
        ctx.fillStyle = '#6b6250';
        for (let i = 0; i < 6; i++) {
          const a2 = (i / 6) * Math.PI * 2;
          ctx.fillRect(S / 2 + Math.cos(a2) * (S / 2 - 10) - 3, S / 2 + Math.sin(a2) * (S / 2 - 10) - 3, 6, 6);
        }
        let tc: CanvasRenderingContext2D;
        [top, tc] = mk(58, 22);
        tc.fillStyle = '#4a4030';
        circle(tc, 16, 11, 9, p.dark);
        circle(tc, 16, 11, 6, '#7a6a50');
        tc.fillStyle = METAL_DARK;
        tc.fillRect(20, 9, 34, 4.5);
        tc.fillRect(50, 8, 5, 7);
        break;
      }
      case 'lifeTree': {
        rr(ctx, 1, 1, S - 2, S - 2, 8, '#3d4a34');
        circle(ctx, S / 2, S / 2 - 6, 26, '#2e5e2a');
        circle(ctx, S / 2 - 10, S / 2 - 14, 16, '#3a7534');
        circle(ctx, S / 2 + 10, S / 2 - 12, 14, '#4a8a3f');
        ctx.fillStyle = '#5d4223';
        ctx.fillRect(S / 2 - 8, S / 2 + 8, 16, 16);
        ctx.fillStyle = '#3d2b1a';
        ctx.beginPath(); ctx.arc(S / 2, S / 2 + 14, 6, 0, Math.PI, true); ctx.fill();
        ctx.fillStyle = '#ffd76e';
        for (let k = 0; k < 5; k++) circle(ctx, 12 + k * ((S - 24) / 4), 10 + (k % 2) * 4, 2, '#ffd76e');
        break;
      }
      case 'orchard': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#6d5a35');
        rr(ctx, 4, 4, S - 8, S - 8, 4, '#7a8a4a');
        for (const [ax, ay] of [[S / 4, S / 4], [(S * 3) / 4, S / 4], [S / 4, (S * 3) / 4], [(S * 3) / 4, (S * 3) / 4]]) {
          circle(ctx, ax, ay, 8, '#c9564a');
          circle(ctx, ax - 2, ay - 2, 3, '#e8a06a');
        }
        break;
      }
      case 'lumberShed': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#5d4a2f');
        rr(ctx, 6, 6, S - 12, S - 14, 4, '#7a5f3d');
        ctx.strokeStyle = '#4a3823'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(S - 6, S / 2 - 1); ctx.stroke();
        for (let i = 0; i < 3; i++) circle(ctx, S - 9, S - 14 + i * 7, 4, '#9c7a4d');
        break;
      }
      case 'silverMine': {
        rr(ctx, 1, 1, S - 2, S - 2, 8, '#4c4f56');
        ctx.fillStyle = '#8ad8e8';
        for (const [cx2, cy2] of [[S / 2 - 8, S / 2], [S / 2 + 6, S / 2 + 4], [S / 2, S - 10]]) {
          ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6); ctx.restore();
        }
        ctx.strokeStyle = '#d8f0f8'; ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, S - 12, S - 12);
        break;
      }
      case 'granary': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#8a6238');
        circle(ctx, S / 2, S / 2 + 2, S / 2 - 8, '#c9a53c');
        ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 2;
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath(); ctx.moveTo(8, S / 2 + k * 7); ctx.lineTo(S - 8, S / 2 + k * 7); ctx.stroke();
        }
        circle(ctx, S / 2, 10, 5, '#8a6238');
        break;
      }
      case 'sageTower': {
        rr(ctx, 1, 1, S - 2, S - 2, 8, '#3d444e');
        rr(ctx, S / 2 - 10, S / 2 - 6, 20, S / 2, 5, '#5a5f8a');
        circle(ctx, S / 2, 16, 10, '#7a5fa8');
        circle(ctx, S / 2, 16, 5, '#c9b0e8');
        ctx.fillStyle = '#ffd76e';
        circle(ctx, S / 2, 8, 3, '#ffd76e');
        ctx.fillRect(S / 2 - 1.5, 8, 3, 8);
        break;
      }
      case 'warHall': {
        rr(ctx, 1, 1, S - 2, S - 2, 8, '#3d2b1a');
        rr(ctx, 5, 5, S - 10, S - 10, 5, '#5d4223');
        rr(ctx, 12, 12, S - 24, S - 30, 4, '#7a5f3d');
        ctx.beginPath();
        ctx.moveTo(10, 24); ctx.lineTo(S / 2, 8); ctx.lineTo(S - 10, 24);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3f8f6a';
        ctx.fillRect(10, 24, S - 20, 4);
        rr(ctx, S / 2 - 8, S - 22, 16, 14, 2, '#20242a');
        break;
      }
      case 'wall': {
        rr(ctx, 3, 3, S - 6, S - 6, 3, '#6b6f78');
        rr(ctx, 7, 7, S - 14, S - 14, 2, '#8a8f96');
        ctx.fillStyle = '#5a4636';
        ctx.fillRect(10, 10, S - 20, S - 20);
        break;
      }
      case 'camp': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#4a3f30');
        ctx.strokeStyle = '#5d4a2f'; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const a2 = (i / 8) * Math.PI * 2;
          circle(ctx, S / 2 + Math.cos(a2) * (S / 2 - 5), S / 2 + Math.sin(a2) * (S / 2 - 5), 2.5, '#6b5233');
        }
        // 双帐篷
        const tent = function (x: number, y: number, s2: number, c1: string, c2: string) {
          ctx.fillStyle = c1;
          ctx.beginPath(); ctx.moveTo(x, y + s2); ctx.lineTo(x + s2 / 2, y); ctx.lineTo(x + s2, y + s2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = c2;
          ctx.beginPath(); ctx.moveTo(x + s2 / 2 - 3, y + s2); ctx.lineTo(x + s2 / 2, y + s2 - 6); ctx.lineTo(x + s2 / 2 + 3, y + s2); ctx.closePath(); ctx.fill();
        };
        tent(10, 12, 18, '#7a5a3a', '#4a3826');
        tent(S - 30, S - 30, 20, '#8a6a45', '#4a3826');
        // 篝火
        circle(ctx, S - 14, 14, 5, '#e8843c');
        circle(ctx, S - 14, 14, 2.5, '#ffd76e');
        ctx.strokeStyle = '#5d4223'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(S - 19, 19); ctx.lineTo(S - 9, 9); ctx.stroke();
        break;
      }
      case 'storehouse': {
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#4a4038');            // 夯土地坪
        // 板条箱堆（三种规格错落）
        const crate = (x: number, y: number, s: number): void => {
          rr(ctx, x, y, s, s, 2, '#9c7a4d');
          ctx.strokeStyle = '#6b5233'; ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
          ctx.beginPath(); ctx.moveTo(x + 1.5, y + 1.5); ctx.lineTo(x + s - 1.5, y + s - 1.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + s - 1.5, y + 1.5); ctx.lineTo(x + 1.5, y + s - 1.5); ctx.stroke();
        };
        crate(6, 8, 16); crate(24, 6, 12); crate(10, 26, 13); crate(26, 22, 15); crate(S - 16, S - 22, 12);
        // 雨棚（斜纹布）
        ctx.fillStyle = p.secondary;
        ctx.fillRect(S - 22, 6, 16, S - 12);
        ctx.fillStyle = p.primary;
        for (let i = 0; i < 4; i++) ctx.fillRect(S - 22, 10 + i * (S - 20) / 4, 16, 3);
        // 旗杆
        ctx.strokeStyle = '#20242a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(8, 2); ctx.stroke();
        ctx.fillStyle = p.primary;
        ctx.fillRect(8, 2, 10, 5);
        break;
      }
      case 'lab': {
        rr(ctx, 1, 1, S - 2, S - 2, 8, '#3d444e');            // 混凝土基座
        rr(ctx, 6, 6, S - 12, S - 12, 6, METAL_DARK);
        rr(ctx, 10, 10, S - 20, S - 20, 5, p.secondary);
        // 圆顶主楼（观测站）
        circle(ctx, S / 2, S / 2 + 3, 16, p.primary);
        circle(ctx, S / 2, S / 2 + 3, 11, '#c9d4e0');
        circle(ctx, S / 2 - 3, S / 2 - 1, 4, 'rgba(255,255,255,.5)');
        // 碟形天线
        ctx.strokeStyle = METAL; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(S - 16, 16, 8, Math.PI * 0.15, Math.PI * 1.05); ctx.stroke();
        ctx.strokeStyle = '#20242a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(S - 16, 16); ctx.lineTo(S - 16, 26); ctx.stroke();
        // 状态灯
        circle(ctx, 14, S - 14, 2.5, '#7dff7d');
        circle(ctx, 22, S - 14, 2.5, '#ffd76e');
        // 阵营徽带
        ctx.fillStyle = p.primary;
        ctx.fillRect(8, 8, S - 16, 4);
        break;
      }
      case 'tradePost': {
        // 泥地基座+站台
        rr(ctx, 1, 1, S - 2, S - 2, 6, '#5d4a2f');
        rr(ctx, 5, 5, S - 10, S - 10, 4, '#7a5f3d');
        // 条纹雨棚
        rr(ctx, 8, 8, S - 16, 12, 4, p.secondary);
        ctx.fillStyle = p.primary;
        for (let i = 0; i < 4; i++) ctx.fillRect(8 + i * ((S - 16) / 4), 8, (S - 16) / 8, 12);
        // 柜台
        rr(ctx, 10, 26, S - 20, 10, 2, '#9c7a4d');
        ctx.fillStyle = '#c9a53c';
        ctx.fillRect(14, 28, 8, 6);
        ctx.fillRect(S - 26, 28, 8, 6);
        // 金币堆
        circle(ctx, S - 14, S - 14, 4, '#ffd76e');
        circle(ctx, S - 21, S - 12, 3, '#ffd76e');
        circle(ctx, 16, S - 12, 3, '#e8c25a');
        break;
      }
      case 'monument': {
        // 阶梯基座
        rr(ctx, 6, S - 26, S - 12, 20, 3, '#4c4f56');
        rr(ctx, 14, S - 42, S - 28, 16, 3, '#565c66');
        // 方尖碑身
        ctx.fillStyle = '#c9c9c9';
        ctx.beginPath();
        ctx.moveTo(S / 2 - 11, S - 42); ctx.lineTo(S / 2 - 6, 20);
        ctx.lineTo(S / 2 + 6, 20); ctx.lineTo(S / 2 + 11, S - 42);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#efefef';
        ctx.fillRect(S / 2 - 4, 26, 3, S - 72);
        // 金顶
        circle(ctx, S / 2, 15, 7, '#ffd76e');
        circle(ctx, S / 2, 15, 3.2, '#fff2c0');
        // 阵营徽环
        circle(ctx, S / 2, S - 16, 5, p.primary);
        circle(ctx, S / 2, S - 16, 2.4, '#fff2c0');
        break;
      }
    }
    cache.set(key + ':b', base);
    if (top) cache.set(key + ':t', top);
  }
  return { base, top };
}

const BUILDING_SIZE: Record<string, number> = { hq: 3, farm: 2, lumber: 2, mine: 2, storehouse: 2, lab: 2, tradePost: 2, monument: 3, barracks: 3, factory: 3, turret: 1, lifeTree: 3, orchard: 2, lumberShed: 2, silverMine: 2, granary: 2, sageTower: 2, warHall: 3 };

// ================= 地块 =================

function hashIdx(i: number): number {
  let x = (i * 2654435761) >>> 0;
  x ^= x >>> 13; x = (x * 1274126177) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export function getTreeSprite(variantSeed: number): HTMLCanvasElement {
  const key = `tree:${variantSeed % 3}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = mk(TILE + 12, TILE + 16);
  const cx = (TILE + 12) / 2, cy = (TILE + 16) / 2 + 3;
  const v = variantSeed % 3;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 9, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.treeTrunk;
  ctx.fillRect(cx - 2.5, cy + 1, 5, 9);
  const leaf = COLORS.treeLeaf;
  circle(ctx, cx - 5 + v, cy - 2, 8, leaf[v % 2]);
  circle(ctx, cx + 5 - v, cy - 1, 7.5, leaf[(v + 1) % 2]);
  circle(ctx, cx, cy - 7 + (v > 0 ? 1 : 0), 8.5, leaf[v % 2]);
  circle(ctx, cx - 2, cy - 8, 3.5, 'rgba(255,255,255,.14)');
  cache.set(key, c);
  return c;
}

const GRASS_BY_HEIGHT = ['#4a7c3a', '#559041', '#60a249', '#6cb551'];

/** 战场遗迹：尸体/烧毁载具/建筑废墟/兽尸（程序化，seed确定性） */
export function drawWreck(ctx: CanvasRenderingContext2D, kind: 'corpse' | 'vehicle' | 'rubble' | 'beast', x: number, y: number, size: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  const n = hashIdx(seed);
  const rot = ((n % 10) / 10) * Math.PI * 2;

  if (kind === 'corpse') {
    // 血渍
    ctx.fillStyle = 'rgba(96,18,10,.38)';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, rot, 0, Math.PI * 2); ctx.fill();
    // 倒地士兵剪影
    ctx.rotate(rot);
    ctx.fillStyle = '#33302a';
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    circle(ctx, 7, -1, 2.2, '#3d3830');
    ctx.fillStyle = '#2a2721';
    ctx.fillRect(-2, 2, 7, 1.6);
  } else if (kind === 'beast') {
    ctx.fillStyle = 'rgba(96,18,10,.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 5.5, rot, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(rot);
    ctx.fillStyle = '#4a3f35';
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    circle(ctx, 6, -1, 2, '#3a3129');
  } else if (kind === 'vehicle') {
    // 焦土
    ctx.fillStyle = 'rgba(15,12,10,.5)';
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 17, rot, 0, Math.PI * 2); ctx.fill();
    // 烧毁车体（歪斜）
    ctx.rotate(rot);
    ctx.fillStyle = '#26221e';
    rr(ctx, -13, -9, 26, 18, 4, '#26221e');
    ctx.fillStyle = '#1a1713';
    circle(ctx, -3, 0, 5, '#1a1713');       // 歪斜炮塔
    ctx.strokeStyle = '#0f0d0a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(11, 4); ctx.stroke(); // 垂落炮管
    // 余烬
    ctx.fillStyle = '#e8843c';
    ctx.globalAlpha = 0.55 + 0.35 * ((seed % 7) / 7);
    circle(ctx, 8, -5, 1.6, '#e8843c');
    circle(ctx, -10, 6, 1.2, '#e8843c');
    ctx.globalAlpha = 1;
  } else {
    // 建筑废墟
    const S = size * 32;
    ctx.fillStyle = 'rgba(15,12,10,.5)';
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.62, S * 0.5, rot, 0, Math.PI * 2); ctx.fill();
    // 瓦砾块
    for (let k = 0; k < 7 + size * 2; k++) {
      const rx = ((n >> (k * 2)) % 100) / 100 * S - S / 2;
      const ry = ((n >> (k * 3 + 1)) % 100) / 100 * S - S / 2;
      const rs = 2 + ((n >> (k + 5)) % 4);
      ctx.fillStyle = k % 3 === 0 ? '#3a332c' : k % 3 === 1 ? '#57503f' : '#2a251f';
      ctx.save(); ctx.translate(rx, ry); ctx.rotate((n + k * 40) / 40);
      ctx.fillRect(-rs, -rs / 2, rs * 2, rs);
      ctx.restore();
    }
    // 残垣
    ctx.fillStyle = '#453b30';
    ctx.fillRect(-S * 0.3, -S * 0.34, S * 0.42, 5);
    ctx.fillRect(S * 0.12, S * 0.18, 5, S * 0.26);
    // 余烬
    ctx.fillStyle = '#e8843c';
    ctx.globalAlpha = 0.5;
    circle(ctx, 4, -4, 1.8, '#e8843c');
    circle(ctx, -12, 8, 1.4, '#e8843c');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawTerrainTile(ctx: CanvasRenderingContext2D, kind: number, px: number, py: number, i: number, h = 0, farmStage = -1): void {
  const hh = Math.max(0, Math.min(3, h));
  const n = hashIdx(i);
  if (kind === T_GRASS || kind === T_RAMP) {
    ctx.fillStyle = GRASS_BY_HEIGHT[hh];
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = COLORS.grassNoise[n % 3];
    ctx.fillRect(px + (n % 7) * 4, py + ((n >> 3) % 7) * 4, 3, 3);
    ctx.fillRect(px + ((n >> 6) % 7) * 4, py + ((n >> 9) % 7) * 4, 2, 2);
  } else if (kind === T_FARM) {
    // 麦田：耕地棕底+田垄，按生长段位铺作物（0茬地/1苗/2青/3金）
    ctx.fillStyle = '#6d5636';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(px + 3, py + 6.5 + k * 7); ctx.lineTo(px + TILE - 3, py + 6.5 + k * 7); ctx.stroke();
    }
    if (farmStage === 0) {
      // 茬地：收割后的短秸秆
      ctx.fillStyle = 'rgba(215,195,125,.45)';
      for (let k = 0; k < 6; k++) ctx.fillRect(px + 4 + ((i >> k) % 6) * 4.6, py + 5 + ((i >> (k + 2)) % 6) * 4.4, 2, 2);
    } else if (farmStage === 1) {
      ctx.fillStyle = '#7fbf5f';
      for (let k = 0; k < 4; k++) for (let m = 0; m < 3; m++) ctx.fillRect(px + 6 + m * 9 + (k % 2) * 2, py + 6 + k * 7, 2, 3);
    } else if (farmStage === 2) {
      ctx.fillStyle = '#9ecb4f';
      for (let k = 0; k < 4; k++) for (let m = 0; m < 3; m++) ctx.fillRect(px + 6 + m * 9 + (k % 2) * 2, py + 4 + k * 7, 2.4, 6);
    } else {
      // 成熟：金黄麦穗
      ctx.fillStyle = '#d8a838';
      for (let k = 0; k < 4; k++) for (let m = 0; m < 3; m++) ctx.fillRect(px + 5.5 + m * 9 + (k % 2) * 2, py + 3 + k * 7, 3, 8);
      ctx.fillStyle = '#f5d97a';
      for (let k = 0; k < 4; k++) for (let m = 0; m < 3; m++) ctx.fillRect(px + 6 + m * 9 + (k % 2) * 2, py + 2 + k * 7, 2, 3);
    }
  } else if (kind === T_WATER) {
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = COLORS.waterWave; ctx.lineWidth = 1.5;
    const off = (n % 3) * 4;
    ctx.beginPath(); ctx.moveTo(px + 4, py + 10 + off * 0.4); ctx.lineTo(px + 16, py + 10 + off * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 14, py + 22 - off * 0.3); ctx.lineTo(px + 27, py + 22 - off * 0.3); ctx.stroke();
  } else if (kind === T_FORD) {
    ctx.fillStyle = '#7fa8c4';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = 'rgba(210,190,130,.45)';
    ctx.fillRect(px + (n % 5) * 5, py + ((n >> 3) % 5) * 5, 6, 4);
    ctx.fillRect(px + ((n >> 6) % 6) * 4, py + ((n >> 9) % 6) * 5, 5, 3);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 4, py + 12 + (n % 3) * 6); ctx.lineTo(px + 12, py + 12 + (n % 3) * 6); ctx.stroke();
  } else if (kind === T_ORE) {
    ctx.fillStyle = '#585c64';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = COLORS.oreRock;
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = COLORS.oreCrystal;
    for (let k = 0; k < 3; k++) {
      const ox = px + 5 + ((n >> (k * 4)) % 20), oy = py + 5 + ((n >> (k * 4 + 5)) % 20);
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(Math.PI / 4 + k);
      ctx.fillRect(-2.5, -2.5, 5, 5); ctx.restore();
    }
  }
  // T_TREE 由调用方在drawTerrainTile之后叠画getTreeSprite
}

export { T_TREE, T_WATER, T_ORE, T_GRASS };
