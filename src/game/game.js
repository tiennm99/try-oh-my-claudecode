// Game: ties player, enemies, bullets, waves, collision, particles, audio,
// scoring/combo, screen shake, and the state machine together.

import { EntityPool } from "../engine/entity.js";
import { Player } from "./player.js";
import { WaveManager } from "./waves.js";
import { ParticleSystem } from "./particles.js";
import { AudioBus } from "./audio.js";
import { resolveCollisions } from "./collision.js";

export const GameState = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAMEOVER: "gameover",
};

const COMBO_WINDOW = 2.0;
const SHAKE_DECAY = 10;

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

    this.shake = 0;
    this.time = 0;

    this.listeners = { stateChange: [] };
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
    this.waves.reset();
    this._syncHud();
  }

  _syncHud() {
    if (!this.hud) return;
    this.hud.setScore(this.score);
    this.hud.setWave(this.waves.current);
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.hud.setCombo(this._multiplier());
    if (this.highscore) this.hud.setBest(this.highscore.get());
  }

  _multiplier() {
    return 1 + Math.floor(this.combo / 5);
  }

  onEnemyKilled(enemy) {
    const mult = this._multiplier();
    const gained = enemy.score * mult;
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
    if (this.hud) {
      this.hud.setScore(this.score);
      this.hud.setCombo(this._multiplier());
    }
  }

  onPlayerHit(enemy) {
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
    if (this.highscore) {
      this.highscore.submit(this.score);
      if (this.hud) this.hud.setBest(this.highscore.get());
    }
    if (this.hud && typeof this.hud.setFinalScore === "function") {
      this.hud.setFinalScore(this.score);
    }
    if (this.audio) this.audio.play("gameover");
    this._setState(GameState.GAMEOVER);
  }

  update(dt) {
    if (this.state !== GameState.PLAYING) return;
    this.time += dt;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
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

    this.player.update(dt, this);

    const bullets = this.bullets.items;
    for (let i = 0; i < bullets.length; i++) bullets[i].update(dt, this);

    const enemies = this.enemies.items;
    for (let i = 0; i < enemies.length; i++) enemies[i].update(dt, this);

    resolveCollisions(this);

    this.waves.update(dt, this);
    if (this.waves.current !== prevWave) {
      if (this.audio) this.audio.play("wave");
      this.shake = Math.min(18, this.shake + 6);
    }

    this.particles.update(dt);
    this.bullets.filterAlive();
    this.enemies.filterAlive();

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
    if (this.shake > 0.1) {
      ox = (Math.random() - 0.5) * this.shake;
      oy = (Math.random() - 0.5) * this.shake;
      ctx.translate(ox, oy);
    }

    this._drawGrid(ctx);

    if (this.state !== GameState.MENU) {
      const bullets = this.bullets.items;
      for (let i = 0; i < bullets.length; i++) bullets[i].render(ctx);

      const enemies = this.enemies.items;
      for (let i = 0; i < enemies.length; i++) enemies[i].render(ctx);

      if (this.player.alive || this.state === GameState.GAMEOVER) {
        this.player.render(ctx);
      }

      this.particles.render(ctx);
    }

    ctx.restore();
  }
}
