/**
 * TecnoBound - Procedural Web Audio Synthesizer (SoundEngine)
 * Zero external audio dependencies. Generates retro 8-bit/16-bit SFX and BGM via Web Audio API.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxVolume = 0.6;
    this.musicVolume = 0.35;
    this.sfxMuted = false;
    this.musicMuted = false;
    this.currentTheme = null;
    this.musicInterval = null;
    this.initialized = false;
    this.lastHitSfxTime = 0;
    this.activeSfx = 0;
    this.maxActiveSfx = 32;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn("Web Audio not supported", e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playShoot(type = 'plasma') {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    if (type === 'scatter') {
      const noise = this.ctx.createBufferSource();
      const buf = this.createNoiseBuffer();
      if (!buf) return;
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVolume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.23);
    } else if (type === 'rail') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
      gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'missile') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.18);
      gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    } else if (type === 'lightning') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      // Standard Plasma Blaster
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(this.sfxVolume * 0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  }

  playExplosion() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
    gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  playHit(faction = 'alien') {
    if (this.sfxMuted || !this.ctx) return;
    // Dense combat can generate dozens of hit events in a single frame.
    // Throttle the SFX and cap concurrent nodes so audio can never become the
    // source of a gameplay freeze.
    const now = this.ctx.currentTime;
    if ((now - this.lastHitSfxTime) < 0.025 || this.activeSfx >= this.maxActiveSfx) return;
    this.lastHitSfxTime = now;
    this.activeSfx++;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (faction === 'robot') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
      gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
    }

    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
    window.setTimeout(() => { this.activeSfx = Math.max(0, this.activeSfx - 1); }, 120);
  }

  playPlayerDamage() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
    gain.gain.setValueAtTime(this.sfxVolume * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playDash() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const buf = this.createNoiseBuffer();
    if (!buf) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.18);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.19);
  }

  playHack() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    [440, 660, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.09);
    });
  }

  playPickup(type = 'scrap') {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const baseFreq = type === 'module' ? 700 : 520;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
    gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playDoorOpen() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.16);
    gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playBossAlarm() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(440, now + 0.12);
    osc.frequency.setValueAtTime(220, now + 0.24);
    gain.gain.setValueAtTime(this.sfxVolume * 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.36);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.37);
  }

  playDeath() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    gain.gain.setValueAtTime(this.sfxVolume * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.82);
  }

  playVictory() {
    if (this.sfxMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const notes = [261.6, 329.6, 392.0, 523.3, 659.3, 783.9];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(this.sfxVolume * 0.45, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  }

  // --- PROCEDURAL GENERATIVE BGM ---
  setMusicTheme(theme) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    this.stopMusic();
    if (!this.musicMuted) {
      this.startMusic();
    }
  }

  startMusic() {
    this.stopMusic();
    if (this.musicMuted) return;

    let step = 0;
    const scales = {
      organic: [130.8, 146.8, 155.6, 174.6, 196.0, 207.7],
      robotic: [110.0, 123.5, 130.8, 146.8, 164.8, 174.6],
      vacuum:  [98.0,  110.0, 116.5, 130.8, 146.8, 164.8],
      core:    [82.4,  87.3,  98.0,  110.0, 123.5, 130.8]
    };

    const currentScale = scales[this.currentTheme] || scales.organic;

    this.musicInterval = setInterval(() => {
      if (this.musicMuted || !this.ctx) return;
      this.ensureContext();
      const now = this.ctx.currentTime;

      // Bass note every 4 steps
      if (step % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = this.currentTheme === 'robotic' ? 'square' : 'triangle';
        const bassNote = currentScale[0] * 0.5;
        bassOsc.frequency.setValueAtTime(bassNote, now);
        bassGain.gain.setValueAtTime(this.musicVolume * 0.45, now);
        bassGain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.36);
      }

      // Arpeggio note
      const noteIdx = Math.floor(Math.random() * currentScale.length);
      const arpFreq = currentScale[noteIdx] * (Math.random() < 0.3 ? 2 : 1);
      const arpOsc = this.ctx.createOscillator();
      const arpGain = this.ctx.createGain();
      arpOsc.type = 'sine';
      arpOsc.frequency.setValueAtTime(arpFreq, now);
      arpGain.gain.setValueAtTime(this.musicVolume * 0.25, now);
      arpGain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);
      arpOsc.connect(arpGain);
      arpGain.connect(this.ctx.destination);
      arpOsc.start(now);
      arpOsc.stop(now + 0.19);

      step++;
    }, 280);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    if (this.musicMuted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return !this.musicMuted;
  }

  toggleSfx() {
    this.sfxMuted = !this.sfxMuted;
    return !this.sfxMuted;
  }
}

const soundEngine = new SoundEngine();
window.SoundEngine = SoundEngine;
window.soundEngine = soundEngine;
