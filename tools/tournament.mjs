// src/config.ts
var TILE = 32;
var MAP_W = 64;
var MAP_H = 64;
var SIM_DT = 1 / 60;
var PATH_BUDGET = 24;
var FOG_INTERVAL = 15;
var FOG_SCAN_INTERVAL = 12;
var START_RES = { wood: 300, food: 200, ore: 150 };
var STORAGE_BASE = 500;
var STORAGE_PER_STOREHOUSE = 500;
var POP_BASE = 10;
var POP_MAX = 100;
var OWNER_PLAYER = 0;
var OWNER_NEUTRAL = 2;
var T_GRASS = 0;
var T_WATER = 1;
var T_TREE = 2;
var T_ORE = 3;
var T_RAMP = 4;
var T_FORD = 5;
var DMG_MATRIX = {
  bullet: { light: 1.25, heavy: 0.6 },
  // 枪弹克轻甲
  shell: { light: 0.75, heavy: 1.25 },
  // 炮弹克重甲
  cannon: { light: 1, heavy: 1 }
  // 溅射万金油
};
var HEIGHT_VISION_BONUS = 1;
var HEIGHT_RANGE_BONUS = 0.08;
var HEIGHT_DAMAGE_BONUS = 0.1;

// src/data/units.ts
var UNIT_DEFS = {
  builder: {
    id: "builder",
    name: "\u5DE5\u7A0B\u8F66",
    aiPriority: 60,
    aiRole: "support",
    armor: "light",
    desc: "\u591A\u529F\u80FD\u5DE5\u7A0B\u5E73\u53F0\uFF1A\u5EFA\u9020/\u4FEE\u7406\u5EFA\u7B51\uFF0C\u53F3\u952E\u6811\u6728\u77FF\u8109\u53EF\u91C7\u4F10\uFF08\u8F7D\u8D2710\u81EA\u52A8\u56DE\u4ED3\uFF09",
    hp: 100,
    speed: 70,
    radius: 10,
    vision: 6,
    cost: { wood: 60, food: 30 },
    buildTime: 8,
    producedBy: "hq",
    canBuild: ["farm", "lumber", "mine", "storehouse", "barracks", "factory", "turret"],
    gather: { rate: 2.5, capacity: 10 }
    // 人工采集：2.5/秒，载货10（对比自动机低效但灵活）
  },
  infantry: {
    id: "infantry",
    name: "\u52A8\u5458\u6B65\u5175",
    aiPriority: 55,
    aiRole: "combat",
    armor: "light",
    desc: "\u5EC9\u4EF7\u673A\u67AA\u624B\uFF1A\u5C04\u901F\u5FEB\u3001\u5C04\u7A0B\u77ED\uFF0C\u514B\u5236\u8F7B\u7532\u6D77\uFF0C\u6015\u78BE\u538B\u4E0E\u6E85\u5C04",
    hp: 70,
    speed: 55,
    radius: 7,
    vision: 6,
    cost: { food: 50, ore: 10 },
    buildTime: 5,
    producedBy: "barracks",
    weapon: { damage: 6, range: 90, cooldown: 0.7, projectile: "bullet", targetsAir: true }
    // 步枪可对空
  },
  tank: {
    id: "tank",
    name: "\u4E3B\u6218\u5766\u514B",
    aiPriority: 72,
    aiRole: "combat",
    armor: "heavy",
    desc: "\u88C5\u7532\u4E3B\u529B\uFF1A\u8840\u539A\u70AE\u731B\uFF0C\u6B63\u9762\u63A8\u8FDB\u7684\u4E2D\u575A\u529B\u91CF\uFF0C\u9020\u4EF7\u504F\u9AD8",
    hp: 220,
    speed: 60,
    radius: 11,
    vision: 7,
    cost: { ore: 70, food: 15 },
    buildTime: 10,
    producedBy: "factory",
    weapon: { damage: 22, range: 110, cooldown: 1.4, projectile: "shell" }
  },
  artillery: {
    id: "artillery",
    name: "\u81EA\u884C\u706B\u70AE",
    aiPriority: 66,
    aiRole: "combat",
    armor: "light",
    desc: "\u8D85\u8FDC\u7A0B\u69B4\u5F39\u70AE\uFF1A\u8303\u56F4\u6E85\u5C04\u62C6\u5BB6\u5229\u5668\uFF0C\u76AE\u8106\u4E14\u88AB\u8D34\u8138\u65E0\u6CD5\u8FD8\u51FB\uFF0C\u9700\u8981\u62A4\u536B",
    hp: 110,
    speed: 40,
    radius: 10,
    vision: 8,
    cost: { ore: 90, wood: 40 },
    buildTime: 14,
    producedBy: "factory",
    weapon: { damage: 45, range: 190, minRange: 60, cooldown: 3.2, projectile: "cannon", splash: 28 }
  },
  barbarian: {
    id: "barbarian",
    name: "\u86EE\u65CF\u63A0\u88AD\u8005",
    desc: "\u4E2D\u7ACB\u86EE\u65CF\u7684\u52AB\u63A0\u5175\uFF1A\u89C1\u6751\u5C31\u62A2\u89C1\u4EBA\u5C31\u780D\uFF0C\u527F\u706D\u6709\u5C11\u91CF\u7F34\u83B7",
    hp: 90,
    speed: 65,
    radius: 8,
    vision: 6,
    cost: {},
    buildTime: 0,
    producedBy: "",
    aiPriority: 0,
    aiRole: "combat",
    weapon: { damage: 8, range: 90, cooldown: 0.8, projectile: "bullet" }
  },
  helicopter: {
    id: "helicopter",
    name: "\u6B66\u88C5\u76F4\u5347\u673A",
    desc: "\u7A7A\u4E2D\u901F\u5C04\u5E73\u53F0\uFF1A\u65E0\u89C6\u5730\u5F62\u5168\u56FE\u673A\u52A8\uFF0C\u514B\u5236\u5730\u9762\u88C5\u7532\u4E0E\u7ECF\u6D4E\uFF0C\u4F46\u6015\u6B65\u67AA\u548C\u54E8\u6212\u70AE",
    hp: 150,
    speed: 100,
    radius: 10,
    vision: 8,
    cost: { ore: 120, food: 60 },
    buildTime: 12,
    producedBy: "factory",
    aiPriority: 68,
    aiRole: "combat",
    moveClass: "air",
    armor: "light",
    weapon: { damage: 7, range: 100, cooldown: 0.3, projectile: "bullet", targetsAir: true, spread: 5 }
  },
  deer: {
    id: "deer",
    name: "\u9E7F",
    desc: "\u6E29\u987A\u7684\u91CE\u751F\u52A8\u7269\uFF1A\u53D7\u60CA\u4F1A\u9003\u8DD1\uFF0C\u730E\u6740\u53EF\u83B7\u5F97\u98DF\u7269",
    hp: 40,
    speed: 85,
    radius: 7,
    vision: 5,
    cost: {},
    buildTime: 0,
    producedBy: "",
    aiRole: "economy",
    wild: "passive",
    bounty: { food: 40 }
  },
  wolf: {
    id: "wolf",
    name: "\u72FC",
    desc: "\u9886\u5730\u610F\u8BC6\u6781\u5F3A\u7684\u91CE\u517D\uFF1A\u7A9D\u8FB9\u4E09\u683C\u5185\u8C01\u6562\u9760\u8FD1\u5C31\u54AC\u8C01\uFF0C\u730E\u6740\u6709\u5956\u52B1",
    hp: 70,
    speed: 70,
    radius: 8,
    vision: 6,
    cost: {},
    buildTime: 0,
    producedBy: "",
    aiRole: "combat",
    wild: "territorial",
    weapon: { damage: 10, range: 90, cooldown: 1, projectile: "bullet" },
    bounty: { food: 25 }
  },
  gunboat: {
    id: "gunboat",
    name: "\u70AE\u8247",
    desc: "\u8FD1\u6D77\u9738\u4E3B\uFF1A\u6C34\u9762\u673A\u52A8\u91CD\u70AE\u5E73\u53F0\uFF0C\u8F70\u51FB\u6CBF\u5CB8\u76EE\u6807\uFF0C\u4E0A\u5CB8\u7684\u5730\u9762\u90E8\u961F\u662F\u5B83\u7684\u76D8\u4E2D\u9910",
    hp: 200,
    speed: 75,
    radius: 12,
    vision: 7,
    cost: { wood: 100, ore: 100 },
    buildTime: 15,
    producedBy: "shipyard",
    aiPriority: 68,
    aiRole: "combat",
    moveClass: "naval",
    armor: "heavy",
    weapon: { damage: 20, range: 140, cooldown: 1.2, projectile: "shell", spread: 6 }
  }
};

// src/data/buildings.ts
var BUILDING_DEFS = {
  hq: {
    id: "hq",
    name: "\u6307\u6325\u57FA\u5730",
    aiRole: "support",
    armor: "heavy",
    desc: "\u5927\u672C\u8425\uFF1A\u751F\u4EA7\u5DE5\u7A0B\u8F66\u3001\u4FDD\u5E95\u4EA7\u51FA\u4E09\u79CD\u8D44\u6E90\u3001+10\u4EBA\u53E3\u3002\u88AB\u6467\u6BC1\u5373\u6218\u8D25",
    hp: 1200,
    size: 3,
    vision: 9,
    cost: {},
    buildTime: 0,
    unique: true,
    popBonus: 10,
    isDepot: true,
    income: { wood: 0.2, food: 0.2, ore: 0.2 },
    produces: ["builder"]
  },
  farm: {
    id: "farm",
    name: "\u8865\u7ED9\u519C\u573A",
    aiPriority: 50,
    aiRole: "economy",
    desc: "\u7A33\u5B9A\u98DF\u7269\u6765\u6E90\uFF080.45/\u79D2\uFF09\uFF0C+10\u4EBA\u53E3\u4E0A\u9650\uFF0C\u6C38\u4E0D\u67AF\u7AED",
    hp: 260,
    size: 2,
    vision: 4,
    cost: { wood: 60 },
    buildTime: 10,
    income: { food: 0.45 },
    popBonus: 10
  },
  lumber: {
    id: "lumber",
    name: "\u4F10\u6728\u7AD9",
    aiPriority: 55,
    aiRole: "economy",
    desc: "\u81EA\u52A8\u4F10\u67281.0/\u79D2\uFF08\u5185\u90E8\u7F13\u51B2\u4ED340\uFF09\uFF0C\u9700\u5468\u56F44\u683C\u5185\u22655\u68F5\u6811\uFF0C\u6811\u5C3D\u5219\u505C",
    hp: 260,
    size: 2,
    vision: 4,
    cost: { wood: 40, food: 30 },
    buildTime: 8,
    income: { wood: 1 },
    bufferCap: 40,
    needTrees: true
  },
  mine: {
    id: "mine",
    name: "\u91C7\u77FF\u573A",
    aiPriority: 60,
    aiRole: "economy",
    desc: "\u81EA\u52A8\u91C7\u77FF1.0/\u79D2\uFF08\u5185\u90E8\u7F13\u51B2\u4ED350\uFF09\uFF0C\u5FC5\u987B\u5EFA\u9020\u5728\u77FF\u8109\u4E0A\uFF0C\u77FF\u5C3D\u5219\u505C",
    hp: 300,
    size: 2,
    vision: 4,
    cost: { wood: 70 },
    buildTime: 9,
    income: { ore: 1 },
    bufferCap: 50,
    needOre: true
  },
  storehouse: {
    id: "storehouse",
    name: "\u4ED3\u5E93",
    aiPriority: 40,
    aiRole: "economy",
    desc: "\u4E09\u79CD\u8D44\u6E90\u5B58\u50A8\u4E0A\u9650+500\uFF0C\u517C\u4F5C\u5DE5\u7A0B\u8F66\u5378\u8D27\u70B9\u3002\u5EFA\u5728\u6797\u533A\u77FF\u533A\u65C1\u7701\u811A\u7A0B",
    hp: 300,
    size: 2,
    vision: 4,
    cost: { wood: 50 },
    buildTime: 8,
    capBonus: 500,
    isDepot: true
  },
  barracks: {
    id: "barracks",
    name: "\u6B65\u5175\u8425",
    aiPriority: 65,
    aiRole: "combat",
    desc: "\u8BAD\u7EC3\u52A8\u5458\u6B65\u5175\uFF0C\u901A\u5411\u88C5\u7532\u529B\u91CF\u7684\u7B2C\u4E00\u6B65",
    hp: 500,
    size: 3,
    vision: 5,
    cost: { wood: 120 },
    buildTime: 14,
    produces: ["infantry"]
  },
  factory: {
    id: "factory",
    name: "\u6218\u8F66\u5DE5\u5382",
    aiPriority: 72,
    aiRole: "combat",
    desc: "\u751F\u4EA7\u4E3B\u6218\u5766\u514B\u4E0E\u81EA\u884C\u706B\u70AE\uFF0C\u88C5\u7532\u529B\u91CF\u7684\u6447\u7BEE",
    hp: 700,
    size: 3,
    vision: 5,
    cost: { wood: 140, ore: 60 },
    buildTime: 18,
    produces: ["tank", "artillery", "helicopter"]
  },
  turret: {
    id: "turret",
    name: "\u54E8\u6212\u70AE",
    aiPriority: 45,
    aiRole: "defense",
    armor: "heavy",
    desc: "\u81EA\u52A8\u9632\u5FA1\u5854\uFF1A\u5C04\u7A0B140\u53EF\u5BF9\u7A7A\uFF0C\u8E72\u5BB6\u9632\u9A9A\u6270\u7684\u4E0D\u4E8C\u4E4B\u9009",
    hp: 400,
    size: 1,
    vision: 7,
    cost: { wood: 20, ore: 60 },
    buildTime: 8,
    weapon: { damage: 16, range: 140, cooldown: 0.9, projectile: "bullet", targetsAir: true }
  },
  camp: {
    id: "camp",
    name: "\u86EE\u65CF\u8425\u5730",
    desc: "\u86EE\u65CF\u7684\u5DE2\u7A74\uFF1A\u5B9A\u671F\u6D3E\u51FA\u63A0\u88AD\u8005\u52AB\u63A0\u9644\u8FD1\u52BF\u529B\u3002\u527F\u706D\u53EF\u83B7\u5F97\u4E30\u539A\u7F34\u83B7",
    hp: 600,
    size: 2,
    vision: 6,
    cost: {},
    buildTime: 0,
    aiRole: "combat",
    bounty: { wood: 250, ore: 150 }
  },
  shipyard: {
    id: "shipyard",
    name: "\u8239\u5382",
    desc: "\u6D77\u519B\u7684\u6447\u7BEE\uFF1A\u5FC5\u987B\u5EFA\u5728\u6C34\u8FB9\uFF08\u4E34\u6C34\uFF09\uFF0C\u751F\u4EA7\u70AE\u8247\u63A7\u5236\u6C34\u57DF",
    hp: 600,
    size: 3,
    vision: 5,
    cost: { wood: 150, ore: 50 },
    buildTime: 20,
    produces: ["gunboat"],
    needWater: true,
    aiPriority: 60,
    aiRole: "combat",
    armor: "heavy"
  },
  shieldGen: {
    id: "shieldGen",
    name: "\u62A4\u76FE\u53D1\u751F\u5668",
    desc: "\u529B\u573A\u62A4\u7F69\uFF1A\u4E3A\u534A\u5F84180\u5185\u53CB\u519B\u62B5\u6321\u4F24\u5BB3\uFF08\u62A4\u76FE\u6C60300\uFF0C\u8131\u62185\u79D2\u56DE\u514515/\u79D2\uFF09",
    hp: 350,
    size: 2,
    vision: 5,
    cost: { wood: 100, ore: 150 },
    buildTime: 15,
    shieldPool: 300,
    shieldRegen: 15,
    aiPriority: 40,
    aiRole: "defense",
    armor: "heavy"
  }
};

// src/engine/spatialHash.ts
var SpatialHash = class {
  cell;
  buckets = /* @__PURE__ */ new Map();
  // cellKey -> entity ids
  /** id -> {x,y,r} 位置缓存，供查询方读取 */
  pos = /* @__PURE__ */ new Map();
  constructor(cell = 48) {
    this.cell = cell;
  }
  key(cx, cy) {
    return cx * 1e5 + cy;
  }
  clear() {
    this.buckets.clear();
    this.pos.clear();
  }
  insert(id, x, y, r) {
    this.pos.set(id, { x, y, r });
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    const k = this.key(cx, cy);
    let arr = this.buckets.get(k);
    if (!arr) {
      arr = [];
      this.buckets.set(k, arr);
    }
    arr.push(id);
  }
  /** 收集圆范围内的所有id（含边界），结果写入 out */
  queryCircle(x, y, radius, out) {
    out.length = 0;
    const minCx = Math.floor((x - radius) / this.cell), maxCx = Math.floor((x + radius) / this.cell);
    const minCy = Math.floor((y - radius) / this.cell), maxCy = Math.floor((y + radius) / this.cell);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const arr = this.buckets.get(this.key(cx, cy));
        if (arr) for (const id of arr) out.push(id);
      }
    }
    return out;
  }
  /** 距离最近的点选目标（点选容差用） */
  nearest(x, y, maxDist) {
    const cand = [];
    this.queryCircle(x, y, maxDist, cand);
    let best = null, bestD = maxDist * maxDist;
    for (const id of cand) {
      const p = this.pos.get(id);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }
};
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// src/engine/astar.ts
function findPath(terrain, walkable, height, sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return [];
  if (!inBounds(tx, ty) || !walkable[ty * MAP_W + tx]) return null;
  const size = MAP_W * MAP_H;
  const gScore = new Float32Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const heap = new MinHeap();
  const start = sy * MAP_W + sx, goal = ty * MAP_W + tx;
  gScore[start] = 0;
  heap.push(heuristic(sx, sy, tx, ty), start);
  const DIRS = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414]
  ];
  const canStep = (from, to) => {
    if (!walkable[to] || closed[to]) return false;
    const hf = height[from], ht = height[to];
    if (hf === ht) return true;
    if (Math.abs(hf - ht) > 1) return false;
    return terrain[from] === T_RAMP || terrain[to] === T_RAMP;
  };
  let found = false;
  let iter = 0;
  while (heap.size > 0 && iter++ < 2e4) {
    const cur = heap.pop();
    if (cur === goal) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % MAP_W, cy = cur / MAP_W | 0;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(nx, ny)) continue;
      const ni = ny * MAP_W + nx;
      if (!canStep(cur, ni)) continue;
      if (dx !== 0 && dy !== 0) {
        if (!walkable[cy * MAP_W + nx] || !walkable[ny * MAP_W + cx]) continue;
        if (height[cy * MAP_W + nx] !== height[cur] || height[ny * MAP_W + cx] !== height[cur]) continue;
      }
      const ng = gScore[cur] + cost;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        cameFrom[ni] = cur;
        heap.push(ng + heuristic(nx, ny, tx, ty), ni);
      }
    }
  }
  if (!found) return null;
  const path = [];
  let node = goal;
  while (node !== start && node !== -1) {
    const nx = node % MAP_W, ny = node / MAP_W | 0;
    path.push({ x: (nx + 0.5) * TILE, y: (ny + 0.5) * TILE });
    node = cameFrom[node];
  }
  path.reverse();
  return path;
}
function nearestWalkable(walkable, tx, ty) {
  if (inBounds(tx, ty) && walkable[ty * MAP_W + tx]) return { x: tx, y: ty };
  for (let r = 1; r < Math.max(MAP_W, MAP_H); r++) {
    let best = null, bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = tx + dx, ny = ty + dy;
        if (inBounds(nx, ny) && walkable[ny * MAP_W + nx]) {
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = { x: nx, y: ny };
          }
        }
      }
    }
    if (best) return best;
  }
  return { x: tx, y: ty };
}
function heuristic(x, y, tx, ty) {
  const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
  return dx + dy + (1.414 - 2) * Math.min(dx, dy);
}
function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}
var MinHeap = class {
  fs = [];
  idxs = [];
  get size() {
    return this.fs.length;
  }
  push(f, idx2) {
    this.fs.push(f);
    this.idxs.push(idx2);
    let i = this.fs.length - 1;
    while (i > 0) {
      const p = i - 1 >> 1;
      if (this.fs[p] <= this.fs[i]) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop() {
    const top = this.idxs[0];
    const lastF = this.fs.pop(), lastIdx = this.idxs.pop();
    if (this.fs.length > 0) {
      this.fs[0] = lastF;
      this.idxs[0] = lastIdx;
      let i = 0;
      const n = this.fs.length;
      for (; ; ) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < n && this.fs[l] < this.fs[m]) m = l;
        if (r < n && this.fs[r] < this.fs[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  swap(a, b) {
    const tf = this.fs[a];
    this.fs[a] = this.fs[b];
    this.fs[b] = tf;
    const ti = this.idxs[a];
    this.idxs[a] = this.idxs[b];
    this.idxs[b] = ti;
  }
};

// src/sim/entity.ts
function makeUnit(id, owner, defId, x, y, hp) {
  return {
    id,
    owner,
    kind: "unit",
    defId,
    x,
    y,
    hp,
    angle: 0,
    turretAngle: 0,
    order: { kind: "idle" },
    path: null,
    pathIdx: 0,
    pathPending: false,
    cooldown: 0,
    engagedId: null,
    firingHold: false,
    repathTimer: 0,
    scanTimer: id % 12 / 60,
    stuck: 0,
    cargo: null,
    gatherState: null,
    resTile: -1,
    resExhausted: false,
    homeX: x,
    homeY: y,
    tx: 0,
    ty: 0,
    progress: 1,
    done: true,
    queue: [],
    rally: null,
    linkedTile: -1,
    buffer: 0,
    bufferStalled: false,
    radius() {
      return 8;
    },
    center() {
      return { x: this.x, y: this.y };
    }
  };
}
function makeBuilding(id, owner, defId, tx, ty, hp, size, done) {
  const cx = (tx + size / 2) * 32, cy = (ty + size / 2) * 32;
  return {
    id,
    owner,
    kind: "building",
    defId,
    x: cx,
    y: cy,
    hp: done ? hp : Math.max(1, hp * 0.1),
    angle: 0,
    turretAngle: 0,
    order: { kind: "idle" },
    path: null,
    pathIdx: 0,
    pathPending: false,
    cooldown: 0,
    engagedId: null,
    firingHold: false,
    repathTimer: 0,
    scanTimer: id % 12 / 60,
    stuck: 0,
    cargo: null,
    gatherState: null,
    resTile: -1,
    resExhausted: false,
    homeX: cx,
    homeY: cy,
    tx,
    ty,
    progress: done ? 1 : 0,
    done,
    queue: [],
    rally: null,
    linkedTile: -1,
    buffer: 0,
    bufferStalled: false,
    radius() {
      return size * 32 / 2;
    },
    center() {
      return { x: this.x, y: this.y };
    }
  };
}

// src/engine/rng.ts
var RNG = class {
  s;
  constructor(seed) {
    this.s = seed >>> 0;
  }
  next() {
    this.s = this.s + 1831565813 >>> 0;
    let t = this.s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
};

// src/sim/mapgen.ts
var idx = (x, y) => y * MAP_W + x;
function generateMap(seed = 20261009, variant = "standard") {
  const rng = new RNG(seed);
  const terrain = new Uint8Array(MAP_W * MAP_H).fill(T_GRASS);
  const height = new Uint8Array(MAP_W * MAP_H);
  const treeWood = new Float32Array(MAP_W * MAP_H);
  const oreLeft = new Float32Array(MAP_W * MAP_H);
  const playerBase = { tx: 6, ty: 6 };
  const enemyBase = { tx: MAP_W - 9, ty: MAP_H - 9 };
  const inBaseZone = (x, y) => {
    const d1 = Math.abs(x - (playerBase.tx + 1)) + Math.abs(y - (playerBase.ty + 1));
    const d2 = Math.abs(x - (enemyBase.tx + 1)) + Math.abs(y - (enemyBase.ty + 1));
    return d1 < 6 || d2 < 6;
  };
  const plateau = (x0, y0, x1, y1, h) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
        height[idx(x, y)] = h;
      }
    }
  };
  const ramp = (x, y, h) => {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return;
    terrain[idx(x, y)] = T_RAMP;
    height[idx(x, y)] = h;
    treeWood[idx(x, y)] = 0;
    oreLeft[idx(x, y)] = 0;
  };
  plateau(8, 24, 15, 31, 2);
  ramp(16, 26, 1);
  ramp(16, 27, 1);
  terrain[idx(10, 32)] = T_RAMP;
  height[idx(10, 32)] = 1;
  terrain[idx(11, 32)] = T_RAMP;
  height[idx(11, 32)] = 1;
  plateau(48, 32, 55, 39, 2);
  ramp(47, 36, 1);
  ramp(47, 37, 1);
  terrain[idx(52, 31)] = T_RAMP;
  height[idx(52, 31)] = 1;
  terrain[idx(53, 31)] = T_RAMP;
  height[idx(53, 31)] = 1;
  plateau(29, 29, 34, 34, 1);
  ramp(31, 28, 0);
  ramp(32, 28, 0);
  ramp(31, 35, 0);
  ramp(32, 35, 0);
  if (variant === "islands") {
    const bands = [[12, 20], [44, 52]];
    for (const [y0, y1] of bands) {
      for (let x = 0; x < MAP_W; x++) {
        const jag = x * 7 % 4;
        const wy0 = y0 + jag, wy1 = y1 - x * 5 % 3;
        for (let y = wy0; y <= wy1; y++) {
          if (y < 1 || y >= MAP_H - 1) continue;
          terrain[idx(x, y)] = T_WATER;
        }
      }
    }
    for (const [y0, y1] of bands) {
      for (let y = y0; y <= y1; y++) {
        for (const fx of [10, 11, 52, 53]) {
          terrain[idx(fx, y)] = T_FORD;
        }
      }
    }
  }
  const lakes = 4;
  for (let i = 0; i < lakes; i++) {
    let x = rng.int(10, MAP_W - 11), y = rng.int(10, MAP_H - 11);
    if (inBaseZone(x, y) || height[idx(x, y)] > 0) continue;
    const size = rng.int(14, 30);
    for (let s = 0; s < size; s++) {
      if (!inBaseZone(x, y) && height[idx(x, y)] === 0 && x > 1 && y > 1 && x < MAP_W - 2 && y < MAP_H - 2) {
        terrain[idx(x, y)] = T_WATER;
        if (rng.next() < 0.7 && height[idx(Math.min(MAP_W - 2, x + 1), y)] === 0) terrain[idx(Math.min(MAP_W - 2, x + 1), y)] = T_WATER;
        if (rng.next() < 0.7 && height[idx(x, Math.min(MAP_H - 2, y + 1))] === 0) terrain[idx(x, Math.min(MAP_H - 2, y + 1))] = T_WATER;
      }
      x += rng.int(-1, 1);
      y += rng.int(-1, 1);
      x = Math.max(2, Math.min(MAP_W - 3, x));
      y = Math.max(2, Math.min(MAP_H - 3, y));
    }
  }
  const clusters = 12;
  for (let i = 0; i < clusters; i++) {
    let x, y;
    if (i < 4) {
      const base = i % 2 === 0 ? playerBase : enemyBase;
      const sign = i % 2 === 0 ? 1 : -1;
      x = base.tx + 1 + sign * rng.int(5, 8);
      y = base.ty + 1 - sign * rng.int(2, 5);
    } else {
      x = rng.int(4, MAP_W - 5);
      y = rng.int(4, MAP_H - 5);
    }
    x = Math.max(2, Math.min(MAP_W - 3, x));
    y = Math.max(2, Math.min(MAP_H - 3, y));
    const size = rng.int(10, 22);
    for (let s = 0; s < size; s++) {
      if (!inBaseZone(x, y) && terrain[idx(x, y)] === T_GRASS) {
        terrain[idx(x, y)] = T_TREE;
        treeWood[idx(x, y)] = 60;
      }
      x += rng.int(-1, 1);
      y += rng.int(-1, 1);
      x = Math.max(2, Math.min(MAP_W - 3, x));
      y = Math.max(2, Math.min(MAP_H - 3, y));
    }
  }
  const placeOre = (cx, cy, w, h) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
        if (terrain[idx(x, y)] === T_WATER) continue;
        terrain[idx(x, y)] = T_ORE;
        oreLeft[idx(x, y)] = 900;
      }
    }
  };
  placeOre(playerBase.tx + 5, playerBase.ty + 5, 3, 2);
  placeOre(enemyBase.tx - 4, enemyBase.ty - 4, 3, 2);
  const mid = MAP_W / 2 | 0;
  placeOre(mid - 6, mid + 4, 3, 3);
  placeOre(mid + 3, mid - 7, 3, 3);
  if (!connected(height, terrain, playerBase.tx + 1, playerBase.ty + 1, enemyBase.tx + 1, enemyBase.ty + 1)) {
    const steps = 200;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(playerBase.tx + 1 + (enemyBase.tx + 1 - playerBase.tx - 1) * t);
      const cy = Math.round(playerBase.ty + 1 + (enemyBase.ty + 1 - playerBase.ty - 1) * t);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) {
            terrain[idx(x, y)] = T_GRASS;
            height[idx(x, y)] = 0;
          }
        }
      }
    }
  }
  return { terrain, height, treeWood, oreLeft, playerBase, enemyBase };
}
function passable(terrain, height, from, to) {
  const t = terrain[to];
  if (t === T_WATER || t === T_TREE || t === T_ORE) return false;
  const hf = height[from], ht = height[to];
  if (hf === ht) return true;
  if (Math.abs(hf - ht) > 1) return false;
  return terrain[from] === T_RAMP || terrain[to] === T_RAMP;
}
function connected(height, terrain, sx, sy, tx, ty) {
  const seen = new Uint8Array(MAP_W * MAP_H);
  const start = sy * MAP_W + sx, goal = ty * MAP_W + tx;
  const stack = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === goal) return true;
    const cx = cur % MAP_W, cy = cur / MAP_W | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const ni = ny * MAP_W + nx;
      if (!seen[ni] && passable(terrain, height, cur, ni)) {
        seen[ni] = 1;
        stack.push(ni);
      }
    }
  }
  return false;
}

// src/sim/neutral.ts
function spawnNeutrals(w) {
  spawnCamp(w, 44, 18);
  spawnCamp(w, 18, 44);
  spawnHerd(w, 12, 40, "deer", 3);
  spawnHerd(w, 50, 22, "deer", 3);
  spawnHerd(w, 32, 6, "deer", 3);
  spawnHerd(w, 32, 58, "deer", 3);
  spawnHerd(w, 42, 16, "wolf", 2);
  spawnHerd(w, 20, 46, "wolf", 2);
  spawnHerd(w, 36, 36, "wolf", 2);
}
function spawnCamp(w, tx, ty) {
  const spot = findFree(w, tx, ty, 4);
  if (spot) w.spawnBuilding("camp", OWNER_NEUTRAL, spot.tx, spot.ty, true);
}
function spawnHerd(w, tx, ty, defId, count) {
  const anchor = findFree(w, tx, ty, 4);
  if (!anchor) return;
  const hx = (anchor.tx + 0.5) * TILE, hy = (anchor.ty + 0.5) * TILE;
  for (let i = 0; i < count; i++) {
    const spot = findFree(w, anchor.tx + i * 3 % 5 - 2, anchor.ty + i * 2 % 5 - 2, 2);
    if (!spot) continue;
    const u = w.spawnUnit(defId, OWNER_NEUTRAL, (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE);
    u.homeX = hx;
    u.homeY = hy;
    if (defId === "wolf") u.order = { kind: "hold" };
  }
}
function findFree(w, tx, ty, maxR) {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r && r > 0) continue;
        const x = tx + dx, y = ty + dy;
        if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) continue;
        const i = y * MAP_W + x;
        if (w.terrain[i] === T_GRASS && !w.occupied[i]) return { tx: x, ty: y };
      }
    }
  }
  return null;
}
function updateNeutrals(w, dt) {
  for (const e of w.entities.values()) {
    if (e.owner !== OWNER_NEUTRAL) continue;
    if (e.kind === "building" && e.defId === "camp") {
      e.nSpawnT = (e.nSpawnT ?? 40) - dt;
      e.nRaidT = (e.nRaidT ?? 25) - dt;
      const raiders = [];
      for (const u of w.entities.values()) {
        if (u.owner === OWNER_NEUTRAL && u.defId === "barbarian" && u.homeX === e.homeX && u.homeY === e.homeY) {
          raiders.push(u);
        }
      }
      const alive = raiders.filter((r) => r.hp > 0).length;
      if (e.nSpawnT <= 0) {
        e.nSpawnT = 40;
        if (alive < 3) {
          const spot = findFree(w, e.tx + (w.tick >> 3) % 3 - 1, e.ty + (w.tick >> 5) % 3 - 1, 3);
          if (spot) {
            const u = w.spawnUnit("barbarian", OWNER_NEUTRAL, (spot.tx + 0.5) * TILE, (spot.ty + 0.5) * TILE);
            u.homeX = e.x;
            u.homeY = e.y;
          }
        }
      }
      if (e.nRaidT <= 0) {
        e.nRaidT = 30;
        const ready = raiders.filter((r) => r.order.kind === "idle" && !isFleeing(r));
        if (ready.length >= 2) {
          let target = null, bestD = 25 * TILE;
          for (const o of w.entities.values()) {
            if (o.owner === OWNER_NEUTRAL || o.kind !== "building") continue;
            const d = dist(e.x, e.y, o.x, o.y);
            if (d < bestD) {
              bestD = d;
              target = o;
            }
          }
          if (target) {
            w.issueAttackMove(ready.map((r) => r.id), { x: target.x, y: target.y });
            w.addLog("military", "\u86EE\u65CF\u8425\u5730\u6D3E\u51FA\u52AB\u63A0\u961F\uFF01", void 0, "raid:" + e.id, 60);
          }
        }
      }
      continue;
    }
    if (e.kind !== "unit") continue;
    if (e.defId === "deer" && e.hp < UNIT_DEFS[e.defId].hp && e.order.kind !== "move") {
      let threat = null, bestD = 8 * TILE;
      for (const o of w.entities.values()) {
        if (o.owner === OWNER_NEUTRAL && o.kind === "unit") continue;
        if (o.kind === "building") continue;
        const d = dist(o.x, o.y, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          threat = o;
        }
      }
      if (threat) {
        const dx = e.x - threat.x, dy = e.y - threat.y;
        const len = Math.hypot(dx, dy) || 1;
        w.issueMove([e.id], { x: e.x + dx / len * TILE * 6, y: e.y + dy / len * TILE * 6 });
        continue;
      }
    }
    if (e.order.kind === "idle" && (w.tick + e.id * 97) % 240 === 0) {
      const ox = (e.id * 37 + w.tick * 31) % 160 - 80;
      const oy = (e.id * 53 + w.tick * 17) % 160 - 80;
      const tx = e.homeX + ox, ty = e.homeY + oy;
      if (w.canStandAtWorld(e.x, e.y, tx, ty) || w.walkableAtWorld(tx, ty)) {
        w.issueMove([e.id], { x: tx, y: ty });
      }
    }
  }
}
function isFleeing(e) {
  return e.order.kind === "move";
}

// src/sim/log.ts
var SimLog = class {
  entries = [];
  max;
  constructor(max = 5e3) {
    this.max = max;
  }
  /** 由 World.addLog 调用 */
  _push(entry, max) {
    this.entries.push(entry);
    if (this.entries.length > max) this.entries.splice(0, this.entries.length - max);
  }
  /** 按类别统计条数，可附带消息过滤 */
  count(cat, owner, match) {
    let n = 0;
    for (const e of this.entries) {
      if (e.cat !== cat) continue;
      if (owner != null && e.owner !== owner) continue;
      if (match && !match(e.msg)) continue;
      n++;
    }
    return n;
  }
  tail(n) {
    return this.entries.slice(-n).map((e) => `[${e.t.toFixed(0)}s][${e.cat}]${e.owner != null ? `(P${e.owner})` : ""} ${e.msg}`);
  }
  summary() {
    const out = {};
    for (const e of this.entries) out[e.cat] = (out[e.cat] ?? 0) + 1;
    return out;
  }
};

// src/sim/world.ts
var World = class {
  tick = 0;
  time = 0;
  nextId = 1;
  entities = /* @__PURE__ */ new Map();
  hash = new SpatialHash(48);
  terrain;
  height;
  // 每格高度层 0..3
  navalWalkable;
  // 舰船通行网格（水面）
  treeWood;
  oreLeft;
  occupied;
  // 建筑占格标记
  buildingAt;
  // 格 -> 建筑entityId（-1无）
  walkable;
  fog;
  players;
  projectiles = [];
  fx = [];
  dirtyTiles = /* @__PURE__ */ new Set();
  // 地形变化（渲染层重绘用）
  log = new SimLog();
  logRepeat = /* @__PURE__ */ new Map();
  // 节流键 -> 上次记录时间
  pathBudget = PATH_BUDGET;
  pendingPaths = [];
  // 等待预算的实体id
  gameOver = 0;
  // 0进行中 / 1玩家胜 / 2玩家败
  constructor(seed = 20261009, variant = "standard") {
    const map = generateMap(seed, variant);
    this.terrain = map.terrain;
    this.height = map.height;
    this.treeWood = map.treeWood;
    this.oreLeft = map.oreLeft;
    this.occupied = new Uint8Array(MAP_W * MAP_H);
    this.buildingAt = new Int32Array(MAP_W * MAP_H).fill(-1);
    this.walkable = new Uint8Array(MAP_W * MAP_H);
    this.fog = [new Uint8Array(MAP_W * MAP_H), new Uint8Array(MAP_W * MAP_H)];
    this.players = [
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false },
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false }
    ];
    this.refreshWalkableAll();
    this.navalWalkable = new Uint8Array(MAP_W * MAP_H);
    for (let i = 0; i < this.navalWalkable.length; i++) {
      this.navalWalkable[i] = this.terrain[i] === T_WATER ? 1 : 0;
    }
    for (const [owner, base] of [[0, map.playerBase], [1, map.enemyBase]]) {
      const hq = this.spawnBuilding("hq", owner, base.tx, base.ty, true);
      void hq;
      const cx = (base.tx + 1.5) * TILE, cy = (base.ty + 4.5) * TILE;
      this.spawnUnit("builder", owner, cx - 40, cy);
      this.spawnUnit("builder", owner, cx + 40, cy);
    }
    spawnNeutrals(this);
    this.addLog("system", "\u5BF9\u5C40\u5F00\u59CB\uFF1A\u53CC\u57FA\u5730\u955C\u50CF\u5730\u56FE\uFF0C\u6467\u6BC1\u654C\u65B9\u6307\u6325\u57FA\u5730\u83B7\u80DC\u3002\u5C0F\u5FC3\u86EE\u65CF\u8425\u5730");
  }
  // ================= 日志 =================
  /** 统一日志入口：自动附时间戳；throttleKey+intervalSec 相同键在间隔内只记一条 */
  addLog(cat, msg, owner, throttleKey, intervalSec = 30) {
    if (throttleKey) {
      const last = this.logRepeat.get(throttleKey) ?? -Infinity;
      if (this.time - last < intervalSec) return;
      this.logRepeat.set(throttleKey, this.time);
    }
    this.log._push({ t: this.time, tick: this.tick, cat, msg, owner }, 5e3);
  }
  /** 受存储上限约束的资源入账，返回实际入库量 */
  addRes(owner, res, amount) {
    if (owner > 1) return 0;
    const p = this.players[owner];
    const space = Math.max(0, p.storageCap - p.res[res]);
    const added = Math.min(amount, space);
    if (added > 0) p.res[res] += added;
    if (space <= 0.01 && amount > 0) {
      this.addLog("econ", `\u4ED3\u5E93\u6EE1\u8F7D\uFF1A${res === "wood" ? "\u6728\u5934" : res === "food" ? "\u98DF\u7269" : "\u77FF\u77F3"}\uFF0C\u4EA7\u51FA\u505C\u673A`, owner, `capfull:${owner}:${res}`, 30);
    }
    return added;
  }
  // ================= 实体管理 =================
  spawnUnit(defId, owner, x, y) {
    const def = UNIT_DEFS[defId];
    const e = makeUnit(this.nextId++, owner, defId, x, y, def.hp);
    this.entities.set(e.id, e);
    return e;
  }
  spawnBuilding(defId, owner, tx, ty, done) {
    const def = BUILDING_DEFS[defId];
    const e = makeBuilding(this.nextId++, owner, defId, tx, ty, def.hp, def.size, done);
    this.entities.set(e.id, e);
    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        const i = (ty + dy) * MAP_W + (tx + dx);
        this.occupied[i] = 1;
        this.buildingAt[i] = e.id;
        this.walkable[i] = 0;
      }
    }
    if (defId === "mine") e.linkedTile = this.pickOreTile(tx, ty, def.size);
    if (def.shieldPool) {
      e.shield = def.shieldPool;
      e.shieldMax = def.shieldPool;
    }
    return e;
  }
  removeEntity(id) {
    const e = this.entities.get(id);
    if (!e) return;
    this.entities.delete(id);
    if (e.kind === "building") {
      const def = BUILDING_DEFS[e.defId];
      for (let dy = 0; dy < def.size; dy++) {
        for (let dx = 0; dx < def.size; dx++) {
          const i = (e.ty + dy) * MAP_W + (e.tx + dx);
          this.occupied[i] = 0;
          this.buildingAt[i] = -1;
          if (this.terrain[i] === T_GRASS) this.walkable[i] = 1;
          else this.walkable[i] = 0;
        }
      }
    }
    this.fx.push({ x: e.x, y: e.y, type: "boom", t: 0, dur: 0.5, size: e.kind === "building" ? 46 : 20 });
    this.addLog("military", `${e.owner === 0 ? "\u6211\u65B9" : "\u654C\u65B9"}${e.kind === "building" ? BUILDING_DEFS[e.defId].name : UNIT_DEFS[e.defId].name}\u88AB\u6467\u6BC1`, e.owner);
    for (const o of this.entities.values()) {
      if (o.engagedId === id) o.engagedId = null;
      if (o.order.targetId === id) o.order = { kind: "idle" };
    }
    if (e.defId === "hq") {
      this.players[e.owner].defeat = true;
      if (this.gameOver === 0) {
        this.gameOver = e.owner === OWNER_PLAYER ? 2 : 1;
        this.addLog("system", `\u6307\u6325\u57FA\u5730\u9677\u843D\uFF0C${e.owner === 0 ? "\u73A9\u5BB6\u6218\u8D25" : "\u73A9\u5BB6\u83B7\u80DC"}`, e.owner);
      }
    }
  }
  // ================= 地形/放置 =================
  refreshWalkableAll() {
    for (let i = 0; i < this.walkable.length; i++) {
      this.walkable[i] = this.terrain[i] === T_GRASS || this.terrain[i] === T_RAMP || this.terrain[i] === T_FORD ? 1 : 0;
    }
  }
  /** 按单位层级查询通行性：air全图通（边界内），naval查水面网，land走高度规则 */
  canStandClassAt(e, fx, fy, tx, ty) {
    const moveClass = UNIT_DEFS[e.defId]?.moveClass ?? "land";
    if (moveClass === "air") {
      return tx >= TILE && ty >= TILE && tx < MAP_W * TILE - TILE && ty < MAP_H * TILE - TILE;
    }
    if (moveClass === "naval") {
      const ti = Math.floor(ty / TILE) * MAP_W + Math.floor(tx / TILE);
      return ti >= 0 && ti < this.navalWalkable.length && this.navalWalkable[ti] === 1;
    }
    return this.canStandAtWorld(fx, fy, tx, ty);
  }
  walkableAtClassWorld(e, x, y) {
    if (UNIT_DEFS[e.defId]?.moveClass === "air") return true;
    return this.walkableAtWorld(x, y);
  }
  // ================= 高度系统 =================
  /** 高度感知通行：同层直走，跨层必须走坡道且只跨1层 */
  canStand(fromIdx, toIdx) {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= this.walkable.length || toIdx >= this.walkable.length) return false;
    if (!this.walkable[toIdx]) return false;
    const hf = this.height[fromIdx], ht = this.height[toIdx];
    if (hf === ht) return true;
    if (Math.abs(hf - ht) > 1) return false;
    return this.terrain[fromIdx] === T_RAMP || this.terrain[toIdx] === T_RAMP;
  }
  canStandAtWorld(fx, fy, tx, ty) {
    return this.canStand(
      Math.floor(fy / TILE) * MAP_W + Math.floor(fx / TILE),
      Math.floor(ty / TILE) * MAP_W + Math.floor(tx / TILE)
    );
  }
  /** 实体所在格的高度层 */
  heightAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
    return this.height[ty * MAP_W + tx];
  }
  walkableAtTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    return this.walkable[ty * MAP_W + tx] === 1;
  }
  walkableAtWorld(x, y) {
    return this.walkableAtTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }
  pickOreTile(tx, ty, size) {
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const i = (ty + dy) * MAP_W + (tx + dx);
        if (this.terrain[i] === T_ORE && this.oreLeft[i] > 0) return i;
      }
    }
    return -1;
  }
  canPlace(defId, tx, ty) {
    const def = BUILDING_DEFS[defId];
    if (tx < 1 || ty < 1 || tx + def.size >= MAP_W - 1 || ty + def.size >= MAP_H - 1) {
      return { ok: false, reason: "\u592A\u9760\u8FD1\u5730\u56FE\u8FB9\u7F18" };
    }
    let oreTiles = 0;
    let h0 = -1;
    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        const i = (ty + dy) * MAP_W + (tx + dx);
        if (this.occupied[i]) return { ok: false, reason: "\u4E0E\u5176\u4ED6\u5EFA\u7B51\u91CD\u53E0" };
        if (this.terrain[i] === T_RAMP) return { ok: false, reason: "\u5761\u9053\u4E0A\u4E0D\u80FD\u5EFA\u9020" };
        if (h0 < 0) h0 = this.height[i];
        else if (this.height[i] !== h0) return { ok: false, reason: "\u5730\u9762\u9AD8\u4F4E\u4E0D\u5E73" };
        const t = this.terrain[i];
        if (def.needOre) {
          if (t === T_ORE) oreTiles++;
        } else if (t !== T_GRASS) return { ok: false, reason: t === T_WATER ? "\u4E0D\u80FD\u5EFA\u5728\u6C34\u4E0A" : "\u5730\u9762\u88AB\u5360\u7528\uFF08\u6811/\u77FF\uFF09" };
      }
    }
    if (def.needOre && oreTiles === 0) return { ok: false, reason: "\u5FC5\u987B\u5EFA\u9020\u5728\u77FF\u8109\u4E0A" };
    const x0 = tx * TILE, y0 = ty * TILE, px = def.size * TILE;
    const near = [];
    this.hash.queryCircle(x0 + px / 2, y0 + px / 2, px, near);
    for (const id of near) {
      const u = this.entities.get(id);
      if (u && u.kind === "unit") {
        const p = this.hash.pos.get(id);
        if (p && p.x >= x0 - 4 && p.x <= x0 + px + 4 && p.y >= y0 - 4 && p.y <= y0 + px + 4) {
          return { ok: false, reason: "\u6709\u5355\u4F4D\u7AD9\u5728\u65BD\u5DE5\u533A" };
        }
      }
    }
    if (def.needWater) {
      let water = 0;
      for (let dy = -1; dy <= def.size; dy++) {
        for (let dx = -1; dx <= def.size; dx++) {
          const x = tx + dx, y = ty + dy;
          const edge = dx < 0 || dy < 0 || dx >= def.size || dy >= def.size;
          if (!edge) continue;
          if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
          if (this.terrain[y * MAP_W + x] === T_WATER) water++;
        }
      }
      if (water < 3) return { ok: false, reason: "The shipyard must be built by the water" };
    }
    if (def.needTrees) {
      let trees = 0;
      for (let dy = -4; dy < def.size + 4 && trees < 5; dy++) {
        for (let dx = -4; dx < def.size + 4; dx++) {
          const x = tx + dx, y = ty + dy;
          if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
          if (this.terrain[y * MAP_W + x] === T_TREE) {
            trees++;
            if (trees >= 5) break;
          }
        }
      }
      if (trees < 5) return { ok: false, reason: "\u5468\u56F44\u683C\u5185\u6811\u6728\u4E0D\u8DB3\uFF08\u9700\u22655\u68F5\uFF09" };
    }
    return { ok: true, reason: "" };
  }
  // ================= 资源 =================
  canAfford(owner, cost) {
    const p = this.players[owner];
    return (cost.wood ?? 0) <= p.res.wood && (cost.food ?? 0) <= p.res.food && (cost.ore ?? 0) <= p.res.ore;
  }
  payCost(owner, cost) {
    const p = this.players[owner];
    p.res.wood -= cost.wood ?? 0;
    p.res.food -= cost.food ?? 0;
    p.res.ore -= cost.ore ?? 0;
  }
  refundCost(owner, cost) {
    const p = this.players[owner];
    p.res.wood += cost.wood ?? 0;
    p.res.food += cost.food ?? 0;
    p.res.ore += cost.ore ?? 0;
  }
  affordAfterQueue(owner, cost) {
    return this.canAfford(owner, cost);
  }
  /** 人口：存活单位 + 排队中的单位 */
  recomputePop() {
    for (const owner of [0, 1]) {
      let pop = 0, cap = 0;
      for (const e of this.entities.values()) {
        if (e.owner !== owner) continue;
        if (e.kind === "unit") pop++;
        else if (e.done) {
          const def = BUILDING_DEFS[e.defId];
          cap += def.popBonus ?? 0;
          if (def.produces) pop += e.queue.length;
        }
      }
      const p = this.players[owner];
      p.pop = pop;
      p.popCap = Math.min(POP_MAX, POP_BASE + cap);
    }
  }
  // ================= 查询 =================
  unitsOf(owner) {
    const out = [];
    for (const e of this.entities.values()) if (e.kind === "unit" && e.owner === owner) out.push(e);
    return out;
  }
  buildingsOf(owner) {
    const out = [];
    for (const e of this.entities.values()) if (e.kind === "building" && e.owner === owner) out.push(e);
    return out;
  }
  findHq(owner) {
    for (const e of this.entities.values()) {
      if (e.kind === "building" && e.defId === "hq" && e.owner === owner) return e;
    }
    return void 0;
  }
  /** 最近的卸货点（HQ/仓库，已完成） */
  nearestDepot(owner, x, y) {
    let best = null, bestD = Infinity;
    for (const b of this.entities.values()) {
      if (b.kind !== "building" || !b.done || b.owner !== owner) continue;
      if (!BUILDING_DEFS[b.defId].isDepot) continue;
      const d = dist(x, y, b.x, b.y);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }
  /** 点选命中：优先单位，其次建筑 */
  pickAt(x, y) {
    const id = this.hash.nearest(x, y, 26);
    if (id !== null) {
      const e = this.entities.get(id);
      if (e && e.kind === "unit") return e;
    }
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H) {
      const bid = this.buildingAt[ty * MAP_W + tx];
      if (bid >= 0) return this.entities.get(bid) ?? null;
    }
    for (const e of this.entities.values()) {
      if (e.kind !== "building") continue;
      const c = e.center();
      if (dist(c.x, c.y, x, y) < e.radius() + 10) return e;
    }
    return null;
  }
  // ================= 指令API =================
  issueMove(ids, target) {
    const n = ids.length;
    const cols = Math.ceil(Math.sqrt(n));
    const spacing = 30;
    ids.forEach((id, i) => {
      const e = this.entities.get(id);
      if (!e || e.kind !== "unit") return;
      const ox = (i % cols - (cols - 1) / 2) * spacing;
      const oy = (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * spacing;
      const t = { x: target.x + ox, y: target.y + oy };
      const tw = nearestWalkable(this.walkable, Math.floor(t.x / TILE), Math.floor(t.y / TILE));
      t.x = (tw.x + 0.5) * TILE;
      t.y = (tw.y + 0.5) * TILE;
      e.order = { kind: "move", target: t };
      e.engagedId = null;
      e.firingHold = false;
      e.path = null;
      e.pathPending = false;
    });
  }
  issueAttack(ids, targetId) {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== "unit") continue;
      e.order = { kind: "attack", targetId };
      e.engagedId = targetId;
      e.firingHold = false;
      e.gatherState = null;
      e.path = null;
      e.pathPending = false;
    }
  }
  /** 攻击移动：向目标点推进，途中主动交战（干完架继续走） */
  issueAttackMove(ids, target) {
    const n = ids.length;
    const cols = Math.ceil(Math.sqrt(n));
    const spacing = 30;
    ids.forEach((id, i) => {
      const e = this.entities.get(id);
      if (!e || e.kind !== "unit") return;
      const ox = (i % cols - (cols - 1) / 2) * spacing;
      const oy = (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * spacing;
      const t = { x: target.x + ox, y: target.y + oy };
      const tw = nearestWalkable(this.walkable, Math.floor(t.x / TILE), Math.floor(t.y / TILE));
      t.x = (tw.x + 0.5) * TILE;
      t.y = (tw.y + 0.5) * TILE;
      e.order = { kind: "attackMove", target: t };
      e.engagedId = null;
      e.firingHold = false;
      e.gatherState = null;
      e.path = null;
      e.pathPending = false;
    });
  }
  /** 停止：清空订单与交战状态 */
  issueStop(ids) {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== "unit") continue;
      e.order = { kind: "idle" };
      e.engagedId = null;
      e.firingHold = false;
      e.gatherState = null;
      e.path = null;
      e.pathPending = false;
    }
  }
  /** 驻守：原地不动，只对射程内敌人开火，绝不追击 */
  issueHold(ids) {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== "unit") continue;
      e.order = { kind: "hold" };
      e.engagedId = null;
      e.firingHold = false;
      e.gatherState = null;
      e.path = null;
      e.pathPending = false;
    }
  }
  /** 建造（未完成）或修理（已完成且受损）；工程车专用 */
  issueBuild(ids, buildingId) {
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== "unit") continue;
      e.order = { kind: "build", targetId: buildingId };
      e.engagedId = null;
      e.firingHold = false;
      e.gatherState = null;
      e.path = null;
      e.pathPending = false;
    }
  }
  /** 人工采集：右键树（wood）或矿（ore）。工程车自动 采集→满载回仓→卸货→循环 */
  issueGather(ids, resTile, res) {
    let ordered = 0;
    for (const id of ids) {
      const e = this.entities.get(id);
      if (!e || e.kind !== "unit" || !UNIT_DEFS[e.defId].gather) continue;
      e.order = { kind: "gather", resTile, res };
      e.gatherState = "toRes";
      e.resTile = resTile;
      e.resExhausted = false;
      e.engagedId = null;
      e.firingHold = false;
      e.path = null;
      e.pathPending = false;
      ordered++;
    }
    if (ordered > 0) {
      const tx = resTile % MAP_W, ty = resTile / MAP_W | 0;
      this.addFx((tx + 0.5) * TILE, (ty + 0.5) * TILE, "mark", 0, 1.4, void 0, res === "wood" ? "\u4F10\u6728" : "\u91C7\u77FF");
    }
  }
  // ================= 特效 =================
  addFx(x, y, type, size = 10, dur = 0.3, a, text) {
    if (this.fx.length > 300) this.fx.shift();
    this.fx.push({ x, y, type, t: 0, dur, size, a, text });
  }
};

// src/sim/ai-config.ts
var DIFFICULTY_PRESETS = {
  easy: {
    name: "\u8F7B\u677E",
    economyMul: 0.75,
    thinkSec: 1.2,
    waveStart: 8,
    waveGrow: 4,
    waveInterval: 50,
    firstDelay: 30,
    retreatLockSec: 12,
    waveCap: 16,
    tactics: ["focusFire"]
  },
  standard: {
    name: "\u6807\u51C6",
    economyMul: 1,
    thinkSec: 1,
    waveStart: 6,
    waveGrow: 3,
    waveInterval: 40,
    firstDelay: 20,
    retreatLockSec: 10,
    waveCap: 14,
    tactics: ["focusFire", "retreat", "spareArtillery"]
  },
  hard: {
    name: "\u56F0\u96BE",
    economyMul: 1.15,
    thinkSec: 0.7,
    waveStart: 5,
    waveGrow: 2,
    waveInterval: 30,
    firstDelay: 15,
    retreatLockSec: 10,
    waveCap: 12,
    tactics: ["focusFire", "retreat", "spareArtillery", "highGround", "weiwei"]
  },
  nightmare: {
    name: "\u5669\u68A6",
    economyMul: 1.35,
    thinkSec: 0.5,
    waveStart: 4,
    waveGrow: 2,
    waveInterval: 22,
    firstDelay: 12,
    retreatLockSec: 8,
    waveCap: 10,
    tactics: ["focusFire", "retreat", "spareArtillery", "highGround", "weiwei", "denyMining", "counterComp"]
  }
};
var PERSONALITIES = {
  balanced: {
    name: "\u5747\u8861",
    line: "\u7A33\u624E\u7A33\u6253\uFF0C\u6EF4\u6C34\u4E0D\u6F0F",
    weights: {},
    targetMul: {},
    waveSizeMul: 1,
    attackCdMul: 1
  },
  rusher: {
    name: "\u83BD\u592B",
    line: "\u8BA9\u4ED6\u4EEC\u89C1\u8BC6\u94A2\u94C1\u7684\u6012\u706B\uFF01",
    weights: { infantry: 2, tank: 0.8, artillery: 0.4, farm: 0.7, turret: 0.3, factory: 0.7, storehouse: 0.6, barracks: 1.6 },
    targetMul: { barracks: 1.5, turret: 0.5, farm: 0.8 },
    waveSizeMul: 0.7,
    attackCdMul: 0.55
  },
  turtler: {
    name: "\u4E4C\u9F9F",
    line: "\u6765\u5427\uFF0C\u649E\u788E\u5728\u57CE\u5899\u4E0A",
    weights: { turret: 2.5, artillery: 1.8, farm: 1.3, infantry: 0.6, lumber: 0.9, barracks: 1.2 },
    targetMul: { turret: 3, factory: 0.8 },
    waveSizeMul: 1.6,
    attackCdMul: 1.5
  },
  eco: {
    name: "\u79CD\u7530",
    line: "\u8010\u5FC3\u662F\u6700\u5927\u7684\u6B66\u5668",
    weights: { lumber: 1.6, mine: 1.6, factory: 1.4, tank: 1.3, farm: 1.2, infantry: 0.5, turret: 0.7, barracks: 0.6 },
    targetMul: { lumber: 1.5, mine: 1.4, farm: 1.2 },
    waveSizeMul: 1.4,
    attackCdMul: 1.8
  }
};
var BASE_BUILD_TARGETS = {
  builder: 2,
  farm: 7,
  lumber: 2,
  mine: 3,
  storehouse: 4,
  barracks: 2,
  factory: 2,
  turret: 2,
  hq: 1
};
var LS_KEY = "sm_ai_settings";
function loadAISettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return { difficulty: "standard", personality: "balanced" };
}
function resolveAIConfig(settings = loadAISettings()) {
  const dId = settings.difficulty in DIFFICULTY_PRESETS ? settings.difficulty : "standard";
  const d = DIFFICULTY_PRESETS[dId];
  const pId = PERSONALITIES[settings.personality] ? settings.personality : "balanced";
  const p = PERSONALITIES[pId];
  const c = settings.difficulty === "custom" ? settings.custom : void 0;
  return {
    difficultyId: settings.difficulty,
    personalityId: pId,
    economyMul: c?.economyMul ?? d.economyMul,
    thinkSec: c?.thinkSec ?? d.thinkSec,
    waveStart: c?.waveStart ?? d.waveStart,
    waveGrow: d.waveGrow,
    waveInterval: c?.waveInterval ?? d.waveInterval,
    firstDelay: d.firstDelay,
    retreatLockSec: d.retreatLockSec,
    waveCap: d.waveCap,
    tactics: c?.tactics ?? d.tactics,
    weights: p.weights,
    targetMul: p.targetMul,
    waveSizeMul: p.waveSizeMul,
    attackCdMul: p.attackCdMul,
    line: p.line
  };
}
function standardAIConfig() {
  return resolveAIConfig({ difficulty: "standard", personality: "balanced" });
}

// src/sim/ai-priority.ts
var BASE_FALLBACK = 50;
function basePriorityOf(defId) {
  return UNIT_DEFS[defId]?.aiPriority ?? BUILDING_DEFS[defId]?.aiPriority ?? BASE_FALLBACK;
}
function rankProduction(candidates, weights, needOf) {
  const ranked = [];
  for (const c of candidates) {
    const need = needOf(c.defId);
    if (need <= 0.01) continue;
    const weight = weights[c.defId] ?? 1;
    const score = basePriorityOf(c.defId) * weight * need;
    ranked.push({ ...c, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

// src/sim/ai-tactics.ts
function takeSnapshot(w, owner, foe) {
  const myBuildings = [];
  const myUnits = [];
  const army = [];
  const foeBuildings = [];
  const foeUnits = [];
  const foeComposition = {};
  for (const e of w.entities.values()) {
    if (e.owner === owner) {
      if (e.kind === "building") myBuildings.push(e);
      else {
        myUnits.push(e);
        if (UNIT_DEFS[e.defId].weapon) army.push(e);
      }
    } else if (e.owner === foe) {
      if (e.kind === "building") foeBuildings.push(e);
      else {
        foeUnits.push(e);
        foeComposition[e.defId] = (foeComposition[e.defId] ?? 0) + 1;
      }
    }
  }
  let threatened = null;
  for (const b of myBuildings) {
    if (!b.done || b.hp >= BUILDING_DEFS[b.defId].hp) continue;
    let nearestFoe = null, nearestD = Infinity;
    for (const f of foeUnits) {
      const d = dist(f.x, f.y, b.x, b.y);
      if (d < 13 * TILE && d < nearestD) {
        nearestD = d;
        nearestFoe = f;
      }
    }
    if (nearestFoe) {
      threatened = { building: b, foe: nearestFoe };
      break;
    }
  }
  const p = w.players[owner];
  return {
    time: w.time,
    myBuildings,
    myUnits,
    army,
    foeBuildings,
    foeUnits,
    foeComposition,
    wood: p.res.wood,
    food: p.res.food,
    ore: p.res.ore,
    storageCap: p.storageCap,
    incomeWood: p.income.wood,
    incomeFood: p.income.food,
    pop: p.pop,
    popCap: p.popCap,
    threatened
  };
}
function applyRetreat(ctx) {
  for (const u of ctx.army) {
    if ((u.aiRetreatUntil ?? 0) > ctx.snap.time) continue;
    const maxHp = UNIT_DEFS[u.defId].hp;
    if (u.hp > maxHp * 0.35) continue;
    const depot = ctx.w.nearestDepot(u.owner, u.x, u.y);
    if (!depot) continue;
    ctx.w.issueMove([u.id], { x: depot.x, y: depot.y });
    u.aiRetreatUntil = ctx.snap.time + ctx.cfg.retreatLockSec;
    u.engagedId = null;
    ctx.w.addLog("military", "\u6B8B\u8840\u5355\u4F4D\u64A4\u79BB\u524D\u7EBF\u6574\u7F16", u.owner, "retreat:" + u.owner, 15);
  }
}
function isRetreating(e, time) {
  return (e.aiRetreatUntil ?? 0) > time;
}
function applySpareArtillery(ctx) {
  for (const u of ctx.army) {
    if (u.defId !== "artillery") continue;
    if ((u.aiSpareUntil ?? 0) > ctx.snap.time) continue;
    const minRange = UNIT_DEFS["artillery"].weapon?.minRange ?? 60;
    let threat = null;
    for (const f of ctx.snap.foeUnits) {
      if (dist(f.x, f.y, u.x, u.y) < minRange) {
        threat = f;
        break;
      }
    }
    if (!threat) continue;
    const dx = u.x - threat.x, dy = u.y - threat.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = u.x + dx / len * TILE * 5, ty = u.y + dy / len * TILE * 5;
    ctx.w.issueMove([u.id], { x: tx, y: ty });
    u.aiSpareUntil = ctx.snap.time + 6;
    u.engagedId = null;
  }
}
function findHighGroundNear(w, x, y, radius = 3) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  let best = null, bestH = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const i = ny * MAP_W + nx;
      if (!w.walkable[i] || w.height[i] <= bestH) continue;
      bestH = w.height[i];
      best = { x: (nx + 0.5) * TILE, y: (ny + 0.5) * TILE };
    }
  }
  return best;
}
function counterCompWeights(comp) {
  const adj = {};
  const tanks = comp["tank"] ?? 0;
  const infantry = comp["infantry"] ?? 0;
  const artillery = comp["artillery"] ?? 0;
  if (tanks > infantry) {
    adj["artillery"] = 1.5;
    adj["turret"] = 1.3;
  } else if (infantry > 0) {
    adj["tank"] = 1.3;
  }
  if (artillery > 0) {
    adj["tank"] = (adj["tank"] ?? 1) * 1.3;
  }
  return adj;
}

// src/sim/construction.ts
function updateConstruction(w, dt) {
  const finished = [];
  for (const e of w.entities.values()) {
    if (e.kind !== "unit") continue;
    if (e.order.kind !== "build" || e.order.targetId == null) continue;
    const b = w.entities.get(e.order.targetId);
    if (!b || b.kind !== "building" || b.owner !== e.owner) {
      e.order = { kind: "idle" };
      continue;
    }
    const def = BUILDING_DEFS[b.defId];
    const inRange = dist(e.x, e.y, b.x, b.y) <= b.radius() + TILE * 2;
    if (!inRange) continue;
    if (!b.done) {
      faceToward2(e, b.x, b.y, dt);
      b.progress += dt / def.buildTime;
      if ((w.tick & 15) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y + (Math.random() - 0.5) * b.radius(), "hit", 5, 0.2);
      if (b.progress >= 1) {
        b.progress = 1;
        b.done = true;
        b.hp = def.hp;
        w.addFx(b.x, b.y, "hit", 18, 0.35);
        w.addLog("build", `\u5EFA\u6210\uFF1A${def.name}`, b.owner);
        finished.push(b);
      }
    } else if (b.hp < def.hp) {
      faceToward2(e, b.x, b.y, dt);
      b.hp = Math.min(def.hp, b.hp + 30 * dt);
      if ((w.tick & 31) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y - b.radius() * 0.6, "hit", 4, 0.2);
      if (b.hp >= def.hp) e.order = { kind: "idle" };
    } else {
      e.order = { kind: "idle" };
    }
  }
  for (const e of w.entities.values()) {
    if (e.kind === "unit" && e.order.kind === "build" && e.order.targetId != null) {
      const b = w.entities.get(e.order.targetId);
      if (b && finished.includes(b)) e.order = { kind: "idle" };
    }
  }
  for (const e of w.entities.values()) {
    if (e.kind !== "building" || !e.done) continue;
    const def = BUILDING_DEFS[e.defId];
    if (!def.produces || e.queue.length === 0) continue;
    const item = e.queue[0];
    item.remaining -= dt;
    if (item.remaining <= 0) {
      const spot = findFreeSpot(w, e, UNIT_DEFS[item.unitId].moveClass);
      if (!spot) {
        item.remaining = 0.3;
        continue;
      }
      e.queue.shift();
      const u = w.spawnUnit(item.unitId, e.owner, spot.x, spot.y);
      w.addLog("military", `\u8BAD\u7EC3\u5B8C\u6210\uFF1A${UNIT_DEFS[item.unitId].name}`, e.owner);
      const rally = e.rally ?? { x: e.x, y: e.y + e.radius() + TILE * 1.5 };
      w.issueMove([u.id], rally);
    }
  }
}
function findFreeSpot(w, b, moveClass) {
  const size = BUILDING_DEFS[b.defId].size;
  const wantWater = moveClass === "naval";
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= size + r - 1; dy++) {
      for (let dx = -r; dx <= size + r - 1; dx++) {
        const edge = dx < 0 || dy < 0 || dx >= size || dy >= size;
        if (!edge) continue;
        const x = b.tx + dx, y = b.ty + dy;
        const wx = (x + 0.5) * TILE, wy = (y + 0.5) * TILE;
        if (wantWater) {
          if (w.terrain[y * 64 + x] !== 1) continue;
        } else if (!w.walkableAtTile(x, y)) continue;
        let occupied = false;
        for (const o of w.entities.values()) {
          if (o.kind === "unit" && dist(o.x, o.y, wx, wy) < 14) {
            occupied = true;
            break;
          }
        }
        if (!occupied) return { x: wx, y: wy };
      }
    }
  }
  return null;
}
function faceToward2(e, tx, ty, dt) {
  const target = Math.atan2(ty - e.y, tx - e.x);
  let d = target - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.angle += d * Math.min(1, dt * 12);
}
function tryEnqueue(w, building, unitId) {
  const def = UNIT_DEFS[unitId];
  if (building.owner > 1) return false;
  const p = w.players[building.owner];
  if (!def || building.queue.length >= 5) return false;
  if (p.pop + countQueued(w, building.owner) >= p.popCap) return false;
  if (!w.canAfford(building.owner, def.cost)) return false;
  w.payCost(building.owner, def.cost);
  building.queue.push({ unitId, remaining: def.buildTime });
  return true;
}
function countQueued(w, owner) {
  let n = 0;
  for (const e of w.entities.values()) {
    if (e.kind === "building" && e.owner === owner) n += e.queue.length;
  }
  return n;
}

// src/sim/ai.ts
var UNIT_CAPS = { builder: 2, infantry: 10, tank: 6, artillery: 2 };
var AIController = class {
  owner;
  cfg;
  timer = 0;
  waveSize;
  waveN = 0;
  waveActive = false;
  waveUntil = 0;
  attackCd;
  constructor(owner, cfg = standardAIConfig()) {
    this.owner = owner;
    this.cfg = cfg;
    this.waveSize = Math.max(2, Math.round(cfg.waveStart * cfg.waveSizeMul));
    this.attackCd = cfg.firstDelay;
  }
  update(w, dt) {
    if (w.gameOver) return;
    this.timer -= dt;
    this.attackCd -= dt;
    if (this.timer > 0) return;
    this.timer = this.cfg.thinkSec;
    this.think(w);
  }
  think(w) {
    const foe = 1 - this.owner;
    const snap = takeSnapshot(w, this.owner, foe);
    const hq = snap.myBuildings.find((b) => b.defId === "hq");
    if (!hq) return;
    const ctx = { w, owner: this.owner, foe, cfg: this.cfg, snap, army: snap.army };
    const army = snap.army;
    const tacticOn = (id) => this.cfg.tactics.includes(id);
    if (tacticOn("retreat")) applyRetreat(ctx);
    if (tacticOn("spareArtillery")) applySpareArtillery(ctx);
    const compAdj = tacticOn("counterComp") ? counterCompWeights(snap.foeComposition) : {};
    const weightOf = (defId) => (this.cfg.weights[defId] ?? 1) * (compAdj[defId] ?? 1);
    for (const b of snap.myBuildings) {
      if (!b.done) continue;
      const def = BUILDING_DEFS[b.defId];
      if (!def.produces || b.queue.length >= 2) continue;
      const ranked = rankProduction(
        def.produces.map((defId) => ({ defId, kind: "unit", need: 1 })),
        this.cfg.weights,
        (id) => this.unitNeed(snap, id)
      );
      for (const c of ranked) {
        if (tryEnqueue(w, b, c.defId)) break;
      }
    }
    const idleBuilder = snap.myUnits.find((u) => u.defId === "builder" && u.order.kind === "idle");
    if (idleBuilder) {
      const buildable = UNIT_DEFS["builder"].canBuild ?? [];
      const ranked = rankProduction(
        buildable.map((defId) => ({ defId, kind: "building", need: 1 })),
        this.cfg.weights,
        (id) => this.buildNeed(snap, id)
      );
      for (const c of ranked) {
        const def = BUILDING_DEFS[c.defId];
        if (!w.canAfford(this.owner, def.cost)) continue;
        const spot = this.findSpot(w, c.defId, hq);
        if (!spot) continue;
        w.payCost(this.owner, def.cost);
        const site = w.spawnBuilding(c.defId, this.owner, spot.tx, spot.ty, false);
        w.issueBuild([idleBuilder.id], site.id);
        break;
      }
    }
    if (snap.threatened) {
      const fighters = army.filter((u) => !isRetreating(u, snap.time) && (u.order.kind === "idle" || u.order.kind === "attack"));
      if (tacticOn("weiwei") && fighters.length >= 4) {
        const ecoTarget = this.nearestFoeBuilding(w, army, foe, ["lumber", "mine", "farm", "storehouse"]);
        const target = ecoTarget ?? this.nearestFoeBuilding(w, army, foe, null);
        if (target) {
          w.issueAttack(fighters.map((u) => u.id), target.id);
          w.addLog("military", "\u56F4\u9B4F\u6551\u8D75\uFF1A\u53CD\u6253\u654C\u65B9\u7ECF\u6D4E\uFF0C\u903C\u5176\u56DE\u9632", this.owner, "weiwei", 30);
          return;
        }
      }
      const near = snap.foeUnits.filter((f) => dist(f.x, f.y, snap.threatened.building.x, snap.threatened.building.y) < 16 * TILE).sort((a, b) => dist(a.x, a.y, snap.threatened.building.x, snap.threatened.building.y) - dist(b.x, b.y, snap.threatened.building.x, snap.threatened.building.y));
      if (near.length > 0 && fighters.length >= 3) {
        w.issueAttack(fighters.map((u) => u.id), near[0].id);
        return;
      }
    }
    const storageFull = Math.max(snap.wood, snap.food, snap.ore) >= snap.storageCap - 1;
    const effWaveSize = Math.min(this.waveSize, this.cfg.waveCap);
    const mustPush = storageFull && army.length >= Math.max(4, Math.floor(effWaveSize * 0.6));
    if (this.attackCd <= 0 && (army.length >= effWaveSize || mustPush)) {
      const target = this.pickWaveTarget(w, army, foe, tacticOn("denyMining"));
      if (target) {
        const fighters = army.filter((u) => !isRetreating(u, snap.time));
        let usedHighGround = false;
        if (tacticOn("highGround")) {
          const hg = findHighGroundNear(w, target.x, target.y, 3);
          if (hg) {
            w.issueAttackMove(fighters.map((u) => u.id), hg);
            usedHighGround = true;
          }
        }
        if (!usedHighGround) {
          if (tacticOn("focusFire")) {
            w.issueAttack(fighters.map((u) => u.id), target.id);
          } else {
            for (const u of fighters) {
              const near = this.nearestFoeFrom(w, u, foe);
              if (near) w.issueAttack([u.id], near.id);
            }
          }
        }
        this.waveN++;
        const tName = BUILDING_DEFS[target.defId]?.name ?? UNIT_DEFS[target.defId].name;
        w.addLog(
          "military",
          `\u7B2C${this.waveN}\u6CE2\u8FDB\u653B\u53D1\u8D77\uFF08\u5175\u529B${fighters.length}${mustPush ? "\uFF0C\u6EE1\u4ED3\u603B\u653B" : ""}\uFF0C\u76EE\u6807\uFF1A${tName}${usedHighGround ? "\uFF0C\u62A2\u5360\u9AD8\u5730" : ""}\uFF09`,
          this.owner
        );
        this.waveSize += this.cfg.waveGrow;
        this.attackCd = mustPush ? 8 : this.cfg.waveInterval * this.cfg.attackCdMul;
        this.waveActive = true;
        this.waveUntil = w.time + 45;
      }
    }
    if (this.waveActive) {
      if (w.time > this.waveUntil) {
        this.waveActive = false;
      } else {
        for (const u of army) {
          if (isRetreating(u, snap.time)) continue;
          if (u.order.kind === "idle") {
            const t = this.nearestFoeFrom(w, u, foe);
            if (t) w.issueAttack([u.id], t.id);
          }
        }
      }
    }
  }
  /** 单位生产缺口系数（排行用）：存量越少分越高；到顶直接归零（从候选池剔除，防刷屏） */
  unitNeed(snap, defId) {
    const cap = UNIT_CAPS[defId] ?? 2;
    let count = snap.myUnits.reduce((n, u) => n + (u.defId === defId ? 1 : 0), 0);
    count += snap.myBuildings.reduce((n, bb) => n + bb.queue.reduce((m, q) => m + (q.unitId === defId ? 1 : 0), 0), 0);
    if (count >= cap) return 0;
    return (cap - count) / cap + 0.25;
  }
  /** 建筑建造缺口系数：到顶归零（防无限套娃）；经济建筑按真实缺口打分 */
  buildNeed(snap, defId) {
    const target = Math.ceil((BASE_BUILD_TARGETS[defId] ?? 2) * (this.cfg.targetMul[defId] ?? 1));
    const count = snap.myBuildings.reduce((n, b) => n + (b.defId === defId ? 1 : 0), 0);
    if (count >= target) return 0;
    switch (defId) {
      case "storehouse": {
        const pressure = Math.max(snap.wood, snap.food, snap.ore) / snap.storageCap;
        return pressure > 0.75 ? 1.5 + pressure : 0.05;
      }
      case "farm": {
        const foodStarving = snap.incomeFood < 0.35 && snap.food < 80;
        return snap.popCap - snap.pop < 5 || foodStarving ? 2.4 : snap.pop / Math.max(1, snap.popCap) + 0.2;
      }
      case "lumber":
        return snap.incomeWood < 0.4 ? 1.6 : 0.8;
      case "mine":
        return 0.9;
      case "barracks":
        return count === 0 ? 1.5 : 0.7;
      case "factory":
        return snap.myBuildings.some((b) => b.defId === "barracks" && b.done) ? 1.2 : 0.05;
      case "turret":
        return 0.5;
      default:
        return 0.5;
    }
  }
  /** 波次选靶：军团质心最近的敌方目标（基地加权，断矿流给经济建筑加权） */
  pickWaveTarget(w, army, foe, denyMining) {
    let cx = 0, cy = 0;
    for (const u of army) {
      cx += u.x;
      cy += u.y;
    }
    cx /= army.length;
    cy /= army.length;
    let best = null, bestScore = Infinity;
    for (const o of w.entities.values()) {
      if (o.owner !== foe) continue;
      let score = dist(cx, cy, o.x, o.y);
      if (o.defId === "hq") score *= 1.3;
      if (denyMining && (o.defId === "lumber" || o.defId === "mine" || o.defId === "farm" || o.defId === "storehouse")) score *= 0.55;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
    return best;
  }
  nearestFoeFrom(w, u, foe) {
    let best = null, bestD = Infinity;
    for (const o of w.entities.values()) {
      if (o.owner !== foe) continue;
      const d = dist(u.x, u.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }
  nearestFoeBuilding(w, army, foe, roles) {
    let cx = 0, cy = 0;
    for (const u of army) {
      cx += u.x;
      cy += u.y;
    }
    cx /= army.length;
    cy /= army.length;
    let best = null, bestD = Infinity;
    for (const o of w.entities.values()) {
      if (o.owner !== foe || o.kind !== "building") continue;
      if (roles && !roles.includes(BUILDING_DEFS[o.defId].aiRole ?? "")) continue;
      const d = dist(cx, cy, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }
  /** 找建造位置：矿场找矿脉、伐木找树丛、普通建筑绕HQ螺旋 */
  findSpot(w, defId, hq) {
    const def = BUILDING_DEFS[defId];
    if (def.needOre) {
      const cands = [];
      for (let y = 1; y < MAP_H - 2; y++) {
        for (let x = 1; x < MAP_W - 2; x++) {
          if (w.terrain[y * MAP_W + x] === T_ORE) {
            cands.push({ tx: x, ty: y, d: dist(hq.x, hq.y, (x + 1) * TILE, (y + 1) * TILE) });
          }
        }
      }
      cands.sort((a, b) => a.d - b.d);
      for (const c of cands) {
        for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
          if (w.canPlace(defId, c.tx + dx, c.ty + dy).ok) return { tx: c.tx + dx, ty: c.ty + dy };
        }
      }
      return null;
    }
    if (def.needTrees) {
      const cands = [];
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
            if (w.canPlace(defId, c.tx + dx, c.ty + dy).ok) return { tx: c.tx + dx, ty: c.ty + dy };
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
          if (w.canPlace(defId, tx, ty).ok) return { tx, ty };
        }
      }
    }
    return null;
  }
};

// src/sim/movement.ts
function updateMovement(w, dt) {
  for (let i = 0; i < w.pendingPaths.length && w.pathBudget > 0; i++) {
    const u = w.entities.get(w.pendingPaths[i]);
    if (u && u.kind === "unit" && u.pathPending) requestPathNow(w, u);
  }
  w.pendingPaths.length = 0;
  for (const e of w.entities.values()) {
    if (e.kind !== "unit") continue;
    const def = UNIT_DEFS[e.defId];
    if (def.moveClass === "air") {
      if (e.firingHold) {
        e.stuck = 0;
        continue;
      }
      const goal2 = moveGoal(w, e);
      if (goal2) {
        const dx = goal2.x - e.x, dy = goal2.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = def.speed * dt;
        if (d <= step) {
          e.x = goal2.x;
          e.y = goal2.y;
          if (e.order.kind === "move" || e.order.kind === "attackMove") e.order = { kind: "idle" };
          e.path = null;
        } else {
          e.x += dx / d * step;
          e.y += dy / d * step;
          faceToward(e, goal2.x, goal2.y, dt);
        }
        e.x = Math.max(TILE, Math.min(MAP_W * TILE - TILE, e.x));
        e.y = Math.max(TILE, Math.min(MAP_H * TILE - TILE, e.y));
      }
      continue;
    }
    const isNaval = def.moveClass === "naval";
    const goal = moveGoal(w, e);
    if (!goal) {
      e.path = null;
      continue;
    }
    const needPath = !e.path || e.pathIdx >= (e.path?.length ?? 0);
    if (needPath && e.repathTimer <= 0) {
      requestPath(w, e, goal.x, goal.y, isNaval);
      if (e.order.kind === "attack") e.repathTimer = 0.5;
      else if (!e.path) e.repathTimer = 1;
    }
    if (e.repathTimer > 0) e.repathTimer -= dt;
    if (e.path && e.pathIdx < e.path.length) {
      while (e.pathIdx + 1 < e.path.length && lineWalkable(w, e.x, e.y, e.path[e.pathIdx + 1].x, e.path[e.pathIdx + 1].y)) {
        e.pathIdx++;
      }
      const wp = e.path[e.pathIdx];
      const d = dist(e.x, e.y, wp.x, wp.y);
      const step = def.speed * dt;
      if (d <= Math.max(step, 6)) {
        e.pathIdx++;
        if (e.pathIdx >= e.path.length) {
          e.path = null;
          arrive(w, e);
        }
      } else {
        const nx = e.x + (wp.x - e.x) / d * step;
        const ny = e.y + (wp.y - e.y) / d * step;
        tryMove(w, e, nx, ny, step);
        faceToward(e, wp.x, wp.y, dt);
      }
    }
    separate(w, e);
  }
}
function moveGoal(w, e) {
  if (e.order.kind === "move" && e.order.target) {
    const t = e.order.target;
    if (dist(e.x, e.y, t.x, t.y) < 10) {
      e.order = { kind: "idle" };
      return null;
    }
    return t;
  }
  if (e.order.kind === "attack" && e.order.targetId != null) {
    const t = w.entities.get(e.order.targetId);
    if (!t) return null;
    return { x: t.x, y: t.y };
  }
  if (e.order.kind === "build" && e.order.targetId != null) {
    const b = w.entities.get(e.order.targetId);
    if (!b) return null;
    if (dist(e.x, e.y, b.x, b.y) <= b.radius() + TILE * 2) return null;
    return { x: b.x, y: b.y };
  }
  if (e.order.kind === "gather") {
    if (e.gatherState === "toRes") {
      const tx = e.resTile % 64, ty = e.resTile / 64 | 0;
      const g = nearestWalkable(w.walkable, tx, ty);
      return { x: (g.x + 0.5) * TILE, y: (g.y + 0.5) * TILE };
    }
    if (e.gatherState === "toDepot" || e.gatherState === "deposit") {
      const depot = w.nearestDepot(e.owner, e.x, e.y);
      if (!depot) return null;
      if (e.gatherState === "deposit") {
        if (dist(e.x, e.y, depot.x, depot.y) <= depot.radius() + TILE * 1.6) return null;
      }
      return { x: depot.x, y: depot.y };
    }
    return null;
  }
  if (e.order.kind === "attackMove") {
    if (e.engagedId != null) {
      const t2 = w.entities.get(e.engagedId);
      if (t2) return { x: t2.x, y: t2.y };
    }
    const t = e.order.target;
    if (t) {
      if (dist(e.x, e.y, t.x, t.y) < 12) {
        e.order = { kind: "idle" };
        return null;
      }
      return t;
    }
    return null;
  }
  if (e.order.kind === "hold") return null;
  return null;
}
function arrive(w, e) {
  if (e.order.kind === "move") e.order = { kind: "idle" };
  void w;
}
function requestPath(w, e, gx, gy, isNaval = false) {
  if (w.pathBudget > 0) requestPathNow(w, e, gx, gy, isNaval);
  else {
    e.pathPending = true;
    w.pendingPaths.push(e.id);
  }
}
function requestPathNow(w, e, gx, gy, isNaval = false) {
  w.pathBudget--;
  e.pathPending = false;
  let tx, ty;
  if (gx != null && gy != null) {
    tx = Math.floor(gx / TILE);
    ty = Math.floor(gy / TILE);
  } else if (e.order.kind === "move" && e.order.target) {
    tx = Math.floor(e.order.target.x / TILE);
    ty = Math.floor(e.order.target.y / TILE);
  } else return;
  const grid = isNaval ? w.navalWalkable : w.walkable;
  const g = nearestWalkable(grid, tx, ty);
  const path = findPath(w.terrain, grid, w.height, Math.floor(e.x / TILE), Math.floor(e.y / TILE), g.x, g.y);
  e.path = path;
  e.pathIdx = 0;
  e.stuck = 0;
}
function tryMove(w, e, nx, ny, step) {
  if (w.canStandClassAt(e, e.x, e.y, nx, ny)) {
    e.x = nx;
    e.y = ny;
    e.stuck = 0;
    return;
  }
  if (w.canStandClassAt(e, e.x, e.y, nx, e.y)) {
    e.x = nx;
    return;
  }
  if (w.canStandClassAt(e, e.x, e.y, e.x, ny)) {
    e.y = ny;
    return;
  }
  e.stuck += step;
  if (e.stuck > TILE * 2 && !e.pathPending) {
    e.path = null;
    e.stuck = 0;
  }
}
function separate(w, e) {
  const def = UNIT_DEFS[e.defId];
  const near = [];
  w.hash.queryCircle(e.x, e.y, def.radius + 14, near);
  for (const id of near) {
    if (id === e.id) continue;
    const o = w.entities.get(id);
    if (!o || o.kind !== "unit") continue;
    if (UNIT_DEFS[o.defId]?.moveClass !== void 0 && UNIT_DEFS[e.defId]?.moveClass !== UNIT_DEFS[o.defId]?.moveClass) continue;
    const od = UNIT_DEFS[o.defId];
    const dx = e.x - o.x, dy = e.y - o.y;
    const d2 = dx * dx + dy * dy;
    const minD = def.radius + od.radius;
    if (d2 > 1e-4 && d2 < minD * minD) {
      const d = Math.sqrt(d2);
      const push = (minD - d) / 2 * 0.6;
      const px = dx / d * push, py = dy / d * push;
      if (w.canStandAtWorld(e.x, e.y, e.x + px, e.y + py)) {
        e.x += px;
        e.y += py;
      }
    } else if (d2 <= 1e-4) {
      e.x += 0.5;
      e.y += 0.5;
    }
  }
}
function faceToward(e, tx, ty, dt) {
  const target = Math.atan2(ty - e.y, tx - e.x);
  let d = target - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.angle += d * Math.min(1, dt * 12);
}
function lineWalkable(w, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(d / (TILE / 2));
  let lx = x0, ly = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = x0 + (x1 - x0) * t, ny = y0 + (y1 - y0) * t;
    if (!w.canStandAtWorld(lx, ly, nx, ny)) return false;
    lx = nx;
    ly = ny;
  }
  return true;
}

// src/sim/combat.ts
var PROJ_SPEED = { bullet: 520, shell: 380, cannon: 260 };
function weaponOf(e) {
  return e.kind === "unit" ? UNIT_DEFS[e.defId].weapon : BUILDING_DEFS[e.defId].weapon;
}
function isAir(e) {
  return e.kind === "unit" && UNIT_DEFS[e.defId]?.moveClass === "air";
}
function armorOf(e) {
  return (e.kind === "unit" ? UNIT_DEFS[e.defId].armor : BUILDING_DEFS[e.defId].armor) ?? "light";
}
function findShieldFor(w, target) {
  let best = null, bestD = Infinity;
  for (const g of w.entities.values()) {
    if (g.kind !== "building" || g.defId !== "shieldGen" || !g.done || g.owner !== target.owner) continue;
    if ((g.shield ?? 0) <= 0) continue;
    const d = dist(g.x, g.y, target.x, target.y);
    if (d <= 180 && d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}
function updateCombat(w, dt) {
  for (const e of w.entities.values()) {
    const weapon = weaponOf(e);
    if (e.cooldown > 0) e.cooldown -= dt;
    const doScan = (w.tick + e.id) % FOG_SCAN_INTERVAL === 0;
    if (doScan) {
      if (e.order.kind === "attack" && e.order.targetId != null) {
        const t = w.entities.get(e.order.targetId);
        if (!t || t.owner === e.owner) e.order = { kind: "idle" };
      }
      if (e.engagedId != null) {
        const t = w.entities.get(e.engagedId);
        if (!t || t.owner === e.owner) e.engagedId = null;
      }
      if (weapon && e.engagedId == null) {
        const canAA = weapon.targetsAir === true;
        if (e.kind === "unit" && (e.order.kind === "idle" || e.order.kind === "move" || e.order.kind === "attackMove" || e.order.kind === "hold")) {
          const aggro = e.order.kind === "idle" || e.order.kind === "attackMove" ? weapon.range + 30 : weapon.range;
          const t = nearestEnemy(w, e, aggro, true, canAA);
          if (t) {
            if (e.order.kind === "idle") {
              e.order = { kind: "attack", targetId: t.id };
              e.engagedId = t.id;
              e.path = null;
            } else {
              e.engagedId = t.id;
            }
          }
        } else if (e.kind === "building" && e.done) {
          const t = nearestEnemy(w, e, weapon.range, true, canAA);
          if (t) e.engagedId = t.id;
        }
      }
    }
    let firing = false;
    let effDamage = weapon?.damage ?? 0;
    let effRange = weapon?.range ?? 0;
    e.firingHold = false;
    if (weapon && e.engagedId != null) {
      const t = w.entities.get(e.engagedId);
      if (t) {
        const targetAir = isAir(t);
        const hDiff = targetAir ? 0 : Math.max(-3, Math.min(3, w.heightAt(e.x, e.y) - w.heightAt(t.x, t.y)));
        effRange = weapon.range * (1 + HEIGHT_RANGE_BONUS * hDiff);
        effDamage = weapon.damage * (1 + HEIGHT_DAMAGE_BONUS * hDiff);
        const d = dist(e.x, e.y, t.x, t.y) - t.radius();
        const inMax = d <= effRange;
        const inMin = !weapon.minRange || d >= weapon.minRange;
        if (e.order.kind === "attack") {
          if (inMax && inMin) {
            e.firingHold = true;
            e.path = null;
            firing = true;
          } else if (inMax && !inMin) {
            e.firingHold = true;
          }
        } else if (e.order.kind === "move") {
          if (inMax && inMin) {
            e.firingHold = true;
            firing = true;
          } else if (!inMax) e.engagedId = null;
          else e.firingHold = true;
        } else if (e.order.kind === "attackMove") {
          if (inMax && inMin) {
            e.firingHold = true;
            firing = true;
          }
        } else if (e.order.kind === "hold") {
          if (inMax && inMin) {
            firing = true;
          } else e.engagedId = null;
        } else {
          if (inMax && inMin) {
            e.firingHold = true;
            firing = true;
          } else if (!inMax) e.engagedId = null;
        }
        if (inMax) {
          const target = Math.atan2(t.y - e.y, t.x - e.x);
          let da = target - e.turretAngle;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          e.turretAngle += da * Math.min(1, dt * 8);
        }
      } else {
        e.engagedId = null;
      }
    } else if (e.kind === "unit") {
      let da = e.angle - e.turretAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      e.turretAngle += da * Math.min(1, dt * 6);
    }
    if (firing && weapon && e.cooldown <= 0 && e.done && e.engagedId != null) {
      const t = w.entities.get(e.engagedId);
      if (t) {
        const mx = e.x + Math.cos(e.turretAngle) * (e.radius() + 3);
        const my = e.y + Math.sin(e.turretAngle) * (e.radius() + 3);
        const spread = weapon.spread ?? 4;
        w.projectiles.push({
          x: mx,
          y: my,
          tx: t.x + (Math.random() - 0.5) * 2 * spread,
          ty: t.y + (Math.random() - 0.5) * 2 * spread,
          speed: PROJ_SPEED[weapon.projectile],
          damage: effDamage,
          splash: weapon.splash ?? 0,
          hitRadius: weapon.projectile === "bullet" ? 10 : 12,
          targetsAir: weapon.targetsAir === true,
          kind: weapon.projectile,
          owner: e.owner,
          aimId: t.id,
          travel: 0
        });
        w.addFx(mx, my, "muzzle", weapon.projectile === "cannon" ? 15 : 9, 0.08, e.turretAngle);
        e.cooldown = weapon.cooldown;
      }
    }
  }
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const p = w.projectiles[i];
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step) {
      if (p.splash > 0) {
        splashDamage(w, p.tx, p.ty, p.splash, p.damage, p.owner, p.targetsAir, p.kind);
        w.addFx(p.tx, p.ty, "boom", p.splash, 0.45);
      } else {
        const hit = impactDamage(w, p.tx, p.ty, p.hitRadius, p.damage, p.owner, p.targetsAir, p.aimId, p.kind);
        w.addFx(p.tx, p.ty, hit ? "hit" : "hit", hit ? 7 : 3, 0.18);
      }
      w.projectiles.splice(i, 1);
    } else {
      p.x += dx / d * step;
      p.y += dy / d * step;
    }
  }
  for (let i = w.fx.length - 1; i >= 0; i--) {
    const f = w.fx[i];
    f.t += dt;
    if (f.t >= f.dur) w.fx.splice(i, 1);
  }
}
function nearestEnemy(w, e, range, skipPassiveWild, targetsAir) {
  let best = null;
  let bestD = range;
  for (const o of w.entities.values()) {
    if (o.owner === e.owner) continue;
    if (!targetsAir && isAir(o)) continue;
    if (skipPassiveWild && o.kind === "unit" && UNIT_DEFS[o.defId]?.wild === "passive") continue;
    const d = dist(e.x, e.y, o.x, o.y) - o.radius();
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}
function impactDamage(w, x, y, radius, dmg, owner, targetsAir, aimId, dmgType) {
  let best = null;
  let bestD = Infinity;
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (!targetsAir && isAir(o)) continue;
    const isAim = o.id === aimId;
    if (o.kind === "unit" && UNIT_DEFS[o.defId]?.wild === "passive" && !isAim) continue;
    const d = dist(x, y, o.x, o.y) - o.radius();
    if (d <= radius && d < bestD) {
      bestD = d;
      best = o;
    }
  }
  if (best) {
    damage(w, best, dmg, owner, dmgType);
    return true;
  }
  return false;
}
function splashDamage(w, x, y, radius, dmg, owner, targetsAir, dmgType) {
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (!targetsAir && isAir(o)) continue;
    const d = dist(x, y, o.x, o.y) - o.radius();
    if (d <= radius) damage(w, o, dmg, owner, dmgType);
  }
}
function damage(w, target, amount, fromOwner, dmgType) {
  let remaining = amount;
  if (target.owner <= 1) {
    const gen = findShieldFor(w, target);
    if (gen && (gen.shield ?? 0) > 0) {
      const absorbed = Math.min(gen.shield, remaining);
      gen.shield = (gen.shield ?? 0) - absorbed;
      gen.shieldHitAt = w.time;
      remaining -= absorbed;
      if (absorbed > 0) w.addFx(target.x, target.y - 12, "hit", 6, 0.2);
    }
  }
  if (remaining <= 0) return;
  if (dmgType) {
    const armor = armorOf(target);
    remaining *= DMG_MATRIX[dmgType]?.[armor] ?? 1;
  }
  target.hp -= remaining;
  if (target.hp <= 0) {
    if (fromOwner != null && fromOwner <= 1) {
      const bounty = target.kind === "unit" ? UNIT_DEFS[target.defId]?.bounty : BUILDING_DEFS[target.defId]?.bounty;
      if (bounty) {
        for (const [res, v] of Object.entries(bounty)) {
          if (v) w.addRes(fromOwner, res, v);
        }
        w.addLog("econ", `\u7F34\u83B7\u6218\u5229\u54C1\uFF1A${Object.entries(bounty).map(([k, v]) => (k === "wood" ? "\u6728" : k === "food" ? "\u98DF" : "\u77FF") + v).join(" ")}`, fromOwner, "bounty:" + target.id, 10);
      }
    }
    w.removeEntity(target.id);
  }
}

// src/sim/economy.ts
function updateEconomy(w, dt) {
  const income = w.players.map(() => ({ wood: 0, food: 0, ore: 0 }));
  const storehouses = w.players.map(() => 0);
  for (const e of w.entities.values()) {
    if (e.kind !== "building" || !e.done) continue;
    const def = BUILDING_DEFS[e.defId];
    if (def.capBonus && e.owner <= 1) storehouses[e.owner]++;
    if (def.shieldPool && e.shield !== void 0) {
      if (w.time - (e.shieldHitAt ?? -99) > 5) {
        e.shield = Math.min(def.shieldPool, e.shield + (def.shieldRegen ?? 15) * dt);
      }
    }
    if (!def.income) continue;
    let active = true;
    if (e.defId === "lumber") active = runExtractor(w, e, "wood", def.income.wood ?? 0, def.bufferCap ?? 30, dt);
    else if (e.defId === "mine") active = runExtractor(w, e, "ore", def.income.ore ?? 0, def.bufferCap ?? 40, dt);
    else if (e.owner <= 1) {
      for (const [res, rate] of Object.entries(def.income)) {
        const added = w.addRes(e.owner, res, rate * dt);
        if (added <= 0) active = false;
        income[e.owner][res] += rate;
      }
    }
    if (active) {
      const inc = income[e.owner];
      inc.wood += def.income.wood ?? 0;
      inc.food += def.income.food ?? 0;
      inc.ore += def.income.ore ?? 0;
    }
  }
  for (const owner of [0, 1]) {
    const p = w.players[owner];
    const mul = p.incomeMul;
    p.income = { wood: income[owner].wood * mul, food: income[owner].food * mul, ore: income[owner].ore * mul };
    p.res.wood += p.income.wood * dt;
    p.res.food += p.income.food * dt;
    p.res.ore += p.income.ore * dt;
    p.storageCap = STORAGE_BASE + STORAGE_PER_STOREHOUSE * storehouses[owner];
  }
}
function runExtractor(w, e, res, rate, bufferCap, dt) {
  if (e.buffer > 0) {
    const moved = w.addRes(e.owner, res, Math.min(e.buffer, 8 * dt));
    e.buffer -= moved;
  }
  e.bufferStalled = e.buffer >= bufferCap - 0.01 && w.players[e.owner].res[res] >= w.players[e.owner].storageCap - 0.01;
  if (e.bufferStalled) return false;
  if (e.linkedTile < 0 || !hasResourceAt(w, e, res)) {
    e.linkedTile = res === "wood" ? findTreeNear(w, e) : w.pickOreTile(e.tx, e.ty, BUILDING_DEFS[e.defId].size);
    if (e.linkedTile < 0) return false;
  }
  const take = Math.min(rate * dt, bufferCap - e.buffer);
  if (take <= 0) return true;
  if (res === "wood") {
    w.treeWood[e.linkedTile] -= take;
    if (w.treeWood[e.linkedTile] <= 0) exhaustTile(w, e, "\u6811\u6797");
  } else {
    w.oreLeft[e.linkedTile] -= take;
    if (w.oreLeft[e.linkedTile] <= 0) exhaustTile(w, e, "\u77FF\u8109");
  }
  e.buffer += take;
  return true;
}
function hasResourceAt(w, e, res) {
  if (e.linkedTile < 0) return false;
  return res === "wood" ? w.terrain[e.linkedTile] === T_TREE && w.treeWood[e.linkedTile] > 0 : w.oreLeft[e.linkedTile] > 0;
}
function exhaustTile(w, e, name) {
  w.terrain[e.linkedTile] = T_GRASS;
  w.treeWood[e.linkedTile] = 0;
  w.oreLeft[e.linkedTile] = 0;
  w.walkable[e.linkedTile] = 1;
  w.dirtyTiles.add(e.linkedTile);
  w.addLog("econ", `${name}\u88AB\u5F00\u91C7\u6B86\u5C3D`, e.owner);
  e.linkedTile = -1;
}
function findTreeNear(w, e, radius = 4) {
  const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
  let best = -1, bestD = Infinity;
  for (let dy = -radius; dy <= radius + 1; dy++) {
    for (let dx = -radius; dx <= radius + 1; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      const i = y * MAP_W + x;
      if (w.terrain[i] === T_TREE && w.treeWood[i] > 0) {
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
  }
  return best;
}

// src/sim/gather.ts
function updateGather(w, dt) {
  for (const e of w.entities.values()) {
    if (e.kind !== "unit" || e.order.kind !== "gather") continue;
    const def = UNIT_DEFS[e.defId];
    const g = def.gather;
    if (!g) continue;
    switch (e.gatherState) {
      case "toRes": {
        const tc = tileCenter(e.resTile);
        if (!tc) {
          e.order = { kind: "idle" };
          continue;
        }
        if (dist(e.x, e.y, tc.x, tc.y) <= TILE * 2.6) {
          e.gatherState = "gathering";
          e.path = null;
        }
        break;
      }
      case "gathering": {
        if (e.cargo && e.cargo.amt >= g.capacity) {
          e.gatherState = "toDepot";
          break;
        }
        const has = e.order.res === "wood" ? w.terrain[e.resTile] === T_TREE && w.treeWood[e.resTile] > 0 : w.oreLeft[e.resTile] > 0;
        if (!has) {
          const next = findNextResource(w, e.resTile, e.order.res);
          if (next >= 0) {
            e.resTile = next;
            e.gatherState = "toRes";
            e.path = null;
          } else {
            e.resExhausted = true;
            if (e.cargo && e.cargo.amt > 0) {
              e.gatherState = "toDepot";
            } else {
              e.order = { kind: "idle" };
              e.gatherState = null;
            }
          }
          break;
        }
        faceToward3(e, tileCenter(e.resTile), dt);
        const take = Math.min(g.rate * dt, g.capacity - (e.cargo?.amt ?? 0));
        let deposited = 0;
        if (e.order.res === "wood") {
          const avail = w.treeWood[e.resTile];
          deposited = Math.min(take, avail);
          w.treeWood[e.resTile] -= deposited;
          if (w.treeWood[e.resTile] <= 0.01) {
            w.treeWood[e.resTile] = 0;
            w.terrain[e.resTile] = 0;
            w.walkable[e.resTile] = 1;
            w.dirtyTiles.add(e.resTile);
            w.addLog("econ", "\u4E00\u68F5\u6811\u88AB\u780D\u5B8C", e.owner);
          }
        } else {
          const avail = w.oreLeft[e.resTile];
          deposited = Math.min(take, avail);
          w.oreLeft[e.resTile] -= deposited;
          if (w.oreLeft[e.resTile] <= 0.01) {
            w.oreLeft[e.resTile] = 0;
            w.terrain[e.resTile] = 0;
            w.walkable[e.resTile] = 1;
            w.dirtyTiles.add(e.resTile);
            w.addLog("econ", "\u4E00\u5904\u77FF\u8109\u88AB\u91C7\u7A7A", e.owner);
          }
        }
        if (!e.cargo || e.cargo.res !== e.order.res) e.cargo = { res: e.order.res, amt: 0 };
        e.cargo.amt += deposited;
        if (e.cargo.amt >= g.capacity - 0.01) {
          e.cargo.amt = g.capacity;
          e.gatherState = "toDepot";
          e.path = null;
        }
        break;
      }
      case "toDepot": {
        const depot = nearestDepot(w, e);
        if (!depot) break;
        if (dist(e.x, e.y, depot.x, depot.y) <= depot.radius() + TILE * 1.6) {
          e.gatherState = "deposit";
          e.path = null;
        }
        break;
      }
      case "deposit": {
        const depot = nearestDepot(w, e);
        if (!depot) {
          e.gatherState = null;
          e.order = { kind: "idle" };
          continue;
        }
        if (dist(e.x, e.y, depot.x, depot.y) > depot.radius() + TILE * 2.2) {
          e.gatherState = "toDepot";
          break;
        }
        if (e.cargo && e.cargo.amt > 0) {
          const added = w.addRes(e.owner, e.cargo.res, e.cargo.amt);
          e.cargo.amt -= added;
          if (added > 0) {
            w.addLog("econ", `\u5165\u5E93 ${e.cargo.res === "wood" ? "\u6728\u5934" : "\u77FF\u77F3"}+${added.toFixed(0)}`, e.owner, `deposit:${e.owner}`, 20);
            w.addFx(depot.x, depot.y - depot.radius() * 0.6, "hit", 9, 0.3);
          }
          if (e.cargo.amt <= 0.01) {
            e.cargo = null;
            if (e.resExhausted) {
              e.order = { kind: "idle" };
              e.gatherState = null;
              e.resExhausted = false;
            } else {
              const has = e.order.res === "wood" ? w.terrain[e.resTile] === T_TREE && w.treeWood[e.resTile] > 0 : w.oreLeft[e.resTile] > 0;
              if (!has) {
                const next = findNextResource(w, e.resTile, e.order.res);
                if (next >= 0) e.resTile = next;
                else {
                  e.order = { kind: "idle" };
                  e.gatherState = null;
                  break;
                }
              }
              e.gatherState = "toRes";
              e.path = null;
            }
          }
        } else {
          e.cargo = null;
          e.gatherState = "toRes";
          e.path = null;
        }
        break;
      }
      default:
        break;
    }
  }
}
function findNextResource(w, fromTile, res) {
  const tx = fromTile % MAP_W, ty = fromTile / MAP_W | 0;
  let best = -1, bestD = Infinity;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      const i = y * MAP_W + x;
      const ok = res === "wood" ? w.terrain[i] === T_TREE && w.treeWood[i] > 0 : w.oreLeft[i] > 0;
      if (ok) {
        const d = dx * dx + dy * dy;
        if (d > 0 && d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
  }
  return best;
}
function nearestDepot(w, e) {
  return w.nearestDepot(e.owner, e.x, e.y);
}
function tileCenter(i) {
  const x = i % MAP_W, y = i / MAP_W | 0;
  return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
}
function faceToward3(e, target, dt) {
  const angle = Math.atan2(target.y - e.y, target.x - e.x);
  let d = angle - e.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.angle += d * Math.min(1, dt * 12);
}

// src/sim/fog.ts
function updateFog(w) {
  for (const owner of [0, 1]) {
    const f = w.fog[owner];
    for (let i = 0; i < f.length; i++) if (f[i] === 2) f[i] = 1;
    for (const e of w.entities.values()) {
      if (e.owner !== owner) continue;
      const base = e.kind === "unit" ? UNIT_DEFS[e.defId].vision : BUILDING_DEFS[e.defId].vision;
      const vision = base + w.heightAt(e.x, e.y) * HEIGHT_VISION_BONUS;
      revealCircle(f, Math.floor(e.x / 32), Math.floor(e.y / 32), vision);
    }
  }
}
function revealCircle(f, cx, cy, r) {
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= MAP_H) continue;
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= MAP_W) continue;
      if (dx * dx + dy * dy <= r2) f[y * MAP_W + x] = 2;
    }
  }
}

// src/sim/tick.ts
function simTick(w, dt, ais) {
  w.tick++;
  w.time += dt;
  w.pathBudget = PATH_BUDGET;
  w.hash.clear();
  for (const e of w.entities.values()) {
    if (e.kind === "unit") w.hash.insert(e.id, e.x, e.y, 12);
  }
  for (const ai of ais) if (ai) ai.update(w, dt);
  updateEconomy(w, dt);
  updateConstruction(w, dt);
  updateGather(w, dt);
  updateNeutrals(w, dt);
  updateCombat(w, dt);
  updateMovement(w, dt);
  if (w.tick % FOG_INTERVAL === 0) updateFog(w);
  if (w.tick % 30 === 0) w.recomputePop();
}

// tools/tournament.ts
var SIM_DT2 = 1 / 60;
var MAX_MIN = 60;
var arenas = [
  {
    name: "\u7B2C\u4E00\u64C2\u53F0\xB7\u5669\u68A6\u5185\u6218\uFF08\u83BD\u592B vs \u4E4C\u9F9F\uFF09",
    w: new World(),
    aiA: new AIController(0, resolveAIConfig({ difficulty: "nightmare", personality: "rusher" })),
    aiB: new AIController(1, resolveAIConfig({ difficulty: "nightmare", personality: "turtler" })),
    nameA: "\u83BD\u592B\xB7\u5669\u68A6",
    nameB: "\u4E4C\u9F9F\xB7\u5669\u68A6",
    done: false,
    winner: "",
    lastReportMin: -5
  },
  {
    name: "\u7B2C\u4E8C\u64C2\u53F0\xB7\u56F0\u96BE\u5BF9\u51B3\uFF08\u79CD\u7530 vs \u5747\u8861\uFF09",
    w: new World(),
    aiA: new AIController(0, resolveAIConfig({ difficulty: "hard", personality: "eco" })),
    aiB: new AIController(1, resolveAIConfig({ difficulty: "hard", personality: "balanced" })),
    nameA: "\u79CD\u7530\xB7\u56F0\u96BE",
    nameB: "\u5747\u8861\xB7\u56F0\u96BE",
    done: false,
    winner: "",
    lastReportMin: -5
  }
];
for (const a of arenas) {
  a.w.addLog("system", `\u7EA2\u65B9\u6307\u6325\u5B98\uFF1A${a.nameA}\u2014\u2014"${a.aiA.cfg.line}"`, 0);
  a.w.addLog("system", `\u84DD\u65B9\u6307\u6325\u5B98\uFF1A${a.nameB}\u2014\u2014"${a.aiB.cfg.line}"`, 1);
}
function stats(a) {
  let armyA = 0, armyB = 0, wavesA = 0, wavesB = 0, lostA = 0, lostB = 0, builtA = 0, builtB = 0, retreats = 0;
  for (const e of a.w.entities.values()) {
    if (e.kind === "unit") {
      if (e.owner === 0) armyA++;
      else armyB++;
    }
  }
  for (const e of a.w.log.entries) {
    if (e.cat !== "military") continue;
    if (e.msg.includes("\u6CE2\u8FDB\u653B\u53D1\u8D77")) {
      if (e.owner === 0) wavesA++;
      else wavesB++;
    } else if (e.msg.includes("\u88AB\u6467\u6BC1")) {
      if (e.owner === 0) lostA++;
      else lostB++;
    } else if (e.msg.includes("\u64A4\u79BB\u524D\u7EBF")) retreats++;
  }
  for (const e of a.w.log.entries) {
    if (e.cat === "build" && e.msg.includes("\u5EFA\u6210")) {
      if (e.owner === 0) builtA++;
      else builtB++;
    }
  }
  const hqA = a.w.findHq(0), hqB = a.w.findHq(1);
  return {
    armyA,
    armyB,
    wavesA,
    wavesB,
    lostA,
    lostB,
    builtA,
    builtB,
    retreats,
    hqA: hqA ? Math.round(hqA.hp) : 0,
    hqB: hqB ? Math.round(hqB.hp) : 0
  };
}
var t0 = Date.now();
console.log("=== \u56DBAI\u9AD8\u5F3A\u5EA6\u5BF9\u6218\u6A21\u62DF\u5668 ===");
for (const a of arenas) console.log(`[${a.name}] \u7EA2\u65B9:${a.nameA} vs \u84DD\u65B9:${a.nameB}`);
for (const a of arenas) {
  console.log(`
--- ${a.name} \u5F00\u6218 ---`);
  const ticks = MAX_MIN * 60 * 60;
  for (let s = 0; s < ticks && !a.done; s++) {
    simTick(a.w, SIM_DT2, [a.aiA, a.aiB]);
    const min = Math.floor(a.w.time / 60);
    if (min >= a.lastReportMin + 5) {
      a.lastReportMin = min;
      const st2 = stats(a);
      console.log(`  [${min}min] \u7EA2\u519B${st2.armyA} \u84DD\u519B${st2.armyB} | \u6218\u635F${st2.lostA}/${st2.lostB} | \u6CE2\u6B21${st2.wavesA}+${st2.wavesB} | \u5EFA\u7B51${st2.builtA}+${st2.builtB} | \u7EA2\u57FA\u5730${st2.hqA} \u84DD\u57FA\u5730${st2.hqB}`);
    }
    if (a.w.gameOver !== 0) {
      a.done = true;
      a.winner = a.w.gameOver === 1 ? "\u7EA2\u65B9(" + a.nameA + ")" : "\u84DD\u65B9(" + a.nameB + ")";
      const st2 = stats(a);
      console.log(`  *** \u7EC8\u5C40 @ ${Math.floor(a.w.time / 60)}min\uFF1A${a.winner} \u83B7\u80DC ***`);
      console.log(`  \u6218\u62A5\uFF1A\u7EA2\u519B${st2.armyA} \u84DD\u519B${st2.armyB} | \u6218\u635F${st2.lostA}/${st2.lostB} | \u6CE2\u6B21${st2.wavesA}+${st2.wavesB} | \u5EFA\u7B51${st2.builtA}+${st2.builtB} | \u64A4\u9632${st2.retreats}`);
    }
  }
  if (!a.done) {
    a.done = true;
    a.winner = "\u5E73\u5C40(60\u5206\u949F)";
  }
  const st = stats(a);
  console.log(`  [\u7EC8\u5C40] ${a.winner} | \u7EA2\u519B${st.armyA} \u84DD\u519B${st.armyB} | \u6218\u635F${st.lostA}/${st.lostB} | \u5EFA\u7B51${st.builtA}+${st.builtB}`);
  console.log(`  \u65E5\u5FD7\u6458\u8981:`, a.w.log.summary());
  console.log(`  \u6700\u540E\u6218\u51B5:`);
  for (const line of a.w.log.tail(10)) console.log("    " + line);
}
console.log(`
=== \u6A21\u62DF\u7ED3\u675F\uFF0C\u5B9E\u9645\u8017\u65F6 ${((Date.now() - t0) / 1e3).toFixed(1)}s ===`);
for (const a of arenas) console.log(`[${a.name}] ${a.winner} @ ${Math.floor(a.w.time / 60)}\u5206\u949F`);
