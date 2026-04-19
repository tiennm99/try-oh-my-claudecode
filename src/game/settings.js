// Settings stub — worker-4 replaces with real localStorage-backed impl.

const STORAGE_KEY = "omc-neon-arena.settings";
const DEFAULTS = { volume: 0.7, shake: true };

export function loadSettings() {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULTS };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULTS.volume,
      shake: typeof parsed.shake === "boolean" ? parsed.shake : DEFAULTS.shake,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    if (typeof localStorage === "undefined") return;
    const clean = {
      volume: Math.max(0, Math.min(1, Number(settings?.volume ?? DEFAULTS.volume))),
      shake: settings?.shake !== false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore quota / disabled storage
  }
}
