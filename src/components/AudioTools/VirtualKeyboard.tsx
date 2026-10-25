import React, { useState, useEffect } from 'react';
import { Volume2, Music, Sparkles } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface KeyConfig {
  note: string;
  isBlack: boolean;
  keyboardKey: string;
}

const KEYS: KeyConfig[] = [
  { note: 'C4', isBlack: false, keyboardKey: 'A' },
  { note: 'C#4', isBlack: true, keyboardKey: 'W' },
  { note: 'D4', isBlack: false, keyboardKey: 'S' },
  { note: 'D#4', isBlack: true, keyboardKey: 'E' },
  { note: 'E4', isBlack: false, keyboardKey: 'D' },
  { note: 'F4', isBlack: false, keyboardKey: 'F' },
  { note: 'F#4', isBlack: true, keyboardKey: 'T' },
  { note: 'G4', isBlack: false, keyboardKey: 'G' },
  { note: 'G#4', isBlack: true, keyboardKey: 'Y' },
  { note: 'A4', isBlack: false, keyboardKey: 'H' },
  { note: 'A#4', isBlack: true, keyboardKey: 'U' },
  { note: 'B4', isBlack: false, keyboardKey: 'J' },
  { note: 'C5', isBlack: false, keyboardKey: 'K' },
  { note: 'C#5', isBlack: true, keyboardKey: 'O' },
  { note: 'D5', isBlack: false, keyboardKey: 'L' },
  { note: 'D#5', isBlack: true, keyboardKey: 'P' },
  { note: 'E5', isBlack: false, keyboardKey: 'Ç' },
];

export const VirtualKeyboard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const [instrument, setInstrument] = useState<'piano' | 'sax' | 'guitar'>('piano');
  const [showKeyLabels, setShowKeyLabels] = useState(true);
  const [highlightedChord, setHighlightedChord] = useState<string | null>(null);

  const chords: Record<string, string[]> = {
    'C': ['C4', 'E4', 'G4'],
    'G': ['G4', 'B4', 'D5'],
    'Am': ['A4', 'C5', 'E5'],
    'F': ['F4', 'A4', 'C5'],
    'Em': ['E4', 'G4', 'B4'],
    'Dm': ['D4', 'F4', 'A4'],
  };

  const playNote = (note: string) => {
    audioEngine.playNote(note, 0.7, instrument);
    setActiveNotes(prev => [...prev.filter(n => n !== note), note]);
    setTimeout(() => {
      setActiveNotes(prev => prev.filter(n => n !== note));
    }, 400);
  };

  const playChord = (chordName: string) => {
    setHighlightedChord(chordName);
    const chordNotes = chords[chordName] || [];
    chordNotes.forEach((n, idx) => {
      setTimeout(() => {
        playNote(n);
      }, idx * 60);
    });
    setTimeout(() => setHighlightedChord(null), 1500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const keyObj = KEYS.find(k => k.keyboardKey.toLowerCase() === e.key.toLowerCase());
      if (keyObj && !activeNotes.includes(keyObj.note)) {
        playNote(keyObj.note);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [instrument, activeNotes]);

  return (
    <div className="bg-[#131722] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <Music size={18} />
          </div>
          <div>
            <h4 className="font-syne font-bold text-white text-sm sm:text-base">Teclado Virtual Studio</h4>
            <p className="text-xs text-slate-400">Toque com o mouse ou use o teclado do seu computador</p>
          </div>
        </div>

        {/* Timbre selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Timbre:</span>
          <div className="bg-[#0b0d14] p-1 rounded-xl flex gap-1 border border-white/10">
            {(['piano', 'sax', 'guitar'] as const).map(inst => (
              <button
                key={inst}
                onClick={() => setInstrument(inst)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  instrument === inst 
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {inst === 'piano' ? '🎹 Piano' : inst === 'sax' ? '🎷 Sax' : '🎸 Violão'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowKeyLabels(!showKeyLabels)}
            className={`px-2.5 py-1 text-xs rounded-lg border border-white/10 ${showKeyLabels ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400'}`}
          >
            {showKeyLabels ? 'Letras ON' : 'Letras OFF'}
          </button>
        </div>
      </div>

      {/* Chord helpers */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
          <Sparkles size={12} className="text-cyan-400" /> Acordes rápidos:
        </span>
        {Object.keys(chords).map(ch => (
          <button
            key={ch}
            onClick={() => playChord(ch)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              highlightedChord === ch
                ? 'bg-emerald-500 text-black scale-105'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Piano Keys Viewport */}
      <div className="relative h-44 sm:h-52 select-none overflow-x-auto pb-2 flex justify-center">
        <div className="relative flex min-w-[580px] h-full bg-[#0b0d14] p-2 rounded-xl border border-white/10 shadow-inner">
          {KEYS.filter(k => !k.isBlack).map(k => {
            const isActive = activeNotes.includes(k.note);
            const isChordNote = highlightedChord && chords[highlightedChord]?.includes(k.note);

            return (
              <button
                key={k.note}
                onClick={() => playNote(k.note)}
                className={`relative flex-1 h-full mx-[1.5px] rounded-b-lg flex flex-col justify-end items-center pb-3 transition-colors ${
                  isActive
                    ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/50'
                    : isChordNote
                    ? 'bg-emerald-200 text-black'
                    : 'bg-gradient-to-b from-white to-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold">{k.note}</span>
                {showKeyLabels && (
                  <span className="text-[10px] text-slate-600 bg-slate-300/80 px-1 rounded mt-1 font-mono">
                    {k.keyboardKey}
                  </span>
                )}
              </button>
            );
          })}

          {/* Black Keys */}
          {KEYS.map((k, index) => {
            if (!k.isBlack) return null;
            // Calculate horizontal offset
            // Count how many white keys before this black key
            const whiteIndex = KEYS.slice(0, index).filter(x => !x.isBlack).length;
            const leftPercent = ((whiteIndex - 0.35) / 10) * 100;
            const isActive = activeNotes.includes(k.note);
            const isChordNote = highlightedChord && chords[highlightedChord]?.includes(k.note);

            return (
              <button
                key={k.note}
                onClick={() => playNote(k.note)}
                style={{ left: `${leftPercent}%` }}
                className={`absolute top-2 w-[5.8%] h-28 sm:h-32 rounded-b-md z-20 flex flex-col justify-end items-center pb-2 transition-transform shadow-xl ${
                  isActive
                    ? 'bg-cyan-400 text-black scale-95'
                    : isChordNote
                    ? 'bg-emerald-400 text-black'
                    : 'bg-gradient-to-b from-slate-950 via-slate-900 to-black !text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-[10px] font-bold !text-white piano-black-key-text">{k.note}</span>
                {showKeyLabels && (
                  <span className="text-[9px] !text-slate-300 mt-1 font-mono">
                    {k.keyboardKey}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
