// HUD — renders score, wave, health pips, and combo into the DOM.

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
  }

  _buildPips() {
    const healthSlot = this.root.querySelector('[data-slot="health"]');
    if (!healthSlot) return;

    // Replace bare text with label + pip strip
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

    // Append the numeric span back for screen-readers / game logic reads
    const numeric = document.createElement("span");
    numeric.setAttribute("data-hud", "health");
    numeric.style.display = "none";
    healthSlot.appendChild(numeric);

    // Update our node reference to the hidden numeric span
    this.nodes.health = numeric;
  }

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

  setFinalScore(v) {
    if (this.nodes.finalScore) this.nodes.finalScore.textContent = String(v);
  }
}
