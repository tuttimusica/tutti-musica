import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Square, Download, Share2, Music, Volume2, 
  ArrowUp, ArrowDown, Printer, FileText, Upload, 
  ExternalLink, Eye, CheckCircle2, Video
} from 'lucide-react';
import { SheetMusic } from '../../data/musicData';
import { audioEngine } from '../../services/audioEngine';

// Helper to extract YouTube embed URL
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&autoplay=0` : null;
}

export interface SheetViewerModalProps {
  sheet?: SheetMusic | null;
  file?: File | Blob | null;
  pdfUrl?: string | null;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SheetViewerModal: React.FC<SheetViewerModalProps> = ({ 
  sheet, 
  file, 
  pdfUrl, 
  title, 
  isOpen, 
  onClose 
}) => {
  // Audio playback and interactive sheet state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);
  const [transposition, setTransposition] = useState<number>(0); // -6 to +6
  const [tempo, setTempo] = useState<number>(100);
  const [instrumentTimbre, setInstrumentTimbre] = useState<'piano' | 'sax' | 'guitar'>('piano');
  const [copiedLink, setCopiedLink] = useState(false);

  // YouTube play-along state (Cifra Club style)
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isYouTubeOpen, setIsYouTubeOpen] = useState<boolean>(true);

  // PDF blob state and rendering
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pdf' | 'interactive'>('pdf');
  const [embedMode, setEmbedMode] = useState<'object' | 'iframe'>('object');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to safely create an Object URL with strict 'application/pdf' MIME type
  const createSafePdfBlobUrl = (inputFile: File | Blob): string => {
    // Explicitly enforce 'application/pdf' MIME type to prevent Microsoft Edge MIME-sniffing or security blocks
    const safeBlob = (inputFile instanceof Blob && inputFile.type === 'application/pdf')
      ? inputFile
      : new Blob([inputFile], { type: 'application/pdf' });
    return URL.createObjectURL(safeBlob);
  };

  // Synchronize incoming file / pdfUrl / sheet props
  useEffect(() => {
    let createdUrl: string | null = null;

    if (file) {
      createdUrl = createSafePdfBlobUrl(file);
      setPdfBlobUrl(createdUrl);
      if (file instanceof File) {
        setLocalFileName(file.name);
      }
      setActiveTab('pdf');
    } else if (pdfUrl) {
      setPdfBlobUrl(pdfUrl);
      setActiveTab('pdf');
    } else if (sheet) {
      // If only catalog sheet is provided without a direct PDF, default to interactive
      setActiveTab('interactive');
    }

    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file, pdfUrl, sheet]);

  // Handle local PDF upload from user computer
  const handleLocalPdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      const newUrl = createSafePdfBlobUrl(selected);
      setPdfBlobUrl(newUrl);
      setLocalFileName(selected.name);
      setActiveTab('pdf');
    }
  };

  // Sync sheet state
  useEffect(() => {
    if (sheet) {
      setTempo(sheet.tempo || 100);
      setTransposition(0);
      setIsPlaying(false);
      setActiveNoteIdx(null);
      setYoutubeUrl(sheet.youtubeUrl || '');
      if (sheet.youtubeUrl) {
        setIsYouTubeOpen(true);
      }
      if (sheet.instrument.toLowerCase().includes('sax')) {
        setInstrumentTimbre('sax');
      } else if (sheet.instrument.toLowerCase().includes('violão') || sheet.instrument.toLowerCase().includes('guitar')) {
        setInstrumentTimbre('guitar');
      } else {
        setInstrumentTimbre('piano');
      }
    } else {
      setYoutubeUrl('');
    }
    return () => {
      audioEngine.stopMelody();
    };
  }, [sheet]);

  if (!isOpen || (!sheet && !file && !pdfUrl && !pdfBlobUrl)) return null;

  const displayTitle = title || sheet?.title || localFileName || 'Partitura';
  const displaySubtitle = sheet 
    ? `${sheet.composer} • ${sheet.instrument} • Tonalidade: ${sheet.tonality}`
    : localFileName ? `Arquivo local: ${localFileName}` : 'Arquivo de Partitura em PDF';

  // Transpose note algorithm
  const transposeNote = (noteStr: string, semitones: number): string => {
    if (noteStr === 'REST' || semitones === 0) return noteStr;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const normalized = noteStr
      .replace('Db', 'C#')
      .replace('Eb', 'D#')
      .replace('Gb', 'F#')
      .replace('Ab', 'G#')
      .replace('Bb', 'A#');

    const match = normalized.match(/([A-G]#?)(\d)/);
    if (!match) return noteStr;

    const baseNote = match[1];
    let octave = parseInt(match[2], 10);
    let noteIndex = notes.indexOf(baseNote);
    if (noteIndex === -1) return noteStr;

    let newIndex = noteIndex + semitones;
    while (newIndex < 0) {
      newIndex += 12;
      octave -= 1;
    }
    while (newIndex >= 12) {
      newIndex -= 12;
      octave += 1;
    }

    return `${notes[newIndex]}${octave}`;
  };

  const transposedNotes = sheet ? sheet.melodyNotes.map(n => ({
    ...n,
    note: transposeNote(n.note, transposition)
  })) : [];

  const handlePlayToggle = () => {
    if (!sheet) return;
    if (isPlaying) {
      audioEngine.stopMelody();
      setIsPlaying(false);
      setActiveNoteIdx(null);
    } else {
      setIsPlaying(true);
      audioEngine.playMelody(
        transposedNotes,
        tempo,
        instrumentTimbre,
        (idx) => setActiveNoteIdx(idx),
        () => {
          setIsPlaying(false);
          setActiveNoteIdx(null);
        }
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = () => {
    if (pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      a.download = `${displayTitle.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (sheet) {
      const element = document.createElement('a');
      const jsonBlob = new Blob([JSON.stringify(sheet, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      element.href = url;
      element.download = `${sheet.title.replace(/\s+/g, '_')}_Tutti.json`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Hidden Input for Selecting Local PDF */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleLocalPdfSelect}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="bg-[#0b0d14] px-4 sm:px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
              {activeTab === 'pdf' ? <FileText size={20} /> : <Music size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-syne font-bold text-base sm:text-lg text-white truncate max-w-md sm:max-w-xl">
                  {displayTitle}
                </h3>
                {sheet && (
                  <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                    {sheet.genre}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {displaySubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* YouTube Play-Along Button */}
            <button
              onClick={() => setIsYouTubeOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl font-syne font-bold text-xs flex items-center gap-1.5 transition-all border ${
                isYouTubeOpen && youtubeUrl
                  ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/20'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
              }`}
              title="Tocar ouvindo o YouTube (Estilo Cifra Club)"
            >
              <Video size={14} />
              <span className="hidden sm:inline">{isYouTubeOpen ? 'Ocultar Vídeo' : 'Tocar com YouTube'}</span>
            </button>

            {/* Attach/Change Local PDF button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Carregar ou substituir por arquivo PDF do computador"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-syne font-bold text-xs flex items-center gap-1.5 transition-colors border border-white/10"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">{pdfBlobUrl ? 'Trocar PDF' : 'Carregar PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              title="Imprimir partitura"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <Printer size={18} />
            </button>

            <button
              onClick={handleShare}
              title="Compartilhar"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors relative"
            >
              <Share2 size={18} />
              {copiedLink && (
                <span className="absolute -bottom-7 right-0 text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  Link copiado!
                </span>
              )}
            </button>

            <button
              onClick={handleDownload}
              title="Baixar arquivo da partitura"
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-syne font-bold text-xs flex items-center gap-1.5 transition-colors border border-cyan-500/30"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              onClick={() => {
                audioEngine.stopMelody();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* YOUTUBE PLAY-ALONG DOCK (ESTILO CIFRA CLUB) */}
        {isYouTubeOpen && (
          <div className="bg-[#0b0d14] px-4 sm:px-6 py-3 border-b border-white/10 flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top-2">
            <div className="w-full md:w-64 h-36 rounded-2xl overflow-hidden border border-white/15 bg-black flex-shrink-0 shadow-xl relative">
              {getYouTubeEmbedUrl(youtubeUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(youtubeUrl)!}
                  title={`YouTube Play-Along: ${displayTitle}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-xs text-slate-400 space-y-1">
                  <Video size={24} className="text-red-400" />
                  <span className="font-semibold text-white">Adicionar vídeo do YouTube</span>
                  <span className="text-[10px]">Cole o link abaixo para tocar ouvindo</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 text-xs w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-syne font-black text-white text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    Play-Along com YouTube (Estilo Cifra Club)
                  </span>
                  <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full">
                    Sincronizado
                  </span>
                </div>
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Abrir no YouTube</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Toque seu instrumento acompanhando o áudio oficial em tempo real enquanto lê a partitura e cifras logo abaixo.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Link do YouTube (ex: https://www.youtube.com/watch?v=...)"
                  className="flex-1 bg-[#131722] text-white border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-red-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigator (when both PDF and interactive sheet data exist) */}
        {sheet && (
          <div className="bg-[#181d2a] px-4 sm:px-6 py-2 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-3.5 py-1.5 rounded-xl font-syne font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'pdf'
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText size={14} />
                <span>Partitura em PDF ({pdfBlobUrl ? 'Disponível' : 'Carregar'})</span>
              </button>

              <button
                onClick={() => setActiveTab('interactive')}
                className={`px-3.5 py-1.5 rounded-xl font-syne font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'interactive'
                    ? 'bg-gradient-to-r from-cyan-400 to-violet-600 text-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Music size={14} />
                <span>Estudo Interativo & Áudio</span>
              </button>
            </div>

            {/* Element toggle: <object> vs <iframe> */}
            {activeTab === 'pdf' && pdfBlobUrl && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-[11px]">Elemento:</span>
                <div className="bg-[#0b0d14] p-1 rounded-xl flex gap-1 border border-white/10">
                  <button
                    onClick={() => setEmbedMode('object')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      embedMode === 'object' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    &lt;object&gt;
                  </button>
                  <button
                    onClick={() => setEmbedMode('iframe')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      embedMode === 'iframe' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    &lt;iframe&gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden bg-[#08090e] p-2 sm:p-4 flex flex-col relative">
          {/* TAB 1: PDF Viewer via <object> or <iframe> with type='application/pdf' */}
          {activeTab === 'pdf' && (
            <div className="w-full h-full flex flex-col overflow-hidden relative">
              {pdfBlobUrl ? (
                embedMode === 'object' ? (
                  // OBJECT rendering with explicit type='application/pdf' and safe blob URL
                  <object
                    data={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                    type="application/pdf"
                    className="w-full h-full rounded-2xl border border-white/10 shadow-inner bg-slate-900"
                    title={displayTitle}
                  >
                    {/* Fallback container rendered if Microsoft Edge or the browser blocks embedded plugin */}
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full bg-[#0b0d14] rounded-2xl border border-white/10">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto text-2xl font-bold">
                        <FileText size={32} />
                      </div>
                      <div className="space-y-1 max-w-md">
                        <h4 className="font-syne font-bold text-lg text-white">Visualizador de Partitura PDF</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          O arquivo PDF está pronto e servido com segurança pelo navegador via Blob URL (<code className="text-cyan-400 font-mono">application/pdf</code>).
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center pt-2">
                        <a
                          href={pdfBlobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow-lg"
                        >
                          <ExternalLink size={14} /> Abrir em Nova Guia
                        </a>
                        <button
                          onClick={handleDownload}
                          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-syne font-bold text-xs flex items-center gap-2 transition-colors border border-white/10"
                        >
                          <Download size={14} /> Baixar Arquivo
                        </button>
                      </div>
                    </div>
                  </object>
                ) : (
                  // IFRAME rendering with type='application/pdf'
                  <iframe
                    src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                    title={displayTitle}
                    {...({ type: 'application/pdf' } as any)}
                    className="w-full h-full rounded-2xl border border-white/10 shadow-inner bg-slate-900"
                  />
                )
              ) : (
                // No PDF loaded yet - prompt to select local PDF
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[#0b0d14] rounded-2xl border-2 border-dashed border-white/15 hover:border-cyan-400/50 cursor-pointer transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-3xl font-bold">
                    📄
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="font-syne font-bold text-lg text-white">Nenhum arquivo PDF carregado ainda</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Selecione um arquivo de partitura em PDF do seu computador. Ele será servido com segurança pelo navegador via Blob URL usando o leitor de PDF embutido.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-6 py-2.5 rounded-2xl font-syne font-bold text-xs bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
                  >
                    <Upload size={14} /> Selecionar Partitura em PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Interactive Notes, Audio Engine & Chords */}
          {activeTab === 'interactive' && sheet && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Playback & Transposition Controls Toolbar */}
              <div className="bg-[#131722] p-3 sm:p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                {/* Audio Player Action */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayToggle}
                    className={`px-5 py-2 rounded-xl font-syne font-bold text-sm flex items-center gap-2 transition-all shadow-md ${
                      isPlaying
                        ? 'bg-rose-500 text-white'
                        : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square size={16} fill="currentColor" /> Parar Áudio
                      </>
                    ) : (
                      <>
                        <Play size={16} fill="currentColor" /> Tocar Partitura
                      </>
                    )}
                  </button>

                  {/* Timbre selector */}
                  <div className="bg-[#0b0d14] p-1 rounded-xl flex gap-1 border border-white/10 text-xs">
                    {(['piano', 'sax', 'guitar'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setInstrumentTimbre(t)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                          instrumentTimbre === t ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t === 'piano' ? '🎹 Piano' : t === 'sax' ? '🎷 Sax' : '🎸 Violão'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transposition and Tempo */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Transpose button */}
                  <div className="flex items-center gap-2 bg-[#0b0d14] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                    <span className="text-slate-400 font-semibold">Transposição:</span>
                    <button
                      onClick={() => setTransposition(t => Math.max(-6, t - 1))}
                      className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 font-bold"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <span className="w-8 text-center font-bold text-cyan-400 font-mono">
                      {transposition > 0 ? `+${transposition}` : transposition}
                    </span>
                    <button
                      onClick={() => setTransposition(t => Math.min(6, t + 1))}
                      className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 font-bold"
                    >
                      <ArrowUp size={12} />
                    </button>
                  </div>

                  {/* Tempo Slider */}
                  <div className="flex items-center gap-2 bg-[#0b0d14] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                    <span className="text-slate-400 font-semibold">Tempo:</span>
                    <input
                      type="range"
                      min="60"
                      max="180"
                      value={tempo}
                      onChange={(e) => setTempo(Number(e.target.value))}
                      className="w-20 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                    <span className="font-bold text-white font-mono w-12">{tempo} BPM</span>
                  </div>
                </div>
              </div>

              {/* Sheet Content Area (Chords & Interactive Notes) */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Chords Sequence bar */}
                <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Volume2 size={14} className="text-cyan-400" /> Cifras Harmônicas & Progressão:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sheet.chords.map((ch, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-emerald-300 font-syne font-bold text-sm tracking-wide shadow-sm"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interactive Sheet Notes Grid */}
                <div className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Melodia & Notação Musical ({sheet.timeSignature}):
                    </span>
                    <span className="text-xs text-cyan-400 font-semibold">
                      {isPlaying ? 'Toque ativo (acompanhe as notas)' : 'Clique em "Tocar Partitura"'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {transposedNotes.map((noteItem, idx) => {
                      const isActive = isPlaying && activeNoteIdx === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-center transition-all duration-150 ${
                            isActive
                              ? 'bg-cyan-500 text-black border-cyan-400 scale-105 shadow-xl shadow-cyan-500/40'
                              : 'bg-[#131722] border-white/10 text-slate-200 hover:border-cyan-500/40'
                          }`}
                        >
                          <div className="text-2xl mb-1">{noteItem.note === 'REST' ? '𝄽' : '𝅘𝅥𝅮'}</div>
                          <div className="font-syne font-black text-lg">
                            {noteItem.note === 'REST' ? 'Pausa' : noteItem.note}
                          </div>
                          {noteItem.lyric && (
                            <div className={`text-xs mt-1 italic font-serif ${isActive ? 'text-black font-bold' : 'text-slate-400'}`}>
                              "{noteItem.lyric}"
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 mt-1">
                            {noteItem.duration} tempo(s)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Educational Notes and Master tips */}
                <div className="bg-gradient-to-r from-cyan-950/40 via-violet-950/30 to-slate-900 p-5 rounded-2xl border border-cyan-500/20 space-y-2">
                  <h4 className="font-syne font-bold text-white text-sm flex items-center gap-2">
                    💡 Dica do Maestro para esta música:
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {sheet.description} Ao tocar no {sheet.instrument}, observe as síncopes e a acentuação rítmica característica do estilo {sheet.genre}. Pratique com o andamento a {Math.round(tempo * 0.75)} BPM até que a transição de notas soe límpida e natural!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#0b0d14] px-6 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Servido com segurança pelo navegador via Blob URL (MIME type: <strong className="text-cyan-400 font-mono">application/pdf</strong>)</span>
          </div>
          <div className="hidden sm:block">
            {pdfBlobUrl ? (
              <span className="text-cyan-400 font-mono">blob:application/pdf ({embedMode})</span>
            ) : (
              <span>Modo interativo Tutti</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
