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
export const POP_BASE = 10;           // 基础人口上限（HQ另加）
export const POP_PER_FARM = 10;
export const POP_MAX = 100;

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
export const DMG_MATRIX: Record<string, Record<string, number>> = {
  bullet: { light: 1.25, heavy: 0.6 },   // 枪弹克轻甲
  shell:  { light: 0.75, heavy: 1.25 },  // 炮弹克重甲
  cannon: { light: 1.0, heavy: 1.0 },    // 溅射万金油
  fire:   { light: 1.25, heavy: 0.5 },   // 火焰克轻甲/软化重甲（附燃烧）
  missile:{ light: 1.0, heavy: 1.0 },    // 导弹通用
  explosive: { light: 1.25, heavy: 0.9 }, // 爆炸弹克轻甲/重甲均不俗
};

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
