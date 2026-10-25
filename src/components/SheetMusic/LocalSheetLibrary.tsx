import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, RefreshCw, Eye, Download, Search, 
  AlertCircle, CheckCircle2, FileText, Music, Info, 
  ChevronDown, ChevronUp, Filter, HardDrive, UploadCloud, FileUp,
  Trash2, CheckSquare, Square, Shield, Undo2, X
} from 'lucide-react';
import { 
  LocalSheetFile, 
  INSTRUMENT_CATEGORIES, 
  InstrumentCategory, 
  scanDirectoryHandle, 
  scanFileList, 
  savePersistedDirectoryHandle, 
  getPersistedDirectoryHandle,
  savePersistedSheets,
  getPersistedSheets,
  deletePersistedSheets,
  clearPersistedSheets,
  getInMemoryCachedFiles,
  getInMemoryCachedFolderName,
  formatBytes,
  getFileFromLocalItem
} from '../../services/localMusicFolder';
import { LocalFileViewerModal } from './LocalFileViewerModal';

// Helper to test if running in an iframe or cross-origin subframe
function isCrossOrSubFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // Origin access blocked -> definitely cross-origin iframe
  }
}

export const LocalSheetLibrary: React.FC = () => {
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(() => getInMemoryCachedFolderName());
  const [files, setFiles] = useState<LocalSheetFile[]>(() => getInMemoryCachedFiles());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [selectedFileForView, setSelectedFileForView] = useState<LocalSheetFile | null>(null);
  const [isSupportedFSA, setIsSupportedFSA] = useState<boolean>(false);

  // Hidden input for folder (directory) picker
  const fallbackFolderInputRef = useRef<HTMLInputElement>(null);
  // Hidden input for individual or multiple sheet files
  const fallbackFilesInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Instrument Guide / Tab
  const [activeInstrumentGuide, setActiveInstrumentGuide] = useState<InstrumentCategory | null>(null);

  // Requirement 1 & 2: Instrument naipes hidden by default
  // When clicked, expands and shows available sheets and search bar
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categorySearchTerms, setCategorySearchTerms] = useState<Record<string, string>>({});
  const [categoryFormatFilters, setCategoryFormatFilters] = useState<Record<string, string>>({});

  // Requirement 3: Exclusive Editor controls for deleting selected sheet music
  const [isEditorMode, setIsEditorMode] = useState<boolean>(true);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [excludedFileIds, setExcludedFileIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tutti_editor_excluded_sheets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showExcludedModal, setShowExcludedModal] = useState<boolean>(false);

  // Restore persisted sheets from IndexedDB on mount (so navigating across the app preserves all sheets)
  useEffect(() => {
    const inIframe = isCrossOrSubFrame();
    const supported = !inIframe && 'showDirectoryPicker' in window;
    setIsSupportedFSA(supported);

    async function restoreLibrary() {
      try {
        const persisted = await getPersistedSheets();
        if (persisted.files && persisted.files.length > 0) {
          setFiles(persisted.files);
          if (persisted.folderName) {
            setFolderName(persisted.folderName);
          }
        }
      } catch (err) {
        console.warn('Could not load persisted sheets:', err);
      }

      // Try to restore saved directory handle from IndexedDB if not in iframe
      if (supported) {
        try {
          const savedHandle = await getPersistedDirectoryHandle();
          if (savedHandle) {
            setFolderHandle(savedHandle);
            setFolderName(prev => prev || savedHandle.name);
          }
        } catch (e) {
          console.warn('Could not restore handle:', e);
        }
      }
    }

    restoreLibrary();
  }, []);

  /**
   * Action: Selecionar pasta de partituras
   */
  const handleSelectFolder = async () => {
    setStatusMessage(null);

    if (isCrossOrSubFrame() || !('showDirectoryPicker' in window)) {
      fallbackFolderInputRef.current?.click();
      return;
    }

    try {
      setIsLoading(true);
      const handle = await (window as any).showDirectoryPicker({
        id: 'tutti_music_desktop_folder',
        mode: 'read',
        startIn: 'desktop'
      });

      setFolderHandle(handle);
      setFolderName(handle.name);
      await savePersistedDirectoryHandle(handle);

      const scanned = await scanDirectoryHandle(handle);
      setFiles(scanned);
      await savePersistedSheets(scanned, handle.name);

      if (scanned.length === 0) {
        setStatusMessage({
          type: 'warning',
          text: `A pasta "${handle.name}" foi selecionada, mas não contém arquivos de partituras suportados (.pdf, .png, .jpg, .mxl, .mid). Verifique se escolheu a pasta correta (Área de Trabalho/música).`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Sucesso! ${scanned.length} arquivo(s) salvos e organizados por instrumento na pasta "${handle.name}". Você pode navegar pelo app sem perdê-los!`
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Seleção de pasta cancelada pelo usuário.');
      } else if (err.name === 'SecurityError' || err.message?.includes('Cross origin sub frames')) {
        console.info('Contexto com restrição de subframe detectado, acionando seletor nativo de diretório.');
        fallbackFolderInputRef.current?.click();
      } else {
        console.warn('showDirectoryPicker falhou, tentando seletor nativo:', err);
        fallbackFolderInputRef.current?.click();
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action: Selecionar arquivos avulsos de partituras
   */
  const handleSelectFiles = () => {
    setStatusMessage(null);
    fallbackFilesInputRef.current?.click();
  };

  /**
   * Input change handler (works for both folder and files input)
   */
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsLoading(true);
    try {
      const scanned = scanFileList(fileList);
      setFiles(scanned);

      const firstPath = fileList[0].webkitRelativePath || '';
      const detectedDirName = firstPath ? firstPath.split('/')[0] : (fileList.length > 1 ? 'música' : fileList[0].name);
      const chosenName = detectedDirName || 'música';
      setFolderName(chosenName);

      // Automatically save to IndexedDB so user can freely navigate the app without losing sheets
      await savePersistedSheets(scanned, chosenName);

      if (scanned.length === 0) {
        setStatusMessage({
          type: 'warning',
          text: `Nenhum arquivo de partitura compatível (.pdf, .jpg, .png, .mxl, .xml, .mid) foi encontrado nos arquivos selecionados.`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Sucesso! ${scanned.length} partitura(s) salvas no navegador da pasta "${chosenName}". Você pode navegar pelas outras seções do site sem que elas saiam!`
        });
      }
    } catch (err: any) {
      console.error('Erro ao ler arquivos:', err);
      setStatusMessage({
        type: 'error',
        text: `Erro ao processar arquivos: ${err?.message || 'Erro desconhecido'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Drag and drop handlers
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const extractedFiles: File[] = [];

      async function traverseEntry(entry: any, currentPath: string): Promise<void> {
        if (!entry) return;
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file((f: File) => {
              Object.defineProperty(f, 'webkitRelativePath', {
                value: currentPath ? `${currentPath}/${f.name}` : f.name,
                writable: true
              });
              extractedFiles.push(f);
              resolve();
            }, () => resolve());
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const readEntries = async (): Promise<any[]> => {
            return new Promise((resolve) => {
              dirReader.readEntries((entries: any[]) => resolve(entries || []), () => resolve([]));
            });
          };

          let entries: any[] = [];
          let batch: any[] = [];
          do {
            batch = await readEntries();
            entries = entries.concat(batch);
          } while (batch.length > 0);

          const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          for (const child of entries) {
            await traverseEntry(child, nextPath);
          }
        }
      }

      const entries: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (typeof it.webkitGetAsEntry === 'function') {
          const entry = it.webkitGetAsEntry();
          if (entry) entries.push(entry);
        } else if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f) extractedFiles.push(f);
        }
      }

      for (const entry of entries) {
        await traverseEntry(entry, '');
      }

      const scanned = scanFileList(extractedFiles as unknown as FileList);
      setFiles(scanned);
      setFolderName('música');

      // Automatically save to IndexedDB
      await savePersistedSheets(scanned, 'música');

      if (scanned.length === 0) {
        setStatusMessage({
          type: 'warning',
          text: 'Arquivos recebidos, porém nenhuma partitura com formato suportado (.pdf, .jpg, .png, .mxl, .mid) foi detectada.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Sucesso! ${scanned.length} partitura(s) salvas no navegador e organizadas por naipe. Navegue livremente pelo app!`
        });
      }
    } catch (err: any) {
      console.warn('Drop error:', err);
      setStatusMessage({
        type: 'error',
        text: `Erro ao processar itens arrastados: ${err?.message || 'Erro de leitura'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action: Atualizar biblioteca (re-read directory)
   */
  const handleRefreshLibrary = async () => {
    if (folderHandle && !isCrossOrSubFrame()) {
      setIsLoading(true);
      setStatusMessage(null);
      try {
        const permission = await (folderHandle as any).requestPermission({ mode: 'read' });
        if (permission !== 'granted') {
          setStatusMessage({
            type: 'warning',
            text: 'Permissão de leitura não concedida. Clique em "Selecionar pasta" para autorizar novamente.'
          });
          setIsLoading(false);
          return;
        }

        const scanned = await scanDirectoryHandle(folderHandle);
        setFiles(scanned);
        await savePersistedSheets(scanned, folderHandle.name);

        setStatusMessage({
          type: 'success',
          text: `Biblioteca atualizada e salva! ${scanned.length} arquivo(s) lidos da pasta "${folderHandle.name}".`
        });
      } catch (err: any) {
        console.warn('Erro ao atualizar com handle, usando seletor compatível:', err);
        fallbackFolderInputRef.current?.click();
      } finally {
        setIsLoading(false);
      }
    } else {
      setStatusMessage({
        type: 'info',
        text: 'Selecione novamente a pasta "música" da Área de Trabalho para recarregar as partituras atualizadas.'
      });
      fallbackFolderInputRef.current?.click();
    }
  };

  /**
   * Download single file
   */
  const handleDownloadFile = async (item: LocalSheetFile) => {
    try {
      const file = await getFileFromLocalItem(item);
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Download error:', err);
    }
  };

  // Toggle category open/hidden
  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const expandAllCategories = () => {
    const all = new Set(INSTRUMENT_CATEGORIES.map(c => c.id).concat(['outros']));
    setExpandedCategories(all);
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  // Requirement 3: Exclusive Editor Delete Actions
  const toggleSelectFile = (fileId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleDeleteSingleFile = (file: LocalSheetFile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir a partitura "${file.name}" da biblioteca?`)) {
      const updatedExcluded = [...excludedFileIds, file.id];
      setExcludedFileIds(updatedExcluded);
      try {
        localStorage.setItem('tutti_editor_excluded_sheets', JSON.stringify(updatedExcluded));
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
      setStatusMessage({
        type: 'info',
        text: `Partitura "${file.name}" excluída da biblioteca pelo Editor.`
      });
    }
  };

  const handleDeleteSelectedFiles = () => {
    if (selectedFileIds.size === 0) return;
    const count = selectedFileIds.size;
    if (window.confirm(`Tem certeza que deseja excluir as ${count} partitura(s) selecionada(s) da biblioteca?`)) {
      const updatedExcluded = [...excludedFileIds, ...Array.from(selectedFileIds)];
      setExcludedFileIds(updatedExcluded);
      try {
        localStorage.setItem('tutti_editor_excluded_sheets', JSON.stringify(updatedExcluded));
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
      setSelectedFileIds(new Set());
      setStatusMessage({
        type: 'info',
        text: `${count} partitura(s) excluída(s) com sucesso pelo Editor.`
      });
    }
  };

  const handleRestoreFile = (fileId: string) => {
    const updated = excludedFileIds.filter(id => id !== fileId);
    setExcludedFileIds(updated);
    try {
      localStorage.setItem('tutti_editor_excluded_sheets', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  };

  const handleRestoreAllFiles = () => {
    setExcludedFileIds([]);
    try {
      localStorage.removeItem('tutti_editor_excluded_sheets');
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
    setStatusMessage({
      type: 'success',
      text: 'Todas as partituras excluídas foram restauradas na biblioteca.'
    });
    setShowExcludedModal(false);
  };

  /**
   * Action: Limpar partituras salvas no navegador
   */
  const handleClearSavedLibrary = async () => {
    if (window.confirm('Tem certeza de que deseja limpar as partituras salvas no navegador?')) {
      await clearPersistedSheets();
      localStorage.removeItem('tutti_editor_excluded_sheets');
      setFiles([]);
      setFolderName(null);
      setExcludedFileIds([]);
      setSelectedFileIds(new Set());
      setStatusMessage({
        type: 'info',
        text: 'Biblioteca salva foi reiniciada. Você pode selecionar a pasta música novamente quando desejar.'
      });
    }
  };

  // Active files (excluding those deleted by Editor)
  const activeFiles = files.filter(f => !excludedFileIds.includes(f.id));

  // Filtered files by per-category search and format
  const getCategoryFiles = (catId: InstrumentCategory) => {
    const rawFiles = activeFiles.filter(f => f.category === catId);
    const searchTerm = (categorySearchTerms[catId] || '').trim().toLowerCase();
    const formatFilter = categoryFormatFilters[catId] || 'todos';

    return rawFiles.filter(f => {
      const matchesSearch = !searchTerm || 
        f.name.toLowerCase().includes(searchTerm) || 
        f.relativePath.toLowerCase().includes(searchTerm);
      const matchesFormat = formatFilter === 'todos' || f.extension === formatFilter;
      return matchesSearch && matchesFormat;
    });
  };

  // Group active files by category (unfiltered for counts)
  const categoryCounts: Record<InstrumentCategory, number> = {
    sax_alto: activeFiles.filter(f => f.category === 'sax_alto').length,
    sax_tenor: activeFiles.filter(f => f.category === 'sax_tenor').length,
    flauta: activeFiles.filter(f => f.category === 'flauta').length,
    trompete: activeFiles.filter(f => f.category === 'trompete').length,
    trombone: activeFiles.filter(f => f.category === 'trombone').length,
    outros: activeFiles.filter(f => f.category === 'outros').length,
  };

  const excludedFilesList = files.filter(f => excludedFileIds.includes(f.id));

  return (
    <div 
      className="space-y-6 animate-in fade-in duration-300"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden input for folder picker (allowed in all iframes and browsers) */}
      <input
        type="file"
        ref={fallbackFolderInputRef}
        onChange={handleFileInputChange}
        // @ts-ignore
        webkitdirectory="true"
        // @ts-ignore
        directory="true"
        multiple
        className="hidden"
      />

      {/* Hidden input for individual or multiple sheet files */}
      <input
        type="file"
        ref={fallbackFilesInputRef}
        onChange={handleFileInputChange}
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.mxl,.xml,.musicxml,.mid,.midi,.gp,.gp5,.gpx,.txt,.cifra,.chordpro"
        className="hidden"
      />

      {/* Hero Control Panel & Desktop Folder Selector */}
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/20 flex items-center gap-1.5">
                <Folder size={12} /> Pasta de Origem do Computador
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Área de Trabalho/música
              </span>
            </div>
            <h2 className="font-syne font-bold text-2xl sm:text-3xl text-white">
              Biblioteca de Partituras por Naipe
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              As partituras permanecem ocultas por padrão em cada naipe. Clique no instrumento desejado para abrir sua aba de partituras e a pesquisa exclusiva do naipe.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
            <button
              onClick={handleSelectFolder}
              disabled={isLoading}
              title="Escolher a pasta 'música' na sua Área de Trabalho"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl font-syne font-bold text-xs bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
            >
              <Folder size={16} />
              <span>{folderName ? 'Trocar Pasta' : 'Selecionar pasta de partituras'}</span>
            </button>

            <button
              onClick={handleRefreshLibrary}
              disabled={isLoading || (!folderName && files.length === 0)}
              title="Atualizar biblioteca de partituras"
              className="px-4 py-3 rounded-2xl font-syne font-bold text-xs bg-[#0b0d14] hover:bg-white/10 text-white border border-white/15 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Drag and Drop notice or Status banner */}
        {isDragging && (
          <div className="p-6 rounded-2xl border-2 border-dashed border-cyan-400 bg-cyan-500/10 text-center text-cyan-300 font-syne font-bold text-sm animate-pulse flex items-center justify-center gap-2">
            <UploadCloud size={24} />
            <span>Solte a pasta música ou as partituras aqui para carregar instantaneamente</span>
          </div>
        )}

        {statusMessage && !isDragging && (
          <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 animate-in fade-in ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}>
            <Info size={18} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
            <button 
              onClick={() => setStatusMessage(null)} 
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Folder Stats Strip */}
        {folderName && (
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#0b0d14] p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Origem Local</span>
              <span className="font-bold text-cyan-400 font-mono truncate block">{folderName}</span>
            </div>
            <div className="bg-[#0b0d14] p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Partituras Ativas</span>
              <span className="font-bold text-emerald-400 text-sm">{activeFiles.length} arquivos</span>
            </div>
            <div className="bg-[#0b0d14] p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Naipes com Partituras</span>
              <span className="font-bold text-violet-400 text-sm">
                {Object.values(categoryCounts).filter(c => c > 0).length} de 5 naipes
              </span>
            </div>
            <div className="bg-[#0b0d14] p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Modo do Editor</span>
              <span className="font-bold text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 size={12} /> Habilitado
              </span>
            </div>

            {/* Auto-save confirmation strip */}
            <div className="col-span-2 sm:col-span-4 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Partituras salvas automaticamente — você pode navegar por todo o site sem que elas saiam!</span>
              </div>
              <button
                onClick={handleClearSavedLibrary}
                className="text-[11px] text-slate-400 hover:text-rose-300 underline transition-colors"
                title="Limpar partituras salvas do navegador"
              >
                Limpar salvas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requirement 3: Exclusive Editor Toolbar Bar */}
      {activeFiles.length > 0 && (
        <div className="bg-[#131722] p-4 rounded-2xl border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5">
              <Shield size={13} className="text-cyan-400" />
              <span>Painel do Editor: Eliandro Lucas</span>
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Selecione partituras para excluir ou clique no botão de lixeira de cada item.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick accordion collapse / expand helpers */}
            <div className="hidden md:flex items-center gap-1 bg-[#0b0d14] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={expandAllCategories}
                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Expandir todos os naipes"
              >
                Expandir Todos
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={collapseAllCategories}
                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Ocultar todos os naipes"
              >
                Ocultar Todos
              </button>
            </div>

            {/* Deleted items manager */}
            {excludedFileIds.length > 0 && (
              <button
                onClick={() => setShowExcludedModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                title="Ver e restaurar partituras que foram excluídas pelo editor"
              >
                <Undo2 size={13} />
                <span>Excluídas ({excludedFileIds.length})</span>
              </button>
            )}

            {/* Requirement 3: Exclusive Delete Button for Selected Files */}
            {selectedFileIds.size > 0 && (
              <button
                onClick={handleDeleteSelectedFiles}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-syne font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all animate-pulse"
                title="Excluir as partituras que foram marcadas com checkbox"
              >
                <Trash2 size={14} />
                <span>Excluir Partituras Selecionadas ({selectedFileIds.size})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Initial State when no folder or files loaded */}
      {!folderName && activeFiles.length === 0 && (
        <div 
          onClick={handleSelectFolder}
          className={`bg-[#131722] border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center space-y-4 cursor-pointer transition-all ${
            isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/15 hover:border-cyan-400/50 hover:bg-[#161c2b]'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto text-3xl font-bold">
            📂
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-syne font-bold text-xl text-white">Vincular pasta de partituras do computador</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clique para escolher a pasta <strong className="text-white">Área de Trabalho/música</strong> ou simplesmente <span className="text-cyan-400 font-semibold">arraste a pasta para cá</span>. Os arquivos serão lidos localmente e classificados automaticamente por naipe (Sax Alto, Sax Tenor, Flauta, Trompete e Trombone).
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSelectFolder(); }}
              className="px-6 py-3 rounded-2xl font-syne font-bold text-xs bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg"
            >
              <Folder size={16} /> Selecionar pasta música
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSelectFiles(); }}
              className="px-5 py-3 rounded-2xl font-syne font-bold text-xs bg-white/10 hover:bg-white/20 text-white transition-opacity inline-flex items-center gap-2"
            >
              <FileUp size={16} /> Escolher arquivos individuais
            </button>
          </div>
        </div>
      )}

      {/* IF A DEDICATED INSTRUMENT GUIDE IS SELECTED: SHOW DEDICATED GUIDE FOR THAT INSTRUMENT */}
      {activeInstrumentGuide ? (
        (() => {
          const selectedCat = INSTRUMENT_CATEGORIES.find(c => c.id === activeInstrumentGuide) || INSTRUMENT_CATEGORIES[0];
          const catFiles = getCategoryFiles(selectedCat.id);
          const currentSearch = categorySearchTerms[selectedCat.id] || '';
          const currentFormat = categoryFormatFilters[selectedCat.id] || 'todos';
          const catRawFiles = activeFiles.filter(f => f.category === selectedCat.id);
          const catExtensions = Array.from(new Set(catRawFiles.map(f => f.extension)));

          return (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Back to all instruments navigation bar */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveInstrumentGuide(null)}
                  className="px-4 py-2 rounded-2xl bg-[#131722] hover:bg-[#1a2133] text-cyan-400 hover:text-cyan-300 text-xs font-bold flex items-center gap-2 border border-white/10 transition-colors shadow-md"
                >
                  <span>← Voltar para todos os instrumentos</span>
                </button>

                <span className="text-xs text-slate-400 font-medium">
                  Guia exclusiva: <strong className="text-white">{selectedCat.title}</strong>
                </span>
              </div>

              {/* Dedicated Instrument Banner with Authentic Photo */}
              <div className="bg-gradient-to-r from-[#131722] via-[#161d2d] to-[#131722] p-6 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center gap-5 z-10 text-center sm:text-left">
                  {selectedCat.image ? (
                    <div className="relative group flex-shrink-0">
                      <img
                        src={selectedCat.image}
                        alt={selectedCat.title}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-cyan-400/40 shadow-xl shadow-cyan-500/10"
                      />
                      <span className="absolute -bottom-1 -right-1 text-2xl">{selectedCat.emoji}</span>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-5xl">
                      {selectedCat.emoji}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold">
                      <span>Naipe Musical Oficial</span>
                      <span>•</span>
                      <span>{selectedCat.subtitle}</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-syne font-black text-white">
                      Partituras de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500">{selectedCat.title}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                      Todas as partituras da sua biblioteca para {selectedCat.title}. Selecione qualquer uma para abrir e tocar junto com o link oficial do YouTube sincronizado no estilo Cifra Club.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-2 z-10 flex-shrink-0">
                  <span className={`px-4 py-2 rounded-2xl text-xs font-bold border ${selectedCat.badgeColor}`}>
                    {catFiles.length} partitura(s) disponíveis
                  </span>
                  <span className="text-[11px] text-slate-400">Play-Along com YouTube integrado</span>
                </div>
              </div>

              {/* Dedicated Search & Format Filter Bar */}
              <div className="bg-[#131722] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={currentSearch}
                    onChange={(e) => setCategorySearchTerms(prev => ({ ...prev, [selectedCat.id]: e.target.value }))}
                    placeholder={`Pesquisar por nome da música em todas as partituras de ${selectedCat.title}...`}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-12 pr-10 py-3 text-sm outline-none focus:border-cyan-400 transition-colors"
                  />
                  {currentSearch && (
                    <button
                      onClick={() => setCategorySearchTerms(prev => ({ ...prev, [selectedCat.id]: '' }))}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      title="Limpar pesquisa"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {catExtensions.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                    <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Filtrar Formato:</span>
                    <button
                      onClick={() => setCategoryFormatFilters(prev => ({ ...prev, [selectedCat.id]: 'todos' }))}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                        currentFormat === 'todos'
                          ? 'bg-cyan-500 text-black shadow-md'
                          : 'bg-[#0b0d14] text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      Todos ({catRawFiles.length})
                    </button>
                    {catExtensions.map(ext => (
                      <button
                        key={ext}
                        onClick={() => setCategoryFormatFilters(prev => ({ ...prev, [selectedCat.id]: ext }))}
                        className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors ${
                          currentFormat === ext
                            ? 'bg-cyan-500 text-black shadow-md'
                            : 'bg-[#0b0d14] text-slate-400 hover:text-white border border-white/10'
                        }`}
                      >
                        .{ext} ({catRawFiles.filter(f => f.extension === ext).length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete List of Scores for This Instrument Guide */}
              {catFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFileForView(file)}
                      className="bg-[#131722] hover:bg-[#192030] p-4 rounded-3xl border border-white/10 hover:border-cyan-400/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                            file.extension === 'pdf' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                            file.extension === 'png' || file.extension === 'jpg' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                            'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}>
                            .{file.extension}
                          </span>
                          <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            YouTube Play-Along
                          </span>
                        </div>

                        <h4 className="font-syne font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-2" title={file.name}>
                          {file.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {formatBytes(file.size)} • {file.relativePath}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-cyan-400 font-bold group-hover:underline flex items-center gap-1">
                          <Eye size={13} /> Visualizar & Tocar
                        </span>
                        <div className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-400 group-hover:text-black transition-colors">
                          ▶
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-[#131722] rounded-3xl border border-white/10 space-y-3">
                  <div className="text-4xl">🔍</div>
                  <h4 className="font-syne font-bold text-white text-base">Nenhuma partitura encontrada</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Não encontramos partituras com o termo "{currentSearch}" para {selectedCat.title}. Tente outro termo ou limpe a busca.
                  </p>
                  {currentSearch && (
                    <button
                      onClick={() => setCategorySearchTerms(prev => ({ ...prev, [selectedCat.id]: '' }))}
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold"
                    >
                      Limpar filtro de pesquisa
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        /* Five Main Instrument Categories Cards (Accordion View with 10-score preview and CTA to dedicated guide) */
        <div className="space-y-4">
          {INSTRUMENT_CATEGORIES.map((cat) => {
            const isExpanded = expandedCategories.has(cat.id);
            const totalCount = categoryCounts[cat.id];
            const catFiles = getCategoryFiles(cat.id);
            const hasAnyFiles = totalCount > 0;
            // Requirement: Limit to 10 most accessed/popular scores, names in smaller formatting
            const previewFiles = catFiles.slice(0, 10);
            const hiddenCount = Math.max(0, catFiles.length - 10);

            return (
              <div
                key={cat.id}
                className={`bg-[#131722] rounded-3xl border transition-all overflow-hidden shadow-xl ${
                  isExpanded 
                    ? 'border-cyan-400/50 shadow-cyan-500/5' 
                    : hasAnyFiles 
                    ? 'border-white/15 hover:border-white/30' 
                    : 'border-white/10 opacity-75'
                }`}
              >
                {/* Instrument Header with Real Instrument Image (Flute, Trombone, Sax) */}
                <div
                  onClick={() => toggleCategory(cat.id)}
                  className="bg-[#0b0d14] px-5 sm:px-6 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#101420] transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {cat.image ? (
                      <img 
                        src={cat.image} 
                        alt={cat.title} 
                        className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md flex-shrink-0" 
                      />
                    ) : (
                      <span className="text-3xl flex-shrink-0">{cat.emoji}</span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-syne font-bold text-lg sm:text-xl text-white truncate">
                          {cat.title}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                          ({cat.subtitle})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {isExpanded ? 'Clique para recolher o resumo' : 'Clique para ver as 10 partituras mais acessadas ou abrir a guia completa'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Direct button to open dedicated instrument guide */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveInstrumentGuide(cat.id);
                      }}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black font-syne font-bold text-xs border border-cyan-500/20 transition-all shadow-sm"
                      title={`Abrir guia completa de ${cat.title} com todas as partituras e pesquisa`}
                    >
                      <span>Abrir Guia</span>
                      <span>↗</span>
                    </button>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      hasAnyFiles ? cat.badgeColor : 'bg-white/5 text-slate-500 border-white/10'
                    }`}>
                      {hasAnyFiles ? `${totalCount} partitura(s)` : '0 encontrada'}
                    </span>

                    <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180 text-cyan-400 bg-cyan-500/10' : ''
                    }`}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {/* When clicked: Show limit of 10 scores and smaller formatting */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
                    {/* Header info bar inside accordion */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0d14] p-3 rounded-2xl border border-white/10 text-xs">
                      <div className="text-slate-300">
                        <span className="font-bold text-cyan-400">Top 10 mais acessadas:</span> apenas nomes em formatação compacta. As demais estão em oculto.
                      </div>
                      <button
                        onClick={() => setActiveInstrumentGuide(cat.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black text-xs hover:opacity-90 transition-opacity self-start sm:self-auto flex items-center gap-1.5 shadow-md"
                      >
                        <span>Ver todas as {totalCount} em Guia Dedicada</span>
                        <span>→</span>
                      </button>
                    </div>

                    {/* Compact List of 10 scores - only names and small formatting */}
                    {previewFiles.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {previewFiles.map((file, idx) => (
                            <div
                              key={file.id}
                              onClick={() => setSelectedFileForView(file)}
                              className="px-3 py-2 rounded-xl bg-[#0b0d14] hover:bg-[#151a27] border border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-cyan-400 font-bold w-4 text-center">
                                  {idx + 1}.
                                </span>
                                <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate" title={file.name}>
                                  {file.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                                  .{file.extension}
                                </span>
                                <span className="text-[10px] text-red-400 group-hover:scale-110 transition-transform">
                                  ▶
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Hidden scores notification banner */}
                        {hiddenCount > 0 && (
                          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 text-center sm:text-left">
                            <span>
                              🔒 <strong>+{hiddenCount} outras partituras</strong> de {cat.title} estão em oculto nesta aba rápida.
                            </span>
                            <button
                              onClick={() => setActiveInstrumentGuide(cat.id)}
                              className="text-cyan-400 hover:underline font-bold text-xs whitespace-nowrap"
                            >
                              Abrir guia com pesquisa para ver todas ({totalCount}) →
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400 space-y-2 bg-[#0b0d14] rounded-2xl border border-white/5">
                        <p>Nenhuma partitura encontrada na pasta para {cat.title}.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Non-categorized / Other sheet files (if any) */}
      {categoryCounts.outros > 0 && (
        <div className="bg-[#131722] rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div
            onClick={() => toggleCategory('outros')}
            className="bg-[#0b0d14] px-5 sm:px-6 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#101420] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎼</span>
              <div>
                <h3 className="font-syne font-bold text-base text-white">Outras Partituras / Demais Arquivos</h3>
                <p className="text-xs text-slate-400">Arquivos que não continham o nome específico dos 5 naipes principais</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold">
                {categoryCounts.outros} arquivo(s)
              </span>
              <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 transition-transform ${
                expandedCategories.has('outros') ? 'rotate-180 text-cyan-400 bg-cyan-500/10' : ''
              }`}>
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          {expandedCategories.has('outros') && (
            <div className="p-4 sm:p-6 border-t border-white/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {getCategoryFiles('outros').map(file => (
                  <div
                    key={file.id}
                    className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase">.{file.extension}</span>
                      <div className="text-xs font-bold text-white truncate" title={file.name}>{file.name}</div>
                      <div className="text-[10px] text-slate-500">{formatBytes(file.size)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedFileForView(file)}
                        className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-400 hover:text-black"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10"
                      >
                        <Download size={13} />
                      </button>
                      {isEditorMode && (
                        <button
                          onClick={(e) => handleDeleteSingleFile(file, e)}
                          title="Excluir partitura da biblioteca"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500 hover:text-white"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Excluded Files Modal for Editor (allowing restore) */}
      {showExcludedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#0b0d14] px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield size={18} className="text-cyan-400" />
                <h3 className="font-syne font-bold text-base text-white">
                  Partituras Excluídas da Biblioteca ({excludedFilesList.length})
                </h3>
              </div>
              <button
                onClick={() => setShowExcludedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Estes arquivos foram ocultados/excluídos da exibição pelo Editor. Você pode restaurar qualquer partitura a qualquer momento:
              </p>

              {excludedFilesList.length > 0 ? (
                <div className="space-y-2">
                  {excludedFilesList.map(file => (
                    <div
                      key={file.id}
                      className="bg-[#0b0d14] p-3 rounded-xl border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{file.relativePath}</div>
                      </div>
                      <button
                        onClick={() => handleRestoreFile(file.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black font-syne font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Undo2 size={12} /> Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhuma partitura excluída no momento.
                </div>
              )}
            </div>

            {excludedFilesList.length > 0 && (
              <div className="bg-[#0b0d14] px-6 py-3 border-t border-white/10 flex justify-between items-center">
                <button
                  onClick={handleRestoreAllFiles}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Undo2 size={14} /> Restaurar Todas
                </button>
                <button
                  onClick={() => setShowExcludedModal(false)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Educational & Safety Guide Accordion / Box */}
      <div className="bg-[#0b0d14] p-6 rounded-3xl border border-white/10 space-y-3 text-xs text-slate-300">
        <h4 className="font-syne font-bold text-white text-sm flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" /> Como funciona a segurança da pasta no seu computador
        </h4>
        <ul className="space-y-1.5 list-disc list-inside text-slate-400">
          <li><strong>Oculto por padrão:</strong> Os naipes de instrumentos permanecem recolhidos para manter sua estante musical limpa e organizada.</li>
          <li><strong>Pesquisa por naipe:</strong> Ao clicar em qualquer naipe, abre-se a lista de partituras e uma barra de busca exclusiva para aquele instrumento.</li>
          <li><strong>Exclusão pelo Editor:</strong> Como editor, você pode marcar partituras com o checkbox ou clicar no botão de lixeira para removê-las da biblioteca com persistência automática.</li>
        </ul>
      </div>

      {/* Local Sheet Viewer Modal */}
      <LocalFileViewerModal
        item={selectedFileForView}
        isOpen={!!selectedFileForView}
        onClose={() => setSelectedFileForView(null)}
      />
    </div>
  );
};
