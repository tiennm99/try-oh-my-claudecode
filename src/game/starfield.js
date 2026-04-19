// Parallax 3-layer starfield. update(dt) + render(ctx) called once per frame.
// render is called inside shake translate but before grid. Uses additive blend.

const LAYERS = [
  { count: 40, radius: 0.6, drift: 7,  jitter: 0.4, alpha: 0.35 },
  { count: 25, radius: 1.0, drift: 3,  jitter: 0.2, alpha: 0.50 },
  { count: 12, radius: 1.6, drift: 1,  jitter: 0.1, alpha: 0.70 },
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export class Starfield {
  constructor(width = 1280, height = 720) {
    this.width = width;
    this.height = height;
    this._dots = LAYERS.map((layer) => {
      const dots = [];
      for (let i = 0; i < layer.count; i++) {
        dots.push({ x: rand(0, width), y: rand(0, height), vx: rand(-layer.jitter, layer.jitter) });
      }
      return dots;
    });
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
  }

  update(dt) {
    LAYERS.forEach((layer, li) => {
      const dots = this._dots[li];
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.y += layer.drift * dt;
        d.x += d.vx;
        if (d.y > this.height) d.y -= this.height;
        if (d.y < 0) d.y += this.height;
        if (d.x < 0) d.x += this.width;
        if (d.x > this.width) d.x -= this.width;
      }
    });
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    LAYERS.forEach((layer, li) => {
      const dots = this._dots[li];
      const color = li === 0
        ? `rgba(100,180,255,${layer.alpha})`
        : li === 1
          ? `rgba(160,210,255,${layer.alpha})`
          : `rgba(230,240,255,${layer.alpha})`;
      ctx.fillStyle = color;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        ctx.beginPath();
        ctx.arc(d.x, d.y, layer.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }
}
