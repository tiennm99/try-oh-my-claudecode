// DronePool: orbital companion drones that fire toward the player's aim.
// Drones share the player's pierce buff budget via tiers.PIERCE_BUDGET.

import { Bullet } from "./bullet.js";
import { DRONE_FIRE_RATE, PIERCE_BUDGET } from "./tiers.js";

const ORBIT_RADIUS = 56;
const ORBIT_SPEED = 2.4;
const DRONE_RADIUS = 7;
const BULLET_SPEED = 520;

class Drone {
  constructor(index, total) {
    this.phase = (Math.PI * 2 * index) / Math.max(1, total);
    this.cooldown = 0.1 + index * 0.1;
    this.pos = { x: 0, y: 0 };
    this.aim = { x: 1, y: 0 };
  }
}

export class DronePool {
  constructor(player) {
    this.owner = player;
    this.drones = [];
    this.tier = 0;
    this.fireInterval = DRONE_FIRE_RATE[1];
  }

  setActive(count, tier) {
    this.tier = tier || 0;
    this.fireInterval = DRONE_FIRE_RATE[tier] ?? DRONE_FIRE_RATE[1];
    const target = Math.max(0, count | 0);
    if (this.drones.length > target) {
      this.drones.length = target;
    } else {
      while (this.drones.length < target) {
        this.drones.push(new Drone(this.drones.length, target));
      }
    }
    const total = this.drones.length;
    for (let i = 0; i < total; i++) {
      this.drones[i].phase = (Math.PI * 2 * i) / Math.max(1, total);
    }
  }

  clear() {
    this.drones.length = 0;
    this.tier = 0;
  }

  update(dt, game) {
    if (this.drones.length === 0) return;
    const player = this.owner || game?.player;
    if (!player || !player.alive) return;

    let ax = player.aim?.x ?? 1;
    let ay = player.aim?.y ?? 0;
    const mouse = game?.input?.mouse;
    if (mouse && typeof mouse.x === "number" && typeof mouse.y === "number") {
      const dx = mouse.x - player.pos.x;
      const dy = mouse.y - player.pos.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.001) {
        ax = dx / len;
        ay = dy / len;
      }
    }
    if (Math.hypot(ax, ay) < 0.001) {
      ax = 1;
      ay = 0;
    }

    const pierceTier = game?.buffs?.getTier?.("pierce") ?? 0;
    const pierce = pierceTier > 0 ? (PIERCE_BUDGET[pierceTier] ?? 0) : 0;

    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      d.phase += ORBIT_SPEED * dt;
      d.pos.x = player.pos.x + Math.cos(d.phase) * ORBIT_RADIUS;
      d.pos.y = player.pos.y + Math.sin(d.phase) * ORBIT_RADIUS;
      d.aim.x = ax;
      d.aim.y = ay;

      d.cooldown -= dt;
      if (d.cooldown <= 0 && game?.bullets) {
        d.cooldown = this.fireInterval;
        const bullet = new Bullet({
          x: d.pos.x,
          y: d.pos.y,
          vx: ax * BULLET_SPEED,
          vy: ay * BULLET_SPEED,
          owner: "drone",
          pierce,
          color: "#7ee7ff",
        });
        game.bullets.add(bullet);
      }
    }
  }

  render(ctx) {
    if (this.drones.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      const tx = d.pos.x - d.aim.x * 10;
      const ty = d.pos.y - d.aim.y * 10;
      ctx.shadowColor = "#7ee7ff";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "rgba(126, 231, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(d.pos.x, d.pos.y);
      ctx.stroke();

      ctx.shadowBlur = 18;
      ctx.fillStyle = "#7ee7ff";
      ctx.beginPath();
      ctx.moveTo(d.pos.x, d.pos.y - DRONE_RADIUS);
      ctx.lineTo(d.pos.x + DRONE_RADIUS, d.pos.y);
      ctx.lineTo(d.pos.x, d.pos.y + DRONE_RADIUS);
      ctx.lineTo(d.pos.x - DRONE_RADIUS, d.pos.y);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(d.pos.x, d.pos.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
