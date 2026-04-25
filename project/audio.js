class AudioManager {
  constructor() {
    this.ctx = null;
  }

  // Initialize audio context (must be called on user interaction)
  init() {
    return this._init();
  }

  _init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return false;
      }
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  _beep(freq, type, duration, gainVal, startTime) {
    if (!this.ctx) {
      return;
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  jump() {
    if (!this._init()) {
      return;
    }
    const t = this.ctx.currentTime;
    this._beep(320, 'square', 0.08, 0.18, t);
    this._beep(480, 'square', 0.06, 0.12, t + 0.05);
  }

  collectStar() {
    if (!this._init()) {
      return;
    }
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      this._beep(f, 'triangle', 0.12, 0.15, t + i * 0.07);
    });
  }

  fall() {
    if (!this._init()) {
      return;
    }
    const t = this.ctx.currentTime;
    this._beep(220, 'sawtooth', 0.3, 0.2, t);
    this._beep(110, 'sawtooth', 0.4, 0.15, t + 0.2);
  }

  win() {
    if (!this._init()) {
      return;
    }
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this._beep(f, 'square', 0.18, 0.2, t + i * 0.1);
    });
  }

  checkpoint() {
    if (!this._init()) {
      return;
    }
    const t = this.ctx.currentTime;
    [440, 554, 659].forEach((f, i) => {
      this._beep(f, 'triangle', 0.15, 0.15, t + i * 0.08);
    });
  }
}

export const audio = new AudioManager();
