/** 共享类型定义 */

export type Faction = 'steel' | 'kingdom';   // 阵营：钢铁联邦 / 晨曦王国

export type Res = 'wood' | 'food' | 'ore';
export type ResAmount = Partial<Record<Res, number>> & { gold?: number };

export interface Vec { x: number; y: number }

export type OrderKind = 'idle' | 'move' | 'attack' | 'build' | 'gather' | 'attackMove' | 'hold';

export interface Order {
  kind: OrderKind;
  target?: Vec;        // move 目标点（世界坐标）
  targetId?: number;   // attack/build 目标实体
  resTile?: number;    // gather 目标资源格索引
  res?: 'wood' | 'ore';
}

/** 武器定义（单位与防御塔共用） */
/** 状态标签注册表（五坑位：burn已实装，其余预留解析不报错） */
export type StatusKind = 'burn' | 'shock' | 'poison' | 'malfunction' | 'freeze';

export interface StatusEffect {
  kind: StatusKind;
  dur: number;      // 持续秒数
  potency: number;  // 强度（burn=每秒伤害）
}

export interface WeaponDef {
  damage: number;
  range: number;       // 世界像素
  minRange?: number;   // 最小射程（火炮类）
  cooldown: number;    // 秒
  cat: 'light' | 'heavy';             // 攻击类别（减伤表列）
  pierce?: boolean;                   // 破甲标签：仅重攻击可贴；血扣全额+甲扣伤害×2；与溅射互斥
  visual: 'bullet' | 'shell' | 'cannon' | 'missile' | 'flame';  // 弹道外观（纯视觉）
  speed?: number;                     // 弹速覆盖（默认按visual查VISUAL_SPEED）
  impactFire?: boolean;               // 落地生成燃烧区
  status?: StatusEffect;              // 状态标签（burn已实装）
  splash?: number;     // 溅射半径
  targetsAir?: boolean; // 能否攻击空中单位（默认否）
  airOnly?: boolean;   // 只打空中（防空专职）
  spread?: number;     // 落点弹散布半径（像素）
}

export type MoveClass = 'land' | 'air' | 'naval';

export interface UnitDef {
  id: string;
  name: string;
  desc: string;                // 一句话简介（选中面板显示）
  hp: number;
  aiPriority?: number;         // AI生产优先级（RW心法：AI读表不读死代码）
  aiRole?: 'economy' | 'combat' | 'defense' | 'support';
  speed: number;               // 世界像素/秒
  radius: number;
  vision: number;              // 格
  cost: ResAmount;
  buildTime: number;           // 秒
  producedBy: string;          // 建筑id
  weapon?: WeaponDef;
  canBuild?: string[];         // 可建造的建筑id列表（工程车）
  moveClass?: MoveClass;             // 移动层级（默认land；air无视地形/naval走水面）
  bomber?: boolean;                  // 轰炸机：飞越目标头顶投弹（不停火不悬停）
  armor?: 'light' | 'heavy';         // 装甲类别（减伤表行键；轻/重二元锁死）
  armorPool?: number;                // 装甲池（外层生命；0=无甲，-1=不朽；仅破甲可削）
  faction?: Faction;                 // 所属阵营（默认steel；王国单位走王国建筑/生产链）
  deploysInto?: string;              // 展开目标建筑defId（基地车类）
  wild?: 'passive' | 'territorial';  // 野生动物习性（passive不索敌，territorial守家）
  bounty?: ResAmount;                // 击杀缴获（猎食/剿灭奖励）
  mg?: WeaponDef;                    // 舷侧机枪：固定双联，独立索敌/冷却，与主炮互不干扰
  pop?: number;                      // 人口占用（默认1；农夫0.5）
  stopToFire?: boolean;              // 停车架炮：射程内停下开火，不走A（自行火炮专属）
  gather?: {                   // 采集能力（伐木/采矿）
    rate: number;              // 每秒采集量
    capacity: number;          // 载货上限
  };
}

export interface BuildingDef {
  armor?: 'light' | 'heavy';         // 建筑默认heavy
  id: string;
  name: string;
  desc: string;                // 一句话简介（选中面板显示）
  hp: number;
  aiPriority?: number;         // AI建造优先级
  aiRole?: 'economy' | 'combat' | 'defense' | 'support';
  size: number;                // 占地格数（正方形）
  vision: number;
  cost: ResAmount;
  buildTime: number;           // 施工时长（秒）
  income?: ResAmount;          // 自动产出（每秒，受仓库上限约束）
  bufferCap?: number;          // 自动机内部缓冲仓容量（满仓且库存到上限时停机）
  produces?: string[];         // 可生产单位
  weapon?: WeaponDef;
  mg?: WeaponDef;              // 舷侧机枪（HQ防卫等）：独立索敌/冷却，可与主武器同时开火
  popBonus?: number;
  capBonus?: number;           // 仓库：提升资源存储上限
  isDepot?: boolean;           // 可作为工人卸货点
  needTrees?: boolean;         // 伐木站：周围需有树
  needOre?: boolean;           // 采矿场：必须压矿
  unique?: boolean;            // HQ类
  bounty?: ResAmount;          // 摧毁缴获（蛮族营地等）
  armorPool?: number;          // 装甲池（外层生命；0=无甲，-1=不朽）
  faction?: Faction;           // 所属阵营（默认steel）
  isMain?: boolean;            // 主堡（被拆触发战败判定；指挥基地/生命古树）
  shieldPool?: number;         // 护盾发生器：护盾池上限
  shieldRegen?: number;        // 护盾回充速率（脱战5秒后）
  needWater?: boolean;         // 船厂：必须临水
  limitPerPlayer?: number;     // 每家建造上限（商贸站2/纪念碑1）
}

export type EntityKind = 'unit' | 'building';

export interface FireZone {
  x: number; y: number;
  radius: number;
  dps: number;
  owner: number;
  born: number;       // 生成时间
  dur: number;        // 持续秒数
  seed: number;
}

export interface Wreck {
  x: number; y: number;
  kind: 'corpse' | 'vehicle' | 'rubble' | 'beast';
  born: number;               // 生成时间（游戏时间秒）
  dur: number;                // 留存总时长（秒）
  size: number;               // 建筑格数（rubble用）
  seed: number;               // 外观种子
}

export interface Projectile {
  x: number; y: number;
  tx: number; ty: number;      // 落点（发射时锁定目标当前位置+散布）
  speed: number;
  damage: number;
  cat: 'light' | 'heavy';      // 攻击类别（减伤表列）
  pierce: boolean;             // 破甲：血扣全额+甲池扣伤害×2
  impactFire: boolean;         // 落地生成燃烧区
  ignite: boolean;             // 直击点燃（status burn）
  burnDur: number;             // 点燃持续（秒，ignite时有效）
  burnDps: number;             // 点燃每秒伤害（ignite时有效）
  splash: number;
  hitRadius: number;           // 命中判定半径（落点弹：落点附近有敌即伤害）
  targetsAir: boolean;         // 该弹能否伤害空中单位
  visual: 'bullet' | 'shell' | 'cannon' | 'missile' | 'flame';  // 弹道外观（纯视觉）
  owner: number;
  aimId: number;              // 原瞄准目标（落点弹允许命中瞄准的野物）
  travel: number;              // 已飞行距离（fx用）
}

export interface FxEvent {
  x: number; y: number;
  type: 'boom' | 'muzzle' | 'hit' | 'mark' | 'wake';
  t: number;                   // 已播时间
  dur: number;
  size: number;
  a?: number;                  // 朝向（枪口焰用）
  text?: string;               // 浮动标签文字（mark用）
  color?: string;              // 自定义颜色（mark边框/文字）
}
