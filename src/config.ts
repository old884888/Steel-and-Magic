/** 全局常量与调色板 */

export const TILE = 32;               // 一格的世界像素
export const MAP_W = 128;             // 地图宽（格）——v0.10.1 起边长翻倍
export const MAP_H = 128;             // 地图高（格）
export const SIM_DT = 1 / 60;         // 模拟步长 60Hz
export const MAX_STEPS_PER_FRAME = 4; // 卡顿追帧上限

export const PATH_BUDGET = 24;        // 每模拟帧A*求解上限
export const FOG_INTERVAL = 15;       // 迷雾重算间隔（模拟帧）
export const FOG_SCAN_INTERVAL = 12;  // 单位索敌扫描间隔

export const START_RES = { wood: 300, food: 200, ore: 150 } as const;
export const STORAGE_BASE = 500;          // 基础存储上限（HQ自带，须高于初始资源）
export const STORAGE_PER_STOREHOUSE = 500; // 每座仓库提升的上限

/** 居民与家园（v0.18 经济重构：人口-岗位-物流） */
export const POP_START = 5;            // 开局实际人口（帝国中心+5容量刚好住满）
export const POP_FLOOR = 5;            // 流失地板：初始人口不走光（战死不算流失）
export const HOUSE_CAP = 5;            // 每座民居/帝国中心的容量
export const POP_MAX = 200;            // 容量硬顶
export const MORALE_GROW_AT = 60;      // 民心≥60 且人口<容量 → 每30秒+1
export const MORALE_LOSS_AT = 30;      // 民心≤30 → 每60秒-1
export const GROW_EVERY = 30;          // 增长节拍（秒）
export const LOSS_EVERY = 60;          // 流失节拍（秒）
export const FOOD_PER_POP = 10;        // 食物充足线：库存≥人口×10 满分，线性衰减到0
export const TAX_FACTORS = [1, 2, 3];  // 三档税率：金/人/分钟（低/中/高）
export const TAX_COMFORT = [1.0, 0.6, 0.2]; // 税率舒适度分量（低/中/高）
/** 民心 = 100×(0.4×卫生覆盖 + 0.4×食物充足 + 0.2×税率舒适) */
export const W_HYGIENE = 0.4, W_FOOD = 0.4, W_TAX = 0.2;
/** 卫生覆盖半径（格）：帝国中心自带保健班，净水站/卫生所/澡堂罩民居 */
export const HYGIENE_R_MAIN = 10, HYGIENE_R_WATER = 7, HYGIENE_R_CLINIC = 6, HYGIENE_R_BATH = 8;
/** 岗位劳动参数 */
export const WORKER_RATE = 1.0;        // 伐木工/矿工在资源旁的开采速率（/秒）
export const WORKER_CARRY = 10;        // 一趟载货上限
export const JOB_R_LUMBER = 6;         // 伐木场管辖半径（格）
export const JOB_R_MINE = 4;           // 晶窟采矿半径（格）
export const JOB_R_FARM = 8;           // 农庄管辖半径（格）——拖框铺田须落在某农庄半径内
export const HAULER_RANGE = 12;        // 仓库搬运工服务半径（格）
export const HAULER_LOAD = 12;         // 搬运工一趟扛运量
export const HAULER_TRIG = 0.5;        // 辖内建筑缓冲>50%触发扛运
export const HQ_LABOR_RATE = 1.5;      // 帝国中心劳役班：半径内缓冲漏斗入库速率（/秒，无搬运工时的保底物流）
export const HQ_LABOR_RANGE = 12;      // 劳役班服务半径（格）

export const ZOOM_MIN = 0.45;
export const ZOOM_MAX = 2.4;

export const OWNER_PLAYER = 0;
export const OWNER_ENEMY = 1;
export const OWNER_NEUTRAL = 2;   // 蛮族/动物

/** 金币与商路（v0.11 纪元与商路） */
export const GOLD_SELL_GAIN = 40;      // 卖出100资源→40金
export const GOLD_BUY_COST = 70;       // 70金→100资源（差价30锁死套利）
export const GOLD_TRADE_BASE = 8;      // 商队单趟基础收益
export const GOLD_TRADE_PER_10 = 2;    // 每10格路长追加
export const GOLD_TRADE_CAP = 24;      // 单趟收益上限
export const CARAVAN_CAP_PER_POST = 3; // 每座商贸站商队上限
export const CORONATION_TIME = 90;     // 奇观落成加冕倒计时（秒）

/** 地形枚举（与 mapgen/renderer 一致） */
export const T_GRASS = 0, T_WATER = 1, T_TREE = 2, T_ORE = 3, T_RAMP = 4, T_FORD = 5;  // T_FORD滩头：陆地可走/舰船禁行
export const T_FARM = 6;              // 麦田：可通行耕地（茬地/生长/成熟由farmStage区分）

/** 麦田链（耕种→生长→收割→搬运→入库→回种） */
export const FARM_GROWTH = 60;        // 生长时长（秒，三段各1/3）
export const FARM_YIELD = 8;          // 单块基础产量（=农夫一麻袋）
export const FARM_COST_WOOD = 5;      // 铺设单价（木/格）

/** 伤害类型矩阵：弹种 × 装甲 → 乘数（克制博弈核心表） */
/** 伤害类型矩阵（v0.14 装甲重构后由减伤表取代，弹种并三类） */
export type AttackCat = 'light' | 'heavy';

/** 减伤表：[目标甲类][攻击类别] = 承伤比例。破甲列永远100%（走两段结算）——全游戏唯一克制链 */
export const DMG_REDUCTION: Record<'light' | 'heavy', Record<AttackCat, number>> = {
  light: { light: 0.85, heavy: 1.0 },
  heavy: { light: 0.40, heavy: 0.85 },
};

/** 破甲倍率（全局常量，红线1：武器数据表禁止私改，想强就改单发伤害） */
export const ARMOR_PIERCE_MULT = 2;

/** 三十息再生（全阵营通用律）：脱战30秒后回血2%/s，受伤即重置；只回血不回甲 */
export const REGEN_DELAY = 30;
export const REGEN_RATE = 0.02;

/** 中立生态（v0.17）：FID/拴绳/腐烂/繁殖（格为单位） */
export const DEER_ALERT_RADIUS = 6;      // 鹿警戒：停下面向威胁
export const DEER_FLEE_RADIUS = 4;       // 鹿逃窜：进入此距离或受击
export const DEER_FLEE_DIST = 8;         // 逃窜距离（威胁反方向）
export const WOLF_TERRITORY = 5;         // 狼家域：入侵者进入此距离触发群体仇恨
export const WOLF_LEASH = 8;             // 拴绳：追击离家超过此距离自动断追回家
export const CARCASS_DECAY_STEP = 10;    // 尸体衰减步长（秒）
export const CARCASS_DECAY_PCT = 25;     // 每步衰减（按原始bounty%）
export const CARCASS_PICKUP_RADIUS = 3;  // 尸体自动拾取半径（格）

/** 弹道视觉速度（纯外观，按visual查表；武器可用speed覆盖） */
export const VISUAL_SPEED: Record<string, number> = { bullet: 520, shell: 380, cannon: 260, missile: 240, flame: 300 };

/** 空军悬停抬升与投影 */
export const AIR_HOVER = 14;

/** 地形高度系统 */
export const HEIGHT_OFFSET = 14;      // 每层高度在画面上抬升的像素
export const MAX_HEIGHT = 3;
export const HEIGHT_VISION_BONUS = 1;     // 每层高度额外视野（格）
export const HEIGHT_RANGE_BONUS = 0.08;   // 每层高度优势射程加成
export const HEIGHT_DAMAGE_BONUS = 0.10;  // 每层高度优势伤害加成

/** 阵营调色板 */
export interface FactionPalette { primary: string; secondary: string; dark: string; }
export const PALETTES: FactionPalette[] = [
  { primary: '#4a7dd6', secondary: '#2c4f8a', dark: '#1d3560' }, // 玩家：联邦蓝
  { primary: '#c9564a', secondary: '#8a3229', dark: '#5e1f1a' }, // 敌方：铁锈红
  { primary: '#8a7a5a', secondary: '#57493d', dark: '#3a3129' }, // 中立：蛮族皮毛棕
];

export const METAL = '#8a919c', METAL_DARK = '#565c66';
export const COLORS = {
  grass: '#4a7c3a', grassNoise: ['#437236', '#528843', '#477a3c'],
  water: '#2d6a9e', waterWave: '#3d7fb5',
  treeLeaf: ['#2e5e2a', '#3a7534'], treeTrunk: '#5d4a2f',
  oreRock: '#6b6f78', oreCrystal: '#e8c25a',
  hpBar: '#6ee06e', hpBarLow: '#e06050', hpBarBack: 'rgba(0,0,0,.55)',
  select: '#8fff8f', site: '#c9a44a',
};
