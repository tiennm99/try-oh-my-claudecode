// Overlay manager: shows/hides the three overlay panels (menu/pause/gameover)
// and wires their buttons to callbacks. Designer (worker-3) may restyle, but
// the JS interface here stays stable.

const OVERLAYS = ["menu", "pause", "gameover"];

export class Menu {
  constructor(root = document, handlers = {}, { onSettingChange, initialSettings } = {}) {
    this.root = root;
    this.handlers = handlers;
    this.onSettingChange = typeof onSettingChange === "function" ? onSettingChange : null;
    this.elements = {};
    for (const name of OVERLAYS) {
      this.elements[name] = root.querySelector(`[data-overlay="${name}"]`);
    }
    this.elements.settings = root.querySelector(`[data-overlay="settings"]`);

    root.addEventListener("click", (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.getAttribute("data-action");
      if (action === "open-settings") {
        this._hidePause();
        this.showSettings();
        return;
      }
      if (action === "settings-back") {
        this.hideSettings();
        this._showPause();
        return;
      }
      const handler = this.handlers[action];
      if (typeof handler === "function") handler();
    });

    // Volume slider
    const volSlider = root.querySelector("#settings-volume");
    const volVal = root.querySelector("#settings-volume-val");
    if (volSlider) {
      volSlider.addEventListener("input", (e) => {
        const v = Number(e.target.value);
        if (volVal) volVal.textContent = v;
        if (this.onSettingChange) this.onSettingChange("volume", v / 100);
      });
    }

    // Shake toggle
    const shakeToggle = root.querySelector("#settings-shake");
    if (shakeToggle) {
      shakeToggle.addEventListener("change", (e) => {
        if (this.onSettingChange) this.onSettingChange("shake", e.target.checked);
      });
    }

    // Init controls from initialSettings
    if (initialSettings) this.initSettings(initialSettings);
  }

  initSettings(settings) {
    const volSlider = this.root.querySelector("#settings-volume");
    const volVal = this.root.querySelector("#settings-volume-val");
    const shakeToggle = this.root.querySelector("#settings-shake");
    if (volSlider && settings.volume != null) {
      const pct = Math.round(settings.volume * 100);
      volSlider.value = pct;
      if (volVal) volVal.textContent = pct;
    }
    if (shakeToggle && settings.shake != null) {
      shakeToggle.checked = settings.shake;
    }
  }

  show(name) {
    for (const key of OVERLAYS) {
      const el = this.elements[key];
      if (!el) continue;
      el.classList.toggle("hidden", key !== name);
    }
    // Always hide settings when showing a named overlay
    if (this.elements.settings) this.elements.settings.classList.add("hidden");
  }

  hideAll() {
    for (const key of OVERLAYS) {
      const el = this.elements[key];
      if (el) el.classList.add("hidden");
    }
    if (this.elements.settings) this.elements.settings.classList.add("hidden");
  }

  showSettings() {
    if (this.elements.settings) this.elements.settings.classList.remove("hidden");
  }

  hideSettings() {
    if (this.elements.settings) this.elements.settings.classList.add("hidden");
  }

  _showPause() {
    const el = this.elements.pause;
    if (el) el.classList.remove("hidden");
  }

  _hidePause() {
    const el = this.elements.pause;
    if (el) el.classList.add("hidden");
  }
}
