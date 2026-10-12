import type { ResAmount } from '../types';

/**
 * 纪元表（v0.11）：三纪元走现成科研管线，永久生效。
 * 软锁原则：只解锁新内容（奇观资格/纪念碑），不硬锁任何现有建筑/兵种。
 */

export type EraId = 'industrial' | 'steel';

export interface EraDef {
  id: EraId;
  name: string;
  nameKingdom: string;      // 王国阵营的对应皮名称
  level: 1 | 2;             // 纪元层级（拓荒=0）
  cost: ResAmount & { gold: number };
  time: number;             // 研究时长（秒）
  desc: string;
  prereq?: EraId;
}

export const ERAS: Record<EraId, EraDef> = {
  industrial: {
    id: 'industrial', name: '工业纪元', nameKingdom: '高塔纪元', level: 1,
    desc: '资源产出+5%、建造/修理+10%；获得奇观建造资格',
    cost: { wood: 400, food: 300, gold: 100 }, time: 40,
  },
  steel: {
    id: 'steel', name: '钢铁纪元', nameKingdom: '大魔导纪元', level: 2,
    desc: '资源产出+5%、全军伤害+5%；解锁纪元纪念碑',
    cost: { wood: 800, food: 600, ore: 400, gold: 300 }, time: 60,
    prereq: 'industrial',
  },
};

/** 纪元乘数（world.mult 叠乘来源） */
export const ERA_MULT: Record<number, Partial<Record<'gather' | 'damage' | 'build', number>>> = {
  1: { gather: 1.05, build: 1.10 },
  2: { gather: 1.05, damage: 1.05 },
};
