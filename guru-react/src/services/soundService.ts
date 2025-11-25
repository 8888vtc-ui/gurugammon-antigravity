export type SoundKind = 'dice' | 'move' | 'gameEnd';

class SoundService {
  private audioCtx: AudioContext | null = null;
  private lastPlayed: Record<SoundKind, number> = {
    dice: 0,
    move: 0,
    gameEnd: 0
  };

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (this.audioCtx) {
      return this.audioCtx;
    }

    const globalWindow = window as Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };

    const AudioCtx = globalWindow.AudioContext || globalWindow.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }

    this.audioCtx = new AudioCtx();
    return this.audioCtx;
  }

  private canPlay(kind: SoundKind, minIntervalMs: number): boolean {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const last = this.lastPlayed[kind];
    if (now - last < minIntervalMs) {
      return false;
    }
    this.lastPlayed[kind] = now;
    return true;
  }

  playDiceRoll() {
    if (!this.canPlay('dice', 150)) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(180 + Math.random() * 220, now + i * 0.04);

      gain.gain.setValueAtTime(0.0001, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.4, now + i * 0.04 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.18);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.22);
    }
  }

  playMove() {
    if (!this.canPlay('move', 60)) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playGameEnd(winner?: string | null) {
    if (!this.canPlay('gameEnd', 1500)) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = winner === 'white'
      ? [523.25, 659.25, 783.99] // C5, E5, G5
      : [392.0, 329.63, 261.63]; // G4, E4, C4

    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0.0001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.45, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.4);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.45);
    });
  }
}

export const soundService = new SoundService();
