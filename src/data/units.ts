import type { UnitDef } from '../types';

/** 兵种定义表 —— 钢铁联邦（数值平衡改这里） */
export const UNIT_DEFS: Record<string, UnitDef> = {
  builder: {
    id: 'builder', name: '工程车', aiPriority: 60, aiRole: 'support', armor: 'light', desc: '多功能工程平台：建造/修理建筑，右键树木矿脉可采伐（载货10自动回仓）',
    hp: 85, armorPool: 15, speed: 70, radius: 10, vision: 6,
    cost: { wood: 60, food: 30 }, buildTime: 8, producedBy: 'hq',
    canBuild: ['farm', 'lumber', 'mine', 'storehouse', 'lab', 'barracks', 'factory', 'turret', 'aaTurret', 'artTurret', 'shieldGen', 'wall', 'shipyard', 'tradePost', 'monument'],
    gather: { rate: 2.5, capacity: 10 },   // 人工采集：2.5/秒，载货10（对比自动机低效但灵活）
  },
  infantry: {
    id: 'infantry', name: '动员步兵', aiPriority: 55, aiRole: 'combat', armor: 'light', desc: '廉价机枪手：射速快、射程短，克制轻甲海，怕碾压与溅射',
    hp: 60, armorPool: 25, speed: 55, radius: 7, vision: 6,
    cost: { food: 50, ore: 10 }, buildTime: 5, producedBy: 'barracks',
    weapon: { damage: 6, range: 90, cooldown: 0.7, cat: 'light', visual: 'bullet', targetsAir: true }, // 步枪可对空
  },
  farmer: {
    id: 'farmer', name: '农夫', aiPriority: 52, aiRole: 'economy', armor: 'light', pop: 0.5,
    desc: '田间劳作者：收割成熟麦田扛回仓库入库，再回头补种。手无寸铁，记得派兵保护',
    hp: 50, speed: 70, radius: 7, vision: 5,
    cost: { food: 20, wood: 10 }, buildTime: 4, producedBy: 'hq',
  },
  mcv: {
    id: 'mcv', name: '基地车', aiPriority: 90, aiRole: 'support', armor: 'heavy', pop: 2,
    desc: '移动指挥部：选中后点"展开基地"变身指挥基地（可先侦察再落脚）。血厚车沉，丢了它且没有基地=战败',
    hp: 400, armorPool: 500, speed: 45, radius: 14, vision: 7,
    cost: { wood: 200, ore: 200 }, buildTime: 30, producedBy: 'hq',
  },
  tank: {
    id: 'tank', name: '主战坦克', aiPriority: 72, aiRole: 'combat', armor: 'heavy', desc: '装甲主力：血厚炮猛，主炮之外还有左右舷侧机枪（射步兵弹，独立开火），造价偏高',
    hp: 140, armorPool: 300, speed: 60, radius: 11, vision: 7,
    cost: { ore: 70, food: 15 }, buildTime: 10, producedBy: 'factory',
    weapon: { damage: 22, range: 130, cooldown: 1.4, cat: 'heavy', pierce: true, visual: 'shell', speed: 380 },
    mg: { damage: 6, range: 75, cooldown: 0.9, cat: 'light', visual: 'bullet', spread: 4 },
  },
  artillery: {
    id: 'artillery', name: '自行火炮', aiPriority: 66, aiRole: 'combat', armor: 'light', stopToFire: true, desc: '超远程榴弹炮：范围溅射拆家利器，停车架炮开火（唯一不能边走边打），皮脆且被贴脸无法还击，需要护卫',
    hp: 90, armorPool: 80, speed: 40, radius: 10, vision: 9,
    cost: { ore: 90, wood: 40 }, buildTime: 14, producedBy: 'factory',
    weapon: { damage: 40, range: 215, minRange: 60, cooldown: 3.2, cat: 'heavy', visual: 'cannon', speed: 260, impactFire: true, splash: 28 },
  },

  barbarian: {
    id: 'barbarian', name: '蛮族掠袭者', desc: '中立蛮族的劫掠兵：见村就抢见人就砍，剿灭有少量缴获',
    hp: 75, armorPool: 15, speed: 65, radius: 8, vision: 6,
    cost: {}, buildTime: 0, producedBy: '', aiPriority: 0, aiRole: 'combat',
    weapon: { damage: 8, range: 90, cooldown: 0.8, cat: 'light', visual: 'bullet' },
  },
  helicopter: {
    id: 'helicopter', name: '武装直升机', desc: '空中速射平台：无视地形全图机动，克制地面装甲与经济，但怕步枪和哨戒炮',
    hp: 120, armorPool: 60, speed: 100, radius: 10, vision: 8,
    cost: { ore: 120, food: 60 }, buildTime: 12, producedBy: 'factory', aiPriority: 68, aiRole: 'combat',
    moveClass: 'air', armor: 'light',
    weapon: { damage: 7, range: 120, cooldown: 0.3, cat: 'light', visual: 'bullet', targetsAir: true, spread: 5 },
  },
  flamethrower: {
    id: 'flamethrower', name: '喷火兵', desc: '近距离纵火专家：火焰点燃目标持续灼烧（每秒灼烧），克步兵与建筑，被远程放风筝是死法',
    hp: 70, armorPool: 20, speed: 60, radius: 8, vision: 5,
    cost: { food: 60, ore: 20 }, buildTime: 6, producedBy: 'barracks', aiPriority: 58, aiRole: 'combat', armor: 'light',
    weapon: { damage: 12, range: 70, cooldown: 0.5, cat: 'light', visual: 'flame', speed: 300, status: { kind: 'burn', dur: 4, potency: 6 }, spread: 8 },
  },
  mech: {
    id: 'mech', name: '步战机甲', desc: '四足程序化机甲：生态位顶峰——厚甲重炮，跨越高地如履平地（视觉），造价昂贵',
    hp: 240, armorPool: 500, speed: 45, radius: 18, vision: 8,
    cost: { ore: 220, food: 80 }, buildTime: 22, producedBy: 'factory', aiPriority: 75, aiRole: 'combat', armor: 'heavy',
    weapon: { damage: 42, range: 150, cooldown: 2.2, cat: 'heavy', pierce: true, visual: 'cannon', speed: 260, splash: 26 },
  },
  bomber: {
    id: 'bomber', name: '轰炸机', desc: '飞越目标头顶投掷航弹（范围溅射），无对空能力，防空火力是它的天敌',
    hp: 100, armorPool: 80, speed: 110, radius: 11, vision: 8,
    cost: { ore: 150, food: 100 }, buildTime: 14, producedBy: 'factory', aiPriority: 64, aiRole: 'combat', armor: 'light',
    moveClass: 'air', bomber: true,
    weapon: { damage: 40, range: 40, cooldown: 4, cat: 'heavy', visual: 'cannon', speed: 260, splash: 34 },
  },
  missileShip: {
    id: 'missileShip', name: '导弹舰', desc: '远程水面导弹平台：射程220压制沿岸，皮薄怕近身',
    hp: 220, armorPool: 40, speed: 65, radius: 12, vision: 8,
    cost: { wood: 120, ore: 180 }, buildTime: 20, producedBy: 'shipyard', aiPriority: 62, aiRole: 'combat', armor: 'light',
    moveClass: 'naval',
    weapon: { damage: 35, range: 220, cooldown: 2.5, cat: 'heavy', visual: 'missile', speed: 240, splash: 40 },
  },
  battleship: {
    id: 'battleship', name: '战列舰', desc: '海上的移动要塞：重甲重炮（射程200），造价昂贵，舰队核心',
    hp: 600, armorPool: 500, speed: 50, radius: 16, vision: 9,
    cost: { wood: 250, ore: 300 }, buildTime: 30, producedBy: 'shipyard', aiPriority: 70, aiRole: 'combat', armor: 'heavy',
    moveClass: 'naval',
    weapon: { damage: 50, range: 200, cooldown: 3.0, cat: 'heavy', visual: 'shell', speed: 380 },
  },
  caravan: {
    id: 'caravan', name: '商队', aiPriority: 0, aiRole: 'economy', armor: 'light',
    desc: '移动钱包：自动往返蛮族营地贸易（通商=停战）。无武装，遇袭必死——护好它',
    hp: 70, armorPool: 10, speed: 40, radius: 9, vision: 5,
    cost: { food: 30 }, buildTime: 0, producedBy: 'tradePost',
  },
  deer: {
    id: 'deer', name: '鹿', desc: '温顺的野生动物：受惊会逃跑，猎杀可获得食物',
    hp: 40, speed: 85, radius: 7, vision: 5,
    cost: {}, buildTime: 0, producedBy: '', aiRole: 'economy',
    wild: 'passive', bounty: { food: 40 },
  },
  wolf: {
    id: 'wolf', name: '狼', desc: '领地意识极强的野兽：窝边三格内谁敢靠近就咬谁，猎杀有奖励',
    hp: 60, armorPool: 10, speed: 70, radius: 8, vision: 6,
    cost: {}, buildTime: 0, producedBy: '', aiRole: 'combat',
    wild: 'territorial',
    weapon: { damage: 10, range: 90, cooldown: 1.0, cat: 'light', visual: 'bullet' },
    bounty: { food: 25 },
  },
  gunboat: {
    id: 'gunboat', name: '炮艇', desc: '近海霸主：水面机动重炮平台，轰击沿岸目标，上岸的地面部队是它的盘中餐',
    hp: 170, armorPool: 30, speed: 75, radius: 12, vision: 7,
    cost: { wood: 100, ore: 100 }, buildTime: 15, producedBy: 'shipyard', aiPriority: 68, aiRole: 'combat',
    moveClass: 'naval', armor: 'heavy',
    weapon: { damage: 20, range: 140, cooldown: 1.2, cat: 'heavy', visual: 'shell', speed: 380, spread: 6 },
  },
};

export const BUILDABLE_UNITS = ['builder', 'infantry', 'tank', 'artillery'];
