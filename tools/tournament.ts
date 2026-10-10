/**
 * 四AI高强度对战模拟器（Node无头版）
 * 用法：npx esbuild tools/tournament.ts --bundle --format=esm --platform=node --outfile=tools/tournament.mjs && node tools/tournament.mjs
 * 两座擂台 × 2位AI将军，日志全程开启，60分钟游戏时间上限或分出胜负。
 */
import { World } from '../src/sim/world';
import { AIController } from '../src/sim/ai';
import { simTick } from '../src/sim/tick';
import { resolveAIConfig } from '../src/sim/ai-config';

const SIM_DT = 1 / 60;
const MAX_MIN = 60;

interface Arena {
  name: string;
  w: World;
  aiA: AIController;
  aiB: AIController;
  nameA: string;
  nameB: string;
  done: boolean;
  winner: string;
  lastReportMin: number;
}

const arenas: Arena[] = [
  {
    name: '第一擂台·噩梦内战（莽夫 vs 乌龟）',
    w: new World(),
    aiA: new AIController(0, resolveAIConfig({ difficulty: 'nightmare', personality: 'rusher' })),
    aiB: new AIController(1, resolveAIConfig({ difficulty: 'nightmare', personality: 'turtler' })),
    nameA: '莽夫·噩梦', nameB: '乌龟·噩梦',
    done: false, winner: '', lastReportMin: -5,
  },
  {
    name: '第二擂台·困难对决（种田 vs 均衡）',
    w: new World(),
    aiA: new AIController(0, resolveAIConfig({ difficulty: 'hard', personality: 'eco' })),
    aiB: new AIController(1, resolveAIConfig({ difficulty: 'hard', personality: 'balanced' })),
    nameA: '种田·困难', nameB: '均衡·困难',
    done: false, winner: '', lastReportMin: -5,
  },
];

for (const a of arenas) {
  a.w.addLog('system', `红方指挥官：${a.nameA}——"${a.aiA.cfg.line}"`, 0);
  a.w.addLog('system', `蓝方指挥官：${a.nameB}——"${a.aiB.cfg.line}"`, 1);
}

function stats(a: Arena) {
  let armyA = 0, armyB = 0, wavesA = 0, wavesB = 0, lostA = 0, lostB = 0, builtA = 0, builtB = 0, retreats = 0;
  for (const e of a.w.entities.values()) {
    if (e.kind === 'unit') { if (e.owner === 0) armyA++; else armyB++; }
  }
  for (const e of a.w.log.entries) {
    if (e.cat !== 'military') continue;
    if (e.msg.includes('波进攻发起')) { if (e.owner === 0) wavesA++; else wavesB++; }
    else if (e.msg.includes('被摧毁')) { if (e.owner === 0) lostA++; else lostB++; }
    else if (e.msg.includes('撤离前线')) retreats++;
  }
  for (const e of a.w.log.entries) {
    if (e.cat === 'build' && e.msg.includes('建成')) { if (e.owner === 0) builtA++; else builtB++; }
  }
  const hqA = a.w.findHq(0), hqB = a.w.findHq(1);
  return { armyA, armyB, wavesA, wavesB, lostA, lostB, builtA, builtB, retreats,
    hqA: hqA ? Math.round(hqA.hp) : 0, hqB: hqB ? Math.round(hqB.hp) : 0 };
}

const t0 = Date.now();
console.log('=== 四AI高强度对战模拟器 ===');
for (const a of arenas) console.log(`[${a.name}] 红方:${a.nameA} vs 蓝方:${a.nameB}`);

for (const a of arenas) {
  console.log(`\n--- ${a.name} 开战 ---`);
  const ticks = MAX_MIN * 60 * 60;
  for (let s = 0; s < ticks && !a.done; s++) {
    simTick(a.w, SIM_DT, [a.aiA, a.aiB]);
    const min = Math.floor(a.w.time / 60);
    if (min >= a.lastReportMin + 5) {
      a.lastReportMin = min;
      const st = stats(a);
      console.log(`  [${min}min] 红军${st.armyA} 蓝军${st.armyB} | 战损${st.lostA}/${st.lostB} | 波次${st.wavesA}+${st.wavesB} | 建筑${st.builtA}+${st.builtB} | 红基地${st.hqA} 蓝基地${st.hqB}`);
    }
    if (a.w.gameOver !== 0) {
      a.done = true;
      // gameOver=1：owner1基地被拆 → 红方胜；=2：owner0基地被拆 → 蓝方胜
      a.winner = a.w.gameOver === 1 ? '红方(' + a.nameA + ')' : '蓝方(' + a.nameB + ')';
      const st = stats(a);
      console.log(`  *** 终局 @ ${Math.floor(a.w.time / 60)}min：${a.winner} 获胜 ***`);
      console.log(`  战报：红军${st.armyA} 蓝军${st.armyB} | 战损${st.lostA}/${st.lostB} | 波次${st.wavesA}+${st.wavesB} | 建筑${st.builtA}+${st.builtB} | 撤防${st.retreats}`);
    }
  }
  if (!a.done) { a.done = true; a.winner = '平局(60分钟)'; }
  const st = stats(a);
  console.log(`  [终局] ${a.winner} | 红军${st.armyA} 蓝军${st.armyB} | 战损${st.lostA}/${st.lostB} | 建筑${st.builtA}+${st.builtB}`);
  console.log(`  日志摘要:`, a.w.log.summary());
  console.log(`  最后战况:`);
  for (const line of a.w.log.tail(10)) console.log('    ' + line);
}

console.log(`\n=== 模拟结束，实际耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);
for (const a of arenas) console.log(`[${a.name}] ${a.winner} @ ${Math.floor(a.w.time / 60)}分钟`);
