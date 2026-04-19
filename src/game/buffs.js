// BuffManager: tracks timed buffs (rapidfire/spread/pierce/drone) and
// stacked shield. V3 adds tiering: re-collecting a tier-eligible buff
// bumps its tier (capped via MAX_TIER) and refreshes remaining time.

import { MAX_TIER, DURATION, resolveTier } from "./tiers.js";

const TIMED_KINDS = ["rapidfire", "spread", "pierce", "drone"];
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

  addBuff(kind, duration) {
    if (kind === "shield") {
      this.shield = Math.min(SHIELD_MAX, this.shield + 1);
      return;
    }
    if (!TIMED_KINDS.includes(kind)) return;

    const existing = this.timed.get(kind);
    const currentTier = existing ? existing.tier : 0;
    const maxTier = MAX_TIER[kind] || 1;
    const nextTier = existing ? resolveTier(kind, currentTier) : 1;

    const tableDur = DURATION[kind]?.[nextTier];
    const baseDur = typeof duration === "number" ? duration : (tableDur ?? 8);
    const total = Math.max(tableDur ?? 0, baseDur);
    const remaining = existing ? Math.max(existing.remaining, total) : total;

    this.timed.set(kind, {
      tier: Math.min(nextTier, maxTier),
      remaining,
      total,
    });
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

  getTier(kind) {
    if (kind === "shield") return this.shield;
    const entry = this.timed.get(kind);
    return entry ? entry.tier : 0;
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
      list.push({ kind, remaining: frac, tier: entry.tier || 1 });
    }
    if (this.shield > 0) {
      list.push({
        kind: "shield",
        remaining: this.shield / SHIELD_MAX,
        stacks: this.shield,
        tier: 1,
      });
    }
    return list;
  }
}
