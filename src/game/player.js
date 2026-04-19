// Player: WASD/arrow movement, mouse aim, click/space to shoot, invuln after hit.

import { Entity } from "../engine/entity.js";
import { Bullet } from "./bullet.js";

const SPEED = 260;
const SHOOT_COOLDOWN = 0.14;
const INVULN_TIME = 0.9;
const KNOCKBACK_DECAY = 6;

export class Player extends Entity {
  constructor(opts = {}) {
    super({ x: 640, y: 360, radius: 14, ...opts });
    this.maxHealth = 3;
    this.health = 3;
    this.invuln = 0;
    this.cooldown = 0;
    this.knockback = { x: 0, y: 0 };
    this.aim = { x: 1, y: 0 };
  }

  reset() {
    this.health = this.maxHealth;
    this.pos.x = 640;
    this.pos.y = 360;
    this.vel.x = 0;
    this.vel.y = 0;
    this.invuln = 0;
    this.cooldown = 0;
    this.knockback.x = 0;
    this.knockback.y = 0;
    this.alive = true;
  }

  update(dt, game) {
    const input = game.input;
    const canvas = game.canvas;
    if (!input || !canvas) return;

    let mx = 0;
    let my = 0;
    if (input.anyDown(["KeyW", "ArrowUp"])) my -= 1;
    if (input.anyDown(["KeyS", "ArrowDown"])) my += 1;
    if (input.anyDown(["KeyA", "ArrowLeft"])) mx -= 1;
    if (input.anyDown(["KeyD", "ArrowRight"])) mx += 1;

    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
    }
    this.vel.x = mx * SPEED;
    this.vel.y = my * SPEED;

    this.pos.x += (this.vel.x + this.knockback.x) * dt;
    this.pos.y += (this.vel.y + this.knockback.y) * dt;

    const decay = Math.exp(-KNOCKBACK_DECAY * dt);
    this.knockback.x *= decay;
    this.knockback.y *= decay;
    if (Math.abs(this.knockback.x) < 1) this.knockback.x = 0;
    if (Math.abs(this.knockback.y) < 1) this.knockback.y = 0;

    const r = this.radius;
    if (this.pos.x < r) this.pos.x = r;
    if (this.pos.y < r) this.pos.y = r;
    if (this.pos.x > canvas.width - r) this.pos.x = canvas.width - r;
    if (this.pos.y > canvas.height - r) this.pos.y = canvas.height - r;

    const mouse = input.mouse;
    const dx = mouse.x - this.pos.x;
    const dy = mouse.y - this.pos.y;
    const aimLen = Math.hypot(dx, dy);
    if (aimLen > 0.001) {
      this.aim.x = dx / aimLen;
      this.aim.y = dy / aimLen;
    }

    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    const wantsShoot = mouse.down || input.isDown("Space");
    if (wantsShoot && this.cooldown <= 0) {
      this.shoot(game);
      this.cooldown = SHOOT_COOLDOWN;
    }
  }

  shoot(game) {
    const speed = 520;
    const vx = this.aim.x * speed;
    const vy = this.aim.y * speed;
    const spawnX = this.pos.x + this.aim.x * (this.radius + 2);
    const spawnY = this.pos.y + this.aim.y * (this.radius + 2);
    const bullet = new Bullet({ x: spawnX, y: spawnY, vx, vy, owner: "player" });
    game.bullets.add(bullet);
    game.particles.emit({
      x: spawnX,
      y: spawnY,
      color: "#7ff",
      count: 4,
      speedMin: 40,
      speedMax: 140,
      lifetime: 0.18,
      radius: 2.5,
    });
    if (game.audio) game.audio.play("shoot");
  }

  takeDamage(amount, fromX, fromY) {
    if (this.invuln > 0) return false;
    this.health -= amount;
    this.invuln = INVULN_TIME;
    if (typeof fromX === "number" && typeof fromY === "number") {
      const dx = this.pos.x - fromX;
      const dy = this.pos.y - fromY;
      const len = Math.hypot(dx, dy) || 1;
      const force = 320;
      this.knockback.x = (dx / len) * force;
      this.knockback.y = (dy / len) * force;
    }
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return true;
  }

  render(ctx) {
    const flicker = this.invuln > 0 && Math.floor(this.invuln * 24) % 2 === 0;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 22;
    ctx.fillStyle = flicker ? "#6ff" : "#0ff";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(
      this.pos.x + this.aim.x * (this.radius + 10),
      this.pos.y + this.aim.y * (this.radius + 10),
    );
    ctx.stroke();
    ctx.restore();
  }
}
