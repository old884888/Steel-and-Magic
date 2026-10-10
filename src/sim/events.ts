import type { World } from './world';

/**
 * 事件卡：每100~160秒双方各来一张"三选一"，P社风味的随机决策点。
 * AI秒决（过滤付不起的选项后随机）；玩家弹卡20秒，超时自动选最后一项（保底无害项）。
 * 效果全部走既有API（addRes/payCost/spawnUnit），不动模拟规则。
 */

export interface EventOption {
  label: string;
  /** AI可用性检查：false则AI不会选这项（玩家端由按钮置灰体现不了，走apply内自查） */
  afford?: (w: World, owner: 0 | 1) => boolean;
  /** 生效逻辑，返回自定义日志文案（缺省用label） */
  apply: (w: World, owner: 0 | 1) => string | void;
}

export interface EventDef {
  id: string;
  title: string;
  desc: string;
  options: EventOption[];   // 最后一项 = 超时默认（保底无害项）
}

/** 给资源/扣资源的小工具（走addRes钳制存储上限） */
function gain(w: World, owner: 0 | 1, res: 'wood' | 'food' | 'ore', v: number): void {
  w.addRes(owner, res, v);
}
function pay(w: World, owner: 0 | 1, res: 'wood' | 'food' | 'ore', v: number): boolean {
  if (w.players[owner].res[res] < v) return false;
  w.players[owner].res[res] -= v;
  return true;
}

export const EVENT_DEFS: EventDef[] = [
  {
    id: 'envoys', title: '蛮族使者', desc: '蛮族营地派来使者，收了贡品就保证一段时间的太平。',
    options: [
      { label: '进贡（木80）→ 10分钟停战', afford: (w, o) => w.players[o].res.wood >= 80,
        apply: (w, o) => { if (!pay(w, o, 'wood', 80)) return '付不起贡品，使者冷笑而去';
          w.barbTruceUntil = w.time + 600; return '进贡木80，蛮族承诺10分钟不劫掠'; } },
      { label: '逐客（无事发生）', apply: () => '拒绝了使者的"好意"' },
    ],
  },
  {
    id: 'refugees', title: '流民投奔', desc: '一队流民愿意加入，但要吃饱饭才干活。',
    options: [
      { label: '收留（食-40，+2步兵）', afford: (w, o) => w.players[o].res.food >= 40,
        apply: (w, o) => { if (!pay(w, o, 'food', 40)) return '粮食不够，流民摇头走了';
          const hq = w.findHq(o);
          if (hq) for (let i = 0; i < 2; i++) w.spawnUnit('infantry', o, hq.x - 20 + i * 40, hq.y + hq.radius() + 20);
          return '收留流民：+2动员步兵（注意人口）'; } },
      { label: '遣散（无事发生）', apply: () => '给了些干粮，流民继续流浪' },
    ],
  },
  {
    id: 'caravan', title: '商队过境', desc: '一支商队愿以优惠比价做一单买卖。', 
    options: [
      { label: '矿50 → 木100', afford: (w, o) => w.players[o].res.ore >= 50,
        apply: (w, o) => { if (!pay(w, o, 'ore', 50)) return '矿不够，商队耸耸肩走了';
          gain(w, o, 'wood', 100); return '矿50换木100，稳赚'; } },
      { label: '收过路费（食+25）', apply: (w, o) => { gain(w, o, 'food', 25); return '收了点过路费：食+25'; } },
    ],
  },
  {
    id: 'vein', title: '富矿脉', desc: '勘探队在一条矿脉深处发现了富集层，可以放手开挖。',
    options: [
      { label: '开挖（一采矿场90秒产量×2）', apply: (w, o) => {
          const mines = [...w.entities.values()].filter(e => e.kind === 'building' && e.defId === 'mine' && e.done && e.owner === o);
          if (mines.length === 0) { gain(w, o, 'ore', 40); return '没有采矿场，折现矿+40'; }
          const m = mines[Math.floor(Math.random() * mines.length)];
          m.boostUntil = w.time + 90;
          return '富矿脉开挖：采矿场90秒产量×2'; } },
      { label: '稳妥入袋（矿+40）', apply: (w, o) => { gain(w, o, 'ore', 40); return '细水长流：矿+40'; } },
    ],
  },
  {
    id: 'traders', title: '游商铺子', desc: '游商推着货车路过，比价不算公道但胜在应急。',
    options: [
      { label: '木60 → 矿90', afford: (w, o) => w.players[o].res.wood >= 60,
        apply: (w, o) => { if (!pay(w, o, 'wood', 60)) return '木不够，游商走了';
          gain(w, o, 'ore', 90); return '木60换矿90'; } },
      { label: '矿60 → 木90', afford: (w, o) => w.players[o].res.ore >= 60,
        apply: (w, o) => { if (!pay(w, o, 'ore', 60)) return '矿不够，游商走了';
          gain(w, o, 'wood', 90); return '矿60换木90'; } },
      { label: '闭户（无事发生）', apply: () => '婉拒了游商' },
    ],
  },
  {
    id: 'harvest', title: '丰收祭', desc: '风调雨顺，仓廪充实，选一样入仓吧。',
    options: [
      { label: '食+80', apply: (w, o) => { gain(w, o, 'food', 80); return '入仓食+80'; } },
      { label: '木+80', apply: (w, o) => { gain(w, o, 'wood', 80); return '入仓木+80'; } },
      { label: '矿+40（默认）', apply: (w, o) => { gain(w, o, 'ore', 40); return '入仓矿+40'; } },
    ],
  },
];

const FIRST_AT = 150;        // 首个事件（游戏秒）
const GAP_MIN = 100, GAP_VAR = 60;  // 之后每 100~160 秒一张
const DECIDE_SEC = 20;       // 玩家决策窗

export class EventDirector {
  nextAt = FIRST_AT;
  pending: { def: EventDef; owner: 0 | 1; deadline: number } | null = null;

  update(w: World, dt: number): void {
    void dt;
    if (w.gameOver) return;
    if (this.pending) {
      if (w.time >= this.pending.deadline) this.resolve(w, this.pending.owner, this.pending.def, this.pending.def.options.length - 1);
      return;
    }
    if (w.time >= this.nextAt) {
      this.nextAt = w.time + GAP_MIN + Math.random() * GAP_VAR;
      const owner = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
      const def = EVENT_DEFS[Math.floor(Math.random() * EVENT_DEFS.length)];
      if (owner === 1) {
        this.resolve(w, 1, def, this.aiPick(w, 1, def));
      } else {
        this.pending = { def, owner: 0, deadline: w.time + DECIDE_SEC };
        w.addLog('system', `事件【${def.title}】：${DECIDE_SEC}秒内抉择，超时自动选「${def.options[def.options.length - 1].label}」`, 0);
      }
    }
  }

  /** 玩家点卡（UI入口） */
  choose(w: World, idx: number): void {
    if (!this.pending) return;
    this.resolve(w, this.pending.owner, this.pending.def, idx);
  }

  /** AI秒决：过滤付不起的选项后随机 */
  private aiPick(w: World, owner: 0 | 1, def: EventDef): number {
    const ok = def.options.map((o, i) => (o.afford && !o.afford(w, owner) ? -1 : i)).filter(i => i >= 0);
    const pool = ok.length > 0 ? ok : [def.options.length - 1];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private resolve(w: World, owner: 0 | 1, def: EventDef, idx: number): void {
    const i = Math.max(0, Math.min(def.options.length - 1, idx));
    const msg = def.options[i].apply(w, owner) || def.options[i].label;
    if (owner === 0) this.pending = null;
    w.addLog('system', `事件【${def.title}】${owner === 0 ? '（我方）' : '（敌方）'}：${msg}`, owner);
  }

  /** 调试/自测：强制触发指定事件 */
  debugFire(w: World, id: string, owner: 0 | 1): void {
    const def = EVENT_DEFS.find(d => d.id === id);
    if (!def) return;
    if (owner === 1) this.resolve(w, 1, def, this.aiPick(w, 1, def));
    else this.pending = { def, owner: 0, deadline: w.time + DECIDE_SEC };
  }
}
