import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { EDICTS, TECHS, type EdictId, type TechId } from '../data/policies';
import { ERAS } from '../data/eras';
import type { Res } from '../types';
import type { World } from '../sim/world';
import { tryEnqueue } from '../sim/construction';
import type { Game } from '../game';

const RES_ICON: Record<string, string> = { wood: '🪵', food: '🌾', ore: '⛏️', gold: '💰' };

function costText(cost: Record<string, number | undefined>): string {
  return Object.entries(cost).filter(([, v]) => v).map(([k, v]) => `${RES_ICON[k]}${v}`).join(' ');
}

/** HUD：顶部资源栏 / 右下选中与建造面板 / toast / 胜负结算 */
export class HUD {
  private topbar = document.getElementById('topbar')!;
  private panel = document.getElementById('panel')!;
  private toasts = document.getElementById('toasts')!;
  private overlay = document.getElementById('overlay')!;
  private overlayTitle = document.getElementById('overlay-title')!;
  private overlaySub = document.getElementById('overlay-sub')!;
  private refreshT = 0;
  private lastPanelSig = '';

  constructor(private game: Game) {
    this.panel.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      const [act, arg] = btn.dataset.act!.split(':');
      if (act === 'build') this.game.startPlacement(arg);
      else if (act === 'unit') this.game.queueUnit(arg);
      else if (act === 'rally') this.game.clearRallyHint();
      else if (act === 'paint') this.game.startPaint();
      else if (act === 'deploy') this.game.deployMCV();
      else if (act === 'boost') this.game.boostConstruction(Number(arg));
      else if (act === 'boostr') this.game.boostResearch();
      else if (act === 'hire') {
        if (!this.game.world.hireCaravan(Number(arg))) this.toast('无法雇佣（食30不足或商队已满）');
        this.refreshT = 0;
      } else if (act === 'sell' || act === 'buy') {
        const w = this.game.world;
        const ok = act === 'sell' ? w.marketSell(0, arg as Res) : w.marketBuy(0, arg as Res);
        if (!ok) this.toast(act === 'sell' ? '资源不足100' : '金币不足70或仓库空间不足');
        this.refreshT = 0;
      } else if (act === 'edict') {
        const ok = this.game.world.setEdict(0, arg as EdictId);
        if (!ok) this.toast('法令切换冷却中');
        this.refreshT = 0;
      } else if (act === 'tech') {
        const w = this.game.world;
        if (!w.startResearch(0, arg as TechId)) {
          const p = w.players[0];
          this.toast(p.research ? '已有研究进行中' : !w.hasLab(0) ? '需要已建成的研究所' : '资源不足或已研究完成');
        }
        this.refreshT = 0;
      }
    });
  }

  toast(msg: string): void {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    this.toasts.appendChild(d);
    setTimeout(() => d.classList.add('fadeout'), 1600);
    setTimeout(() => d.remove(), 2200);
    if (this.toasts.children.length > 4) this.toasts.firstChild?.remove();
  }

  showGameOver(win: boolean, seconds: number, method: 'hq' | 'coronation' = 'hq'): void {
    this.overlay.style.display = 'flex';
    this.overlayTitle.textContent = win ? '胜  利' : '战  败';
    this.overlayTitle.className = win ? 'win' : 'lose';
    const mm = Math.floor(seconds / 60), ss = Math.floor(seconds % 60);
    const how = method === 'coronation'
      ? (win ? '纪元纪念碑加冕完成——文明因你而永铸！' : '敌方奇观加冕完成……下一次，拆了它。')
      : (win ? '敌方指挥基地已化为废墟。' : '我方指挥基地陷落。');
    this.overlaySub.textContent = `${how}耗时 ${mm}分${ss}秒。`;
  }

  update(dt: number): void {
    this.refreshT -= dt;
    if (this.refreshT > 0) return;
    this.refreshT = 0.25;
    this.refreshTopbar();
    this.refreshPanel();
  }

  private refreshTopbar(): void {
    const w = this.game.world;
    const p = w.players[0];
    const set = (id: string, v: string): void => { (document.getElementById(id) as HTMLElement).textContent = v; };
    const cap = p.storageCap;
    set('res-wood', `${Math.floor(p.res.wood)}/${cap}`);
    set('res-food', `${Math.floor(p.res.food)}/${cap}`);
    set('res-ore', `${Math.floor(p.res.ore)}/${cap}`);
    set('rate-wood', ` +${p.income.wood.toFixed(1)}/s`);
    set('rate-food', ` +${p.income.food.toFixed(1)}/s`);
    set('rate-ore', ` +${p.income.ore.toFixed(1)}/s`);
    const pop = document.getElementById('pop')!;
    const popStr = Number.isInteger(p.pop) ? String(p.pop) : p.pop.toFixed(1);
    pop.textContent = `${popStr}/${p.popCap}`;
    pop.classList.toggle('warn', p.pop >= p.popCap);
    const goldEl = document.getElementById('gold');
    if (goldEl) goldEl.textContent = String(Math.floor(p.gold));
    const crown = document.getElementById('crown');
    const coro = w.coronation;
    if (crown) {
      crown.style.display = coro ? 'inline-flex' : 'none';
      if (coro) crown.textContent = `👑 加冕 ${Math.max(0, Math.ceil(coro.endsAt - w.time))}s`;
    }
    const t = Math.floor(w.time);
    set('gametime', `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    void this.topbar;
  }

  private refreshPanel(): void {
    const g = this.game;
    const w = g.world;
    const sel = [...g.selection].map(id => w.entities.get(id)).filter((e): e is NonNullable<typeof e> => !!e);

    // 内容签名：没变就不重建DOM（按钮被反复拆除会吞掉玩家点击）
    const p0 = w.players[0];
    const selSig = sel.map(e => {
      let s = `${e.id}:${e.defId}:${e.done ? Math.ceil(e.hp) : Math.floor(e.progress * 10)}:${e.queue.length}`;
      if (e.done && (e.adjLabel || e.defId === 'hq' || e.defId === 'lab')) {
        s += `:${e.adjLabel ?? ''}`;
        if (e.defId === 'hq') s += `:${p0.edict ?? ''}:${Math.ceil(p0.edictCd / 5)}`;
        if (e.defId === 'lab') s += `:${p0.research?.id ?? ''}:${p0.research ? Math.floor((1 - p0.research.remaining / ((ERAS as Record<string, { time: number }>)[p0.research.id]?.time ?? TECHS[p0.research.id as TechId].time)) * 10) : ''}:${p0.techs.join(',')}:${p0.researchBoosted ? 1 : 0}`;
      }
      return s;
    }).join('|') + '#' + (g.placement?.defId ?? '') + '#' + (g.input.paintMode ? 'P' : '');
    const sig = selSig;

    if (sel.length === 0) {
      if (this.lastPanelSig !== 'empty' + sig) {
        this.panel.innerHTML = `<div class="hint">左键框选部队 · 右键下达指令<br>选中工程车可建造建筑</div>`;
        this.lastPanelSig = 'empty' + sig;
      }
      return;
    }

    const units = sel.filter(e => e.kind === 'unit');
    const buildings = sel.filter(e => e.kind === 'building');

    if (units.length > 0) {
      const byType = new Map<string, number>();
      for (const u of units) byType.set(u.defId, (byType.get(u.defId) ?? 0) + 1);
      const summary = [...byType.entries()].map(([id, n]) => `${UNIT_DEFS[id].name}×${n}`).join(' · ');
      let html = `<h3>${units.length === 1 ? UNIT_DEFS[units[0].defId].name : '部队'} <span class="hp">${units.length === 1 ? `${Math.ceil(units[0].hp)} HP` : summary}</span></h3>`;
      if (units.length === 1 && UNIT_DEFS[units[0].defId].desc) {
        html += `<div class="hint" style="font-size:12px; line-height:1.5">${UNIT_DEFS[units[0].defId].desc}</div>`;
      }
      const builders = units.filter(u => UNIT_DEFS[u.defId].canBuild);
      if (builders.length > 0) {
        html += `<div class="hint" style="font-size:12px">建造：</div><div class="btnrow">`;
        for (const bid of UNIT_DEFS[builders[0].defId].canBuild!) {
          const def = BUILDING_DEFS[bid];
          const afford = w.canAfford(0, def.cost);
          html += `<button class="btn ${g.placement?.defId === bid ? 'active' : ''}" data-act="build:${bid}" ${afford ? '' : 'disabled'}>${def.name}<span class="cost">${costText(def.cost)}</span></button>`;
        }
        html += `</div>`;
      }
      // 农夫：麦田铺设入口
      if (units.some(u => u.defId === 'farmer')) {
        html += `<div class="btnrow"><button class="btn ${g.input.paintMode ? 'active' : ''}" data-act="paint:farm">开垦麦田<span class="cost">🪵5/格 · 拖框铺设</span></button></div>`;
      }
      // 基地车：展开基地
      if (units.some(u => u.defId === 'mcv')) {
        html += `<div class="btnrow"><button class="btn" data-act="deploy:mcv">展开基地<span class="cost">原地变身指挥基地</span></button></div>`;
      }
      if (sig !== this.lastPanelSig) { this.panel.innerHTML = html; this.lastPanelSig = sig; }
      return;
    }

    if (buildings.length > 1) {
      // ---- 多选建筑：同类型=批量生产面板，混合=清单 ----
      const counts = new Map<string, number>();
      for (const b of buildings) counts.set(b.defId, (counts.get(b.defId) ?? 0) + 1);
      const def = BUILDING_DEFS[buildings[0].defId];
      if (counts.size === 1 && def.produces) {
        const n = buildings.length;
        let totalQ = 0;
        for (const b of buildings) totalQ += b.queue.length;
        let html = `<h3>${def.name} ×${n} <span class="hp">批量生产</span></h3>`;
        html += `<div class="hint" style="font-size:12px">点击一次 = 每座各排产1个</div><div class="btnrow">`;
        for (const uid of def.produces) {
          const udef = UNIT_DEFS[uid];
          const afford = w.canAfford(0, udef.cost);
          const room = w.players[0].pop < w.players[0].popCap;
          html += `<button class="btn" data-act="unit:${uid}" ${afford && room ? '' : 'disabled'}>${udef.name}<span class="cost">${costText(udef.cost)} · ${udef.buildTime}s</span></button>`;
        }
        html += `</div>`;
        if (totalQ > 0) html += `<div class="queue">全部队列：${totalQ} 个单位</div>`;
        if (sig !== this.lastPanelSig) { this.panel.innerHTML = html; this.lastPanelSig = sig; }
        return;
      }
      let html = `<h3>建筑群 <span class="hp">${buildings.length}座</span></h3><div class="hint">`;
      for (const [defId, n] of counts) html += `${BUILDING_DEFS[defId].name}×${n}　`;
      html += `</div>`;
      if (sig !== this.lastPanelSig) { this.panel.innerHTML = html; this.lastPanelSig = sig; }
      return;
    }

    if (buildings.length === 1) {
      const b = buildings[0];
      const def = BUILDING_DEFS[b.defId];
      let html = `<h3>${def.name} <span class="hp">${b.done ? `${Math.ceil(b.hp)} HP` : `施工中 ${Math.floor(b.progress * 100)}%`}</span></h3>`;
      if (def.desc) html += `<div class="hint" style="font-size:12px; line-height:1.5">${def.desc}</div>`;
      // 建筑加速（未完工且未加速过）：1金=2秒
      if (!b.done && !b.boosted && def.buildTime > 4) {
        const remainSec = (1 - b.progress) * def.buildTime;
        const boostCost = Math.max(1, Math.ceil(remainSec / 2));
        html += `<button class="btn" data-act="boost:${b.id}" ${p0.gold >= boostCost ? '' : 'disabled'}>⚡金币加速<span class="cost">${boostCost}💰 = 立省${Math.floor(remainSec)}s</span></button>`;
      }
      // 地利加成展示
      if (b.done && b.adjLabel) html += `<div class="queue" style="color:#9fd18f">地利：${b.adjLabel}</div>`;
      // HQ：法令四选一
      if (b.done && b.defId === 'hq') {
        const p = w.players[0];
        html += `<div class="hint" style="font-size:12px;margin-top:4px">国家法令（切换冷却45秒）：</div><div class="btnrow">`;
        for (const [id, ed] of Object.entries(EDICTS) as [EdictId, typeof EDICTS[EdictId]][]) {
          const active = p.edict === id;
          const cd = p.edictCd;
          html += `<button class="btn ${active ? 'active' : ''}" data-act="edict:${id}" ${active || cd > 0 ? 'disabled' : ''}>${ed.name}<span class="cost">${active ? '✔ 生效中' : cd > 0 ? `冷却 ${Math.ceil(cd)}s` : ed.desc}</span></button>`;
        }
        html += `</div>`;
      }
      // 研究所：纪元晋升 + 科技立项
      if (b.done && b.defId === 'lab') {
        const p = w.players[0];
        html += `<div class="hint" style="font-size:12px;margin-top:4px">纪元晋升（当前：${['拓荒', '工业', '钢铁'][p.era]}纪元）：</div><div class="btnrow">`;
        for (const era of Object.values(ERAS)) {
          const reached = p.era >= era.level;
          const locked = era.prereq ? p.era < ERAS[era.prereq].level : false;
          const busy = !!p.research;
          const afford = w.canAfford(0, era.cost);
          html += `<button class="btn" data-act="tech:${era.id}" ${reached || busy || locked || !afford ? 'disabled' : ''}>${era.name}<span class="cost">${reached ? '✔ 当前纪元' : locked ? '需前置纪元' : `${costText(era.cost)} · ${era.time}s`}</span></button>`;
        }
        html += `</div>`;
        html += `<div class="hint" style="font-size:12px;margin-top:4px">科技立项（全局单线）：</div><div class="btnrow">`;
        for (const t of Object.values(TECHS)) {
          const done = p.techs.includes(t.id);
          const busy = !!p.research;
          html += `<button class="btn" data-act="tech:${t.id}" ${done || busy || !w.canAfford(0, t.cost) ? 'disabled' : ''}>${t.name}<span class="cost">${done ? '✔ 已完成' : busy ? '研究占用中' : `${costText(t.cost)} · ${t.time}s`}</span></button>`;
        }
        html += `</div>`;
      }
      // 商贸站：商队雇佣 + 资源市场
      if (b.done && b.defId === 'tradePost') {
        const caravans = [...w.entities.values()].filter(e => e.defId === 'caravan' && (e.homePostId ?? -1) === b.id).length;
        html += `<div class="hint" style="font-size:12px;margin-top:4px">商队：${caravans}/3（自动往返蛮族营地，通商=停战）</div>`;
        html += `<div class="btnrow"><button class="btn" data-act="hire:${b.id}" ${p0.res.food >= 30 && caravans < 3 ? '' : 'disabled'}>雇佣商队<span class="cost">🌾30 · 跑商赚金</span></button></div>`;
        html += `<div class="hint" style="font-size:12px;margin-top:4px">市场：</div><div class="btnrow">`;
        for (const res of ['wood', 'food', 'ore'] as Res[]) {
          const icon = RES_ICON[res];
          html += `<button class="btn" data-act="sell:${res}" ${p0.res[res] >= 100 ? '' : 'disabled'}>卖${icon}100<span class="cost">→ 💰40</span></button>`;
        }
        html += `</div><div class="btnrow">`;
        for (const res of ['wood', 'food', 'ore'] as Res[]) {
          const icon = RES_ICON[res];
          const spaceOk = p0.storageCap - p0.res[res] >= 100;
          html += `<button class="btn" data-act="buy:${res}" ${p0.gold >= 70 && spaceOk ? '' : 'disabled'}>买${icon}100<span class="cost">💰70</span></button>`;
        }
        html += `</div>`;
      }
      // 纪念碑：加冕倒计时
      if (b.done && b.defId === 'monument') {
        const c = w.coronation;
        if (c && c.monumentId === b.id) {
          const left = Math.max(0, Math.ceil(c.endsAt - w.time));
          html += `<div class="queue" style="color:#ffd75e">👑 加冕倒计时：<b>${left}s</b>——守住它！<div class="queuebar"><i style="width:${Math.floor((1 - left / 90) * 100)}%"></i></div></div>`;
        }
      }
      if (b.done && def.produces) {
        html += `<div class="btnrow">`;
        for (const uid of def.produces) {
          const udef = UNIT_DEFS[uid];
          const afford = w.canAfford(0, udef.cost);
          const room = w.players[0].pop < w.players[0].popCap;
          html += `<button class="btn" data-act="unit:${uid}" ${afford && room ? '' : 'disabled'}>${udef.name}<span class="cost">${costText(udef.cost)} · ${udef.buildTime}s</span></button>`;
        }
        html += `</div>`;
      }
      let progPct = -1;
      if (def.bufferCap) {
        // 自动机：内部缓冲仓状态
        html += `<div class="queue">储备仓：${Math.floor(b.buffer)}/${def.bufferCap}${b.bufferStalled ? ' · <span style="color:#ff8a70">满仓停机中</span>' : ''}</div>`;
      }
      if (b.done && b.queue.length > 0) {
        const item = b.queue[0];
        const total = UNIT_DEFS[item.unitId].buildTime;
        progPct = Math.floor((1 - item.remaining / total) * 100);
        html += `<div class="queue">生产中：${UNIT_DEFS[item.unitId].name}
          <div class="queuebar"><i data-queuebar style="width:${progPct}%"></i></div></div>`;
        // 队列目录：排队的单位一览
        if (b.queue.length > 1) {
          html += `<div class="queue">队列：${b.queue.slice(1).map(q => `<span class="qchip">${UNIT_DEFS[q.unitId].name}</span>`).join('')}</div>`;
        }
      }
      // 研究进度（进度挂在玩家身上，不在建筑队列里）
      let resPct = -1;
      if (b.done && b.defId === 'lab' && p0.research) {
        const rdef = (ERAS as Record<string, { name: string; time: number }>)[p0.research.id] ?? TECHS[p0.research.id as TechId];
        resPct = Math.floor((1 - p0.research.remaining / rdef.time) * 100);
        html += `<div class="queue">研究中：${rdef.name}<div class="queuebar"><i data-rbar style="width:${resPct}%"></i></div></div>`;
        // 金币加速（1金=2秒，每项研究限一次）
        if (!p0.researchBoosted) {
          const boostCost = Math.max(1, Math.ceil(p0.research.remaining / 2));
          html += `<button class="btn" data-act="boostr" ${p0.gold >= boostCost ? '' : 'disabled'}>⚡金币加速<span class="cost">${boostCost}💰 = 立省${Math.floor(p0.research.remaining)}s</span></button>`;
        }
      }
      if (sig !== this.lastPanelSig) {
        this.panel.innerHTML = html;
        this.lastPanelSig = sig;
      } else if (progPct >= 0 || resPct >= 0) {
        // 签名未变：只热更新生产/研究进度条
        const bar = this.panel.querySelector('[data-queuebar]') as HTMLElement | null;
        if (bar && progPct >= 0) bar.style.width = progPct + '%';
        const rbar = this.panel.querySelector('[data-rbar]') as HTMLElement | null;
        if (rbar && resPct >= 0) rbar.style.width = resPct + '%';
      }
      return;
    }
  }

  /** 生产按钮入口（供game调用） */
  enqueue(buildingId: number, unitId: string): boolean {
    const b = this.game.world.entities.get(buildingId);
    if (!b) return false;
    const ok = tryEnqueue(this.game.world, b, unitId);
    if (!ok) {
      const p = this.game.world.players[0];
      if (p.pop >= p.popCap) this.toast('人口已满，先造补给农场');
      else this.toast('资源不足');
      this.refreshT = 0; // 立即刷新面板（禁用按钮）
    }
    return ok;
  }
}
