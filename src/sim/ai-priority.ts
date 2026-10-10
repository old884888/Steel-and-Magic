import { BUILDING_DEFS } from '../data/buildings';
import { UNIT_DEFS } from '../data/units';

/**
 * 生产优先级纯函数（铁锈战争 aiPriority 心法的JSON移植）：
 * 得分 = 基础优先级 × 性格权重 × 缺口系数 → 排序。
 * 纯函数：不碰世界状态，selftest可单独喂参数断言输出。
 */

export interface ProdCandidate {
  defId: string;
  kind: 'unit' | 'building';
  /** 缺口系数：0=不缺（基本别造），>1=急需 */
  need: number;
  /** 可用性过滤（钱不够/人口满/数量到上限时调用方直接不放入清单） */
}

export interface RankedCandidate extends ProdCandidate {
  score: number;
}

/** 基础优先级表（兵种/建筑定义里也有aiPriority字段，此处兜底默认） */
const BASE_FALLBACK = 50;

export function basePriorityOf(defId: string): number {
  return UNIT_DEFS[defId]?.aiPriority ?? BUILDING_DEFS[defId]?.aiPriority ?? BASE_FALLBACK;
}

/**
 * 排序生产候选。
 * @param weights 性格权重表（缺省1.0）
 * @param needOf  缺口系数查询函数（ai.ts依据快照计算）
 */
export function rankProduction(
  candidates: ProdCandidate[],
  weights: Record<string, number>,
  needOf: (defId: string) => number,
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];
  for (const c of candidates) {
    const need = needOf(c.defId);
    if (need <= 0.01) continue; // 完全不缺：直接出局
    const weight = weights[c.defId] ?? 1;
    const score = basePriorityOf(c.defId) * weight * need;
    ranked.push({ ...c, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
