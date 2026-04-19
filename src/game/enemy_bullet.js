// EnemyBullet: glowing tracer fired by shooters and the boss.
// Travels in a straight line, expires after TTL, collides only with the player.

import { Entity } from "../engine/entity.js";

const DEFAULT_TTL = 4;
const DEFAULT_SPEED = 180;
const DEFAULT_COLOR = "#ff8ac2";

export class EnemyBullet extends Entity {
  constructor(opts = {}) {
    super({ radius: opts.radius ?? 5, ...opts });
    this.damage = opts.damage ?? 1;
    this.ttl = opts.ttl ?? DEFAULT_TTL;
    this.color = opts.color ?? DEFAULT_COLOR;
    this.owner = "enemy";
  }

  update(dt, game) {
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.alive = false;
      return;
    }
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    if (game?.canvas) {
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
    const tailLen = 10;
    const x1 = this.pos.x - nx * tailLen;
    const y1 = this.pos.y - ny * tailLen;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.stroke();

    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnEnemyBullet(game, opts = {}) {
  if (!game || !game.enemyBullets) return null;
  const {
    x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    speed = DEFAULT_SPEED,
    targetX,
    targetY,
    color = DEFAULT_COLOR,
    ttl,
    radius,
    damage,
  } = opts;

  let ux = vx;
  let uy = vy;
  if (targetX != null && targetY != null) {
    const dx = targetX - x;
    const dy = targetY - y;
    const len = Math.hypot(dx, dy) || 1;
    ux = (dx / len) * speed;
    uy = (dy / len) * speed;
  }

  const bullet = new EnemyBullet({ x, y, vx: ux, vy: uy, color, ttl, radius, damage });
  game.enemyBullets.add(bullet);
  return bullet;
}
