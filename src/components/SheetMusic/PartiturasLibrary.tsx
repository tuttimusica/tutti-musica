import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Music,
  Lock,
  Unlock,
  FileText,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  Crown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Loader2,
  X,
  Eye,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { SheetMusic } from '../../data/musicData';
import {
  DbConjunto,
  DbPartitura,
  PartituraFilterOptions,
  fetchConjuntoWithItems,
  fetchPartituraFilterOptions,
  fetchPartiturasPaginated,
  fetchPublishedConjuntos,
  fetchUserLibraryAccess,
  resolvePartituraPdfUrl,
} from '../../services/partiturasService';

type ViewMode = 'cards' | 'list' | 'conjuntos';
type AccessFilter = 'todas' | 'gratuitas' | 'pro' | 'destaques';

function dbPartituraToSheetMusic(p: DbPartitura): SheetMusic {
  return {
    id: p.id,
    title: p.titulo,
    composer: p.compositor,
    instrument: p.instrumento,
    tonality: p.tonalidade || 'C',
    originalKey: p.tom_original || p.tonalidade || 'C',
    family: 'Repertório Tutti',
    level: (p.nivel as SheetMusic['level']) || 'Intermediário',
    genre: p.genero || 'Bossa Nova',
    tempo: p.tempo_bpm || 120,
    timeSignature: p.compasso || '4/4',
    melodyNotes: p.melodia_notas || [],
    chords: p.cifras || [],
    description: p.descricao || `${p.compositor} — Partitura para ${p.instrumento}`,
    youtubeUrl: p.youtube_url || undefined,
    pdfUrl: p.arquivo_pdf_url || undefined,
    storagePath: p.storage_path || undefined,
    isFeatured: p.is_featured,
    featuredOrder: p.featured_order,
    categoria: p.categoria,
    preco: p.preco,
    publicado: p.publicado,
    fileSizeBytes: p.file_size_bytes,
    createdAt: p.created_at,
    createdBy: p.created_by || undefined,
  };
}

export const PartiturasLibrary: React.FC = () => {
  const { user, profile } = useAuth();
  const { userPlan, openSheetViewer, openPlansModal, showToast, navigate } = useAppRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState('todos');
  const [estiloFilter, setEstiloFilter] = useState('todos');
  const [compositorFilter, setCompositorFilter] = useState('todos');
  const [acessoFilter, setAcessoFilter] = useState<AccessFilter>('todas');
  const [selectedConjuntoId, setSelectedConjuntoId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<DbPartitura[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<PartituraFilterOptions>({
    instrumentos: [],
    estilos: [],
    compositores: [],
  });

  const [conjuntos, setConjuntos] = useState<DbConjunto[]>([]);
  const [loadingConjuntos, setLoadingConjuntos] = useState(false);
  const [activeConjuntoModal, setActiveConjuntoModal] = useState<DbConjunto | null>(null);
  const [loadingConjuntoDetail, setLoadingConjuntoDetail] = useState(false);

  const [hasFullProAccess, setHasFullProAccess] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [openingId, setOpeningId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'desenvolvedor';

  // Debounce busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Carregar opções de filtro e conjuntos publicados
  useEffect(() => {
    fetchPartituraFilterOptions().then(setFilterOptions).catch(() => {});
  }, []);

  // Carregar permissões do usuário
  useEffect(() => {
    let active = true;
    fetchUserLibraryAccess(user?.id, userPlan, isAdmin)
      .then((res) => {
        if (!active) return;
        setHasFullProAccess(res.hasFullProAccess);
        setUnlockedIds(res.unlockedIds);
      })
      .catch(() => {
        if (!active) return;
        setHasFullProAccess(Boolean(isAdmin || userPlan === 'pro' || userPlan === 'ultra'));
      });
    return () => {
      active = false;
    };
  }, [user?.id, userPlan, isAdmin]);

  const loadSheets = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchPartiturasPaginated({
        page,
        pageSize,
        search: debouncedSearch,
        instrumento: instrumentFilter,
        estilo: estiloFilter,
        compositor: compositorFilter,
        acesso: acessoFilter,
        conjuntoId: selectedConjuntoId,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (res.page !== page) {
        setPage(res.page);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível carregar as partituras no momento.');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    instrumentFilter,
    estiloFilter,
    compositorFilter,
    acessoFilter,
    selectedConjuntoId,
  ]);

  useEffect(() => {
    if (viewMode !== 'conjuntos') {
      loadSheets();
    }
  }, [viewMode, loadSheets]);

  const loadConjuntos = useCallback(async () => {
    setLoadingConjuntos(true);
    try {
      const data = await fetchPublishedConjuntos();
      setConjuntos(data);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao carregar conjuntos de partituras.');
    } finally {
      setLoadingConjuntos(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (viewMode === 'conjuntos') {
      loadConjuntos();
    }
  }, [viewMode, loadConjuntos]);

  const canReadSheet = (partitura: DbPartitura): boolean => {
    if (partitura.categoria !== 'paga') return true;
    return hasFullProAccess || unlockedIds.has(partitura.id);
  };

  const handleOpenSheet = async (partitura: DbPartitura) => {
    const isPaid = partitura.categoria === 'paga';
    if (isPaid && !canReadSheet(partitura)) {
      if (!user) {
        showToast('Faça login e ative o Tutti Pro para abrir partituras exclusivas.');
        navigate('/auth', { redirect: 'checkout_pro' });
        return;
      }
      showToast('Partitura exclusiva do Plano Tutti Pro. Desbloqueie toda a biblioteca!');
      openPlansModal();
      return;
    }

    setOpeningId(partitura.id);
    try {
      const resolved = await resolvePartituraPdfUrl(partitura);
      if (!resolved.url) {
        showToast('Arquivo PDF ainda não disponível para esta partitura.');
        return;
      }
      openSheetViewer(dbPartituraToSheetMusic(partitura), {
        pdfUrl: resolved.url,
        isPaidProtected: resolved.protected,
      });
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível abrir esta partitura.';
      showToast(msg);
      if (msg.toLowerCase().includes('pro') || msg.toLowerCase().includes('adquira')) {
        openPlansModal();
      }
    } finally {
      setOpeningId(null);
    }
  };

  const handleOpenConjuntoModal = async (conjuntoId: string) => {
    setLoadingConjuntoDetail(true);
    try {
      const detail = await fetchConjuntoWithItems(conjuntoId);
      if (detail) {
        setActiveConjuntoModal(detail);
      } else {
        showToast('Conjunto de partituras não encontrado.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro ao carregar partituras do conjunto.');
    } finally {
      setLoadingConjuntoDetail(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setInstrumentFilter('todos');
    setEstiloFilter('todos');
    setCompositorFilter('todos');
    setAcessoFilter('todas');
    setSelectedConjuntoId(null);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      instrumentFilter !== 'todos' ||
      estiloFilter !== 'todos' ||
      compositorFilter !== 'todos' ||
      acessoFilter !== 'todas' ||
      selectedConjuntoId
  );

  const selectedConjuntoTitle = conjuntos.find((c) => c.id === selectedConjuntoId)?.titulo;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-widest">
            <Music size={13} />
            <span>Acervo Digital Tutti • PDFs Oficiais</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-syne font-black text-white tracking-tight">
            Biblioteca de Partituras
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Explore partituras gratuitas e exclusivas por instrumento, estilo musical, compositor ou conjuntos completos em PDF.
          </p>
        </div>

        {/* Switcher de Visualização */}
        <div className="flex flex-wrap items-center gap-2 bg-[#131722] p-1.5 rounded-2xl border border-white/10 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <List size={14} />
            <span>Lista Compacta</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('conjuntos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'conjuntos'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>Conjuntos de Partituras</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros Combináveis (para Cards / Lista) */}
      {viewMode !== 'conjuntos' && (
        <div className="bg-[#0b0d14] border border-white/10 rounded-3xl p-4 sm:p-5 space-y-4 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Busca Textual */}
            <div className="md:col-span-5 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por título, compositor, instrumento, estilo..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Instrumento */}
            <div className="md:col-span-2">
              <select
                aria-label="Filtrar por instrumento"
                value={instrumentFilter}
                onChange={(e) => {
                  setInstrumentFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/60"
              >
                <option value="todos">Todos Instrumentos</option>
                {filterOptions.instrumentos.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Estilo Musical */}
            <div className="md:col-span-2">
              <select
                aria-label="Filtrar por estilo musical"
                value={estiloFilter}
                onChange={(e) => {
                  setEstiloFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/60"
              >
                <option value="todos">Todos Estilos</option>
                {filterOptions.estilos.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
            </div>

            {/* Compositor */}
            <div className="md:col-span-3">
              <select
                aria-label="Filtrar por compositor"
                value={compositorFilter}
                onChange={(e) => {
                  setCompositorFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/60"
              >
                <option value="todos">Todos Compositores</option>
                {filterOptions.compositores.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro de Acesso + Status + Itens por página */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={12} /> Acesso:
              </span>
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'gratuitas', label: 'Gratuitas' },
                  { id: 'pro', label: 'Exclusivas Pro' },
                  { id: 'destaques', label: 'Destaques' },
                ] as { id: AccessFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAcessoFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    acessoFilter === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-[#131722] text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {selectedConjuntoId && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                  <span>Conjunto: {selectedConjuntoTitle || 'Selecionado'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConjuntoId(null);
                      setPage(1);
                    }}
                    className="hover:text-white cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Limpar filtros</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>
                {loading ? 'Carregando...' : `${total} partitura${total === 1 ? '' : 's'} encontrada${total === 1 ? '' : 's'}`}
              </span>
              <select
                aria-label="Itens por página"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#131722] border border-white/10 text-xs text-white"
              >
                <option value={12}>12 / página</option>
                <option value={24}>24 / página</option>
                <option value={48}>48 / página</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Banner Pro para usuários Free */}
      {!hasFullProAccess && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-[#131722] to-cyan-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Crown size={20} />
            </div>
            <div>
              <h3 className="text-sm font-syne font-bold text-white">
                Desbloqueie as Partituras Exclusivas com o Plano Tutti Pro Vitalício
              </h3>
              <p className="text-xs text-slate-300">
                Tenha acesso completo aos PDFs protegidos, acervos especiais e recursos avançados do estúdio.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openPlansModal}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-syne font-black text-xs transition-all shadow-md whitespace-nowrap cursor-pointer"
          >
            Ver Planos & Liberar Pro
          </button>
        </div>
      )}

      {/* VIEW: CONJUNTOS DE PARTITURAS */}
      {viewMode === 'conjuntos' ? (
        loadingConjuntos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-52 rounded-3xl bg-[#0b0d14] border border-white/10 animate-pulse p-6" />
            ))}
          </div>
        ) : conjuntos.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0b0d14] border border-white/10 text-center space-y-3">
            <Layers size={36} className="mx-auto text-slate-500" />
            <h3 className="text-lg font-syne font-bold text-white">Nenhum conjunto publicado no momento</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Os conjuntos agrupam coleções temáticas ou arranjos completos por instrumento. Explore todas as partituras individuais na aba Cards ou Lista.
            </p>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Ver Todas as Partituras
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {conjuntos.map((conj) => (
              <div
                key={conj.id}
                className="bg-[#0b0d14] border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 flex flex-col justify-between gap-4 transition-all shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {conj.itens_count || 0} partitura{conj.itens_count === 1 ? '' : 's'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {conj.categoria === 'paga' ? 'Exclusivo Pro' : 'Acesso Aberto'}
                    </span>
                  </div>
                  <h3 className="text-lg font-syne font-bold text-white leading-snug">{conj.titulo}</h3>
                  {conj.descricao && (
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{conj.descricao}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleOpenConjuntoModal(conj.id)}
                    disabled={loadingConjuntoDetail}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-syne font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>Ver Partituras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConjuntoId(conj.id);
                      setViewMode('cards');
                      setPage(1);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#131722] hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-xs transition cursor-pointer"
                  >
                    Filtrar na Lista
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : errorMsg ? (
        /* ESTADO DE ERRO */
        <div className="p-10 rounded-3xl bg-[#0b0d14] border border-rose-500/30 text-center space-y-4">
          <AlertCircle size={36} className="mx-auto text-rose-400" />
          <div className="space-y-1">
            <h3 className="text-lg font-syne font-bold text-white">Erro ao carregar partituras</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={loadSheets}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Tentar novamente</span>
          </button>
        </div>
      ) : loading ? (
        /* SKELETON DE CARREGAMENTO */
        <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-2.5'}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className={`${
                viewMode === 'cards' ? 'h-56 rounded-3xl' : 'h-16 rounded-2xl'
              } bg-[#0b0d14] border border-white/10 animate-pulse`}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* ESTADO VAZIO */
        <div className="p-12 rounded-3xl bg-[#0b0d14] border border-white/10 text-center space-y-3">
          <Music size={36} className="mx-auto text-slate-500" />
          <h3 className="text-lg font-syne font-bold text-white">Nenhuma partitura encontrada</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tente ajustar os termos de busca ou limpar os filtros selecionados para visualizar todo o acervo disponível.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Limpar todos os filtros</span>
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* GRADE DE CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((partitura) => {
            const isPaid = partitura.categoria === 'paga';
            const unlocked = canReadSheet(partitura);
            const isBusy = openingId === partitura.id;

            return (
              <div
                key={partitura.id}
                className={`bg-[#0b0d14] border rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4 transition-all shadow-lg ${
                  partitura.is_featured
                    ? 'border-amber-500/45 shadow-amber-500/5'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {partitura.instrumento}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {partitura.is_featured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Sparkles size={10} /> Destaque
                        </span>
                      )}
                      {isPaid ? (
                        unlocked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Unlock size={10} /> Liberada Pro
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Lock size={10} /> Exclusiva Pro
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Gratuita
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-syne font-bold text-white leading-snug line-clamp-2">
                      {partitura.titulo}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {partitura.compositor}
                      {partitura.interprete ? ` • Intérprete: ${partitura.interprete}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {partitura.genero && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#131722] border border-white/10">
                        {partitura.genero}
                      </span>
                    )}
                    {partitura.tonalidade && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#131722] border border-white/10 font-mono">
                        Tom: {partitura.tonalidade}
                      </span>
                    )}
                    {partitura.nivel && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#131722] border border-white/10">
                        {partitura.nivel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSheet(partitura)}
                    disabled={isBusy}
                    className={`w-full py-2.5 px-4 rounded-xl font-syne font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 ${
                      !isPaid || unlocked
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-[#131722] hover:bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Abrindo PDF...</span>
                      </>
                    ) : !isPaid || unlocked ? (
                      <>
                        <FileText size={14} />
                        <span>Abrir Partitura em PDF</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Desbloquear no Tutti Pro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LISTA COMPACTA */
        <div className="bg-[#0b0d14] border border-white/10 rounded-3xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-[#131722]/60">
                  <th className="py-3.5 px-4 font-bold">Título</th>
                  <th className="py-3.5 px-4 font-bold">Compositor</th>
                  <th className="py-3.5 px-4 font-bold">Instrumento</th>
                  <th className="py-3.5 px-4 font-bold">Estilo / Tom</th>
                  <th className="py-3.5 px-4 font-bold">Acesso</th>
                  <th className="py-3.5 px-4 font-bold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((partitura) => {
                  const isPaid = partitura.categoria === 'paga';
                  const unlocked = canReadSheet(partitura);
                  const isBusy = openingId === partitura.id;

                  return (
                    <tr key={partitura.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{partitura.titulo}</span>
                          {partitura.is_featured && (
                            <Sparkles size={12} className="text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{partitura.compositor}</td>
                      <td className="py-3 px-4 text-cyan-300 font-medium">{partitura.instrumento}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {partitura.genero} • <span className="font-mono">{partitura.tonalidade}</span>
                      </td>
                      <td className="py-3 px-4">
                        {isPaid ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              unlocked
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {unlocked ? 'Pro Liberada' : 'Exclusiva Pro'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Gratuita
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenSheet(partitura)}
                          disabled={isBusy}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                            !isPaid || unlocked
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-[#131722] hover:bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : !isPaid || unlocked ? (
                            <FileText size={12} />
                          ) : (
                            <Lock size={12} />
                          )}
                          <span>{!isPaid || unlocked ? 'Abrir PDF' : 'Liberar Pro'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação Server-Side */}
      {viewMode !== 'conjuntos' && !loading && !errorMsg && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
          <span className="text-xs text-slate-400">
            Página <strong className="text-white">{page}</strong> de{' '}
            <strong className="text-white">{totalPages}</strong> ({total} itens)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-xl bg-[#131722] border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
              const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
              const pageNum = startPage + idx;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    pageNum === page
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-[#131722] text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-2 rounded-xl bg-[#131722] border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhe do Conjunto */}
      {activeConjuntoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="modal-dark relative w-full max-w-2xl bg-[#0b0d14] text-slate-100 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveConjuntoModal(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center border border-white/10 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1 pr-8">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                Conjunto de Partituras
              </span>
              <h3 className="text-2xl font-syne font-black text-white">{activeConjuntoModal.titulo}</h3>
              {activeConjuntoModal.descricao && (
                <p className="text-xs text-slate-400 leading-relaxed">{activeConjuntoModal.descricao}</p>
              )}
            </div>

            <div className="space-y-2.5 border-t border-white/10 pt-4">
              {(activeConjuntoModal.partituras || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Este conjunto ainda não possui partituras publicadas vinculadas.
                </p>
              ) : (
                (activeConjuntoModal.partituras || []).map((item) => {
                  const unlocked = canReadSheet(item);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#131722] border border-white/10"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white text-sm">{item.titulo}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.instrumento} • {item.compositor} • Tom {item.tonalidade}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenSheet(item)}
                        disabled={openingId === item.id}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          unlocked
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-[#0b0d14] text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {unlocked ? <FileText size={13} /> : <Lock size={13} />}
                        <span>{unlocked ? 'Abrir PDF' : 'Liberar no Pro'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};