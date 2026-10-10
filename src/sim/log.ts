/**
 * 模拟日志：记录战局关键事件，供无头自测/回放/自动验收消费。
 * 由 world.addLog() 统一写入（自动附带时间戳+重复节流）。
 *
 * 持久化：浏览器沙箱不允许直接写磁盘文件，故落 localStorage（跨局累积、
 * FIFO裁剪、节流写入），并支持一键导出为 .log 文件供随时翻查。
 */
export type LogCat = 'econ' | 'build' | 'military' | 'system';

export interface LogEntry {
  t: number;            // 游戏时间（秒，每局从0计）
  tick: number;
  cat: LogCat;
  msg: string;
  owner?: number;
  wall?: number;        // 真实墙钟（毫秒），导出文件时用
}

const STORE_KEY = 'sm_battle_log_v1';
const STORE_MAX = 600;        // 持久化条数上限（FIFO，防撑爆localStorage）
const FLUSH_MS = 5000;        // 落盘节流间隔（真实时间）

export class SimLog {
  entries: LogEntry[] = [];
  private max: number;
  private persistent: boolean;      // 无头自测为false：不读写存储，断言不被历史数据污染
  private dirty = false;
  private lastFlush = 0;

  constructor(max = 5000, persistent = false) { this.max = max; this.persistent = persistent; }

  /** 由 World.addLog 调用 */
  _push(entry: LogEntry, max: number): void {
    if (entry.wall == null) entry.wall = Date.now();
    this.entries.push(entry);
    if (this.entries.length > max) this.entries.splice(0, this.entries.length - max);
    this.dirty = true;
  }

  /** 开局：载入历史日志并写入对局头分隔线（persistent=false 时跳过） */
  beginSession(header: string): void {
    if (!this.persistent) return;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) this.entries = JSON.parse(raw) as LogEntry[];
    } catch { this.entries = []; }
    this._push({ t: 0, tick: 0, cat: 'system', msg: header }, this.max);
    this.maybeFlush(true);
  }

  /** 节流落盘；force=立刻写（关页/切后台/游戏结束时兜底） */
  maybeFlush(force = false): void {
    if (!this.persistent || !this.dirty) return;
    const now = performance.now();
    if (!force && now - this.lastFlush < FLUSH_MS) return;
    this.lastFlush = now;
    this.dirty = false;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.entries.slice(-STORE_MAX)));
    } catch { /* 存储配额满等：放弃本次落盘，别让日志杀死游戏 */ }
  }

  /** 导出全部条目为可读文本，触发浏览器下载（文件在"下载"目录随时可查） */
  exportFile(): void {
    const head = `钢铁与魔法 作战日志 · 共${this.entries.length}条 · 导出于 ${new Date().toLocaleString()}\n${'='.repeat(46)}\n`;
    const body = this.entries.map(e =>
      `[${new Date(e.wall ?? 0).toLocaleTimeString()}][t+${e.t.toFixed(0)}s][${e.cat}]${e.owner != null ? `(P${e.owner})` : ''} ${e.msg}`
    ).join('\n');
    const blob = new Blob([head + body + '\n'], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SteelMagic-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** 清空内存与持久化历史 */
  clearPersisted(): void {
    this.entries = [];
    this.dirty = false;
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  }

  /** 按类别统计条数，可附带消息过滤 */
  count(cat: LogCat, owner?: 0 | 1, match?: (msg: string) => boolean): number {
    let n = 0;
    for (const e of this.entries) {
      if (e.cat !== cat) continue;
      if (owner != null && e.owner !== owner) continue;
      if (match && !match(e.msg)) continue;
      n++;
    }
    return n;
  }

  tail(n: number): string[] {
    return this.entries.slice(-n).map(e =>
      `[${e.t.toFixed(0)}s][${e.cat}]${e.owner != null ? `(P${e.owner})` : ''} ${e.msg}`);
  }

  summary(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.entries) out[e.cat] = (out[e.cat] ?? 0) + 1;
    return out;
  }
}
