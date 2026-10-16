import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { MAP_W, MAP_H, TILE, T_ORE, T_TREE } from '../config';
import { dist } from '../engine/spatialHash';
import type { World } from './world';
import type { Entity } from './entity';
import { standardAIConfig, BASE_BUILD_TARGETS, RESEARCH_QUEUES, KINGDOM_RANK_WEIGHTS, type AIConfig } from './ai-config';
import type { EdictId } from '../data/policies';
import { rankProduction } from './ai-priority';
import { takeSnapshot, applyRetreat, applySpareArtillery, findHighGroundNear, counterCompWeights, isRetreating, type AISnapshot, type TacticCtx } from './ai-tactics';
import { tryEnqueue } from './construction';

/** 王国→联邦 defId 别名：AI决策表（caps/打分switch/队列）按联邦键索引，王国单位经此归一 */
export const KINGDOM_ALIAS: Record<string, string> = {
  lifeTree: 'hq', palaceCart: 'mcv', serf: 'builder',
  orchard: 'farm', lumberShed: 'lumber', silverMine: 'mine',
  granary: 'storehouse', sageTower: 'lab', warHall: 'barracks',
  magicWorkshop: 'factory', magicChariot: 'tank', cyclops: 'infantry',
  mage: 'artillery', ballista: 'artillery', griffin: 'helicopter',
  flameRoc: 'bomber', dragon: 'mech', thornTower: 'turret',
  windTower: 'aaTurret', vineMortar: 'artTurret', thornWall: 'wall',
  wardStone: 'shieldGen', worldSapling: 'monument',
};
const normId = (defId: string): string => KINGDOM_ALIAS[defId] ?? defId;

/** 单位存量上限（性格权重决定"想不想要"，这里是"最多要多少"） */
const UNIT_CAPS: Record<string, number> = { builder: 2, infantry: 10, tank: 6, artillery: 2, mcv: 0 }; // 额外基地车：玩家侧专属，AI暂不采用

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
  private lastBuy = 0;              // 上次断粮买食时间（30秒一次）
  private kingdom = false;          // 王国阵营：权重表/科研队列走王国键
  private kWeights: Record<string, number> | null = null;

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
    if (!this.kingdom) this.kingdom = w.players[this.owner].faction === 'kingdom';
    if (this.kingdom && !this.kWeights) {
      this.kWeights = KINGDOM_RANK_WEIGHTS[this.cfg.personalityId] ?? {};
    }

    // ---- 基地车未展开=最高优先级：就近展开，绝不游走（展开前不搞任何建设） ----
    const myHq = snap.myBuildings.find(b => BUILDING_DEFS[b.defId].isMain && b.done);
    if (!myHq) {
      this.handleNoHq(w, snap);
      return;
    }
    const hq = myHq;

    const ctx: TacticCtx = { w, owner: this.owner, foe, cfg: this.cfg, snap, army: snap.army };
    const army = snap.army;
    const tacticOn = (id: string): boolean => this.cfg.tactics.includes(id as never);

    // ---- 法令与科研（性格驱动，与玩家完全同规则） ----
    const me = w.players[this.owner];
    const wantEdict: EdictId = this.cfg.personalityId === 'rusher' ? 'military'
      : this.cfg.personalityId === 'turtler' ? 'engineering'
      : this.cfg.personalityId === 'eco' ? 'economy'
      : (w.time > 480 ? 'military' : 'economy'); // 均衡：前期种田，8分钟后转军事
    if (me.edict !== wantEdict && me.edictCd <= 0) w.setEdict(this.owner, wantEdict);
    if (!me.research) {
      // 纪元节奏（性格驱动）：种田快升、均衡中速、乌龟慢升、莽夫不升
      const eraAt: [number, number] = this.cfg.personalityId === 'eco' ? [240, 420]
        : this.cfg.personalityId === 'turtler' ? [420, 700]
        : this.cfg.personalityId === 'balanced' ? [360, 600]
        : [Infinity, Infinity];
      const nextEra: string | null = me.era === 0 && w.time >= eraAt[0] ? 'industrial'
        : me.era === 1 && w.time >= eraAt[1] ? 'steel' : null;
      if (nextEra) {
        w.startResearch(this.owner, nextEra); // 纪元优先占用科研线
      } else {
        const next = RESEARCH_QUEUES[this.cfg.personalityId].find(id => !me.techs.includes(id));
        if (next) w.startResearch(this.owner, next);
      }
    }
    // ---- 商路：有商贸站就补商队（上限3/站）；断粮买食应急 ----
    const myPosts = snap.myBuildings.filter(b => b.defId === 'tradePost' && b.done);
    if (myPosts.length > 0) {
      const caravans = snap.myUnits.filter(u => u.defId === 'caravan').length;
      if (caravans < myPosts.length * 3 && w.canAfford(this.owner, { food: 30 })) {
        w.hireCaravan(myPosts[caravans % myPosts.length].id);
      }
      if (snap.food < 80 && me.gold >= 70 && w.time - this.lastBuy > 30) {
        if (w.marketBuy(this.owner, 'food')) this.lastBuy = w.time;
      }
    }

    // ---- 岗位补员（v0.18 最小兼容层，非§五仲裁）----
    // 优先序（§5.1）：农活随时补（食物=兵籍命脉）；其余岗位与征兵共享"待业>3"储备线
    if (me.residents > 0) {
      const wantJobs: string[] = [];
      for (const b of snap.myBuildings) {
        if (!b.done) continue;
        const jobs = BUILDING_DEFS[b.defId].jobs;
        if (!jobs) continue;
        const staff = b.staffIds?.length ?? 0;
        for (let i = staff; i < jobs.slots; i++) wantJobs.push(b.id + '');
      }
      wantJobs.sort((a, b) => {
        const ja = BUILDING_DEFS[w.entities.get(Number(a))!.defId].jobs!.kind;
        const jb = BUILDING_DEFS[w.entities.get(Number(b))!.defId].jobs!.kind;
        const pri = (k: string) => (k === 'farmer' ? 0 : k === 'lumberjack' ? 1 : k === 'miner' ? 2 : 3);
        return pri(ja) - pri(jb);
      });
      while (wantJobs.length > 0) {
        const id = Number(wantJobs.shift());
        const host = w.entities.get(id);
        const kind = host ? BUILDING_DEFS[host.defId].jobs?.kind : undefined;
        const gate = (kind === 'farmer' || kind === 'lumberjack') ? 0 : 3; // 农活/伐木=内政地基随时补；矿工搬运工走储备线
        if (me.residents <= gate) break;
        if (!w.assignJob(id)) break;
      }
    }

    // ---- 战术模块（并行正交：撤退/保炮车/克制配兵修正） ----
    if (tacticOn('retreat')) applyRetreat(ctx);
    if (tacticOn('spareArtillery')) applySpareArtillery(ctx);
    const compAdj = tacticOn('counterComp') ? counterCompWeights(snap.foeComposition) : {};
    // 反装甲配兵（克制配兵延伸）：敌重甲占比>25% 且 己方破甲<15% → 破甲单位权重×2
    const effWeights = { ...this.cfg.weights };
    if (snap.foeHeavyShare > 0.25 && snap.myPierceShare < 0.15) {
      for (const id of Object.keys(UNIT_DEFS)) {
        if (UNIT_DEFS[id].weapon?.pierce) effWeights[id] = (effWeights[id] ?? 1) * 2;
      }
    }
    const weightOf = (defId: string): number => (this.cfg.weights[defId] ?? 1) * (compAdj[defId] ?? 1);

    // ---- 生产（优先级驱动：每个生产建筑挑自己能造的最高分单位） ----
    for (const b of snap.myBuildings) {
      if (!b.done) continue;
      const def = BUILDING_DEFS[b.defId];
      if (!def.produces || b.queue.length >= 2) continue;
      const ranked = rankProduction(
        def.produces.map(defId => ({ defId, kind: 'unit' as const, need: 1 })),
        effWeights,
        id => this.unitNeed(snap, id),
      );
      for (const c of ranked) {
        // 储备滞回（§5.1规则2）：待业≤3禁征新兵——经济抽干了谁都赢不了
        if ((UNIT_DEFS[c.defId].crew ?? 0) > 0 && me.residents < 4) continue;
        if (tryEnqueue(w, b, c.defId)) break; // 最高分的排不起就试下一个
      }
    }

    // ---- 建造（优先级驱动 + 找空地，找不到就试次优） ----
    const idleBuilder = snap.myUnits.find(u => u.defId === 'builder' && u.order.kind === 'idle');
    if (idleBuilder) {
      // 从建造师脚下洪泛出可达集：工地必须建在"走得到"的地方（防把建造师锁死在孤岛上）
      const reach = this.reachSet(w, idleBuilder);
      if (reach) {
        const buildable = UNIT_DEFS['builder'].canBuild ?? [];
        const ranked = rankProduction(
          buildable.map(defId => ({ defId, kind: 'building' as const, need: 1 })),
          this.cfg.weights,
          id => this.buildNeed(snap, id),
        );
        for (const c of ranked) {
          const def = BUILDING_DEFS[c.defId];
          if (!w.canAfford(this.owner, def.cost)) continue;
          const spot = this.findSpot(w, c.defId, hq, reach);
          if (!spot) continue;
          w.payCost(this.owner, def.cost);
          const site = w.spawnBuilding(c.defId, this.owner, spot.tx, spot.ty, false);
          w.issueBuild([idleBuilder.id], site.id);
          break;
        }
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

    // ---- 反奇观：敌方纪念碑落成/过半 → 全军强拆（最高优先，冷却压到8秒） ----
    const foeMon = [...w.entities.values()].find(e => e.owner === foe && BUILDING_DEFS[e.defId]?.wonder && (e.done || e.progress >= 0.5));
    if (foeMon && army.length >= 3) {
      const fighters = army.filter(u => !isRetreating(u, snap.time));
      if (fighters.length >= 3) {
        w.issueAttack(fighters.map(u => u.id), foeMon.id);
        this.attackCd = 8;
        w.addLog('military', '敌方奇观即将落成——全军强拆，义不容辞！', this.owner, 'anti-monument', 20);
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

  /** 无主堡=基地车还没展开：螺旋找合法落点，原地可开就展开；需挪窝只下一次移动指令（防游走） */
  private handleNoHq(w: World, snap: AISnapshot): void {
    const vehicle = snap.myUnits.find(u => u.defId === 'mcv' || u.defId === 'palaceCart');
    if (!vehicle) return; // 车和主堡都没了：等战败判定
    const into = UNIT_DEFS[vehicle.defId]?.deploysInto ?? 'hq';
    for (let r = 0; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = Math.round(vehicle.x / TILE) - 1 + dx;
          const ty = Math.round(vehicle.y / TILE) - 1 + dy;
          if (!w.canPlace(into, tx, ty, vehicle.id).ok) continue;
          // 落点在脚下（格线取整±1格误差内）：直接展开，杜绝原地空转
          const cDist = Math.hypot(vehicle.x - (tx + 1.5) * TILE, vehicle.y - (ty + 1.5) * TILE);
          if (cDist <= TILE * 1.2) { w.deployMCV(vehicle.id); return; }
          // 需要挪窝：目标点已在路上就绝不下新指令（防反复寻路游走）
          const target = { x: (tx + 1.5) * TILE, y: (ty + 1.5) * TILE };
          const movingThere = vehicle.order.kind === 'move' && vehicle.order.target &&
            Math.hypot(vehicle.order.target.x - target.x, vehicle.order.target.y - target.y) < 8;
          if (!movingThere) w.issueMove([vehicle.id], target);
          return;
        }
      }
    }
    // 半径4格全无合法落点（极端地形）：原地兜底展开（deployMCV内部r<=2再找）
    w.deployMCV(vehicle.id);
  }

  /** 阵营权重表：王国AI用王国键权重（兽潮/守林/德鲁伊），联邦AI用自身表 */
  private rankWeights(): Record<string, number> {
    if (this.kingdom && this.kWeights) return this.kWeights;
    return this.cfg.weights;
  }

  /** 单位生产缺口系数（排行用）：存量越少分越高；到顶直接归零（从候选池剔除，防刷屏） */
  private unitNeed(snap: AISnapshot, defId: string): number {
    const cap = UNIT_CAPS[normId(defId)] ?? 2;
    let count = snap.myUnits.reduce((n, u) => n + (u.defId === defId ? 1 : 0), 0);
    count += snap.myBuildings.reduce((n, bb) => n + bb.queue.reduce((m, q) => m + (q.unitId === defId ? 1 : 0), 0), 0);
    if (count >= cap) return 0;
    return (cap - count) / cap + 0.25;
  }

  /** 建筑建造缺口系数：到顶归零（防无限套娃）；经济建筑按真实缺口打分 */
  private buildNeed(snap: AISnapshot, defId: string): number {
    const nid = normId(defId);
    const target = Math.ceil((BASE_BUILD_TARGETS[nid] ?? 2) * (this.cfg.targetMul[nid] ?? 1));
    const count = snap.myBuildings.reduce((n, b) => n + (b.defId === defId ? 1 : 0), 0);
    if (count >= target) return 0; // 到顶：直接剔除候选池
    switch (defId) {
      case 'storehouse': {
        // 只有真满仓才值得盖仓库，平时压到最低分（防"仓库成瘾"）
        const pressure = Math.max(snap.wood, snap.food, snap.ore) / snap.storageCap;
        return pressure > 0.75 ? 1.5 + pressure : 0.05;
      }
      case 'house': {
        // 民居：人口水位跟着盖（在建工地也占容量，防开局全砸民房工地）
        const pending = snap.myBuildings.filter(b => b.defId === 'house' && !b.done).length;
        const capWithSites = snap.popCap + pending * 5;
        const ratio = snap.pop / Math.max(1, capWithSites);
        return snap.pop >= capWithSites ? 2.6 : ratio > 0.6 ? 1.4 : 0.35;
      }
      case 'waterStation':
      case 'clinic': {
        // 卫生：有民居没卫生 → 民心四成权重在漏
        const hasHouse = snap.myBuildings.some(b => b.defId === 'house' && b.done);
        if (!hasHouse) return 0.05;
        return count === 0 ? 1.2 : 0.4;
      }
      case 'farm': {
        // 食物是兵籍命脉：第一座农庄=食物收入的门票（库存高也要盖）；断粮紧急
        if (snap.food < 80) return 2.4;
        if (count === 0) return 2.0;
        return count < 3 ? 1.4 : snap.pop / Math.max(1, snap.popCap) > 0.5 ? 1.0 : 0.5;
      }
      case 'lumber':
        return snap.wood < 120 ? 1.8 : 1.0;
      case 'mine':
        return snap.ore < 80 ? 1.6 : 0.9;
      case 'barracks':
        return count === 0 ? 1.5 : 0.7;
      case 'factory':
        // 兵营建成后备战升级要趁早（否则永远被农场/仓库插队）
        return snap.myBuildings.some(b => b.defId === 'barracks' && b.done) ? 1.5 : 0.05;
      case 'lab':
        // 开局不急着研究：2.5分钟后想要一座（种田/乌龟性格靠weights加码）
        return count === 0 ? (snap.time > 150 ? 1.8 : 0.05) : 0;
      case 'tradePost':
        // 商贸站：1分钟后就想盖（种田性格靠weights加码），上限2座
        return count >= 2 ? 0 : (snap.time > 60 ? 1.3 : 0.4);
      case 'monument':
        // 奇观：钢铁纪元解锁后盖（era门槛就是硬闸）
        return snap.era >= 2 && count === 0 ? 2.5 : 0;
      case 'turret':
        return snap.threatened ? 1.2 : 0.3; // 没人打你别修炮塔（穷）
      case 'wall':
        return snap.threatened ? 0.8 : 0.1; // 太平年间砌墙=浪费木头
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

  /** 从单位所在格高度感知洪泛，返回可达可站格集合（建造选址用） */
  private reachSet(w: World, from: Entity): Set<number> | null {
    const start = Math.floor(from.y / TILE) * MAP_W + Math.floor(from.x / TILE);
    if (start < 0 || start >= MAP_W * MAP_H || !w.walkable[start]) return null;
    const seen = new Set<number>([start]);
    const stack: number[] = [start];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const ni = ny * MAP_W + nx;
        if (!seen.has(ni) && w.canStand(cur, ni)) { seen.add(ni); stack.push(ni); }
      }
    }
    return seen;
  }

  /** 找建造位置：矿场找矿脉、伐木找树丛、普通建筑绕HQ螺旋；reach给定时要求足迹至少一格可达 */
  private findSpot(w: World, defId: string, hq: Entity, reach?: Set<number>): { tx: number; ty: number } | null {
    const def = BUILDING_DEFS[defId];
    const okSpot = (tx: number, ty: number): boolean => {
      if (!w.canPlace(defId, tx, ty).ok) return false;
      if (!reach) return true;
      // 足迹本身会变成建筑（不可通行），必须要求足迹外一圈至少一格可达
      for (let dy = -1; dy <= def.size; dy++) {
        for (let dx = -1; dx <= def.size; dx++) {
          const edge = dx < 0 || dy < 0 || dx >= def.size || dy >= def.size;
          if (!edge) continue;
          const x = tx + dx, y = ty + dy;
          if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
          if (reach.has(y * MAP_W + x)) return true;
        }
      }
      return false;
    };
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
          if (okSpot(c.tx + dx, c.ty + dy)) return { tx: c.tx + dx, ty: c.ty + dy };
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
            if (okSpot(c.tx + dx, c.ty + dy)) return { tx: c.tx + dx, ty: c.ty + dy };
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
          if (okSpot(tx, ty)) return { tx, ty };
        }
      }
    }
    return null;
  }
}
