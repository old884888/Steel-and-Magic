import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { MAP_W, MAP_H, TILE, T_ORE, T_TREE } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';
import { standardAIConfig, BASE_BUILD_TARGETS, type AIConfig } from './ai-config';
import { rankProduction } from './ai-priority';
import { takeSnapshot, applyRetreat, applySpareArtillery, findHighGroundNear, counterCompWeights, isRetreating, type AISnapshot, type TacticCtx } from './ai-tactics';
import { tryEnqueue } from './construction';

/** 单位存量上限（性格权重决定"想不想要"，这里是"最多要多少"） */
const UNIT_CAPS: Record<string, number> = { builder: 2, infantry: 10, tank: 6, artillery: 2 };

/**
 * AI指挥官：每 cfg.thinkSec 秒醒来一次。
 * 思考流程：拍局势快照 → 跑启用战术（并行）→ 优先级驱动生产/建造 → 救火 → 波次进攻。
 * 与玩家完全同规则（经济倍率除外，高难度明示在UI），不偷资源。
 */
export class AIController {
  readonly owner: 0 | 1;
  readonly cfg: AIConfig;
  private timer = 0;
  private waveSize: number;
  private waveN = 0;
  private waveActive = false;
  private waveUntil = 0;
  private attackCd: number;

  constructor(owner: 0 | 1, cfg: AIConfig = standardAIConfig()) {
    this.owner = owner;
    this.cfg = cfg;
    this.waveSize = Math.max(2, Math.round(cfg.waveStart * cfg.waveSizeMul));
    this.attackCd = cfg.firstDelay;
  }

  update(w: World, dt: number): void {
    if (w.gameOver) return;
    this.timer -= dt;
    this.attackCd -= dt;
    if (this.timer > 0) return;
    this.timer = this.cfg.thinkSec;
    this.think(w);
  }

  private think(w: World): void {
    const foe = (1 - this.owner) as 0 | 1;
    const snap = takeSnapshot(w, this.owner, foe);
    const hq = snap.myBuildings.find(b => b.defId === 'hq');
    if (!hq) return;

    const ctx: TacticCtx = { w, owner: this.owner, foe, cfg: this.cfg, snap, army: snap.army };
    const army = snap.army;
    const tacticOn = (id: string): boolean => this.cfg.tactics.includes(id as never);

    // ---- 战术模块（并行正交：撤退/保炮车/克制配兵修正） ----
    if (tacticOn('retreat')) applyRetreat(ctx);
    if (tacticOn('spareArtillery')) applySpareArtillery(ctx);
    const compAdj = tacticOn('counterComp') ? counterCompWeights(snap.foeComposition) : {};
    const weightOf = (defId: string): number => (this.cfg.weights[defId] ?? 1) * (compAdj[defId] ?? 1);

    // ---- 生产（优先级驱动：每个生产建筑挑自己能造的最高分单位） ----
    for (const b of snap.myBuildings) {
      if (!b.done) continue;
      const def = BUILDING_DEFS[b.defId];
      if (!def.produces || b.queue.length >= 2) continue;
      const ranked = rankProduction(
        def.produces.map(defId => ({ defId, kind: 'unit' as const, need: 1 })),
        this.cfg.weights,
        id => this.unitNeed(snap, id),
      );
      for (const c of ranked) {
        if (tryEnqueue(w, b, c.defId)) break; // 最高分的排不起就试下一个
      }
    }

    // ---- 建造（优先级驱动 + 找空地，找不到就试次优） ----
    const idleBuilder = snap.myUnits.find(u => u.defId === 'builder' && u.order.kind === 'idle');
    if (idleBuilder) {
      const buildable = UNIT_DEFS['builder'].canBuild ?? [];
      const ranked = rankProduction(
        buildable.map(defId => ({ defId, kind: 'building' as const, need: 1 })),
        this.cfg.weights,
        id => this.buildNeed(snap, id),
      );
      for (const c of ranked) {
        const def = BUILDING_DEFS[c.defId];
        if (!w.canAfford(this.owner, def.cost)) continue;
        const spot = this.findSpot(w, c.defId, hq);
        if (!spot) continue;
        w.payCost(this.owner, def.cost);
        const site = w.spawnBuilding(c.defId, this.owner, spot.tx, spot.ty, false);
        w.issueBuild([idleBuilder.id], site.id);
        break;
      }
    }

    // ---- 救火（围魏救赵：不回防，反打敌方经济逼其回救） ----
    if (snap.threatened) {
      const fighters = army.filter(u => !isRetreating(u, snap.time) && (u.order.kind === 'idle' || u.order.kind === 'attack'));
      if (tacticOn('weiwei') && fighters.length >= 4) {
        const ecoTarget = this.nearestFoeBuilding(w, army, foe, ['lumber', 'mine', 'farm', 'storehouse']);
        const target = ecoTarget ?? this.nearestFoeBuilding(w, army, foe, null);
        if (target) {
          w.issueAttack(fighters.map(u => u.id), target.id);
          w.addLog('military', '围魏救赵：反打敌方经济，逼其回防', this.owner, 'weiwei', 30);
          return;
        }
      }
      // 经典回防
      const near = snap.foeUnits
        .filter(f => dist(f.x, f.y, snap.threatened!.building.x, snap.threatened!.building.y) < 16 * TILE)
        .sort((a, b) =>
          dist(a.x, a.y, snap.threatened!.building.x, snap.threatened!.building.y) -
          dist(b.x, b.y, snap.threatened!.building.x, snap.threatened!.building.y));
      if (near.length > 0 && fighters.length >= 3) {
        w.issueAttack(fighters.map(u => u.id), near[0].id);
        return;
      }
    }

    // ---- 进攻波次 ----
    // 满仓判定：库存触顶意味着经济空转，倾巢而出别憋着（仍受攻击冷却约束，防指令刷屏）
    const storageFull = Math.max(snap.wood, snap.food, snap.ore) >= snap.storageCap - 1;
    const effWaveSize = Math.min(this.waveSize, this.cfg.waveCap);
    const mustPush = storageFull && army.length >= Math.max(4, Math.floor(effWaveSize * 0.6));
    if (this.attackCd <= 0 && (army.length >= effWaveSize || mustPush)) {
      const target = this.pickWaveTarget(w, army, foe, tacticOn('denyMining'));
      if (target) {
        const fighters = army.filter(u => !isRetreating(u, snap.time));
        let usedHighGround = false;
        if (tacticOn('highGround')) {
          const hg = findHighGroundNear(w, target.x, target.y, 3);
          if (hg) {
            w.issueAttackMove(fighters.map(u => u.id), hg);
            usedHighGround = true;
          }
        }
        if (!usedHighGround) {
          if (tacticOn('focusFire')) {
            w.issueAttack(fighters.map(u => u.id), target.id); // 全军同一目标
          } else {
            for (const u of fighters) {
              const near = this.nearestFoeFrom(w, u, foe);
              if (near) w.issueAttack([u.id], near.id); // 各打各的（无集火）
            }
          }
        }
        this.waveN++;
        const tName = BUILDING_DEFS[target.defId]?.name ?? UNIT_DEFS[target.defId].name;
        w.addLog('military',
          `第${this.waveN}波进攻发起（兵力${fighters.length}${mustPush ? '，满仓总攻' : ''}，目标：${tName}${usedHighGround ? '，抢占高地' : ''}）`,
          this.owner);
        this.waveSize += this.cfg.waveGrow;
        // 满仓总攻用短冷却（8秒）保持压力；普通波次按性格/难度间隔
        this.attackCd = mustPush ? 8 : this.cfg.waveInterval * this.cfg.attackCdMul;
        this.waveActive = true;
        this.waveUntil = w.time + 45;
      }
    }

    // ---- 波次续攻：窗口内打了目标就散的家伙，就地就近续靶 ----
    if (this.waveActive) {
      if (w.time > this.waveUntil) {
        this.waveActive = false;
      } else {
        for (const u of army) {
          if (isRetreating(u, snap.time)) continue;
          if (u.order.kind === 'idle') {
            const t = this.nearestFoeFrom(w, u, foe);
            if (t) w.issueAttack([u.id], t.id);
          }
        }
      }
    }
  }

  /** 单位生产缺口系数（排行用）：存量越少分越高；到顶直接归零（从候选池剔除，防刷屏） */
  private unitNeed(snap: AISnapshot, defId: string): number {
    const cap = UNIT_CAPS[defId] ?? 2;
    let count = snap.myUnits.reduce((n, u) => n + (u.defId === defId ? 1 : 0), 0);
    count += snap.myBuildings.reduce((n, bb) => n + bb.queue.reduce((m, q) => m + (q.unitId === defId ? 1 : 0), 0), 0);
    if (count >= cap) return 0;
    return (cap - count) / cap + 0.25;
  }

  /** 建筑建造缺口系数：到顶归零（防无限套娃）；经济建筑按真实缺口打分 */
  private buildNeed(snap: AISnapshot, defId: string): number {
    const target = Math.ceil((BASE_BUILD_TARGETS[defId] ?? 2) * (this.cfg.targetMul[defId] ?? 1));
    const count = snap.myBuildings.reduce((n, b) => n + (b.defId === defId ? 1 : 0), 0);
    if (count >= target) return 0; // 到顶：直接剔除候选池
    switch (defId) {
      case 'storehouse': {
        // 只有真满仓才值得盖仓库，平时压到最低分（防"仓库成瘾"）
        const pressure = Math.max(snap.wood, snap.food, snap.ore) / snap.storageCap;
        return pressure > 0.75 ? 1.5 + pressure : 0.05;
      }
      case 'farm': {
        // 食物是万金油材料：断粮/人口紧张时高优先
        const foodStarving = snap.incomeFood < 0.35 && snap.food < 80;
        return (snap.popCap - snap.pop < 5 || foodStarving) ? 2.4 : snap.pop / Math.max(1, snap.popCap) + 0.2;
      }
      case 'lumber':
        return snap.incomeWood < 0.4 ? 1.6 : 0.8;
      case 'mine':
        return 0.9;
      case 'barracks':
        return count === 0 ? 1.5 : 0.7;
      case 'factory':
        return snap.myBuildings.some(b => b.defId === 'barracks' && b.done) ? 1.2 : 0.05;
      case 'turret':
        return 0.5;
      default:
        return 0.5;
    }
  }

  /** 波次选靶：军团质心最近的敌方目标（基地加权，断矿流给经济建筑加权） */
  private pickWaveTarget(w: World, army: Entity[], foe: 0 | 1, denyMining: boolean): Entity | null {
    let cx = 0, cy = 0;
    for (const u of army) { cx += u.x; cy += u.y; }
    cx /= army.length; cy /= army.length;
    let best: Entity | null = null, bestScore = Infinity;
    for (const o of w.entities.values()) {
      if (o.owner !== foe) continue;
      let score = dist(cx, cy, o.x, o.y);
      if (o.defId === 'hq') score *= 1.3;
      if (denyMining && (o.defId === 'lumber' || o.defId === 'mine' || o.defId === 'farm' || o.defId === 'storehouse')) score *= 0.55;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    return best;
  }

  private nearestFoeFrom(w: World, u: Entity, foe: 0 | 1): Entity | null {
    let best: Entity | null = null, bestD = Infinity;
    for (const o of w.entities.values()) {
      if (o.owner !== foe) continue;
      const d = dist(u.x, u.y, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  private nearestFoeBuilding(w: World, army: Entity[], foe: 0 | 1, roles: string[] | null): Entity | null {
    let cx = 0, cy = 0;
    for (const u of army) { cx += u.x; cy += u.y; }
    cx /= army.length; cy /= army.length;
    let best: Entity | null = null, bestD = Infinity;
    for (const o of w.entities.values()) {
      if (o.owner !== foe || o.kind !== 'building') continue;
      if (roles && !roles.includes(BUILDING_DEFS[o.defId].aiRole ?? '')) continue;
      const d = dist(cx, cy, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  /** 找建造位置：矿场找矿脉、伐木找树丛、普通建筑绕HQ螺旋 */
  private findSpot(w: World, defId: string, hq: Entity): { tx: number; ty: number } | null {
    const def = BUILDING_DEFS[defId];
    if (def.needOre) {
      const cands: { tx: number; ty: number; d: number }[] = [];
      for (let y = 1; y < MAP_H - 2; y++) {
        for (let x = 1; x < MAP_W - 2; x++) {
          if (w.terrain[y * MAP_W + x] === T_ORE) {
            cands.push({ tx: x, ty: y, d: dist(hq.x, hq.y, (x + 1) * TILE, (y + 1) * TILE) });
          }
        }
      }
      cands.sort((a, b) => a.d - b.d);
      for (const c of cands) {
        for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]] as const) {
          if (w.canPlace(defId, c.tx + dx, c.ty + dy).ok) return { tx: c.tx + dx, ty: c.ty + dy };
        }
      }
      return null;
    }
    if (def.needTrees) {
      const cands: { tx: number; ty: number; d: number }[] = [];
      for (let y = 3; y < MAP_H - 3; y++) {
        for (let x = 3; x < MAP_W - 3; x++) {
          if (w.terrain[y * MAP_W + x] === T_TREE) {
            const d = dist(hq.x, hq.y, (x + 0.5) * TILE, (y + 0.5) * TILE);
            cands.push({ tx: x, ty: y, d });
          }
        }
      }
      cands.sort((a, b) => a.d - b.d);
      for (const c of cands.slice(0, 60)) {
        for (let dy = -3; dy <= 0; dy++) {
          for (let dx = -3; dx <= 0; dx++) {
            if (w.canPlace(defId, c.tx + dx, c.ty + dy).ok) return { tx: c.tx + dx, ty: c.ty + dy };
          }
        }
      }
      return null;
    }
    for (let r = 3; r <= 16; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = hq.tx + 1 + dx, ty = hq.ty + 1 + dy;
          if (w.canPlace(defId, tx, ty).ok) return { tx, ty };
        }
      }
    }
    return null;
  }
}
