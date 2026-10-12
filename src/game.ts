import { TILE, MAP_W, MAP_H, OWNER_PLAYER, OWNER_ENEMY, SIM_DT, T_TREE, T_ORE, FARM_COST_WOOD } from './config';
import type { Faction } from './types';
import { UNIT_DEFS } from './data/units';
import { BUILDING_DEFS } from './data/buildings';
import type { Entity } from './sim/entity';
import { Camera } from './engine/camera';
import { Input } from './engine/input';
import { GameLoop } from './engine/loop';
import { dist } from './engine/spatialHash';
import { World } from './sim/world';
import type { MapVariant } from './sim/mapgen';

function readMapVariant(): MapVariant {
  try {
    const m = localStorage.getItem('sm_map');
    if (m === 'islands' || m === 'random') return m;
    return 'standard';
  } catch {
    return 'standard';
  }
}
import { simTick } from './sim/tick';
import { AIController } from './sim/ai';
import { resolveEnemyAIConfig } from './sim/ai-config';
import { updateFog, isVisible } from './sim/fog';
import { Renderer, type PlacementView } from './render/renderer';
import { Minimap } from './render/minimap';
import { HUD } from './ui/hud';

/** 总胶水：持有世界/相机/输入/渲染/HUD，每帧驱动 */
export class Game {
  world: World;
  cam = new Camera();
  input: Input;
  renderer: Renderer;
  minimap: Minimap;
  hud: HUD;
  loop: GameLoop;

  selection = new Set<number>();
  placement: { defId: string; view: PlacementView | null } | null = null;
  groups = new Map<number, Set<number>>();   // Ctrl+数字编队
  attackMoveMode = false;
  aiEnemy: AIController;
  aiPlayer: AIController | null = null; // selftest 时给玩家也配AI
  private gameShown = false;

  constructor(private canvas: HTMLCanvasElement) {
    const mapVariant = readMapVariant();
    this.world = new World(undefined, mapVariant);
    this.renderer = new Renderer(canvas, this.world);
    updateFog(this.world);
    this.aiEnemy = new AIController(OWNER_ENEMY, resolveEnemyAIConfig());
    this.world.players[OWNER_ENEMY].incomeMul = this.aiEnemy.cfg.economyMul;

    this.input = new Input(canvas, this.cam, {
      onClickSelect: (pos, additive) => this.clickSelect(pos, additive),
      onBoxSelect: (a, b, additive) => this.boxSelect(a, b, additive),
      onContext: (pos) => this.contextOrder(pos),
      onPlacementClick: (pos) => this.placeAt(pos),
      onAttackMoveClick: (pos) => this.attackMoveAt(pos),
      onDoubleClickSelect: (pos) => this.doubleClickSelect(pos),
      onHotkey: (k) => this.handleHotkey(k),
      onPaintCommit: (a, b) => this.paintFarms(a, b),
      onCancel: () => { this.placement = null; },
    });

    this.hud = new HUD(this);
    this.minimap = new Minimap(
      document.getElementById('minimap') as HTMLCanvasElement,
      this.world, this.cam,
      (wx, wy) => this.cam.jumpTo(wx, wy),
    );

    // 开局镜头对准主堡/基地车（findMain 兼容双阵营）
    const start = this.world.findMain(OWNER_PLAYER);
    if (start) this.cam.jumpTo(start.x, start.y);

    this.loop = new GameLoop(
      (dt) => this.simStep(dt),
      () => this.renderFrame(),
    );

    // 关页/切后台兜底：日志立刻落盘，下次打开随时可查
    const flushLog = () => this.world.log.maybeFlush(true);
    window.addEventListener('pagehide', flushLog);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushLog(); });
  }

  // ================= 模拟 =================

  private simStep(dt: number): void {
    simTick(this.world, dt, [this.aiPlayer, this.aiEnemy]);
    this.world.log.maybeFlush(); // 日志节流落盘（内部5秒一写）
    this.renderer.patchDirty();
    for (const i of this.world.dirtyTiles) this.minimap.patchTile(i);
    if (this.world.gameOver !== 0 && !this.gameShown) {
      this.gameShown = true;
      this.world.log.maybeFlush(true); // 终局日志立刻落盘
      this.hud.showGameOver(this.world.gameOver === 1, this.world.time, this.world.lastVictory);
    }
  }

  private renderFrame(): void {
    // 键盘平移 + 屏幕边缘滚屏（光标贴边等同方向键）
    const axis = this.input.panAxis();
    const edge = this.input.edgePanAxis();
    const px = axis.x + edge.x, py = axis.y + edge.y;
    if (px !== 0 || py !== 0) {
      const speed = 520 / this.cam.zoom * SIM_DT * 3;
      this.cam.pan(px * speed, py * speed);
    }
    // 铺设拖框的格范围（渲染层画预览）
    let paintTiles: { x0: number; y0: number; x1: number; y1: number } | null = null;
    if (this.input.paintMode && this.input.paintRect) {
      const r = this.input.paintRect;
      const wa = this.cam.screenToWorld(Math.min(r.ax, r.bx), Math.min(r.ay, r.by));
      const wb = this.cam.screenToWorld(Math.max(r.ax, r.bx), Math.max(r.ay, r.by));
      paintTiles = {
        x0: Math.max(0, Math.floor(wa.x / TILE)), y0: Math.max(0, Math.floor(wa.y / TILE)),
        x1: Math.min(MAP_W - 1, Math.floor(wb.x / TILE)), y1: Math.min(MAP_H - 1, Math.floor(wb.y / TILE)),
      };
    }
    // 放置幽灵实时校验
    let placementView: PlacementView | null = null;
    if (this.placement) {
      const def = BUILDING_DEFS[this.placement.defId];
      const w = this.cam.screenToWorld(this.input.cur.x, this.input.cur.y);
      const tx = Math.round(w.x / TILE - def.size / 2);
      const ty = Math.round(w.y / TILE - def.size / 2);
      const r = this.world.canPlace(this.placement.defId, tx, ty);
      placementView = { defId: this.placement.defId, tx, ty, valid: r.ok, reason: r.reason };
      this.placement.view = placementView;
    }
    this.renderer.render(this.cam, this.selection, placementView, this.input.dragBox, paintTiles);
    this.minimap.draw();
    this.hud.update(SIM_DT * 3);
  }

  // ================= 选择 =================

  private clickSelect(pos: { x: number; y: number }, additive: boolean): void {
    const e = this.world.pickAt(pos.x, pos.y);
    if (!additive) this.selection.clear();
    if (e && (e.owner === OWNER_PLAYER || isVisible(this.world, OWNER_PLAYER, e.x, e.y))) {
      if (additive && this.selection.has(e.id)) this.selection.delete(e.id);
      else this.selection.add(e.id);
    }
  }

  private boxSelect(a: { x: number; y: number }, b: { x: number; y: number }, additive: boolean): void {
    const wa = this.cam.screenToWorld(Math.min(a.x, b.x), Math.min(a.y, b.y));
    const wb = this.cam.screenToWorld(Math.max(a.x, b.x), Math.max(a.y, b.y));
    const found: number[] = [];
    for (const e of this.world.entities.values()) {
      if (e.owner !== OWNER_PLAYER) continue;
      if (e.kind === 'unit') {
        if (e.x >= wa.x && e.x <= wb.x && e.y >= wa.y && e.y <= wb.y) found.push(e.id);
      } else if (e.kind === 'building' && e.done) {
        // 建筑：中心点入框即选（支持框选多座同类型建筑批量生产）
        const c = e.center();
        if (c.x >= wa.x && c.x <= wb.x && c.y >= wa.y && c.y <= wb.y) found.push(e.id);
      }
    }
    if (!additive) this.selection.clear();
    for (const id of found) this.selection.add(id);
  }

  // ================= 指令 =================

  private contextOrder(pos: { x: number; y: number }): void {
    // 选中生产建筑（且无部队）时：右键=快速设置集结点
    if (this.liveUnitIds().length === 0) {
      const bsel = [...this.selection].filter(id => {
        const e = this.world.entities.get(id);
        return e?.kind === 'building' && e.done && !!BUILDING_DEFS[e.defId].produces;
      });
      if (bsel.length > 0) {
        for (const id of bsel) {
          const b = this.world.entities.get(id)!;
          b.rally = { x: pos.x, y: pos.y };
        }
        this.world.addFx(pos.x, pos.y, 'mark', 0, 1.2, undefined, '⚑ 集结', '#7dc4ff');
        this.hud.toast(`集结点已设置（${bsel.length}座建筑）`);
        return;
      }
    }

    const ids = [...this.selection].filter(id => {
      const e = this.world.entities.get(id);
      return e?.kind === 'unit' && e.owner === OWNER_PLAYER;
    });
    if (ids.length === 0) return;

    // 攻击：点在敌人身上
    const target = this.world.pickAt(pos.x, pos.y);
    if (target && target.owner !== OWNER_PLAYER && isVisible(this.world, OWNER_PLAYER, target.x, target.y)) {
      this.world.issueAttack(ids, target.id);
      this.renderer.attackMarks.set(target.id, this.world.time + 3); // 攻击标记3秒
      this.hud.toast('进攻目标锁定');
      return;
    }
    // 建造/修理：点在己方建筑
    if (target && target.owner === OWNER_PLAYER && target.kind === 'building') {
      const hasBuilder = ids.some(id => UNIT_DEFS[this.world.entities.get(id)!.defId].canBuild);
      const def = BUILDING_DEFS[target.defId];
      if (hasBuilder && (!target.done || target.hp < def.hp)) {
        this.world.issueBuild(ids, target.id);
        this.hud.toast(target.done ? '工程车开始修理' : '工程车前往施工');
        return;
      }
    }
    // 人工采集：点在树上砍树、点在矿上挖矿（工程车）
    const tx = Math.floor(pos.x / TILE), ty = Math.floor(pos.y / TILE);
    const tileIdx = ty * MAP_W + tx;
    const gatherers = ids.filter(id => UNIT_DEFS[this.world.entities.get(id)!.defId].gather);
    if (gatherers.length > 0 && tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H) {
      const t = this.world.terrain[tileIdx];
      if (t === T_TREE) {
        this.world.issueGather(gatherers, tileIdx, 'wood');
        this.hud.toast(`开工砍树（${gatherers.length}辆工程车）`);
        return;
      }
      if (t === T_ORE) {
        this.world.issueGather(gatherers, tileIdx, 'ore');
        this.hud.toast(`开工采矿（${gatherers.length}辆工程车）`);
        return;
      }
    }
    // 默认移动 + 落点标识
    this.world.issueMove(ids, pos);
    this.world.addFx(pos.x, pos.y, 'mark', 0, 1.2, undefined, '➤ 移动', '#7dff7d');
  }

  startAttackMoveHint(): void { void 0; }

  // ================= 快捷键与编队 =================

  private liveUnitIds(): number[] {
    return [...this.selection].filter(id => {
      const e = this.world.entities.get(id);
      return !!e && e.kind === 'unit' && e.owner === OWNER_PLAYER;
    });
  }

  private handleHotkey(k: string): void {
    if (k === 'a') {
      // 攻击移动：需有部队选中
      if (this.liveUnitIds().length === 0) return;
      this.input.placementMode = false;
      this.placement = null;
      this.input.attackMoveMode = true;
      this.hud.toast('攻击移动：左键指定目标点，右键取消');
    } else if (k === 's') {
      const ids = this.liveUnitIds();
      if (ids.length > 0) { this.world.issueStop(ids); this.hud.toast('停止'); }
    } else if (k === 'h') {
      const ids = this.liveUnitIds();
      if (ids.length > 0) { this.world.issueHold(ids); this.hud.toast('原地驻守'); }
    } else if (/^[1-9]$/.test(k)) {
      const n = Number(k);
      const group = this.groups.get(n);
      if (group) {
        // 只保留活着的
        this.selection.clear();
        for (const id of group) {
          const e = this.world.entities.get(id);
          if (e && e.kind === 'unit' && e.owner === OWNER_PLAYER) this.selection.add(id);
        }
        if (this.selection.size > 0) this.hud.toast(`选中编队${n}`);
      }
    } else if (k.startsWith('ctrl+')) {
      const n = Number(k.slice(5));
      const ids = this.liveUnitIds();
      if (ids.length > 0) {
        this.groups.set(n, new Set(ids));
        this.hud.toast(`编队${n}已设置（${ids.length}个单位）`);
      }
    }
  }

  /** 双击：选中屏幕内所有同类（单位或建筑） */
  private doubleClickSelect(pos: { x: number; y: number }): void {
    const picked = this.world.pickAt(pos.x, pos.y);
    if (!picked || picked.owner !== OWNER_PLAYER) return;
    // 屏幕四角反推世界范围
    const c0 = this.cam.screenToWorld(0, 0);
    const c1 = this.cam.screenToWorld(this.cam.viewW, this.cam.viewH);
    const x0 = Math.min(c0.x, c1.x), x1 = Math.max(c0.x, c1.x);
    const y0 = Math.min(c0.y, c1.y), y1 = Math.max(c0.y, c1.y);
    this.selection.clear();
    for (const e of this.world.entities.values()) {
      if (e.owner !== OWNER_PLAYER || e.defId !== picked.defId) continue;
      if (e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1) this.selection.add(e.id);
    }
    if (picked.kind === 'unit' && this.selection.size > 0) {
      this.hud.toast(`已选中屏幕内全部${UNIT_DEFS[picked.defId].name}（${this.selection.size}个）`);
    } else if (this.selection.size > 1) {
      this.hud.toast(`已选中屏幕内全部${picked.defId === 'hq' ? '指挥基地' : '同类建筑'}（${this.selection.size}座）`);
    }
  }

  /** 攻击移动落点 */
  private attackMoveAt(pos: { x: number; y: number }): void {
    const ids = this.liveUnitIds();
    if (ids.length === 0) return;
    this.world.issueAttackMove(ids, pos);
    this.hud.toast(`攻击移动（${ids.length}个单位）`);
  }

  startPlacement(defId: string): void {
    const def = BUILDING_DEFS[defId];
    if (def.limitPerPlayer) {
      const cnt = [...this.world.entities.values()].filter(e => e.owner === OWNER_PLAYER && e.defId === defId).length;
      if (cnt >= def.limitPerPlayer) { this.hud.toast(`${def.name}已达上限（${def.limitPerPlayer}座）`); return; }
    }
    if (defId === 'monument' && this.world.players[OWNER_PLAYER].era < 2) {
      this.hud.toast('纪元纪念碑需要钢铁纪元'); return;
    }
    this.input.placementMode = true;
    this.input.attackMoveMode = false;
    this.placement = { defId, view: null };
  }

  private placeAt(pos: { x: number; y: number }): void {
    if (!this.placement?.view) return;
    const { defId, tx, ty, valid, reason } = this.placement.view;
    const def = BUILDING_DEFS[defId];
    if (!valid) {
      this.hud.toast(reason || '无法在此建造');
      return;
    }
    if (!this.world.canAfford(OWNER_PLAYER, def.cost)) {
      this.hud.toast('资源不足');
      this.placement = null;
      this.input.placementMode = false;
      return;
    }
    this.world.payCost(OWNER_PLAYER, def.cost);
    const site = this.world.spawnBuilding(defId, OWNER_PLAYER, tx, ty, false);
    // 最近的工程车（选中优先）去施工
    const builders = [...this.selection]
      .map(id => this.world.entities.get(id))
      .filter((e): e is NonNullable<typeof e> => !!e && e.kind === 'unit' && !!UNIT_DEFS[e.defId].canBuild);
    if (builders.length === 0) {
      // 没选工程车：找最近的空闲工程车
      let best: Entity | null = null, bestD = Infinity;
      for (const e of this.world.entities.values()) {
        if (e.kind !== 'unit' || e.owner !== OWNER_PLAYER || !UNIT_DEFS[e.defId].canBuild) continue;
        const d = dist(e.x, e.y, pos.x, pos.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) builders.push(best);
    }
    if (builders.length > 0) this.world.issueBuild(builders.map(b => b.id), site.id);
    this.placement = null;
    this.input.placementMode = false;
  }

  queueUnit(unitId: string): void {
    // 多选同类型建筑批量排产：点击一次，每座各排1个（资源不足即停）
    let ok = 0, attempted = 0;
    for (const id of this.selection) {
      const e = this.world.entities.get(id);
      if (e?.kind === 'building' && e.done && BUILDING_DEFS[e.defId].produces?.includes(unitId)) {
        attempted++;
        if (this.hud.enqueue(id, unitId)) ok++;
        else break;
      }
    }
    if (ok > 1) this.hud.toast(`已向 ${ok} 座建筑下单`);
    else if (attempted === 0) this.hud.toast('选中建筑无法生产该单位');
  }

  /** 麦田铺设模式：拖框开垦（木5/格） */
  startPaint(): void {
    this.input.placementMode = false;
    this.input.attackMoveMode = false;
    this.placement = null;
    this.input.paintMode = true;
    this.hud.toast('铺设模式：拖框开垦麦田（木5/格），右键取消');
  }

  private paintFarms(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const wa = this.cam.screenToWorld(Math.min(a.x, b.x), Math.min(a.y, b.y));
    const wb = this.cam.screenToWorld(Math.max(a.x, b.x), Math.max(a.y, b.y));
    const x0 = Math.max(1, Math.floor(wa.x / TILE)), y0 = Math.max(1, Math.floor(wa.y / TILE));
    const x1 = Math.min(MAP_W - 2, Math.floor(wb.x / TILE)), y1 = Math.min(MAP_H - 2, Math.floor(wb.y / TILE));
    let n = 0;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.world.canAfford(OWNER_PLAYER, { wood: FARM_COST_WOOD })) break;
        if (this.world.layFarm(tx, ty, OWNER_PLAYER)) {
          this.world.payCost(OWNER_PLAYER, { wood: FARM_COST_WOOD });
          n++;
        }
      }
    }
    if (n > 0) this.hud.toast(`开垦 ${n} 块麦田（待农夫耕种）`);
    else this.hud.toast('没有可开垦的草地（或木头不足）');
  }

  clearRallyHint(): void { void 0; }

  /** 菜单背景：渲染一帧静态画面（不启动循环） */
  renderOnce(): void { this.renderFrame(); }

  /** 选图后重开世界：新世界+新渲染器+新AI，状态全部归零 */
  rebuildWorld(variant: MapVariant, seed: number, factions: readonly [Faction, Faction] = ['steel', 'steel']): void {
    void factions;
    this.world = new World(seed, variant, true, factions);
    this.renderer = new Renderer(this.canvas, this.world);
    this.minimap = new Minimap(document.getElementById('minimap') as HTMLCanvasElement, this.world, this.cam, (wx, wy) => this.cam.jumpTo(wx, wy));
    this.aiEnemy = new AIController(OWNER_ENEMY, resolveEnemyAIConfig());
    this.world.players[OWNER_ENEMY].incomeMul = this.aiEnemy.cfg.economyMul;
    this.aiPlayer = null;
    this.selection.clear();
    this.groups.clear();
    this.placement = null;
    this.attackMoveMode = false;
    this.gameShown = false;
    this.renderer.attackMarks.clear();
    this.input.cancelModes();
    updateFog(this.world);
    const start = this.world.findMain(OWNER_PLAYER);
    if (start) this.cam.jumpTo(start.x, start.y);
  }

  /** 选图+选阵营确认：重建世界并开局 */
  startGame(choice: { variant: MapVariant; seed: number; playerFaction: Faction; aiFaction: Faction }): void {
    this.rebuildWorld(choice.variant, choice.seed, [choice.playerFaction, choice.aiFaction]);
    this.start();
  }

  /** 基地车展开成主堡（UI入口，双阵营通用） */
  deployMCV(): void {
    const mcv = [...this.selection].map(id => this.world.entities.get(id)).find(e => e?.defId === 'mcv' || e?.defId === 'palaceCart');
    if (!mcv) return;
    const main = this.world.deployMCV(mcv.id);
    if (!main) { this.hud.toast('此处无法展开（地面不平/有障碍/被占用）'); return; }
    this.selection.clear();
    this.selection.add(main.id);
    this.hud.toast('展开完成');
  }

  /** 金币加速建造：1金=2秒，每工地限一次 */
  boostConstruction(bid: number): void {
    const b = this.world.entities.get(bid);
    if (!b || b.kind !== 'building' || b.done || b.boosted) return;
    const def = BUILDING_DEFS[b.defId];
    const remainSec = (1 - b.progress) * def.buildTime;
    const cost = Math.max(1, Math.ceil(remainSec / 2));
    if (!this.world.canAfford(OWNER_PLAYER, { gold: cost })) { this.hud.toast('金币不足'); return; }
    this.world.payCost(OWNER_PLAYER, { gold: cost });
    b.progress = Math.min(1, b.progress + (cost * 2) / def.buildTime);
    b.boosted = true;
    this.hud.toast('金币加速！机器全速运转');
  }

  /** 金币加速科研：1金=2秒，每次研究限一次 */
  boostResearch(): void {
    const p = this.world.players[0];
    if (!p.research || p.researchBoosted) return;
    const cost = Math.max(1, Math.ceil(p.research.remaining / 2));
    if (p.gold < cost) { this.hud.toast('金币不足'); return; }
    p.gold -= cost;
    p.research.remaining -= cost * 2;
    p.researchBoosted = true;
    this.hud.toast('金币加速！学者们加班了');
  }

  start(): void {
    this.world.startSession(); // 对局头：真正开局才写
    this.loop.start();
  }
}
