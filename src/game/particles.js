// Particle system: additive neon bursts with shrinking radius.

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit({ x, y, color = "#fff", count = 10, speedMin = 60, speedMax = 240, lifetime = 0.6, radius = 3 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: lifetime,
        maxLife: lifetime,
        color,
        radius,
      });
    }
  }

  update(dt) {
    const drag = Math.exp(-2.5 * dt);
    let write = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
      this.particles[write++] = p;
    }
    this.particles.length = write;
  }

  render(ctx) {
    if (this.particles.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const r = p.radius * t;
      if (r <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, t));
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles.length = 0;
  }
}
