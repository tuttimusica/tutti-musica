import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Plus, Minus, Activity, Sparkles, Volume2 } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface MetronomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TimeSignatureOption {
  id: string;
  name: string;
  beats: number;
  primaryAccents: number[]; // 1-indexed
  secondaryAccents: number[]; // 1-indexed
  category: 'Simples' | 'Compostos' | 'Longos & Renascentistas' | 'Irregulares';
  description: string;
}

export const TIME_SIGNATURES: TimeSignatureOption[] = [
  // Simples
  { id: '2/4', name: '2/4', beats: 2, primaryAccents: [1], secondaryAccents: [], category: 'Simples', description: 'Binário Simples (Marcha, Choro, Samba)' },
  { id: '3/4', name: '3/4', beats: 3, primaryAccents: [1], secondaryAccents: [], category: 'Simples', description: 'Ternário Simples (Valsa, Minueto)' },
  { id: '4/4', name: '4/4', beats: 4, primaryAccents: [1], secondaryAccents: [3], category: 'Simples', description: 'Quaternário Padrão (Pop, Rock, Jazz, Clássico)' },
  { id: '5/4', name: '5/4', beats: 5, primaryAccents: [1], secondaryAccents: [4], category: 'Irregulares', description: 'Quinário (Take Five, Jazz Moderno)' },
  
  // Compostos
  { id: '3/8', name: '3/8', beats: 3, primaryAccents: [1], secondaryAccents: [], category: 'Compostos', description: 'Ternário Rápido em colcheias' },
  { id: '6/8', name: '6/8', beats: 6, primaryAccents: [1, 4], secondaryAccents: [], category: 'Compostos', description: 'Binário Composto (Baião, Toada, Balada 6/8)' },
  { id: '9/8', name: '9/8', beats: 9, primaryAccents: [1, 4, 7], secondaryAccents: [], category: 'Compostos', description: 'Ternário Composto (Giga, Valsa Francesa)' },
  { id: '12/8', name: '12/8', beats: 12, primaryAccents: [1, 4, 7, 10], secondaryAccents: [], category: 'Compostos', description: 'Quaternário Composto (Blues Shuffle, Doo-wop)' },
  
  // Longos
  { id: '2/2', name: '2/2', beats: 2, primaryAccents: [1], secondaryAccents: [], category: 'Longos & Renascentistas', description: 'Alla Breve (Mínimas)' },
  { id: '4/2', name: '4/2', beats: 4, primaryAccents: [1], secondaryAccents: [3], category: 'Longos & Renascentistas', description: 'Quaternário em Mínimas (Música Sacra e Polifônica)' },
  { id: '7/8', name: '7/8', beats: 7, primaryAccents: [1, 3, 5], secondaryAccents: [], category: 'Irregulares', description: 'Setenário / Balcânico (3+2+2 ou 2+2+3)' },
];

export const MetronomeModal: React.FC<MetronomeModalProps> = ({ isOpen, onClose }) => {
  const [bpm, setBpm] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [selectedSignature, setSelectedSignature] = useState<TimeSignatureOption>(TIME_SIGNATURES[2]); // 4/4 default
  const [activeTabCategory, setActiveTabCategory] = useState<'Todos' | 'Simples' | 'Compostos' | 'Outros'>('Todos');

  const timerRef = useRef<number | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Presets
  const presets = [
    { name: 'Largo', bpm: 50 },
    { name: 'Andante', bpm: 76 },
    { name: 'Moderato', bpm: 108 },
    { name: 'Allegro', bpm: 132 },
    { name: 'Presto', bpm: 168 },
  ];

  // Tap tempo handler
  const handleTap = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);

    if (taps.length > 4) taps.shift();

    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 260) {
        setBpm(calculatedBpm);
      }
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentBeat(0);
      return;
    }

    const intervalMs = (60 / bpm) * 1000;
    let beatCounter = 0;

    // Trigger initial beat
    const isFirstAccent = selectedSignature.primaryAccents.includes(1);
    audioEngine.playClick(isFirstAccent);
    setCurrentBeat(1);

    timerRef.current = window.setInterval(() => {
      beatCounter = (beatCounter + 1) % selectedSignature.beats;
      const beatNum = beatCounter + 1;
      const isPrimary = selectedSignature.primaryAccents.includes(beatNum);
      audioEngine.playClick(isPrimary);
      setCurrentBeat(beatNum);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm, selectedSignature]);

  if (!isOpen) return null;

  const filteredSignatures = TIME_SIGNATURES.filter(s => {
    if (activeTabCategory === 'Todos') return true;
    if (activeTabCategory === 'Simples') return s.category === 'Simples';
    if (activeTabCategory === 'Compostos') return s.category === 'Compostos';
    return s.category === 'Longos & Renascentistas' || s.category === 'Irregulares';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto modal-dark">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/10">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="font-syne font-black text-xl text-white">Metrônomo Studio Pro</h3>
              <p className="text-xs text-slate-400 font-medium">Compassos simples, compostos (6/8, 12/8) e longos (4/2)</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsPlaying(false);
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* BPM Display & Dial */}
        <div className="text-center space-y-3 bg-[#0b0d14] p-5 rounded-3xl border border-white/10">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setBpm(b => Math.max(30, b - 5))}
              className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-sm font-bold border border-white/10 transition-colors"
            >
              -5
            </button>
            <button
              onClick={() => setBpm(b => Math.max(30, b - 1))}
              className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/10 transition-colors"
            >
              <Minus size={18} />
            </button>

            <div className="w-36">
              <div className="text-5xl sm:text-6xl font-syne font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                {bpm}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                Batidas / Minuto (BPM)
              </div>
            </div>

            <button
              onClick={() => setBpm(b => Math.min(260, b + 1))}
              className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/10 transition-colors"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setBpm(b => Math.min(260, b + 5))}
              className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-sm font-bold border border-white/10 transition-colors"
            >
              +5
            </button>
          </div>

          <input
            type="range"
            min="30"
            max="260"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-2.5 bg-slate-800 rounded-lg"
          />

          {/* Active Preset Tag */}
          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
            {presets.map(p => (
              <button
                key={p.name}
                onClick={() => setBpm(p.bpm)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  bpm === p.bpm
                    ? 'bg-gradient-to-r from-cyan-400 to-violet-600 text-black font-bold shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {p.name} ({p.bpm})
              </button>
            ))}
          </div>
        </div>

        {/* Visual Beats indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>Andamento: <strong className="text-white">{selectedSignature.name}</strong></span>
            <span>{selectedSignature.description}</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 py-2 bg-[#0b0d14] p-3 rounded-2xl border border-white/10 min-h-[64px] items-center">
            {Array.from({ length: selectedSignature.beats }).map((_, i) => {
              const beatNum = i + 1;
              const isCurrent = isPlaying && currentBeat === beatNum;
              const isPrimaryAccent = selectedSignature.primaryAccents.includes(beatNum);
              const isSecondaryAccent = selectedSignature.secondaryAccents.includes(beatNum);

              return (
                <div
                  key={i}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-100 ${
                    isCurrent
                      ? isPrimaryAccent
                        ? 'bg-gradient-to-tr from-cyan-400 to-emerald-400 text-black scale-110 shadow-lg shadow-cyan-400/50 font-black'
                        : isSecondaryAccent
                        ? 'bg-violet-500 !text-white scale-105 shadow-md shadow-violet-500/50 font-bold'
                        : 'bg-cyan-500/80 text-black scale-105 font-bold'
                      : isPrimaryAccent
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/40 font-bold'
                      : isSecondaryAccent
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-bold'
                      : 'bg-white/5 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-white/10'
                  }`}
                >
                  {beatNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Signatures Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Compasso Musical</span>
            {/* Filter category tabs */}
            <div className="inline-flex gap-1 text-[11px] bg-[#0b0d14] p-1 rounded-xl border border-white/10">
              {(['Todos', 'Simples', 'Compostos', 'Outros'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTabCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    activeTabCategory === cat
                      ? 'bg-cyan-500 text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {filteredSignatures.map(sig => {
              const isSelected = selectedSignature.id === sig.id;
              return (
                <button
                  key={sig.id}
                  onClick={() => {
                    setSelectedSignature(sig);
                    setCurrentBeat(0);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black border-cyan-400 shadow-md shadow-cyan-500/20 font-black'
                      : 'bg-[#0b0d14] text-slate-300 hover:text-white hover:bg-white/5 border-white/10'
                  }`}
                  title={sig.description}
                >
                  <span className="text-sm font-black">{sig.name}</span>
                  <span className="text-[9px] opacity-75">{sig.beats}t</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tap Tempo & Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleTap}
            className="bg-[#0b0d14] hover:bg-white/5 active:scale-95 transition-all p-3.5 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-1 group"
          >
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tap Tempo</span>
            <span className="text-xs font-black text-cyan-400 group-hover:scale-110 transition-transform">
              Toque no Ritmo 👆
            </span>
          </button>

          <div className="bg-[#0b0d14] p-3.5 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pulsos Acentuados</span>
            <span className="text-xs font-bold text-emerald-400">
              Tempos: {selectedSignature.primaryAccents.join(', ')}
            </span>
          </div>
        </div>

        {/* Main Play/Stop button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-full py-4 rounded-2xl font-syne font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
            isPlaying
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25'
              : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black hover:opacity-90 shadow-cyan-500/25 glow'
          }`}
        >
          {isPlaying ? (
            <>
              <Square size={20} fill="currentColor" /> Parar Metrônomo
            </>
          ) : (
            <>
              <Play size={20} fill="currentColor" /> Iniciar Metrônomo ({selectedSignature.name})
            </>
          )}
        </button>
      </div>
    </div>
  );
};
