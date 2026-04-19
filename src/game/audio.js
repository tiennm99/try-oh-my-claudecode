// Minimal procedural SFX. Lazy AudioContext so we don't breach autoplay rules.

const VOICES = {
  shoot: { freq: 740, freqEnd: 280, dur: 0.07, type: "square", gain: 0.05 },
  hit: { freq: 220, freqEnd: 90, dur: 0.12, type: "sawtooth", gain: 0.08 },
  explode: { freq: 160, freqEnd: 40, dur: 0.22, type: "triangle", gain: 0.12 },
  hurt: { freq: 120, freqEnd: 60, dur: 0.3, type: "sawtooth", gain: 0.16 },
  wave: { freq: 440, freqEnd: 880, dur: 0.25, type: "sine", gain: 0.09 },
  gameover: { freq: 320, freqEnd: 60, dur: 0.9, type: "sawtooth", gain: 0.18 },
};

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _ensureCtx() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  resume() {
    const ctx = this._ensureCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  setEnabled(v) {
    this.enabled = !!v;
  }

  play(name) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const voice = VOICES[name];
    if (!voice) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, voice.freqEnd), now + voice.dur);
    gain.gain.setValueAtTime(voice.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + voice.dur + 0.02);
  }
}
