import type { ResAmount } from '../types';

/**
 * 运营深度数据表：法令（全局四选一）+ 科技（研究所单线研究）。
 * 设计约束：只加决策点不加操作量——所有效果都是全局乘数，AI按性格直接吃。
 */

// ================= 法令 =================

export type EdictId = 'military' | 'economy' | 'engineering' | 'logistics';

export const EDICTS: Record<EdictId, { name: string; desc: string }> = {
  military: { name: '军事动员', desc: '全军伤害+10%' },
  economy: { name: '经济统制', desc: '资源产出+10%' },
  engineering: { name: '工程提速', desc: '建造/修理+25%' },
  logistics: { name: '后勤扩容', desc: '存储+300 人口+10' },
};

export const EDICT_SWITCH_CD = 45; // 切换冷却（秒），防洗切

/** 法令乘数表（与科技乘数在 world.mult 中叠乘） */
export const EDICT_MULT: Record<EdictId, Partial<Record<'gather' | 'damage' | 'range' | 'build', number>>> = {
  military: { damage: 1.10 },
  economy: { gather: 1.10 },
  engineering: { build: 1.25 },
  logistics: {},
};

export const LOGISTICS_STORAGE = 300;
export const LOGISTICS_POP = 10;

// ================= 科技 =================

export type TechId = 'sawBlades' | 'deepStorage' | 'assembly' | 'shells' | 'composite' | 'fireControl';

export interface TechDef {
  id: TechId;
  name: string;
  cat: 'industry' | 'military';
  desc: string;
  cost: ResAmount;
  time: number;       // 研究时长（秒）
}

export const TECHS: Record<TechId, TechDef> = {
  sawBlades: { id: 'sawBlades', name: '精密切削', cat: 'industry', desc: '资源产出+15%', cost: { wood: 100, food: 60, ore: 60 }, time: 45 },
  deepStorage: { id: 'deepStorage', name: '深层仓储', cat: 'industry', desc: '存储上限+400', cost: { wood: 80, ore: 60 }, time: 35 },
  assembly: { id: 'assembly', name: '流水作业', cat: 'industry', desc: '建造/修理+20%', cost: { wood: 120, ore: 60 }, time: 40 },
  shells: { id: 'shells', name: '燃压装药', cat: 'military', desc: '全军伤害+10%', cost: { ore: 120, food: 40 }, time: 50 },
  composite: { id: 'composite', name: '复合装甲', cat: 'military', desc: '全军受伤-9%', cost: { ore: 100, wood: 60 }, time: 50 },
  fireControl: { id: 'fireControl', name: '火控校准', cat: 'military', desc: '全军射程+8%', cost: { ore: 90, food: 80 }, time: 45 },
};

/** 科技乘数表（techs包含对应id时生效） */
export const TECH_MULT: Partial<Record<TechId, Partial<Record<'gather' | 'damage' | 'range' | 'build', number>>>> = {
  sawBlades: { gather: 1.15 },
  assembly: { build: 1.20 },
  shells: { damage: 1.10 },
  fireControl: { range: 1.08 },
};

export const COMPOSITE_MITIGATION = 0.91; // 复合装甲：受伤乘数
export const DEEP_STORAGE_BONUS = 400;
