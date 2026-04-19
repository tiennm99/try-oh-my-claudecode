// Wave spawner: schedules enemies with stagger, advances wave when field is clear.

import { Enemy, EnemyTypes } from "./enemy.js";

const INTERMISSION = 2.0;
const SPAWN_STAGGER = 0.35;

export class WaveManager {
  constructor() {
    this.wave = 1;
    this.queue = [];
    this.spawnTimer = 0;
    this.intermission = 0;
    this.waveActive = false;
    this._buildQueue(this.wave);
  }

  reset() {
    this.wave = 1;
    this.queue.length = 0;
    this.spawnTimer = 0;
    this.intermission = 0;
    this.waveActive = false;
    this._buildQueue(this.wave);
    this.waveActive = true;
  }

  get current() {
    return this.wave;
  }

  _buildQueue(wave) {
    const q = [];
    if (wave === 1) {
      for (let i = 0; i < 8; i++) q.push(EnemyTypes.CHASER);
    } else if (wave === 2) {
      for (let i = 0; i < 10; i++) q.push(EnemyTypes.CHASER);
      for (let i = 0; i < 2; i++) q.push(EnemyTypes.BRUISER);
    } else {
      const chasers = 8 + wave * 2;
      const bruisers = Math.floor(wave / 2);
      const splitters = Math.max(0, wave - 2);
      for (let i = 0; i < chasers; i++) q.push(EnemyTypes.CHASER);
      for (let i = 0; i < bruisers; i++) q.push(EnemyTypes.BRUISER);
      for (let i = 0; i < splitters; i++) q.push(EnemyTypes.SPLITTER);
    }
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    this.queue = q;
    this.spawnTimer = 0.4;
  }

  _spawnOffscreen(type, canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    const pad = 40;
    if (edge === 0) {
      x = Math.random() * w;
      y = -pad;
    } else if (edge === 1) {
      x = w + pad;
      y = Math.random() * h;
    } else if (edge === 2) {
      x = Math.random() * w;
      y = h + pad;
    } else {
      x = -pad;
      y = Math.random() * h;
    }
    return new Enemy({ type, x, y });
  }

  update(dt, game) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) {
        this.wave += 1;
        this._buildQueue(this.wave);
        this.waveActive = true;
        if (game.hud) game.hud.setWave(this.wave);
      }
      return;
    }

    if (!this.waveActive) {
      this.waveActive = true;
    }

    if (this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const type = this.queue.shift();
        const enemy = this._spawnOffscreen(type, game.canvas);
        game.enemies.add(enemy);
        this.spawnTimer = SPAWN_STAGGER;
      }
    } else if (game.enemies.size === 0) {
      this.waveActive = false;
      this.intermission = INTERMISSION;
    }
  }
}
