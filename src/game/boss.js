// Boss: large hex/diamond enemy with two attack patterns.
// - Every 3s: 8-way radial burst of enemy bullets.
// - Every 1.5s: aimed 3-shot fan at the player (+/-10 deg).
// When HP <= 33% of max, both cadences multiply by 0.6 (fire faster).

import { Entity } from "../engine/entity.js";
import { spawnEnemyBullet } from "./enemy_bullet.js";

const BOSS_RADIUS = 48;
const BOSS_SPEED_X = 90;
const BOSS_SPEED_Y = 10;
const BOSS_COLOR = "#ff66aa";
const BULLET_SPEED = 180;

const RADIAL_INTERVAL = 3.0;
const AIMED_INTERVAL = 1.5;
const RAGE_CADENCE = 0.6;
const AIM_FAN = (10 * Math.PI) / 180;

export class Boss extends Entity {
  constructor(opts = {}) {
    super({
      x: opts.x ?? 640,
      y: opts.y ?? 120,
      radius: opts.radius ?? BOSS_RADIUS,
    });
    const hp = opts.hp ?? 40;
    this.maxHealth = hp;
    this.health = hp;
    // Aliases for design-doc naming.
    this.maxHp = hp;
    this.hp = hp;
    this.score = opts.score ?? 500;
    this.color = opts.color ?? BOSS_COLOR;
    this.type = "boss";
    this.alive = true;

    this._sinePhase = Math.random() * Math.PI * 2;
    this._baseX = this.pos.x;
    this._radialTimer = RADIAL_INTERVAL * 0.6;
    this._aimedTimer = AIMED_INTERVAL * 0.6;
    this.hitFlash = 0;
    this.wobble = 0;
  }

  _inRage() {
    return this.health <= this.maxHealth / 3;
  }

  update(dt, game) {
    if (!this.alive) return;

    this.wobble += dt * 2;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    this._sinePhase += dt * 0.9;
    const canvasW = game?.canvas?.width ?? 1280;
    const canvasH = game?.canvas?.height ?? 720;
    const amp = Math.min(280, canvasW * 0.3);
    const midX = canvasW / 2;

    this.pos.x = midX + Math.sin(this._sinePhase) * amp;
    if (this.pos.y < canvasH * 0.32) {
      this.pos.y += BOSS_SPEED_Y * dt;
    }
    const r = this.radius;
    if (this.pos.x < r) this.pos.x = r;
    if (this.pos.x > canvasW - r) this.pos.x = canvasW - r;

    const rage = this._inRage() ? RAGE_CADENCE : 1;

    this._radialTimer -= dt;
    if (this._radialTimer <= 0) {
      this._radialTimer = RADIAL_INTERVAL * rage;
      this._fireRadial(game);
    }

    this._aimedTimer -= dt;
    if (this._aimedTimer <= 0) {
      this._aimedTimer = AIMED_INTERVAL * rage;
      this._fireAimed(game);
    }
  }

  _fireRadial(game) {
    if (!game) return;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      spawnEnemyBullet(game, {
        x: this.pos.x,
        y: this.pos.y,
        vx: Math.cos(a) * BULLET_SPEED,
        vy: Math.sin(a) * BULLET_SPEED,
        color: this.color,
      });
    }
    if (game.audio?.play) game.audio.play("shoot");
  }

  _fireAimed(game) {
    if (!game?.player) return;
    const px = game.player.pos.x;
    const py = game.player.pos.y;
    const dx = px - this.pos.x;
    const dy = py - this.pos.y;
    const len = Math.hypot(dx, dy) || 1;
    const baseX = dx / len;
    const baseY = dy / len;
    const offsets = [-AIM_FAN, 0, AIM_FAN];
    for (const off of offsets) {
      const cos = Math.cos(off);
      const sin = Math.sin(off);
      const ax = baseX * cos - baseY * sin;
      const ay = baseX * sin + baseY * cos;
      spawnEnemyBullet(game, {
        x: this.pos.x + ax * (this.radius + 4),
        y: this.pos.y + ay * (this.radius + 4),
        vx: ax * BULLET_SPEED,
        vy: ay * BULLET_SPEED,
        color: this.color,
      });
    }
    if (game.audio?.play) game.audio.play("shoot");
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    this.hp = this.health;
    this.hitFlash = 0.12;
    if (this.health <= 0) {
      this.health = 0;
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  render(ctx) {
    const r = this.radius;
    const flashing = this.hitFlash > 0;
    const color = flashing ? "#ffffff" : this.color;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 36;

    // Outer hex.
    ctx.strokeStyle = color;
    ctx.fillStyle = flashing ? "rgba(255,255,255,0.6)" : "rgba(255,102,170,0.18)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + this.wobble * 0.2;
      const x = this.pos.x + Math.cos(a) * r;
      const y = this.pos.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner diamond.
    ctx.shadowBlur = 22;
    ctx.beginPath();
    const inner = r * 0.62;
    const diaPhase = -this.wobble * 0.4;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + diaPhase;
      const x = this.pos.x + Math.cos(a) * inner;
      const y = this.pos.y + Math.sin(a) * inner;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Segmented inner core — slices shown by remaining HP.
    const segments = 6;
    const frac = Math.max(0, this.health / this.maxHealth);
    const filled = Math.ceil(segments * frac);
    const coreR = r * 0.36;
    ctx.shadowBlur = 12;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2 + this.wobble * 0.5;
      const a1 = ((i + 1) / segments) * Math.PI * 2 + this.wobble * 0.5;
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.arc(this.pos.x, this.pos.y, coreR, a0, a1);
      ctx.closePath();
      if (i < filled) {
        ctx.fillStyle = flashing ? "#ffffff" : this.color;
        ctx.fill();
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Glow center pip.
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnBoss(game, wave) {
  const w = game?.canvas?.width ?? 1280;
  const waveNum = typeof wave === "number" ? wave : (game?.waves?.current ?? 1);
  const hp = 40 + 20 * Math.floor(waveNum / 5);
  const b = new Boss({
    x: w / 2,
    y: 120,
    hp,
  });
  b.alive = true;
  return b;
}
