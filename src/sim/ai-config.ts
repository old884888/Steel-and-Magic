/**
 * AI配置中心：难度四档预设 + 性格人设包 + 自定义合并。
 * 设计心法（移植自铁锈战争ini的aiPriority）：AI只认通用规则，"想造什么/怎么打"全部长在数据里。
 */

import type { TechId } from '../data/policies';

export type DifficultyId = 'easy' | 'standard' | 'hard' | 'nightmare' | 'custom';
export type PersonalityId = 'balanced' | 'rusher' | 'turtler' | 'eco';
export type TacticId = 'focusFire' | 'retreat' | 'spareArtillery' | 'highGround' | 'weiwei' | 'denyMining' | 'counterComp';

export const TACTIC_NAMES: Record<TacticId, string> = {
  focusFire: '集火',
  retreat: '撤退止损',
  spareArtillery: '保炮车',
  highGround: '抢高地',
  weiwei: '围魏救赵',
  denyMining: '断矿流',
  counterComp: '克制配兵',
};

export interface AIConfig {
  difficultyId: DifficultyId;
  personalityId: PersonalityId;
  economyMul: number;         // 经济倍率（高难度唯一的"作弊"，明示在UI）
  thinkSec: number;           // 思考频率
  waveStart: number;          // 首波规模
  waveGrow: number;           // 每波增量
  waveInterval: number;       // 波间隔（秒）
  firstDelay: number;         // 开局发育期（秒）
  retreatLockSec: number;     // 撤退决定锁定期（防反复横跳）
  waveCap: number;            // 波次规模上限（部队到顶+满仓时倾巢而出，防后期呆滞）
  tactics: TacticId[];        // 启用的战术
  weights: Record<string, number>;       // 兵种/建筑 生产权重（性格）
  targetMul: Record<string, number>;     // 建筑目标数量倍率（性格）
  waveSizeMul: number;        // 波次规模倍率（性格）
  attackCdMul: number;        // 波间隔倍率（性格）
  line: string;               // 开局播报台词
}

interface DifficultyPreset {
  name: string;
  economyMul: number;
  thinkSec: number;
  waveStart: number;
  waveGrow: number;
  waveInterval: number;
  firstDelay: number;
  retreatLockSec: number;
  waveCap: number;
  tactics: TacticId[];
}

export const DIFFICULTY_PRESETS: Record<Exclude<DifficultyId, 'custom'>, DifficultyPreset> = {
  easy: {
    name: '轻松', economyMul: 0.75, thinkSec: 1.2, waveStart: 8, waveGrow: 4,
    waveInterval: 50, firstDelay: 30, retreatLockSec: 12, waveCap: 16, tactics: ['focusFire'],
  },
  standard: {
    name: '标准', economyMul: 1.0, thinkSec: 1.0, waveStart: 6, waveGrow: 3,
    waveInterval: 40, firstDelay: 20, retreatLockSec: 10, waveCap: 14, tactics: ['focusFire', 'retreat', 'spareArtillery'],
  },
  hard: {
    name: '困难', economyMul: 1.15, thinkSec: 0.7, waveStart: 5, waveGrow: 2,
    waveInterval: 30, firstDelay: 15, retreatLockSec: 10, waveCap: 12,
    tactics: ['focusFire', 'retreat', 'spareArtillery', 'highGround', 'weiwei'],
  },
  nightmare: {
    name: '噩梦', economyMul: 1.35, thinkSec: 0.5, waveStart: 4, waveGrow: 2,
    waveInterval: 22, firstDelay: 12, retreatLockSec: 8, waveCap: 10,
    tactics: ['focusFire', 'retreat', 'spareArtillery', 'highGround', 'weiwei', 'denyMining', 'counterComp'],
  },
};

interface PersonalityPack {
  name: string;
  line: string;
  weights: Record<string, number>;
  targetMul: Record<string, number>;
  waveSizeMul: number;
  attackCdMul: number;
}

export const PERSONALITIES: Record<PersonalityId, PersonalityPack> = {
  balanced: {
    name: '均衡', line: '稳扎稳打，滴水不漏',
    weights: {}, targetMul: {}, waveSizeMul: 1.0, attackCdMul: 1.0,
  },
  rusher: {
    name: '莽夫', line: '让他们见识钢铁的怒火！',
    weights: { infantry: 2.0, tank: 0.8, artillery: 0.4, farm: 0.7, turret: 0.3, factory: 0.7, storehouse: 0.6, barracks: 1.6, lab: 0.5 },
    targetMul: { barracks: 1.5, turret: 0.5, farm: 0.8 },
    waveSizeMul: 0.7, attackCdMul: 0.55,
  },
  turtler: {
    name: '乌龟', line: '来吧，撞碎在城墙上',
    weights: { turret: 2.5, artillery: 1.8, farm: 1.3, infantry: 0.6, lumber: 0.9, barracks: 1.2, lab: 1.3 },
    targetMul: { turret: 3.0, factory: 0.8 },
    waveSizeMul: 1.6, attackCdMul: 1.5,
  },
  eco: {
    name: '种田', line: '耐心是最大的武器',
    weights: { lumber: 1.6, mine: 1.6, factory: 1.4, tank: 1.3, farm: 1.2, infantry: 0.5, turret: 0.7, barracks: 0.6, lab: 1.5 },
    targetMul: { lumber: 1.5, mine: 1.4, farm: 1.2 },
    waveSizeMul: 1.4, attackCdMul: 1.8,
  },
};

/** 建筑目标数量基准（×性格targetMul = 实际上限） */
export const BASE_BUILD_TARGETS: Record<string, number> = {
  builder: 2, farm: 7, lumber: 2, mine: 3, storehouse: 4, barracks: 2, factory: 2, turret: 2, lab: 1, hq: 1,
};

/** 性格科研队列：按顺序研究第一项未完成的 */
export const RESEARCH_QUEUES: Record<PersonalityId, TechId[]> = {
  balanced: ['sawBlades', 'shells', 'deepStorage'],
  rusher: ['shells', 'fireControl', 'sawBlades'],
  turtler: ['assembly', 'composite', 'fireControl'],
  eco: ['sawBlades', 'deepStorage', 'assembly'],
};

export interface AISettings {
  difficulty: DifficultyId;
  personality: PersonalityId;
  custom?: {
    economyMul: number;
    thinkSec: number;
    waveStart: number;
    waveInterval: number;
    tactics: TacticId[];
  };
}

const LS_KEY = 'sm_ai_settings';

export function saveAISettings(s: AISettings): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* 隐私模式等场景静默 */ }
}

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as AISettings;
  } catch { /* ignore */ }
  return { difficulty: 'standard', personality: 'balanced' };
}

/** 依据设置合并出最终AI配置（自定义=预设底座+面板覆盖） */
export function resolveAIConfig(settings: AISettings = loadAISettings()): AIConfig {
  const dId: Exclude<DifficultyId, 'custom'> =
    settings.difficulty in DIFFICULTY_PRESETS
      ? (settings.difficulty as Exclude<DifficultyId, 'custom'>)
      : 'standard';
  const d = DIFFICULTY_PRESETS[dId];
  const pId = (PERSONALITIES[settings.personality] ? settings.personality : 'balanced') as PersonalityId;
  const p = PERSONALITIES[pId];
  const c = settings.difficulty === 'custom' ? settings.custom : undefined;

  return {
    difficultyId: settings.difficulty,
    personalityId: pId,
    economyMul: c?.economyMul ?? d.economyMul,
    thinkSec: c?.thinkSec ?? d.thinkSec,
    waveStart: c?.waveStart ?? d.waveStart,
    waveGrow: d.waveGrow,
    waveInterval: c?.waveInterval ?? d.waveInterval,
    firstDelay: d.firstDelay,
    retreatLockSec: d.retreatLockSec,
    waveCap: d.waveCap,
    tactics: c?.tactics ?? d.tactics,
    weights: p.weights,
    targetMul: p.targetMul,
    waveSizeMul: p.waveSizeMul,
    attackCdMul: p.attackCdMul,
    line: p.line,
  };
}

/** 标准配置（selftest等需要确定性的场合用，不读localStorage） */
export function standardAIConfig(): AIConfig {
  return resolveAIConfig({ difficulty: 'standard', personality: 'balanced' });
}

/** 敌方玩家默认配置入口 */
export function resolveEnemyAIConfig(): AIConfig {
  return resolveAIConfig(loadAISettings());
}
