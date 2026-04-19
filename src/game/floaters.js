// FloaterPool: canvas-rendered rising text floaters. Max 64 pooled entries.

const MAX = 64;

export class FloaterPool {
  constructor() {
    this.items = [];
  }

  emit({ x, y, text, color = "#fff", size, lifetime, rise }) {
    const isBig = size === "big";
    const lt = lifetime ?? (isBig ? 1.6 : 0.9);
    const rs = rise ?? (isBig ? 70 : 40);
    const fontPx = isBig ? 36 : 16;

    if (this.items.length >= MAX) {
      // Evict the oldest (first) entry
      this.items.shift();
    }

    this.items.push({
      x,
      y,
      text,
      color,
      fontPx,
      lifetime: lt,
      remaining: lt,
      rise: rs,
      alpha: 1,
      scale: 1,
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.remaining -= dt;
      if (f.remaining <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      const t = 1 - f.remaining / f.lifetime; // 0..1 progress
      f.y -= f.rise * dt;
      f.alpha = Math.max(0, 1 - t * t * 1.4);
      f.scale = 1 + t * 0.25;
    }
  }

  render(ctx) {
    if (this.items.length === 0) return;
    ctx.save();
    for (let i = 0; i < this.items.length; i++) {
      const f = this.items[i];
      if (f.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.translate(f.x, f.y);
      ctx.scale(f.scale, f.scale);
      ctx.font = `bold ${f.fontPx}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  clear() {
    this.items.length = 0;
  }
}
