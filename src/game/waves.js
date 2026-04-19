// Wave spawner: schedules enemies with stagger, advances when field is clear.
// V2: boss wave every 5 waves; shooters injected from wave 3+.
// V3: bonus meteor wave every 4th wave that is not a boss wave.

import { Enemy, EnemyTypes } from "./enemy.js";
import { spawnBoss } from "./boss.js";

const INTERMISSION = 2.0;
const SPAWN_STAGGER = 0.35;
const MAX_SHOOTERS = 4;

function isBossWave(wave) {
  return wave > 0 && wave % 5 === 0;
}

function isBonusWave(wave) {
  return wave > 0 && wave % 4 === 0 && wave % 5 !== 0;
}

function shooterCount(wave) {
  if (wave < 3) return 0;
  const n = 1 + Math.floor((wave - 3) / 2);
  return Math.min(MAX_SHOOTERS, n);
}

function waveLabel(wave, isBoss, isBonus) {
  if (isBonus) return "BONUS: METEOR RAIN!";
  if (isBoss) return "BOSS APPROACHING";
  if (wave === 2) return "ROLL CALL";
  if (wave === 3) return "SHOOTERS JOIN";
  return `WAVE ${wave}`;
}

export class WaveManager {
  constructor() {
    this.wave = 1;
    this.queue = [];
    this.spawnTimer = 0;
    this.intermission = 0;
    this.waveActive = false;
    this.isBoss = false;
    this.isBonus = false;
    this.bossSpawned = false;
    this.bonusStarted = false;
    this._buildQueue(this.wave);
  }

  reset() {
    this.wave = 1;
    this.queue.length = 0;
    this.spawnTimer = 0;
    this.intermission = 0;
    this.waveActive = false;
    this.isBoss = false;
    this.isBonus = false;
    this.bossSpawned = false;
    this.bonusStarted = false;
    this._buildQueue(this.wave);
    this.waveActive = true;
  }

  get current() {
    return this.wave;
  }

  _buildQueue(wave) {
    const q = [];
    this.isBoss = isBossWave(wave);
    this.isBonus = isBonusWave(wave);
    this.bossSpawned = false;
    this.bonusStarted = false;

    if (this.isBoss || this.isBonus) {
      this.queue = q;
      this.spawnTimer = 0.4;
      return;
    }

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

    const shooters = shooterCount(wave);
    for (let i = 0; i < shooters; i++) q.push(EnemyTypes.SHOOTER);

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
    // V3: bonus wave just ended — enter intermission before advancing.
    if (game?.bonus && game.bonus.finished) {
      game.bonus.finished = false;
      this.waveActive = false;
      this.isBonus = false;
      this.bonusStarted = false;
      this.intermission = INTERMISSION;
      return;
    }

    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) {
        this.wave += 1;
        this._buildQueue(this.wave);
        this.waveActive = true;
        if (game.hud) game.hud.setWave(this.wave);
        if (typeof game._emit === "function") {
          game._emit("waveStart", {
            wave: this.wave,
            isBoss: this.isBoss,
            isBonus: this.isBonus,
            label: waveLabel(this.wave, this.isBoss, this.isBonus),
          });
        }
      }
      return;
    }

    if (!this.waveActive) {
      this.waveActive = true;
    }

    if (this.isBonus) {
      if (!this.bonusStarted) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && game?.bonus && typeof game.bonus.start === "function") {
          game.bonus.start(game, this.wave);
          this.bonusStarted = true;
        }
      }
      return;
    }

    if (this.isBoss) {
      if (!this.bossSpawned) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          const boss = spawnBoss(game, this.wave);
          if (typeof game.setBossActive === "function") {
            game.setBossActive(boss);
          } else {
            game.boss = boss;
          }
          this.bossSpawned = true;
        }
        return;
      }
      if (game.boss == null) {
        this.waveActive = false;
        this.intermission = INTERMISSION;
        if (typeof game.onWaveCleared === "function") {
          game.onWaveCleared(this.wave, game._perfectWave === true);
        }
      }
      return;
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
      if (typeof game.onWaveCleared === "function") {
        game.onWaveCleared(this.wave, game._perfectWave === true);
      }
    }
  }
}
