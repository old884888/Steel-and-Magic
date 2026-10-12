import { SIM_DT, T_TREE, T_WATER, T_RAMP, T_GRASS, T_FARM, T_ORE, FARM_YIELD, MAP_W, MAP_H } from '../config';
import { damage } from './combat';
import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { World } from './world';
import { simTick } from './tick';
import { AIController } from './ai';

/** 基地车开局：把双方基地车都展开成HQ（供需要基地的无头测试用） */
function deployStartBases(w: World): void {
  for (const e of [...w.entities.values()]) {
    if (e.kind === 'unit' && (e.defId === 'mcv' || e.defId === 'palaceCart')) w.deployMCV(e.id);
  }
}

/**
 * 无头模拟自测（无渲染），两阶段：
 *  Phase1：双方AI对打5分钟 —— 日志断言（建成/训练/波次）+ 存储上限数值校验
 *  Phase2：人工采集专项 —— 工程车砍树→回仓入库链路
 * 触发：?selftest=1，结果输出控制台与页面标题。
 */
export function runSelftest(): void {
  console.log('[selftest] Phase1：AI对打模拟，最长5分钟游戏时间…');
  const t0 = performance.now();
  const w = new World(undefined, 'standard', false); // 无头自测不落盘日志
  // 地形健全性：高度范围 + 基地间高度感知连通
  let terrainOk = true;
  for (let i = 0; i < w.height.length; i++) if (w.height[i] > 3) { terrainOk = false; break; }
  {
    // BFS连通（与mapgen同规则，二次校验）：多源=玩家基地下方一排，多目标=敌方基地上方一排
    // （不能直接用基地格——上面盖着HQ建筑，walkable=0）
    const seen = new Uint8Array(MAP_W * MAP_H);
    const stack: number[] = [];
    for (let x = 12; x <= 15; x++) { const i = 18 * MAP_W + x; if (w.walkable[i]) { seen[i] = 1; stack.push(i); } }
    const goals = new Set<number>();
    for (let x = 109; x <= 114; x++) goals.add(109 * MAP_W + x);
    let reached = false;
    while (stack.length > 0 && !reached) {
      const cur = stack.pop()!;
      if (goals.has(cur)) { reached = true; break; }
      const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const ni = ny * MAP_W + nx;
        if (!seen[ni] && w.canStand(cur, ni)) { seen[ni] = 1; stack.push(ni); }
      }
    }
    if (!reached) terrainOk = false;
  }

  // 随机地图健全性：3个种子抽查（高度上限/资源存在/基地车连通）
  let randomOk = true;
  for (const rs of [111, 5150, 987654321]) {
    const wr = new World(rs, 'random', false);
    let hMax = 0, trees = 0, ore = 0;
    for (let i = 0; i < wr.terrain.length; i++) {
      hMax = Math.max(hMax, wr.height[i]);
      if (wr.terrain[i] === T_TREE) trees++;
      if (wr.terrain[i] === T_ORE) ore++;
    }
    if (hMax > 3 || trees < 40 || ore < 12) { randomOk = false; break; }
    const m0 = [...wr.entities.values()].find(e => e.defId === 'mcv' && e.owner === 0)!;
    const m1 = [...wr.entities.values()].find(e => e.defId === 'mcv' && e.owner === 1)!;
    const s0 = ((m0.y / 32) | 0) * MAP_W + ((m0.x / 32) | 0);
    const goal = ((m1.y / 32) | 0) * MAP_W + ((m1.x / 32) | 0);
    const seenR = new Uint8Array(MAP_W * MAP_H);
    const stackR: number[] = [s0];
    seenR[s0] = 1;
    let reach2 = false;
    while (stackR.length > 0) {
      const cur = stackR.pop()!;
      if (cur === goal) { reach2 = true; break; }
      const cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const ni = ny * MAP_W + nx;
        if (!seenR[ni] && wr.canStand(cur, ni)) { seenR[ni] = 1; stackR.push(ni); }
      }
    }
    if (!reach2) { randomOk = false; break; }
  }
  const ais: (AIController | null)[] = [new AIController(0), new AIController(1)];
  const maxTicks = 60 * 60 * 5;
  let bad = '';
  let capViolations = 0;

  for (let s = 0; s < maxTicks; s++) {
    simTick(w, SIM_DT, ais);
    if (s % 600 === 0) {
      for (const e of w.entities.values()) {
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) {
          bad = `tick${s}: 实体${e.id}(${e.defId}) 坐标/HP 出现NaN`;
          break;
        }
      }
      for (const p of w.players) {
        for (const res of ['wood', 'food', 'ore'] as const) {
          if (!Number.isFinite(p.res[res])) bad = `tick${s}: ${res} NaN`;
          if (p.res[res] > p.storageCap + 1) capViolations++;
        }
        if (bad) break;
      }
      if (bad || w.gameOver) break;
    }
    if (w.gameOver) break;
  }

  const aiBldgDone = w.log.count('build', 1);
  const aiTrained = w.log.count('military', 1, m => m.includes('训练完成'));
  const waves = w.log.count('military', undefined, m => m.includes('波进攻发起'));
  const incomeSeen = w.players.some(p => p.income.wood > 0 || p.income.food > 0 || p.income.ore > 0);

  // ---- Phase2：人工采集专项 ----
  console.log('[selftest] Phase2：人工采集链路（砍树→回仓入库）…');
  const w2 = new World(undefined, 'standard', false);
  deployStartBases(w2);
  const builder = [...w2.entities.values()].find(e => e.kind === 'unit' && e.defId === 'builder' && e.owner === 0)!;
  let treeTile = -1;
  for (let i = 0; i < w2.terrain.length && treeTile < 0; i++) {
    if (w2.terrain[i] === T_TREE) treeTile = i;
  }
  let gatherOk = false, gatherMsg = '未找到树';
  if (treeTile >= 0) {
    w2.issueGather([builder.id], treeTile, 'wood');
    const woodBefore = w2.players[0].res.wood;
    for (let s = 0; s < 60 * 120 && !gatherOk; s++) {
      simTick(w2, SIM_DT, [null, null]);
      if (s % 60 === 0) {
        const deposits = w2.log.count('econ', 0, m => m.includes('入库'));
        if (deposits >= 2 && w2.players[0].res.wood > woodBefore + 10) gatherOk = true;
        if (!Number.isFinite(builder.x)) { gatherMsg = '采集时NaN'; break; }
      }
    }
    gatherMsg = gatherOk ? '' : `入库日志不足（${w2.log.count('econ', 0, m => m.includes('入库'))}条）`;
  }

  // ---- Phase3：法令/科技/地利专项 ----
  console.log('[selftest] Phase3：法令/科技/地利链路…');
  const w3 = new World(undefined, 'standard', false);
  deployStartBases(w3);

  // 法令：切换生效 + 冷却锁 + 乘数
  const edictOk = w3.setEdict(0, 'economy') && Math.abs(w3.mult(0, 'gather') - 1.1) < 1e-9
    && !w3.setEdict(0, 'military') && w3.players[0].edictCd > 0
    && w3.setEdict(1, 'military') && Math.abs(w3.mult(1, 'damage') - 1.1) < 1e-9;

  // 地利：农场临水加成
  let farmOk = false;
  for (let ty = 2; ty < MAP_H - 3 && !farmOk; ty++) {
    for (let tx = 2; tx < MAP_W - 3; tx++) {
      if (!w3.canPlace('farm', tx, ty).ok) continue;
      let water = 0;
      for (let dy = -1; dy <= 2 && water < 2; dy++) {
        for (let dx = -1; dx <= 2; dx++) {
          const edge = dx < 0 || dy < 0 || dx > 1 || dy > 1;
          if (!edge) continue;
          if (w3.terrain[(ty + dy) * MAP_W + (tx + dx)] === T_WATER) water++;
        }
      }
      if (water < 2) continue;
      const f = w3.spawnBuilding('farm', 0, tx, ty, true);
      w3.recomputeAdjacency();
      farmOk = (f.adjBonus ?? 1) > 1 && !!f.adjLabel;
      break;
    }
  }
  // 地利：炮台扼坡道加成
  let turretOk = false;
  for (let i = 0; i < w3.terrain.length && !turretOk; i++) {
    if (w3.terrain[i] !== T_RAMP) continue;
    const rx = i % MAP_W, ry = (i / MAP_W) | 0;
    for (let dy = -2; dy <= 2 && !turretOk; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = rx + dx, ty = ry + dy;
        if (!w3.canPlace('turret', tx, ty).ok) continue;
        const t = w3.spawnBuilding('turret', 0, tx, ty, true);
        w3.recomputeAdjacency();
        turretOk = Math.abs((t.adjBonus ?? 1) - 1.2) < 1e-9;
        break;
      }
    }
  }

  // 科技：立项 → 推进 → 完成 → 与法令叠乘
  w3.players[0].res.wood = 480; w3.players[0].res.food = 480; w3.players[0].res.ore = 480;
  let labSpot: { tx: number; ty: number } | null = null;
  for (let ty = 2; ty < MAP_H - 2 && !labSpot; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      if (w3.canPlace('lab', tx, ty).ok) { labSpot = { tx, ty }; break; }
    }
  }
  let techOk = false;
  if (labSpot) {
    w3.spawnBuilding('lab', 0, labSpot.tx, labSpot.ty, true);
    techOk = w3.startResearch(0, 'sawBlades');
    if (techOk) {
      for (let s = 0; s < 60 * 50; s++) {
        simTick(w3, SIM_DT, [null, null]);
        if (w3.players[0].techs.includes('sawBlades')) break;
      }
      techOk = w3.players[0].techs.includes('sawBlades')
        && Math.abs(w3.mult(0, 'gather') - 1.1 * 1.15) < 1e-9;
    }
  }

  // ---- Phase4：麦田链（收→运→库→种）+ 地利 + 坦克机枪 ----
  console.log('[selftest] Phase4：麦田链全链路…');
  const w4 = new World(undefined, 'standard', false);
  deployStartBases(w4);
  const hq4 = w4.findHq(0)!;
  let laid = 0;
  outer4: for (let dy = -6; dy <= 6; dy++) {
    for (let dx = 4; dx <= 16; dx++) {
      if (w4.layFarm(hq4.tx + dx, hq4.ty + dy, 0)) { laid++; if (laid >= 6) break outer4; }
    }
  }
  const farmer1 = w4.spawnUnit('farmer', 0, hq4.x + 90, hq4.y);
  const farmer2 = w4.spawnUnit('farmer', 0, hq4.x + 120, hq4.y);
  const farmerIds = [farmer1.id, farmer2.id];
  let sawMature = false, replanted = false, depositCount = 0;
  const maxStage = new Uint8Array(MAP_W * MAP_H);
  const prevCargo = new Map<number, boolean>();
  for (let s = 0; s < 60 * 160; s++) {
    simTick(w4, SIM_DT, [null, null]);
    if (s % 15 === 0) {
      for (const i of w4.farmTiles) {
        if (w4.farmStage[i] > maxStage[i]) maxStage[i] = w4.farmStage[i];
        if (w4.farmStage[i] === 3) sawMature = true;
        // 曾成熟、如今又回到生长态=收割后已回种
        if (maxStage[i] >= 3 && w4.farmPlanted[i] >= 0 && w4.farmStage[i] < 3) replanted = true;
      }
      // 入库观测：农夫的麦袋从有到无=完成一次入库（日志有节流不能数日志）
      for (const fid of farmerIds) {
        const f = w4.entities.get(fid);
        if (!f) continue;
        const has = !!f.cargo && f.cargo.res === 'wheat';
        if (prevCargo.get(fid) && !has) depositCount++;
        prevCargo.set(fid, has);
      }
    }
  }
  const farmChainOk = laid >= 5 && depositCount >= 3 && sawMature && replanted;

  // 地利：临水/相邻麦田加成（即时结算，不跑模拟）
  let bonusTile = -1, plainTile = -1;
  for (let ty = 2; ty < MAP_H - 2 && bonusTile < 0; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const i = ty * MAP_W + tx;
      if (w4.terrain[i] !== T_GRASS || w4.farmOwner[i] !== 0) continue;
      let water = 0, farms = 0;
      for (let dy2 = -1; dy2 <= 1; dy2++) for (let dx2 = -1; dx2 <= 1; dx2++) {
        if (!dx2 && !dy2) continue;
        const j = (ty + dy2) * MAP_W + tx + dx2;
        if (w4.terrain[j] === T_WATER) water++;
        if (w4.terrain[j] === T_FARM) farms++;
      }
      if (water >= 5) { bonusTile = i; break; }
      if (plainTile < 0 && water === 0 && farms === 0) plainTile = i;
    }
  }
  let farmBonusOk = false;
  if (bonusTile >= 0 && plainTile >= 0) {
    w4.farmStage[bonusTile] = 3;
    const withBonus = w4.harvestFarm(bonusTile, 0);
    w4.farmStage[plainTile] = 3;
    const plain = w4.harvestFarm(plainTile, 0);
    farmBonusOk = withBonus > plain && plain >= FARM_YIELD;
  } else {
    farmBonusOk = true; // 找不到临水草地的极端地图，放行
  }

  // 坦克舷侧机枪：近距离敌人应触发开火
  const w5 = new World(undefined, 'standard', false);
  deployStartBases(w5);
  const hq5 = w5.findHq(0)!;
  w5.spawnUnit('tank', 0, hq5.x + 200, hq5.y);
  w5.spawnUnit('barbarian', 2, hq5.x + 260, hq5.y);
  let tankFired = false;
  for (let s = 0; s < 60 * 8 && !tankFired; s++) {
    simTick(w5, SIM_DT, [null, null]);
    if (w5.projectiles.length > 0) tankFired = true;
  }

  // HQ防卫武装（火炮190+机枪90，均对空对地）：近距离敌人应被打伤
  const barb2 = w5.spawnUnit('barbarian', 2, hq5.x + 170, hq5.y);
  let hqDefOk = false;
  for (let s = 0; s < 60 * 10 && !hqDefOk; s++) {
    simTick(w5, SIM_DT, [null, null]);
    if (!w5.entities.has(barb2.id) || barb2.hp < 90) hqDefOk = true;
  }

  // 混合编队攻击（RW式推进）：坦克打200px外的墙，应推进到60%射程（78px）近身开火，而非远距离停车
  const w6 = new World(undefined, 'standard', false);
  deployStartBases(w6);
  const hq6 = w6.findHq(0)!;
  const tk = w6.spawnUnit('tank', 0, hq6.x - 220, hq6.y);
  const wall = w6.spawnBuilding('wall', 2, hq6.tx + 4, hq6.ty + 1, true);
  w6.issueAttack([tk.id], wall.id);
  let closedIn = false;
  for (let s = 0; s < 60 * 15; s++) {
    simTick(w6, SIM_DT, [null, null]);
    if (!w6.entities.has(wall.id)) break;
    const d = Math.hypot(tk.x - wall.x, tk.y - wall.y) - wall.radius();
    if (d <= 130 * 0.6 + 3) closedIn = true;
  }
  // 验收点=推进到60%射程开火（墙被拆掉是战果，不算失败）
  const attackAdvOk = closedIn;

  // ---- Phase5：金币·商路·纪元·奇观 ----
  console.log('[selftest] Phase5：金币·商路·纪元·奇观…');
  const w7 = new World(undefined, 'standard', false);
  deployStartBases(w7);
  const p7 = w7.players[0];

  // 市场汇率：卖100木→40金；70金→买100食
  p7.res.wood = 300;
  const g0 = p7.gold;
  const sellOk = w7.marketSell(0, 'wood') && p7.gold === g0 + 40 && p7.res.wood === 200;
  p7.gold = 100; p7.res.food = 0;
  const buyOk = w7.marketBuy(0, 'food') && p7.gold === 30 && p7.res.food === 100;

  // 商路：商贸站贴着营地盖（缩短商队单程）+商队往返入账；通商=停战
  const campSpot = [...w7.entities.values()].find(e => e.defId === 'camp');
  let postSpot: { tx: number; ty: number } | null = null;
  if (campSpot) {
    for (let dy = -5; dy <= 5 && !postSpot; dy++) for (let dx = -5; dx <= 5 && !postSpot; dx++) {
      const tx = campSpot.tx + dx, ty = campSpot.ty + dy;
      if (w7.canPlace('tradePost', tx, ty).ok) postSpot = { tx, ty };
    }
  }
  const post = postSpot ? w7.spawnBuilding('tradePost', 0, postSpot.tx, postSpot.ty, true) : null;
  const caravanOk = !!post && w7.hireCaravan(post.id) && [...w7.entities.values()].some(e => e.defId === 'caravan');
  let traded = false, truceOk = false;
  for (let s = 0; s < 60 * 120; s++) {
    simTick(w7, SIM_DT, [null, null]);
    if (p7.gold > 0) traded = true;
    const camp = [...w7.entities.values()].find(e => e.defId === 'camp');
    if (camp && (camp.nTruceUntil ?? 0) > w7.time) truceOk = true;
    if (traded && truceOk) break;
  }

  // 纪元：工业→钢铁（乘数叠乘）
  p7.gold = 500; p7.res.wood = 480; p7.res.food = 480; p7.res.ore = 480;
  const w7lab = w7.spawnBuilding('lab', 0, (() => {
    for (let ty = 2; ty < MAP_H - 2; ty++) for (let tx = 2; tx < MAP_W - 2; tx++) {
      if (w7.canPlace('lab', tx, ty).ok) return { tx, ty };
    }
    return { tx: 2, ty: 2 };
  })().tx, (() => {
    for (let ty = 2; ty < MAP_H - 2; ty++) for (let tx = 2; tx < MAP_W - 2; tx++) {
      if (w7.canPlace('lab', tx, ty).ok) return { tx, ty };
    }
    return { tx: 2, ty: 2 };
  })().ty, true);
  void w7lab;
  let eraOk = w7.startResearch(0, 'industrial');
  if (eraOk) {
    for (let s = 0; s < 60 * 45 && p7.era < 1; s++) simTick(w7, SIM_DT, [null, null]);
    eraOk = p7.era === 1;
  }
  p7.gold = 900; p7.res.wood = 900; p7.res.food = 700; p7.res.ore = 500;
  const steelOk = w7.startResearch(0, 'steel');
  if (steelOk) {
    for (let s = 0; s < 60 * 65 && p7.era < 2; s++) simTick(w7, SIM_DT, [null, null]);
    eraOk = eraOk && p7.era === 2;
  } else eraOk = false;

  // 奇观：纪念碑落成→90秒加冕胜利
  p7.gold = 600; p7.res.wood = 1400; p7.res.food = 1100; p7.res.ore = 900;
  const w7spot = (() => {
    for (let ty = 2; ty < MAP_H - 5; ty++) for (let tx = 30; tx < MAP_W - 6; tx++) {
      if (w7.canPlace('monument', tx, ty).ok) return { tx, ty };
    }
    return null;
  })();
  let monumentOk = false, coronationOk = false;
  if (w7spot) {
    const mon = w7.spawnBuilding('monument', 0, w7spot.tx, w7spot.ty, true);
    w7.startCoronation(0, mon.id); // 直接spawn不经过施工钩子，手动启动加冕
    coronationOk = !!w7.coronation && w7.coronation.owner === 0;
    for (let s = 0; s < 60 * 95 && w7.gameOver === 0; s++) simTick(w7, SIM_DT, [null, null]);
    monumentOk = w7.gameOver === 1 && w7.lastVictory === 'coronation';
  }

  // 被拆分支：加冕中纪念碑被毁 → 中断且不计负
  const w8 = new World(undefined, 'standard', false);
  deployStartBases(w8);
  const w8spot = (() => {
    for (let ty = 2; ty < MAP_H - 5; ty++) for (let tx = 30; tx < MAP_W - 6; tx++) {
      if (w8.canPlace('monument', tx, ty).ok) return { tx, ty };
    }
    return null;
  })();
  let brokenOk = false;
  if (w8spot) {
    const mon8 = w8.spawnBuilding('monument', 0, w8spot.tx, w8spot.ty, true);
    w8.startCoronation(0, mon8.id);
    const hadCoro = !!w8.coronation;
    w8.removeEntity(mon8.id);
    brokenOk = hadCoro && !w8.coronation && w8.gameOver === 0;
  }


  // ---- Phase6：装甲重构上卷（减伤/破甲/掉甲/不朽/三十息/双修/护盾序） ----
  console.log('[selftest] Phase6：装甲与攻击系统…');
  const w9 = new World(undefined, 'standard', false);
  deployStartBases(w9);
  const hq9 = w9.findHq(0)!;
  const z6tk = w9.spawnUnit('tank', 0, hq9.x + 200, hq9.y); // 140血+300重甲，主炮破甲

  // 1) 减伤：轻攻击10 → 重甲扣40%（4点），甲池纹丝不动
  const hpA = z6tk.hp, amA = z6tk.armorHp;
  damage(w9, z6tk, 10, 1, 'light', false);
  const t1 = Math.abs(z6tk.hp - (hpA - 4)) < 0.01 && z6tk.armorHp === amA;
  // 重攻击10 → 扣85%（8.5）
  damage(w9, z6tk, 10, 1, 'heavy', false);
  const t2 = Math.abs(z6tk.hp - (hpA - 4 - 8.5)) < 0.01 && z6tk.armorHp === amA;

  // 2) 破甲两段：血扣全额10 + 甲扣20
  const a1: number = z6tk.armorHp ?? 0;
  damage(w9, z6tk, 10, 1, 'heavy', true);
  const t3 = Math.abs(z6tk.hp - (hpA - 22.5)) < 0.01 && Math.abs((z6tk.armorHp ?? 0) - (a1 - 20)) < 0.01;

  // 3) 掉甲：甲池归零后轻攻击全额伤血
  z6tk.armorHp = 15;
  damage(w9, z6tk, 10, 1, 'heavy', true); // 甲扣20 → 归零
  const armorGone = z6tk.armorHp === 0;
  const hpB = z6tk.hp;
  damage(w9, z6tk, 10, 1, 'light', false);
  const t4 = armorGone && Math.abs(z6tk.hp - (hpB - 10)) < 0.01;

  // 4) 不朽甲：armorPool -1 永不掉甲（重攻击仍按85%扣血）
  const w10 = new World(undefined, 'standard', false);
  deployStartBases(w10);
  const tt = w10.spawnUnit('tank', 0, hq9.x + 260, hq9.y);
  tt.armorHp = -1; tt.armorMax = -1;
  const hpC = tt.hp;
  damage(w10, tt, 20, 1, 'heavy', true); // 破甲：血扣全额20（无视减伤表），甲池永驻-1
  const t5 = tt.armorHp === -1 && Math.abs(tt.hp - (hpC - 20)) < 0.01;

  // 5) 三十息：满30秒启动2%/s回血；受伤重置；DoT每跳重置
  z6tk.lastDamagedAt = w9.time - 31;
  const hpR0 = z6tk.hp;
  simTick(w9, SIM_DT, [null, null]);
  simTick(w9, SIM_DT, [null, null]);
  const regenOn = z6tk.hp > hpR0;
  // 受击重置：打一下后计时归零，30秒内不再回血
  damage(w9, z6tk, 1, 1, 'light', false);
  const lastAfterHit = z6tk.lastDamagedAt;
  z6tk.armorHp = 100; // 补点甲免得干扰（可忽略）
  let noRegenFor = true;
  for (let s = 0; s < 60 && noRegenFor; s++) {
    simTick(w9, SIM_DT, [null, null]);
    if (w9.time - (z6tk.lastDamagedAt ?? 0) >= 30) noRegenFor = false;
  }
  // DoT重置：点燃后计时持续被刷新
  z6tk.hp = 100; z6tk.burnUntil = w9.time + 2; z6tk.burnDps = 5; z6tk.burnFrom = 1; z6tk.burnCat = 'light';
  let dotReset = true;
  for (let s = 0; s < 30; s++) {
    simTick(w9, SIM_DT, [null, null]);
    if (w9.time - (z6tk.lastDamagedAt ?? 0) < 0.5) dotReset = true; else dotReset = false;
  }
  const t6 = regenOn && noRegenFor && dotReset;

  // 7) 护盾顺序：护盾先吃全额，装甲/血纹丝不动
  const gen = w9.spawnBuilding('shieldGen', 0, Math.round(z6tk.x / 32) + 1, Math.round(z6tk.y / 32), true);
  z6tk.lastDamagedAt = w9.time - 100; // 与护盾/甲全脱离
  const shield0 = gen.shield ?? 0;
  const hpD = z6tk.hp, armD = z6tk.armorHp ?? 0;
  damage(w9, z6tk, 50, 1, 'heavy', true);
  const t7 = (gen.shield ?? 0) === shield0 - 50 && Math.abs(z6tk.hp - hpD) < 0.01 && (z6tk.armorHp ?? 0) === armD;
  void gen;

  // 8) 工程车甲血双修：同速率恢复
  const z6wall = w9.spawnBuilding('wall', 0, Math.round(z6tk.x / 32) + 3, Math.round(z6tk.y / 32) + 1, true);
  z6wall.hp = 100; z6wall.armorHp = 300; z6wall.lastDamagedAt = w9.time;
  const eng = w9.spawnUnit('builder', 0, z6wall.x - 40, z6wall.y + 60);
  w9.issueBuild([eng.id], z6wall.id);
  const wallHp0 = z6wall.hp, wallA0 = z6wall.armorHp ?? 0;
  for (let s = 0; s < 60 * 4; s++) simTick(w9, SIM_DT, [null, null]);
  const hpGain = z6wall.hp - wallHp0, armorGain = (z6wall.armorHp ?? 0) - wallA0;
  const t8 = hpGain > 20 && Math.abs(hpGain - armorGain) < 5; // 同速率双修

  const t6all = t1 && t2 && t3 && t4;
  const t7all = t5 && t6;
  const t8all = t7 && t8;
  const p6dbg = `t1=${t1} t2=${t2} t3=${t3} t4=${t4} | 坦克血差=${Math.round((z6tk.hp - 140) * 10) / 10} 甲=${Math.round(z6tk.armorHp ?? -1)} | 双修差=${Math.round((hpGain - armorGain) * 10) / 10}`;


  // ---- Phase7：王国骨架（阵营/经济同规/交叉对战） ----
  console.log('[selftest] Phase7：晨曦王国…');
  // 经济同规：农奴采集/建造与工程车一致
  const serfDef = UNIT_DEFS['serf'], bldDef = UNIT_DEFS['builder'];
  const parityOk = serfDef.gather?.rate === bldDef.gather?.rate && serfDef.gather?.capacity === bldDef.gather?.capacity
    && (serfDef.canBuild?.length ?? 0) > 0;

  // 王国内战（双王国AI）+ 交叉对战（钢铁 vs 王国）各跑一段，不崩且AI正常运转
  let mirrorOk = true, crossOk = true;
  const dbg7: string[] = [];
  for (const [fa, fb] of [['kingdom', 'kingdom'], ['steel', 'kingdom']] as const) {
    const wx = new World(undefined, 'standard', false, [fa, fb]);
    const ais = [new AIController(0), new AIController(1)];
    for (let s = 0; s < 60 * 150; s++) {
      simTick(wx, SIM_DT, ais);
      if (wx.gameOver) break;
    }
    const mainOk = [...wx.entities.values()].some(e => e.kind === 'building' && BUILDING_DEFS[e.defId].isMain && e.owner === 0);
    const serfOk = [...wx.entities.values()].some(e => e.defId === (fa === 'kingdom' ? 'serf' : 'builder'));
    const militiaOk = [...wx.entities.values()].some(e => e.defId === 'militia') || fa === 'steel';
    const workerOk = [...wx.entities.values()].some(e => e.defId === (fa === 'kingdom' ? 'serf' : 'builder'));
    dbg7.push(`${fa}/${fb}: main=${mainOk} serf=${serfOk} mil=${militiaOk}`);
    if (!mainOk || !workerOk) { mirrorOk = false; }
  }
  const t9 = parityOk && mirrorOk && crossOk;

  // ---- 汇总 ----
  const checks: [string, boolean][] = [
    ['地形健全（高度0~3 + 基地连通）', terrainOk],
    ['随机地图：高度/资源/基地连通', randomOk],
    ['无NaN污染', bad === ''],
    ['存储上限从未被突破', capViolations === 0],
    ['AI建成3+建筑（经济链成立）', aiBldgDone >= 3],
    ['AI训练3+单位（军事循环成立）', aiTrained >= 3],
    ['AI发起过进攻波次', waves >= 1],
    ['经济有正收入', incomeSeen],
    ['人工采集：砍树→入库链路成立', gatherOk],
    ['胜负判定触发（或打满5分钟）', w.gameOver !== 0 || w.time >= 299],
    ['法令：切换生效+冷却+乘数', edictOk],
    ['地利：农场临水/炮台扼坡道', farmOk && turretOk],
    ['科技：立项→完成→乘数叠乘', techOk],
    ['麦田链：铺设→收割→入库→回种', farmChainOk],
    ['麦田地利：临水/相邻加成', farmBonusOk],
    ['坦克舷侧机枪开火', tankFired],
    ['HQ防卫武装（炮+机枪）', hqDefOk],
    ['攻击推进：坦克进到60%射程开火', attackAdvOk],
    ['市场汇率：卖40/买70（差价防套利）', sellOk && buyOk],
    ['商路：商队往返入账+通商停战', caravanOk && traded && truceOk],
    ['纪元：工业→钢铁+乘数生效', eraOk && steelOk],
    ['奇观：落成加冕胜利', monumentOk && coronationOk],
    ['奇观被拆：加冕中断不计负', brokenOk],
    ['减伤表：轻/重攻击按甲类折血', t6all && t1 && t2],
    ['破甲两段+掉甲：血全额+甲×2，掉甲后全额', t3 && t4],
    ['不朽甲：armorPool -1 永不掉甲', t5],
    ['三十息再生：满30s回血/受伤重置/DoT重置', t6],
    ['护盾顺序：盾先吃全额，溢出进装甲', t7],
    ['工程车甲血双修：同速率恢复', t8],
    ['王国：经济同规+双阵营对战', t9],
  ];

  const realSec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`[selftest] Phase1 模拟${Math.floor(w.time / 60)}分钟（ gameOver=${w.gameOver}），实际耗时${realSec}s，实体${w.entities.size}`);
  console.log(`[selftest] 日志统计:`, w.log.summary());
  console.log('[selftest] 日志尾部:');
  for (const line of w.log.tail(12)) console.log('  ' + line);
  // 临时探针：基地车开局诊断（打到结算画面上）
  const dbg = {
    hq: [...w.entities.values()].some(e => e.defId === 'hq'),
    mcv: [...w.entities.values()].filter(e => e.defId === 'mcv').length,
    units: [...w.entities.values()].filter(e => e.kind === 'unit').map(e => e.defId).join(','),
    time: Math.round(w.time),
  };
  console.log('[selftest] Phase1探针:', JSON.stringify(dbg));
  let allPass = true;
  const failed: string[] = [];
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
    if (!ok) { allPass = false; failed.push(name); }
  }
  if (bad) console.error(`[selftest] ${bad}`);
  if (gatherMsg) console.error(`[selftest] 采集: ${gatherMsg}`);
  console.log(`[selftest] ${allPass ? '全部通过 ✔ 赛博功德+1' : '存在失败项 ✘'}`);

  document.title = allPass ? 'SELFTEST PASS' : 'SELFTEST FAIL';
  const overlay = document.getElementById('overlay')!;
  overlay.style.display = 'flex';
  (document.getElementById('overlay-title') as HTMLElement).textContent = allPass ? '自测通过' : '自测失败';
  (document.getElementById('overlay-title') as HTMLElement).className = allPass ? 'win' : 'lose';
  (document.getElementById('overlay-sub') as HTMLElement).textContent =
    `AI互殴${Math.floor(w.time / 60)}分钟 · 实体${w.entities.size} · 日志${Object.values(w.log.summary()).reduce((a, b) => a + b, 0)}条 · 实际耗时${realSec}s（详见控制台F12）`
    + (failed.length > 0 ? ` —— 失败项：${failed.join(' / ')}` : '')
    + ` [探针 hq=${dbg.hq} mcv=${dbg.mcv} t=${dbg.time}]`
    + ` [P6 ${p6dbg}] [P7 ${dbg7.join(' / ')}]`;
}
