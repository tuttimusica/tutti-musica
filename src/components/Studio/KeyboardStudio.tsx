import React, { useState } from 'react';
import { Volume2, Play, Sparkles, Music, Info } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export type PianoChordQuality = 'major' | 'minor' | '7M' | '7' | '9' | '7_9' | 'm7' | 'm7M' | 'm9' | 'sus4' | 'dim';

export interface PianoChordDef {
  root: string;
  quality: PianoChordQuality;
  displayName: string;
  suffixLabel: string;
  notes: string[]; // e.g. ['C4', 'E4', 'G4', 'B4']
  intervals: { note: string; degree: string; color: string }[];
  formula: string;
  description: string;
}

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const QUALITIES: { id: PianoChordQuality; label: string; group: string }[] = [
  { id: 'major', label: 'Maior (M)', group: 'Tríades' },
  { id: 'minor', label: 'Menor (m)', group: 'Tríades' },
  { id: '7M', label: '7M (maj7)', group: 'Sétimas' },
  { id: '7', label: '7 (Dominante)', group: 'Sétimas' },
  { id: 'm7', label: 'm7 (Menor c/ 7ª)', group: 'Sétimas' },
  { id: 'm7M', label: 'm7M (Menor c/ 7M)', group: 'Sétimas' },
  { id: '9', label: '9 (add9)', group: 'Nonas' },
  { id: '7_9', label: '7(9) (Dominante 9ª)', group: 'Nonas' },
  { id: 'm9', label: 'm9 (Menor c/ 9ª)', group: 'Nonas' },
  { id: 'sus4', label: 'sus4 (Suspensa)', group: 'Outros' },
  { id: 'dim', label: 'dim / ° (Diminuto)', group: 'Outros' },
];

// Helper to compute semitones and notes
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function normalizeNote(n: string): string {
  return n.replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#');
}

function getPianoChord(root: string, quality: PianoChordQuality): PianoChordDef {
  const normRoot = normalizeNote(root);
  const rootIdx = CHROMATIC_SCALE.indexOf(normRoot);
  const baseOctave = 4;

  let semitoneOffsets: { offset: number; degree: string; color: string }[] = [];

  switch (quality) {
    case 'major':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 4, degree: '3M', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
      ];
      break;
    case 'minor':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 3, degree: '3m', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
      ];
      break;
    case '7M':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 4, degree: '3M', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
        { offset: 11, degree: '7M', color: 'bg-rose-500' },
      ];
      break;
    case '7':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 4, degree: '3M', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
        { offset: 10, degree: '7m', color: 'bg-amber-500' },
      ];
      break;
    case 'm7':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 3, degree: '3m', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
        { offset: 10, degree: '7m', color: 'bg-amber-500' },
      ];
      break;
    case 'm7M':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 3, degree: '3m', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
        { offset: 11, degree: '7M', color: 'bg-rose-500' },
      ];
      break;
    case '9':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 4, degree: '3M', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
        { offset: 14, degree: '9ª', color: 'bg-blue-500' },
      ];
      break;
    case '7_9':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 4, degree: '3M', color: 'bg-cyan-500' },
        { offset: 10, degree: '7m', color: 'bg-amber-500' },
        { offset: 14, degree: '9ª', color: 'bg-blue-500' },
      ];
      break;
    case 'm9':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 3, degree: '3m', color: 'bg-cyan-500' },
        { offset: 10, degree: '7m', color: 'bg-amber-500' },
        { offset: 14, degree: '9ª', color: 'bg-blue-500' },
      ];
      break;
    case 'sus4':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 5, degree: '4J', color: 'bg-cyan-500' },
        { offset: 7, degree: '5J', color: 'bg-violet-500' },
      ];
      break;
    case 'dim':
      semitoneOffsets = [
        { offset: 0, degree: '1 (T)', color: 'bg-emerald-500' },
        { offset: 3, degree: '3m', color: 'bg-cyan-500' },
        { offset: 6, degree: 'b5', color: 'bg-violet-500' },
        { offset: 9, degree: 'bb7', color: 'bg-rose-500' },
      ];
      break;
  }

  const notes: string[] = [];
  const intervals: { note: string; degree: string; color: string }[] = [];

  semitoneOffsets.forEach(({ offset, degree, color }) => {
    const totalSemitones = rootIdx + offset;
    const noteName = CHROMATIC_SCALE[totalSemitones % 12];
    const octave = baseOctave + Math.floor(totalSemitones / 12);
    const fullPitch = `${noteName}${octave}`;
    notes.push(fullPitch);
    intervals.push({ note: noteName, degree, color });
  });

  const displaySuffix = quality === 'major' ? '' : quality === 'minor' ? 'm' : quality === '7_9' ? '7(9)' : quality;

  return {
    root,
    quality,
    displayName: `${root}${displaySuffix}`,
    suffixLabel: quality,
    notes,
    intervals,
    formula: intervals.map(i => `${i.note} (${i.degree})`).join(' + '),
    description: `Acorde de ${root} ${quality} no teclado com notas harmonicamente balanceadas.`
  };
}

export const KeyboardStudio: React.FC = () => {
  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedQuality, setSelectedQuality] = useState<PianoChordQuality>('major');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const currentChord = getPianoChord(selectedRoot, selectedQuality);

  const handlePlayChord = () => {
    setIsPlaying(true);
    audioEngine.playChord(currentChord.notes, 1.4, 'piano');
    setTimeout(() => setIsPlaying(false), 1400);
  };

  const handleKeyClick = (notePitch: string) => {
    audioEngine.playNote(notePitch, 0.8, 'piano');
  };

  // 2 octaves piano keys: C4 to B5
  const pianoKeys = [
    { note: 'C', octave: 4, isBlack: false },
    { note: 'C#', octave: 4, isBlack: true },
    { note: 'D', octave: 4, isBlack: false },
    { note: 'D#', octave: 4, isBlack: true },
    { note: 'E', octave: 4, isBlack: false },
    { note: 'F', octave: 4, isBlack: false },
    { note: 'F#', octave: 4, isBlack: true },
    { note: 'G', octave: 4, isBlack: false },
    { note: 'G#', octave: 4, isBlack: true },
    { note: 'A', octave: 4, isBlack: false },
    { note: 'A#', octave: 4, isBlack: true },
    { note: 'B', octave: 4, isBlack: false },
    { note: 'C', octave: 5, isBlack: false },
    { note: 'C#', octave: 5, isBlack: true },
    { note: 'D', octave: 5, isBlack: false },
    { note: 'D#', octave: 5, isBlack: true },
    { note: 'E', octave: 5, isBlack: false },
    { note: 'F', octave: 5, isBlack: false },
    { note: 'F#', octave: 5, isBlack: true },
    { note: 'G', octave: 5, isBlack: false },
    { note: 'G#', octave: 5, isBlack: true },
    { note: 'A', octave: 5, isBlack: false },
    { note: 'A#', octave: 5, isBlack: true },
    { note: 'B', octave: 5, isBlack: false },
  ];

  const whiteKeys = pianoKeys.filter(k => !k.isBlack);
  const blackKeys = pianoKeys.filter(k => k.isBlack);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[#131722] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold mb-2">
              <Sparkles size={14} />
              <span>Visualizador Harmônico para Teclado & Piano</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-syne font-black text-white">
              Acordes Maiores, Menores, 7M, 7, 9 e Variações no Piano
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mt-1">
              Visualize as teclas iluminadas de cada acorde com graus e intervalos coloridos, e ouça a sonoridade polifônica imediata.
            </p>
          </div>

          <button
            onClick={handlePlayChord}
            className={`px-6 py-3.5 rounded-2xl font-syne font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
              isPlaying
                ? 'bg-violet-500 text-white scale-105 shadow-violet-500/40'
                : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-600 text-black hover:opacity-90 shadow-cyan-500/20 glow'
            }`}
          >
            <Volume2 size={18} />
            <span>Tocar {currentChord.displayName} 🎹</span>
          </button>
        </div>

        {/* Root Selector */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Selecione a Tônica:
          </span>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            {ROOTS.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRoot(r)}
                className={`py-2 px-1 rounded-xl text-center font-bold text-xs sm:text-sm transition-all border ${
                  selectedRoot === r
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20 font-black'
                    : 'bg-[#0b0d14] text-slate-300 hover:text-white hover:bg-white/5 border-white/10'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Selector */}
        <div className="pt-2 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            2. Variação Harmônica (Maior, Menor, 7M, 7, 9, etc.):
          </span>
          <div className="flex flex-wrap gap-2">
            {QUALITIES.map(q => (
              <button
                key={q.id}
                onClick={() => setSelectedQuality(q.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedQuality === q.id
                    ? 'bg-gradient-to-r from-cyan-400 to-violet-600 text-black border-cyan-400 shadow-md font-black'
                    : 'bg-[#0b0d14] text-slate-300 hover:text-white hover:bg-white/5 border-white/10'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Piano Visualization */}
      <div className="bg-[#131722] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-syne font-black text-white">{currentChord.displayName}</span>
              <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                {currentChord.formula}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Clique em qualquer tecla para ouvir individualmente</p>
          </div>

          <button
            onClick={handlePlayChord}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Play size={14} fill="currentColor" /> Ouvir Acorde Completo
          </button>
        </div>

        {/* Realistic 2-Octave Keyboard Component */}
        <div className="flex justify-center overflow-x-auto py-4">
          <div className="relative inline-flex bg-slate-950 p-3 sm:p-4 rounded-3xl border-2 border-white/15 shadow-2xl select-none min-w-[620px]">
            {/* White Keys */}
            <div className="flex">
              {whiteKeys.map((k) => {
                const pitch = `${k.note}${k.octave}`;
                const matchedInterval = currentChord.intervals.find(
                  i => normalizeNote(i.note) === normalizeNote(k.note) && currentChord.notes.some(n => n === pitch)
                );
                const isRoot = matchedInterval?.degree.includes('1');

                return (
                  <div
                    key={pitch}
                    onClick={() => handleKeyClick(pitch)}
                    className={`relative w-11 sm:w-12 h-48 sm:h-52 rounded-b-xl border border-slate-300 cursor-pointer transition-all duration-150 flex flex-col justify-end items-center pb-3 shadow-md ${
                      matchedInterval
                        ? isRoot
                          ? 'bg-gradient-to-t from-emerald-400 to-cyan-300 text-black font-black shadow-lg shadow-cyan-400/50 scale-[0.98]'
                          : 'bg-gradient-to-t from-cyan-400 to-violet-300 text-black font-bold shadow-md shadow-violet-400/40'
                        : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-black">{k.note}</span>
                    {matchedInterval && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-black/20 mt-1">
                        {matchedInterval.degree}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Black Keys */}
            {/* Positions calculated relative to white keys */}
            {pianoKeys.map((k, idx) => {
              if (!k.isBlack) return null;
              const pitch = `${k.note}${k.octave}`;
              const matchedInterval = currentChord.intervals.find(
                i => normalizeNote(i.note) === normalizeNote(k.note) && currentChord.notes.some(n => n === pitch)
              );
              const isRoot = matchedInterval?.degree.includes('1');

              // Calculate horizontal offset
              // White key index before this black key
              const whiteKeyIndices: Record<string, number> = {
                'C#4': 0, 'D#4': 1, 'F#4': 3, 'G#4': 4, 'A#4': 5,
                'C#5': 7, 'D#5': 8, 'F#5': 10, 'G#5': 11, 'A#5': 12
              };
              const wIdx = whiteKeyIndices[pitch] ?? 0;
              // Each white key is approx 48px on sm (w-12 is 48px, + border)
              // On desktop: 48px width
              const leftPercent = ((wIdx + 1) * 7.14) - 2.5;

              return (
                <div
                  key={pitch}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKeyClick(pitch);
                  }}
                  style={{ left: `${leftPercent}%` }}
                  className={`absolute top-3 sm:top-4 w-7 sm:w-8 h-28 sm:h-32 rounded-b-lg z-20 cursor-pointer transition-all duration-150 flex flex-col justify-end items-center pb-2 border border-slate-700 shadow-xl ${
                    matchedInterval
                      ? isRoot
                        ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 text-black font-black shadow-lg shadow-cyan-400/60 scale-[0.98]'
                        : 'bg-gradient-to-t from-rose-500 to-violet-500 !text-white font-bold shadow-lg shadow-rose-500/60'
                      : 'bg-[#18181b] hover:bg-zinc-700 !text-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold piano-black-key-text">{k.note}</span>
                  {matchedInterval && (
                    <span className="text-[8px] font-black px-1 rounded bg-black/50 !text-white mt-0.5">
                      {matchedInterval.degree}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Intervals Legend and Chord Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
          <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Graus do Acorde ({currentChord.displayName})
            </span>
            <div className="flex flex-wrap gap-2">
              {currentChord.intervals.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs"
                >
                  <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                  <span className="font-bold text-white">{item.note}</span>
                  <span className="text-slate-400 font-medium">({item.degree})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Aplicação & Dica Harmônica
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              No teclado, experimente tocar a tônica ({currentChord.root}) com a mão esquerda na região grave e a terça e sétima com a mão direita para uma sonoridade aberta de piano de jazz e MPB.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
