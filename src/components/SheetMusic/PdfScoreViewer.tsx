import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  RotateCw, Maximize2, Minimize2, Download, Printer, 
  ExternalLink, AlertCircle, RefreshCw, Eye
} from 'lucide-react';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
}

interface PdfScoreViewerProps {
  file?: File | Blob | null;
  fileUrl?: string | null;
  title: string;
  onDownload?: () => void;
}

export const PdfScoreViewer: React.FC<PdfScoreViewerProps> = ({
  file,
  fileUrl,
  title,
  onDownload
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.25); // Initial zoom for readable sheet music
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');

  const renderTaskRef = useRef<any>(null);

  // 1. Load the PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      // If neither file nor fileUrl is provided yet, wait gracefully without error
      if (!file && !fileUrl) {
        setLoading(false);
        setError(null);
        setPdfDoc(null);
        setNumPages(0);
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentPage(1);

      try {
        let docSource: any = null;

        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          docSource = { data: new Uint8Array(arrayBuffer) };
        } else if (fileUrl) {
          docSource = fileUrl;
        } else {
          setLoading(false);
          return;
        }

        const loadingTask = pdfjsLib.getDocument(docSource);
        const doc = await loadingTask.promise;

        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('PDF.js:', err?.message || err);
          setError(
            err?.message || 
            'Não foi possível renderizar a partitura em PDF diretamente. Tente fazer o download ou abrir em uma nova janela.'
          );
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors
        }
      }
    };
  }, [file, fileUrl]);

  // 2. Render Page onto Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) return;

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }

      setRendering(true);
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate viewport and scale
      let effectiveScale = scale;
      if (fitMode === 'width' && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48; // padding
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        if (containerWidth > 0 && unscaledViewport.width > 0) {
          effectiveScale = Math.min(2.5, Math.max(0.6, containerWidth / unscaledViewport.width));
        }
      }

      const viewport = page.getViewport({ scale: effectiveScale, rotation });

      // High-DPI support (retina / 4k) for crisp stave lines and notes
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      // Render with white background so sheet music has high contrast
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      ctx.restore();
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('PDF page render notice:', err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, numPages, scale, rotation, fitMode]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle Resize for Fit-Width
  useEffect(() => {
    const handleResize = () => {
      if (fitMode === 'width') {
        renderCurrentPage();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitMode, renderCurrentPage]);

  // Keyboard navigation (Left / Right for pages, + / - for zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage(p => Math.min(numPages, p + 1));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setFitMode('custom');
        setScale(s => Math.min(3.0, s + 0.15));
      } else if (e.key === '-') {
        e.preventDefault();
        setFitMode('custom');
        setScale(s => Math.max(0.4, s - 0.15));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full flex flex-col bg-[#0b0d14] rounded-2xl overflow-hidden border border-white/10 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black' : ''
      }`}
    >
      {/* PDF Controls Toolbar */}
      <div className="bg-[#131722] px-3 sm:px-6 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        {/* Pagination controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
            title="Página anterior (Seta esquerda)"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5 px-2 font-syne font-bold text-slate-300">
            <span>Página</span>
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  setCurrentPage(val);
                }
              }}
              className="w-12 text-center bg-[#0b0d14] border border-white/15 rounded-md py-0.5 text-cyan-400 font-mono text-xs outline-none focus:border-cyan-400"
            />
            <span>de {numPages || 1}</span>
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages || loading}
            title="Próxima página (Seta direita)"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors flex items-center justify-center"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom, Rotation and Viewport options */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom In / Out */}
          <div className="flex items-center bg-[#0b0d14] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => {
                setFitMode('custom');
                setScale(s => Math.max(0.4, Number((s - 0.15).toFixed(2))));
              }}
              title="Diminuir Zoom (-)"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={() => {
                setFitMode(fitMode === 'width' ? 'custom' : 'width');
              }}
              title="Ajustar largura automática"
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                fitMode === 'width' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              {fitMode === 'width' ? 'Ajustar' : `${Math.round(scale * 100)}%`}
            </button>
            <button
              onClick={() => {
                setFitMode('custom');
                setScale(s => Math.min(3.0, Number((s + 0.15).toFixed(2))));
              }}
              title="Aumentar Zoom (+)"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Rotate */}
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            title="Girar Partitura (90°)"
            className="p-2 rounded-xl bg-[#0b0d14] hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <RotateCw size={15} />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Sair da tela cheia' : 'Modo estante de partitura (Tela cheia)'}
            className="p-2 rounded-xl bg-[#0b0d14] hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Secondary fallback: Open in new tab */}
          <button
            onClick={handleOpenInNewTab}
            title="Abrir em nova aba do navegador"
            className="hidden md:flex p-2 rounded-xl bg-[#0b0d14] hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <ExternalLink size={15} />
          </button>
        </div>
      </div>

      {/* Canvas Viewport Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center relative bg-[#07080c] select-none">
        {loading && (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
            <div className="text-white font-syne font-bold text-sm">Carregando partitura em alta definição...</div>
            <p className="text-xs text-slate-400">Processando páginas vetoriais via renderizador nativo</p>
          </div>
        )}

        {error && (
          <div className="text-center max-w-md p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3">
            <AlertCircle size={36} className="text-rose-400 mx-auto" />
            <h4 className="font-syne font-bold text-white text-base">Não foi possível exibir a partitura</h4>
            <p className="text-xs text-rose-200">{error}</p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                onClick={handleOpenInNewTab}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-2"
              >
                <ExternalLink size={14} /> Abrir em Nova Aba
              </button>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black text-xs font-bold inline-flex items-center gap-2 transition-colors"
                >
                  <Download size={14} /> Baixar PDF
                </button>
              )}
            </div>
          </div>
        )}

        {/* The Native HTML5 Canvas */}
        <div className={`relative flex items-center justify-center ${loading || error ? 'hidden' : 'block'}`}>
          <canvas
            ref={canvasRef}
            className="rounded-xl shadow-2xl transition-all duration-150 max-w-none bg-white cursor-default"
          />

          {rendering && (
            <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-sm text-cyan-400 px-3 py-1.5 rounded-xl border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-2 shadow-lg animate-fade-in">
              <RefreshCw size={12} className="animate-spin text-cyan-400" />
              <span>Atualizando página...</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="bg-[#131722] px-4 py-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <Eye size={13} className="text-emerald-400 flex-shrink-0" />
          <span className="truncate">Visualizador nativo embutido (100% livre de bloqueios de navegador)</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>Dica: Use as <strong>setas do teclado (◀ / ▶)</strong> para virar páginas</span>
          <span>•</span>
          <span>Zoom: <strong>+</strong> e <strong>-</strong></span>
        </div>
      </div>
    </div>
  );
};
