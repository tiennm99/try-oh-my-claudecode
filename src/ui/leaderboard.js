// Top-5 leaderboard backed by localStorage. Migrates from legacy single-best key on first load.

const KEY = "omc-neon-arena.leaderboard";
const LEGACY_KEY = "omc-neon-arena.best";
const MAX_ENTRIES = 5;

export class Leaderboard {
  constructor() {
    this._entries = [];
    this._load();
  }

  _load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._entries = parsed.filter(
            (e) => e && typeof e.score === "number" && typeof e.date === "string"
          );
        }
      } else {
        // Migrate from legacy single-best key.
        const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
        if (legacyRaw != null) {
          const legacyScore = parseInt(legacyRaw, 10);
          if (Number.isFinite(legacyScore) && legacyScore > 0) {
            this._entries = [{ score: legacyScore, date: new Date().toISOString() }];
          }
          try { window.localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
          this._save();
        }
      }
    } catch {
      this._entries = [];
    }
  }

  _save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this._entries));
    } catch { /* ignore storage errors */ }
  }

  // Returns the top score, or 0 if no entries.
  top() {
    return this._entries.length > 0 ? this._entries[0].score : 0;
  }

  // Returns up to 5 entries sorted descending by score.
  top5() {
    return this._entries.slice(0, MAX_ENTRIES);
  }

  // Submit a score. Returns { rank, improved, top }.
  // rank is 1-based position in the leaderboard (1 = best), or null if not in top 5.
  // improved is true if this score is a new personal best.
  submit(score) {
    if (typeof score !== "number" || !Number.isFinite(score)) {
      return { rank: null, improved: false, top: this.top() };
    }

    const prevTop = this.top();
    const improved = score > prevTop;

    const newEntry = { score, date: new Date().toISOString() };
    this._entries.push(newEntry);
    this._entries.sort((a, b) => b.score - a.score);
    if (this._entries.length > MAX_ENTRIES) {
      this._entries = this._entries.slice(0, MAX_ENTRIES);
    }

    const rank = this._entries.findIndex((e) => e === newEntry);
    const finalRank = rank === -1 ? null : rank + 1;

    this._save();
    return { rank: finalRank, improved, top: this.top() };
  }
}
