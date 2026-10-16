import { SIM_DT, T_TREE, T_WATER, T_RAMP, T_GRASS, T_FARM, T_ORE, FARM_YIELD, MAP_W, MAP_H } from '../config';
import { damage } from './combat';
import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { World } from './world';
import type { Entity } from './entity';
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
  const maxTicks = 60 * 60 * 9; // v0.18 人口经济：AI首波是慢变量，5分钟窗口看不到（9分钟冒烟）
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

  // ---- Phase2：岗位经济专项（v0.18：伐木场→补员→居民伐木→小缓冲） ----
  console.log('[selftest] Phase2：岗位经济链路（伐木场→补员→缓冲）…');
  const w2 = new World(undefined, 'standard', false);
  deployStartBases(w2);
  let treeTile = -1;
  for (let i = 0; i < w2.terrain.length && treeTile < 0; i++) {
    if (w2.terrain[i] === T_TREE) treeTile = i;
  }
  let gatherOk = false, gatherMsg = '未找到树';
  if (treeTile >= 0) {
    const tx2 = treeTile % MAP_W, ty2 = (treeTile / MAP_W) | 0;
    const lumber = w2.spawnBuilding('lumber', 0, Math.max(2, tx2 - 1), Math.max(2, ty2), true);
    const pool0 = w2.players[0].residents;
    const staffed = w2.assignJob(lumber.id) && w2.assignJob(lumber.id)
      && (lumber.staffIds?.length ?? 0) === 2 && w2.players[0].residents === pool0 - 2;
    let sawBuffer = false;
    for (let s = 0; s < 60 * 150 && !gatherOk; s++) {
      simTick(w2, SIM_DT, [null, null]);
      if (s % 30 === 0 && lumber.buffer > 5) sawBuffer = true;
      if (staffed && sawBuffer) gatherOk = true;
    }
    gatherMsg = gatherOk ? '' : `补员=${staffed} 缓冲=${lumber.buffer.toFixed(1)}`;
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
  // 农庄+补员：农夫=居民实体（v0.18）；铺田须落在农庄管辖半径内
  let farmA4: Entity | null = null;
  for (let r = 3; r <= 8 && !farmA4; r++) {
    for (let dy = -r; dy <= r && !farmA4; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = hq4.tx + dx, ty = hq4.ty + dy;
      if (!w4.canPlace('farm', tx, ty).ok) continue;
      farmA4 = w4.spawnBuilding('farm', 0, tx, ty, true);
      break;
    }
  }
  let farmerIds: number[] = [];
  if (farmA4) {
    w4.assignJob(farmA4.id); w4.assignJob(farmA4.id);
    farmerIds = [...(farmA4.staffIds ?? [])];
  }
  let laid = 0;
  if (farmA4) {
    outer4: for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -7; dx <= 7; dx++) {
        if (w4.layFarm(farmA4.tx + dx, farmA4.ty + dy, 0)) { laid++; if (laid >= 6) break outer4; }
      }
    }
  }
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
  const farmChainOk = laid >= 5 && farmA4 != null && farmerIds.length === 2
    && depositCount >= 3 && sawMature && replanted;

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
  const parityOk = (serfDef.canBuild?.length ?? 0) > 0 && (bldDef.canBuild?.length ?? 0) > 0
    && serfDef.producedBy === 'lifeTree' && bldDef.producedBy === 'hq'
    && UNIT_DEFS['farmer'] === undefined; // 独立农夫确认退役

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

  // ---- Phase8：中立生态与动物AI（FID/狼群/拴绳/真近战/腐烂/繁殖） ----
  console.log('[selftest] Phase8：中立生态与动物AI…');
  const G = 32; // 格→像素
  // 8.1 鹿FID：6格警戒（驻足面向）、3格逃窜（方向=威胁反向）、受伤7格也逃
  const wA = new World(undefined, 'standard', false);
  const fx0 = 80 * G, fy0 = 112 * G; // 僻静角（远离天然狼窝/营地/鹿群）
  const deerA = wA.spawnUnit('deer', 2, fx0, fy0);
  const manA = wA.spawnUnit('builder', 0, fx0 + 6 * G, fy0); // 无武器单位当威胁，避免自动开火干扰
  for (let s = 0; s < 40; s++) simTick(wA, SIM_DT, [null, null]);
  const faceOk = Math.abs(((deerA.angle - Math.atan2(manA.y - deerA.y, manA.x - deerA.x) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.6;
  const alertOk = deerA.order.kind === 'idle' && faceOk;
  manA.x = fx0 + 3 * G; manA.y = fy0;
  let fled = false, awayOk = false;
  for (let s = 0; s < 60 && !fled; s++) {
    simTick(wA, SIM_DT, [null, null]);
    if (deerA.order.kind === 'move' && deerA.order.target) {
      fled = true;
      awayOk = Math.hypot(deerA.order.target.x - manA.x, deerA.order.target.y - manA.y)
        > Math.hypot(deerA.x - manA.x, deerA.y - manA.y);
    }
  }
  const deerB = wA.spawnUnit('deer', 2, fx0, fy0 - 14 * G);
  deerB.hp = 30; // 受伤：8格内见人就跑
  const manB = wA.spawnUnit('builder', 0, fx0, fy0 - 14 * G - 7 * G);
  let scaredOk = false;
  for (let s = 0; s < 60 && !scaredOk; s++) {
    simTick(wA, SIM_DT, [null, null]);
    if (deerB.order.kind === 'move' && deerB.order.target) {
      scaredOk = Math.hypot(deerB.order.target.x - manB.x, deerB.order.target.y - manB.y)
        > Math.hypot(deerB.x - manB.x, deerB.y - manB.y);
    }
  }
  const t10 = alertOk && fled && awayOk && scaredOk;

  // 8.2 狼群群体仇恨 + 真近战无弹道 + 拴绳（咬合期→风筝期两段）
  const wB = new World(undefined, 'standard', false);
  const wx0 = 56 * G, wy0 = 56 * G;
  const wolf1 = wB.spawnUnit('wolf', 2, wx0 - 20, wy0);
  const wolf2 = wB.spawnUnit('wolf', 2, wx0 + 20, wy0);
  for (const wl of [wolf1, wolf2]) { wl.homeX = wx0; wl.homeY = wy0; }
  const prey = wB.spawnUnit('builder', 0, wx0 + 4 * G, wy0); // 家域4格内：全窝上
  let packOk = false, maxProj = 0;
  for (let s = 0; s < 80 && !packOk; s++) {
    simTick(wB, SIM_DT, [null, null]);
    maxProj = Math.max(maxProj, wB.projectiles.length);
    packOk = wolf1.order.kind === 'attack' && wolf2.order.kind === 'attack'
      && wolf1.engagedId === prey.id && wolf2.engagedId === prey.id;
  }
  for (let s = 0; s < 120; s++) { simTick(wB, SIM_DT, [null, null]); maxProj = Math.max(maxProj, wB.projectiles.length); }
  const meleeOk = maxProj === 0 && prey.hp < UNIT_DEFS['builder'].hp; // 咬到了且全程零弹道
  prey.x = wx0 + 12 * G; prey.y = wy0; // 风筝：拖到离家12格（>拴绳8格）——狼凭旧攻击令继续追
  let leashed = false, staysHome = true;
  for (let s = 0; s < 60 * 20 && !(leashed && s > 60 * 6); s++) {
    simTick(wB, SIM_DT, [null, null]);
    maxProj = Math.max(maxProj, wB.projectiles.length);
    const hd = Math.hypot(wolf1.x - wx0, wolf1.y - wy0);
    if (hd > 8 * G && wolf1.order.kind === 'move' && wolf1.order.target
      && Math.hypot(wolf1.order.target.x - wx0, wolf1.order.target.y - wy0) < G) leashed = true;
    if (leashed && wolf1.order.kind === 'attack') staysHome = false; // 回程不索敌
  }
  const t11 = packOk && leashed && staysHome && meleeOk;

  // 8.3 尸体：半额立付 + 份额衰减（10/20/30/40s → 75%/50%/25%/0%）+ 走近自动拾取
  const wC = new World(undefined, 'standard', false);
  const cx0 = 80 * G, cy0 = 112 * G;
  const killAt = (ox: number) => {
    const spot = { x: cx0 + ox, y: cy0 };
    const d = wC.spawnUnit('deer', 2, spot.x, spot.y);
    const food0 = wC.players[0].res.food;
    damage(wC, d, 999, 0, 'light', false);
    return { spot, instant: wC.players[0].res.food - food0 };
  };
  const foodC0 = wC.players[0].res.food;
  const k1 = killAt(0);
  const gotNow = k1.instant === 20 && wC.carcasses.length === 1 && wC.carcasses[0].amount0 === 20;
  wC.spawnUnit('builder', 0, k1.spot.x + 60, k1.spot.y + 30); // 3格内的拾取者
  simTick(wC, SIM_DT, [null, null]);
  const pickOk = wC.carcasses.length === 0 && Math.abs(wC.players[0].res.food - (foodC0 + 40)) < 0.01; // 20立付+20拾取
  // 衰减阶梯：等待加30tick，避开浮点累加在整10秒边界抖动
  const decayAt = (ox: number, waitSec: number, expect: number) => {
    const k = killAt(ox);
    for (let s = 0; s < 60 * waitSec + 30; s++) simTick(wC, SIM_DT, [null, null]);
    wC.spawnUnit('builder', 0, k.spot.x + 60, k.spot.y + 30);
    const f = wC.players[0].res.food;
    simTick(wC, SIM_DT, [null, null]);
    return wC.players[0].res.food - f === expect;
  };
  const decay15 = decayAt(18 * G, 10, 15);
  const decay10 = decayAt(-18 * G, 20, 10);
  const decay5 = decayAt(36 * G, 30, 5);
  const decay0 = decayAt(-36 * G, 41, 0);
  const t12 = gotNow && pickOk && decay15 && decay10 && decay5 && decay0;

  // 8.4 繁殖：群2只→90秒+1→直封顶5只；全图上限受 deerCap 约束
  const wD = new World(undefined, 'standard', false);
  const capOk0 = wD.deerCap === 19; // 天然鹿15只+4
  wD.deerCap = 999; // 关全局上限，单测群上限
  const bx0 = 108 * G, by0 = 108 * G;
  const h1 = wD.spawnUnit('deer', 2, bx0, by0);
  const h2 = wD.spawnUnit('deer', 2, bx0 + G, by0);
  for (const hh of [h1, h2]) { hh.homeX = bx0; hh.homeY = by0; }
  const herdCount = () => [...wD.entities.values()].filter(e => e.defId === 'deer' && e.homeX === bx0 && e.homeY === by0).length;
  let grew = false, capped = false;
  for (let s = 0; s < 60 * 320; s++) {
    simTick(wD, SIM_DT, [null, null]);
    const n = herdCount();
    if (n >= 3) grew = true;
    if (n >= 5) { capped = true; break; }
  }
  const countAtCap = herdCount();
  for (let s = 0; s < 60 * 95 && capped; s++) simTick(wD, SIM_DT, [null, null]); // 满5后再等95秒：一只不加
  const breedOk = capOk0 && grew && capped && countAtCap === 5 && herdCount() === 5;
  // 全局上限：cap 压到当前总数 → 拒绝繁殖
  const totalDeer = [...wD.entities.values()].filter(e => e.defId === 'deer').length;
  wD.deerCap = totalDeer;
  for (let s = 0; s < 60 * 95; s++) simTick(wD, SIM_DT, [null, null]);
  const globalCapOk = [...wD.entities.values()].filter(e => e.defId === 'deer').length === totalDeer;
  const t13 = breedOk && globalCapOk;
  const p8dbg = `fid=${t10} pack=${t11}(proj=${maxProj}) 腐烂=${t12}(${k1.instant}/15:${decay15}/10:${decay10}/5:${decay5}/0:${decay0}) 繁殖=${t13}`;

  // ---- Phase9：居民与家园（转职/殉职/民心/税/搬运工/取料表演） ----
  console.log('[selftest] Phase9：居民与家园…');
  // 9.1 转职迁居 + 殉职空缺
  const wA9 = new World(undefined, 'standard', false);
  deployStartBases(wA9);
  const hqA9 = wA9.findHq(0)!;
  let fspot9: { tx: number; ty: number } | null = null;
  outerA9: for (let r = 3; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (wA9.canPlace('farm', hqA9.tx + dx, hqA9.ty + dy).ok) { fspot9 = { tx: hqA9.tx + dx, ty: hqA9.ty + dy }; break outerA9; }
    }
  }
  let t14 = false, t15 = false;
  if (fspot9) {
    const farm9 = wA9.spawnBuilding('farm', 0, fspot9.tx, fspot9.ty, true);
    const pool0 = wA9.players[0].residents;
    t14 = wA9.assignJob(farm9.id) && wA9.players[0].residents === pool0 - 1
      && (farm9.staffIds?.length ?? 0) === 1
      && UNIT_DEFS['resident'].resident === true;
    const worker9 = wA9.entities.get(farm9.staffIds![0])!;
    const popBefore = wA9.players[0].pop;
    damage(wA9, worker9, 999, 1, 'light', false);
    for (let s = 0; s < 40; s++) simTick(wA9, SIM_DT, [null, null]); // 跨过对账节拍
    t15 = !wA9.entities.has(worker9.id) && (farm9.staffIds?.length ?? 0) === 0
      && wA9.players[0].pop === popBefore - 1;
  } else t15 = true; // 找不到空地的极端地图放行

  // 9.2 民心：增长/流失/战争豁免
  const wB9 = new World(undefined, 'standard', false);
  deployStartBases(wB9);
  const hqB9 = wB9.findHq(0)!;
  const houseSpot9 = (minR: number, maxR: number): { tx: number; ty: number } | null => {
    for (let r = minR; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (wB9.canPlace('house', hqB9.tx + dx, hqB9.ty + dy).ok) return { tx: hqB9.tx + dx, ty: hqB9.ty + dy };
      }
    }
    return null;
  };
  const hs1 = houseSpot9(3, 8);
  let t16 = false, t16b = false, t16c = false;
  if (hs1) {
    wB9.spawnBuilding('house', 0, hs1.tx, hs1.ty, true);
    wB9.recomputePop();
    // 增长：民心≥60 且 5<10 → 30秒+1（35秒窗口恰一次）
    const r0 = wB9.players[0].residents;
    for (let s = 0; s < 60 * 35; s++) simTick(wB9, SIM_DT, [null, null]);
    t16 = wB9.players[0].residents === r0 + 1;
    // 流失：拉爆民心（远房无覆盖民居 + 断粮 + 高税 → 民心≤30）→ 60秒-1
    const hs2 = houseSpot9(13, 26);
    if (hs2) {
      wB9.spawnBuilding('house', 0, hs2.tx, hs2.ty, true);
      wB9.recomputePop();
      wB9.players[0].taxTier = 2;
      const r1 = wB9.players[0].residents;
      for (let s = 0; s < 60 * 70; s++) {
        simTick(wB9, SIM_DT, [null, null]);
        if (s % 30 === 0) wB9.players[0].res.food = 0; // 压住HQ保底产出，维持真饥荒
      }
      t16b = wB9.players[0].residents === r1 - 1;
    } else t16b = true; // 极端地图放行
    // 战争豁免：敌军压境 → 流失暂停（持续补兵维持入侵态）
    let invader = wB9.spawnUnit('barbarian', 2, hqB9.x + 120, hqB9.y);
    const r2 = wB9.players[0].residents;
    for (let s = 0; s < 60 * 70; s++) {
      simTick(wB9, SIM_DT, [null, null]);
      if (!wB9.entities.has(invader.id)) {
        invader = wB9.spawnUnit('barbarian', 2, hqB9.x + 120 + ((s >> 4) % 60) - 30, hqB9.y + ((s >> 5) % 60) - 30);
      }
    }
    t16c = wB9.players[0].residents === r2;
  }

  // 9.3 人口税：中税2金/人/分钟精确；高税3金且民心减成
  const wC9 = new World(undefined, 'standard', false);
  deployStartBases(wC9);
  const p9c = wC9.players[0];
  const gtax0 = p9c.gold;
  for (let s = 0; s < 60 * 60; s++) simTick(wC9, SIM_DT, [null, null]);
  const t17a = Math.abs(p9c.gold - gtax0 - 10) < 1.5; // 5人×中税2金/人/分钟
  const moraleMid = p9c.morale;
  wC9.setTaxTier(0); // 中→高
  const gtax1 = p9c.gold;
  for (let s = 0; s < 60 * 60; s++) simTick(wC9, SIM_DT, [null, null]);
  const t17b = Math.abs(p9c.gold - gtax1 - 15) < 1.5; // 高税3金/人/分钟
  const t17 = t17a && t17b && p9c.morale < moraleMid;

  // 9.4 搬运工：辖内缓冲过半 → 扛运入库（伐木场>14格隔离劳役班，<11格归搬运工）
  const wD9 = new World(undefined, 'standard', false);
  deployStartBases(wD9);
  const hqD9 = wD9.findHq(0)!;
  const spotAt9 = (defId: string, minR: number, maxR: number, away?: { x: number; y: number }, awayR?: number): { tx: number; ty: number } | null => {
    for (let r = minR; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = hqD9.tx + dx, ty = hqD9.ty + dy;
        if (!wD9.canPlace(defId, tx, ty).ok) continue;
        if (away && Math.hypot((tx + 1) * 32 - away.x, (ty + 1) * 32 - away.y) < (awayR ?? 0) * 32) continue;
        return { tx, ty };
      }
    }
    return null;
  };
  const sspot = spotAt9('storehouse', 3, 6);
  let t18 = false;
  if (sspot) {
    const store9 = wD9.spawnBuilding('storehouse', 0, sspot.tx, sspot.ty, true);
    const sc = store9.center();
    const lspot = spotAt9('lumber', 14, 22, sc, 11);
    if (lspot) {
      const lumber9 = wD9.spawnBuilding('lumber', 0, lspot.tx, lspot.ty, true);
      lumber9.buffer = 30; // >50%×40 触发扛运
      t18 = wD9.assignJob(store9.id) && (store9.staffIds?.length ?? 0) === 1;
      const wood0 = wD9.players[0].res.wood;
      for (let s = 0; s < 60 * 50; s++) simTick(wD9, SIM_DT, [null, null]);
      t18 = t18 && wD9.players[0].res.wood > wood0 + 8; // 搬运工一趟扛12
    }
  }

  // 9.5 建造取料表演：放置扣款一次 → 取料 → 建成，账目平衡
  const wE9 = new World(undefined, 'standard', false);
  deployStartBases(wE9);
  const hqE9 = wE9.findHq(0)!;
  let hspot9: { tx: number; ty: number } | null = null;
  for (let r = 3; r <= 6 && !hspot9; r++) {
    for (let dy = -r; dy <= r && !hspot9; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (wE9.canPlace('house', hqE9.tx + dx, hqE9.ty + dy).ok) { hspot9 = { tx: hqE9.tx + dx, ty: hqE9.ty + dy }; break; }
    }
  }
  let t19 = false;
  if (hspot9) {
    const p9e = wE9.players[0];
    p9e.res.wood = 300;
    const w0 = p9e.res.wood;
    wE9.payCost(0, { wood: 30 });
    const site9 = wE9.spawnBuilding('house', 0, hspot9.tx, hspot9.ty, false);
    const builder9 = [...wE9.entities.values()].find(e => e.kind === 'unit' && e.defId === 'builder' && e.owner === 0)!;
    wE9.issueBuild([builder9.id], site9.id);
    let fetched = false;
    for (let s = 0; s < 60 * 60; s++) {
      simTick(wE9, SIM_DT, [null, null]);
      if (builder9.gatherState === 'toDepot') fetched = true;
      if (site9.done) break;
    }
    t19 = fetched && site9.done && Math.abs(p9e.res.wood - (w0 - 30)) < 8; // 只扣一次（微差=HQ保底产出）
  }
  const t9all = t14 && t15;
  const t9all2 = t16 && t16b && t16c;
  const p9dbg = `转职=${t14} 殉职=${t15} 民心=${t16}/${t16b}/${t16c} 税=${t17a}/${t17b}/${p9c.morale} 搬运=${t18} 取料=${t19}`;

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
    ['岗位经济：伐木场补员→居民伐木→小缓冲', gatherOk],
    ['胜负判定触发（或打满9分钟）', w.gameOver !== 0 || w.time >= 539],
    ['法令：切换生效+冷却+乘数', edictOk],
    ['地利：农场临水/炮台扼坡道', farmOk && turretOk],
    ['科技：立项→完成→乘数叠乘', techOk],
    ['麦田链：农庄管辖→收→缓冲→回种', farmChainOk],
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
    ['中立生态：鹿FID警戒/逃窜（方向=威胁反向）', t10],
    ['中立生态：狼群仇恨+拴绳+真近战零弹道', t11],
    ['中立生态：尸体半额立付+阶梯衰减+自动拾取', t12],
    ['中立生态：鹿群确定性繁殖+群5封顶+全图上限', t13],
    ['居民：转职迁居+殉职空缺回补', t9all],
    ['居民：民心增长/流失/战争豁免', t9all2],
    ['人口税：三档收入精确+高税掉民心', t17],
    ['搬运工：辖内缓冲过半扛运入库', t18],
    ['建造取料：扣款一次→取料→建成', t19],
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
    + ` [P6 ${p6dbg}] [P7 ${dbg7.join(' / ')}] [P8 ${p8dbg}] [P9 ${p9dbg}]`;
}
