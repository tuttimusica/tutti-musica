import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX, Radio, Check } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface TunerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INSTRUMENT_STRINGS: Record<string, { name: string; note: string; freq: number }[]> = {
  violao: [
    { name: '1ª Corda (Mi)', note: 'E4', freq: 329.63 },
    { name: '2ª Corda (Si)', note: 'B3', freq: 246.94 },
    { name: '3ª Corda (Sol)', note: 'G3', freq: 196.0 },
    { name: '4ª Corda (Ré)', note: 'D3', freq: 146.83 },
    { name: '5ª Corda (Lá)', note: 'A2', freq: 110.0 },
    { name: '6ª Corda (Mi)', note: 'E2', freq: 82.41 },
  ],
  violino: [
    { name: '1ª Corda (Mi)', note: 'E5', freq: 659.25 },
    { name: '2ª Corda (Lá)', note: 'A4', freq: 440.0 },
    { name: '3ª Corda (Ré)', note: 'D4', freq: 293.66 },
    { name: '4ª Corda (Sol)', note: 'G3', freq: 196.0 },
  ],
  saxAlto: [
    { name: 'Lá de Afinação (Fá# Real)', note: 'F#4', freq: 369.99 },
    { name: 'Dó Médio', note: 'C5', freq: 523.25 },
    { name: 'Sol Básico', note: 'G4', freq: 392.0 },
    { name: 'Ré Grave', note: 'D4', freq: 293.66 },
  ],
  vocal: [
    { name: 'Lá 440 (Padrão)', note: 'A4', freq: 440.0 },
    { name: 'Dó Central (C4)', note: 'C4', freq: 261.63 },
    { name: 'Sol Médio (G4)', note: 'G4', freq: 392.0 },
    { name: 'Mi Grave (E3)', note: 'E3', freq: 164.81 },
  ]
};

export const TunerModal: React.FC<TunerModalProps> = ({ isOpen, onClose }) => {
  const [selectedInst, setSelectedInst] = useState<string>('violao');
  const [activeTone, setActiveTone] = useState<number | null>(null);
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [detectedNote, setDetectedNote] = useState<string>('A4');
  const [detectedCents, setDetectedCents] = useState<number>(0);
  const [detectedFreq, setDetectedFreq] = useState<number>(440);
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Play reference pitch
  const toggleReferenceTone = (freq: number) => {
    if (activeTone === freq) {
      audioEngine.stopTunerPitch();
      setActiveTone(null);
    } else {
      audioEngine.startTunerPitch(freq);
      setActiveTone(freq);
    }
  };

  // Start Mic Listening
  const startMic = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicListening(true);
      detectPitch();
    } catch (err: any) {
      console.warn('Mic access issue:', err);
      setMicError('Acesso ao microfone negado ou não suportado. Você pode usar os tons de referência abaixo!');
      setIsMicListening(false);
    }
  };

  const stopMic = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsMicListening(false);
  };

  const detectPitch = () => {
    if (!analyserRef.current) return;
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);

    // Auto-correlation algorithm for pitch detection
    let autoCorrelate = autoCorrelateFrequency(buffer, audioContextRef.current?.sampleRate || 44100);
    if (autoCorrelate !== -1) {
      setDetectedFreq(Math.round(autoCorrelate * 10) / 10);
      const { note, cents } = freqToNote(autoCorrelate);
      setDetectedNote(note);
      setDetectedCents(cents);
    }

    animationFrameRef.current = requestAnimationFrame(detectPitch);
  };

  // Basic Autocorrelation
  const autoCorrelateFrequency = (buf: Float32Array, sampleRate: number): number => {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.015) return -1; // signal too quiet

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const trimmedBuf = buf.slice(r1, r2);
    const c = new Array(trimmedBuf.length).fill(0);
    for (let i = 0; i < trimmedBuf.length; i++) {
      for (let j = 0; j < trimmedBuf.length - i; j++) {
        c[i] = c[i] + trimmedBuf[j] * trimmedBuf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < trimmedBuf.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;
    if (T0 === 0) return -1;
    return sampleRate / T0;
  };

  const freqToNote = (freq: number) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const j = Math.round(12 * (Math.log2(freq / 440))) + 69;
    const noteName = noteNames[j % 12];
    const octave = Math.floor(j / 12) - 1;
    const noteFreq = 440 * Math.pow(2, (j - 69) / 12);
    const cents = Math.round(1200 * Math.log2(freq / noteFreq));
    return { note: `${noteName}${octave}`, cents };
  };

  useEffect(() => {
    return () => {
      audioEngine.stopTunerPitch();
      stopMic();
    };
  }, []);

  if (!isOpen) return null;

  const currentStrings = INSTRUMENT_STRINGS[selectedInst] || INSTRUMENT_STRINGS.violao;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <Radio size={22} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-xl text-white">Afinador Tutti Pro</h3>
              <p className="text-xs text-slate-400">Microfone ao vivo e gerador de tom de referência</p>
            </div>
          </div>
          <button
            onClick={() => {
              audioEngine.stopTunerPitch();
              stopMic();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Tuner Dial */}
        <div className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden">
          <div className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-2">
            {isMicListening ? 'Ouvindo seu instrumento...' : 'Tom de Referência'}
          </div>

          <div className="flex items-baseline justify-center gap-3">
            <span className="text-6xl font-syne font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400">
              {isMicListening ? detectedNote : activeTone ? 'TOCANDO' : 'A4 (440Hz)'}
            </span>
            {isMicListening && (
              <span className="text-sm font-bold text-slate-400">{detectedFreq} Hz</span>
            )}
          </div>

          {/* Needle / Deviation Meter */}
          <div className="mt-6 max-w-xs mx-auto">
            <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
              <span>-50¢ (Grave)</span>
              <span className={`${Math.abs(detectedCents) < 5 ? 'text-emerald-500 dark:text-emerald-400 font-black' : 'text-slate-500'}`}>0 (Afinado)</span>
              <span>+50¢ (Agudo)</span>
            </div>
            <div className="h-3.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden relative border border-slate-300 dark:border-white/10 shadow-inner">
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-400 dark:bg-white/40 -translate-x-1/2 z-10"></div>
              {isMicListening && (
                <div
                  className={`absolute top-0 bottom-0 w-3.5 rounded-full -translate-x-1/2 transition-all duration-100 ${
                    Math.abs(detectedCents) < 5
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                      : detectedCents < 0
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{
                    left: `${Math.min(95, Math.max(5, 50 + detectedCents))}%`
                  }}
                />
              )}
            </div>
          </div>

          {/* Mic Button */}
          <div className="mt-5">
            {isMicListening ? (
              <button
                onClick={stopMic}
                className="px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <MicOff size={16} /> Parar Captação
              </button>
            ) : (
              <button
                onClick={startMic}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90 text-black font-bold text-sm inline-flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Mic size={16} /> Ativar Microfone
              </button>
            )}
          </div>

          {micError && (
            <p className="mt-3 text-xs text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">{micError}</p>
          )}
        </div>

        {/* Instrument Selector */}
        <div className="flex gap-1.5 p-1 bg-[#0b0d14] rounded-xl border border-white/10">
          {[
            { id: 'violao', label: '🎸 Violão' },
            { id: 'saxAlto', label: '🎷 Sax Alto' },
            { id: 'violino', label: '🎻 Violino' },
            { id: 'vocal', label: '🎤 Voz / Piano' },
          ].map(inst => (
            <button
              key={inst.id}
              onClick={() => setSelectedInst(inst.id)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedInst === inst.id
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {inst.label}
            </button>
          ))}
        </div>

        {/* Strings / Pitch Generator list */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tons de Referência Sonoros:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {currentStrings.map((item) => {
              const isPlaying = activeTone === item.freq;
              return (
                <button
                  key={item.note}
                  onClick={() => toggleReferenceTone(item.freq)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-600 dark:text-cyan-300 shadow-md shadow-cyan-500/10'
                      : 'bg-[#0b0d14] border-white/10 text-slate-700 dark:text-slate-300 hover:border-cyan-400/30'
                  }`}
                >
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.name}</div>
                    <div className="text-sm font-bold font-syne text-slate-900 dark:text-white">{item.note} ({Math.round(item.freq)} Hz)</div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPlaying ? 'bg-cyan-400 text-black' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
                    {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
