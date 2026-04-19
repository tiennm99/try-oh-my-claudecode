// localStorage-backed high score. Safe-guarded so the game still runs if
// storage is blocked (private mode / disabled cookies).

const KEY = "omc-neon-arena.best";

export class HighScore {
  constructor() {
    this.value = 0;
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw == null ? 0 : parseInt(raw, 10);
      this.value = Number.isFinite(parsed) ? parsed : 0;
    } catch {
      this.value = 0;
    }
  }

  get() {
    return this.value;
  }

  submit(score) {
    if (score > this.value) {
      this.value = score;
      try {
        window.localStorage.setItem(KEY, String(score));
      } catch {
        /* ignore storage errors */
      }
      return true;
    }
    return false;
  }
}
