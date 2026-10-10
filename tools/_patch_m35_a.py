# M3.5大补丁：新单位贴图 + 舰船尾浪 + 机甲步足 + 城墙连接 + AI适配
import io

def patch(p, patterns):
    s = io.open(p, encoding='utf-8').read()
    ok = True
    for a, b in patterns:
        if a not in s:
            print('MISS:', p, '|', a[:70].replace('\n', '\\n'))
            ok = False
            continue
        s = s.replace(a, b)
    io.open(p, 'w', encoding='utf-8').write(s)
    return ok

# ============ 1) sprites.ts: 新单位贴图 ============
r1 = patch('src/render/sprites.ts', [
    # 轰炸机（在helicopter case前）
    ("""      case 'helicopter': {""",
     """      case 'bomber': {
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
      case 'helicopter': {"""),
    # 喷火兵（在barbarian case前）
    ("""      case 'barbarian': {""",
     """      case 'flamethrower': {
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
      case 'barbarian': {"""),
    # 机甲（在wolf case后）
    ("""      case 'deer': {""",
     """      case 'mech': {
        let ctx: CanvasRenderingContext2D;
        [hull, ctx] = mk(34, 34);
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.beginPath(); ctx.ellipse(17, 20, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
        rr(ctx, 5, 7, 24, 20, 6, '#3d444e');
        rr(ctx, 8, 10, 18, 14, 4, '#565c66');
        ctx.fillStyle = '#f0a63c';
        ctx.fillRect(10, 12, 14, 2.5);
        circle(ctx, 17, 15, 4, '#22343f');
        circle(ctx, 17, 15, 2, '#6ecbff');
        ctx.fillStyle = '#5a4636';
        ctx.fillRect(5, 25, 24, 3);
        cache.set(key + ':h', hull);
        break;
      }
      case 'deer': {"""),
])

# ============ 2) buildings sprites: 防空塔/火炮塔/城墙 ============
p2 = patch('src/render/sprites.ts', [
    ("""      case 'camp': {""",
     """      case 'aaTurret': {
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
      case 'wall': {
        rr(ctx, 3, 3, S - 6, S - 6, 3, '#6b6f78');
        rr(ctx, 7, 7, S - 14, S - 14, 2, '#8a8f96');
        ctx.fillStyle = '#5a4636';
        ctx.fillRect(10, 10, S - 20, S - 20);
        break;
      }
      case 'camp': {"""),
])

# ============ 3) effects.ts: 火焰弹/导弹弹/尾浪 ============
p3 = patch('src/render/effects.ts', [
    ("""      } else {
        ctx.fillStyle = p.kind === 'cannon' ? '#ff8a5e' : p.kind === 'shell' ? '#ffe28a' : '#dceaf2';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5, p.kind === 'bullet' ? 5 : 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }""",
     """      } else if (p.kind === 'fire') {
        ctx.fillStyle = '#ff9a3c';
        ctx.beginPath(); ctx.arc(0, 0, 3 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd76e';
        ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'missile') {
        ctx.strokeStyle = 'rgba(200,210,220,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = '#dceaf2';
        ctx.beginPath(); ctx.ellipse(0, 0, 2, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff8a5e';
        ctx.beginPath(); ctx.arc(0, -4, 1.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.kind === 'cannon' ? '#ff8a5e' : p.kind === 'shell' ? '#ffe28a' : '#ffd76e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5, p.kind === 'bullet' ? 5 : 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }"""),
    ("""      } else if (f.type === 'mark') {""",
     """      } else if (f.type === 'wake') {
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
      } else if (f.type === 'mark') {"""),
])
print('PATCH:', r1, r2, r3)
