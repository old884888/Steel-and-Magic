/**
 * 模拟日志：记录战局关键事件，供无头自测/回放/自动验收消费。
 * 由 world.addLog() 统一写入（自动附带时间戳+重复节流）。
 */
export type LogCat = 'econ' | 'build' | 'military' | 'system';

export interface LogEntry {
  t: number;            // 游戏时间（秒）
  tick: number;
  cat: LogCat;
  msg: string;
  owner?: number;
}

export class SimLog {
  entries: LogEntry[] = [];
  private max: number;

  constructor(max = 5000) { this.max = max; }

  /** 由 World.addLog 调用 */
  _push(entry: LogEntry, max: number): void {
    this.entries.push(entry);
    if (this.entries.length > max) this.entries.splice(0, this.entries.length - max);
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
