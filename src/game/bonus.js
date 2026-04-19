// BonusWaveManager: 18 s METEOR RAIN. While active, Game skips waves.update
// and bonus.update ticks instead. Meteors are owned locally; collision.js
// iterates `game.bonus?.meteors` and destroys them on bullet impact.

import { Meteor } from "./meteor.js";

const DURATION = 18.0;
const SPAWN_INTERVAL_MIN = 0.35;
const SPAWN_INTERVAL_MAX = 0.7;

export class BonusWaveManager {
  constructor() {
    this.active = false;
    this.finished = false;
    this.timer = 0;
    this.spawnTimer = 0;
    this.wave = 0;
    this.score = 0;
    this.meteors = [];
  }

  reset() {
    this.active = false;
    this.finished = false;
    this.timer = 0;
    this.spawnTimer = 0;
    this.wave = 0;
    this.score = 0;
    this.meteors.length = 0;
  }

  isActive() {
    return this.active;
  }

  isFinished() {
    return this.finished;
  }

  start(game, wave) {
    this.active = true;
    this.finished = false;
    this.timer = DURATION;
    this.spawnTimer = 0.25;
    this.wave = wave || 0;
    this.score = 0;
    this.meteors.length = 0;

    if (game?.enemies && typeof game.enemies.clear === "function") game.enemies.clear();
    if (game?.enemyBullets && typeof game.enemyBullets.clear === "function") {
      game.enemyBullets.clear();
    }

    if (game?.floaters && typeof game.floaters.emit === "function" && game.canvas) {
      game.floaters.emit({
        x: game.canvas.width / 2,
        y: game.canvas.height / 2 - 40,
        text: "BONUS: METEOR RAIN!",
        color: "#ffd84d",
        size: "big",
      });
    }
    if (game?._emit) {
      game._emit("waveStart", {
        wave: this.wave,
        isBoss: false,
        isBonus: true,
        label: "BONUS: METEOR RAIN!",
      });
    }
    if (game?.audio && typeof game.audio.play === "function") game.audio.play("wave");
  }

  onMeteorDestroyed(meteor, game) {
    const gained = meteor?.score ?? 15;
    game.score = (game.score || 0) + gained;
    this.score += gained;
    if (game.hud && typeof game.hud.setScore === "function") game.hud.setScore(game.score);
    if (game.particles && typeof game.particles.emit === "function" && meteor) {
      game.particles.emit({
        x: meteor.pos.x,
        y: meteor.pos.y,
        color: meteor.color || "#ff9f55",
        count: 22,
        speedMin: 120,
        speedMax: 360,
        lifetime: 0.55,
        radius: 3.5,
      });
    }
    if (game.floaters && typeof game.floaters.emit === "function" && meteor) {
      game.floaters.emit({
        x: meteor.pos.x,
        y: meteor.pos.y,
        text: `+${gained}`,
        color: "#ffd84d",
      });
    }
    if (game.audio && typeof game.audio.play === "function") game.audio.play("explode");
  }

  _spawn(game) {
    const canvas = game?.canvas;
    if (!canvas) return;
    const w = canvas.width;
    const x = 20 + Math.random() * (w - 40);
    const y = -30;
    const radius = 14 + Math.random() * 10;
    this.meteors.push(new Meteor({ x, y, radius }));
  }

  update(dt, game) {
    if (!this.active) return;

    this.timer -= dt;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.timer > 2.0) {
      this.spawnTimer = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
      this._spawn(game);
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (!m.alive) {
        this.meteors.splice(i, 1);
        continue;
      }
      m.update(dt, game);
      if (!m.alive) {
        this.meteors.splice(i, 1);
      }
    }

    if (this.timer <= 0) {
      this.active = false;
      this.finished = true;
      this.meteors.length = 0;

      if (game?.floaters && typeof game.floaters.emit === "function" && game.canvas) {
        game.floaters.emit({
          x: game.canvas.width / 2,
          y: game.canvas.height / 2,
          text: `WAVE CLEARED +${this.score}`,
          color: "#ffd84d",
          size: "big",
        });
      }
      if (typeof game?.onWaveCleared === "function") {
        game.onWaveCleared(this.wave, game._perfectWave === true);
      }
    }
  }

  render(ctx) {
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i];
      if (!m.alive) continue;
      m.render(ctx);
    }
  }
}
