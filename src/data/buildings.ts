import type { BuildingDef } from '../types';

/** 建筑定义表 —— 数值平衡改这里 */
export const BUILDING_DEFS: Record<string, BuildingDef> = {
  hq: {
    id: 'hq', name: '指挥基地', aiRole: 'support', armor: 'heavy', desc: '大本营：生产工程车与农夫、保底产出、+10人口。自带防卫火炮（对空对地溅射）与舷侧机枪（对空对地），独立开火。被摧毁即战败',
    hp: 1200, size: 3, vision: 9,
    cost: {}, buildTime: 0, unique: true, popBonus: 10, isDepot: true,
    income: { wood: 0.2, food: 0.2, ore: 0.2 },
    produces: ['builder', 'farmer'],
    weapon: { damage: 35, range: 190, cooldown: 3.2, projectile: 'explosive', splash: 26, targetsAir: true },
    mg: { damage: 6, range: 90, cooldown: 0.8, projectile: 'bullet', targetsAir: true },
  },
  farm: {
    id: 'farm', name: '补给农场', aiPriority: 50, aiRole: 'economy', desc: '稳定食物来源（0.45/秒），+10人口上限，永不枯竭',
    hp: 260, size: 2, vision: 4,
    cost: { wood: 60 }, buildTime: 10, income: { food: 0.45 }, popBonus: 10,
  },
  lumber: {
    id: 'lumber', name: '伐木站', aiPriority: 55, aiRole: 'economy', desc: '自动伐木1.0/秒（内部缓冲仓40），需周围4格内≥5棵树，树尽则停',
    hp: 260, size: 2, vision: 4,
    cost: { wood: 40, food: 30 }, buildTime: 8, income: { wood: 1.0 }, bufferCap: 40, needTrees: true,
  },
  mine: {
    id: 'mine', name: '采矿场', aiPriority: 60, aiRole: 'economy', desc: '自动采矿1.0/秒（内部缓冲仓50），必须建造在矿脉上，矿尽则停',
    hp: 300, size: 2, vision: 4,
    cost: { wood: 70 }, buildTime: 9, income: { ore: 1.0 }, bufferCap: 50, needOre: true,
  },
  storehouse: {
    id: 'storehouse', name: '仓库', aiPriority: 40, aiRole: 'economy', desc: '三种资源存储上限+500，兼作工程车卸货点。建在林区矿区旁省脚程',
    hp: 300, size: 2, vision: 4,
    cost: { wood: 50 }, buildTime: 8, capBonus: 500, isDepot: true,
  },
  lab: {
    id: 'lab', name: '研究所', aiPriority: 58, aiRole: 'support', desc: '解锁科技研究：选中后立项，全局同一时间仅一项；研究所损毁则进度冻结',
    hp: 450, size: 2, vision: 5,
    cost: { wood: 120, ore: 80 }, buildTime: 20,
  },
  barracks: {
    id: 'barracks', name: '步兵营', aiPriority: 65, aiRole: 'combat', desc: '训练动员步兵，通向装甲力量的第一步',
    hp: 500, size: 3, vision: 5,
    cost: { wood: 120 }, buildTime: 14, produces: ['infantry'],
  },
  factory: {
    id: 'factory', name: '战车工厂', aiPriority: 72, aiRole: 'combat', desc: '生产主战坦克与自行火炮，装甲力量的摇篮',
    hp: 700, size: 3, vision: 5,
    cost: { wood: 140, ore: 60 }, buildTime: 18, produces: ['tank', 'artillery', 'helicopter', 'bomber', 'mech'],
  },
  turret: {
    id: 'turret', name: '哨戒炮', aiPriority: 45, aiRole: 'defense', armor: 'heavy', desc: '自动防御塔：射程140可对空，蹲家防骚扰的不二之选',
    hp: 400, size: 1, vision: 7,
    cost: { wood: 20, ore: 60 }, buildTime: 8,
    weapon: { damage: 16, range: 140, cooldown: 0.9, projectile: 'bullet', targetsAir: true },
  },
  camp: {
    id: 'camp', name: '蛮族营地', desc: '蛮族的巢穴：定期派出掠袭者劫掠附近势力。剿灭可获得丰厚缴获',
    hp: 600, size: 2, vision: 6,
    cost: {}, buildTime: 0, aiRole: 'combat', bounty: { wood: 250, ore: 150 },
  },
  aaTurret: {
    id: 'aaTurret', name: '防空导弹塔', desc: '专职对空：导弹只打空中目标（范围溅射），射程160，天空的终结者',
    hp: 400, size: 1, vision: 8,
    cost: { wood: 60, ore: 120 }, buildTime: 10,
    weapon: { damage: 30, range: 160, cooldown: 1.5, projectile: 'missile', splash: 24, targetsAir: true, airOnly: true },
    aiPriority: 48, aiRole: 'defense', armor: 'heavy',
  },
  artTurret: {
    id: 'artTurret', name: '火炮塔', desc: '远程对地炮塔：射程200压迫推进，最小射程70（贴脸盲区），需要近防掩护',
    hp: 500, size: 2, vision: 8,
    cost: { wood: 80, ore: 120 }, buildTime: 14,
    weapon: { damage: 42, range: 200, minRange: 70, cooldown: 3.0, projectile: 'cannon', splash: 26 },
    aiPriority: 42, aiRole: 'defense', armor: 'heavy',
  },
  wall: {
    id: 'wall', name: '城墙', desc: '1×1高血量工事：阻挡地面部队推进（空军无视），可互相连接成防线',
    hp: 900, size: 1, vision: 2,
    cost: { wood: 20 }, buildTime: 6,
    aiRole: 'defense', armor: 'heavy',
  },
  shipyard: {
    id: 'shipyard', name: '船厂', desc: '海军的摇篮：必须建在水边（临水），生产炮艇控制水域',
    hp: 600, size: 3, vision: 5,
    cost: { wood: 150, ore: 50 }, buildTime: 20, produces: ['gunboat', 'missileShip', 'battleship'], needWater: true,
    aiPriority: 60, aiRole: 'combat', armor: 'heavy',
  },
  shieldGen: {
    id: 'shieldGen', name: '护盾发生器', desc: '力场护罩：为半径180内友军抵挡伤害（护盾池300，脱战5秒回充15/秒）',
    hp: 350, size: 2, vision: 5,
    cost: { wood: 100, ore: 150 }, buildTime: 15, shieldPool: 300, shieldRegen: 15,
    aiPriority: 40, aiRole: 'defense', armor: 'heavy',
  },
};
