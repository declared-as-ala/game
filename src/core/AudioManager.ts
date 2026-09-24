import { APP_CONFIG } from '@/app/config';
import { SettingsManager } from './SettingsManager';

export class AudioManager {
  private static instance: AudioManager;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isUnlocked = false;

  // Collision throttling to prevent clipping during 100-ball simulations
  private lastHitTime = 0;
  private activeHitVoices = 0;

  private constructor() {
    // AudioContext will initialize on first user gesture
    SettingsManager.getInstance().subscribe((settings) => {
      this.updateVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume);
    });
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public unlock(): void {
    if (this.isUnlocked && this.audioCtx && this.audioCtx.state === 'running') return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.sfxGain = this.audioCtx.createGain();
        this.musicGain = this.audioCtx.createGain();

        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.audioCtx.destination);

        const settings = SettingsManager.getInstance().getSettings();
        this.updateVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume);
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.isUnlocked = true;
    } catch (e) {
      console.warn('[AudioManager] Failed to initialize AudioContext:', e);
    }
  }

  private updateVolumes(master: number, sfx: number, music: number): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (this.masterGain) this.masterGain.gain.setValueAtTime(master, now);
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, now);
    if (this.musicGain) this.musicGain.gain.setValueAtTime(music, now);
  }

  /**
   * Procedural Launch Sound: Sub-woosh + rising sine ping
   */
  public playLaunch(powerPercent: number): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.22;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 220 + powerPercent * 340;
    osc.frequency.setValueAtTime(baseFreq * 0.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + duration);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Godot / Neon Collision Bounce Tone
   */
  public playCollision(_velocity = 10, isStrong = false): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const now = performance.now();
    if (now - this.lastHitTime < 25) {
      if (this.activeHitVoices >= APP_CONFIG.LIMITS.MAX_CONCURRENT_AUDIO_HITS) return;
    }
    this.lastHitTime = now;
    this.activeHitVoices++;

    const ctx = this.audioCtx;
    const audioNow = ctx.currentTime;
    const duration = 0.042;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 930 Hz with pitch variation
    const pitchVar = 0.90 + Math.random() * 0.22;
    const freq = 930.0 * pitchVar;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioNow);

    const hitVol = isStrong ? 0.35 : 0.24;
    gain.gain.setValueAtTime(hitVol, audioNow);
    gain.gain.exponentialRampToValueAtTime(0.001, audioNow + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(audioNow);
    osc.stop(audioNow + duration);

    setTimeout(() => {
      this.activeHitVoices = Math.max(0, this.activeHitVoices - 1);
    }, duration * 1000 + 10);
  }

  /**
   * Break / Shatter Sound (Clean neon crystal fracture chime)
   */
  public playBreakSound(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Harmonic crystalline bell ping
    const freqs = [1046.5, 1318.51, 1567.98]; // C6, E6, G6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.025;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.96, t + 0.28);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  private contactMusicBuffer: AudioBuffer | null = null;
  private contactAudioCursor = 0;
  private activeMusicSources: { source: AudioBufferSourceNode; stopTimeout: any }[] = [];

  public async loadContactMusic(): Promise<void> {
    try {
      const res = await fetch('/audio/contact_music.mp3');
      if (res.ok && this.audioCtx) {
        const arrayBuf = await res.arrayBuffer();
        this.contactMusicBuffer = await this.audioCtx.decodeAudioData(arrayBuf);
      }
    } catch (e) {
      console.warn('[AudioManager] Failed to load contact music:', e);
    }
  }

  public playContactMusicSlice(sliceSeconds = 1.9): void {
    this.unlock();
    if (!this.audioCtx || !this.musicGain) return;

    if (!this.contactMusicBuffer) {
      this.loadContactMusic();
      return;
    }

    const duration = this.contactMusicBuffer.duration;
    if (this.contactAudioCursor >= duration) return;

    const sliceDur = Math.min(sliceSeconds, duration - this.contactAudioCursor);
    const source = this.audioCtx.createBufferSource();
    source.buffer = this.contactMusicBuffer;

    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.setValueAtTime(0.7, Math.max(now, now + sliceDur - 0.08));
    gain.gain.linearRampToValueAtTime(0.01, now + sliceDur);

    source.connect(gain);
    gain.connect(this.musicGain);

    source.start(now, this.contactAudioCursor, sliceDur);
    this.contactAudioCursor += sliceDur;

    const timeout = setTimeout(() => {
      try {
        source.stop();
      } catch {}
    }, sliceDur * 1000 + 60);

    this.activeMusicSources.push({ source, stopTimeout: timeout });
  }

  public resetContactMusic(): void {
    for (const item of this.activeMusicSources) {
      clearTimeout(item.stopTimeout);
      try {
        item.source.stop();
      } catch {}
    }
    this.activeMusicSources = [];
    this.contactAudioCursor = 0;
  }

  /**
   * Neon Impact Harmonic Chime (Crisp, escalating pentatonic tone with glass ping)
   */
  public playNeonChime(combo = 1): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.11;

    // Major Pentatonic scale notes (C5, D5, E5, G5, A5, C6, D6, E6, G6, A6)
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
    const noteIdx = (combo - 1) % scale.length;
    const freq = scale[noteIdx];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + duration);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.0, now);
    osc2.frequency.exponentialRampToValueAtTime(freq * 1.9, now + duration * 0.5);

    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + duration);
    osc2.stop(now + duration * 0.5);
  }

  /**
   * Procedural Spike Destroy Crunch
   */
  public playSpikeHit(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Sub crunch oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * New Ball Spawn: Crystal chime sparkle
   */
  public playBallSpawn(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Procedural Box Escape Chime: Ascending pentatonic notes for ASMR progression
   */
  public playBoxEscape(escapedIndex: number, totalBoxes: number): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const scale = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
    const pitchIndex = Math.min(escapedIndex, scale.length - 1);
    const baseFreq = scale[pitchIndex] || 523.25;

    // Primary fundamental tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Sparkling overtone harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, now);

    gain2.gain.setValueAtTime(0.18, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.22);

    // If final box escape, add high celebration sparkle chord
    if (escapedIndex >= totalBoxes - 1) {
      const flourish = [baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
      flourish.forEach((f, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + 0.08 + idx * 0.06;
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.connect(g);
        g.connect(this.sfxGain!);
        o.start(t);
        o.stop(t + 0.4);
      });
    }
  }

  /**
   * Escape / Objective Goal: Ascending chime
   */
  public playGoal(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const freqs = [659.25, 880.0, 1318.51]; // E5, A5, E6

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  /**
   * Level Complete Fanfare: Major chord
   */
  public playLevelComplete(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const time = now + i * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(time);
      osc.stop(time + 0.5);
    });
  }

  /**
   * Defeat / Failure Sound
   */
  public playDefeat(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Star Earned Pop
   */
  public playStarPop(starIndex: number): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const freqs = [783.99, 987.77, 1318.51]; // G5, B5, E6
    const targetFreq = freqs[starIndex] || 1046.5;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetFreq * 0.8, now);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Tactile UI Click
   */
  public playUIClick(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.025);
  }

  /**
   * Paddle Hit Sound (Crisp energetic pop/click)
   */
  public playPaddleHit(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.05;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const pitchVar = 0.95 + Math.random() * 0.15;
    const freq = 820 * pitchVar;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.015);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Perfect Escape Sound (Bright sparkling crystalline chime chord)
   */
  public playPerfectEscape(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const notes = [880.0, 1174.66, 1760.0, 2349.32]; // A5, D6, A6, D7

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.035;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.25);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  /**
   * Combo Milestone Sound (Triumphant ascending harmonic)
   */
  public playComboMilestone(combo = 2): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const baseFreq = 523.25 * Math.min(2.5, 1 + (combo - 1) * 0.15);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Overload Warning Pulse
   */
  public playOverloadWarning(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.15;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(240, now + duration);

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * ORBIT: Soft resonant "whoom" on gravitational capture
   */
  public playOrbitCapture(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.28;

    // Sub sine whoom
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + duration);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * ORBIT: Energy release click / impulse on tangent release
   */
  public playOrbitRelease(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.12;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + duration);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * ORBIT: Pleasant golden chord shimmer when capturing Goal planet
   */
  public playOrbitGoal(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.05;
      const duration = 0.6;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * ORBIT: Soft error hit on hazard collision or boundary escape
   */
  public playOrbitFail(): void {
    this.unlock();
    if (!this.audioCtx || !this.sfxGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const duration = 0.22;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + duration);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }
}

