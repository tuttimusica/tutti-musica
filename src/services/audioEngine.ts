/**
 * Web Audio + Sampled Instrument Engine for Tutti ♪
 * Uses MusyngKite SoundFont samples via soundfont-player with caching,
 * smooth ADSR envelope control, beat/BPM duration calculation,
 * immediate stop support, and synthesized Web Audio fallback when offline.
 */

import Soundfont from 'soundfont-player';

export type TuttiInstrumentSound =
  | 'piano'
  | 'sax'
  | 'guitar'
  | 'sax-alto'
  | 'sax-tenor'
  | 'sax-soprano'
  | 'flauta'
  | 'clarinet'
  | 'trumpet'
  | 'trombone';

export type BeatCount = 1 | 2 | 3 | 4;

export function calculateBeatDurationSeconds(beats: BeatCount | number, bpm: number): number {
  const safeBeats = Math.max(0.25, Math.min(16, Number(beats) || 1));
  const safeBpm = Math.max(30, Math.min(260, Number(bpm) || 100));
  return Number((safeBeats * (60 / safeBpm)).toFixed(3));
}

const SOUNDFONT_MAP: Record<TuttiInstrumentSound, Soundfont.InstrumentName> = {
  piano: 'acoustic_grand_piano',
  guitar: 'acoustic_guitar_nylon',
  sax: 'alto_sax',
  'sax-alto': 'alto_sax',
  'sax-tenor': 'tenor_sax',
  'sax-soprano': 'soprano_sax',
  flauta: 'flute',
  clarinet: 'clarinet',
  trumpet: 'trumpet',
  trombone: 'trombone',
};

const TRANSPOSITION_SEMITONES: Record<TuttiInstrumentSound, number> = {
  piano: 0,
  guitar: 0,
  flauta: 0,
  trombone: 0,
  sax: -9,          // Sax Alto em Eb (soa 6ªM abaixo da escrita)
  'sax-alto': -9,
  'sax-tenor': -14, // Sax Tenor em Bb (soa 9ªM abaixo da escrita)
  'sax-soprano': -2,// Sax Soprano em Bb (soa 2ªM abaixo da escrita)
  clarinet: -2,     // Clarinete em Bb (soa 2ªM abaixo da escrita)
  trumpet: -2,      // Trompete em Bb (soa 2ªM abaixo da escrita)
};

interface ActiveVoice {
  stop: () => void;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private melodyTimeouts: number[] = [];
  private activePlayTimeout: number | null = null;
  private isMelodyPlaying: boolean = false;
  private instrumentCache: Map<string, Promise<Soundfont.Player | null>> = new Map();
  private loadedInstrumentIds: Set<string> = new Set();
  private activeVoices: Set<ActiveVoice> = new Set();
  private playbackListeners: Set<(playing: boolean) => void> = new Set();

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public subscribePlayback(listener: (playing: boolean) => void): () => void {
    this.playbackListeners.add(listener);
    return () => {
      this.playbackListeners.delete(listener);
    };
  }

  private notifyPlayback(playing: boolean) {
    this.playbackListeners.forEach((cb) => {
      try {
        cb(playing);
      } catch {}
    });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAllNotes();
    }
  }

  public noteToMidi(note: string): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const normalized = note
      .trim()
      .replace('Db', 'C#')
      .replace('Eb', 'D#')
      .replace('Gb', 'F#')
      .replace('Ab', 'G#')
      .replace('Bb', 'A#');

    const match = normalized.match(/^([A-G]#?)(-?\d)$/);
    if (!match) return 69; // A4 fallback

    const noteName = match[1];
    const octave = parseInt(match[2], 10);
    const semitoneOffset = notes.indexOf(noteName);
    if (semitoneOffset === -1) return 69;

    return (octave + 1) * 12 + semitoneOffset;
  }

  public noteToFreq(note: string): number {
    const midi = this.noteToMidi(note);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public isSampleLoaded(type: TuttiInstrumentSound): boolean {
    const sfName = SOUNDFONT_MAP[type] || 'acoustic_grand_piano';
    return this.loadedInstrumentIds.has(sfName);
  }

  public async preloadInstrument(type: TuttiInstrumentSound): Promise<boolean> {
    const player = await this.getSamplePlayer(type);
    return Boolean(player);
  }

  private getSamplePlayer(type: TuttiInstrumentSound): Promise<Soundfont.Player | null> {
    const sfName = SOUNDFONT_MAP[type] || 'acoustic_grand_piano';
    if (this.instrumentCache.has(sfName)) {
      return this.instrumentCache.get(sfName)!;
    }

    const ctx = this.getContext();
    const loadPromise = Soundfont.instrument(ctx, sfName, {
      soundfont: 'MusyngKite',
      format: 'mp3',
    })
      .then((player) => {
        this.loadedInstrumentIds.add(sfName);
        return player;
      })
      .catch((err) => {
        console.warn(`SoundFont fallback para ${sfName}:`, err?.message || err);
        return null;
      });

    this.instrumentCache.set(sfName, loadPromise);
    return loadPromise;
  }

  /**
   * Interrompe imediatamente todas as notas e sequências em reprodução com fade suave sem cliques.
   */
  public stopAllNotes() {
    if (this.activePlayTimeout) {
      clearTimeout(this.activePlayTimeout);
      this.activePlayTimeout = null;
    }
    this.activeVoices.forEach((voice) => {
      try {
        voice.stop();
      } catch {}
    });
    this.activeVoices.clear();
    this.stopMelody();
    this.notifyPlayback(false);
  }

  /**
   * Reproduz uma nota com amostra real do instrumento (SoundFont MusyngKite) + envelope suave,
   * com fallback de síntese Web Audio apenas caso a rede esteja indisponível.
   */
  public async playNote(
    note: string,
    duration = 0.8,
    type: TuttiInstrumentSound = 'piano',
    options?: { replacePrevious?: boolean }
  ): Promise<'sampled' | 'synthesized' | 'muted'> {
    if (this.isMuted) return 'muted';

    if (options?.replacePrevious) {
      this.stopAllNotes();
    }

    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const shift = TRANSPOSITION_SEMITONES[type] ?? 0;
    const soundingMidi = Math.max(21, Math.min(108, this.noteToMidi(note) + shift));
    const safeDuration = Math.max(0.15, Math.min(12, duration));

    this.notifyPlayback(true);
    if (this.activePlayTimeout) {
      clearTimeout(this.activePlayTimeout);
    }
    this.activePlayTimeout = window.setTimeout(() => {
      if (this.activeVoices.size === 0 && !this.isMelodyPlaying) {
        this.notifyPlayback(false);
      }
    }, Math.ceil(safeDuration * 1000) + 40);

    const player = await this.getSamplePlayer(type);
    if (player) {
      try {
        const now = ctx.currentTime;
        const sfGain = type === 'flauta' ? 1.4 : type === 'guitar' ? 1.3 : 1.15;
        const audioNode = player.play(String(soundingMidi), now, {
          duration: safeDuration,
          gain: sfGain,
          attack: type === 'piano' || type === 'guitar' ? 0.005 : 0.035,
          release: 0.14,
        });

        const voice: ActiveVoice = {
          stop: () => {
            try {
              audioNode.stop(ctx.currentTime + 0.025);
            } catch {}
          },
        };
        this.activeVoices.add(voice);
        window.setTimeout(() => {
          this.activeVoices.delete(voice);
          if (this.activeVoices.size === 0 && !this.isMelodyPlaying) {
            this.notifyPlayback(false);
          }
        }, Math.ceil((safeDuration + 0.16) * 1000));

        return 'sampled';
      } catch (err) {
        console.warn('SoundFont note playback fallback:', err);
      }
    }

    // Fallback sintetizado Web Audio (apenas quando SoundFont não pôde ser baixado)
    this.playSynthesizedFallback(soundingMidi, safeDuration, type);
    return 'synthesized';
  }

  private playSynthesizedFallback(midi: number, duration: number, type: TuttiInstrumentSound) {
    try {
      const ctx = this.getContext();
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      if (type === 'flauta') {
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3.2, now);
      } else if (type === 'trumpet' || type === 'trombone') {
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(type === 'trombone' ? freq * 3 : freq * 4.5, now);
      } else if (type === 'clarinet') {
        osc1.type = 'square'; // Harmônicos ímpares característicos do tubo cilíndrico do clarinete
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3.4, now);
      } else if (type.startsWith('sax')) {
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 2.6, now);
      } else {
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4, now);
      }

      osc1.frequency.setValueAtTime(freq, now);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.18, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
      gain.gain.setValueAtTime(0.2, Math.max(now + 0.05, now + duration - 0.08));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(filter);
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.02);
      osc2.stop(now + duration + 0.02);

      const voice: ActiveVoice = {
        stop: () => {
          try {
            const stopNow = ctx.currentTime;
            gain.gain.cancelScheduledValues(stopNow);
            gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), stopNow);
            gain.gain.exponentialRampToValueAtTime(0.0001, stopNow + 0.025);
            osc1.stop(stopNow + 0.03);
            osc2.stop(stopNow + 0.03);
          } catch {}
        },
      };
      this.activeVoices.add(voice);
      window.setTimeout(() => {
        this.activeVoices.delete(voice);
        if (this.activeVoices.size === 0 && !this.isMelodyPlaying) {
          this.notifyPlayback(false);
        }
      }, Math.ceil((duration + 0.04) * 1000));
    } catch (err) {
      console.warn('Synthesized fallback audio error:', err);
    }
  }

  /**
   * Play multiple notes as a chord
   */
  public playChord(notes: string[], duration = 1.2, type: 'piano' | 'sax' | 'guitar' = 'piano') {
    if (this.isMuted || !notes || notes.length === 0) return;
    try {
      notes.forEach((note, index) => {
        const delay = type === 'guitar' ? index * 35 : 0;
        const tid = window.setTimeout(() => {
          this.playNote(note, duration, type);
        }, delay);
        this.melodyTimeouts.push(tid);
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
    } catch {}
  }

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
      } catch {}
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
      this.melodyTimeouts.push(timeoutId);
    });

    const endTimeout = window.setTimeout(() => {
      if (this.isMelodyPlaying) {
        this.isMelodyPlaying = false;
        if (onComplete) onComplete();
      }
    }, totalOffset + 100);
    this.melodyTimeouts.push(endTimeout);
  }

  public stopMelody() {
    this.isMelodyPlaying = false;
    this.melodyTimeouts.forEach((id) => clearTimeout(id));
    this.melodyTimeouts = [];
  }

  public isPlaying(): boolean {
    return this.isMelodyPlaying || this.activeVoices.size > 0;
  }
}

export const audioEngine = new AudioEngine();
