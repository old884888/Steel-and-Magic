import { Game } from './game';
import { runSelftest } from './sim/selftest';
import { loadAISettings, saveAISettings, type AISettings, type TacticId } from './sim/ai-config';

function fitCanvas(canvas: HTMLCanvasElement, game?: Game): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (game) {
    game.cam.setViewport(w, h);
    game.cam.clamp();
    game.renderer.setDpr(dpr); // 渲染器必须知道系统缩放，否则点击错位
  }
}

/** 设置弹窗：AI难度/性格/自定义持久化（对下一局生效） */
function wireAISettings(): void {
  const settings: AISettings = loadAISettings();
  const $ = (id: string): HTMLElement => document.getElementById(id)!;
  const diffSel = $('set-ai-difficulty') as HTMLSelectElement;
  const persSel = $('set-ai-personality') as HTMLSelectElement;
  const customBox = $('ai-custom');
  const eco = $('set-ai-eco') as HTMLInputElement;
  const wave = $('set-ai-wave') as HTMLInputElement;
  const interval = $('set-ai-interval') as HTMLInputElement;
  const ecoV = $('set-ai-eco-v');
  const waveV = $('set-ai-wave-v');
  const intervalV = $('set-ai-interval-v');
  const tacticIds: TacticId[] = ['focusFire', 'retreat', 'spareArtillery', 'highGround', 'weiwei', 'denyMining', 'counterComp'];

  const refresh = (): void => {
    diffSel.value = settings.difficulty;
    persSel.value = settings.personality;
    customBox.style.display = settings.difficulty === 'custom' ? 'flex' : 'none';
    if (settings.custom) {
      eco.value = String(settings.custom.economyMul);
      wave.value = String(settings.custom.waveStart);
      interval.value = String(settings.custom.waveInterval);
    }
    ecoV.textContent = eco.value;
    waveV.textContent = wave.value;
    intervalV.textContent = wave.value && interval.value ? interval.value + 's' : '';
    for (const id of tacticIds) {
      ($('set-t-' + id) as HTMLInputElement).checked = settings.custom ? settings.custom.tactics.includes(id) : false;
    }
  };

  const save = (): void => {
    if (settings.difficulty === 'custom') {
      settings.custom = {
        economyMul: Number(eco.value),
        thinkSec: 1.0,
        waveStart: Number(wave.value),
        waveInterval: Number(interval.value),
        tactics: tacticIds.filter(id => ($('set-t-' + id) as HTMLInputElement).checked),
      };
    }
    saveAISettings(settings);
  };

  diffSel.addEventListener('change', () => { settings.difficulty = diffSel.value as AISettings['difficulty']; refresh(); save(); });
  persSel.addEventListener('change', () => { settings.personality = persSel.value as AISettings['personality']; save(); });
  eco.addEventListener('input', () => { ecoV.textContent = eco.value; });
  wave.addEventListener('input', () => { waveV.textContent = wave.value; });
  const saveCustom = (): void => { if (settings.difficulty === 'custom') save(); };
  for (const el of [eco, wave, interval]) el.addEventListener('change', saveCustom);
  for (const id of tacticIds) ($('set-t-' + id) as HTMLInputElement).addEventListener('change', saveCustom);

  refresh();
}

/** 崩溃日志：全局错误捕获，写入localStorage（闪退后重开可查）。同指纹错误去重，防刷屏挤掉真证据 */
function setupCrashLogger(): void {
  const KEY = 'sm_crash_log';
  const SIG_KEY = 'sm_crash_sig';
  const CAP = 6000;
  const NL = '\n';
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) {
      console.error('[上次崩溃日志]', prev);
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:200px;overflow:auto;background:#1a0a0a;color:#ff6a5a;font-size:11px;padding:8px;z-index:99999;font-family:monospace;white-space:pre-wrap;';
      div.textContent = '[Last Crash]' + NL + prev;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 15000);
      // 已送达即销毁：横幅不再每次开机回放旧账；同时清指纹，让同类新错误能被重新记录
      localStorage.removeItem(KEY);
      localStorage.removeItem(SIG_KEY);
    }
  } catch { /* ignore */ }

  /** 同一错误短时间反复炸（如热更新半新半旧）只记一次，别把旧证据挤出去 */
  const isDuplicate = (fingerprint: string): boolean => {
    try {
      if (localStorage.getItem(SIG_KEY) === fingerprint) return true;
      localStorage.setItem(SIG_KEY, fingerprint);
    } catch { /* ignore */ }
    return false;
  };

  window.addEventListener('error', (e) => {
    try {
      const fingerprint = 'e:' + e.message + '|' + (e.filename || '') + ':' + e.lineno;
      if (isDuplicate(fingerprint)) return;
      const msg = '[' + new Date().toLocaleTimeString() + '] ' + e.message + NL + '  at ' + (e.filename || '?') + ':' + e.lineno + ':' + e.colno + NL + '  ' + String(e.error?.stack || '').slice(0, 500);
      const existing = localStorage.getItem(KEY) || '';
      localStorage.setItem(KEY, (existing + NL + msg).slice(-CAP));
    } catch { /* ignore */ }
  });
  window.addEventListener('unhandledrejection', (e) => {
    try {
      const reason = String(e.reason).slice(0, 200);
      if (isDuplicate('p:' + reason)) return;
      const msg = '[' + new Date().toLocaleTimeString() + '] Promise: ' + reason;
      const existing = localStorage.getItem(KEY) || '';
      localStorage.setItem(KEY, (existing + NL + msg).slice(-CAP));
    } catch { /* ignore */ }
  });
}

/** 作战日志查看器：菜单按钮 + 游戏内顶栏按钮共用，可导出 .log 文件 */
function wireLogViewer(game: Game): void {
  const $ = (id: string): HTMLElement => document.getElementById(id)!;
  const modal = $('logview');
  const pre = $('logview-pre') as HTMLPreElement;
  const open = (): void => {
    const lines = game.world.log.tail(400);
    pre.textContent = lines.length > 0 ? lines.join('\n') : '（暂无日志）';
    pre.scrollTop = pre.scrollHeight;
    modal.style.display = 'flex';
  };
  $('btn-log-menu').addEventListener('click', open);
  $('btn-log-top').addEventListener('click', open);
  $('btn-log-close').addEventListener('click', () => { modal.style.display = 'none'; });
  $('btn-log-export').addEventListener('click', () => game.world.log.exportFile());
  $('btn-log-clear').addEventListener('click', () => {
    if (!confirm('清空全部历史日志？当前无法撤销')) return;
    game.world.log.clearPersisted();
    pre.textContent = '（暂无日志）';
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

function boot(): void {
  setupCrashLogger();
  const params = new URLSearchParams(location.search);

  // 无头模拟自测模式：跳过主菜单直接跑
  if (params.has('selftest')) {
    fitCanvas(document.getElementById('game') as HTMLCanvasElement);
    runSelftest();
    return;
  }

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const game = new Game(canvas);
  fitCanvas(canvas, game);
  window.addEventListener('resize', () => {
    fitCanvas(canvas, game);
    if (!game.loop.running) game.renderOnce();
  });
  // 开发调试句柄（仅dev模式）：浏览器控制台可用 __game 驱动游戏内部状态
  if (import.meta.env.DEV) {
    (window as unknown as { __game: Game }).__game = game;
  }

  // ---- 主菜单 ----
  const menu = document.getElementById('menu')!;
  const settings = document.getElementById('settings')!;
  const exitScreen = document.getElementById('exitScreen')!;

  game.renderOnce(); // 菜单背后垫一帧基地全景

  document.getElementById('btn-start')!.addEventListener('click', () => {
    menu.style.display = 'none';
    game.start();
  });
  document.getElementById('btn-settings')!.addEventListener('click', () => {
    settings.style.display = 'flex';
  });
  document.getElementById('btn-settings-close')!.addEventListener('click', () => {
    settings.style.display = 'none';
  });
  document.getElementById('btn-exit')!.addEventListener('click', () => {
    // 浏览器通常禁止脚本关闭非脚本打开的标签页，先尝试，失败则显示谢幕画面
    window.close();
    setTimeout(() => { exitScreen.style.display = 'flex'; }, 120);
  });

  wireAISettings();
  wireMapSetting();
  wireLogViewer(game);
}

/** 地图选择持久化（对下一局生效） */
function wireMapSetting(): void {
  const sel = document.getElementById('set-map') as HTMLSelectElement | null;
  if (!sel) return;
  try {
    const saved = localStorage.getItem('sm_map');
    if (saved === 'islands' || saved === 'standard') sel.value = saved;
  } catch { /* ignore */ }
  sel.addEventListener('change', () => {
    try { localStorage.setItem('sm_map', sel.value); } catch { /* ignore */ }
  });
}

boot();
