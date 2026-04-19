// Overlay manager: shows/hides the three overlay panels (menu/pause/gameover)
// and wires their buttons to callbacks. Designer (worker-3) may restyle, but
// the JS interface here stays stable.

const OVERLAYS = ["menu", "pause", "gameover"];

export class Menu {
  constructor(root = document, handlers = {}) {
    this.root = root;
    this.handlers = handlers;
    this.elements = {};
    for (const name of OVERLAYS) {
      this.elements[name] = root.querySelector(`[data-overlay="${name}"]`);
    }

    root.addEventListener("click", (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.getAttribute("data-action");
      const handler = this.handlers[action];
      if (typeof handler === "function") handler();
    });
  }

  show(name) {
    for (const key of OVERLAYS) {
      const el = this.elements[key];
      if (!el) continue;
      el.classList.toggle("hidden", key !== name);
    }
  }

  hideAll() {
    for (const key of OVERLAYS) {
      const el = this.elements[key];
      if (el) el.classList.add("hidden");
    }
  }
}
