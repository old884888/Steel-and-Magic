import {
  MAP_W, MAP_H, TILE, T_GRASS, T_ORE, T_TREE, T_WATER, T_RAMP, T_FORD,
  START_RES, POP_BASE, POP_MAX, PATH_BUDGET, OWNER_PLAYER,
  STORAGE_BASE,
} from '../config';
import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { SpatialHash, dist } from '../engine/spatialHash';
import { nearestWalkable } from '../engine/astar';
import type { Entity } from './entity';
import type { Wreck, FireZone } from '../types';
import { makeUnit, makeBuilding } from './entity';
import type { FxEvent, Projectile, Res, ResAmount, Vec } from '../types';
import { generateMap } from './mapgen';
import { spawnNeutrals } from './neutral';
import { SimLog, type LogCat } from './log';

export interface PlayerState {
  res: { wood: number; food: number; ore: number };
  income: { wood: number; food: number; ore: number };
  incomeMul: number;           // 经济倍率（AI难度旋钮，玩家恒为1）
  storageCap: number;          // 资源存储上限（三资源共用）
  pop: number;
  popCap: number;
  defeat: boolean;
}

/**
 * 世界状态容器 + 指令API。纯逻辑、无渲染依赖，selftest可在无头环境跑。
 */
export class World {
  tick = 0;
  time = 0;
  nextId = 1;
  entities = new Map<number, Entity>();
  hash = new SpatialHash(48);

  terrain: Uint8Array;
  height: Uint8Array;        // 每格高度层 0..3
  navalWalkable: Uint8Array; // 舰船通行网格（水面）
  treeWood: Float32Array;
  oreLeft: Float32Array;
  occupied: Uint8Array;      // 建筑占格标记
  buildingAt: Int32Array;    // 格 -> 建筑entityId（-1无）
  walkable: Uint8Array;

  fog: [Uint8Array, Uint8Array];

  players: [PlayerState, PlayerState];

  projectiles: Projectile[] = [];
  fx: FxEvent[] = [];
  wrecks: Wreck[] = [];               // 战场遗迹（尸体/残骸/废墟），上限40 FIFO
  fireZones: FireZone[] = [];         // 地面燃烧区（爆炸弹产生）
  dirtyTiles = new Set<number>();   // 地形变化（渲染层重绘用）

  log = new SimLog();
  private logRepeat = new Map<string, number>(); // 节流键 -> 上次记录时间

  pathBudget = PATH_BUDGET;
  pendingPaths: number[] = [];      // 等待预算的实体id

  gameOver = 0;                     // 0进行中 / 1玩家胜 / 2玩家败

  constructor(seed = 20261009, variant: 'standard' | 'islands' = 'standard') {
    const map = generateMap(seed, variant);
    this.terrain = map.terrain;
    this.height = map.height;
    this.treeWood = map.treeWood;
    this.oreLeft = map.oreLeft;
    this.occupied = new Uint8Array(MAP_W * MAP_H);
    this.buildingAt = new Int32Array(MAP_W * MAP_H).fill(-1);
    this.walkable = new Uint8Array(MAP_W * MAP_H);
    this.fog = [new Uint8Array(MAP_W * MAP_H), new Uint8Array(MAP_W * MAP_H)];
    this.players = [
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false },
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false },
    ];
    this.refreshWalkableAll();
    // 舰船通行网格：只有深水可航行（滩头T_FORD是陆地通道，舰船禁行）
    this.navalWalkable = new Uint8Array(MAP_W * MAP_H);
    for (let i = 0; i < this.navalWalkable.length; i++) {
      this.navalWalkable[i] = this.terrain[i] === T_WATER ? 1 : 0;
    }

    // 双方开局：HQ + 2工程车
    for (const [owner, base] of [[0, map.playerBase], [1, map.enemyBase]] as const) {
      const hq = this.spawnBuilding('hq', owner as 0 | 1, base.tx, base.ty, true);
      void hq;
      const cx = (base.tx + 1.5) * TILE, cy = (base.ty + 4.5) * TILE;
      this.spawnUnit('builder', owner as 0 | 1, cx - 40, cy);
      this.spawnUnit('builder', owner as 0 | 1, cx + 40, cy);
    }
    spawnNeutrals(this);
    this.addLog('system', '对局开始：双基地镜像地图，摧毁敌方指挥基地获胜。小心蛮族营地');
  }

  // ================= 日志 =================

  /** 统一日志入口：自动附时间戳；throttleKey+intervalSec 相同键在间隔内只记一条 */
  addLog(cat: LogCat, msg: string, owner?: number, throttleKey?: string, intervalSec = 30): void {
    if (throttleKey) {
      const last = this.logRepeat.get(throttleKey) ?? -Infinity;
      if (this.time - last < intervalSec) return;
      this.logRepeat.set(throttleKey, this.time);
    }
    this.log._push({ t: this.time, tick: this.tick, cat, msg, owner }, 5000);
  }

  /** 受存储上限约束的资源入账，返回实际入库量 */
  addRes(owner: number, res: Res, amount: number): number {
      if (owner > 1) return 0;
    const p = this.players[owner];
    const space = Math.max(0, p.storageCap - p.res[res]);
    const added = Math.min(amount, space);
    if (added > 0) p.res[res] += added;
    if (space <= 0.01 && amount > 0) {
      this.addLog('econ', `仓库满载：${res === 'wood' ? '木头' : res === 'food' ? '食物' : '矿石'}，产出停机`, owner, `capfull:${owner}:${res}`, 30);
    }
    return added;
  }

  // ================= 实体管理 =================

  spawnUnit(defId: string, owner: number, x: number, y: number): Entity {
    const def = UNIT_DEFS[defId];
    const e = makeUnit(this.nextId++, owner, defId, x, y, def.hp);
    this.entities.set(e.id, e);
    return e;
  }

  spawnBuilding(defId: string, owner: number, tx: number, ty: number, done: boolean): Entity {
    const def = BUILDING_DEFS[defId];
    const e = makeBuilding(this.nextId++, owner, defId, tx, ty, def.hp, def.size, done);
    this.entities.set(e.id, e);
    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        const i = (ty + dy) * MAP_W + (tx + dx);
        this.occupied[i] = 1;
        this.buildingAt[i] = e.id;
        this.walkable[i] = 0;
      }
    }
    if (defId === 'mine') e.linkedTile = this.pickOreTile(tx, ty, def.size);
    if (def.shieldPool) { e.shield = def.shieldPool; e.shieldMax = def.shieldPool; }
    return e;
  }

  removeEntity(id: number): void {
    const e = this.entities.get(id);
    if (!e) return;
    this.entities.delete(id);
    if (e.kind === 'building') {
      const def = BUILDING_DEFS[e.defId];
      for (let dy = 0; dy < def.size; dy++) {
        for (let dx = 0; dx < def.size; dx++) {
          const i = (e.ty + dy) * MAP_W + (e.tx + dx);
          this.occupied[i] = 0;
          this.buildingAt[i] = -1;
          if (this.terrain[i] === T_GRASS) this.walkable[i] = 1;
          else this.walkable[i] = 0;
        }
      }
    }
    this.fx.push({ x: e.x, y: e.y, type: 'boom', t: 0, dur: 0.5, size: e.kind === 'building' ? 46 : 20 });
    // 入殓：按类型留下战场遗迹（士兵尸体45s/载具残骸60s/建筑废墟120s）
    {
      const isBeast = e.kind === 'unit' && UNIT_DEFS[e.defId]?.wild !== undefined;
      const kind: Wreck['kind'] = e.kind === 'building' ? 'rubble'
        : (UNIT_DEFS[e.defId]?.weapon ? 'vehicle' : (isBeast ? 'beast' : 'corpse'));
      const dur = kind === 'rubble' ? 120 : kind === 'vehicle' ? 60 : 45;
      this.wrecks.push({
        x: e.x, y: e.y, kind,
        born: this.time, dur,
        size: e.kind === 'building' ? BUILDING_DEFS[e.defId].size : 1,
        seed: e.id * 7 + 3,
      });
      if (this.wrecks.length > 40) this.wrecks.shift();
    }
    this.addLog('military', `${e.owner === 0 ? '我方' : '敌方'}${e.kind === 'building' ? BUILDING_DEFS[e.defId].name : UNIT_DEFS[e.defId].name}被摧毁`, e.owner);
    // 清理指向它的引用
    for (const o of this.entities.values()) {
      if (o.engagedId === id) o.engagedId = null;
      if (o.order.targetId === id) o.order = { kind: 'idle' };
    }
    if (e.defId === 'hq') {
      this.players[e.owner].defeat = true;
      // 首个基地陷落即定胜负（gameOver只写一次，防止双基地同殁时被翻转）
      if (this.gameOver === 0) {
        this.gameOver = e.owner === OWNER_PLAYER ? 2 : 1; // 玩家基地被拆=2败，敌方被拆=1胜
        this.addLog('system', `指挥基地陷落，${e.owner === 0 ? '玩家战败' : '玩家获胜'}`, e.owner);
      }
    }
  }

  // ================= 地形/放置 =================

  refreshWalkableAll(): void {
    for (let i = 0; i < this.walkable.length; i++) {
      this.walkable[i] = (this.terrain[i] === T_GRASS || this.terrain[i] === T_RAMP || this.terrain[i] === T_FORD) ? 1 : 0;
    }
  }

  /** 按单位层级查询通行性：air全图通（边界内），naval查水面网，land走高度规则 */
  canStandClassAt(e: Entity, fx: number, fy: number, tx: number, ty: number): boolean {
    const moveClass = UNIT_DEFS[e.defId]?.moveClass ?? 'land';
    if (moveClass === 'air') {
      return tx >= TILE && ty >= TILE && tx < MAP_W * TILE - TILE && ty < MAP_H * TILE - TILE;
    }
    if (moveClass === 'naval') {
      const ti = Math.floor(ty / TILE) * MAP_W + Math.floor(tx / TILE);
      return ti >= 0 && ti < this.navalWalkable.length && this.navalWalkable[ti] === 1;
    }
    return this.canStandAtWorld(fx, fy, tx, ty);
  }

  walkableAtClassWorld(e: Entity, x: number, y: number): boolean {
    if (UNIT_DEFS[e.defId]?.moveClass === 'air') return true;
    return this.walkableAtWorld(x, y);
  }

  // ================= 高度系统 =================

  /** 高度感知通行：同层直走，跨层必须走坡道且只跨1层 */
  canStand(fromIdx: number, toIdx: number): boolean {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= this.walkable.length || toIdx >= this.walkable.length) return false;
    if (!this.walkable[toIdx]) return false;
    const hf = this.height[fromIdx], ht = this.height[toIdx];
    if (hf === ht) return true;
    if (Math.abs(hf - ht) > 1) return false;
    return this.terrain[fromIdx] === T_RAMP || this.terrain[toIdx] === T_RAMP;
  }

  canStandAtWorld(fx: number, fy: number, tx: number, ty: number): boolean {
    return this.canStand(
      Math.floor(fy / TILE) * MAP_W + Math.floor(fx / TILE),
      Math.floor(ty / TILE) * MAP_W + Math.floor(tx / TILE),
    );
  }

  /** 实体所在格的高度层 */
  heightAt(x: number, y: number): number {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
    return this.height[ty * MAP_W + tx];
  }

  walkableAtTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    return this.walkable[ty * MAP_W + tx] === 1;
  }

  walkableAtWorld(x: number, y: number): boolean {
    return this.walkableAtTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  pickOreTile(tx: number, ty: number, size: number): number {
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const i = (ty + dy) * MAP_W + (tx + dx);
        if (this.terrain[i] === T_ORE && this.oreLeft[i] > 0) return i;
      }
    }
    return -1;
  }

  canPlace(defId: string, tx: number, ty: number): { ok: boolean; reason: string } {
    const def = BUILDING_DEFS[defId];
    if (tx < 1 || ty < 1 || tx + def.size >= MAP_W - 1 || ty + def.size >= MAP_H - 1) {
      return { ok: false, reason: '太靠近地图边缘' };
    }
    let oreTiles = 0;
    let h0 = -1;
    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        const i = (ty + dy) * MAP_W + (tx + dx);
        if (this.occupied[i]) return { ok: false, reason: '与其他建筑重叠' };
        if (this.terrain[i] === T_RAMP) return { ok: false, reason: '坡道上不能建造' };
        if (h0 < 0) h0 = this.height[i];
        else if (this.height[i] !== h0) return { ok: false, reason: '地面高低不平' };
        const t = this.terrain[i];
        if (def.needOre) { if (t === T_ORE) oreTiles++; }
        else if (t !== T_GRASS) return { ok: false, reason: t === T_WATER ? '不能建在水上' : '地面被占用（树/矿）' };
      }
    }
    if (def.needOre && oreTiles === 0) return { ok: false, reason: '必须建造在矿脉上' };

    // 占格内不能有单位
    const x0 = tx * TILE, y0 = ty * TILE, px = def.size * TILE;
    const near: number[] = [];
    this.hash.queryCircle(x0 + px / 2, y0 + px / 2, px, near);
    for (const id of near) {
      const u = this.entities.get(id);
      if (u && u.kind === 'unit') {
        const p = this.hash.pos.get(id);
        if (p && p.x >= x0 - 4 && p.x <= x0 + px + 4 && p.y >= y0 - 4 && p.y <= y0 + px + 4) {
          return { ok: false, reason: '有单位站在施工区' };
        }
      }
    }
    if (def.needWater) {
      let water = 0;
      for (let dy = -1; dy <= def.size; dy++) {
        for (let dx = -1; dx <= def.size; dx++) {
          const x = tx + dx, y = ty + dy;
          const edge = dx < 0 || dy < 0 || dx >= def.size || dy >= def.size;
          if (!edge) continue;
          if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
          if (this.terrain[y * MAP_W + x] === T_WATER) water++;
        }
      }
      if (water < 3) return { ok: false, reason: 'The shipyard must be built by the water' };
    }
    if (def.needTrees) {
      let trees = 0;
      for (let dy = -4; dy < def.size + 4 && trees < 5; dy++) {
        for (let dx = -4; dx < def.size + 4; dx++) {
          const x = tx + dx, y = ty + dy;
          if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
          if (this.terrain[y * MAP_W + x] === T_TREE) { trees++; if (trees >= 5) break; }
        }
      }
      if (trees < 5) return { ok: false, reason: '周围4格内树木不足（需≥5棵）' };
    }
    return { ok: true, reason: '' };
  }

  // ================= 资源 =================

  canAfford(owner: number, cost: ResAmount): boolean {
    const p = this.players[owner];
    return (cost.wood ?? 0) <= p.res.wood && (cost.food ?? 0) <= p.res.food && (cost.ore ?? 0) <= p.res.ore;
  }

  payCost(owner: number, cost: ResAmount): void {
    const p = this.players[owner];
    p.res.wood -= cost.wood ?? 0;
    p.res.food -= cost.food ?? 0;
    p.res.ore -= cost.ore ?? 0;
  }

  refundCost(owner: number, cost: ResAmount): void {
    const p = this.players[owner];
    p.res.wood += cost.wood ?? 0;
    p.res.food += cost.food ?? 0;
    p.res.ore += cost.ore ?? 0;
  }

  affordAfterQueue(owner: 0 | 1, cost: ResAmount): boolean {
    return this.canAfford(owner, cost);
  }

  /** 人口：存活单位 + 排队中的单位 */
  recomputePop(): void {
    for (const owner of [0, 1] as const) {
      let pop = 0, cap = 0;
      for (const e of this.entities.values()) {
        if (e.owner !== owner) continue;
        if (e.kind === 'unit') pop++;
        else if (e.done) {
          const def = BUILDING_DEFS[e.defId];
          cap += def.popBonus ?? 0;
          if (def.produces) pop += e.queue.length;
        }
      }
      const p = this.players[owner];
      p.pop = pop;
      p.popCap = Math.min(POP_MAX, POP_BASE + cap);
    }
  }

  // ================= 查询 =================

  unitsOf(owner: 0 | 1): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities.values()) if (e.kind === 'unit' && e.owner === owner) out.push(e);
    return out;
  }

  buildingsOf(owner: 0 | 1): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities.values()) if (e.kind === 'building' && e.owner === owner) out.push(e);
    return out;
  }

  findHq(owner: 0 | 1): Entity | undefined {
    for (const e of this.entities.values()) {
      if (e.kind === 'building' && e.defId === 'hq' && e.owner === owner) return e;
    }
    return undefined;
  }

  /** 最近的卸货点（HQ/仓库，已完成） */
  nearestDepot(owner: number, x: number, y: number): Entity | null {
    let best: Entity | null = null, bestD = Infinity;
    for (const b of this.entities.values()) {
      if (b.kind !== 'building' || !b.done || b.owner !== owner) continue;
      if (!BUILDING_DEFS[b.defId].isDepot) continue;
      const d = dist(x, y, b.x, b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  /** 点选命中：优先单位，其次建筑 */
  pickAt(x: number, y: number): Entity | null {
    const id = this.hash.nearest(x, y, 26);
    if (id !== null) {
      const e = this.entities.get(id);
      if (e && e.kind === 'unit') return e;
    }
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H) {
      const bid = this.buildingAt[ty * MAP_W + tx];
      if (bid >= 0) return this.entities.get(bid) ?? null;
    }
    // 建筑点边缘半格容差
    for (const e of this.entities.values()) {
      if (e.kind !== 'building') continue;
      const c = e.center();
      if (dist(c.x, c.y, x, y) < e.radius() + 10) return e;
    }
    return null;
  }

  // ================= 指令API =================

  issueMove(ids: number[], target: Vec): void {
    // 编队散开：按人数排方阵偏移
    const n = ids.length;
    const cols = Math.ceil(Math.sqrt(n));
    const spacing = 30;
    ids.forEach((id, i) => {
      const e = this.entities.get(id);
      if (!e || e.kind !== 'unit') return;
      const ox = (i % cols - (cols - 1) / 2) * spacing;
      const oy = (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * spacing;
      const t = { x: target.x + ox, y: target.y + oy };
      const tw = nearestWalkable(this.walkable, Math.floor(t.x / TILE), Math.floor(t.y / TILE));
      t.x = (tw.x + 0.5) * TILE; t.y = (tw.y + 0.5) * TILE;
      e.order = { kind: 'move', target: t };
      e.engagedId = null; e.firingHold = false;
      e.path = null; e.pathPending = false;
    });
  }

  issueAttack(ids: number[], targetId: number): void {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== 'unit') continue;
      e.order = { kind: 'attack', targetId };
      e.engagedId = targetId;
      e.firingHold = false;
      e.gatherState = null;
      e.path = null; e.pathPending = false;
    }
  }

  /** 攻击移动：向目标点推进，途中主动交战（干完架继续走） */
  issueAttackMove(ids: number[], target: Vec): void {
    const n = ids.length;
    const cols = Math.ceil(Math.sqrt(n));
    const spacing = 30;
    ids.forEach((id, i) => {
      const e = this.entities.get(id);
      if (!e || e.kind !== 'unit') return;
      const ox = (i % cols - (cols - 1) / 2) * spacing;
      const oy = (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * spacing;
      const t = { x: target.x + ox, y: target.y + oy };
      const tw = nearestWalkable(this.walkable, Math.floor(t.x / TILE), Math.floor(t.y / TILE));
      t.x = (tw.x + 0.5) * TILE; t.y = (tw.y + 0.5) * TILE;
      e.order = { kind: 'attackMove', target: t };
      e.engagedId = null; e.firingHold = false;
      e.gatherState = null;
      e.path = null; e.pathPending = false;
    });
  }

  /** 停止：清空订单与交战状态 */
  issueStop(ids: number[]): void {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== 'unit') continue;
      e.order = { kind: 'idle' };
      e.engagedId = null; e.firingHold = false;
      e.gatherState = null;
      e.path = null; e.pathPending = false;
    }
  }

  /** 驻守：原地不动，只对射程内敌人开火，绝不追击 */
  issueHold(ids: number[]): void {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== 'unit') continue;
      e.order = { kind: 'hold' };
      e.engagedId = null; e.firingHold = false;
      e.gatherState = null;
      e.path = null; e.pathPending = false;
    }
  }

  /** 建造（未完成）或修理（已完成且受损）；工程车专用 */
  issueBuild(ids: number[], buildingId: number): void {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== 'unit') continue;
      e.order = { kind: 'build', targetId: buildingId };
      e.engagedId = null; e.firingHold = false;
      e.gatherState = null;
      e.path = null; e.pathPending = false;
    }
  }

  /** 人工采集：右键树（wood）或矿（ore）。工程车自动 采集→满载回仓→卸货→循环 */
  issueGather(ids: number[], resTile: number, res: 'wood' | 'ore'): void {
    let ordered = 0;
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== 'unit' || !UNIT_DEFS[e.defId].gather) continue;
      e.order = { kind: 'gather', resTile, res };
      e.gatherState = 'toRes';
      e.resTile = resTile;
      e.resExhausted = false;
      e.engagedId = null; e.firingHold = false;
      e.path = null; e.pathPending = false;
      ordered++;
    }
    if (ordered > 0) {
      // 落点标签：让玩家知道指令生效了
      const tx = resTile % MAP_W, ty = (resTile / MAP_W) | 0;
      this.addFx((tx + 0.5) * TILE, (ty + 0.5) * TILE, 'mark', 0, 1.4, undefined, res === 'wood' ? '伐木' : '采矿');
    }
  }

  // ================= 特效 =================

  addFx(x: number, y: number, type: FxEvent['type'], size = 10, dur = 0.3, a?: number, text?: string, color?: string): void {
    if (this.fx.length > 300) this.fx.shift();
    this.fx.push({ x, y, type, t: 0, dur, size, a, text, color });
  }
}
