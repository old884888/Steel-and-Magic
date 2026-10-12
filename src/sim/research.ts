import { TECHS, type TechId } from '../data/policies';
import { ERAS, type EraDef } from '../data/eras';
import type { ResAmount } from '../types';
import type { World } from './world';

/** 科研子系统（v0.11 自 world.ts 迁出）：立项/完成/金币加速，纪元与科技共用一条全局单线 */

export function hasLab(w: World, owner: number): boolean {
  for (const e of w.entities.values()) {
    if (e.kind === 'building' && (e.defId === 'lab' || e.defId === 'sageTower') && e.done && e.owner === owner) return true;
  }
  return false;
}

function eraDefOf(id: string): EraDef | undefined {
  return (ERAS as Record<string, EraDef | undefined>)[id];
}

export function startResearch(w: World, owner: 0 | 1, id: string): boolean {
  const p = w.players[owner];
  if (p.research || !hasLab(w, owner)) return false;
  const era = eraDefOf(id);
  let cost: ResAmount, time: number, name: string;
  if (era) {
    if (p.era >= era.level) return false;                                  // 纪元已达
    if (era.prereq && ERAS[era.prereq].level > p.era) return false;        // 前置纪元未达
    cost = era.cost; time = era.time; name = era.name;
  } else {
    const tech = TECHS[id as TechId];
    if (!tech || p.techs.includes(id as TechId)) return false;
    cost = tech.cost; time = tech.time; name = tech.name;
  }
  if (!w.canAfford(owner, cost)) return false;
  w.payCost(owner, cost);
  p.research = { id, remaining: time };
  w.addLog('system', `开始研究：${name}`, owner);
  return true;
}

export function completeResearch(w: World, owner: 0 | 1): void {
  const p = w.players[owner];
  if (!p.research) return;
  const id = p.research.id;
  p.research = null;
  const era = eraDefOf(id);
  if (era) {
    p.era = era.level;
    const shown = w.players[owner].faction === 'kingdom' && era.nameKingdom ? era.nameKingdom : era.name;
    w.addLog('system', `纪元晋升：${shown}！${era.desc}`, owner);
  } else {
    const t = id as TechId;
    if (!p.techs.includes(t)) p.techs.push(t);
    w.addLog('system', `研究完成：${TECHS[t].name}（${TECHS[t].desc}）`, owner);
  }
}

/** 金币加速：1金=2秒，每次研究限一次。成功返回true（失败=没研究/已加速/金币不足） */
export function boostResearch(w: World, owner: 0 | 1): boolean {
  const p = w.players[owner];
  if (!p.research || p.researchBoosted) return false;
  const cost = Math.max(1, Math.ceil(p.research.remaining / 2));
  if (p.gold < cost) return false;
  p.gold -= cost;
  p.research.remaining -= cost * 2;
  p.researchBoosted = true;
  return true;
}
