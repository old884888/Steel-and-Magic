import type { Order } from '../types';

export interface PathPoint { x: number; y: number }
export interface QueueItem { unitId: string; remaining: number }

export interface Entity {
  id: number;
  owner: number;               // 0/1玩家，2中立（蛮族/动物）
  kind: 'unit' | 'building';
  defId: string;
  x: number; y: number;
  hp: number;

  // ---- 单位字段 ----
  angle: number;            // 车体朝向（弧度）
  turretAngle: number;      // 炮塔朝向
  order: Order;
  path: PathPoint[] | null;
  pathIdx: number;
  pathPending: boolean;
  cooldown: number;         // 开火冷却剩余秒
  engagedId: number | null; // 交战目标（显式攻击或自动索敌）
  firingHold: boolean;      // 移动途中射程内停火
  repathTimer: number;      // 追击时重寻路计时
  scanTimer: number;        // 索敌扫描错峰计时
  stuck: number;            // 卡死累计位移（重寻路用）

  // ---- 采集字段（工程车） ----
  cargo: { res: 'wood' | 'ore'; amt: number } | null;
  gatherState: 'toRes' | 'gathering' | 'toDepot' | 'deposit' | null;
  resTile: number;          // 目标资源格
  resExhausted: boolean;    // 资源枯竭标记：卸完货就地待命

  // ---- 采集字段（工程车） ----
  homeX: number; homeY: number; // 中立生物出生锚点（游荡/领地中心）
  // ---- 燃烧DoT（喷火武器） ----
  burnUntil?: number;       // 燃烧截止时间
  burnDps?: number;         // 燃烧每秒伤害
  burnFrom?: number;        // 纵火者（击杀归属）

  // ---- 中立系统运行时字段（可选，owner 2 使用） ----
  nSpawnT?: number;         // 营地刷兵倒计时
  nRaidT?: number;          // 营地劫掠倒计时
  nWanderT?: number;        // 动物游荡倒计时

  // ---- 护盾发生器字段（建筑） ----
  shield?: number;          // 当前护盾池
  shieldMax?: number;
  shieldHitAt?: number;     // 最近受击时间（脱战回充判定）

  // ---- AI专属运行时标记（可选，仅敌方单位使用） ----
  aiRetreatUntil?: number;  // 撤退锁定期：在此之前AI不给该单位派新活
  aiSpareUntil?: number;    // 保炮车后撤锁定期

  // ---- 建筑字段 ----
  tx: number; ty: number;   // 左上角格坐标
  progress: number;         // 施工进度 0..1
  done: boolean;
  queue: QueueItem[];
  rally: PathPoint | null;
  linkedTile: number;       // 伐木站目标树格 / 采矿场矿格（-1无）
  buffer: number;           // 自动机内部缓冲仓当前储量
  bufferStalled: boolean;   // 满仓停机标记（展示用）

  /** 世界坐标下的碰撞半径（建筑=格尺寸一半） */
  radius(): number;
  /** 建筑中心点世界坐标 */
  center(): PathPoint;
}

export function makeUnit(id: number, owner: number, defId: string, x: number, y: number, hp: number): Entity {
  return {
    id, owner, kind: 'unit', defId, x, y, hp,
    angle: 0, turretAngle: 0,
    order: { kind: 'idle' }, path: null, pathIdx: 0, pathPending: false,
    cooldown: 0, engagedId: null, firingHold: false, repathTimer: 0,
    scanTimer: (id % 12) / 60, stuck: 0,
    cargo: null, gatherState: null, resTile: -1, resExhausted: false,
    homeX: x, homeY: y,
    tx: 0, ty: 0, progress: 1, done: true, queue: [], rally: null, linkedTile: -1,
    buffer: 0, bufferStalled: false,
    radius() { return 8; },
    center() { return { x: this.x, y: this.y }; },
  };
}

export function makeBuilding(id: number, owner: number, defId: string, tx: number, ty: number, hp: number, size: number, done: boolean): Entity {
  const cx = (tx + size / 2) * 32, cy = (ty + size / 2) * 32;
  return {
    id, owner, kind: 'building', defId,
    x: cx, y: cy, hp: done ? hp : Math.max(1, hp * 0.1),
    angle: 0, turretAngle: 0,
    order: { kind: 'idle' }, path: null, pathIdx: 0, pathPending: false,
    cooldown: 0, engagedId: null, firingHold: false, repathTimer: 0, scanTimer: (id % 12) / 60, stuck: 0,
    cargo: null, gatherState: null, resTile: -1, resExhausted: false,
    homeX: cx, homeY: cy,
    tx, ty, progress: done ? 1 : 0, done, queue: [], rally: null, linkedTile: -1,
    buffer: 0, bufferStalled: false,
    radius() { return (size * 32) / 2; },
    center() { return { x: this.x, y: this.y }; },
  };
}
