// Enemy types: chaser, bruiser, splitter. All seek the player.

import { Entity } from "../engine/entity.js";

export const EnemyTypes = {
  CHASER: "chaser",
  BRUISER: "bruiser",
  SPLITTER: "splitter",
  MINI: "mini",
};

const STATS = {
  chaser: { speed: 110, hp: 1, radius: 12, color: "#f3f", score: 10 },
  bruiser: { speed: 55, hp: 4, radius: 22, color: "#ff3", score: 40 },
  splitter: { speed: 90, hp: 2, radius: 18, color: "#8f4", score: 25 },
  mini: { speed: 140, hp: 1, radius: 8, color: "#f8c", score: 5 },
};

export class Enemy extends Entity {
  constructor(opts = {}) {
    const type = opts.type || EnemyTypes.CHASER;
    const s = STATS[type] || STATS.chaser;
    super({ radius: s.radius, ...opts });
    this.type = type;
    this.speed = s.speed;
    this.maxHealth = s.hp;
    this.health = s.hp;
    this.color = s.color;
    this.score = s.score;
    this.hitFlash = 0;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update(dt, game) {
    const target = game.player;
    if (!target) return;
    const dx = target.pos.x - this.pos.x;
    const dy = target.pos.y - this.pos.y;
    const len = Math.hypot(dx, dy) || 1;
    this.vel.x = (dx / len) * this.speed;
    this.vel.y = (dy / len) * this.speed;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.wobble += dt * 4;
    if (this.hitFlash > 0) this.hitFlash -= dt;
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
    const wob = 1 + Math.sin(this.wobble) * 0.06;
    const r = this.radius * wob;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = this.hitFlash > 0 ? "#fff" : this.color;
    ctx.beginPath();
    if (this.type === EnemyTypes.BRUISER) {
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + this.wobble * 0.3;
        const x = this.pos.x + Math.cos(a) * r;
        const y = this.pos.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (this.type === EnemyTypes.SPLITTER) {
      const sides = 4;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + this.wobble * 0.4;
        const x = this.pos.x + Math.cos(a) * r;
        const y = this.pos.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}

export function spawnSplitterChildren(parent) {
  const children = [];
  for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const offset = parent.radius * 0.6;
    const child = new Enemy({
      type: EnemyTypes.MINI,
      x: parent.pos.x + Math.cos(angle) * offset,
      y: parent.pos.y + Math.sin(angle) * offset,
    });
    children.push(child);
  }
  return children;
}
