// Game: ties player, enemies, bullets, waves, collision, particles, audio,
// scoring/combo, screen shake, and the state machine together.
// V2 adds: powerups, buffs, boss, enemy bullets, starfield, floaters, settings.
// V3 adds: drones, hit-stop, tier-aware buffs, plus placeholders for medals,
// bonus meteor waves, and leaderboard populated by workers 2/3/main.

import { EntityPool } from "../engine/entity.js";
import { Player } from "./player.js";
import { WaveManager } from "./waves.js";
import { ParticleSystem } from "./particles.js";
import { AudioBus } from "./audio.js";
import { resolveCollisions } from "./collision.js";
import { BuffManager } from "./buffs.js";
import { Powerup, maybeDrop, applyPowerup, randomKind } from "./powerup.js";
import { Starfield } from "./starfield.js";
import { FloaterPool } from "./floaters.js";
import { loadSettings } from "./settings.js";
import { DronePool } from "./drones.js";
import { HitStop } from "./hitstop.js";
import { MedalPool } from "./medals.js";
import { BonusWaveManager } from "./bonus.js";

export const GameState = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAMEOVER: "gameover",
};

const COMBO_WINDOW = 2.0;
const SHAKE_DECAY = 10;
const MEDAL_DROP_CHANCE = 0.25;

const COMBO_COLORS = ["#ffffff", "#22e4ff", "#ff3df0", "#ffd84d"];

function comboColor(mult) {
  if (mult <= 1) return COMBO_COLORS[0];
  if (mult === 2) return COMBO_COLORS[1];
  if (mult === 3) return COMBO_COLORS[2];
  return COMBO_COLORS[3];
}

export class Game {
  constructor({ canvas, input, hud, highscore } = {}) {
    this.canvas = canvas;
    this.input = input;
    this.hud = hud;
    this.highscore = highscore;

    this.state = GameState.MENU;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;

    this.player = new Player();
    this.enemies = new EntityPool();
    this.bullets = new EntityPool();
    this.particles = new ParticleSystem();
    this.waves = new WaveManager();
    this.audio = new AudioBus();

    this.powerups = new EntityPool();
    this.enemyBullets = new EntityPool();
    this.buffs = new BuffManager();
    this.boss = null;
    this.starfield = new Starfield(canvas?.width ?? 1280, canvas?.height ?? 720);
    this.floaters = new FloaterPool();
    this.settings = loadSettings();

    // V3: owned by this worker.
    this.drones = new DronePool(this.player);
    this.hitstop = new HitStop();

    // V3: worker-2 owns medals + bonus wave manager (additive, null-guarded).
    this.medals = new MedalPool();
    this.bonus = new BonusWaveManager();
    // V3: leaderboard set externally by main.js / worker-3.
    this.leaderboard = null;

    // V3: perfect-wave tracking. True while current wave has dealt no damage.
    this._perfectWave = true;

    if (this.audio && typeof this.audio.setMasterVolume === "function") {
      this.audio.setMasterVolume(this.settings.volume);
    }

    this.shake = 0;
    this.time = 0;

    this.listeners = { stateChange: [] };

    // V3: reset perfect flag whenever a new wave starts. Workers 2/3/main
    // may also listen for waveStart / waveCleared.
    this.on("waveStart", () => {
      this._perfectWave = true;
    });
  }

  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  _emit(event, payload) {
    const list = this.listeners[event];
    if (!list) return;
    for (const fn of list) fn(payload);
  }

  _setState(next) {
    if (this.state === next) return;
    this.state = next;
    this._emit("stateChange", next);
  }

  start() {
    this.reset();
    if (this.audio) this.audio.resume();
    this._setState(GameState.PLAYING);
  }

  pause() {
    if (this.state === GameState.PLAYING) this._setState(GameState.PAUSED);
  }

  resume() {
    if (this.state === GameState.PAUSED) this._setState(GameState.PLAYING);
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 0;
    this.time = 0;
    this.player.reset();
    this.enemies.clear();
    this.bullets.clear();
    this.particles.clear();
    this.powerups.clear();
    this.enemyBullets.clear();
    if (this.floaters && typeof this.floaters.clear === "function") this.floaters.clear();
    if (this.buffs) this.buffs.clear();
    if (this.drones && typeof this.drones.clear === "function") this.drones.clear();
    if (this.hitstop && typeof this.hitstop.reset === "function") this.hitstop.reset();
    if (this.medals && typeof this.medals.clear === "function") this.medals.clear();
    if (this.bonus && typeof this.bonus.reset === "function") this.bonus.reset();
    this.boss = null;
    this.waves.reset();
    this._perfectWave = true;
    this._syncHud();
  }

  setBossActive(boss) {
    this.boss = boss || null;
  }

  _syncHud() {
    if (!this.hud) return;
    this.hud.setScore(this.score);
    this.hud.setWave(this.waves.current);
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.hud.setCombo(this._multiplier());
    if (this.leaderboard && typeof this.leaderboard.top === "function") {
      this.hud.setBest(this.leaderboard.top() ?? 0);
    } else if (this.highscore) {
      this.hud.setBest(this.highscore.get());
    }
    if (typeof this.hud.setBuffs === "function") this.hud.setBuffs(this.buffs.active());
    if (typeof this.hud.setDashReady === "function") this.hud.setDashReady(this.player.dashReady);
    if (typeof this.hud.setBossHealth === "function") this.hud.setBossHealth(null);
  }

  _multiplier() {
    return 1 + Math.floor(this.combo / 5);
  }

  onEnemyKilled(enemy) {
    const prevMult = this._multiplier();
    const gained = enemy.score * prevMult;
    this.score += gained;
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    this.shake = Math.min(12, this.shake + 3);
    this.particles.emit({
      x: enemy.pos.x,
      y: enemy.pos.y,
      color: enemy.color,
      count: 18,
      speedMin: 80,
      speedMax: 280,
      lifetime: 0.55,
      radius: 3.5,
    });
    if (this.audio) this.audio.play("explode");

    if (this.floaters && typeof this.floaters.emit === "function") {
      this.floaters.emit({
        x: enemy.pos.x,
        y: enemy.pos.y,
        text: `+${gained} x${prevMult}!`,
        color: comboColor(prevMult),
      });
    }

    const kind = maybeDrop(enemy.type);
    if (kind) {
      this.powerups.add(new Powerup({ kind, x: enemy.pos.x, y: enemy.pos.y }));
    }

    // V3: combo multiplier bump hit-stop.
    const newMult = this._multiplier();
    if (newMult > prevMult && newMult >= 2 && this.hitstop) {
      this.hitstop.trigger(80, 0.2);
    }

    // V3: medal drop (non-boss enemies only; boss uses onBossDefeated).
    if (this.medals && typeof this.medals.maybeSpawn === "function" && enemy.type !== "boss") {
      if (Math.random() < MEDAL_DROP_CHANCE) {
        this.medals.maybeSpawn(enemy.pos.x, enemy.pos.y, this.waves.current);
      }
    }

    if (this.hud) {
      this.hud.setScore(this.score);
      this.hud.setCombo(this._multiplier());
    }
  }

  onBossDefeated(boss) {
    if (!boss) return;
    // V3: bigger hit-stop on boss death, applied before FX.
    if (this.hitstop) this.hitstop.trigger(180, 0.1);

    this.score += 500;
    this.shake = Math.min(32, this.shake + 20);
    this.particles.emit({
      x: boss.pos.x,
      y: boss.pos.y,
      color: boss.color || "#ff66aa",
      count: 80,
      speedMin: 140,
      speedMax: 520,
      lifetime: 0.9,
      radius: 4.5,
    });
    if (this.audio) this.audio.play("explode");

    if (this.floaters && typeof this.floaters.emit === "function") {
      this.floaters.emit({
        x: boss.pos.x,
        y: boss.pos.y,
        text: "BOSS DEFEATED",
        color: "#ffd84d",
        size: "big",
      });
    }

    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2 + Math.random() * 0.4;
      const r = 40;
      const x = boss.pos.x + Math.cos(angle) * r;
      const y = boss.pos.y + Math.sin(angle) * r;
      this.powerups.add(new Powerup({ kind: randomKind(), x, y }));
    }

    this.boss = null;
    if (this.hud) {
      this.hud.setScore(this.score);
      if (typeof this.hud.setBossHealth === "function") this.hud.setBossHealth(null);
    }
  }

  onWaveCleared(wave, wasPerfect) {
    this._emit("waveCleared", { wave, perfect: wasPerfect === true });
  }

  applyBomb() {
    const enemies = this.enemies.items;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      const killed = typeof e.takeDamage === "function" ? e.takeDamage(3) : false;
      if (killed) this.onEnemyKilled(e);
    }
    if (this.boss && this.boss.alive && typeof this.boss.takeDamage === "function") {
      const killed = this.boss.takeDamage(3);
      if (killed) this.onBossDefeated(this.boss);
    }
    this.enemyBullets.clear();
    this.particles.emit({
      x: this.player.pos.x,
      y: this.player.pos.y,
      color: "#ff5a5a",
      count: 120,
      speedMin: 220,
      speedMax: 720,
      lifetime: 0.85,
      radius: 4,
    });
    this.shake = Math.min(32, this.shake + 20);
    if (this.audio) this.audio.play("explode");
  }

  onPickup(kind, x, y) {
    applyPowerup(this, kind);
    this.particles.emit({
      x: x ?? this.player.pos.x,
      y: y ?? this.player.pos.y,
      color: "#fff",
      count: 14,
      speedMin: 80,
      speedMax: 260,
      lifetime: 0.45,
      radius: 3,
    });
    if (this.floaters && typeof this.floaters.emit === "function") {
      this.floaters.emit({
        x: x ?? this.player.pos.x,
        y: y ?? this.player.pos.y,
        text: String(kind).toUpperCase(),
        color: "#ffd84d",
      });
    }
    if (this.audio) this.audio.play("wave");
  }

  onPlayerHit(enemy) {
    if (this.buffs && this.buffs.consumeShield()) {
      this.shake = Math.min(18, this.shake + 6);
      this.particles.emit({
        x: this.player.pos.x,
        y: this.player.pos.y,
        color: "#ffd84d",
        count: 24,
        speedMin: 100,
        speedMax: 320,
        lifetime: 0.5,
        radius: 3.5,
      });
      if (enemy && typeof enemy.pos?.x === "number") {
        const dx = this.player.pos.x - enemy.pos.x;
        const dy = this.player.pos.y - enemy.pos.y;
        const len = Math.hypot(dx, dy) || 1;
        this.player.knockback.x = (dx / len) * 240;
        this.player.knockback.y = (dy / len) * 240;
      }
      this.player.invuln = Math.max(this.player.invuln, 0.6);
      if (this.audio) this.audio.play("hit");
      if (this.floaters && typeof this.floaters.emit === "function") {
        this.floaters.emit({
          x: this.player.pos.x,
          y: this.player.pos.y,
          text: "BLOCKED",
          color: "#ffd84d",
        });
      }
      return;
    }

    // V3: actual damage clears perfect-wave flag (shield block does not).
    this._perfectWave = false;

    this.combo = 0;
    this.comboTimer = 0;
    this.shake = Math.min(22, this.shake + 10);
    this.particles.emit({
      x: this.player.pos.x,
      y: this.player.pos.y,
      color: "#f44",
      count: 22,
      speedMin: 100,
      speedMax: 320,
      lifetime: 0.6,
      radius: 3.5,
    });
    if (this.audio) this.audio.play("hurt");
    if (this.hud) {
      this.hud.setHealth(this.player.health, this.player.maxHealth);
      this.hud.setCombo(this._multiplier());
    }
    if (!this.player.alive || this.player.health <= 0) {
      this._gameOver();
    }
  }

  _gameOver() {
    let rank = null;
    if (this.leaderboard && typeof this.leaderboard.submit === "function") {
      const res = this.leaderboard.submit(this.score);
      if (res && typeof res.rank === "number") rank = res.rank;
      if (this.hud && typeof this.leaderboard.top === "function") {
        this.hud.setBest(this.leaderboard.top() ?? 0);
      }
    } else if (this.highscore) {
      this.highscore.submit(this.score);
      if (this.hud) this.hud.setBest(this.highscore.get());
    }
    if (this.hud && typeof this.hud.setFinalScore === "function") {
      this.hud.setFinalScore(this.score, rank);
    }
    if (this.audio) this.audio.play("gameover");
    this._setState(GameState.GAMEOVER);
  }

  update(dt) {
    if (this.state !== GameState.PLAYING) return;

    // V3: hit-stop scaled dt drives game-world updates. UI / starfield
    // still use raw dt so they don't visibly freeze.
    const scaled = this.hitstop ? this.hitstop.sample(dt) : dt;
    if (this.hitstop) this.hitstop.tick(dt);

    this.time += scaled;

    if (this.audio && typeof this.audio.setMasterVolume === "function") {
      this.audio.setMasterVolume(this.settings.volume);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= scaled;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        if (this.hud) this.hud.setCombo(this._multiplier());
      }
    }

    if (this.shake > 0) {
      this.shake *= Math.exp(-SHAKE_DECAY * dt);
      if (this.shake < 0.05) this.shake = 0;
    }

    const prevWave = this.waves.current;

    if (this.starfield && typeof this.starfield.update === "function") {
      this.starfield.update(dt);
    }
    if (this.buffs) this.buffs.tick(scaled);

    this.player.update(scaled, this);

    const bullets = this.bullets.items;
    for (let i = 0; i < bullets.length; i++) bullets[i].update(scaled, this);

    if (this.drones && typeof this.drones.update === "function") {
      this.drones.update(scaled, this);
    }

    const enemies = this.enemies.items;
    for (let i = 0; i < enemies.length; i++) enemies[i].update(scaled, this);

    const eb = this.enemyBullets.items;
    for (let i = 0; i < eb.length; i++) eb[i].update(scaled, this);

    const pus = this.powerups.items;
    for (let i = 0; i < pus.length; i++) pus[i].update(scaled, this);

    if (this.boss && this.boss.alive && typeof this.boss.update === "function") {
      this.boss.update(scaled, this);
    }

    if (this.medals && typeof this.medals.update === "function") {
      this.medals.update(scaled, this);
    }

    resolveCollisions(this);

    if (this.bonus && typeof this.bonus.isActive === "function" && this.bonus.isActive()) {
      if (typeof this.bonus.update === "function") this.bonus.update(scaled, this);
    } else {
      this.waves.update(scaled, this);
    }
    if (this.waves.current !== prevWave) {
      if (this.audio) this.audio.play("wave");
      this.shake = Math.min(18, this.shake + 6);
    }

    this.particles.update(scaled);
    if (this.floaters && typeof this.floaters.update === "function") this.floaters.update(scaled);

    this.bullets.filterAlive();
    this.enemies.filterAlive();
    this.enemyBullets.filterAlive();
    this.powerups.filterAlive();

    if (this.boss && !this.boss.alive) {
      this.boss = null;
    }

    if (this.hud) {
      if (typeof this.hud.setBuffs === "function") this.hud.setBuffs(this.buffs.active());
      if (typeof this.hud.setDashReady === "function") this.hud.setDashReady(this.player.dashReady);
      if (typeof this.hud.setBossHealth === "function") {
        this.hud.setBossHealth(this.boss ? Math.max(0, this.boss.health / this.boss.maxHealth) : null);
      }
    }

    if (!this.player.alive) {
      this._gameOver();
    }
  }

  _drawGrid(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const step = 64;
    ctx.save();
    ctx.strokeStyle = "rgba(80, 180, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  render() {
    const ctx = this.canvas?.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = "#070712";
    ctx.fillRect(0, 0, w, h);

    let ox = 0;
    let oy = 0;
    if (this.shake > 0.1 && this.settings.shake !== false) {
      ox = (Math.random() - 0.5) * this.shake;
      oy = (Math.random() - 0.5) * this.shake;
      ctx.translate(ox, oy);
    }

    if (this.starfield && typeof this.starfield.render === "function") {
      this.starfield.render(ctx);
    }

    this._drawGrid(ctx);

    if (this.state !== GameState.MENU) {
      const pus = this.powerups.items;
      for (let i = 0; i < pus.length; i++) pus[i].render(ctx);

      if (this.medals && typeof this.medals.render === "function") {
        this.medals.render(ctx);
      }

      const bullets = this.bullets.items;
      for (let i = 0; i < bullets.length; i++) bullets[i].render(ctx);

      const enemies = this.enemies.items;
      for (let i = 0; i < enemies.length; i++) enemies[i].render(ctx);

      if (this.drones && typeof this.drones.render === "function") {
        this.drones.render(ctx);
      }

      if (this.boss && this.boss.alive && typeof this.boss.render === "function") {
        this.boss.render(ctx);
      }

      const eb = this.enemyBullets.items;
      for (let i = 0; i < eb.length; i++) eb[i].render(ctx);

      if (this.player.alive || this.state === GameState.GAMEOVER) {
        this.player.render(ctx);
      }

      this.particles.render(ctx);

      if (this.bonus && typeof this.bonus.render === "function") {
        this.bonus.render(ctx);
      }

      if (this.floaters && typeof this.floaters.render === "function") {
        this.floaters.render(ctx);
      }
    }

    ctx.restore();
  }
}
