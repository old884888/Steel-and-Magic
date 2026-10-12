import {
  MAP_W, MAP_H, TILE, T_GRASS, T_ORE, T_TREE, T_WATER, T_RAMP, T_FORD, T_FARM,
  START_RES, POP_BASE, POP_MAX, PATH_BUDGET, OWNER_PLAYER,
  STORAGE_BASE, FARM_YIELD,
} from '../config';
import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { SpatialHash, dist } from '../engine/spatialHash';
import { nearestWalkable } from '../engine/astar';
import type { Entity } from './entity';
import type { Wreck, FireZone } from '../types';
import { makeUnit, makeBuilding } from './entity';
import type { FxEvent, Projectile, Res, ResAmount, Vec } from '../types';
import { generateMap, type MapVariant } from './mapgen';
import { spawnNeutrals } from './neutral';
import { SimLog, type LogCat } from './log';
import {
  EDICT_MULT, LOGISTICS_POP, LOGISTICS_STORAGE, DEEP_STORAGE_BONUS,
  TECH_MULT, type EdictId, type TechId,
} from '../data/policies';
import { ERA_MULT } from '../data/eras';
import * as researchSys from './research';
import * as goldSys from './gold';
import * as coronationSys from './coronation';

export interface PlayerState {
  res: { wood: number; food: number; ore: number };
  income: { wood: number; food: number; ore: number };
  incomeMul: number;           // 经济倍率（AI难度旋钮，玩家恒为1）
  storageCap: number;          // 资源存储上限（三资源共用）
  pop: number;
  popCap: number;
  defeat: boolean;
  gold: number;                // 金币：不可开采、无上限的软通货（贸易/卖资源）
  era: 0 | 1 | 2;              // 纪元：0拓荒 / 1工业 / 2钢铁
  edict: EdictId | null;       // 当前法令（全局四选一）
  edictCd: number;             // 法令切换冷却（秒）
  techs: TechId[];             // 已完成科技
  research: { id: string; remaining: number } | null; // 进行中的研究（科技或纪元，全局单线）
  researchBoosted?: boolean;   // 本次研究已金币加速（1金=2秒限一次）
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

  // 麦田层（格子经济：T_FARM地块的状态与归属）
  farmOwner: Uint8Array;      // 0无主 / 1玩家 / 2敌方
  farmStage: Uint8Array;      // 0茬地 / 1~2生长 / 3成熟
  farmPlanted: Float32Array;  // 播种时刻（-1=未种）
  farmTiles = new Set<number>();

  coronation: { owner: 0 | 1; monumentId: number; endsAt: number } | null = null;
  lastVictory: 'hq' | 'coronation' = 'hq'; // 胜利方式（结算画面标注）

  players: [PlayerState, PlayerState];

  projectiles: Projectile[] = [];
  fx: FxEvent[] = [];
  wrecks: Wreck[] = [];               // 战场遗迹（尸体/残骸/废墟），上限40 FIFO
  fireZones: FireZone[] = [];         // 地面燃烧区（爆炸弹产生）
  dirtyTiles = new Set<number>();   // 地形变化（渲染层重绘用）

  log: SimLog;
  private logRepeat = new Map<string, number>(); // 节流键 -> 上次记录时间

  pathBudget = PATH_BUDGET;
  pendingPaths: number[] = [];      // 等待预算的实体id

  gameOver = 0;                     // 0进行中 / 1玩家胜 / 2玩家败

  readonly seed: number;
  readonly variant: MapVariant;

  constructor(seed = 20261009, variant: MapVariant = 'standard', persistLog = true) {
    this.log = new SimLog(5000, persistLog);
    this.seed = seed;
    this.variant = variant;
    const map = generateMap(seed, variant);
    this.terrain = map.terrain;
    this.height = map.height;
    this.treeWood = map.treeWood;
    this.oreLeft = map.oreLeft;
    this.occupied = new Uint8Array(MAP_W * MAP_H);
    this.buildingAt = new Int32Array(MAP_W * MAP_H).fill(-1);
    this.walkable = new Uint8Array(MAP_W * MAP_H);
    this.farmOwner = new Uint8Array(MAP_W * MAP_H);
    this.farmStage = new Uint8Array(MAP_W * MAP_H);
    this.farmPlanted = new Float32Array(MAP_W * MAP_H).fill(-1);
    this.fog = [new Uint8Array(MAP_W * MAP_H), new Uint8Array(MAP_W * MAP_H)];
    this.players = [
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false, gold: 0, era: 0, edict: null, edictCd: 0, techs: [], research: null },
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false, gold: 0, era: 0, edict: null, edictCd: 0, techs: [], research: null },
    ];
    this.refreshWalkableAll();
    // 舰船通行网格：只有深水可航行（滩头T_FORD是陆地通道，舰船禁行）
    this.navalWalkable = new Uint8Array(MAP_W * MAP_H);
    for (let i = 0; i < this.navalWalkable.length; i++) {
      this.navalWalkable[i] = this.terrain[i] === T_WATER ? 1 : 0;
    }

    // 双方开局：2工程车 + 1基地车（基地车展开成指挥基地，见deployMCV）
    for (const [owner, base] of [[0, map.playerBase], [1, map.enemyBase]] as const) {
      const cx = (base.tx + 1.5) * TILE, cy = (base.ty + 1.5) * TILE;
      this.spawnUnit('mcv', owner as 0 | 1, cx, cy);
      this.spawnUnit('builder', owner as 0 | 1, cx - 50, cy + 60);
      this.spawnUnit('builder', owner as 0 | 1, cx + 50, cy + 60);
    }
    spawnNeutrals(this);
  }

  /** 开局写对局头（Game.start时调用）——菜单页/无头模拟不再产生噪音对局头 */
  startSession(): void {
    this.log.beginSession(`──── 新对局 · ${this.variant === 'islands' ? '群岛海峡' : '标准大陆'} · seed=${this.seed} · ${new Date().toLocaleString()} ────`);
    this.addLog('system', '对局开始：双基地镜像地图，摧毁敌方指挥基地获胜。小心蛮族营地');
  }

  // ================= 法令/科技/地利（运营深度系统） =================

  /** 全局效果乘数：纪元×法令×科技叠乘（owner>1恒为1） */
  mult(owner: number, kind: 'gather' | 'damage' | 'range' | 'build'): number {
    if (owner > 1) return 1;
    const p = this.players[owner];
    let m = 1;
    const em = p.edict ? EDICT_MULT[p.edict][kind] : undefined;
    if (em) m *= em;
    for (const t of p.techs) {
      const tm = TECH_MULT[t]?.[kind];
      if (tm) m *= tm;
    }
    for (let era = 1; era <= p.era; era++) {
      const rm = (ERA_MULT[era] as Partial<Record<string, number>> | undefined)?.[kind];
      if (rm) m *= rm;
    }
    return m;
  }

  /** 切换法令（冷却中/重复切换返回false） */
  setEdict(owner: 0 | 1, id: EdictId): boolean {
    const p = this.players[owner];
    if (p.edict === id || p.edictCd > 0) return false;
    p.edict = id;
    p.edictCd = 45;
    this.addLog('system', `切换法令：${id}`, owner);
    return true;
  }

  hasLab(owner: number): boolean { return researchSys.hasLab(this, owner); }

  /** 立项研究（全局单线：有研究进行中/已研完/无研究所/付不起 均拒绝）；id可为科技或纪元 */
  startResearch(owner: 0 | 1, id: string): boolean { return researchSys.startResearch(this, owner, id); }

  /** 研究完成（construction在remaining<=0时调用）：科技入列 / 纪元晋升 */
  completeResearch(owner: 0 | 1): void { researchSys.completeResearch(this, owner); }

  /** 金币加速科研：1金=2秒，每次研究限一次 */
  boostResearch(): boolean { return researchSys.boostResearch(this, 0); }

  // ================= 金币与商路 =================

  addGold(owner: number, v: number): void { goldSys.addGold(this, owner, v); }

  marketSell(owner: number, res: Res): boolean { return goldSys.marketSell(this, owner, res); }

  marketBuy(owner: number, res: Res): boolean { return goldSys.marketBuy(this, owner, res); }

  hireCaravan(postId: number): boolean { return goldSys.hireCaravan(this, postId); }

  // ================= 奇观加冕 =================

  startCoronation(owner: 0 | 1, monumentId: number): void { coronationSys.startCoronation(this, owner, monumentId); }

  checkCoronation(): void { coronationSys.checkCoronation(this); }

  /** 地利加成（邻接系统）：农场临水/自动机傍仓库/炮台扼坡道。每5秒与建筑完工时重算 */
  recomputeAdjacency(): void {
    for (const e of this.entities.values()) {
      if (e.kind !== 'building' || !e.done || e.owner > 1) continue;
      let bonus = 1, label = '';
      const def = BUILDING_DEFS[e.defId];
      if (e.defId === 'farm') {
        // 占地外圈1格的水面格数
        let water = 0;
        for (let dy = -1; dy <= def.size; dy++) {
          for (let dx = -1; dx <= def.size; dx++) {
            const edge = dx < 0 || dy < 0 || dx >= def.size || dy >= def.size;
            if (!edge) continue;
            const x = e.tx + dx, y = e.ty + dy;
            if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
            if (this.terrain[y * MAP_W + x] === T_WATER) water++;
          }
        }
        if (water >= 5) { bonus = 1.20; label = '临水灌溉 +20%'; }
        else if (water >= 2) { bonus = 1.10; label = '临水灌溉 +10%'; }
      } else if (e.defId === 'lumber' || e.defId === 'mine') {
        // 2格切比雪夫距离内有已建成仓库 → 就地中转
        for (const o of this.entities.values()) {
          if (o.kind !== 'building' || o.defId !== 'storehouse' || !o.done || o.owner !== e.owner) continue;
          const d = Math.max(Math.abs(o.tx - e.tx), Math.abs(o.ty - e.ty), Math.abs(o.tx + 1 - e.tx - def.size), Math.abs(o.ty + 1 - e.ty - def.size));
          if (d <= 2) { bonus = 1.10; label = '就地中转 +10%'; break; }
        }
      } else if (e.defId === 'turret') {
        // 3格内有坡道 → 锁扼隘口
        outer: for (let dy = -3; dy <= def.size + 2; dy++) {
          for (let dx = -3; dx <= def.size + 2; dx++) {
            const x = e.tx + dx, y = e.ty + dy;
            if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
            if (this.terrain[y * MAP_W + x] === T_RAMP) { bonus = 1.20; label = '锁扼坡道 +20%'; break outer; }
          }
        }
      }
      if (label && e.adjLabel !== label) {
        e.adjLabel = label;
        e.adjBonus = bonus;
        this.addLog('econ', `${def.name}获得地利：${label}`, e.owner);
      } else if (!label && e.adjLabel) {
        e.adjLabel = undefined;
        e.adjBonus = undefined;
      } else if (label) {
        e.adjBonus = bonus;
      }
    }
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
    // 摧毁引用清理 + 奇观加冕中断
    for (const o of this.entities.values()) {
      if (o.engagedId === id) o.engagedId = null;
      if (o.order.targetId === id) o.order = { kind: 'idle' };
    }
    if (e.defId === 'monument' && this.coronation?.monumentId === id) {
      this.coronation = null;
      this.addLog('system', '纪元纪念碑被摧毁，加冕中断！前功尽弃……', e.owner);
    }
    if (e.defId === 'hq') {
      // 基地没了但基地车还在：不算败——展开新车队即可续命
      const hasMCV = [...this.entities.values()].some(o => o.defId === 'mcv' && o.owner === e.owner);
      if (hasMCV) {
        this.addLog('system', '指挥基地陷落！基地车尚在——展开新车队，重整旗鼓', e.owner);
      } else {
        this.players[e.owner].defeat = true;
        // 首次定胜负（gameOver只写一次，防止双基地同殁时被翻转）
        if (this.gameOver === 0) {
          this.gameOver = e.owner === OWNER_PLAYER ? 2 : 1; // 玩家基地被拆=2败，敌方被拆=1胜
          this.addLog('system', `指挥基地陷落，${e.owner === OWNER_PLAYER ? '玩家战败' : '玩家获胜'}`, e.owner);
        }
      }
    }
  }

  // ================= 地形/放置 =================

  refreshWalkableAll(): void {
    for (let i = 0; i < this.walkable.length; i++) {
      this.walkable[i] = (this.terrain[i] === T_GRASS || this.terrain[i] === T_RAMP || this.terrain[i] === T_FORD || this.terrain[i] === T_FARM) ? 1 : 0;
    }
  }

  // ================= 麦田链（铺设→种植→生长→收割→入库→回种） =================

  /** 铺设一块麦田（茬地）：仅草地、无建筑、无主。成功返回true（调用方负责扣钱） */
  layFarm(tx: number, ty: number, owner: number): boolean {
    if (tx < 1 || ty < 1 || tx >= MAP_W - 1 || ty >= MAP_H - 1) return false;
    const i = ty * MAP_W + tx;
    if (this.terrain[i] !== T_GRASS || this.occupied[i] || this.farmOwner[i] !== 0) return false;
    this.terrain[i] = T_FARM;
    this.farmOwner[i] = owner;
    this.farmStage[i] = 0;
    this.farmPlanted[i] = -1;
    this.walkable[i] = 1;
    this.farmTiles.add(i);
    this.dirtyTiles.add(i);
    return true;
  }

  /** 收割一块成熟麦田：结算地利加成，返回产量（同时变为茬地） */
  harvestFarm(i: number, owner: number): number {
    if (this.farmOwner[i] !== owner || this.farmStage[i] !== 3) return 0;
    // 地利：临水灌溉 + 相邻麦田（农场三角）
    let water = 0, farms = 0;
    const tx = i % MAP_W, ty = (i / MAP_W) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const j = y * MAP_W + x;
        if (this.terrain[j] === T_WATER) water++;
        if (this.terrain[j] === T_FARM) farms++;
      }
    }
    let mul = 1;
    if (water >= 5) mul *= 1.2;
    else if (water >= 2) mul *= 1.1;
    mul *= 1 + Math.min(4, farms) * 0.05;
    const amt = Math.round(FARM_YIELD * mul * this.mult(owner, 'gather'));
    this.farmStage[i] = 0;
    this.farmPlanted[i] = -1;
    this.dirtyTiles.add(i);
    return amt;
  }

  /** 回种一块茬地（收割入库后由农夫完成） */
  plantFarm(i: number, owner: number): boolean {
    if (this.farmOwner[i] !== owner || this.farmStage[i] !== 0 || this.farmPlanted[i] >= 0) return false;
    this.farmPlanted[i] = this.time;
    this.farmStage[i] = 1;
    this.dirtyTiles.add(i);
    return true;
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

  canPlace(defId: string, tx: number, ty: number, excludeId?: number): { ok: boolean; reason: string } {
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
      if (u && u.kind === 'unit' && u.id !== excludeId) {
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
    return (cost.wood ?? 0) <= p.res.wood && (cost.food ?? 0) <= p.res.food && (cost.ore ?? 0) <= p.res.ore
      && (cost.gold ?? 0) <= p.gold;
  }

  payCost(owner: number, cost: ResAmount): void {
    const p = this.players[owner];
    p.res.wood -= cost.wood ?? 0;
    p.res.food -= cost.food ?? 0;
    p.res.ore -= cost.ore ?? 0;
    p.gold -= cost.gold ?? 0;
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

  /** 人口：存活单位（按兵种占用权重）+ 排队中的单位 */
  recomputePop(): void {
    for (const owner of [0, 1] as const) {
      let pop = 0, cap = 0;
      for (const e of this.entities.values()) {
        if (e.owner !== owner) continue;
        if (e.kind === 'unit') pop += UNIT_DEFS[e.defId].pop ?? 1;
        else if (e.done) {
          const def = BUILDING_DEFS[e.defId];
          cap += def.popBonus ?? 0;
          if (def.produces) pop += e.queue.length;
        }
      }
      const p = this.players[owner];
      p.pop = pop;
      p.popCap = Math.min(POP_MAX, POP_BASE + cap + (p.edict === 'logistics' ? LOGISTICS_POP : 0));
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

  /** 基地车展开成指挥基地：以车身为圆心螺旋找合法落点（原地优先），返回新HQ（失败=null） */
  deployMCV(mcvId: number): Entity | null {
    const m = this.entities.get(mcvId);
    if (!m || m.kind !== 'unit' || m.defId !== 'mcv') return null;
    const tx0 = Math.round(m.x / TILE - 1.5), ty0 = Math.round(m.y / TILE - 1.5);
    for (let r = 0; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = tx0 + dx, ty = ty0 + dy;
          if (!this.canPlace('hq', tx, ty, mcvId).ok) continue;
          this.entities.delete(m.id);
          const hq = this.spawnBuilding('hq', m.owner, tx, ty, true);
          this.addLog('build', '基地车展开：指挥基地建立', m.owner);
          this.addFx(hq.x, hq.y, 'hit', 26, 0.5);
          return hq;
        }
      }
    }
    return null;
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
