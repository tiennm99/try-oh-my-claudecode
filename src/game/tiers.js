// Tier tables for v3 stackable buffs. Collecting the same booster bumps
// its tier up to MAX_TIER[kind] and refreshes the active duration.

export const MAX_TIER = {
  rapidfire: 3,
  spread: 3,
  pierce: 3,
  drone: 3,
};

export const DURATION = {
  rapidfire: { 1: 8, 2: 10, 3: 12 },
  spread: { 1: 8, 2: 10, 3: 12 },
  pierce: { 1: 8, 2: 10, 3: 12 },
  drone: { 1: 15, 2: 17, 3: 20 },
};

export const COOLDOWN_MULT = { 1: 0.5, 2: 0.35, 3: 0.25 };

export const SPREAD = {
  1: { count: 3, angleDeg: 12 },
  2: { count: 4, angleDeg: 16 },
  3: { count: 5, angleDeg: 20 },
};

export const PIERCE_BUDGET = { 1: 3, 2: 5, 3: 8 };

export const DRONE_COUNT = { 1: 1, 2: 2, 3: 2 };
export const DRONE_FIRE_RATE = { 1: 0.6, 2: 0.6, 3: 0.3 };

export function resolveTier(kind, currentTier = 0) {
  const max = MAX_TIER[kind];
  if (!max) return 0;
  const next = (currentTier || 0) + 1;
  return next > max ? max : next;
}

export function durationFor(kind, tier) {
  const table = DURATION[kind];
  if (!table) return 0;
  return table[tier] ?? table[1] ?? 0;
}
