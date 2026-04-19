// Bullet: straight-line projectile rendered as a short neon tracer.
// Supports a pierce budget: pass-through hits remaining before the bullet dies.

import { Entity } from "../engine/entity.js";

const DEFAULT_TTL = 1.2;

export class Bullet extends Entity {
  constructor(opts = {}) {
    super({ radius: 4, ...opts });
    this.damage = opts.damage ?? 1;
    this.ttl = opts.ttl ?? DEFAULT_TTL;
    this.owner = opts.owner ?? "player";
    this.color = opts.color || "#9ff";
    this.pierce = opts.pierce ?? 0;
    this._hitIds = null;
  }

  onHit(target) {
    if (target && typeof target.id === "number") {
      if (!this._hitIds) this._hitIds = new Set();
      this._hitIds.add(target.id);
    }
    if (this.pierce > 0) {
      this.pierce -= 1;
      return;
    }
    this.alive = false;
  }

  hasHit(target) {
    if (!this._hitIds || !target || typeof target.id !== "number") return false;
    return this._hitIds.has(target.id);
  }

  update(dt, game) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.alive = false;
      return;
    }
    if (game && game.canvas) {
      const w = game.canvas.width;
      const h = game.canvas.height;
      if (this.pos.x < -20 || this.pos.x > w + 20 || this.pos.y < -20 || this.pos.y > h + 20) {
        this.alive = false;
      }
    }
  }

  render(ctx) {
    const len = Math.hypot(this.vel.x, this.vel.y) || 1;
    const nx = this.vel.x / len;
    const ny = this.vel.y / len;
    const tailLen = 14;
    const x1 = this.pos.x - nx * tailLen;
    const y1 = this.pos.y - ny * tailLen;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.pierce > 0 ? 4 : 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.stroke();
    ctx.restore();
  }
}
