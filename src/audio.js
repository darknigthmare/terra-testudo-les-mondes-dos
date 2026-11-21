export class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.sfx = null;
    this.ambience = null;
    this.ambient = null;
    this.enabled = true;
    this.started = false;
    this.volumes = { sound: 0.8, ambient: 0.6 };
  }

  async ensure() {
    if (!this.enabled) return false;
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
      // Separate buses so effects and ambience keep their own saved volume.
      this.sfx = this.context.createGain();
      this.sfx.gain.value = this.volumes.sound;
      this.sfx.connect(this.master);
      this.ambience = this.context.createGain();
      this.ambience.gain.value = this.volumes.ambient;
      this.ambience.connect(this.master);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (!this.started) this.startAmbient();
    return true;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.16 : 0, this.context.currentTime, 0.05);
  }

  toggle() {
    this.setEnabled(!this.enabled);
    if (this.enabled) this.ensure();
    return this.enabled;
  }

  setVolumes(next = {}) {
    const sound = Number.isFinite(Number(next.sound)) ? Math.max(0, Math.min(1, Number(next.sound))) : this.volumes.sound;
    const ambient = Number.isFinite(Number(next.ambient)) ? Math.max(0, Math.min(1, Number(next.ambient))) : this.volumes.ambient;
    this.volumes = { sound, ambient };
    if (this.context) {
      this.sfx?.gain.setTargetAtTime(sound, this.context.currentTime, 0.05);
      this.ambience?.gain.setTargetAtTime(ambient, this.context.currentTime, 0.05);
    }
  }

  startAmbient() {
    if (!this.context || this.started) return;
    this.started = true;
    const now = this.context.currentTime;
    const ambientGain = this.context.createGain();
    ambientGain.gain.value = 0.055;
    ambientGain.connect(this.ambience || this.master);

    const low = this.context.createOscillator();
    low.type = 'sine';
    low.frequency.value = 55;
    const lowGain = this.context.createGain();
    lowGain.gain.value = 0.34;
    low.connect(lowGain).connect(ambientGain);
    low.start(now);

    const high = this.context.createOscillator();
    high.type = 'triangle';
    high.frequency.value = 82.5;
    const highGain = this.context.createGain();
    highGain.gain.value = 0.10;
    high.connect(highGain).connect(ambientGain);
    high.start(now);

    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.065;
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain).connect(ambientGain.gain);
    lfo.start(now);

    this.ambient = { low, high, lfo, gain: ambientGain };
  }

  tone(frequency, duration = 0.12, type = 'sine', volume = 0.16, delay = 0) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.sfx || this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  play(name) {
    if (!this.enabled) return;
    this.ensure().then((ready) => {
      if (!ready) return;
      switch (name) {
        case 'click':
          this.tone(260, 0.07, 'triangle', 0.09);
          break;
        case 'build':
          this.tone(220, 0.10, 'triangle', 0.11);
          this.tone(330, 0.16, 'sine', 0.10, 0.06);
          break;
        case 'error':
          this.tone(115, 0.15, 'sawtooth', 0.08);
          break;
        case 'alert':
          this.tone(145, 0.22, 'square', 0.10);
          this.tone(108, 0.30, 'square', 0.08, 0.23);
          break;
        case 'shot':
          this.tone(95 + Math.random() * 45, 0.06, 'square', 0.035);
          break;
        case 'victory':
          [220, 277, 330, 440].forEach((freq, index) => this.tone(freq, 0.26, 'triangle', 0.10, index * 0.08));
          break;
        case 'evolve':
          [110, 165, 220, 330, 440].forEach((freq, index) => this.tone(freq, 0.55, 'sine', 0.10, index * 0.11));
          break;
        case 'quest':
          this.tone(392, 0.15, 'triangle', 0.10);
          this.tone(523, 0.25, 'sine', 0.08, 0.10);
          break;
        default:
          this.tone(220, 0.08, 'sine', 0.06);
      }
    });
  }
}
