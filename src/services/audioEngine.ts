/**
 * Web Audio API Engine for Tutti ♪
 * Provides synthesis for piano, sax, guitar, metronome clicks,
 * pitch generation, and sheet melody playback.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentMelodyTimeout: number | null = null;
  private isMelodyPlaying: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Frequency mapping for note names
  private noteToFreq(note: string): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    // Handle flats
    const normalized = note
      .replace('Db', 'C#')
      .replace('Eb', 'D#')
      .replace('Gb', 'F#')
      .replace('Ab', 'G#')
      .replace('Bb', 'A#');

    const match = normalized.match(/([A-G]#?)(\d)/);
    if (!match) return 440;

    const noteName = match[1];
    const octave = parseInt(match[2], 10);
    const semitoneOffset = notes.indexOf(noteName);
    if (semitoneOffset === -1) return 440;

    // A4 is octave 4, index 9 (440Hz)
    // Distance in semitones from A4
    const semitonesFromA4 = (octave - 4) * 12 + (semitoneOffset - 9);
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  /**
   * Play a single note with warm synthesised harmonics
   */
  public playNote(
    note: string, 
    duration = 0.5, 
    type: 'piano' | 'sax' | 'guitar' | 'sax-alto' | 'sax-tenor' | 'sax-soprano' | 'flauta' = 'piano'
  ) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const baseFreq = this.noteToFreq(note);
      const now = ctx.currentTime;

      if (type === 'flauta') {
        // Flauta Transversal: Som límpido e aveludado em Dó (C), ataque de ar suave, vibrato natural
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        // Vibrato suave (5.5 Hz)
        lfo.frequency.setValueAtTime(5.5, now);
        lfoGain.gain.setValueAtTime(3.2, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);

        // 2º harmônico sutil (oitava suave típica da embocadura da flauta)
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 2, now);
        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.04, now);
        osc2.connect(gain2);
        gain2.connect(filter);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(baseFreq * 3.5, now);

        // Envelope: Ataque suave com sopro, sustentação limpa
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        lfo.start(now);
        osc.start(now);
        osc2.start(now);
        lfo.stop(now + duration);
        osc.stop(now + duration);
        osc2.stop(now + duration);
      } else if (type === 'sax-tenor') {
        // Sax Tenor em Si Bemol (Bb): Mais encorpado, aveludado e grave (14 semitons abaixo da partitura escrita)
        const tenorFreq = baseFreq * Math.pow(2, -14 / 12);
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(tenorFreq, now);

        // Sub-oscilador para corpo de madeira e graves característicos do tenor
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(tenorFreq, now);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.12, now);
        subOsc.connect(subGain);
        subGain.connect(filter);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(tenorFreq * 2.2, now);
        filter.Q.setValueAtTime(2.5, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + duration * 1.1);
        subOsc.stop(now + duration * 1.1);
      } else if (type === 'sax-soprano') {
        // Sax Soprano em Si Bemol (Bb): Brilhante, lírico e focado (2 semitons abaixo da escrita)
        const sopranoFreq = baseFreq * Math.pow(2, -2 / 12);
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(sopranoFreq, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(sopranoFreq * 1.8, now);
        filter.Q.setValueAtTime(1.8, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      } else if (type === 'sax' || type === 'sax-alto') {
        // Sax Alto em Mi Bemol (Eb): Som equilibrado, vibrante e cantarolado (9 semitons abaixo da escrita)
        const altoFreq = baseFreq * Math.pow(2, -9 / 12);
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(altoFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(altoFreq * 2.8, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      } else if (type === 'piano') {
        // Multi-oscillator Rhodes / piano sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(baseFreq, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 2, now);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
      } else {
        // Plucked acoustic guitar emulation
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration * 1.2);
      }
    } catch (err) {
      console.warn('Audio playback not allowed yet or context error', err);
    }
  }

  /**
   * Play multiple notes as a chord (with natural strumming for guitar or polyphony for piano)
   */
  public playChord(notes: string[], duration = 1.2, type: 'piano' | 'sax' | 'guitar' = 'piano') {
    if (this.isMuted || !notes || notes.length === 0) return;
    try {
      notes.forEach((note, index) => {
        const delay = type === 'guitar' ? index * 35 : 0;
        setTimeout(() => {
          this.playNote(note, duration, type);
        }, delay);
      });
    } catch (err) {
      console.warn('Chord playback error', err);
    }
  }

  /**
   * Play metronome click
   */
  public playClick(isFirstBeat = false) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFirstBeat ? 1400 : 900, now);

      gain.gain.setValueAtTime(isFirstBeat ? 0.6 : 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (err) {
      // Ignore initial user-gesture errors
    }
  }

  /**
   * Play a reference tuner frequency (e.g. 440 Hz)
   */
  private tunerOsc: OscillatorNode | null = null;
  private tunerGain: GainNode | null = null;

  public startTunerPitch(freq: number) {
    try {
      this.stopTunerPitch();
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      this.tunerOsc = osc;
      this.tunerGain = gain;
    } catch (err) {
      console.warn('Tuner audio error', err);
    }
  }

  public stopTunerPitch() {
    if (this.tunerOsc && this.tunerGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.tunerGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        this.tunerOsc.stop(now + 0.06);
      } catch (e) {
        //
      }
      this.tunerOsc = null;
      this.tunerGain = null;
    }
  }

  /**
   * Play a sequence of notes (for sheet music demo)
   */
  public playMelody(
    notes: { note: string; duration: number }[],
    tempoBpm: number = 100,
    instrument: 'piano' | 'sax' | 'guitar' = 'piano',
    onNoteChange?: (index: number) => void,
    onComplete?: () => void
  ) {
    this.stopMelody();
    this.isMelodyPlaying = true;
    const beatDurationMs = (60 / tempoBpm) * 1000;

    let totalOffset = 0;

    notes.forEach((item, index) => {
      const stepDurationMs = item.duration * beatDurationMs;
      const timeoutId = window.setTimeout(() => {
        if (!this.isMelodyPlaying) return;
        if (item.note && item.note !== 'REST') {
          this.playNote(item.note, (item.duration * 60) / tempoBpm, instrument);
        }
        if (onNoteChange) onNoteChange(index);
      }, totalOffset);

      totalOffset += stepDurationMs;

      // store the latest timeout
      this.currentMelodyTimeout = timeoutId;
    });

    // Schedule finish
    window.setTimeout(() => {
      if (this.isMelodyPlaying) {
        this.isMelodyPlaying = false;
        if (onComplete) onComplete();
      }
    }, totalOffset + 100);
  }

  public stopMelody() {
    this.isMelodyPlaying = false;
    if (this.currentMelodyTimeout) {
      clearTimeout(this.currentMelodyTimeout);
      this.currentMelodyTimeout = null;
    }
  }

  public isPlaying(): boolean {
    return this.isMelodyPlaying;
  }
}

export const audioEngine = new AudioEngine();
