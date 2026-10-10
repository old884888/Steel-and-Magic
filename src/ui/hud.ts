import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import type { World } from '../sim/world';
import { tryEnqueue } from '../sim/construction';
import type { Game } from '../game';

const RES_ICON: Record<string, string> = { wood: '🪵', food: '🌾', ore: '⛏️' };

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

  showGameOver(win: boolean, seconds: number): void {
    this.overlay.style.display = 'flex';
    this.overlayTitle.textContent = win ? '胜  利' : '战  败';
    this.overlayTitle.className = win ? 'win' : 'lose';
    const mm = Math.floor(seconds / 60), ss = Math.floor(seconds % 60);
    this.overlaySub.textContent = win
      ? `敌方指挥基地已化为废墟。耗时 ${mm}分${ss}秒，赛博功德圆满。`
      : `我方指挥基地陷落。坚持了 ${mm}分${ss}秒，下一次运气会更好的。`;
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
    pop.textContent = `${p.pop}/${p.popCap}`;
    pop.classList.toggle('warn', p.pop >= p.popCap);
    const t = Math.floor(w.time);
    set('gametime', `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    void this.topbar;
  }

  private refreshPanel(): void {
    const g = this.game;
    const w = g.world;
    const sel = [...g.selection].map(id => w.entities.get(id)).filter((e): e is NonNullable<typeof e> => !!e);

    // 内容签名：没变就不重建DOM（按钮被反复拆除会吞掉玩家点击）
    const sig = sel.map(e => `${e.id}:${e.defId}:${e.done ? Math.ceil(e.hp) : Math.floor(e.progress * 10)}:${e.queue.length}`).join('|')
      + '#' + (g.placement?.defId ?? '');

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
      if (sig !== this.lastPanelSig) { this.panel.innerHTML = html; this.lastPanelSig = sig; }
      return;
    }

    if (buildings.length > 0) {
      const b = buildings[0];
      const def = BUILDING_DEFS[b.defId];
      let html = `<h3>${def.name} <span class="hp">${b.done ? `${Math.ceil(b.hp)} HP` : `施工中 ${Math.floor(b.progress * 100)}%`}</span></h3>`;
      if (def.desc) html += `<div class="hint" style="font-size:12px; line-height:1.5">${def.desc}</div>`;
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
        html += `<div class="queue">生产中：${UNIT_DEFS[item.unitId].name}${b.queue.length > 1 ? `（还有${b.queue.length - 1}个排队）` : ''}
          <div class="queuebar"><i data-queuebar style="width:${progPct}%"></i></div></div>`;
      }
      if (sig !== this.lastPanelSig) {
        this.panel.innerHTML = html;
        this.lastPanelSig = sig;
      } else if (progPct >= 0) {
        // 签名未变：只热更新生产进度条
        const bar = this.panel.querySelector('[data-queuebar]') as HTMLElement | null;
        if (bar) bar.style.width = progPct + '%';
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
