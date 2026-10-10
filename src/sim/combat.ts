import { UNIT_DEFS } from '../data/units';
import { BUILDING_DEFS } from '../data/buildings';
import { dist } from '../engine/spatialHash';
import { FOG_SCAN_INTERVAL, HEIGHT_RANGE_BONUS, HEIGHT_DAMAGE_BONUS, DMG_MATRIX } from '../config';
import type { World } from './world';
import type { Entity } from './entity';
import type { WeaponDef, Res } from '../types';

const PROJ_SPEED = { bullet: 520, shell: 380, cannon: 260, fire: 300, missile: 240, explosive: 340 };

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

    // ---- 错峰索敌扫描 ----
    const doScan = (w.tick + e.id) % FOG_SCAN_INTERVAL === 0;
    if (doScan) {
      // 清理失效目标
      if (e.order.kind === 'attack' && e.order.targetId != null) {
        const t = w.entities.get(e.order.targetId);
        if (!t || t.owner === e.owner) e.order = { kind: 'idle' };
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
        if (UNIT_DEFS[e.defId]?.bomber) {
          // 轰炸机：飞越目标头顶即投弹（冷却好了就投），永不停不悬停
          if (inMax && inMin) { firing = true; }
        } else if (e.order.kind === 'attack') {
          if (inMax && inMin) { e.firingHold = true; e.path = null; firing = true; }
          else if (inMax && !inMin) { e.firingHold = true; } // 火炮被贴脸：愣住
        } else if (e.order.kind === 'move') {
          if (inMax && inMin) { e.firingHold = true; firing = true; }
          else if (!inMax) e.engagedId = null;
          else e.firingHold = true;
        } else if (e.order.kind === 'attackMove') {
          if (inMax && inMin) { e.firingHold = true; firing = true; }
        } else if (e.order.kind === 'hold') {
          if (inMax && inMin) { firing = true; }
          else e.engagedId = null;
        } else {
          if (inMax && inMin) { e.firingHold = true; firing = true; }
          else if (!inMax) e.engagedId = null;
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
    } else if (e.kind === 'unit') {
      let da = e.angle - e.turretAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      e.turretAngle += da * Math.min(1, dt * 6);
    }

    // ---- 开火（落点弹：锁定当前位置+散布，飞过去结算） ----
    if (firing && weapon && e.cooldown <= 0 && e.done && e.engagedId != null) {
      const t = w.entities.get(e.engagedId);
      if (t) {
        const mx = e.x + Math.cos(e.turretAngle) * (e.radius() + 3);
        const my = e.y + Math.sin(e.turretAngle) * (e.radius() + 3);
        const spread = weapon.spread ?? 4;
        w.projectiles.push({
          x: mx, y: my,
          tx: t.x + (Math.random() - 0.5) * 2 * spread,
          ty: t.y + (Math.random() - 0.5) * 2 * spread,
          speed: PROJ_SPEED[weapon.projectile],
          damage: effDamage,
          splash: weapon.splash ?? 0,
          hitRadius: weapon.projectile === 'bullet' ? 10 : weapon.projectile === 'fire' ? 9 : 12,
          targetsAir: weapon.targetsAir === true,
          kind: weapon.projectile,
          owner: e.owner,
          aimId: t.id,
          travel: 0,
        });
        w.addFx(mx, my, 'muzzle', weapon.projectile === 'cannon' ? 15 : 9, 0.08, e.turretAngle);
        e.cooldown = weapon.cooldown;
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
      if (p.kind === 'explosive') {
        // 特殊爆炸弹：溅射伤害 + 地面火区（持续灼烧+视觉火焰）
        splashDamage(w, p.tx, p.ty, p.splash, p.damage, p.owner, p.targetsAir, p.kind);
        spawnFireZone(w, p.tx, p.ty, p.splash * 1.2, p.owner);
        w.addFx(p.tx, p.ty, 'boom', p.splash * 1.3, 0.6);
        w.addFx(p.tx, p.ty, 'mark', 0, 2.5, undefined, undefined, '#ff6a2a');
      } else if (p.splash > 0) {
        splashDamage(w, p.tx, p.ty, p.splash, p.damage, p.owner, p.targetsAir, p.kind);
        if (p.kind === 'fire') igniteAt(w, p.tx, p.ty, p.splash, p.owner);
        w.addFx(p.tx, p.ty, 'boom', p.splash, 0.45);
      } else {
        const hitEnt = impactDamage(w, p.tx, p.ty, p.hitRadius, p.damage, p.owner, p.targetsAir, p.aimId, p.kind);
        if (hitEnt && p.kind === 'fire') {
          hitEnt.burnUntil = w.time + 4;
          hitEnt.burnDps = Math.max(6, p.damage * 0.5);
          hitEnt.burnFrom = p.owner;
        }
        w.addFx(p.tx, p.ty, hitEnt ? 'hit' : 'hit', hitEnt ? 7 : 3, 0.18);
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
function impactDamage(w: World, x: number, y: number, radius: number, dmg: number, owner: number, targetsAir: boolean, aimId: number, dmgType: string): Entity | null {
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
  if (best) { damage(w, best, dmg, owner, dmgType); return best; }
  return null;
}

function splashDamage(w: World, x: number, y: number, radius: number, dmg: number, owner: number, targetsAir: boolean, dmgType: string): void {
  for (const o of w.entities.values()) {
    if (o.owner === owner) continue;
    if (!targetsAir && isAir(o)) continue;
    const d = dist(x, y, o.x, o.y) - o.radius();
    if (d <= radius) damage(w, o, dmg, owner, dmgType);
  }
}

/**
 * 伤害结算管线：护盾改道 → 伤害矩阵（弹种×装甲）→ 扣血 → 击杀赏金 → 移除
 */
export function damage(w: World, target: Entity, amount: number, fromOwner?: number, dmgType?: string): void {
  let remaining = amount;

  // 护盾改道：范围内有友方护盾发生器且有护盾值 → 先扣盾
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

  // 伤害矩阵：弹种 × 装甲
  if (dmgType) {
    const armor = armorOf(target);
    remaining *= (DMG_MATRIX[dmgType]?.[armor] ?? 1);
  }

  target.hp -= remaining;

  // 击杀赏金：野生动物/蛮族/营地被消灭时，击杀方获得资源
  if (target.hp <= 0) {
    if (fromOwner != null && fromOwner <= 1) {
      const bounty = target.kind === 'unit' ? UNIT_DEFS[target.defId]?.bounty : BUILDING_DEFS[target.defId]?.bounty;
      if (bounty) {
        for (const [res, v] of Object.entries(bounty) as [Res, number][]) {
          if (v) w.addRes(fromOwner, res, v);
        }
        w.addLog('econ', `缴获战利品：${Object.entries(bounty).map(([k, v]) => (k === 'wood' ? '木' : k === 'food' ? '食' : '矿') + v).join(' ')}`, fromOwner, 'bounty:' + target.id, 10);
      }
    }
    w.removeEntity(target.id);
  }
}
