// HUD — renders score, wave, health pips, and combo into the DOM.
// V2 adds: setBuffs, setDashReady, setBossHealth, setWaveBanner + sync helpers.

const PIP_COUNT = 10;

export class HUD {
  constructor(root = document) {
    this.root = root;
    this.nodes = {
      score:      root.querySelector('[data-hud="score"]'),
      wave:       root.querySelector('[data-hud="wave"]'),
      health:     root.querySelector('[data-hud="health"]'),
      combo:      root.querySelector('[data-hud="combo"]'),
      best:       root.querySelector('[data-hud="best"]'),
      finalScore: root.querySelector('[data-hud="final-score"]'),
      finalBest:  root.querySelector('[data-hud="final-best"]'),
    };

    this._maxHealth = 100;
    this._buildPips();
    this._bannerTimer = null;
  }

  _buildPips() {
    const healthSlot = this.root.querySelector('[data-slot="health"]');
    if (!healthSlot) return;

    healthSlot.innerHTML = '<span class="hud__label">HP</span>';

    const strip = document.createElement("div");
    strip.className = "health-pips";
    strip.setAttribute("aria-label", "health");

    this._pips = [];
    for (let i = 0; i < PIP_COUNT; i++) {
      const pip = document.createElement("span");
      pip.className = "health-pip";
      strip.appendChild(pip);
      this._pips.push(pip);
    }
    healthSlot.appendChild(strip);

    const numeric = document.createElement("span");
    numeric.setAttribute("data-hud", "health");
    numeric.style.display = "none";
    healthSlot.appendChild(numeric);

    this.nodes.health = numeric;
  }

  // --- V1 API (unchanged) ---

  setScore(v) {
    if (this.nodes.score) this.nodes.score.textContent = String(v);
  }

  setWave(v) {
    if (this.nodes.wave) this.nodes.wave.textContent = String(v);
  }

  setHealth(v, max) {
    if (max != null) this._maxHealth = max;
    const hp = Math.max(0, Math.round(v));
    if (this.nodes.health) this.nodes.health.textContent = String(hp);

    if (!this._pips) return;
    const ratio = this._maxHealth > 0 ? hp / this._maxHealth : 0;
    const filled = Math.round(ratio * PIP_COUNT);
    const isDanger = ratio <= 0.3;

    this._pips.forEach((pip, i) => {
      const active = i < filled;
      pip.classList.toggle("empty", !active);
      pip.classList.toggle("danger", active && isDanger);
    });
  }

  setCombo(v) {
    if (this.nodes.combo) this.nodes.combo.textContent = `x${v}`;
  }

  setBest(v) {
    if (this.nodes.best) this.nodes.best.textContent = String(v);
    if (this.nodes.finalBest) this.nodes.finalBest.textContent = String(v);
  }

  setFinalScore(v, rank) {
    if (this.nodes.finalScore) this.nodes.finalScore.textContent = String(v);
    // Show rank badge if rank is 1-5.
    let rankEl = this.root.querySelector('[data-hud="final-rank"]');
    if (rank != null && rank >= 1 && rank <= 5) {
      if (!rankEl) {
        rankEl = document.createElement("div");
        rankEl.setAttribute("data-hud", "final-rank");
        rankEl.className = "hud-rank-badge";
        if (this.nodes.finalScore && this.nodes.finalScore.parentNode) {
          this.nodes.finalScore.parentNode.appendChild(rankEl);
        } else {
          const hudRoot = this.root.getElementById
            ? this.root.getElementById("hud")
            : this.root.querySelector("#hud");
          if (hudRoot) hudRoot.appendChild(rankEl);
        }
      }
      rankEl.textContent = `#${rank}`;
      rankEl.classList.remove("hidden");
    } else if (rankEl) {
      rankEl.classList.add("hidden");
    }
  }

  // --- V2 API ---

  _ensureNode(key, tag = "div") {
    let el = this.root.querySelector(`[data-hud="${key}"]`);
    if (!el) {
      el = document.createElement(tag);
      el.setAttribute("data-hud", key);
      const hudRoot = this.root.getElementById ? this.root.getElementById("hud") : this.root.querySelector("#hud");
      if (hudRoot) hudRoot.appendChild(el);
    }
    return el;
  }

  setBuffs(list) {
    let container = this.root.querySelector('[data-hud="buffs"]');
    if (!container) {
      container = document.createElement("div");
      container.setAttribute("data-hud", "buffs");
      container.className = "hud-buffs";
      const hudRoot = this.root.getElementById
        ? this.root.getElementById("hud")
        : this.root.querySelector("#hud");
      if (hudRoot) hudRoot.appendChild(container);
    }

    // Reconcile chips
    const existing = Array.from(container.children);
    const listLen = list ? list.length : 0;

    // Remove extras
    while (container.children.length > listLen) {
      container.removeChild(container.lastChild);
    }

    for (let i = 0; i < listLen; i++) {
      const { kind, remaining = 0, stacks } = list[i];
      let chip = container.children[i];
      if (!chip) {
        chip = document.createElement("div");
        chip.className = "hud-buff-chip";
        container.appendChild(chip);
      }
      chip.setAttribute("data-kind", kind);
      chip.style.setProperty("--p", String(remaining));

      const tier = list[i].tier;
      if (kind === "shield") {
        chip.textContent = String(stacks != null ? stacks : "");
        chip.removeAttribute("data-tier");
      } else {
        const romanTier = tier > 1 ? (tier === 2 ? "II" : "III") : "";
        chip.textContent = romanTier;
        if (tier > 1) {
          chip.setAttribute("data-tier", String(tier));
        } else {
          chip.removeAttribute("data-tier");
        }
      }
    }
  }

  setDashReady(ready, cooldown = 0) {
    const el = this._ensureNode("dash");
    el.classList.toggle("ready", !!ready);
    el.style.setProperty("--p", String(cooldown));
  }

  setBossHealth(frac) {
    const el = this._ensureNode("boss");
    if (frac === null || frac === undefined) {
      el.classList.add("hidden");
    } else {
      el.classList.remove("hidden");
      el.style.setProperty("--p", String(Math.max(0, Math.min(1, frac))));
      if (!el.querySelector(".boss-label")) {
        const label = document.createElement("span");
        label.className = "boss-label";
        label.textContent = "BOSS";
        el.appendChild(label);
      }
    }
  }

  setWaveBanner(text, duration = 1.6) {
    let el = this.root.querySelector('[data-hud="banner"]');
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("data-hud", "banner");
      el.className = "hud-wave-banner";
      const hudRoot = this.root.getElementById
        ? this.root.getElementById("hud")
        : this.root.querySelector("#hud");
      if (hudRoot) hudRoot.appendChild(el);
    }

    // Remove previous flavor classes before adding new one.
    el.classList.remove("banner-boss", "banner-bonus", "banner-perfect", "banner-wave");

    const upper = String(text).toUpperCase();
    if (upper.includes("BOSS")) {
      el.classList.add("banner-boss");
    } else if (upper.includes("BONUS")) {
      el.classList.add("banner-bonus");
    } else if (upper.includes("PERFECT")) {
      el.classList.add("banner-perfect");
    } else {
      el.classList.add("banner-wave");
    }

    el.textContent = text;
    el.classList.add("show");

    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      el.classList.remove("show");
      this._bannerTimer = null;
    }, duration * 1000);
  }
}

// syncHudPerFrame: call every frame while playing
export function syncHudPerFrame(game, hud) {
  if (!game || !hud) return;
  if (typeof hud.setBuffs === "function" && game.buffs) {
    hud.setBuffs(game.buffs.active());
  }
  if (typeof hud.setDashReady === "function" && game.player) {
    const cooldown = game.player.dashCooldownRemaining != null
      ? Math.max(0, Math.min(1, game.player.dashCooldownRemaining / 0.9))
      : 0;
    hud.setDashReady(game.player.dashReady, cooldown);
  }
  if (typeof hud.setBossHealth === "function") {
    const boss = game.boss;
    const frac = boss && boss.alive && boss.maxHealth > 0
      ? Math.max(0, Math.min(1, boss.health / boss.maxHealth))
      : null;
    hud.setBossHealth(frac);
  }
}

// wireV2Hud: subscribe to wave events for banner display
export function wireV2Hud(game, hud) {
  if (!game || !hud) return;
  if (typeof game.on !== "function") return;
  game.on("waveStart", ({ wave, isBoss } = {}) => {
    if (typeof hud.setWaveBanner === "function") {
      hud.setWaveBanner(isBoss ? "BOSS WAVE" : "WAVE " + wave);
    }
  });
}

// wireV3Hud: subscribe to V3 waveStart (uses label) and waveCleared (perfect banner).
export function wireV3Hud(game, hud) {
  if (!game || !hud) return;
  if (typeof game.on !== "function") return;
  game.on("waveStart", ({ wave, label } = {}) => {
    if (typeof hud.setWaveBanner === "function") {
      hud.setWaveBanner(label || `WAVE ${wave}`);
    }
  });
  game.on("waveCleared", ({ perfect } = {}) => {
    if (perfect && typeof hud.setWaveBanner === "function") {
      hud.setWaveBanner("PERFECT WAVE!", 1.2);
    }
  });
}
