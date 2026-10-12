// src/config.ts
var TILE = 32;
var MAP_W = 128;
var MAP_H = 128;
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
var GOLD_TRADE_BASE = 8;
var GOLD_TRADE_PER_10 = 2;
var GOLD_TRADE_CAP = 24;
var CARAVAN_CAP_PER_POST = 3;
var CORONATION_TIME = 90;
var T_GRASS = 0;
var T_WATER = 1;
var T_TREE = 2;
var T_ORE = 3;
var T_RAMP = 4;
var T_FORD = 5;
var T_FARM = 6;
var FARM_GROWTH = 60;
var FARM_YIELD = 8;
var DMG_REDUCTION = {
  light: { light: 0.85, heavy: 1 },
  heavy: { light: 0.4, heavy: 0.85 }
};
var ARMOR_PIERCE_MULT = 2;
var REGEN_DELAY = 30;
var REGEN_RATE = 0.02;
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
    hp: 85,
    armorPool: 15,
    speed: 70,
    radius: 10,
    vision: 6,
    cost: { wood: 60, food: 30 },
    buildTime: 8,
    producedBy: "hq",
    canBuild: ["farm", "lumber", "mine", "storehouse", "lab", "barracks", "factory", "turret", "aaTurret", "artTurret", "shieldGen", "wall", "shipyard", "tradePost", "monument"],
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
    hp: 60,
    armorPool: 25,
    speed: 55,
    radius: 7,
    vision: 6,
    cost: { food: 50, ore: 10 },
    buildTime: 5,
    producedBy: "barracks",
    weapon: { damage: 6, range: 90, cooldown: 0.7, cat: "light", visual: "bullet", targetsAir: true }
    // 步枪可对空
  },
  farmer: {
    id: "farmer",
    name: "\u519C\u592B",
    aiPriority: 52,
    aiRole: "economy",
    armor: "light",
    pop: 0.5,
    desc: "\u7530\u95F4\u52B3\u4F5C\u8005\uFF1A\u6536\u5272\u6210\u719F\u9EA6\u7530\u625B\u56DE\u4ED3\u5E93\u5165\u5E93\uFF0C\u518D\u56DE\u5934\u8865\u79CD\u3002\u624B\u65E0\u5BF8\u94C1\uFF0C\u8BB0\u5F97\u6D3E\u5175\u4FDD\u62A4",
    hp: 50,
    speed: 70,
    radius: 7,
    vision: 5,
    cost: { food: 20, wood: 10 },
    buildTime: 4,
    producedBy: "hq"
  },
  mcv: {
    id: "mcv",
    name: "\u57FA\u5730\u8F66",
    aiPriority: 90,
    aiRole: "support",
    armor: "heavy",
    pop: 2,
    desc: '\u79FB\u52A8\u6307\u6325\u90E8\uFF1A\u9009\u4E2D\u540E\u70B9"\u5C55\u5F00\u57FA\u5730"\u53D8\u8EAB\u6307\u6325\u57FA\u5730\uFF08\u53EF\u5148\u4FA6\u5BDF\u518D\u843D\u811A\uFF09\u3002\u8840\u539A\u8F66\u6C89\uFF0C\u4E22\u4E86\u5B83\u4E14\u6CA1\u6709\u57FA\u5730=\u6218\u8D25',
    hp: 400,
    armorPool: 500,
    speed: 45,
    radius: 14,
    vision: 7,
    cost: { wood: 200, ore: 200 },
    buildTime: 30,
    producedBy: "hq"
  },
  tank: {
    id: "tank",
    name: "\u4E3B\u6218\u5766\u514B",
    aiPriority: 72,
    aiRole: "combat",
    armor: "heavy",
    desc: "\u88C5\u7532\u4E3B\u529B\uFF1A\u8840\u539A\u70AE\u731B\uFF0C\u4E3B\u70AE\u4E4B\u5916\u8FD8\u6709\u5DE6\u53F3\u8237\u4FA7\u673A\u67AA\uFF08\u5C04\u6B65\u5175\u5F39\uFF0C\u72EC\u7ACB\u5F00\u706B\uFF09\uFF0C\u9020\u4EF7\u504F\u9AD8",
    hp: 140,
    armorPool: 300,
    speed: 60,
    radius: 11,
    vision: 7,
    cost: { ore: 70, food: 15 },
    buildTime: 10,
    producedBy: "factory",
    weapon: { damage: 22, range: 130, cooldown: 1.4, cat: "heavy", pierce: true, visual: "shell", speed: 380 },
    mg: { damage: 6, range: 75, cooldown: 0.9, cat: "light", visual: "bullet", spread: 4 }
  },
  artillery: {
    id: "artillery",
    name: "\u81EA\u884C\u706B\u70AE",
    aiPriority: 66,
    aiRole: "combat",
    armor: "light",
    stopToFire: true,
    desc: "\u8D85\u8FDC\u7A0B\u69B4\u5F39\u70AE\uFF1A\u8303\u56F4\u6E85\u5C04\u62C6\u5BB6\u5229\u5668\uFF0C\u505C\u8F66\u67B6\u70AE\u5F00\u706B\uFF08\u552F\u4E00\u4E0D\u80FD\u8FB9\u8D70\u8FB9\u6253\uFF09\uFF0C\u76AE\u8106\u4E14\u88AB\u8D34\u8138\u65E0\u6CD5\u8FD8\u51FB\uFF0C\u9700\u8981\u62A4\u536B",
    hp: 90,
    armorPool: 80,
    speed: 40,
    radius: 10,
    vision: 9,
    cost: { ore: 90, wood: 40 },
    buildTime: 14,
    producedBy: "factory",
    weapon: { damage: 40, range: 215, minRange: 60, cooldown: 3.2, cat: "heavy", visual: "cannon", speed: 260, impactFire: true, splash: 28 }
  },
  barbarian: {
    id: "barbarian",
    name: "\u86EE\u65CF\u63A0\u88AD\u8005",
    desc: "\u4E2D\u7ACB\u86EE\u65CF\u7684\u52AB\u63A0\u5175\uFF1A\u89C1\u6751\u5C31\u62A2\u89C1\u4EBA\u5C31\u780D\uFF0C\u527F\u706D\u6709\u5C11\u91CF\u7F34\u83B7",
    hp: 75,
    armorPool: 15,
    speed: 65,
    radius: 8,
    vision: 6,
    cost: {},
    buildTime: 0,
    producedBy: "",
    aiPriority: 0,
    aiRole: "combat",
    weapon: { damage: 8, range: 90, cooldown: 0.8, cat: "light", visual: "bullet" }
  },
  helicopter: {
    id: "helicopter",
    name: "\u6B66\u88C5\u76F4\u5347\u673A",
    desc: "\u7A7A\u4E2D\u901F\u5C04\u5E73\u53F0\uFF1A\u65E0\u89C6\u5730\u5F62\u5168\u56FE\u673A\u52A8\uFF0C\u514B\u5236\u5730\u9762\u88C5\u7532\u4E0E\u7ECF\u6D4E\uFF0C\u4F46\u6015\u6B65\u67AA\u548C\u54E8\u6212\u70AE",
    hp: 120,
    armorPool: 60,
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
    weapon: { damage: 7, range: 120, cooldown: 0.3, cat: "light", visual: "bullet", targetsAir: true, spread: 5 }
  },
  flamethrower: {
    id: "flamethrower",
    name: "\u55B7\u706B\u5175",
    desc: "\u8FD1\u8DDD\u79BB\u7EB5\u706B\u4E13\u5BB6\uFF1A\u706B\u7130\u70B9\u71C3\u76EE\u6807\u6301\u7EED\u707C\u70E7\uFF08\u6BCF\u79D2\u707C\u70E7\uFF09\uFF0C\u514B\u6B65\u5175\u4E0E\u5EFA\u7B51\uFF0C\u88AB\u8FDC\u7A0B\u653E\u98CE\u7B5D\u662F\u6B7B\u6CD5",
    hp: 70,
    armorPool: 20,
    speed: 60,
    radius: 8,
    vision: 5,
    cost: { food: 60, ore: 20 },
    buildTime: 6,
    producedBy: "barracks",
    aiPriority: 58,
    aiRole: "combat",
    armor: "light",
    weapon: { damage: 12, range: 70, cooldown: 0.5, cat: "light", visual: "flame", speed: 300, status: { kind: "burn", dur: 4, potency: 6 }, spread: 8 }
  },
  mech: {
    id: "mech",
    name: "\u6B65\u6218\u673A\u7532",
    desc: "\u56DB\u8DB3\u7A0B\u5E8F\u5316\u673A\u7532\uFF1A\u751F\u6001\u4F4D\u9876\u5CF0\u2014\u2014\u539A\u7532\u91CD\u70AE\uFF0C\u8DE8\u8D8A\u9AD8\u5730\u5982\u5C65\u5E73\u5730\uFF08\u89C6\u89C9\uFF09\uFF0C\u9020\u4EF7\u6602\u8D35",
    hp: 240,
    armorPool: 500,
    speed: 45,
    radius: 18,
    vision: 8,
    cost: { ore: 220, food: 80 },
    buildTime: 22,
    producedBy: "factory",
    aiPriority: 75,
    aiRole: "combat",
    armor: "heavy",
    weapon: { damage: 42, range: 150, cooldown: 2.2, cat: "heavy", pierce: true, visual: "cannon", speed: 260, splash: 26 }
  },
  bomber: {
    id: "bomber",
    name: "\u8F70\u70B8\u673A",
    desc: "\u98DE\u8D8A\u76EE\u6807\u5934\u9876\u6295\u63B7\u822A\u5F39\uFF08\u8303\u56F4\u6E85\u5C04\uFF09\uFF0C\u65E0\u5BF9\u7A7A\u80FD\u529B\uFF0C\u9632\u7A7A\u706B\u529B\u662F\u5B83\u7684\u5929\u654C",
    hp: 100,
    armorPool: 80,
    speed: 110,
    radius: 11,
    vision: 8,
    cost: { ore: 150, food: 100 },
    buildTime: 14,
    producedBy: "factory",
    aiPriority: 64,
    aiRole: "combat",
    armor: "light",
    moveClass: "air",
    bomber: true,
    weapon: { damage: 40, range: 40, cooldown: 4, cat: "heavy", visual: "cannon", speed: 260, splash: 34 }
  },
  missileShip: {
    id: "missileShip",
    name: "\u5BFC\u5F39\u8230",
    desc: "\u8FDC\u7A0B\u6C34\u9762\u5BFC\u5F39\u5E73\u53F0\uFF1A\u5C04\u7A0B220\u538B\u5236\u6CBF\u5CB8\uFF0C\u76AE\u8584\u6015\u8FD1\u8EAB",
    hp: 220,
    armorPool: 40,
    speed: 65,
    radius: 12,
    vision: 8,
    cost: { wood: 120, ore: 180 },
    buildTime: 20,
    producedBy: "shipyard",
    aiPriority: 62,
    aiRole: "combat",
    armor: "light",
    moveClass: "naval",
    weapon: { damage: 35, range: 220, cooldown: 2.5, cat: "heavy", visual: "missile", speed: 240, splash: 40 }
  },
  battleship: {
    id: "battleship",
    name: "\u6218\u5217\u8230",
    desc: "\u6D77\u4E0A\u7684\u79FB\u52A8\u8981\u585E\uFF1A\u91CD\u7532\u91CD\u70AE\uFF08\u5C04\u7A0B200\uFF09\uFF0C\u9020\u4EF7\u6602\u8D35\uFF0C\u8230\u961F\u6838\u5FC3",
    hp: 600,
    armorPool: 500,
    speed: 50,
    radius: 16,
    vision: 9,
    cost: { wood: 250, ore: 300 },
    buildTime: 30,
    producedBy: "shipyard",
    aiPriority: 70,
    aiRole: "combat",
    armor: "heavy",
    moveClass: "naval",
    weapon: { damage: 50, range: 200, cooldown: 3, cat: "heavy", visual: "shell", speed: 380 }
  },
  caravan: {
    id: "caravan",
    name: "\u5546\u961F",
    aiPriority: 0,
    aiRole: "economy",
    armor: "light",
    desc: "\u79FB\u52A8\u94B1\u5305\uFF1A\u81EA\u52A8\u5F80\u8FD4\u86EE\u65CF\u8425\u5730\u8D38\u6613\uFF08\u901A\u5546=\u505C\u6218\uFF09\u3002\u65E0\u6B66\u88C5\uFF0C\u9047\u88AD\u5FC5\u6B7B\u2014\u2014\u62A4\u597D\u5B83",
    hp: 70,
    armorPool: 10,
    speed: 40,
    radius: 9,
    vision: 5,
    cost: { food: 30 },
    buildTime: 0,
    producedBy: "tradePost"
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
    hp: 60,
    armorPool: 10,
    speed: 70,
    radius: 8,
    vision: 6,
    cost: {},
    buildTime: 0,
    producedBy: "",
    aiRole: "combat",
    wild: "territorial",
    weapon: { damage: 10, range: 90, cooldown: 1, cat: "light", visual: "bullet" },
    bounty: { food: 25 }
  },
  gunboat: {
    id: "gunboat",
    name: "\u70AE\u8247",
    desc: "\u8FD1\u6D77\u9738\u4E3B\uFF1A\u6C34\u9762\u673A\u52A8\u91CD\u70AE\u5E73\u53F0\uFF0C\u8F70\u51FB\u6CBF\u5CB8\u76EE\u6807\uFF0C\u4E0A\u5CB8\u7684\u5730\u9762\u90E8\u961F\u662F\u5B83\u7684\u76D8\u4E2D\u9910",
    hp: 170,
    armorPool: 30,
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
    weapon: { damage: 20, range: 140, cooldown: 1.2, cat: "heavy", visual: "shell", speed: 380, spread: 6 }
  }
};

// src/data/buildings.ts
var BUILDING_DEFS = {
  hq: {
    id: "hq",
    name: "\u6307\u6325\u57FA\u5730",
    aiRole: "support",
    armor: "heavy",
    desc: "\u5927\u672C\u8425\uFF1A\u751F\u4EA7\u5DE5\u7A0B\u8F66\u4E0E\u519C\u592B\u3001\u4FDD\u5E95\u4EA7\u51FA\u3001+10\u4EBA\u53E3\u3002\u81EA\u5E26\u9632\u536B\u706B\u70AE\uFF08\u5BF9\u7A7A\u5BF9\u5730\u6E85\u5C04\uFF09\u4E0E\u8237\u4FA7\u673A\u67AA\uFF08\u5BF9\u7A7A\u5BF9\u5730\uFF09\uFF0C\u72EC\u7ACB\u5F00\u706B\u3002\u88AB\u6467\u6BC1\u5373\u6218\u8D25",
    hp: 800,
    armorPool: 1500,
    size: 3,
    vision: 9,
    cost: {},
    buildTime: 0,
    unique: true,
    popBonus: 10,
    isDepot: true,
    income: { wood: 0.2, food: 0.2, ore: 0.2 },
    produces: ["builder", "farmer", "mcv"],
    weapon: { damage: 35, range: 190, cooldown: 3.2, cat: "heavy", visual: "cannon", speed: 260, impactFire: true, splash: 26, targetsAir: true },
    mg: { damage: 6, range: 90, cooldown: 0.8, cat: "light", visual: "bullet", targetsAir: true }
  },
  farm: {
    id: "farm",
    name: "\u8865\u7ED9\u519C\u573A",
    aiPriority: 50,
    aiRole: "economy",
    desc: "\u7A33\u5B9A\u98DF\u7269\u6765\u6E90\uFF080.45/\u79D2\uFF09\uFF0C+10\u4EBA\u53E3\u4E0A\u9650\uFF0C\u6C38\u4E0D\u67AF\u7AED",
    hp: 160,
    armorPool: 210,
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
    hp: 160,
    armorPool: 210,
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
    hp: 180,
    armorPool: 240,
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
    hp: 180,
    armorPool: 240,
    size: 2,
    vision: 4,
    cost: { wood: 50 },
    buildTime: 8,
    capBonus: 500,
    isDepot: true
  },
  lab: {
    id: "lab",
    name: "\u7814\u7A76\u6240",
    aiPriority: 58,
    aiRole: "support",
    desc: "\u89E3\u9501\u79D1\u6280\u7814\u7A76\uFF1A\u9009\u4E2D\u540E\u7ACB\u9879\uFF0C\u5168\u5C40\u540C\u4E00\u65F6\u95F4\u4EC5\u4E00\u9879\uFF1B\u7814\u7A76\u6240\u635F\u6BC1\u5219\u8FDB\u5EA6\u51BB\u7ED3",
    hp: 270,
    armorPool: 360,
    size: 2,
    vision: 5,
    cost: { wood: 120, ore: 80 },
    buildTime: 20
  },
  barracks: {
    id: "barracks",
    name: "\u6B65\u5175\u8425",
    aiPriority: 65,
    aiRole: "combat",
    desc: "\u8BAD\u7EC3\u52A8\u5458\u6B65\u5175\uFF0C\u901A\u5411\u88C5\u7532\u529B\u91CF\u7684\u7B2C\u4E00\u6B65",
    hp: 300,
    armorPool: 400,
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
    hp: 420,
    armorPool: 560,
    size: 3,
    vision: 5,
    cost: { wood: 140, ore: 60 },
    buildTime: 18,
    produces: ["tank", "artillery", "helicopter", "bomber", "mech"]
  },
  turret: {
    id: "turret",
    name: "\u54E8\u6212\u70AE",
    aiPriority: 45,
    aiRole: "defense",
    armor: "heavy",
    desc: "\u81EA\u52A8\u9632\u5FA1\u5854\uFF1A\u5C04\u7A0B140\u53EF\u5BF9\u7A7A\uFF0C\u8E72\u5BB6\u9632\u9A9A\u6270\u7684\u4E0D\u4E8C\u4E4B\u9009",
    hp: 260,
    armorPool: 500,
    size: 1,
    vision: 7,
    cost: { wood: 20, ore: 60 },
    buildTime: 8,
    weapon: { damage: 16, range: 140, cooldown: 0.9, cat: "light", visual: "bullet", targetsAir: true }
  },
  camp: {
    id: "camp",
    name: "\u86EE\u65CF\u8425\u5730",
    desc: "\u86EE\u65CF\u7684\u5DE2\u7A74\uFF1A\u5B9A\u671F\u6D3E\u51FA\u63A0\u88AD\u8005\u52AB\u63A0\u9644\u8FD1\u52BF\u529B\u3002\u527F\u706D\u53EF\u83B7\u5F97\u4E30\u539A\u7F34\u83B7",
    hp: 360,
    armorPool: 480,
    size: 2,
    vision: 6,
    cost: {},
    buildTime: 0,
    aiRole: "combat",
    bounty: { wood: 250, ore: 150 }
  },
  aaTurret: {
    id: "aaTurret",
    name: "\u9632\u7A7A\u5BFC\u5F39\u5854",
    desc: "\u4E13\u804C\u5BF9\u7A7A\uFF1A\u5BFC\u5F39\u53EA\u6253\u7A7A\u4E2D\u76EE\u6807\uFF08\u8303\u56F4\u6E85\u5C04\uFF09\uFF0C\u5C04\u7A0B160\uFF0C\u5929\u7A7A\u7684\u7EC8\u7ED3\u8005",
    hp: 260,
    armorPool: 500,
    size: 1,
    vision: 8,
    cost: { wood: 60, ore: 120 },
    buildTime: 10,
    weapon: { damage: 30, range: 160, cooldown: 1.5, cat: "heavy", visual: "missile", speed: 240, splash: 24, targetsAir: true, airOnly: true },
    aiPriority: 48,
    aiRole: "defense",
    armor: "heavy"
  },
  artTurret: {
    id: "artTurret",
    name: "\u706B\u70AE\u5854",
    desc: "\u8FDC\u7A0B\u5BF9\u5730\u70AE\u5854\uFF1A\u5C04\u7A0B200\u538B\u8FEB\u63A8\u8FDB\uFF0C\u6700\u5C0F\u5C04\u7A0B70\uFF08\u8D34\u8138\u76F2\u533A\uFF09\uFF0C\u9700\u8981\u8FD1\u9632\u63A9\u62A4",
    hp: 320,
    armorPool: 640,
    size: 2,
    vision: 8,
    cost: { wood: 80, ore: 120 },
    buildTime: 14,
    weapon: { damage: 42, range: 200, minRange: 70, cooldown: 3, cat: "heavy", visual: "cannon", speed: 260, splash: 26 },
    aiPriority: 42,
    aiRole: "defense",
    armor: "heavy"
  },
  tradePost: {
    id: "tradePost",
    name: "\u5546\u8D38\u7AD9",
    aiPriority: 58,
    aiRole: "economy",
    desc: "\u91D1\u5E01\u7684\u53D1\u52A8\u673A\uFF1A\u96C7\u4F63\u5546\u961F\u8DD1\u86EE\u65CF\u8425\u5730\u8D38\u6613\uFF08\u901A\u5546=\u505C\u6218\uFF09\uFF0C\u517C\u8425\u8D44\u6E90\u4E70\u5356\u3002\u6BCF\u5BB6\u4E0A\u96502\u5EA7",
    hp: 210,
    armorPool: 280,
    size: 2,
    vision: 5,
    cost: { wood: 80, food: 40 },
    buildTime: 8,
    limitPerPlayer: 2
  },
  monument: {
    id: "monument",
    name: "\u7EAA\u5143\u7EAA\u5FF5\u7891",
    aiRole: "support",
    armor: "heavy",
    desc: "\u7EC8\u5C40\u5947\u89C2\uFF1A\u843D\u6210\u540E90\u79D2\u52A0\u5195\u5373\u80DC\uFF08\u671F\u95F4\u88AB\u62C6\u5219\u524D\u529F\u5C3D\u5F03\uFF09\u3002\u9700\u94A2\u94C1\u7EAA\u5143\uFF0C\u6BCF\u5BB6\u9650\u4E00\u5EA7",
    hp: 900,
    armorPool: 2e3,
    size: 3,
    vision: 6,
    cost: { wood: 1500, food: 1200, ore: 1e3, gold: 400 },
    buildTime: 180,
    limitPerPlayer: 1
  },
  wall: {
    id: "wall",
    name: "\u57CE\u5899",
    desc: "1\xD71\u9AD8\u8840\u91CF\u5DE5\u4E8B\uFF1A\u963B\u6321\u5730\u9762\u90E8\u961F\u63A8\u8FDB\uFF08\u7A7A\u519B\u65E0\u89C6\uFF09\uFF0C\u53EF\u4E92\u76F8\u8FDE\u63A5\u6210\u9632\u7EBF",
    hp: 350,
    armorPool: 2e3,
    size: 1,
    vision: 2,
    cost: { wood: 20 },
    buildTime: 6,
    aiRole: "defense",
    armor: "heavy"
  },
  shipyard: {
    id: "shipyard",
    name: "\u8239\u5382",
    desc: "\u6D77\u519B\u7684\u6447\u7BEE\uFF1A\u5FC5\u987B\u5EFA\u5728\u6C34\u8FB9\uFF08\u4E34\u6C34\uFF09\uFF0C\u751F\u4EA7\u70AE\u8247\u63A7\u5236\u6C34\u57DF",
    hp: 360,
    armorPool: 480,
    size: 3,
    vision: 5,
    cost: { wood: 150, ore: 50 },
    buildTime: 20,
    produces: ["gunboat", "missileShip", "battleship"],
    needWater: true,
    aiPriority: 60,
    aiRole: "combat",
    armor: "heavy"
  },
  shieldGen: {
    id: "shieldGen",
    name: "\u62A4\u76FE\u53D1\u751F\u5668",
    desc: "\u529B\u573A\u62A4\u7F69\uFF1A\u4E3A\u534A\u5F84180\u5185\u53CB\u519B\u62B5\u6321\u4F24\u5BB3\uFF08\u62A4\u76FE\u6C60300\uFF0C\u8131\u62185\u79D2\u56DE\u514515/\u79D2\uFF09",
    hp: 210,
    armorPool: 280,
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
    armorHp: 0,
    armorMax: 0,
    lastDamagedAt: -1e9,
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
    armorHp: 0,
    armorMax: 0,
    lastDamagedAt: -1e9,
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
  const playerBase = { tx: 6 * (MAP_W / 64), ty: 6 * (MAP_H / 64) };
  const enemyBase = { tx: MAP_W - 9 * (MAP_W / 64), ty: MAP_H - 9 * (MAP_H / 64) };
  const S = MAP_W / 64;
  const M = MAP_W - 1;
  const inBaseZone = (x, y) => {
    const d1 = Math.abs(x - (playerBase.tx + 1)) + Math.abs(y - (playerBase.ty + 1));
    const d2 = Math.abs(x - (enemyBase.tx + 1)) + Math.abs(y - (enemyBase.ty + 1));
    return d1 < 6 * S || d2 < 6 * S;
  };
  if (variant === "random") {
    playerBase.tx = 4 * S + rng.int(0, 4 * S);
    playerBase.ty = 4 * S + rng.int(0, 4 * S);
    enemyBase.tx = MAP_W - 3 - (playerBase.tx + 2);
    enemyBase.ty = MAP_H - 3 - (playerBase.ty + 2);
    const mirror = (x, y) => [MAP_W - 1 - x, MAP_H - 1 - y];
    const set2 = (x, y, t) => {
      const [mx, my] = mirror(x, y);
      if (!inBaseZone(x, y) && x >= 1 && y >= 1 && x < MAP_W - 1 && y < MAP_H - 1) terrain[idx(x, y)] = t;
      if (!inBaseZone(mx, my) && mx >= 1 && my >= 1 && mx < MAP_W - 1 && my < MAP_H - 1) terrain[idx(mx, my)] = t;
    };
    const setH2 = (x, y, hh) => {
      if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return;
      height[idx(x, y)] = hh;
      const [mx, my] = mirror(x, y);
      height[idx(mx, my)] = hh;
    };
    const plateauPairs = (1 + rng.int(0, 1)) * S;
    for (let p = 0; p < plateauPairs; p++) {
      const pw = rng.int(4 * S, 7 * S), ph = rng.int(4 * S, 7 * S);
      const px0 = rng.int(6 * S, 26 * S - pw), py0 = rng.int(8 * S, 40 * S - ph);
      for (let y = py0; y < py0 + ph; y++) for (let x = px0; x < px0 + pw; x++) setH2(x, y, 2);
      const ry = py0 + rng.int(1, Math.max(1, ph - 2));
      set2(px0 + pw, ry, T_RAMP);
      setH2(px0 + pw, ry, 1);
      set2(px0 + pw, ry + 1, T_RAMP);
      setH2(px0 + pw, ry + 1, 1);
    }
    const cw = (4 + rng.int(0, 3)) * S;
    const cx0 = 32 - (cw >> 1), cy0 = 32 - (cw >> 1);
    for (let y = cy0; y < cy0 + cw; y++) for (let x = cx0; x < cx0 + cw; x++) setH2(x, y, 1);
    const cr = cx0 + (cw >> 1);
    set2(cr, cy0 - 1, T_RAMP);
    setH2(cr, cy0 - 1, 0);
    set2(cr + 1, cy0 - 1, T_RAMP);
    setH2(cr + 1, cy0 - 1, 0);
    const lakes2 = rng.int(2 * S, 4 * S);
    for (let i = 0; i < lakes2; i++) {
      let x = rng.int(14, MAP_W - 15), y = rng.int(6, MAP_H - 7);
      const size = rng.int(16 * S, 34 * S);
      for (let s = 0; s < size; s++) {
        const [mx, my] = mirror(x, y);
        if (!inBaseZone(x, y) && !inBaseZone(mx, my) && height[idx(x, y)] === 0 && height[idx(mx, my)] === 0 && x > 2 && y > 2 && x < MAP_W - 3 && y < MAP_H - 3) {
          terrain[idx(x, y)] = T_WATER;
          terrain[idx(mx, my)] = T_WATER;
        }
        x += rng.int(-1, 1);
        y += rng.int(-1, 1);
        x = Math.max(3, Math.min(MAP_W - 4, x));
        y = Math.max(3, Math.min(MAP_H - 4, y));
      }
    }
    for (const base of [playerBase, enemyBase]) {
      let x = base.tx + 1 + (rng.next() < 0.5 ? 1 : -1) * rng.int(5 * S, 8 * S);
      let y = base.ty + 1 + (rng.next() < 0.5 ? 1 : -1) * rng.int(2 * S, 5 * S);
      x = Math.max(2, Math.min(MAP_W - 3, x));
      y = Math.max(2, Math.min(MAP_H - 3, y));
      for (let s = 0, size = rng.int(10 * S, 20 * S); s < size; s++) {
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
    const wildForest = rng.int(4 * S, 7 * S);
    for (let i = 0; i < wildForest; i++) {
      let x = rng.int(4, MAP_W - 5), y = rng.int(4, MAP_H - 5);
      for (let s = 0, size = rng.int(10 * S, 20 * S); s < size; s++) {
        const [mx, my] = mirror(x, y);
        if (!inBaseZone(x, y) && terrain[idx(x, y)] === T_GRASS) {
          terrain[idx(x, y)] = T_TREE;
          treeWood[idx(x, y)] = 60;
        }
        if (!inBaseZone(mx, my) && terrain[idx(mx, my)] === T_GRASS) {
          terrain[idx(mx, my)] = T_TREE;
          treeWood[idx(mx, my)] = 60;
        }
        x += rng.int(-1, 1);
        y += rng.int(-1, 1);
        x = Math.max(2, Math.min(MAP_W - 3, x));
        y = Math.max(2, Math.min(MAP_H - 3, y));
      }
    }
    const orePair = (cx, cy, w2, h2) => {
      for (let dy = 0; dy < h2; dy++) for (let dx = 0; dx < w2; dx++) {
        const [mx, my] = mirror(cx + dx, cy + dy);
        for (const [ox, oy] of [[cx + dx, cy + dy], [mx, my]]) {
          if (ox < 1 || oy < 1 || ox >= MAP_W - 1 || oy >= MAP_H - 1) continue;
          if (terrain[idx(ox, oy)] === T_WATER) continue;
          terrain[idx(ox, oy)] = T_ORE;
          oreLeft[idx(ox, oy)] = 900;
        }
      }
    };
    orePair(playerBase.tx + 5, playerBase.ty + 5, 3, 2);
    orePair(26 * S, 36 * S, 3 * S, 3 * S);
    if (rng.next() < 0.7) orePair(35 * S, 25 * S, 3 * S, 3 * S);
    for (const base of [playerBase, enemyBase]) {
      for (let dy = -1; dy <= 3; dy++) for (let dx = -1; dx <= 3; dx++) {
        const i = idx(base.tx + dx, base.ty + dy);
        terrain[i] = T_GRASS;
        treeWood[i] = 0;
        oreLeft[i] = 0;
        height[i] = 0;
      }
    }
    if (!connected(height, terrain, playerBase.tx + 1, playerBase.ty + 1, enemyBase.tx + 1, enemyBase.ty + 1)) {
      const steps = 200;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = Math.round(playerBase.tx + 1 + (enemyBase.tx + 1 - playerBase.tx - 1) * t);
        const cy = Math.round(playerBase.ty + 1 + (enemyBase.ty + 1 - playerBase.ty - 1) * t);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) {
            terrain[idx(x, y)] = T_GRASS;
            height[idx(x, y)] = 0;
          }
        }
      }
    }
    if (!connected(height, terrain, playerBase.tx + 1, playerBase.ty + 1, enemyBase.tx + 1, enemyBase.ty + 1)) {
      for (let i = 0; i < terrain.length; i++) if (terrain[i] === T_WATER) terrain[i] = T_GRASS;
    }
    return { terrain, height, treeWood, oreLeft, playerBase, enemyBase };
  }
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
  plateau(8 * S, 24 * S, 15 * S, 31 * S, 2);
  ramp(16 * S, 26 * S, 1);
  ramp(16 * S, 27 * S, 1);
  terrain[idx(10 * S, 32 * S)] = T_RAMP;
  height[idx(10 * S, 32 * S)] = 1;
  terrain[idx(11 * S, 32 * S)] = T_RAMP;
  height[idx(11 * S, 32 * S)] = 1;
  plateau(M - 15 * S, M - 31 * S, M - 8 * S, M - 24 * S, 2);
  ramp(M - 16 * S, M - 27 * S, 1);
  ramp(M - 16 * S, M - 26 * S, 1);
  terrain[idx(M - 10 * S, M - 32 * S)] = T_RAMP;
  height[idx(M - 10 * S, M - 32 * S)] = 1;
  terrain[idx(M - 11 * S, M - 32 * S)] = T_RAMP;
  height[idx(M - 11 * S, M - 32 * S)] = 1;
  plateau(29 * S, 29 * S, 34 * S, 34 * S, 1);
  ramp(31 * S, 28 * S, 0);
  ramp(32 * S, 28 * S, 0);
  ramp(31 * S, 35 * S, 0);
  ramp(32 * S, 35 * S, 0);
  if (variant === "islands") {
    const bands = [[12 * S, 20 * S], [44 * S, 52 * S]];
    for (const [y0, y1] of bands) {
      for (let x = 0; x < MAP_W; x++) {
        const jag = x * 7 % (4 * S);
        const wy0 = y0 + jag, wy1 = y1 - x * 5 % (3 * S);
        for (let y = wy0; y <= wy1; y++) {
          if (y < 1 || y >= MAP_H - 1) continue;
          terrain[idx(x, y)] = T_WATER;
        }
      }
    }
    for (const [y0, y1] of bands) {
      for (let y = y0; y <= y1; y++) {
        for (const fx of [10 * S, 11 * S, M - 11 * S, M - 10 * S]) {
          terrain[idx(fx, y)] = T_FORD;
        }
      }
    }
  }
  const lakes = 4 * S;
  for (let i = 0; i < lakes; i++) {
    let x = rng.int(10 * S, MAP_W - 11 * S), y = rng.int(10 * S, MAP_H - 11 * S);
    if (inBaseZone(x, y) || height[idx(x, y)] > 0) continue;
    const size = rng.int(14 * S, 30 * S);
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
  const clusters = 12 * S;
  for (let i = 0; i < clusters; i++) {
    let x, y;
    if (i < 4) {
      const base = i % 2 === 0 ? playerBase : enemyBase;
      const sign = i % 2 === 0 ? 1 : -1;
      x = base.tx + 1 + sign * rng.int(5 * S, 8 * S);
      y = base.ty + 1 - sign * rng.int(2 * S, 5 * S);
    } else {
      x = rng.int(4 * S, MAP_W - 5 * S);
      y = rng.int(4 * S, MAP_H - 5 * S);
    }
    x = Math.max(2, Math.min(MAP_W - 3, x));
    y = Math.max(2, Math.min(MAP_H - 3, y));
    const size = rng.int(10 * S, 22 * S);
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
  placeOre(playerBase.tx + 5 * S, playerBase.ty + 5 * S, 3 * S, 2 * S);
  placeOre(enemyBase.tx - 4 * S, enemyBase.ty - 4 * S, 3 * S, 2 * S);
  const mid = MAP_W / 2 | 0;
  placeOre(mid - 6 * S, mid + 4 * S, 3 * S, 3 * S);
  placeOre(mid + 3 * S, mid - 7 * S, 3 * S, 3 * S);
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
  const S = MAP_W / 64;
  spawnCamp(w, 44 * S, 18 * S);
  spawnCamp(w, 18 * S, 44 * S);
  spawnHerd(w, 12 * S, 40 * S, "deer", 3);
  spawnHerd(w, 50 * S, 22 * S, "deer", 3);
  spawnHerd(w, 32 * S, 6 * S, "deer", 3);
  spawnHerd(w, 32 * S, 58 * S, "deer", 3);
  spawnHerd(w, 50 * S, 50 * S, "deer", 3);
  spawnHerd(w, 42 * S, 16 * S, "wolf", 2);
  spawnHerd(w, 20 * S, 46 * S, "wolf", 2);
  spawnHerd(w, 36 * S, 36 * S, "wolf", 2);
  spawnHerd(w, 14 * S, 14 * S, "wolf", 2);
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
        if ((e.nTruceUntil ?? 0) > w.time) {
          e.nRaidT = 10;
          continue;
        }
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
var STORE_KEY = "sm_battle_log_v1";
var STORE_MAX = 600;
var FLUSH_MS = 5e3;
var SimLog = class {
  entries = [];
  max;
  persistent;
  // 无头自测为false：不读写存储，断言不被历史数据污染
  dirty = false;
  lastFlush = 0;
  constructor(max = 5e3, persistent = false) {
    this.max = max;
    this.persistent = persistent;
    if (persistent) {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) this.entries = JSON.parse(raw);
      } catch {
        this.entries = [];
      }
    }
  }
  /** 由 World.addLog 调用 */
  _push(entry, max) {
    if (entry.wall == null) entry.wall = Date.now();
    this.entries.push(entry);
    if (this.entries.length > max) this.entries.splice(0, this.entries.length - max);
    this.dirty = true;
  }
  /** 载入历史日志（页面加载时调用；菜单查旧账用，不产生写入） */
  restore() {
    if (!this.persistent) return;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) this.entries = JSON.parse(raw);
    } catch {
      this.entries = [];
    }
  }
  /** 开局写入对局头分隔线（真正开始游戏时调用；persistent=false 时跳过） */
  beginSession(header) {
    if (!this.persistent) return;
    this._push({ t: 0, tick: 0, cat: "system", msg: header }, this.max);
    this.maybeFlush(true);
  }
  /** 节流落盘；force=立刻写（关页/切后台/游戏结束时兜底） */
  maybeFlush(force = false) {
    if (!this.persistent || !this.dirty) return;
    const now = performance.now();
    if (!force && now - this.lastFlush < FLUSH_MS) return;
    this.lastFlush = now;
    this.dirty = false;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.entries.slice(-STORE_MAX)));
    } catch {
    }
  }
  /** 导出全部条目为可读文本，触发浏览器下载（文件在"下载"目录随时可查） */
  exportFile() {
    const head = `\u94A2\u94C1\u4E0E\u9B54\u6CD5 \u4F5C\u6218\u65E5\u5FD7 \xB7 \u5171${this.entries.length}\u6761 \xB7 \u5BFC\u51FA\u4E8E ${(/* @__PURE__ */ new Date()).toLocaleString()}
${"=".repeat(46)}
`;
    const body = this.entries.map(
      (e) => `[${new Date(e.wall ?? 0).toLocaleTimeString()}][t+${e.t.toFixed(0)}s][${e.cat}]${e.owner != null ? `(P${e.owner})` : ""} ${e.msg}`
    ).join("\n");
    const blob = new Blob([head + body + "\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SteelMagic-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[T:]/g, "-")}.log`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  /** 清空内存与持久化历史 */
  clearPersisted() {
    this.entries = [];
    this.dirty = false;
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
    }
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

// src/data/policies.ts
var EDICT_MULT = {
  military: { damage: 1.1 },
  economy: { gather: 1.1 },
  engineering: { build: 1.25 },
  logistics: {}
};
var LOGISTICS_STORAGE = 300;
var LOGISTICS_POP = 10;
var TECHS = {
  sawBlades: { id: "sawBlades", name: "\u7CBE\u5BC6\u5207\u524A", cat: "industry", desc: "\u8D44\u6E90\u4EA7\u51FA+15%", cost: { wood: 100, food: 60, ore: 60 }, time: 45 },
  deepStorage: { id: "deepStorage", name: "\u6DF1\u5C42\u4ED3\u50A8", cat: "industry", desc: "\u5B58\u50A8\u4E0A\u9650+400", cost: { wood: 80, ore: 60 }, time: 35 },
  assembly: { id: "assembly", name: "\u6D41\u6C34\u4F5C\u4E1A", cat: "industry", desc: "\u5EFA\u9020/\u4FEE\u7406+20%", cost: { wood: 120, ore: 60 }, time: 40 },
  shells: { id: "shells", name: "\u71C3\u538B\u88C5\u836F", cat: "military", desc: "\u5168\u519B\u4F24\u5BB3+10%", cost: { ore: 120, food: 40 }, time: 50 },
  composite: { id: "composite", name: "\u590D\u5408\u88C5\u7532", cat: "military", desc: "\u5168\u519B\u53D7\u4F24-9%", cost: { ore: 100, wood: 60 }, time: 50 },
  fireControl: { id: "fireControl", name: "\u706B\u63A7\u6821\u51C6", cat: "military", desc: "\u5168\u519B\u5C04\u7A0B+8%", cost: { ore: 90, food: 80 }, time: 45 }
};
var TECH_MULT = {
  sawBlades: { gather: 1.15 },
  assembly: { build: 1.2 },
  shells: { damage: 1.1 },
  fireControl: { range: 1.08 }
};
var COMPOSITE_MITIGATION = 0.91;
var DEEP_STORAGE_BONUS = 400;

// src/data/eras.ts
var ERAS = {
  industrial: {
    id: "industrial",
    name: "\u5DE5\u4E1A\u7EAA\u5143",
    level: 1,
    desc: "\u8D44\u6E90\u4EA7\u51FA+5%\u3001\u5EFA\u9020/\u4FEE\u7406+10%\uFF1B\u83B7\u5F97\u5947\u89C2\u5EFA\u9020\u8D44\u683C",
    cost: { wood: 400, food: 300, gold: 100 },
    time: 40
  },
  steel: {
    id: "steel",
    name: "\u94A2\u94C1\u7EAA\u5143",
    level: 2,
    desc: "\u8D44\u6E90\u4EA7\u51FA+5%\u3001\u5168\u519B\u4F24\u5BB3+5%\uFF1B\u89E3\u9501\u7EAA\u5143\u7EAA\u5FF5\u7891",
    cost: { wood: 800, food: 600, ore: 400, gold: 300 },
    time: 60,
    prereq: "industrial"
  }
};
var ERA_MULT = {
  1: { gather: 1.05, build: 1.1 },
  2: { gather: 1.05, damage: 1.05 }
};

// src/sim/research.ts
function hasLab(w, owner) {
  for (const e of w.entities.values()) {
    if (e.kind === "building" && e.defId === "lab" && e.done && e.owner === owner) return true;
  }
  return false;
}
function eraDefOf(id) {
  return ERAS[id];
}
function startResearch(w, owner, id) {
  const p = w.players[owner];
  if (p.research || !hasLab(w, owner)) return false;
  const era = eraDefOf(id);
  let cost, time, name;
  if (era) {
    if (p.era >= era.level) return false;
    if (era.prereq && ERAS[era.prereq].level > p.era) return false;
    cost = era.cost;
    time = era.time;
    name = era.name;
  } else {
    const tech = TECHS[id];
    if (!tech || p.techs.includes(id)) return false;
    cost = tech.cost;
    time = tech.time;
    name = tech.name;
  }
  if (!w.canAfford(owner, cost)) return false;
  w.payCost(owner, cost);
  p.research = { id, remaining: time };
  w.addLog("system", `\u5F00\u59CB\u7814\u7A76\uFF1A${name}`, owner);
  return true;
}
function completeResearch(w, owner) {
  const p = w.players[owner];
  if (!p.research) return;
  const id = p.research.id;
  p.research = null;
  const era = eraDefOf(id);
  if (era) {
    p.era = era.level;
    w.addLog("system", `\u7EAA\u5143\u664B\u5347\uFF1A${era.name}\uFF01${era.desc}`, owner);
  } else {
    const t = id;
    if (!p.techs.includes(t)) p.techs.push(t);
    w.addLog("system", `\u7814\u7A76\u5B8C\u6210\uFF1A${TECHS[t].name}\uFF08${TECHS[t].desc}\uFF09`, owner);
  }
}
function boostResearch(w, owner) {
  const p = w.players[owner];
  if (!p.research || p.researchBoosted) return false;
  const cost = Math.max(1, Math.ceil(p.research.remaining / 2));
  if (p.gold < cost) return false;
  p.gold -= cost;
  p.research.remaining -= cost * 2;
  p.researchBoosted = true;
  return true;
}

// src/sim/gold.ts
function addGold(w, owner, v) {
  if (owner > 1) return;
  w.players[owner].gold += v;
}
function marketSell(w, owner, res) {
  const p = w.players[owner];
  if (p.res[res] < 100) return false;
  p.res[res] -= 100;
  p.gold += 40;
  return true;
}
function marketBuy(w, owner, res) {
  const p = w.players[owner];
  if (p.gold < 70) return false;
  if (p.storageCap - p.res[res] < 100) return false;
  p.gold -= 70;
  w.addRes(owner, res, 100);
  return true;
}
function hireCaravan(w, postId) {
  const post = w.entities.get(postId);
  if (!post || post.kind !== "building" || post.defId !== "tradePost" || !post.done || post.owner > 1) return false;
  const owner = post.owner;
  const count = [...w.entities.values()].filter((e) => e.defId === "caravan" && (e.homePostId ?? -1) === postId).length;
  if (count >= CARAVAN_CAP_PER_POST) return false;
  if (!w.canAfford(owner, { food: 30 })) return false;
  w.payCost(owner, { food: 30 });
  const spawnX = post.x, spawnY = post.y + post.radius() + TILE;
  const c = w.spawnUnit("caravan", owner, spawnX, spawnY);
  if (!w.walkableAtWorld(c.x, c.y)) {
    const g = nearestWalkable(w.walkable, Math.floor(spawnX / TILE), Math.floor(spawnY / TILE));
    c.x = (g.x + 0.5) * TILE;
    c.y = (g.y + 0.5) * TILE;
  }
  c.homePostId = postId;
  w.addLog("econ", "\u96C7\u4F63\u5546\u961F\uFF1A\u8E0F\u4E0A\u5546\u8DEF", owner);
  return true;
}

// src/sim/coronation.ts
function startCoronation(w, owner, monumentId) {
  if (w.coronation || w.gameOver !== 0) return;
  w.coronation = { owner, monumentId, endsAt: w.time + CORONATION_TIME };
  w.addLog("system", `\u7EAA\u5143\u7EAA\u5FF5\u7891\u843D\u6210\uFF01${CORONATION_TIME}\u79D2\u540E\u52A0\u5195\u2014\u2014\u5B88\u4F4F\u5B83\uFF01`, owner);
}
function checkCoronation(w) {
  const c = w.coronation;
  if (!c || w.gameOver !== 0) return;
  if (w.time >= c.endsAt) {
    w.gameOver = c.owner === OWNER_PLAYER ? 1 : 2;
    w.lastVictory = "coronation";
    w.addLog("system", c.owner === OWNER_PLAYER ? "\u52A0\u5195\u5B8C\u6210\u2014\u2014\u6587\u660E\u56E0\u4F60\u800C\u6C38\u94F8\uFF01\u73A9\u5BB6\u83B7\u80DC" : "\u654C\u65B9\u5947\u89C2\u52A0\u5195\u5B8C\u6210\uFF0C\u73A9\u5BB6\u6218\u8D25", c.owner);
  }
}

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
  // 麦田层（格子经济：T_FARM地块的状态与归属）
  farmOwner;
  // 0无主 / 1玩家 / 2敌方
  farmStage;
  // 0茬地 / 1~2生长 / 3成熟
  farmPlanted;
  // 播种时刻（-1=未种）
  farmTiles = /* @__PURE__ */ new Set();
  coronation = null;
  lastVictory = "hq";
  // 胜利方式（结算画面标注）
  players;
  projectiles = [];
  fx = [];
  wrecks = [];
  // 战场遗迹（尸体/残骸/废墟），上限40 FIFO
  fireZones = [];
  // 地面燃烧区（爆炸弹产生）
  dirtyTiles = /* @__PURE__ */ new Set();
  // 地形变化（渲染层重绘用）
  log;
  logRepeat = /* @__PURE__ */ new Map();
  // 节流键 -> 上次记录时间
  pathBudget = PATH_BUDGET;
  pendingPaths = [];
  // 等待预算的实体id
  gameOver = 0;
  // 0进行中 / 1玩家胜 / 2玩家败
  seed;
  variant;
  constructor(seed = 20261009, variant = "standard", persistLog = true) {
    this.log = new SimLog(5e3, persistLog);
    this.seed = seed;
    this.variant = variant;
    const map = generateMap(seed, variant);
    this.terrain = map.terrain;
    this.height = map.height;
    this.treeWood = map.treeWood;
    this.oreLeft = map.oreLeft;
    this.occupied = new Uint8Array(MAP_W * MAP_H);
    this.buildingAt = new Int32Array(MAP_W * MAP_H).fill(-1);
    this.walkable = new Uint8Array(MAP_W * MAP_H);
    this.farmOwner = new Uint8Array(MAP_W * MAP_H);
    this.farmStage = new Uint8Array(MAP_W * MAP_H);
    this.farmPlanted = new Float32Array(MAP_W * MAP_H).fill(-1);
    this.fog = [new Uint8Array(MAP_W * MAP_H), new Uint8Array(MAP_W * MAP_H)];
    this.players = [
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false, gold: 0, era: 0, edict: null, edictCd: 0, techs: [], research: null },
      { res: { ...START_RES }, income: { wood: 0, food: 0, ore: 0 }, incomeMul: 1, storageCap: STORAGE_BASE, pop: 0, popCap: POP_BASE, defeat: false, gold: 0, era: 0, edict: null, edictCd: 0, techs: [], research: null }
    ];
    this.refreshWalkableAll();
    this.navalWalkable = new Uint8Array(MAP_W * MAP_H);
    for (let i = 0; i < this.navalWalkable.length; i++) {
      this.navalWalkable[i] = this.terrain[i] === T_WATER ? 1 : 0;
    }
    for (const [owner, base] of [[0, map.playerBase], [1, map.enemyBase]]) {
      const cx = (base.tx + 1.5) * TILE, cy = (base.ty + 1.5) * TILE;
      this.spawnUnit("mcv", owner, cx, cy);
      this.spawnUnit("builder", owner, cx - 50, cy + 60);
      this.spawnUnit("builder", owner, cx + 50, cy + 60);
    }
    spawnNeutrals(this);
  }
  /** 开局写对局头（Game.start时调用）——菜单页/无头模拟不再产生噪音对局头 */
  startSession() {
    this.log.beginSession(`\u2500\u2500\u2500\u2500 \u65B0\u5BF9\u5C40 \xB7 ${this.variant === "islands" ? "\u7FA4\u5C9B\u6D77\u5CE1" : "\u6807\u51C6\u5927\u9646"} \xB7 seed=${this.seed} \xB7 ${(/* @__PURE__ */ new Date()).toLocaleString()} \u2500\u2500\u2500\u2500`);
    this.addLog("system", "\u5BF9\u5C40\u5F00\u59CB\uFF1A\u53CC\u57FA\u5730\u955C\u50CF\u5730\u56FE\uFF0C\u6467\u6BC1\u654C\u65B9\u6307\u6325\u57FA\u5730\u83B7\u80DC\u3002\u5C0F\u5FC3\u86EE\u65CF\u8425\u5730");
  }
  // ================= 法令/科技/地利（运营深度系统） =================
  /** 全局效果乘数：纪元×法令×科技叠乘（owner>1恒为1） */
  mult(owner, kind) {
    if (owner > 1) return 1;
    const p = this.players[owner];
    let m = 1;
    const em = p.edict ? EDICT_MULT[p.edict][kind] : void 0;
    if (em) m *= em;
    for (const t of p.techs) {
      const tm = TECH_MULT[t]?.[kind];
      if (tm) m *= tm;
    }
    for (let era = 1; era <= p.era; era++) {
      const rm = ERA_MULT[era]?.[kind];
      if (rm) m *= rm;
    }
    return m;
  }
  /** 切换法令（冷却中/重复切换返回false） */
  setEdict(owner, id) {
    const p = this.players[owner];
    if (p.edict === id || p.edictCd > 0) return false;
    p.edict = id;
    p.edictCd = 45;
    this.addLog("system", `\u5207\u6362\u6CD5\u4EE4\uFF1A${id}`, owner);
    return true;
  }
  hasLab(owner) {
    return hasLab(this, owner);
  }
  /** 立项研究（全局单线：有研究进行中/已研完/无研究所/付不起 均拒绝）；id可为科技或纪元 */
  startResearch(owner, id) {
    return startResearch(this, owner, id);
  }
  /** 研究完成（construction在remaining<=0时调用）：科技入列 / 纪元晋升 */
  completeResearch(owner) {
    completeResearch(this, owner);
  }
  /** 金币加速科研：1金=2秒，每次研究限一次 */
  boostResearch() {
    return boostResearch(this, 0);
  }
  // ================= 金币与商路 =================
  addGold(owner, v) {
    addGold(this, owner, v);
  }
  marketSell(owner, res) {
    return marketSell(this, owner, res);
  }
  marketBuy(owner, res) {
    return marketBuy(this, owner, res);
  }
  hireCaravan(postId) {
    return hireCaravan(this, postId);
  }
  // ================= 奇观加冕 =================
  startCoronation(owner, monumentId) {
    startCoronation(this, owner, monumentId);
  }
  checkCoronation() {
    checkCoronation(this);
  }
  /** 地利加成（邻接系统）：农场临水/自动机傍仓库/炮台扼坡道。每5秒与建筑完工时重算 */
  recomputeAdjacency() {
    for (const e of this.entities.values()) {
      if (e.kind !== "building" || !e.done || e.owner > 1) continue;
      let bonus = 1, label = "";
      const def = BUILDING_DEFS[e.defId];
      if (e.defId === "farm") {
        let water = 0;
        for (let dy = -1; dy <= def.size; dy++) {
          for (let dx = -1; dx <= def.size; dx++) {
            const edge = dx < 0 || dy < 0 || dx >= def.size || dy >= def.size;
            if (!edge) continue;
            const x = e.tx + dx, y = e.ty + dy;
            if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
            if (this.terrain[y * MAP_W + x] === T_WATER) water++;
          }
        }
        if (water >= 5) {
          bonus = 1.2;
          label = "\u4E34\u6C34\u704C\u6E89 +20%";
        } else if (water >= 2) {
          bonus = 1.1;
          label = "\u4E34\u6C34\u704C\u6E89 +10%";
        }
      } else if (e.defId === "lumber" || e.defId === "mine") {
        for (const o of this.entities.values()) {
          if (o.kind !== "building" || o.defId !== "storehouse" || !o.done || o.owner !== e.owner) continue;
          const d = Math.max(Math.abs(o.tx - e.tx), Math.abs(o.ty - e.ty), Math.abs(o.tx + 1 - e.tx - def.size), Math.abs(o.ty + 1 - e.ty - def.size));
          if (d <= 2) {
            bonus = 1.1;
            label = "\u5C31\u5730\u4E2D\u8F6C +10%";
            break;
          }
        }
      } else if (e.defId === "turret") {
        outer: for (let dy = -3; dy <= def.size + 2; dy++) {
          for (let dx = -3; dx <= def.size + 2; dx++) {
            const x = e.tx + dx, y = e.ty + dy;
            if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
            if (this.terrain[y * MAP_W + x] === T_RAMP) {
              bonus = 1.2;
              label = "\u9501\u627C\u5761\u9053 +20%";
              break outer;
            }
          }
        }
      }
      if (label && e.adjLabel !== label) {
        e.adjLabel = label;
        e.adjBonus = bonus;
        this.addLog("econ", `${def.name}\u83B7\u5F97\u5730\u5229\uFF1A${label}`, e.owner);
      } else if (!label && e.adjLabel) {
        e.adjLabel = void 0;
        e.adjBonus = void 0;
      } else if (label) {
        e.adjBonus = bonus;
      }
    }
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
    e.armorHp = e.armorMax = def.armorPool ?? 0;
    this.entities.set(e.id, e);
    return e;
  }
  spawnBuilding(defId, owner, tx, ty, done) {
    const def = BUILDING_DEFS[defId];
    const e = makeBuilding(this.nextId++, owner, defId, tx, ty, def.hp, def.size, done);
    e.armorHp = e.armorMax = def.armorPool ?? 0;
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
    {
      const isBeast = e.kind === "unit" && UNIT_DEFS[e.defId]?.wild !== void 0;
      const kind = e.kind === "building" ? "rubble" : UNIT_DEFS[e.defId]?.weapon ? "vehicle" : isBeast ? "beast" : "corpse";
      const dur = kind === "rubble" ? 120 : kind === "vehicle" ? 60 : 45;
      this.wrecks.push({
        x: e.x,
        y: e.y,
        kind,
        born: this.time,
        dur,
        size: e.kind === "building" ? BUILDING_DEFS[e.defId].size : 1,
        seed: e.id * 7 + 3
      });
      if (this.wrecks.length > 40) this.wrecks.shift();
    }
    this.addLog("military", `${e.owner === 0 ? "\u6211\u65B9" : "\u654C\u65B9"}${e.kind === "building" ? BUILDING_DEFS[e.defId].name : UNIT_DEFS[e.defId].name}\u88AB\u6467\u6BC1`, e.owner);
    for (const o of this.entities.values()) {
      if (o.engagedId === id) o.engagedId = null;
      if (o.order.targetId === id) o.order = { kind: "idle" };
    }
    if (e.defId === "monument" && this.coronation?.monumentId === id) {
      this.coronation = null;
      this.addLog("system", "\u7EAA\u5143\u7EAA\u5FF5\u7891\u88AB\u6467\u6BC1\uFF0C\u52A0\u5195\u4E2D\u65AD\uFF01\u524D\u529F\u5C3D\u5F03\u2026\u2026", e.owner);
    }
    if (e.defId === "hq") {
      const hasMCV = [...this.entities.values()].some((o) => o.defId === "mcv" && o.owner === e.owner);
      if (hasMCV) {
        this.addLog("system", "\u6307\u6325\u57FA\u5730\u9677\u843D\uFF01\u57FA\u5730\u8F66\u5C1A\u5728\u2014\u2014\u5C55\u5F00\u65B0\u8F66\u961F\uFF0C\u91CD\u6574\u65D7\u9F13", e.owner);
      } else {
        this.players[e.owner].defeat = true;
        if (this.gameOver === 0) {
          this.gameOver = e.owner === OWNER_PLAYER ? 2 : 1;
          this.addLog("system", `\u6307\u6325\u57FA\u5730\u9677\u843D\uFF0C${e.owner === OWNER_PLAYER ? "\u73A9\u5BB6\u6218\u8D25" : "\u73A9\u5BB6\u83B7\u80DC"}`, e.owner);
        }
      }
    }
  }
  // ================= 地形/放置 =================
  refreshWalkableAll() {
    for (let i = 0; i < this.walkable.length; i++) {
      this.walkable[i] = this.terrain[i] === T_GRASS || this.terrain[i] === T_RAMP || this.terrain[i] === T_FORD || this.terrain[i] === T_FARM ? 1 : 0;
    }
  }
  // ================= 麦田链（铺设→种植→生长→收割→入库→回种） =================
  /** 铺设一块麦田（茬地）：仅草地、无建筑、无主。成功返回true（调用方负责扣钱） */
  layFarm(tx, ty, owner) {
    if (tx < 1 || ty < 1 || tx >= MAP_W - 1 || ty >= MAP_H - 1) return false;
    const i = ty * MAP_W + tx;
    if (this.terrain[i] !== T_GRASS || this.occupied[i] || this.farmOwner[i] !== 0) return false;
    this.terrain[i] = T_FARM;
    this.farmOwner[i] = owner;
    this.farmStage[i] = 0;
    this.farmPlanted[i] = -1;
    this.walkable[i] = 1;
    this.farmTiles.add(i);
    this.dirtyTiles.add(i);
    return true;
  }
  /** 收割一块成熟麦田：结算地利加成，返回产量（同时变为茬地） */
  harvestFarm(i, owner) {
    if (this.farmOwner[i] !== owner || this.farmStage[i] !== 3) return 0;
    let water = 0, farms = 0;
    const tx = i % MAP_W, ty = i / MAP_W | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const j = y * MAP_W + x;
        if (this.terrain[j] === T_WATER) water++;
        if (this.terrain[j] === T_FARM) farms++;
      }
    }
    let mul = 1;
    if (water >= 5) mul *= 1.2;
    else if (water >= 2) mul *= 1.1;
    mul *= 1 + Math.min(4, farms) * 0.05;
    const amt = Math.round(FARM_YIELD * mul * this.mult(owner, "gather"));
    this.farmStage[i] = 0;
    this.farmPlanted[i] = -1;
    this.dirtyTiles.add(i);
    return amt;
  }
  /** 回种一块茬地（收割入库后由农夫完成） */
  plantFarm(i, owner) {
    if (this.farmOwner[i] !== owner || this.farmStage[i] !== 0 || this.farmPlanted[i] >= 0) return false;
    this.farmPlanted[i] = this.time;
    this.farmStage[i] = 1;
    this.dirtyTiles.add(i);
    return true;
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
  canPlace(defId, tx, ty, excludeId) {
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
      if (u && u.kind === "unit" && u.id !== excludeId) {
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
    return (cost.wood ?? 0) <= p.res.wood && (cost.food ?? 0) <= p.res.food && (cost.ore ?? 0) <= p.res.ore && (cost.gold ?? 0) <= p.gold;
  }
  payCost(owner, cost) {
    const p = this.players[owner];
    p.res.wood -= cost.wood ?? 0;
    p.res.food -= cost.food ?? 0;
    p.res.ore -= cost.ore ?? 0;
    p.gold -= cost.gold ?? 0;
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
  /** 人口：存活单位（按兵种占用权重）+ 排队中的单位 */
  recomputePop() {
    for (const owner of [0, 1]) {
      let pop = 0, cap = 0;
      for (const e of this.entities.values()) {
        if (e.owner !== owner) continue;
        if (e.kind === "unit") pop += UNIT_DEFS[e.defId].pop ?? 1;
        else if (e.done) {
          const def = BUILDING_DEFS[e.defId];
          cap += def.popBonus ?? 0;
          if (def.produces) pop += e.queue.length;
        }
      }
      const p = this.players[owner];
      p.pop = pop;
      p.popCap = Math.min(POP_MAX, POP_BASE + cap + (p.edict === "logistics" ? LOGISTICS_POP : 0));
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
  /** 基地车展开成指挥基地：以车身为圆心螺旋找合法落点（原地优先），返回新HQ（失败=null） */
  deployMCV(mcvId) {
    const m = this.entities.get(mcvId);
    if (!m || m.kind !== "unit" || m.defId !== "mcv") return null;
    const tx0 = Math.round(m.x / TILE - 1.5), ty0 = Math.round(m.y / TILE - 1.5);
    for (let r = 0; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = tx0 + dx, ty = ty0 + dy;
          if (!this.canPlace("hq", tx, ty, mcvId).ok) continue;
          this.entities.delete(m.id);
          const hq = this.spawnBuilding("hq", m.owner, tx, ty, true);
          this.addLog("build", "\u57FA\u5730\u8F66\u5C55\u5F00\uFF1A\u6307\u6325\u57FA\u5730\u5EFA\u7ACB", m.owner);
          this.addFx(hq.x, hq.y, "hit", 26, 0.5);
          return hq;
        }
      }
    }
    return null;
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
  addFx(x, y, type, size = 10, dur = 0.3, a, text, color) {
    if (this.fx.length > 300) this.fx.shift();
    this.fx.push({ x, y, type, t: 0, dur, size, a, text, color });
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
    weights: { infantry: 2, tank: 0.8, artillery: 0.4, farm: 0.7, turret: 0.3, factory: 0.7, storehouse: 0.6, barracks: 1.6, lab: 0.5, tradePost: 0.6 },
    targetMul: { barracks: 1.5, turret: 0.5, farm: 0.8 },
    waveSizeMul: 0.7,
    attackCdMul: 0.55
  },
  turtler: {
    name: "\u4E4C\u9F9F",
    line: "\u6765\u5427\uFF0C\u649E\u788E\u5728\u57CE\u5899\u4E0A",
    weights: { turret: 2.5, artillery: 1.8, farm: 1.3, infantry: 0.6, lumber: 0.9, barracks: 1.2, lab: 1.3, tradePost: 1.2 },
    targetMul: { turret: 3, factory: 0.8 },
    waveSizeMul: 1.6,
    attackCdMul: 1.5
  },
  eco: {
    name: "\u79CD\u7530",
    line: "\u8010\u5FC3\u662F\u6700\u5927\u7684\u6B66\u5668",
    weights: { lumber: 1.6, mine: 1.6, factory: 1.4, tank: 1.3, farm: 1.2, infantry: 0.5, turret: 0.7, barracks: 0.6, lab: 1.5, tradePost: 1.6 },
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
  lab: 1,
  tradePost: 2,
  monument: 1,
  hq: 1
};
var RESEARCH_QUEUES = {
  balanced: ["sawBlades", "shells", "deepStorage"],
  rusher: ["shells", "fireControl", "sawBlades"],
  turtler: ["assembly", "composite", "fireControl"],
  eco: ["sawBlades", "deepStorage", "assembly"]
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
  let pierceCount = 0;
  for (const u of army) if (UNIT_DEFS[u.defId].weapon?.pierce) pierceCount++;
  let foeHeavyCount = 0;
  for (const u of foeUnits) if ((UNIT_DEFS[u.defId].armor ?? "light") === "heavy") foeHeavyCount++;
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
    gold: p.gold,
    era: p.era,
    myPierceShare: army.length ? pierceCount / army.length : 0,
    foeHeavyShare: foeUnits.length ? foeHeavyCount / foeUnits.length : 0,
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
    if (!inRange) {
      if (e.path) {
        e.buildWait = 0;
        continue;
      }
      e.buildWait = (e.buildWait ?? 0) + dt;
      if (e.buildWait > 8) {
        e.order = { kind: "idle" };
        e.buildWait = 0;
        b.progress = 0;
        w.removeEntity(b.id);
        w.addLog("system", `${def.name}\u5DE5\u5730\u65E0\u6CD5\u62B5\u8FBE\uFF0C\u5DF2\u653E\u5F03\u5E76\u62C6\u9664`, e.owner, "abandon:" + b.id, 60);
      }
      continue;
    }
    if (!b.done) {
      faceToward2(e, b.x, b.y, dt);
      b.progress += dt * w.mult(b.owner, "build") / def.buildTime;
      if ((w.tick & 15) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y + (Math.random() - 0.5) * b.radius(), "hit", 5, 0.2);
      if (b.progress >= 1) {
        b.progress = 1;
        b.done = true;
        b.hp = def.hp;
        w.addFx(b.x, b.y, "hit", 18, 0.35);
        w.addLog("build", `\u5EFA\u6210\uFF1A${def.name}`, b.owner);
        finished.push(b);
        if (b.defId === "monument") w.startCoronation(b.owner, b.id);
      }
    } else {
      const armorPool = def.armorPool ?? 0;
      const hpLow = b.hp < def.hp;
      const armorLow = (b.armorHp ?? 0) < armorPool;
      if (!hpLow && !armorLow) {
        e.order = { kind: "idle" };
        continue;
      }
      faceToward2(e, b.x, b.y, dt);
      const rate = 30 * w.mult(e.owner, "build") * dt;
      if (hpLow) b.hp = Math.min(def.hp, b.hp + rate);
      if (armorLow) b.armorHp = Math.min(armorPool, (b.armorHp ?? 0) + rate);
      if ((w.tick & 31) === 0) w.addFx(b.x + (Math.random() - 0.5) * b.radius(), b.y - b.radius() * 0.6, "hit", 4, 0.2);
      if (b.hp >= def.hp && (b.armorHp ?? 0) >= armorPool) e.order = { kind: "idle" };
    }
  }
  for (const e of w.entities.values()) {
    if (e.kind === "unit" && e.order.kind === "build" && e.order.targetId != null) {
      const b = w.entities.get(e.order.targetId);
      if (b && finished.includes(b)) e.order = { kind: "idle" };
    }
  }
  if (finished.length > 0) w.recomputeAdjacency();
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
  for (const owner of [0, 1]) {
    const p = w.players[owner];
    if (!p.research || !w.hasLab(owner)) continue;
    p.research.remaining -= dt;
    if (p.research.remaining <= 0) w.completeResearch(owner);
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
          if (w.terrain[y * MAP_W + x] !== 1) continue;
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
var UNIT_CAPS = { builder: 2, infantry: 10, tank: 6, artillery: 2, farmer: 0, mcv: 0 };
var AIController = class {
  owner;
  cfg;
  timer = 0;
  waveSize;
  waveN = 0;
  waveActive = false;
  waveUntil = 0;
  attackCd;
  lastBuy = 0;
  // 上次断粮买食时间（30秒一次）
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
    const myHq = snap.myBuildings.find((b) => b.defId === "hq");
    if (!myHq) {
      this.handleNoHq(w, snap);
      return;
    }
    const hq = myHq;
    const ctx = { w, owner: this.owner, foe, cfg: this.cfg, snap, army: snap.army };
    const army = snap.army;
    const tacticOn = (id) => this.cfg.tactics.includes(id);
    const me = w.players[this.owner];
    const wantEdict = this.cfg.personalityId === "rusher" ? "military" : this.cfg.personalityId === "turtler" ? "engineering" : this.cfg.personalityId === "eco" ? "economy" : w.time > 480 ? "military" : "economy";
    if (me.edict !== wantEdict && me.edictCd <= 0) w.setEdict(this.owner, wantEdict);
    if (!me.research) {
      const eraAt = this.cfg.personalityId === "eco" ? [240, 420] : this.cfg.personalityId === "turtler" ? [420, 700] : this.cfg.personalityId === "balanced" ? [360, 600] : [Infinity, Infinity];
      const nextEra = me.era === 0 && w.time >= eraAt[0] ? "industrial" : me.era === 1 && w.time >= eraAt[1] ? "steel" : null;
      if (nextEra) {
        w.startResearch(this.owner, nextEra);
      } else {
        const next = RESEARCH_QUEUES[this.cfg.personalityId].find((id) => !me.techs.includes(id));
        if (next) w.startResearch(this.owner, next);
      }
    }
    const myPosts = snap.myBuildings.filter((b) => b.defId === "tradePost" && b.done);
    if (myPosts.length > 0) {
      const caravans = snap.myUnits.filter((u) => u.defId === "caravan").length;
      if (caravans < myPosts.length * 3 && w.canAfford(this.owner, { food: 30 })) {
        w.hireCaravan(myPosts[caravans % myPosts.length].id);
      }
      if (snap.food < 80 && me.gold >= 70 && w.time - this.lastBuy > 30) {
        if (w.marketBuy(this.owner, "food")) this.lastBuy = w.time;
      }
    }
    if (tacticOn("retreat")) applyRetreat(ctx);
    if (tacticOn("spareArtillery")) applySpareArtillery(ctx);
    const compAdj = tacticOn("counterComp") ? counterCompWeights(snap.foeComposition) : {};
    const effWeights = { ...this.cfg.weights };
    if (snap.foeHeavyShare > 0.25 && snap.myPierceShare < 0.15) {
      for (const id of Object.keys(UNIT_DEFS)) {
        if (UNIT_DEFS[id].weapon?.pierce) effWeights[id] = (effWeights[id] ?? 1) * 2;
      }
    }
    const weightOf = (defId) => (this.cfg.weights[defId] ?? 1) * (compAdj[defId] ?? 1);
    for (const b of snap.myBuildings) {
      if (!b.done) continue;
      const def = BUILDING_DEFS[b.defId];
      if (!def.produces || b.queue.length >= 2) continue;
      const ranked = rankProduction(
        def.produces.map((defId) => ({ defId, kind: "unit", need: 1 })),
        effWeights,
        (id) => this.unitNeed(snap, id)
      );
      for (const c of ranked) {
        if (tryEnqueue(w, b, c.defId)) break;
      }
    }
    const idleBuilder = snap.myUnits.find((u) => u.defId === "builder" && u.order.kind === "idle");
    if (idleBuilder) {
      const reach = this.reachSet(w, idleBuilder);
      if (reach) {
        const buildable = UNIT_DEFS["builder"].canBuild ?? [];
        const ranked = rankProduction(
          buildable.map((defId) => ({ defId, kind: "building", need: 1 })),
          this.cfg.weights,
          (id) => this.buildNeed(snap, id)
        );
        for (const c of ranked) {
          const def = BUILDING_DEFS[c.defId];
          if (!w.canAfford(this.owner, def.cost)) continue;
          const spot = this.findSpot(w, c.defId, hq, reach);
          if (!spot) continue;
          w.payCost(this.owner, def.cost);
          const site = w.spawnBuilding(c.defId, this.owner, spot.tx, spot.ty, false);
          w.issueBuild([idleBuilder.id], site.id);
          break;
        }
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
    const foeMon = [...w.entities.values()].find((e) => e.defId === "monument" && e.owner === foe && (e.done || e.progress >= 0.5));
    if (foeMon && army.length >= 3) {
      const fighters = army.filter((u) => !isRetreating(u, snap.time));
      if (fighters.length >= 3) {
        w.issueAttack(fighters.map((u) => u.id), foeMon.id);
        this.attackCd = 8;
        w.addLog("military", "\u654C\u65B9\u5947\u89C2\u5373\u5C06\u843D\u6210\u2014\u2014\u5168\u519B\u5F3A\u62C6\uFF0C\u4E49\u4E0D\u5BB9\u8F9E\uFF01", this.owner, "anti-monument", 20);
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
  /** 无HQ=基地车还没展开：螺旋找合法落点，原地可开就展开；需挪窝只下一次移动指令（防游走） */
  handleNoHq(w, snap) {
    const mcv = snap.myUnits.find((u) => u.defId === "mcv");
    if (!mcv) return;
    for (let r = 0; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = Math.round(mcv.x / TILE) - 1 + dx;
          const ty = Math.round(mcv.y / TILE) - 1 + dy;
          if (!w.canPlace("hq", tx, ty, mcv.id).ok) continue;
          const cDist = Math.hypot(mcv.x - (tx + 1.5) * TILE, mcv.y - (ty + 1.5) * TILE);
          if (cDist <= TILE * 1.2) {
            w.deployMCV(mcv.id);
            return;
          }
          const target = { x: (tx + 1.5) * TILE, y: (ty + 1.5) * TILE };
          const movingThere = mcv.order.kind === "move" && mcv.order.target && Math.hypot(mcv.order.target.x - target.x, mcv.order.target.y - target.y) < 8;
          if (!movingThere) w.issueMove([mcv.id], target);
          return;
        }
      }
    }
    w.deployMCV(mcv.id);
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
        return snap.myBuildings.some((b) => b.defId === "barracks" && b.done) ? 1.5 : 0.05;
      case "lab":
        return count === 0 ? snap.time > 150 ? 1.8 : 0.05 : 0;
      case "tradePost":
        return count >= 2 ? 0 : snap.time > 60 ? 1.3 : 0.4;
      case "monument":
        return snap.era >= 2 && count === 0 ? 2.5 : 0;
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
  /** 从单位所在格高度感知洪泛，返回可达可站格集合（建造选址用） */
  reachSet(w, from) {
    const start = Math.floor(from.y / TILE) * MAP_W + Math.floor(from.x / TILE);
    if (start < 0 || start >= MAP_W * MAP_H || !w.walkable[start]) return null;
    const seen = /* @__PURE__ */ new Set([start]);
    const stack = [start];
    while (stack.length > 0) {
      const cur = stack.pop();
      const cx = cur % MAP_W, cy = cur / MAP_W | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const ni = ny * MAP_W + nx;
        if (!seen.has(ni) && w.canStand(cur, ni)) {
          seen.add(ni);
          stack.push(ni);
        }
      }
    }
    return seen;
  }
  /** 找建造位置：矿场找矿脉、伐木找树丛、普通建筑绕HQ螺旋；reach给定时要求足迹至少一格可达 */
  findSpot(w, defId, hq, reach) {
    const def = BUILDING_DEFS[defId];
    const okSpot = (tx, ty) => {
      if (!w.canPlace(defId, tx, ty).ok) return false;
      if (!reach) return true;
      for (let dy = -1; dy <= def.size; dy++) {
        for (let dx = -1; dx <= def.size; dx++) {
          const edge = dx < 0 || dy < 0 || dx >= def.size || dy >= def.size;
          if (!edge) continue;
          const x = tx + dx, y = ty + dy;
          if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
          if (reach.has(y * MAP_W + x)) return true;
        }
      }
      return false;
    };
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
          if (okSpot(c.tx + dx, c.ty + dy)) return { tx: c.tx + dx, ty: c.ty + dy };
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
            if (okSpot(c.tx + dx, c.ty + dy)) return { tx: c.tx + dx, ty: c.ty + dy };
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
          if (okSpot(tx, ty)) return { tx, ty };
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
    if (e.firingHold && def.stopToFire) continue;
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
    const weapon = UNIT_DEFS[e.defId].weapon;
    const stopAt = weapon ? UNIT_DEFS[e.defId].stopToFire ? weapon.range : weapon.range * 0.6 : 0;
    if (dist(e.x, e.y, t.x, t.y) - t.radius() <= stopAt) return null;
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
      const tx = e.resTile % MAP_W, ty = e.resTile / MAP_W | 0;
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
      const push = minD - d;
      const px = dx / d * push * 0.5, py = dy / d * push * 0.5;
      if (w.canStandClassAt(e, e.x, e.y, e.x + px, e.y + py)) {
        e.x += px;
        e.y += py;
      }
      if (w.canStandClassAt(o, o.x, o.y, o.x - px, o.y - py)) {
        o.x -= px;
        o.y -= py;
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
var VISUAL_SPEED = { bullet: 520, shell: 380, cannon: 260, missile: 240, flame: 300 };
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
function applyOrderFiring(e, c) {
  let firing = false;
  if (UNIT_DEFS[e.defId]?.bomber) {
    if (c.inMax && c.inMin) firing = true;
  } else if (e.order.kind === "attack") {
    const stopAt = UNIT_DEFS[e.defId].stopToFire ? c.effRange : c.effRange * 0.6;
    if (c.d <= stopAt) {
      e.firingHold = true;
      e.path = null;
    }
    if (c.inMax && c.inMin) firing = true;
    else if (c.inMax && !c.inMin) e.firingHold = true;
  } else if (e.order.kind === "move") {
    if (c.inMax && c.inMin) {
      firing = true;
      if (UNIT_DEFS[e.defId].stopToFire) e.firingHold = true;
    } else if (!c.inMax) e.engagedId = null;
    else e.firingHold = true;
  } else if (e.order.kind === "attackMove") {
    if (c.inMax && c.inMin) {
      e.firingHold = true;
      firing = true;
    }
  } else if (e.order.kind === "hold") {
    if (c.inMax && c.inMin) firing = true;
    else e.engagedId = null;
  } else {
    if (c.inMax && c.inMin) {
      e.firingHold = true;
      firing = true;
    } else if (!c.inMax) e.engagedId = null;
  }
  return firing;
}
function updateCombat(w, dt) {
  const burning = [];
  for (const e of w.entities.values()) {
    if ((e.burnUntil ?? 0) > w.time && e.hp > 0) burning.push(e);
  }
  for (const e of burning) {
    damage(w, e, (e.burnDps ?? 0) * dt, e.burnFrom);
    if ((w.tick + e.id) % 6 === 0) w.addFx(e.x + e.id * 13 % 8 - 4, e.y - 6, "muzzle", 4, 0.16);
  }
  for (const e of w.entities.values()) {
    const weapon = weaponOf(e);
    if (e.cooldown > 0) e.cooldown -= dt;
    const mg = e.kind === "unit" ? UNIT_DEFS[e.defId].mg : BUILDING_DEFS[e.defId].mg;
    if (mg && e.done) {
      e.mgCooldown = (e.mgCooldown ?? 0) - dt;
      if (e.mgCooldown <= 0) {
        const t = nearestEnemy(w, e, mg.range, true, mg.targetsAir === true);
        if (t) {
          const perp = e.angle + Math.PI / 2;
          const off = Math.max(9, e.radius() * 0.55);
          const spread = mg.spread ?? 4;
          const aim = Math.atan2(t.y - e.y, t.x - e.x);
          for (const side of [1, -1]) {
            const mx = e.x + Math.cos(perp) * off * side;
            const my = e.y + Math.sin(perp) * off * side;
            w.projectiles.push({
              x: mx,
              y: my,
              tx: t.x + (Math.random() - 0.5) * 2 * spread,
              ty: t.y + (Math.random() - 0.5) * 2 * spread,
              speed: mg.speed ?? VISUAL_SPEED[mg.visual],
              damage: mg.damage,
              cat: mg.cat,
              pierce: !!mg.pierce,
              impactFire: false,
              ignite: false,
              burnDur: 0,
              burnDps: 0,
              splash: 0,
              hitRadius: 10,
              targetsAir: mg.targetsAir === true,
              visual: mg.visual,
              owner: e.owner,
              aimId: t.id,
              travel: 0
            });
            w.addFx(mx, my, "muzzle", 5, 0.08, aim);
          }
          e.mgCooldown = mg.cooldown;
        }
      }
    }
    const doScan = (w.tick + e.id) % FOG_SCAN_INTERVAL === 0;
    if (doScan) {
      if (e.order.kind === "attack" && e.order.targetId != null) {
        const t = w.entities.get(e.order.targetId);
        if (!t || t.owner === e.owner) {
          const wpn = weaponOf(e);
          const near = wpn ? nearestEnemy(w, e, TILE * 12, true, wpn.targetsAir === true) : null;
          if (near) {
            e.order = { kind: "attack", targetId: near.id };
            e.engagedId = near.id;
          } else e.order = { kind: "idle" };
        }
      }
      if (e.engagedId != null) {
        const t = w.entities.get(e.engagedId);
        if (!t || t.owner === e.owner) e.engagedId = null;
      }
      if (weapon && e.engagedId == null) {
        const canAA = weapon.targetsAir === true;
        const airOnly = weapon.airOnly === true;
        if (e.kind === "unit" && (e.order.kind === "idle" || e.order.kind === "move" || e.order.kind === "attackMove" || e.order.kind === "hold")) {
          const aggro = e.order.kind === "idle" || e.order.kind === "attackMove" ? weapon.range + 30 : weapon.range;
          const t = nearestEnemy(w, e, aggro, true, canAA, airOnly);
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
          const t = nearestEnemy(w, e, weapon.range, true, canAA, airOnly);
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
        firing = applyOrderFiring(e, { effRange, d, inMax, inMin });
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
          speed: weapon.speed ?? VISUAL_SPEED[weapon.visual],
          damage: effDamage,
          cat: weapon.cat,
          pierce: !!weapon.pierce,
          impactFire: !!weapon.impactFire,
          ignite: weapon.status?.kind === "burn",
          burnDur: weapon.status?.dur ?? 0,
          burnDps: weapon.status?.potency ?? 0,
          splash: weapon.splash ?? 0,
          hitRadius: weapon.visual === "bullet" ? 10 : weapon.visual === "flame" ? 9 : 12,
          targetsAir: weapon.targetsAir === true,
          visual: weapon.visual,
          owner: e.owner,
          aimId: t.id,
          travel: 0
        });
        w.addFx(mx, my, "muzzle", weapon.visual === "cannon" ? 15 : 9, 0.08, e.turretAngle);
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
      if (p.impactFire) {
        splashDamage(w, p.tx, p.ty, p.splash, p.damage, p.owner, p.targetsAir, p.cat);
        spawnFireZone(w, p.tx, p.ty, p.splash * 1.2, p.owner);
        w.addFx(p.tx, p.ty, "boom", p.splash * 1.3, 0.6);
        w.addFx(p.tx, p.ty, "mark", 0, 2.5, void 0, void 0, "#ff6a2a");
      } else if (p.splash > 0) {
        splashDamage(w, p.tx, p.ty, p.splash, p.damage, p.owner, p.targetsAir, p.cat);
        if (p.ignite) igniteAt(w, p.tx, p.ty, p.splash, p.owner);
        w.addFx(p.tx, p.ty, "boom", p.splash, 0.45);
      } else {
        const hitEnt = impactDamage(w, p.tx, p.ty, p.hitRadius, p.damage, p.owner, p.targetsAir, p.aimId, p.cat, p.pierce);
        if (hitEnt && p.ignite) {
          hitEnt.burnUntil = w.time + p.burnDur;
          hitEnt.burnDps = p.burnDps;
          hitEnt.burnFrom = p.owner;
          hitEnt.burnCat = p.cat;
        }
        w.addFx(p.tx, p.ty, "hit", hitEnt ? 7 : 3, 0.18);
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
function spawnFireZone(w, x, y, radius, owner) {
  w.fireZones.push({ x, y, radius, dps: 6, owner, born: w.time, dur: 6, seed: Math.floor(x * 7 + y * 13) });
  if (w.fireZones.length > 20) w.fireZones.shift();
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (isAir(o)) continue;
    if (dist(x, y, o.x, o.y) - o.radius() <= radius) {
      o.burnUntil = w.time + 4;
      o.burnDps = 6;
      o.burnFrom = owner;
      o.burnCat = "heavy";
    }
  }
}
function igniteAt(w, x, y, radius, owner) {
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (isAir(o)) continue;
    const d = dist(x, y, o.x, o.y) - o.radius();
    if (d <= radius) {
      o.burnUntil = w.time + 4;
      o.burnDps = 6;
      o.burnFrom = owner;
    }
  }
}
function nearestEnemy(w, e, range, skipPassiveWild, targetsAir, airOnly = false) {
  let best = null;
  let bestD = range;
  for (const o of w.entities.values()) {
    if (o.owner === e.owner) continue;
    if (airOnly && !isAir(o)) continue;
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
function impactDamage(w, x, y, radius, dmg, owner, targetsAir, aimId, cat, pierce) {
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
    damage(w, best, dmg, owner, cat, pierce);
    return best;
  }
  return null;
}
function splashDamage(w, x, y, radius, dmg, owner, targetsAir, cat) {
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (!targetsAir && isAir(o)) continue;
    const d = dist(x, y, o.x, o.y) - o.radius();
    if (d <= radius) damage(w, o, dmg, owner, cat);
  }
}
function damage(w, target, amount, fromOwner, cat, pierce) {
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
  const pool = target.armorHp ?? 0;
  const immortal = pool < 0;
  if ((pool > 0 || immortal) && cat && !pierce) {
    const armorClass = armorOf(target);
    remaining *= DMG_REDUCTION[armorClass]?.[cat] ?? 1;
  }
  if (target.owner <= 1 && w.players[target.owner].techs.includes("composite")) remaining *= COMPOSITE_MITIGATION;
  target.hp -= remaining;
  if (remaining > 0) target.lastDamagedAt = w.time;
  if (pierce && (pool > 0 || immortal) && !immortal) {
    const left = Math.max(0, pool - amount * ARMOR_PIERCE_MULT);
    if (pool > 0 && left <= 0) {
      target.armorHp = 0;
      w.addFx(target.x, target.y - target.radius(), "mark", 0, 1.4, void 0, "\u7532\u788E\uFF01", "#9fd8ff");
      for (let k = 0; k < 5; k++) {
        w.addFx(target.x + (Math.random() - 0.5) * target.radius() * 1.6, target.y - target.radius() * 0.4 + (Math.random() - 0.5) * target.radius(), "hit", 5, 0.45);
      }
      w.addLog("military", "\u88C5\u7532\u51FB\u788E\u2014\u2014\u51CF\u4F24\u4F5C\u5E9F\uFF01", fromOwner);
    } else {
      target.armorHp = left;
    }
  }
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
    const gm = w.mult(e.owner, "gather") * (e.defId === "lumber" || e.defId === "mine" || e.defId === "farm" ? e.adjBonus ?? 1 : 1);
    let active = true;
    if (e.defId === "lumber") active = runExtractor(w, e, "wood", (def.income.wood ?? 0) * gm, def.bufferCap ?? 30, dt);
    else if (e.defId === "mine") active = runExtractor(w, e, "ore", (def.income.ore ?? 0) * gm, def.bufferCap ?? 40, dt);
    else if (e.owner <= 1) {
      for (const [res, rate] of Object.entries(def.income)) {
        const added = w.addRes(e.owner, res, rate * gm * dt);
        if (added <= 0) active = false;
        income[e.owner][res] += rate * gm;
      }
    }
    if (active) {
      const inc = income[e.owner];
      inc.wood += (def.income.wood ?? 0) * gm;
      inc.food += (def.income.food ?? 0) * gm;
      inc.ore += (def.income.ore ?? 0) * gm;
    }
  }
  for (const owner of [0, 1]) {
    const p = w.players[owner];
    const mul = p.incomeMul;
    p.income = { wood: income[owner].wood * mul, food: income[owner].food * mul, ore: income[owner].ore * mul };
    p.res.wood += p.income.wood * dt;
    p.res.food += p.income.food * dt;
    p.res.ore += p.income.ore * dt;
    p.storageCap = STORAGE_BASE + STORAGE_PER_STOREHOUSE * storehouses[owner] + (p.edict === "logistics" ? LOGISTICS_STORAGE : 0) + (p.techs.includes("deepStorage") ? DEEP_STORAGE_BONUS : 0);
    p.edictCd = Math.max(0, p.edictCd - dt);
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
        const take = Math.min(g.rate * w.mult(e.owner, "gather") * dt, g.capacity - (e.cargo?.amt ?? 0));
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
        if (e.cargo && e.cargo.amt > 0 && e.cargo.res !== "wheat") {
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

// src/sim/farm.ts
var HARVEST_T = 1;
var PLANT_T = 0.8;
function updateStages(w) {
  for (const i of w.farmTiles) {
    if (w.farmPlanted[i] < 0) continue;
    const elapsed = w.time - w.farmPlanted[i];
    const st = elapsed >= FARM_GROWTH ? 3 : elapsed >= FARM_GROWTH * (2 / 3) ? 2 : 1;
    if (w.farmStage[i] !== st) {
      w.farmStage[i] = st;
      w.dirtyTiles.add(i);
    }
  }
}
function updateFarms(w, dt) {
  updateStages(w);
  for (const e of w.entities.values()) {
    if (e.kind === "unit" && e.defId === "farmer") updateFarmer(w, e, dt);
  }
}
function tileCenter2(i) {
  return { x: i % MAP_W * TILE + TILE / 2, y: (i / MAP_W | 0) * TILE + TILE / 2 };
}
function walkTo(w, e, p) {
  e.order = { kind: "move", target: p };
  e.path = null;
  e.pathPending = false;
}
function nearestTile(w, e, stage) {
  let best = -1, bestD = Infinity;
  for (const i of w.farmTiles) {
    if (w.farmOwner[i] !== e.owner || w.farmStage[i] !== stage) continue;
    const c = tileCenter2(i);
    const d = (c.x - e.x) ** 2 + (c.y - e.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
function tileValid(w, e, i, stage) {
  return i != null && w.farmOwner[i] === e.owner && w.farmStage[i] === stage;
}
function updateFarmer(w, e, dt) {
  if ((e.jobT ?? 0) > 0) {
    e.jobT = (e.jobT ?? 0) - dt;
    if ((e.jobT ?? 0) <= 0) finishJob(w, e);
    return;
  }
  if (e.cargo && e.cargo.res === "wheat" && e.cargo.amt > 0) {
    const depot = w.nearestDepot(e.owner, e.x, e.y);
    if (!depot) return;
    if (dist(e.x, e.y, depot.x, depot.y) <= depot.radius() + TILE * 1.6) {
      const added = w.addRes(e.owner, "food", e.cargo.amt);
      e.cargo = null;
      if (added > 0) {
        w.addLog("econ", `\u8015\u6536\u5165\u5E93 \u98DF+${added.toFixed(0)}`, e.owner, "farmDeposit:" + e.owner, 20);
        w.addFx(depot.x, depot.y - depot.radius() * 0.6, "hit", 9, 0.3);
      }
      e.farmState = "toPlant";
      if (!tileValid(w, e, e.farmTile, 0)) e.farmTile = nearestTile(w, e, 0);
      if (e.farmTile != null) walkTo(w, e, tileCenter2(e.farmTile));
      return;
    }
    if (e.order.kind !== "move") walkTo(w, e, { x: depot.x, y: depot.y });
    return;
  }
  if (e.farmState === "toHarvest") {
    if (!tileValid(w, e, e.farmTile, 3)) {
      e.farmState = null;
      e.farmTile = void 0;
    } else if (e.order.kind === "idle") {
      e.jobT = HARVEST_T;
      e.jobDur = HARVEST_T;
      return;
    } else if (e.order.kind !== "move") {
      walkTo(w, e, tileCenter2(e.farmTile));
    }
    return;
  }
  if (e.farmState === "toPlant") {
    if (!tileValid(w, e, e.farmTile, 0)) {
      e.farmState = null;
      e.farmTile = void 0;
    } else if (e.order.kind === "idle") {
      e.jobT = PLANT_T;
      e.jobDur = PLANT_T;
      return;
    } else if (e.order.kind !== "move") {
      walkTo(w, e, tileCenter2(e.farmTile));
    }
    return;
  }
  const mature = nearestTile(w, e, 3);
  if (mature >= 0) {
    e.farmState = "toHarvest";
    e.farmTile = mature;
    walkTo(w, e, tileCenter2(mature));
    return;
  }
  const stubble = nearestTile(w, e, 0);
  if (stubble >= 0) {
    e.farmState = "toPlant";
    e.farmTile = stubble;
    walkTo(w, e, tileCenter2(stubble));
  }
}
function finishJob(w, e) {
  const i = e.farmTile;
  if (e.farmState === "toHarvest" && i != null) {
    const amt = w.harvestFarm(i, e.owner);
    if (amt > 0) e.cargo = { res: "wheat", amt };
    e.farmState = "toDepot";
  } else if (e.farmState === "toPlant" && i != null) {
    w.plantFarm(i, e.owner);
    e.farmState = null;
    e.farmTile = void 0;
  }
}

// src/sim/trade.ts
var TRADE_DWELL = 1.2;
function walkTo2(w, e, p) {
  e.order = { kind: "move", target: p };
  e.path = null;
  e.pathPending = false;
}
function nearestOf(w, e, defId, requireDone) {
  let best = null, bestD = Infinity;
  for (const o of w.entities.values()) {
    if (o.kind !== "building" || o.defId !== defId) continue;
    if (requireDone && !o.done) continue;
    if (defId === "tradePost" && o.owner !== e.owner) continue;
    const d = dist(e.x, e.y, o.x, o.y);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}
function updateCaravan(w, e, dt) {
  if ((e.jobT ?? 0) > 0) {
    e.jobT = (e.jobT ?? 0) - dt;
    if ((e.jobT ?? 0) <= 0) {
      if (e.tradeState === "toCamp") {
        w.addGold(e.owner, e.payout ?? 0);
        w.addLog("econ", `\u5546\u961F\u4EA4\u5272 \u91D1+${Math.round(e.payout ?? 0)}`, e.owner, "trade:" + e.id, 15);
        e.tradeState = "toHome";
        const home = (e.homePostId != null ? w.entities.get(e.homePostId) : null) ?? nearestOf(w, e, "tradePost", true);
        if (home) {
          e.homePostId = home.id;
          walkTo2(w, e, { x: home.x, y: home.y });
        } else e.tradeState = null;
      }
    }
    return;
  }
  if (e.tradeState === "toCamp") {
    const camp2 = e.tradeCampId != null ? w.entities.get(e.tradeCampId) : null;
    if (!camp2 || camp2.defId !== "camp") {
      const alt = nearestOf(w, e, "camp", false);
      if (alt) {
        e.tradeCampId = alt.id;
        walkTo2(w, e, { x: alt.x, y: alt.y });
      } else e.tradeState = null;
      return;
    }
    if (dist(e.x, e.y, camp2.x, camp2.y) <= camp2.radius() + TILE * 2) {
      e.order = { kind: "idle" };
      e.path = null;
      const post = (e.homePostId != null ? w.entities.get(e.homePostId) : null) ?? nearestOf(w, e, "tradePost", true);
      const distTiles = post ? Math.hypot(post.x - camp2.x, post.y - camp2.y) / 32 : 10;
      e.payout = Math.min(GOLD_TRADE_CAP, GOLD_TRADE_BASE + GOLD_TRADE_PER_10 * Math.floor(distTiles / 10));
      e.jobT = TRADE_DWELL;
      e.jobDur = TRADE_DWELL;
      camp2.nTruceUntil = w.time + 120;
      return;
    }
    if (e.order.kind !== "move") walkTo2(w, e, { x: camp2.x, y: camp2.y });
    return;
  }
  if (e.tradeState === "toHome") {
    const post = (e.homePostId != null ? w.entities.get(e.homePostId) : null) ?? nearestOf(w, e, "tradePost", true);
    if (!post) return;
    e.homePostId = post.id;
    if (dist(e.x, e.y, post.x, post.y) <= post.radius() + TILE * 2) {
      e.order = { kind: "idle" };
      e.path = null;
      e.tradeState = "toCamp";
      const camp2 = e.tradeCampId != null ? w.entities.get(e.tradeCampId) : null;
      if (camp2 && camp2.defId === "camp") walkTo2(w, e, { x: camp2.x, y: camp2.y });
      return;
    }
    if (e.order.kind !== "move") walkTo2(w, e, { x: post.x, y: post.y });
    return;
  }
  const camp = nearestOf(w, e, "camp", false);
  if (camp) {
    e.tradeCampId = camp.id;
    e.tradeState = "toCamp";
    walkTo2(w, e, { x: camp.x, y: camp.y });
  }
}
function updateTrade(w, dt) {
  for (const e of w.entities.values()) {
    if (e.kind !== "unit" || e.defId !== "caravan") continue;
    updateCaravan(w, e, dt);
  }
}

// src/sim/regen.ts
function updateRegen(w, dt) {
  for (const e of w.entities.values()) {
    if (e.kind === "building" && !e.done) continue;
    const defHp = e.kind === "unit" ? UNIT_DEFS[e.defId]?.hp : BUILDING_DEFS[e.defId]?.hp;
    if (!defHp || e.hp >= defHp) continue;
    if (w.time - (e.lastDamagedAt ?? -1e9) < REGEN_DELAY) continue;
    e.hp = Math.min(defHp, e.hp + defHp * REGEN_RATE * dt);
  }
}

// src/sim/firezone.ts
function updateFireZones(w, dt) {
  for (let i = w.fireZones.length - 1; i >= 0; i--) {
    const fz = w.fireZones[i];
    const age = w.time - fz.born;
    if (age >= fz.dur) {
      w.fireZones.splice(i, 1);
      continue;
    }
    for (const o of w.entities.values()) {
      if (o.owner === fz.owner || o.owner === OWNER_NEUTRAL) continue;
      const d = dist(fz.x, fz.y, o.x, o.y) - o.radius();
      if (d <= fz.radius && o.hp > 0) {
        damage(w, o, fz.dps * dt, fz.owner, "heavy");
      }
    }
  }
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
  updateFarms(w, dt);
  updateTrade(w, dt);
  updateNeutrals(w, dt);
  updateFireZones(w, dt);
  updateCombat(w, dt);
  updateMovement(w, dt);
  if (w.tick % FOG_INTERVAL === 0) updateFog(w);
  if (w.tick % 30 === 0) w.recomputePop();
  if (w.tick % 300 === 0) w.recomputeAdjacency();
  updateRegen(w, dt);
  w.checkCoronation();
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
