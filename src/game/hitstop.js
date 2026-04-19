// HitStop: a tiny time-scale gate. While active, sample(dt) returns a
// scaled dt; tick(dt) decrements the internal timer with raw dt so the
// stop lasts real wall-clock time regardless of its own scaling.

export class HitStop {
  constructor() {
    this.remaining = 0;
    this.scale = 1;
  }

  trigger(durationMs, scale = 0.1) {
    const dur = Math.max(0, durationMs) / 1000;
    if (dur <= 0) return;
    if (dur > this.remaining) this.remaining = dur;
    this.scale = scale;
  }

  get active() {
    return this.remaining > 0;
  }

  sample(dt) {
    if (this.remaining > 0) return dt * this.scale;
    return dt;
  }

  tick(dt) {
    if (this.remaining > 0) {
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.scale = 1;
      }
    }
  }

  reset() {
    this.remaining = 0;
    this.scale = 1;
  }
}

export default HitStop;
