// BuffManager: tracks timed buffs (rapidfire/spread/pierce) and stacked shield.

const TIMED_KINDS = ["rapidfire", "spread", "pierce"];
const SHIELD_MAX = 2;

export class BuffManager {
  constructor() {
    this.timed = new Map();
    this.shield = 0;
  }

  clear() {
    this.timed.clear();
    this.shield = 0;
  }

  addBuff(kind, duration = 8) {
    if (kind === "shield") {
      this.shield = Math.min(SHIELD_MAX, this.shield + 1);
      return;
    }
    if (!TIMED_KINDS.includes(kind)) return;
    const existing = this.timed.get(kind) || { remaining: 0, total: duration };
    const remaining = Math.max(existing.remaining, duration);
    this.timed.set(kind, { remaining, total: Math.max(existing.total, duration) });
  }

  tick(dt) {
    for (const [kind, entry] of this.timed) {
      entry.remaining -= dt;
      if (entry.remaining <= 0) this.timed.delete(kind);
    }
  }

  hasBuff(kind) {
    if (kind === "shield") return this.shield > 0;
    return this.timed.has(kind);
  }

  consumeShield() {
    if (this.shield > 0) {
      this.shield -= 1;
      return true;
    }
    return false;
  }

  active() {
    const list = [];
    for (const [kind, entry] of this.timed) {
      const frac = entry.total > 0 ? Math.max(0, Math.min(1, entry.remaining / entry.total)) : 0;
      list.push({ kind, remaining: frac });
    }
    if (this.shield > 0) {
      list.push({ kind: "shield", remaining: this.shield / SHIELD_MAX, stacks: this.shield });
    }
    return list;
  }
}
