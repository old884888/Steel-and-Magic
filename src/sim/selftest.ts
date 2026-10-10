import { SIM_DT, T_TREE } from '../config';
import { World } from './world';
import { simTick } from './tick';
import { AIController } from './ai';

/**
 * 无头模拟自测（无渲染），两阶段：
 *  Phase1：双方AI对打5分钟 —— 日志断言（建成/训练/波次）+ 存储上限数值校验
 *  Phase2：人工采集专项 —— 工程车砍树→回仓入库链路
 * 触发：?selftest=1，结果输出控制台与页面标题。
 */
export function runSelftest(): void {
  console.log('[selftest] Phase1：AI对打模拟，最长5分钟游戏时间…');
  const t0 = performance.now();
  const w = new World();
  // 地形健全性：高度范围 + 基地间高度感知连通
  let terrainOk = true;
  for (let i = 0; i < w.height.length; i++) if (w.height[i] > 3) { terrainOk = false; break; }
  {
    // BFS连通（与mapgen同规则，二次校验）：多源=玩家基地下方一排，多目标=敌方基地上方一排
    // （不能直接用基地格——上面盖着HQ建筑，walkable=0）
    const seen = new Uint8Array(64 * 64);
    const stack: number[] = [];
    for (let x = 6; x <= 9; x++) { const i = 9 * 64 + x; if (w.walkable[i]) { seen[i] = 1; stack.push(i); } }
    const goals = new Set<number>();
    for (let x = 54; x <= 57; x++) goals.add(53 * 64 + x);
    let reached = false;
    while (stack.length > 0 && !reached) {
      const cur = stack.pop()!;
      if (goals.has(cur)) { reached = true; break; }
      const cx = cur % 64, cy = (cur / 64) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= 64 || ny >= 64) continue;
        const ni = ny * 64 + nx;
        if (!seen[ni] && w.canStand(cur, ni)) { seen[ni] = 1; stack.push(ni); }
      }
    }
    if (!reached) terrainOk = false;
  }
  const ais: (AIController | null)[] = [new AIController(0), new AIController(1)];
  const maxTicks = 60 * 60 * 5;
  let bad = '';
  let capViolations = 0;

  for (let s = 0; s < maxTicks; s++) {
    simTick(w, SIM_DT, ais);
    if (s % 600 === 0) {
      for (const e of w.entities.values()) {
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) {
          bad = `tick${s}: 实体${e.id}(${e.defId}) 坐标/HP 出现NaN`;
          break;
        }
      }
      for (const p of w.players) {
        for (const res of ['wood', 'food', 'ore'] as const) {
          if (!Number.isFinite(p.res[res])) bad = `tick${s}: ${res} NaN`;
          if (p.res[res] > p.storageCap + 1) capViolations++;
        }
        if (bad) break;
      }
      if (bad || w.gameOver) break;
    }
    if (w.gameOver) break;
  }

  const aiBldgDone = w.log.count('build', 1);
  const aiTrained = w.log.count('military', 1, m => m.includes('训练完成'));
  const waves = w.log.count('military', undefined, m => m.includes('波进攻发起'));
  const incomeSeen = w.players.some(p => p.income.wood > 0 || p.income.food > 0 || p.income.ore > 0);

  // ---- Phase2：人工采集专项 ----
  console.log('[selftest] Phase2：人工采集链路（砍树→回仓入库）…');
  const w2 = new World();
  const builder = [...w2.entities.values()].find(e => e.kind === 'unit' && e.defId === 'builder' && e.owner === 0)!;
  let treeTile = -1;
  for (let i = 0; i < w2.terrain.length && treeTile < 0; i++) {
    if (w2.terrain[i] === T_TREE) treeTile = i;
  }
  let gatherOk = false, gatherMsg = '未找到树';
  if (treeTile >= 0) {
    w2.issueGather([builder.id], treeTile, 'wood');
    const woodBefore = w2.players[0].res.wood;
    for (let s = 0; s < 60 * 120 && !gatherOk; s++) {
      simTick(w2, SIM_DT, [null, null]);
      if (s % 60 === 0) {
        const deposits = w2.log.count('econ', 0, m => m.includes('入库'));
        if (deposits >= 2 && w2.players[0].res.wood > woodBefore + 10) gatherOk = true;
        if (!Number.isFinite(builder.x)) { gatherMsg = '采集时NaN'; break; }
      }
    }
    gatherMsg = gatherOk ? '' : `入库日志不足（${w2.log.count('econ', 0, m => m.includes('入库'))}条）`;
  }

  // ---- 汇总 ----
  const checks: [string, boolean][] = [
    ['地形健全（高度0~3 + 基地连通）', terrainOk],
    ['无NaN污染', bad === ''],
    ['存储上限从未被突破', capViolations === 0],
    ['AI建成3+建筑（经济链成立）', aiBldgDone >= 3],
    ['AI训练3+单位（军事循环成立）', aiTrained >= 3],
    ['AI发起过进攻波次', waves >= 1],
    ['经济有正收入', incomeSeen],
    ['人工采集：砍树→入库链路成立', gatherOk],
    ['胜负判定触发（或打满5分钟）', w.gameOver !== 0 || w.time >= 299],
  ];

  const realSec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`[selftest] Phase1 模拟${Math.floor(w.time / 60)}分钟（ gameOver=${w.gameOver}），实际耗时${realSec}s，实体${w.entities.size}`);
  console.log(`[selftest] 日志统计:`, w.log.summary());
  console.log('[selftest] 日志尾部:');
  for (const line of w.log.tail(12)) console.log('  ' + line);
  let allPass = true;
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
    if (!ok) allPass = false;
  }
  if (bad) console.error(`[selftest] ${bad}`);
  if (gatherMsg) console.error(`[selftest] 采集: ${gatherMsg}`);
  console.log(`[selftest] ${allPass ? '全部通过 ✔ 赛博功德+1' : '存在失败项 ✘'}`);

  document.title = allPass ? 'SELFTEST PASS' : 'SELFTEST FAIL';
  const overlay = document.getElementById('overlay')!;
  overlay.style.display = 'flex';
  (document.getElementById('overlay-title') as HTMLElement).textContent = allPass ? '自测通过' : '自测失败';
  (document.getElementById('overlay-title') as HTMLElement).className = allPass ? 'win' : 'lose';
  (document.getElementById('overlay-sub') as HTMLElement).textContent =
    `AI互殴${Math.floor(w.time / 60)}分钟 · 实体${w.entities.size} · 日志${Object.values(w.log.summary()).reduce((a, b) => a + b, 0)}条 · 实际耗时${realSec}s（详见控制台F12）`;
}
