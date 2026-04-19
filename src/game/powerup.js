// Powerup: floating pickup that drifts, magnetizes to nearby player, expires.

import { Entity } from "../engine/entity.js";
import { DRONE_COUNT, DURATION } from "./tiers.js";

const TTL = 12;
const MAGNET_RANGE = 120;
const MAGNET_ACCEL = 380;
const DRIFT_SPEED = 20;
const FADE_START = 2.0;
const PICKUP_RADIUS = 14;

const KIND_COLORS = {
  rapidfire: "#22e4ff",
  spread: "#ff3df0",
  pierce: "#ffffff",
  shield: "#ffd84d",
  heal: "#7dff5c",
  bomb: "#ff5a5a",
  drone: "#7ee7ff",
};

const KIND_GLYPHS = {
  rapidfire: "R",
  spread: "S",
  pierce: "P",
  shield: "H",
  heal: "+",
  bomb: "B",
  drone: "D",
};

const DROP_ODDS = {
  chaser: 0.15,
  splitter: 0.2,
  bruiser: 0.4,
  shooter: 0.25,
  mini: 0.05,
  boss: 1.0,
};

const KIND_POOL = ["rapidfire", "spread", "pierce", "shield", "heal", "bomb", "drone"];

const KIND_WEIGHTS = {
  rapidfire: 18,
  spread: 18,
  pierce: 18,
  shield: 16,
  heal: 14,
  bomb: 11,
  drone: 5,
};

export class Powerup extends Entity {
  constructor({ kind = "rapidfire", x = 0, y = 0 } = {}) {
    super({ x, y, radius: PICKUP_RADIUS });
    this.kind = kind;
    this.ttl = TTL;
    this.bobPhase = Math.random() * Math.PI * 2;
    const angle = Math.random() * Math.PI * 2;
    this.vel.x = Math.cos(angle) * DRIFT_SPEED;
    this.vel.y = Math.sin(angle) * DRIFT_SPEED;
  }

  update(dt, game) {
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.alive = false;
      return;
    }
    this.bobPhase += dt * 3;

    const player = game?.player;
    if (player && player.alive) {
      const dx = player.pos.x - this.pos.x;
      const dy = player.pos.y - this.pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < MAGNET_RANGE * MAGNET_RANGE) {
        const dist = Math.sqrt(distSq) || 1;
        this.vel.x += (dx / dist) * MAGNET_ACCEL * dt;
        this.vel.y += (dy / dist) * MAGNET_ACCEL * dt;
      }
    }

    const maxSpeed = 320;
    const sp = Math.hypot(this.vel.x, this.vel.y);
    if (sp > maxSpeed) {
      this.vel.x = (this.vel.x / sp) * maxSpeed;
      this.vel.y = (this.vel.y / sp) * maxSpeed;
    } else {
      const drag = Math.exp(-0.6 * dt);
      this.vel.x *= drag;
      this.vel.y *= drag;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    if (game?.canvas) {
      const w = game.canvas.width;
      const h = game.canvas.height;
      const r = this.radius;
      if (this.pos.x < r) { this.pos.x = r; this.vel.x = Math.abs(this.vel.x) * 0.5; }
      if (this.pos.y < r) { this.pos.y = r; this.vel.y = Math.abs(this.vel.y) * 0.5; }
      if (this.pos.x > w - r) { this.pos.x = w - r; this.vel.x = -Math.abs(this.vel.x) * 0.5; }
      if (this.pos.y > h - r) { this.pos.y = h - r; this.vel.y = -Math.abs(this.vel.y) * 0.5; }
    }

    if (player && player.alive) {
      const dx = player.pos.x - this.pos.x;
      const dy = player.pos.y - this.pos.y;
      const r = player.radius + this.radius;
      if (dx * dx + dy * dy <= r * r) {
        this.alive = false;
        if (typeof game.onPickup === "function") game.onPickup(this.kind, this.pos.x, this.pos.y);
      }
    }
  }

  render(ctx) {
    const color = KIND_COLORS[this.kind] || "#fff";
    const glyph = KIND_GLYPHS[this.kind] || "?";
    const bob = Math.sin(this.bobPhase) * 2;
    const pulse = 1 + Math.sin(this.bobPhase * 1.5) * 0.1;
    const alpha = this.ttl < FADE_START ? Math.max(0, this.ttl / FADE_START) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y + bob, this.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y + bob, this.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, this.pos.x, this.pos.y + bob);
    ctx.restore();
  }
}

function weightedPick() {
  let total = 0;
  for (const k of KIND_POOL) total += KIND_WEIGHTS[k] ?? 0;
  if (total <= 0) return KIND_POOL[Math.floor(Math.random() * KIND_POOL.length)];
  let r = Math.random() * total;
  for (const k of KIND_POOL) {
    const w = KIND_WEIGHTS[k] ?? 0;
    if (r < w) return k;
    r -= w;
  }
  return KIND_POOL[KIND_POOL.length - 1];
}

export function maybeDrop(enemyType) {
  const odds = DROP_ODDS[enemyType];
  if (odds == null) return null;
  if (Math.random() >= odds) return null;
  return weightedPick();
}

export function randomKind() {
  return weightedPick();
}

export function applyPowerup(game, kind) {
  if (!game || !kind) return;
  switch (kind) {
    case "rapidfire":
    case "spread":
    case "pierce":
      if (game.buffs) game.buffs.addBuff(kind);
      break;
    case "shield":
      if (game.buffs) game.buffs.addBuff("shield");
      break;
    case "heal":
      if (game.player) {
        game.player.health = Math.min(game.player.maxHealth, game.player.health + 1);
        if (game.hud) game.hud.setHealth(game.player.health, game.player.maxHealth);
      }
      break;
    case "bomb":
      if (typeof game.applyBomb === "function") game.applyBomb();
      break;
    case "drone":
      if (game.buffs) {
        game.buffs.addBuff("drone", DURATION.drone[1]);
        const tier = game.buffs.getTier("drone") || 1;
        if (game.drones && typeof game.drones.setActive === "function") {
          game.drones.setActive(DRONE_COUNT[tier] ?? 1, tier);
        }
      }
      break;
    default:
      break;
  }
}

export { KIND_COLORS, KIND_GLYPHS, KIND_POOL };
