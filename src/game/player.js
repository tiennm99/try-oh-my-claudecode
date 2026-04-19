// Player: WASD/arrow movement, mouse aim, click/space to shoot, invuln after hit.
// V2: buff-aware shooting (rapidfire/spread/pierce) + Shift dash (180ms, 900ms cd).

import { Entity } from "../engine/entity.js";
import { Bullet } from "./bullet.js";
import {
  COOLDOWN_MULT,
  PIERCE_BUDGET as PIERCE_BUDGET_TABLE,
  SPREAD as SPREAD_TABLE,
} from "./tiers.js";

const SPEED = 260;
const SHOOT_COOLDOWN = 0.14;
const INVULN_TIME = 0.9;
const KNOCKBACK_DECAY = 6;

const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 0.9;
const DASH_SPEED = 480;
const DEFAULT_SPREAD_ANGLE_DEG = 12;
const DEFAULT_PIERCE_BUDGET = 3;

export class Player extends Entity {
  constructor(opts = {}) {
    super({ x: 640, y: 360, radius: 14, ...opts });
    this.maxHealth = 3;
    this.health = 3;
    this.invuln = 0;
    this.cooldown = 0;
    this.knockback = { x: 0, y: 0 };
    this.aim = { x: 1, y: 0 };
    this.dashTime = 0;
    this.dashCooldownRemaining = 0;
    this.dashDir = { x: 1, y: 0 };
    this._dashFxTimer = 0;
  }

  get dashReady() {
    return this.dashCooldownRemaining <= 0 && this.dashTime <= 0;
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
    this.dashTime = 0;
    this.dashCooldownRemaining = 0;
    this._dashFxTimer = 0;
  }

  tryDash(game) {
    if (!this.dashReady || !this.alive) return false;

    let dx = this.vel.x;
    let dy = this.vel.y;
    if (Math.hypot(dx, dy) < 1) {
      dx = this.aim.x;
      dy = this.aim.y;
    }
    const len = Math.hypot(dx, dy) || 1;
    this.dashDir.x = dx / len;
    this.dashDir.y = dy / len;

    this.dashTime = DASH_DURATION;
    this.dashCooldownRemaining = DASH_COOLDOWN;
    this.invuln = Math.max(this.invuln, DASH_DURATION + 0.05);
    this._dashFxTimer = 0;

    if (game?.particles) {
      game.particles.emit({
        x: this.pos.x,
        y: this.pos.y,
        color: "#0ff",
        count: 5,
        speedMin: 60,
        speedMax: 180,
        lifetime: 0.3,
        radius: 3,
      });
    }
    if (game?.audio) game.audio.play("shoot");
    return true;
  }

  update(dt, game) {
    const input = game.input;
    const canvas = game.canvas;
    if (!input || !canvas) return;

    if (input.wasPressed && (input.wasPressed("ShiftLeft") || input.wasPressed("ShiftRight"))) {
      this.tryDash(game);
    }

    if (this.dashCooldownRemaining > 0) {
      this.dashCooldownRemaining = Math.max(0, this.dashCooldownRemaining - dt);
    }

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

    if (this.dashTime > 0) {
      this.vel.x = this.dashDir.x * DASH_SPEED;
      this.vel.y = this.dashDir.y * DASH_SPEED;
      this.dashTime -= dt;

      this._dashFxTimer -= dt;
      if (this._dashFxTimer <= 0 && game?.particles) {
        this._dashFxTimer = 0.035;
        game.particles.emit({
          x: this.pos.x,
          y: this.pos.y,
          color: "#7ff",
          count: 1,
          speedMin: 10,
          speedMax: 40,
          lifetime: 0.25,
          radius: 3,
        });
      }
    } else {
      this.vel.x = mx * SPEED;
      this.vel.y = my * SPEED;
    }

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
      const rapidTier = game.buffs && typeof game.buffs.getTier === "function"
        ? game.buffs.getTier("rapidfire")
        : 0;
      let mult = 1;
      if (rapidTier > 0) {
        mult = COOLDOWN_MULT[rapidTier] ?? 0.5;
      } else if (game.buffs && game.buffs.hasBuff("rapidfire")) {
        mult = 0.5;
      }
      this.cooldown = SHOOT_COOLDOWN * mult;
    }
  }

  _spawnBullet(game, angleOffset) {
    const speed = 520;
    const cos = Math.cos(angleOffset);
    const sin = Math.sin(angleOffset);
    const ax = this.aim.x * cos - this.aim.y * sin;
    const ay = this.aim.x * sin + this.aim.y * cos;
    const vx = ax * speed;
    const vy = ay * speed;
    const spawnX = this.pos.x + ax * (this.radius + 2);
    const spawnY = this.pos.y + ay * (this.radius + 2);
    const pierceTier = game.buffs && typeof game.buffs.getTier === "function"
      ? game.buffs.getTier("pierce")
      : 0;
    const pierce = pierceTier > 0
      ? (PIERCE_BUDGET_TABLE[pierceTier] ?? DEFAULT_PIERCE_BUDGET)
      : (game.buffs && game.buffs.hasBuff("pierce") ? DEFAULT_PIERCE_BUDGET : 0);
    const bullet = new Bullet({ x: spawnX, y: spawnY, vx, vy, owner: "player", pierce });
    game.bullets.add(bullet);
    return { spawnX, spawnY };
  }

  shoot(game) {
    const spreadTier = game.buffs && typeof game.buffs.getTier === "function"
      ? game.buffs.getTier("spread")
      : 0;
    const spreadActive = spreadTier > 0 || (game.buffs && game.buffs.hasBuff("spread"));
    if (spreadActive) {
      const conf = SPREAD_TABLE[spreadTier] ?? { count: 3, angleDeg: DEFAULT_SPREAD_ANGLE_DEG };
      const count = Math.max(1, conf.count);
      const angleRad = (conf.angleDeg * Math.PI) / 180;
      const step = count > 1 ? (angleRad * 2) / (count - 1) : 0;
      let centerSpawnX = this.pos.x;
      let centerSpawnY = this.pos.y;
      for (let i = 0; i < count; i++) {
        const offset = count > 1 ? -angleRad + step * i : 0;
        const { spawnX, spawnY } = this._spawnBullet(game, offset);
        if (i === Math.floor(count / 2)) {
          centerSpawnX = spawnX;
          centerSpawnY = spawnY;
        }
      }
      game.particles.emit({
        x: centerSpawnX,
        y: centerSpawnY,
        color: "#f4f",
        count: 6,
        speedMin: 40,
        speedMax: 140,
        lifetime: 0.18,
        radius: 2.5,
      });
    } else {
      const { spawnX, spawnY } = this._spawnBullet(game, 0);
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
    }
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
    ctx.shadowBlur = this.dashTime > 0 ? 32 : 22;
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
