import React, { useState, useEffect } from 'react';
import { 
  X, Download, Printer, ZoomIn, ZoomOut, RotateCw, 
  FileText, Music, Image as ImageIcon, Eye, AlertCircle, FileCheck,
  Video, ExternalLink
} from 'lucide-react';
import { LocalSheetFile, getFileFromLocalItem, formatBytes } from '../../services/localMusicFolder';
import { PdfScoreViewer } from './PdfScoreViewer';

// Match default YouTube video by filename keywords
function getInitialYouTubeUrl(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('garota') || lower.includes('ipanema')) return 'https://www.youtube.com/watch?v=kYJ5oVbY-70';
  if (lower.includes('autumn') || lower.includes('leaves')) return 'https://www.youtube.com/watch?v=PPHtQn3LjbQ';
  if (lower.includes('asa branca')) return 'https://www.youtube.com/watch?v=kly60k3mQ1Y';
  if (lower.includes('sapateiro')) return 'https://www.youtube.com/watch?v=V9L7r94rXwM';
  if (lower.includes('carinhoso')) return 'https://www.youtube.com/watch?v=17XgG7o4v2c';
  if (lower.includes('desafinado')) return 'https://www.youtube.com/watch?v=x9q8mZqQc_M';
  if (lower.includes('georgia')) return 'https://www.youtube.com/watch?v=fRgWbmG1G5c';
  if (lower.includes('flauta') || lower.includes('bach')) return 'https://www.youtube.com/watch?v=0k_2Yx5CqF8';
  return 'https://www.youtube.com/watch?v=kYJ5oVbY-70';
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0` : null;
}

interface LocalFileViewerModalProps {
  item: LocalSheetFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LocalFileViewerModal: React.FC<LocalFileViewerModalProps> = ({ item, isOpen, onClose }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<File | Blob | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isYouTubeOpen, setIsYouTubeOpen] = useState<boolean>(true);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');

  useEffect(() => {
    if (item) {
      setYoutubeUrl(getInitialYouTubeUrl(item.name));
    }
  }, [item]);

  useEffect(() => {
    let activeUrl: string | null = null;
    let isCancelled = false;

    async function loadFile() {
      if (!item) return;
      setLoading(true);
      setError(null);
      setTextContent(null);
      setFileBlob(null);
      setZoomLevel(100);
      setRotation(0);

      try {
        const file = await getFileFromLocalItem(item);
        if (!file) {
          throw new Error('Não foi possível acessar os dados do arquivo local. Conceda permissão à pasta novamente.');
        }

        if (isCancelled) return;
        setFileBlob(file);

        // If text file
        if (['txt', 'cifra', 'chordpro'].includes(item.extension)) {
          const text = await file.text();
          if (!isCancelled) setTextContent(text);
        } else {
          // Binary (PDF, Image, etc.) -> Object URL
          activeUrl = URL.createObjectURL(file);
          if (!isCancelled) setFileUrl(activeUrl);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Erro ao carregar partitura local.');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    if (isOpen && item) {
      loadFile();
    }

    return () => {
      isCancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
      setFileUrl(null);
      setFileBlob(null);
    };
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const isPdf = item.extension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(item.extension);
  const isText = ['txt', 'cifra', 'chordpro'].includes(item.extension);
  const isNotation = ['mxl', 'xml', 'musicxml', 'mid', 'midi', 'gp', 'gp5', 'gpx'].includes(item.extension);

  const handleDownload = async () => {
    try {
      const file = fileBlob || (await getFileFromLocalItem(item));
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Download error:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="bg-[#0b0d14] px-4 sm:px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
              {isPdf ? <FileText size={20} /> : isImage ? <ImageIcon size={20} /> : <Music size={20} />}
            </div>
            <div className="min-w-0">
              <h3 className="font-syne font-bold text-base sm:text-lg text-white truncate max-w-md sm:max-w-xl">
                {item.name}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Pasta Local: <span className="text-cyan-400 font-mono">{item.relativePath}</span> • {formatBytes(item.size)}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setZoomLevel(z => Math.max(40, z - 20))}
                  title="Diminuir Zoom"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="px-1 text-[11px] font-mono text-cyan-400 font-bold">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(300, z + 20))}
                  title="Aumentar Zoom"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  title="Girar Partitura"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
                >
                  <RotateCw size={16} />
                </button>
              </div>
            )}

            {/* YouTube Play-Along Toggle Button */}
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
              <span className="hidden sm:inline">{isYouTubeOpen ? 'Ocultar YouTube' : 'Tocar com YouTube'}</span>
            </button>

            <button
              onClick={handlePrint}
              title="Imprimir"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <Printer size={18} />
            </button>

            <button
              onClick={handleDownload}
              title="Baixar cópia do arquivo"
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-syne font-bold text-xs flex items-center gap-1.5 transition-colors border border-cyan-500/30"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* YOUTUBE PLAY-ALONG DOCK (ESTILO CIFRA CLUB) */}
        {isYouTubeOpen && (
          <div className="bg-[#0b0d14] px-4 sm:px-6 py-2.5 border-b border-white/10 flex flex-col md:flex-row items-center gap-3 animate-in slide-in-from-top-2">
            <div className="w-full md:w-60 h-32 rounded-2xl overflow-hidden border border-white/15 bg-black flex-shrink-0 shadow-xl relative">
              {getYouTubeEmbedUrl(youtubeUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(youtubeUrl)!}
                  title={`YouTube Play-Along: ${item.name}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-xs text-slate-400 space-y-1">
                  <Video size={22} className="text-red-400" />
                  <span className="font-semibold text-white text-[11px]">Adicionar áudio/vídeo do YouTube</span>
                  <span className="text-[10px]">Cole o link abaixo para tocar ouvindo</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5 text-xs w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-syne font-black text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    Play-Along com YouTube (Estilo Cifra Club)
                  </span>
                  <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full">
                    Tocar & Ouvir Junto
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
                Toque seu instrumento acompanhando o áudio oficial em tempo real enquanto lê a partitura logo abaixo.
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

        {/* Viewer Body */}
        <div className="flex-1 overflow-hidden bg-[#08090e] p-2 sm:p-4 flex items-center justify-center relative">
          {loading && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Carregando arquivo da pasta local...</p>
            </div>
          )}

          {error && (
            <div className="text-center max-w-md p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3">
              <AlertCircle size={36} className="text-rose-400 mx-auto" />
              <h4 className="font-syne font-bold text-white text-base">Não foi possível exibir</h4>
              <p className="text-xs text-rose-200">{error}</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-2"
              >
                <Download size={14} /> Tentar Baixar o Arquivo
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Native In-Site PDF Viewer (Canvas-based via PDF.js - 100% bypasses Microsoft Edge iframe block) */}
              {isPdf && (
                <div className="w-full h-full flex flex-col overflow-hidden">
                  {fileBlob || fileUrl ? (
                    <PdfScoreViewer
                      file={fileBlob}
                      fileUrl={fileUrl}
                      title={item.name}
                      onDownload={handleDownload}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                      <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      <p className="text-xs text-slate-400">Preparando partitura em PDF...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Image Viewer */}
              {isImage && fileUrl && (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  <img
                    src={fileUrl}
                    alt={item.name}
                    style={{
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                      transition: 'transform 0.15s ease'
                    }}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl origin-center"
                  />
                </div>
              )}

              {/* Text / Chords Viewer */}
              {isText && textContent !== null && (
                <div className="w-full h-full bg-[#0b0d14] p-6 rounded-2xl border border-white/10 overflow-auto text-left font-mono text-sm leading-relaxed text-emerald-300 whitespace-pre">
                  {textContent}
                </div>
              )}

              {/* Digital Notation / MusicXML / MIDI */}
              {isNotation && (
                <div className="text-center max-w-lg p-8 bg-[#131722] border border-cyan-500/30 rounded-3xl space-y-5 shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto text-2xl font-bold">
                    🎼
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider">
                      Notação Digital .{item.extension.toUpperCase()}
                    </span>
                    <h4 className="font-syne font-bold text-xl text-white mt-2">{item.name}</h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Este é um arquivo de notação digital ({item.extension.toUpperCase()}). Você pode exportá-lo diretamente para abrir em softwares de notação como MuseScore, Finale, Sibelius ou Guitar Pro.
                    </p>
                  </div>

                  <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 text-xs text-slate-400 space-y-1 text-left">
                    <div><strong>Tamanho:</strong> {formatBytes(item.size)}</div>
                    <div><strong>Caminho:</strong> {item.relativePath}</div>
                    <div><strong>Última modificação:</strong> {new Date(item.lastModified).toLocaleString('pt-BR')}</div>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-3.5 rounded-2xl font-syne font-bold text-sm bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download size={16} /> Baixar Arquivo de Notação
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b0d14] px-6 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <FileCheck size={14} className="text-emerald-400" />
            <span>Arquivo original preservado (leitura local segura)</span>
          </div>
          <div>Formato: <strong className="text-cyan-400 uppercase">.{item.extension}</strong></div>
        </div>
      </div>
    </div>
  );
};
