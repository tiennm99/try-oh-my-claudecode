// MedalPool: rising medal pickups dropped on non-boss kills.
// Game gates the 25% drop chance; maybeSpawn unconditionally spawns.
// On pickup: +20 * comboMult score, combo += 1.

const MAX_MEDALS = 32;
const LIFETIME = 3.0;
const RISE_SPEED = 60;
const BOB_AMP = 3.5;
const BOB_FREQ = 4.5;
const MAGNET_RANGE = 160;
const MAGNET_ACCEL = 520;
const PICKUP_RADIUS = 14;
const FADE_START = 0.8;

function tierForWave(wave) {
  if (wave >= 15) return 3;
  if (wave >= 10) return 2;
  if (wave >= 5) return 1;
  return 0;
}

const TIER_COLORS = ["#cd7f32", "#c9d1d9", "#ffd84d", "#9df9ff"];

class Medal {
  constructor(x, y, wave) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = -RISE_SPEED;
    this.life = LIFETIME;
    this.alive = true;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.tier = tierForWave(wave || 1);
    this.color = TIER_COLORS[this.tier] || TIER_COLORS[0];
    this.radius = PICKUP_RADIUS;
  }
}

export class MedalPool {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  maybeSpawn(x, y, waveNumber) {
    if (this.items.length >= MAX_MEDALS) {
      this.items.shift();
    }
    this.items.push(new Medal(x, y, waveNumber));
  }

  update(dt, game) {
    const player = game?.player;
    const playerAlive = !!(player && player.alive);

    for (let i = this.items.length - 1; i >= 0; i--) {
      const m = this.items[i];
      m.life -= dt;
      if (m.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }

      m.bobPhase += dt * BOB_FREQ;

      if (playerAlive) {
        const dx = player.pos.x - m.x;
        const dy = player.pos.y - m.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < MAGNET_RANGE * MAGNET_RANGE) {
          const dist = Math.sqrt(distSq) || 1;
          m.vx += (dx / dist) * MAGNET_ACCEL * dt;
          m.vy += (dy / dist) * MAGNET_ACCEL * dt;
        }
      }

      const drag = Math.exp(-0.8 * dt);
      m.vx *= drag;
      m.vy = m.vy * drag - RISE_SPEED * (1 - drag);

      m.x += m.vx * dt;
      m.y += m.vy * dt;

      if (playerAlive) {
        const dx = player.pos.x - m.x;
        const dy = player.pos.y - m.y;
        const r = player.radius + m.radius;
        if (dx * dx + dy * dy <= r * r) {
          this._collect(m, game);
          this.items.splice(i, 1);
        }
      }
    }
  }

  _collect(medal, game) {
    const mult = typeof game?._multiplier === "function" ? game._multiplier() : 1;
    const gained = 20 * mult;
    game.score = (game.score || 0) + gained;
    game.combo = (game.combo || 0) + 1;
    if (typeof game.comboTimer === "number") {
      game.comboTimer = Math.max(game.comboTimer, 2.0);
    }
    if (game.hud) {
      if (typeof game.hud.setScore === "function") game.hud.setScore(game.score);
      if (typeof game.hud.setCombo === "function" && typeof game._multiplier === "function") {
        game.hud.setCombo(game._multiplier());
      }
    }
    if (game.floaters && typeof game.floaters.emit === "function") {
      game.floaters.emit({
        x: medal.x,
        y: medal.y,
        text: `+${gained}`,
        color: medal.color,
      });
    }
    if (game.particles && typeof game.particles.emit === "function") {
      game.particles.emit({
        x: medal.x,
        y: medal.y,
        color: medal.color,
        count: 10,
        speedMin: 60,
        speedMax: 200,
        lifetime: 0.35,
        radius: 2.5,
      });
    }
    if (game.audio && typeof game.audio.play === "function") game.audio.play("wave");
  }

  render(ctx) {
    if (this.items.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.items.length; i++) {
      const m = this.items[i];
      const alpha = m.life < FADE_START ? Math.max(0, m.life / FADE_START) : 1;
      const bob = Math.sin(m.bobPhase) * BOB_AMP;
      const y = m.y + bob;

      ctx.globalAlpha = alpha;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, y, m.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 6;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, y, m.radius * 0.45, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("M", m.x, y);
    }
    ctx.restore();
  }
}
