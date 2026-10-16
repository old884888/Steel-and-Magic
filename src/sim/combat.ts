import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { dist } from '../engine/spatialHash';
import { FOG_SCAN_INTERVAL, HEIGHT_RANGE_BONUS, HEIGHT_DAMAGE_BONUS, DMG_REDUCTION, ARMOR_PIERCE_MULT, TILE } from '../config';
import { COMPOSITE_MITIGATION } from '../data/policies';
import type { World } from './world';
import type { Entity } from './entity';
import type { WeaponDef, Res } from '../types';

const VISUAL_SPEED = { bullet: 520, shell: 380, cannon: 260, missile: 240, flame: 300 };

function weaponOf(e: Entity): WeaponDef | undefined {
  return e.kind === 'unit' ? UNIT_DEFS[e.defId].weapon : BUILDING_DEFS[e.defId].weapon;
}

function isAir(e: Entity): boolean {
  return e.kind === 'unit' && UNIT_DEFS[e.defId]?.moveClass === 'air';
}

function armorOf(e: Entity): 'light' | 'heavy' {
  return (e.kind === 'unit' ? UNIT_DEFS[e.defId].armor : BUILDING_DEFS[e.defId].armor) ?? 'light';
}

/** 找到能为该目标挡刀的护盾发生器（友方、建成、有护盾值、半径内、最近者） */
function findShieldFor(w: World, target: Entity): Entity | null {
  let best: Entity | null = null, bestD = Infinity;
  for (const g of w.entities.values()) {
    if (g.kind !== 'building' || g.defId !== 'shieldGen' || !g.done || g.owner !== target.owner) continue;
    if ((g.shield ?? 0) <= 0) continue;
    const d = dist(g.x, g.y, target.x, target.y);
    if (d <= 180 && d < bestD) { bestD = d; best = g; }
  }
  return best;
}

/**
 * 战斗系统：索敌（错峰扫描）→ 交战/停火判定 → 开火（落点弹）→ 弹道推进与落点结算 → 特效计时
 * 落点弹：发射时锁定目标当前位置+散布，落地后在命中半径内结算——移动目标可以闪避，走位即博弈。
 */
/** 一个单位的订单开火策略：按订单类型决定本帧是否开火/是否停车。返回firing */
function applyOrderFiring(e: Entity, c: { effRange: number; d: number; inMax: boolean; inMin: boolean }): boolean {
  let firing = false;
  if (UNIT_DEFS[e.defId]?.bomber) {
    // 轰炸机：飞越目标头顶即投弹（冷却好了就投），永不停不悬停
    if (c.inMax && c.inMin) firing = true;
  } else if (e.order.kind === 'attack') {
    // RW式攻击：推进到60%射程（火炮/近战=全射程）站桩，到位前边推进边开火
    const melee = weaponOf(e)?.melee === true;
    const stopAt = (UNIT_DEFS[e.defId].stopToFire || melee) ? c.effRange : c.effRange * 0.6;
    if (c.d <= stopAt) { e.firingHold = true; e.path = null; }
    if (c.inMax && c.inMin) firing = true;
    else if (c.inMax && !c.inMin) e.firingHold = true; // 贴脸盲区：愣住
  } else if (e.order.kind === 'move') {
    if (c.inMax && c.inMin) {
      firing = true; // 行进射击：边走边打（全员默认）
      if (UNIT_DEFS[e.defId].stopToFire) e.firingHold = true; // 唯一例外：自行火炮停车架炮
    } else if (!c.inMax) e.engagedId = null;
    else e.firingHold = true; // minRange盲区（只有火炮有）：愣住
  } else if (e.order.kind === 'attackMove') {
    if (c.inMax && c.inMin) { e.firingHold = true; firing = true; }
  } else if (e.order.kind === 'hold') {
    if (c.inMax && c.inMin) firing = true;
    else e.engagedId = null;
  } else {
    // 建筑与待命单位：站桩开火
    if (c.inMax && c.inMin) { e.firingHold = true; firing = true; }
    else if (!c.inMax) e.engagedId = null;
  }
  return firing;
}

export function updateCombat(w: World, dt: number): void {
  // ---- 燃烧DoT结算（喷火武器点燃的目标持续掉血；护盾可挡） ----
  const burning: Entity[] = [];
  for (const e of w.entities.values()) {
    if ((e.burnUntil ?? 0) > w.time && e.hp > 0) burning.push(e);
  }
  for (const e of burning) {
    damage(w, e, (e.burnDps ?? 0) * dt, e.burnFrom);
    if ((w.tick + e.id) % 6 === 0) w.addFx(e.x + ((e.id * 13) % 8) - 4, e.y - 6, 'muzzle', 4, 0.16);
  }

  for (const e of w.entities.values()) {
    const weapon = weaponOf(e);
    if (e.cooldown > 0) e.cooldown -= dt;

    // ---- 舷侧机枪（坦克/指挥基地）：固定双联，独立索敌/冷却，与主武器互不干扰，行进间照射 ----
    const mg = e.kind === 'unit' ? UNIT_DEFS[e.defId].mg : BUILDING_DEFS[e.defId].mg;
    if (mg && e.done) {
      e.mgCooldown = (e.mgCooldown ?? 0) - dt;
      if (e.mgCooldown <= 0) {
        const t = nearestEnemy(w, e, mg.range, true, mg.targetsAir === true);
        if (t) {
          const perp = e.angle + Math.PI / 2;
          const off = Math.max(9, e.radius() * 0.55); // 建筑：枪巢布置在角落
          const spread = mg.spread ?? 4;
          const aim = Math.atan2(t.y - e.y, t.x - e.x);
          for (const side of [1, -1] as const) {
            const mx = e.x + Math.cos(perp) * off * side;
            const my = e.y + Math.sin(perp) * off * side;
            w.projectiles.push({
              x: mx, y: my,
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
              travel: 0,
            });
            w.addFx(mx, my, 'muzzle', 5, 0.08, aim);
          }
          e.mgCooldown = mg.cooldown;
        }
      }
    }

    // ---- 错峰索敌扫描 ----
    const doScan = (w.tick + e.id) % FOG_SCAN_INTERVAL === 0;
      if (doScan) {
        // 清理失效目标
        if (e.order.kind === 'attack' && e.order.targetId != null) {
          const t = w.entities.get(e.order.targetId);
          if (!t || t.owner === e.owner) {
            // 目标阵亡：铁锈式就近转火（12格内），实在没目标才原地待命
            const wpn = weaponOf(e);
            const near = wpn ? nearestEnemy(w, e, TILE * 12, true, wpn.targetsAir === true) : null;
            if (near) { e.order = { kind: 'attack', targetId: near.id }; e.engagedId = near.id; }
            else e.order = { kind: 'idle' };
          }
        }
      if (e.engagedId != null) {
        const t = w.entities.get(e.engagedId);
        if (!t || t.owner === e.owner) e.engagedId = null;
      }
      // 自动索敌：空闲单位追击；移动/攻击移动单位只打射程内的；建筑只打射程内；驻守绝不追
      // 空中过滤：武器打不到空中就不索空中目标；温顺野物（鹿）不自动咬，须手动下令
      if (weapon && e.engagedId == null) {
        const canAA = weapon.targetsAir === true;
        const airOnly = weapon.airOnly === true;
        if (e.kind === 'unit' && (e.order.kind === 'idle' || e.order.kind === 'move' || e.order.kind === 'attackMove' || e.order.kind === 'hold')) {
          const aggro = (e.order.kind === 'idle' || e.order.kind === 'attackMove') ? weapon.range + 30 : weapon.range;
          const t = nearestEnemy(w, e, aggro, true, canAA, airOnly);
          if (t) {
            if (e.order.kind === 'idle') {
              e.order = { kind: 'attack', targetId: t.id };
              e.engagedId = t.id;
              e.path = null;
            } else {
              e.engagedId = t.id;
            }
          }
        } else if (e.kind === 'building' && e.done) {
          const t = nearestEnemy(w, e, weapon.range, true, canAA, airOnly);
          if (t) e.engagedId = t.id;
        }
      }
    }

    // ---- 交战/停火判定（firingHold 每帧显式置位） ----
    let firing = false;
    let effDamage = weapon?.damage ?? 0;
    let effRange = weapon?.range ?? 0;
    e.firingHold = false;
    if (weapon && e.engagedId != null) {
      const t = w.entities.get(e.engagedId);
      if (t) {
        // 高地加成仅作用于地面目标（空军不层数压制）
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
    } else if (e.kind === 'unit') {
      let da = e.angle - e.turretAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      e.turretAngle += da * Math.min(1, dt * 6);
    }

    // ---- 开火（落点弹：锁定当前位置+散布，飞过去结算；真近战无弹道直接结算） ----
    if (firing && weapon && e.cooldown <= 0 && e.done && e.engagedId != null) {
      const t = w.entities.get(e.engagedId);
      if (t) {
        if (weapon.melee) {
          // 真近战：贴身直接结算伤害+扑咬特效，不生成projectile实体
          damage(w, t, effDamage, e.owner, weapon.cat, !!weapon.pierce);
          w.addFx(t.x + (Math.random() - 0.5) * 10, t.y + (Math.random() - 0.5) * 10, 'muzzle', 8, 0.1, e.turretAngle);
          e.cooldown = weapon.cooldown;
        } else {
        const mx = e.x + Math.cos(e.turretAngle) * (e.radius() + 3);
        const my = e.y + Math.sin(e.turretAngle) * (e.radius() + 3);
        const spread = weapon.spread ?? 4;
        w.projectiles.push({
          x: mx, y: my,
          tx: t.x + (Math.random() - 0.5) * 2 * spread,
          ty: t.y + (Math.random() - 0.5) * 2 * spread,
          speed: weapon.speed ?? VISUAL_SPEED[weapon.visual],
          damage: effDamage,
          cat: weapon.cat,
          pierce: !!weapon.pierce,
          impactFire: !!weapon.impactFire,
          ignite: weapon.status?.kind === 'burn',
          burnDur: weapon.status?.dur ?? 0,
          burnDps: weapon.status?.potency ?? 0,
          splash: weapon.splash ?? 0,
          hitRadius: weapon.visual === 'bullet' ? 10 : weapon.visual === 'flame' ? 9 : 12,
          targetsAir: weapon.targetsAir === true,
          visual: weapon.visual,
          owner: e.owner,
          aimId: t.id,
          travel: 0,
        });
        w.addFx(mx, my, 'muzzle', weapon.visual === 'cannon' ? 15 : 9, 0.08, e.turretAngle);
        e.cooldown = weapon.cooldown;
        }
      }
    }
  }

  // ---- 弹道推进：直线飞向落点，落地结算（溅射→范围伤害；直击→命中半径内最近敌人） ----
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const p = w.projectiles[i];
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step) {
      if (p.impactFire) {
        // 落地起火弹：溅射伤害 + 地面火区（持续灼烧+视觉火焰）
        splashDamage(w, p.tx, p.ty, p.splash, p.damage, p.owner, p.targetsAir, p.cat);
        spawnFireZone(w, p.tx, p.ty, p.splash * 1.2, p.owner);
        w.addFx(p.tx, p.ty, 'boom', p.splash * 1.3, 0.6);
        w.addFx(p.tx, p.ty, 'mark', 0, 2.5, undefined, undefined, '#ff6a2a');
      } else if (p.splash > 0) {
        splashDamage(w, p.tx, p.ty, p.splash, p.damage, p.owner, p.targetsAir, p.cat);
        if (p.ignite) igniteAt(w, p.tx, p.ty, p.splash, p.owner);
        w.addFx(p.tx, p.ty, 'boom', p.splash, 0.45);
      } else {
        const hitEnt = impactDamage(w, p.tx, p.ty, p.hitRadius, p.damage, p.owner, p.targetsAir, p.aimId, p.cat, p.pierce);
        if (hitEnt && p.ignite) {
          hitEnt.burnUntil = w.time + p.burnDur;
          hitEnt.burnDps = p.burnDps;
          hitEnt.burnFrom = p.owner;
          hitEnt.burnCat = p.cat;
        }
        w.addFx(p.tx, p.ty, 'hit', hitEnt ? 7 : 3, 0.18);
      }
      w.projectiles.splice(i, 1);
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }

  // ---- 特效计时 ----
  for (let i = w.fx.length - 1; i >= 0; i--) {
    const f = w.fx[i];
    f.t += dt;
    if (f.t >= f.dur) w.fx.splice(i, 1);
  }
}

/** 在落点生成地面火区：范围内敌方持续灼烧 */
function spawnFireZone(w: World, x: number, y: number, radius: number, owner: number): void {
  w.fireZones.push({ x, y, radius, dps: 6, owner, born: w.time, dur: 6, seed: Math.floor(x * 7 + y * 13) });
  if (w.fireZones.length > 20) w.fireZones.shift();
  // 范围内敌人立即点燃
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (isAir(o)) continue;
    if (dist(x, y, o.x, o.y) - o.radius() <= radius) {
      o.burnUntil = w.time + 4;
      o.burnDps = 6;
      o.burnFrom = owner;
      o.burnCat = 'heavy';
    }
  }
}

/** 火焰溅射点燃范围内目标（附燃烧DoT） */
function igniteAt(w: World, x: number, y: number, radius: number, owner: number): void {
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

function nearestEnemy(w: World, e: Entity, range: number, skipPassiveWild: boolean, targetsAir: boolean, airOnly = false): Entity | null {
  let best: Entity | null = null;
  let bestD = range;
  for (const o of w.entities.values()) {
    if (o.owner === e.owner) continue;
    if (airOnly && !isAir(o)) continue;
    if (!targetsAir && isAir(o)) continue;
    if (skipPassiveWild && o.kind === 'unit' && UNIT_DEFS[o.defId]?.wild === 'passive') continue;
    const d = dist(e.x, e.y, o.x, o.y) - o.radius();
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

/** 落点直击：命中半径内最近的合法敌人（瞄准的野物允许命中） */
function impactDamage(w: World, x: number, y: number, radius: number, dmg: number, owner: number, targetsAir: boolean, aimId: number, cat?: 'light' | 'heavy', pierce?: boolean): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (!targetsAir && isAir(o)) continue;
    const isAim = o.id === aimId;
    if (o.kind === 'unit' && UNIT_DEFS[o.defId]?.wild === 'passive' && !isAim) continue;
    const d = dist(x, y, o.x, o.y) - o.radius();
    if (d <= radius && d < bestD) { bestD = d; best = o; }
  }
  if (best) { damage(w, best, dmg, owner, cat, pierce); return best; }
  return null;
}

function splashDamage(w: World, x: number, y: number, radius: number, dmg: number, owner: number, targetsAir: boolean, cat?: 'light' | 'heavy'): void {
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (!targetsAir && isAir(o)) continue;
    const d = dist(x, y, o.x, o.y) - o.radius();
    if (d <= radius) damage(w, o, dmg, owner, cat);
  }
}

/**
 * 伤害结算管线：护盾改道 → 伤害矩阵（弹种×装甲）→ 扣血 → 击杀赏金 → 移除
 */
export function damage(w: World, target: Entity, amount: number, fromOwner?: number, cat?: 'light' | 'heavy', pierce?: boolean): void {
  let remaining = amount;

  // 1) 护盾层：先吃全额伤害（shieldGen 机制不动）
  if (target.owner <= 1) {
    const gen = findShieldFor(w, target);
    if (gen && (gen.shield ?? 0) > 0) {
      const absorbed = Math.min(gen.shield!, remaining);
      gen.shield = (gen.shield ?? 0) - absorbed;
      gen.shieldHitAt = w.time;
      remaining -= absorbed;
      if (absorbed > 0) w.addFx(target.x, target.y - 12, 'hit', 6, 0.2);
    }
  }
  if (remaining <= 0) return;

  // 2) 装甲管线：甲池>0 按减伤表承伤；无甲/已掉甲 全额；不朽(-1) 永久有甲
  const pool = target.armorHp ?? 0;
  const immortal = pool < 0;
  if ((pool > 0 || immortal) && cat && !pierce) {
    const armorClass = armorOf(target);
    remaining *= DMG_REDUCTION[armorClass]?.[cat] ?? 1;
  }

  // 3) 复合装甲科技：目标全军受伤减免
  if (target.owner <= 1 && w.players[target.owner].techs.includes('composite')) remaining *= COMPOSITE_MITIGATION;

  target.hp -= remaining;
  if (remaining > 0) target.lastDamagedAt = w.time; // 三十息律：实际掉血重置再生计时

  // 4) 破甲削甲池：普通攻击对甲池零影响；不朽永不掉甲；掉甲瞬间必须可感知
  if (pierce && (pool > 0 || immortal) && !immortal) {
    const left = Math.max(0, pool - amount * ARMOR_PIERCE_MULT);
    if (pool > 0 && left <= 0) {
      target.armorHp = 0;
      w.addFx(target.x, target.y - target.radius(), 'mark', 0, 1.4, undefined, '甲碎！', '#9fd8ff');
      for (let k = 0; k < 5; k++) {
        w.addFx(target.x + (Math.random() - 0.5) * target.radius() * 1.6, target.y - target.radius() * 0.4 + (Math.random() - 0.5) * target.radius(), 'hit', 5, 0.45);
      }
      w.addLog('military', '装甲击碎——减伤作废！', fromOwner);
    } else {
      target.armorHp = left;
    }
  }

  // 击杀赏金：野生动物/蛮族/营地被消灭时，击杀方获得资源
  // 野物（鹿/狼）走"快打快收"：半额立付，另一半挂尸体衰减（v0.17腐烂）
  if (target.hp <= 0) {
    if (fromOwner != null && fromOwner <= 1) {
      const bounty = target.kind === 'unit' ? UNIT_DEFS[target.defId]?.bounty : BUILDING_DEFS[target.defId]?.bounty;
      if (bounty) {
        const wild = target.kind === 'unit' && (target.defId === 'deer' || target.defId === 'wolf');
        const parts: string[] = [];
        for (const [res, v] of Object.entries(bounty) as [Res, number][]) {
          if (!v) continue;
          const now = wild ? Math.round(v / 2) : v;
          const left = v - now;
          if (now > 0) w.addRes(fromOwner, res, now);
          if (left > 0) {
            w.carcasses.push({ x: target.x, y: target.y, res, amount0: left, born: w.time, credit: fromOwner });
            parts.push((res === 'wood' ? '木' : res === 'food' ? '食' : '矿') + now + `+尸${left}`);
          } else {
            parts.push((res === 'wood' ? '木' : res === 'food' ? '食' : '矿') + now);
          }
        }
        w.addLog('econ', `缴获战利品：${parts.join(' ')}${wild ? '（尸体份额40秒内腐蚀，速收！）' : ''}`, fromOwner, 'bounty:' + target.id, 10);
      }
    }
    w.removeEntity(target.id);
  }
}
