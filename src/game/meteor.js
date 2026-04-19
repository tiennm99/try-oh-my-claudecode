// Meteor: top-down falling tumbling rock. hp=1, +15 score on destroy.
// Does NOT damage the player; just passes through.

import { Entity } from "../engine/entity.js";

const MIN_SPEED = 160;
const MAX_SPEED = 320;
const DEFAULT_RADIUS = 18;
const METEOR_SCORE = 15;

export class Meteor extends Entity {
  constructor(opts = {}) {
    const radius = opts.radius ?? DEFAULT_RADIUS;
    super({ radius, ...opts });
    this.health = 1;
    this.maxHealth = 1;
    this.score = METEOR_SCORE;
    this.color = opts.color || "#ff9f55";
    this.spin = (Math.random() - 0.5) * 3.2;
    this.angle = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
    const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    const drift = (Math.random() - 0.5) * 40;
    this.vel.x = drift;
    this.vel.y = speed;
  }

  update(dt, game) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.angle += this.spin * dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (game?.canvas) {
      const h = game.canvas.height;
      if (this.pos.y - this.radius > h + 40) {
        this.alive = false;
      }
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.hitFlash = 0.08;
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = this.hitFlash > 0 ? "#fff" : this.color;
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    const sides = 7;
    const r = this.radius;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rad = r * (0.78 + ((i * 37) % 10) / 42);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
