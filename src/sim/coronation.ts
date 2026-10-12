import { CORONATION_TIME, OWNER_PLAYER } from '../config';
import type { World } from './world';

/** 加冕子系统（v0.11 自 world.ts 迁出）：奇观落成 → 90秒倒计时 → 胜负判定 */

export function startCoronation(w: World, owner: 0 | 1, monumentId: number): void {
  if (w.coronation || w.gameOver !== 0) return;
  w.coronation = { owner, monumentId, endsAt: w.time + CORONATION_TIME };
  w.addLog('system', `纪元纪念碑落成！${CORONATION_TIME}秒后加冕——守住它！`, owner);
}

export function checkCoronation(w: World): void {
  const c = w.coronation;
  if (!c || w.gameOver !== 0) return;
  if (w.time >= c.endsAt) {
    w.gameOver = c.owner === OWNER_PLAYER ? 1 : 2;
    w.lastVictory = 'coronation';
    w.addLog('system', c.owner === OWNER_PLAYER ? '加冕完成——文明因你而永铸！玩家获胜' : '敌方奇观加冕完成，玩家战败', c.owner);
  }
}
