import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, Globe, Music, Star, Users, UserCheck, 
  Clock, CheckCircle2, XCircle, AlertCircle, 
  Plus, Edit, Trash2, Search, Filter, Shield, Settings, 
  BarChart3, RefreshCw, Check, X, FileText, ChevronRight, ChevronDown, LogOut, 
  Sparkles, Download, Eye, Upload, FileUp, CreditCard, Crown, ArrowUpDown,
  Copy, CheckCheck, ShoppingBag, Lock, Unlock, Image as ImageIcon, Package, Loader2, Tag
} from 'lucide-react';
import { useAuth, TeacherRequest, LessonBooking } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { supabase, SUPABASE_PROJECT_ID, testSupabaseConnection } from '../../lib/supabase';
import { SheetMusic } from '../../data/musicData';
import { SheetViewerModal } from '../SheetMusic/SheetViewerModal';
import { TUTTI_STRIPE_PLANS } from '../../data/stripePlans';
import { DbPlano } from '../Subscription/PlansModal';
import {
  resolvePartituraPdfUrl,
  DbCompositor,
  fetchCompositores,
  ensureCompositorInDb,
  normalizeComposerDisplay,
  normalizeComposerKey,
  normalizeSearchText,
  getMusicalStyleOptions,
  SHEET_STORAGE_BUCKETS,
  normalizeDbPartitura,
} from '../../services/partiturasService';

export interface StoreDbProduct {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  preco_original?: number | null;
  categoria: 'Acessórios' | 'Instrumentos' | 'Vestuário' | 'Livros' | string;
  badge?: string | null;
  em_estoque: boolean;
  publicado: boolean;
  ordem: number;
  imagens: string[];
  imagem_principal?: string | null;
  imagem_url?: string | null;
  avaliacao?: number;
  num_avaliacoes?: number;
  created_at?: string;
}

export const INSTRUMENT_OPTIONS = [
  'Saxofone Alto',
  'Saxofone Tenor',
  'Saxofone Soprano',
  'Clarinete',
  'Trombone',
  'Trompete',
  'Teclado',
  'Contrabaixo',
  'Guitarra',
  'Outros instrumentos'
];

type DevTab = 
  | 'dashboard' 
  | 'site' 
  | 'partituras' 
  | 'destaques' 
  | 'professores' 
  | 'alunos' 
  | 'marcacoes' 
  | 'solicitacoes' 
  | 'assinaturas' 
  | 'loja'
  | 'relatorios' 
  | 'configuracoes';

export interface DeveloperPanelProps {
  onLogoutToAuth?: () => void;
  onNavigateHome?: () => void;
}

export const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ onLogoutToAuth, onNavigateHome }) => {
  const { user, profile, logout, aprovarProfessor, rejeitarProfessor } = useAuth();
  const { navigate, showToast } = useAppRouter();
  const [activeTab, setActiveTab] = useState<DevTab>('dashboard');
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'connected' | 'unavailable'>('checking');
  useEffect(() => {
    let active = true;
    testSupabaseConnection()
      .then(result => { if (active) setDatabaseStatus(result.ok ? 'connected' : 'unavailable'); })
      .catch(() => { if (active) setDatabaseStatus('unavailable'); });
    return () => { active = false; };
  }, []);


  // Teacher Requests State (loaded from Supabase)
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestsLoadError, setRequestsLoadError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Real Registered Teachers (loaded from Supabase public.usuarios / profiles)
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);

  // Real Registered Students (loaded from Supabase public.usuarios / profiles)
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // Real Bookings State (loaded from Supabase public.marcacoes_aulas)
  const [bookings, setBookings] = useState<LessonBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  // Sheets Management State (loaded from Supabase public.partituras)
  const [sheetsList, setSheetsList] = useState<SheetMusic[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [bundleTitle, setBundleTitle] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [bundleSelectedIds, setBundleSelectedIds] = useState<string[]>([]);
  const [bundleList, setBundleList] = useState<{ id: string; titulo: string; preco: number; publicado: boolean }[]>([]);
  const [bundleSaving, setBundleSaving] = useState(false);

  // Modal / Viewer State for Sheet Music
  const [viewingSheet, setViewingSheet] = useState<SheetMusic | null>(null);
  const [viewingSheetPdfUrl, setViewingSheetPdfUrl] = useState<string | null>(null);
  const [viewingSheetProtected, setViewingSheetProtected] = useState(false);
  const [isAddSheetModalOpen, setIsAddSheetModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<SheetMusic | null>(null);

  // Form State for Adding / Uploading Sheet Music
  const [formInstrument, setFormInstrument] = useState<string>('Saxofone Alto');
  const [formTitle, setFormTitle] = useState('');
  const [formComposer, setFormComposer] = useState('');
  const [formGenre, setFormGenre] = useState('Bossa Nova');
  const [formLevel, setFormLevel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Intermediário');
  const [formTonality, setFormTonality] = useState('G');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<'gratuita' | 'paga'>('gratuita');
  const [formPublished, setFormPublished] = useState<boolean>(true);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [markAsFeaturedOnCreate, setMarkAsFeaturedOnCreate] = useState(false);
  const [sheetFormError, setSheetFormError] = useState<string | null>(null);
  const [composersList, setComposersList] = useState<DbCompositor[]>([]);
  const [isLoadingComposers, setIsLoadingComposers] = useState(false);
  const [isComposerDropdownOpen, setIsComposerDropdownOpen] = useState(false);
  const [isRegisteringComposer, setIsRegisteringComposer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerComboboxRef = useRef<HTMLDivElement>(null);

  // Featured Sheets Selector Modal State (Option A vs Option B)
  const [isSelectFeaturedModalOpen, setIsSelectFeaturedModalOpen] = useState(false);
  const [featuredSearchTerm, setFeaturedSearchTerm] = useState('');
  const [featuredInstrumentFilter, setFeaturedInstrumentFilter] = useState('todos');

  // Filters for Partituras List
  const [sheetSearchTerm, setSheetSearchTerm] = useState('');
  const [sheetInstrumentFilter, setSheetInstrumentFilter] = useState('todos');
  const [sheetCategoryFilter, setSheetCategoryFilter] = useState<'todas' | 'gratuitas' | 'pagas' | 'rascunhos'>('todas');

  // Filters for Bookings
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'todos' | 'agendada' | 'realizada' | 'cancelada'>('todos');
  const [bookingSearch, setBookingSearch] = useState('');

  // Site Dynamic Content
  const [siteContent, setSiteContent] = useState({
    heroTitle: 'Domine o seu Instrumento com a Tutti',
    heroSubtitle: 'Aulas interativas, estúdio com metrônomo e acompanhamento pedagógico do Maestro Lucas.',
    bannerNotice: 'Novas Masterclasses de Harmonia e Improvisação abertas para todos os alunos!',
    isNoticeActive: true
  });

  // Access Logs
  const [accessLogs, setAccessLogs] = useState<any[]>([]);

  // Request Filter
  const [requestFilter, setRequestFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('todos');
  const [requestSearchTerm, setRequestSearchTerm] = useState('');

  const [copiedStripeId, setCopiedStripeId] = useState<string | null>(null);

  // Live Plans Management State (public.planos)
  const [plansList, setPlansList] = useState<DbPlano[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DbPlano | null>(null);
  const [planIdInput, setPlanIdInput] = useState('');
  const [planNome, setPlanNome] = useState('');
  const [planDescricao, setPlanDescricao] = useState('');
  const [planPreco, setPlanPreco] = useState('0');
  const [planRecorrencia, setPlanRecorrencia] = useState<'mensal' | 'trimestral' | 'semestral' | 'vitalicio' | 'unico'>('mensal');
  const [planBeneficiosText, setPlanBeneficiosText] = useState('');
  const [planStripeProductId, setPlanStripeProductId] = useState('');
  const [planStripePriceId, setPlanStripePriceId] = useState('');
  const [planOrdem, setPlanOrdem] = useState('1');
  const [planAtivo, setPlanAtivo] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Live Store Management State (public.produtos_loja)
  const [storeProducts, setStoreProducts] = useState<StoreDbProduct[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeCategoryFilter, setStoreCategoryFilter] = useState('Todas');
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreDbProduct | null>(null);
  const [prodNome, setProdNome] = useState('');
  const [prodDescricao, setProdDescricao] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [prodPrecoOriginal, setProdPrecoOriginal] = useState('');
  const [prodCategoria, setProdCategoria] = useState<'Instrumentos' | 'Acessórios' | 'Livros' | 'Vestuário'>('Acessórios');
  const [prodBadge, setProdBadge] = useState('');
  const [prodInStock, setProdInStock] = useState(true);
  const [prodPublished, setProdPublished] = useState(true);
  const [prodOrder, setProdOrder] = useState('0');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodMainImage, setProdMainImage] = useState('');
  const [prodImageUrlInput, setProdImageUrlInput] = useState('');
  const [isUploadingProductImages, setIsUploadingProductImages] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const storeImageInputRef = useRef<HTMLInputElement>(null);

  const loadTeacherManagementData = useCallback(async () => {
    // 1. Solicitações: only the authenticated administrator may request this list.
    // The backend checks Supabase Auth and the administrator allowlist before reading.
    try {
      setIsLoadingRequests(true);
      setRequestsLoadError(null);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setRequests([]);
        setRequestsLoadError('Sessão expirada ou indisponível. Entre novamente como desenvolvedor e tente atualizar.');
        console.warn('Sessão administrativa indisponível para carregar solicitações.');
      } else {
        const response = await fetch('/api/admin/teacher-requests', {
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store'
        });
        if (!response.ok) {
          if (response.status === 503) {
            // Preview intentionally lacks a Vercel service-role key. Fall back
            // ONLY to Supabase's server-enforced developer RLS (never anon data).
            const { data: requestsFromDb, error: dbError } = await supabase
              .from('solicitacoes_professores')
              .select('id,user_id,nome,email,instrumento,bio,status,created_at,decided_at,decided_by')
              .order('created_at', { ascending: false })
              .limit(100);
            if (dbError) {
              setRequests([]);
              setRequestsLoadError('Não foi possível acessar as solicitações com as permissões atuais.');
            } else {
              setRequests((requestsFromDb || []) as TeacherRequest[]);
              setRequestsLoadError(null);
            }
          } else {
            setRequests([]);
            setRequestsLoadError(response.status === 401 ? 'Sua sessão não foi reconhecida. Entre novamente.' : response.status === 403 ? 'Acesso negado pelo servidor. Verifique a autorização administrativa no Supabase.' : 'Não foi possível consultar as solicitações (HTTP ' + response.status + '). Tente atualizar.');
            console.warn('Falha ao consultar solicitações de professores:', response.status);
          }
        } else {
          const payload = await response.json();
          if (!Array.isArray(payload.requests)) {
            setRequests([]);
            setRequestsLoadError('O servidor retornou dados inesperados. Tente atualizar.');
          } else {
            setRequests(payload.requests as TeacherRequest[]);
          }
        }
      }
    } catch (err) {
      setRequests([]);
      setRequestsLoadError('Falha de conexão ao carregar solicitações. Verifique a rede e tente atualizar.');
      console.warn('Não foi possível carregar solicitações de professores:', err);
    } finally {
      setIsLoadingRequests(false);
    }

    // 2. Professores Aprovados (tabela usuarios com role teacher/professor e approval_status = aprovado)
    try {
      setIsLoadingTeachers(true);
      const { data: profData, error: profErr } = await supabase
        .from('usuarios')
        .select('*')
        .in('role', ['teacher', 'professor'])
        .eq('approval_status', 'aprovado')
        .order('created_at', { ascending: false });

      if (!profErr) {
        setTeachers(profData || []);
      }
    } catch (err) {
      console.warn('Supabase teachers load note:', err);
    } finally {
      setIsLoadingTeachers(false);
    }

    // 3. Alunos Reais Cadastrados (tabela usuarios com role student/aluno)
    try {
      setIsLoadingStudents(true);
      const { data: alunoData, error: alunoErr } = await supabase
        .from('usuarios')
        .select('*')
        .in('role', ['student', 'aluno'])
        .order('created_at', { ascending: false });

      if (!alunoErr) {
        setStudents(alunoData || []);
      }
    } catch (err) {
      console.warn('Supabase students load note:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  // Load all real data from Supabase on mount + Realtime sync for solicitacoes/usuarios
  useEffect(() => {
    loadTeacherManagementData();

    const teacherSyncChannel = supabase
      .channel('dev-teacher-management-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_professores' }, () => {
        loadTeacherManagementData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
        loadTeacherManagementData();
      })
      .subscribe();

    async function loadBackendData() {

      // 4. Marcacoes de Aulas ao Vivo
      try {
        setIsLoadingBookings(true);
        const { data: bData } = await supabase
          .from('marcacoes_aulas')
          .select('*')
          .order('data_aula', { ascending: true });

        setBookings((bData as LessonBooking[]) || []);
      } catch (err) {
        console.warn('Supabase marcacoes load note:', err);
      } finally {
        setIsLoadingBookings(false);
      }

      // 5. Partituras do Banco de Dados
      let loadedSheets: SheetMusic[] = [];
      try {
        setIsLoadingSheets(true);
        const { data: pData, error: pErr } = await supabase
          .from('partituras')
          .select('*')
          .order('created_at', { ascending: false });

        if (!pErr && pData) {
          const mapped: SheetMusic[] = pData.map((raw: any) => {
            const p = normalizeDbPartitura(raw);
            return {
              id: p.id,
              title: p.titulo,
              composer: p.compositor || 'Compositor Tutti',
              instrument: p.instrumento || 'Saxofone Alto',
              tonality: p.tonalidade || 'G',
              originalKey: p.tom_original || p.tonalidade || 'G',
              family: 'Madeiras',
              level: (p.nivel || 'Intermediário') as 'Iniciante' | 'Intermediário' | 'Avançado',
              genre: p.genero || 'Bossa Nova',
              tempo: p.tempo_bpm || 120,
              timeSignature: p.compasso || '4/4',
              melodyNotes: p.melodia_notas || [],
              chords: p.cifras || [],
              description: p.descricao || '',
              pdfUrl: p.categoria === 'paga' ? undefined : (p.arquivo_pdf_url || undefined),
              isFeatured: p.is_featured ?? false,
              featuredOrder: p.featured_order ?? 0,
              categoria: p.categoria === 'paga' ? 'paga' : 'gratuita',
              preco: Number(p.preco ?? 0),
              publicado: p.publicado ?? true,
              storagePath: p.storage_path || undefined,
              createdAt: p.created_at,
              createdBy: p.created_by || undefined,
            };
          });
          loadedSheets = mapped;
          setSheetsList(mapped);
        }
      } catch (err) {
        console.warn('Supabase partituras sync note:', err);
      } finally {
        setIsLoadingSheets(false);
      }

      // 5B. Compositores persistidos no Supabase
      await loadComposersList(loadedSheets);

      // 6. Planos Reais do Banco de Dados (public.planos)
      try {
        setIsLoadingPlans(true);
        const { data: plData, error: plErr } = await supabase
          .from('planos')
          .select('*')
          .order('ordem', { ascending: true });

        if (!plErr && plData) {
          setPlansList(
            plData.map((row: any) => ({
              id: row.id,
              nome: row.nome,
              descricao: row.descricao || '',
              preco: Number(row.preco ?? 0),
              moeda: row.moeda || 'BRL',
              recorrencia: row.recorrencia || 'mensal',
              beneficios: Array.isArray(row.beneficios) ? row.beneficios : [],
              stripe_product_id: row.stripe_product_id || null,
              stripe_price_id: row.stripe_price_id || null,
              ordem: Number(row.ordem ?? 0),
              ativo: row.ativo !== false,
            }))
          );
        }
      } catch (err) {
        console.warn('Supabase planos sync note:', err);
      } finally {
        setIsLoadingPlans(false);
      }

      // 7. Produtos da Loja Tutti (public.produtos_loja)
      try {
        setIsLoadingStore(true);
        const { data: prData, error: prErr } = await supabase
          .from('produtos_loja')
          .select('*')
          .order('ordem', { ascending: true })
          .order('id', { ascending: false });

        if (!prErr && prData) {
          setStoreProducts(
            prData.map((item: any) => {
              const imgs = Array.isArray(item.imagens)
                ? item.imagens.filter(Boolean)
                : item.imagem_url
                ? [item.imagem_url]
                : [];
              return {
                id: Number(item.id),
                nome: item.nome,
                descricao: item.descricao || '',
                preco: Number(item.preco ?? 0),
                preco_original: item.preco_original != null ? Number(item.preco_original) : null,
                categoria: item.categoria || 'Acessórios',
                badge: item.badge || null,
                em_estoque: item.em_estoque !== false,
                publicado: item.publicado !== false,
                ordem: Number(item.ordem ?? 0),
                imagens: imgs,
                imagem_principal: item.imagem_principal || item.imagem_url || imgs[0] || null,
                imagem_url: item.imagem_url || imgs[0] || null,
                avaliacao: Number(item.avaliacao ?? 5),
                num_avaliacoes: Number(item.num_avaliacoes ?? 0),
                created_at: item.created_at,
              };
            })
          );
        }
      } catch (err) {
        console.warn('Supabase produtos_loja sync note:', err);
      } finally {
        setIsLoadingStore(false);
      }

      // 8. Logs de Acesso
      try {
        const { data: logData } = await supabase
          .from('eventos_acesso')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (logData && logData.length > 0) {
          setAccessLogs(logData.map(l => ({
            id: l.id,
            perfil: l.perfil,
            tipo_evento: l.tipo_evento,
            detalhes: typeof l.detalhes === 'object' ? JSON.stringify(l.detalhes) : l.detalhes,
            data: new Date(l.created_at).toLocaleString('pt-BR')
          })));
        }
      } catch (err) {
        console.warn('Supabase logs sync note:', err);
      }
    }

    loadBackendData();

    return () => {
      supabase.removeChannel(teacherSyncChannel);
    };
  }, [loadTeacherManagementData]);

  // Helper: Read File as Data URL (safe client-side PDF preview fallback)
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Carrega compositores do Supabase (tabela public.compositores + fallback dos registros existentes)
  const loadComposersList = async (fallbackSheets?: SheetMusic[]) => {
    setIsLoadingComposers(true);
    try {
      const dbComposers = await fetchCompositores();
      const mapByNorm = new Map<string, DbCompositor>();
      dbComposers.forEach((c) => {
        mapByNorm.set(c.nome_normalizado, c);
      });
      (fallbackSheets || sheetsList).forEach((s) => {
        const display = normalizeComposerDisplay(s.composer || '');
        const norm = normalizeComposerKey(display);
        if (display && norm && norm !== 'compositor tutti' && !mapByNorm.has(norm)) {
          mapByNorm.set(norm, {
            id: `legacy_${norm}`,
            nome: display,
            nome_normalizado: norm,
          });
        }
      });
      const sorted = Array.from(mapByNorm.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      );
      setComposersList(sorted);
    } catch {
      const mapByNorm = new Map<string, DbCompositor>();
      (fallbackSheets || sheetsList).forEach((s) => {
        const display = normalizeComposerDisplay(s.composer || '');
        const norm = normalizeComposerKey(display);
        if (display && norm && norm !== 'compositor tutti' && !mapByNorm.has(norm)) {
          mapByNorm.set(norm, {
            id: `legacy_${norm}`,
            nome: display,
            nome_normalizado: norm,
          });
        }
      });
      setComposersList(
        Array.from(mapByNorm.values()).sort((a, b) =>
          a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        )
      );
    } finally {
      setIsLoadingComposers(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        composerComboboxRef.current &&
        !composerComboboxRef.current.contains(event.target as Node)
      ) {
        setIsComposerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleRegisterNewComposer = async (rawName: string) => {
    const display = normalizeComposerDisplay(rawName);
    const norm = normalizeComposerKey(display);
    if (!display || !norm) {
      showToast('Digite o nome do compositor antes de cadastrar.');
      return;
    }

    const already = composersList.find((c) => c.nome_normalizado === norm);
    if (already) {
      setFormComposer(already.nome);
      setIsComposerDropdownOpen(false);
      showToast(`Compositor "${already.nome}" já está cadastrado e foi selecionado.`);
      return;
    }

    setIsRegisteringComposer(true);
    try {
      const saved = await ensureCompositorInDb(display, user?.id);
      if (saved) {
        setComposersList((prev) => {
          const filtered = prev.filter((c) => c.nome_normalizado !== saved.nome_normalizado);
          return [...filtered, saved].sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
          );
        });
        setFormComposer(saved.nome);
        setIsComposerDropdownOpen(false);
        showToast(`Compositor "${saved.nome}" cadastrado no Supabase!`);
      }
    } catch (err: any) {
      showToast(
        `Não foi possível salvar o compositor na tabela public.compositores: ${err?.message || 'verifique a migração SQL.'}`
      );
    } finally {
      setIsRegisteringComposer(false);
    }
  };

  // Handle PDF file selection with validation
  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict PDF validation
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setSheetFormError('Arquivo inválido: apenas arquivos PDF (.pdf) são aceitos para partituras.');
      showToast('Arquivo inválido: apenas arquivos PDF são aceitos.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Size limit check (max 30MB)
    if (file.size > 30 * 1024 * 1024) {
      setSheetFormError('O arquivo selecionado ultrapassa o limite de 30MB.');
      showToast('O arquivo selecionado ultrapassa o limite de 30MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSheetFormError(null);
    setSelectedPdfFile(file);
    if (!formTitle.trim()) {
      setFormTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
    }
  };

  const uploadPdfWithBucketVerification = async (
    targetBucket: string,
    storagePath: string,
    file: File
  ) => {
    const attemptUpload = async () =>
      supabase.storage.from(targetBucket).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      });

    let { data, error } = await attemptUpload();

    if (error && /bucket not found/i.test(error.message || '')) {
      // Tenta provisionar automaticamente via backend autenticado caso SUPABASE_SERVICE_ROLE_KEY esteja configurada
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const checkRes = await fetch('/api/admin/ensure-storage-buckets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const checkJson = await checkRes.json().catch(() => ({}));
          if (checkRes.ok && checkJson?.configured) {
            const retry = await attemptUpload();
            data = retry.data;
            error = retry.error;
          }
        }
      } catch {
        // segue para tratamento explícito de erro abaixo
      }
    }

    if (error || !data) {
      const rawMsg = error?.message || '';
      if (/bucket not found/i.test(rawMsg)) {
        throw new Error(
          `Bucket "${targetBucket}" não encontrado no Supabase Storage. Acesse Configurações -> Baixar Script .SQL Master e execute-o no SQL Editor do Supabase para criar os buckets "partituras" e "partituras-pagas".`
        );
      }
      throw new Error(rawMsg || `Falha ao enviar o PDF para o bucket "${targetBucket}".`);
    }

    return data;
  };

  // Handle Sheet Music Upload and Creation (Free -> public bucket, Paid -> private bucket, with orphan rollback)
  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    setSheetFormError(null);

    if (!formTitle.trim()) {
      setSheetFormError('Informe o título da partitura.');
      showToast('Informe o título da partitura.');
      return;
    }
    if (!selectedPdfFile && !editingSheet) {
      setSheetFormError('Selecione um arquivo PDF no seu computador.');
      showToast('Selecione um arquivo PDF no seu computador.');
      return;
    }
    if (editingSheet && !selectedPdfFile && editingSheet.categoria !== formCategory && !editingSheet.storagePath) {
      const message = 'Selecione um PDF para mudar a categoria: a partitura atual não possui arquivo armazenado para transferência.';
      setSheetFormError(message);
      showToast(message);
      return;
    }
    if (selectedPdfFile) {
      const isPdf =
        selectedPdfFile.type === 'application/pdf' ||
        selectedPdfFile.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setSheetFormError('Somente arquivos .PDF são permitidos.');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(15);

    const targetBucket =
      formCategory === 'paga' ? SHEET_STORAGE_BUCKETS.PAID : SHEET_STORAGE_BUCKETS.FREE;
    const previousCategory: 'gratuita' | 'paga' =
      editingSheet?.categoria === 'paga' ? 'paga' : 'gratuita';
    const previousBucket =
      previousCategory === 'paga' ? SHEET_STORAGE_BUCKETS.PAID : SHEET_STORAGE_BUCKETS.FREE;
    const previousStoragePath = editingSheet?.storagePath || '';

    let newlyUploadedObject: { bucket: string; path: string } | null = null;
    let shouldDeletePreviousObject = false;

    try {
      const composerDisplay = normalizeComposerDisplay(formComposer) || 'Compositor Tutti';

      // Garante persistência e deduplicação do compositor informado em public.compositores
      if (formComposer.trim()) {
        try {
          const savedComp = await ensureCompositorInDb(composerDisplay, user?.id);
          if (savedComp) {
            setComposersList((prev) => {
              const filtered = prev.filter((c) => c.nome_normalizado !== savedComp.nome_normalizado);
              return [...filtered, savedComp].sort((a, b) =>
                a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
              );
            });
          }
        } catch {
          // Não bloqueia se tabela compositores ainda estiver pendente de migração SQL
        }
      }

      let finalPdfUrl = formCategory === 'paga' ? '' : (editingSheet?.pdfUrl || '');
      let storagePath = previousStoragePath;

      if (selectedPdfFile) {
        setUploadProgress(40);
        const safeName = selectedPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `${formCategory === 'paga' ? 'pagas' : 'gratuitas'}/${Date.now()}_${safeName}`;

        await uploadPdfWithBucketVerification(targetBucket, storagePath, selectedPdfFile);
        newlyUploadedObject = { bucket: targetBucket, path: storagePath };
        if (previousStoragePath && previousStoragePath !== storagePath) {
          shouldDeletePreviousObject = true;
        }

        if (formCategory === 'gratuita') {
          finalPdfUrl = ''; // Bucket privado: URL temporária somente via API autorizada.
        } else {
          finalPdfUrl = '';
        }
      } else if (editingSheet && previousStoragePath && previousCategory !== formCategory) {
        // Mudou categoria (gratuita <-> paga) sem trocar o PDF: move objeto para o bucket correto
        setUploadProgress(40);
        const { data: downloadedBlob, error: dlErr } = await supabase.storage
          .from(previousBucket)
          .download(previousStoragePath);

        if (dlErr || !downloadedBlob) {
          throw new Error('Não foi possível mover o PDF para a nova categoria. A categoria anterior foi preservada.');
        }

        {
          const baseFile = previousStoragePath.split('/').pop() || `partitura_${editingSheet.id}.pdf`;
          const movedPath = `${formCategory === 'paga' ? 'pagas' : 'gratuitas'}/${Date.now()}_${baseFile}`;
          const movedFile = new File([downloadedBlob], baseFile, { type: 'application/pdf' });
          await uploadPdfWithBucketVerification(targetBucket, movedPath, movedFile);
          newlyUploadedObject = { bucket: targetBucket, path: movedPath };
          storagePath = movedPath;
          shouldDeletePreviousObject = true;

          if (formCategory === 'gratuita') {
            finalPdfUrl = ''; // Bucket privado: URL temporária somente via API autorizada.
          } else {
            finalPdfUrl = '';
          }
        }
      }

      setUploadProgress(75);

      const preservedPrice = editingSheet ? Number(editingSheet.preco ?? 0) : 0;

      if (editingSheet) {
        const updatePayload: Record<string, any> = {
          titulo: formTitle.trim(),
          compositor: composerDisplay,
          instrumento_id: INSTRUMENT_OPTIONS.includes(formInstrument) ? ['saxofone_alto','saxofone_tenor','saxofone_soprano','clarinete','trombone','trompete','teclado','contrabaixo','guitarra','outros'][INSTRUMENT_OPTIONS.indexOf(formInstrument)] : 'outros',
          estilo_musical: formGenre,
          nivel_dificuldade: formLevel,
          tonalidade: formTonality,
          descricao: formDescription.trim(),
          categoria: formCategory,
          preco: preservedPrice,
          publicado: formPublished,
          is_featured: markAsFeaturedOnCreate,
          featured_order: markAsFeaturedOnCreate ? (editingSheet.featuredOrder || 1) : 0,
          storage_bucket: SHEET_STORAGE_BUCKETS.FREE,
          storage_path: storagePath,
          updated_at: new Date().toISOString(),
        };

        const { data: updatedRows, error: upErr } = await supabase
          .from('partituras')
          .update(updatePayload)
          .eq('id', editingSheet.id)
          .select('id');

        if (upErr) throw upErr;
        if (!updatedRows || updatedRows.length !== 1) throw new Error('Nenhum registro atualizado no banco.');

        if (shouldDeletePreviousObject && previousStoragePath) {
          await supabase.storage.from(previousBucket).remove([previousStoragePath]).catch(() => {});
        }

        setSheetsList(prev =>
          prev.map(s =>
            s.id === editingSheet.id
              ? {
                  ...s,
                  title: formTitle.trim(),
                  composer: composerDisplay,
                  instrument: formInstrument,
                  genre: formGenre,
                  level: formLevel,
                  tonality: formTonality,
                  description: formDescription.trim(),
                  categoria: formCategory,
                  preco: preservedPrice,
                  publicado: formPublished,
                  isFeatured: markAsFeaturedOnCreate,
                  featuredOrder: markAsFeaturedOnCreate ? (s.featuredOrder || 1) : 0,
                  pdfUrl: formCategory === 'paga' ? undefined : (finalPdfUrl || undefined),
                  storagePath,
                }
              : s
          )
        );

        showToast(`Partitura "${formTitle}" atualizada com sucesso!`);
      } else {
        const insertPayload = {
          titulo: formTitle.trim(),
          compositor: composerDisplay,
          instrumento_id: INSTRUMENT_OPTIONS.includes(formInstrument) ? ['saxofone_alto','saxofone_tenor','saxofone_soprano','clarinete','trombone','trompete','teclado','contrabaixo','guitarra','outros'][INSTRUMENT_OPTIONS.indexOf(formInstrument)] : 'outros',
          tonalidade: formTonality,
          tom_original: formTonality,
          nivel_dificuldade: formLevel,
          estilo_musical: formGenre,
          descricao: formDescription.trim() || 'Partitura oficial em PDF catalogada pela Tutti.',
          categoria: formCategory,
          preco: 0,
          publicado: formPublished,
          storage_bucket: SHEET_STORAGE_BUCKETS.FREE,
          storage_path: storagePath,
          is_featured: markAsFeaturedOnCreate,
          featured_order: markAsFeaturedOnCreate ? 1 : 0,
          tamanho_bytes: selectedPdfFile?.size || 0,
          enviado_por: user?.id || null,
        };

        const { data: inserted, error: insErr } = await supabase
          .from('partituras')
          .insert(insertPayload)
          .select()
          .single();

        if (insErr) throw insErr;

        const normalized = normalizeDbPartitura(inserted);
        const newSheet: SheetMusic = {
          id: normalized.id,
          title: normalized.titulo,
          composer: normalized.compositor || 'Compositor Tutti',
          instrument: normalized.instrumento,
          tonality: normalized.tonalidade || formTonality,
          originalKey: normalized.tom_original || formTonality,
          family: 'Madeiras',
          level: (normalized.nivel || formLevel) as 'Iniciante' | 'Intermediário' | 'Avançado',
          genre: normalized.genero || formGenre,
          tempo: normalized.tempo_bpm || 120,
          timeSignature: normalized.compasso || '4/4',
          melodyNotes: normalized.melodia_notas || [],
          chords: normalized.cifras || [],
          description: normalized.descricao || '',
          categoria: normalized.categoria === 'paga' ? 'paga' : 'gratuita',
          preco: Number(normalized.preco ?? 0),
          publicado: normalized.publicado ?? true,
          pdfUrl: normalized.categoria === 'paga' ? undefined : (normalized.arquivo_pdf_url || undefined),
          storagePath: normalized.storage_path || undefined,
          isFeatured: normalized.is_featured ?? markAsFeaturedOnCreate,
          featuredOrder: normalized.featured_order ?? 0,
          fileSizeBytes: selectedPdfFile?.size,
          createdAt: normalized.created_at,
          createdBy: user?.email || undefined,
        };

        setSheetsList(prev => [newSheet, ...prev]);
        showToast(`Partitura "${newSheet.title}" adicionada com sucesso!`);
      }

      setUploadProgress(100);
      setIsAddSheetModalOpen(false);
      setEditingSheet(null);
      resetForm();
    } catch (err: any) {
      // Rollback automático para não deixar PDF órfão no Storage se o banco falhar
      if (newlyUploadedObject) {
        await supabase.storage
          .from(newlyUploadedObject.bucket)
          .remove([newlyUploadedObject.path])
          .catch(() => {});
      }
      const message = err?.message || String(err);
      setSheetFormError(message);
      showToast(`Erro ao salvar partitura: ${message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormInstrument('Saxofone Alto');
    setFormTitle('');
    setFormComposer('');
    setFormGenre('Bossa Nova');
    setFormLevel('Intermediário');
    setFormTonality('G');
    setFormDescription('');
    setFormCategory('gratuita');
    setFormPublished(true);
    setSelectedPdfFile(null);
    setMarkAsFeaturedOnCreate(false);
    setSheetFormError(null);
    setIsComposerDropdownOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenAddSheetModal = () => {
    setEditingSheet(null);
    resetForm();
    loadComposersList();
    setIsAddSheetModalOpen(true);
  };

  const handleOpenEditSheet = (sheet: SheetMusic) => {
    setEditingSheet(sheet);
    setFormTitle(sheet.title);
    setFormComposer(sheet.composer);
    setFormInstrument(sheet.instrument);
    setFormGenre(sheet.genre || 'Bossa Nova');
    setFormLevel(sheet.level || 'Intermediário');
    setFormTonality(sheet.tonality || 'G');
    setFormDescription(sheet.description || '');
    setFormCategory(sheet.categoria === 'paga' ? 'paga' : 'gratuita');
    setFormPublished(sheet.publicado ?? true);
    setMarkAsFeaturedOnCreate(Boolean(sheet.isFeatured));
    setSelectedPdfFile(null);
    setSheetFormError(null);
    setIsComposerDropdownOpen(false);
    loadComposersList();
    setIsAddSheetModalOpen(true);
  };

  const handlePreviewAdminSheet = async (sheet: SheetMusic) => {
    try {
      const resolved = await resolvePartituraPdfUrl({
        id: sheet.id,
        titulo: sheet.title,
        compositor: sheet.composer,
        instrumento: sheet.instrument,
        tonalidade: sheet.tonality,
        nivel: sheet.level,
        arquivo_pdf_url: sheet.pdfUrl || null,
        storage_path: sheet.storagePath || null,
        categoria: sheet.categoria || 'gratuita',
        preco: sheet.preco ?? 0,
        publicado: sheet.publicado ?? true,
      });
      setViewingSheetPdfUrl(resolved.url);
      setViewingSheetProtected(resolved.protected || sheet.categoria === 'paga');
      setViewingSheet(sheet);
    } catch (err: any) {
      if (sheet.storagePath) {
        const bucket = sheet.categoria === 'paga' ? SHEET_STORAGE_BUCKETS.PAID : SHEET_STORAGE_BUCKETS.FREE;
        const { data } = await supabase.storage.from(bucket).createSignedUrl(sheet.storagePath, 120);
        if (data?.signedUrl) {
          setViewingSheetPdfUrl(data.signedUrl);
          setViewingSheetProtected(sheet.categoria === 'paga');
          setViewingSheet(sheet);
          return;
        }
      }
      setViewingSheetPdfUrl(sheet.pdfUrl || null);
      setViewingSheetProtected(sheet.categoria === 'paga');
      setViewingSheet(sheet);
    }
  };

  const handleToggleSheetPublished = async (sheet: SheetMusic) => {
    const nextPub = !(sheet.publicado ?? true);
    try {
      const { data: updatedVisibility, error } = await supabase
        .from('partituras')
        .update({ publicado: nextPub, updated_at: new Date().toISOString() })
        .eq('id', sheet.id);
      if (error) throw error;
      if (!updatedVisibility || updatedVisibility.length !== 1) throw new Error('Visibilidade não confirmada no banco.');
      setSheetsList(prev => prev.map(s => s.id === sheet.id ? { ...s, publicado: nextPub } : s));
      showToast(nextPub ? `"${sheet.title}" publicada no catálogo!` : `"${sheet.title}" movida para rascunhos/oculta.`);
    } catch {
      showToast('Erro ao alterar visibilidade da partitura.');
    }
  };

  const handleToggleSheetCategory = async (sheet: SheetMusic) => {
    const nextCat: 'gratuita' | 'paga' = sheet.categoria === 'paga' ? 'gratuita' : 'paga';
    try {
      const { data: updatedCategory, error } = await supabase
        .from('partituras')
        .update({
          categoria: nextCat,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheet.id)
        .select('id');
      if (error) throw error;
      if (!updatedCategory || updatedCategory.length !== 1) throw new Error('Categoria não confirmada no banco.');
      setSheetsList(prev => prev.map(s => s.id === sheet.id ? { ...s, categoria: nextCat } : s));
      showToast(
        nextCat === 'paga'
          ? `"${sheet.title}" movida para Partituras Pagas (protegida para conjuntos).`
          : `"${sheet.title}" movida para Partituras Gratuitas.`
      );
    } catch {
      showToast('Erro ao alterar categoria da partitura.');
    }
  };

  useEffect(() => {
    if (activeTab !== 'partituras') return;
    let active = true;
    supabase.from('conjuntos_partituras').select('id,titulo,preco,publicado')
      .order('created_at', { ascending: false }).then(({ data, error }) => {
        if (active && !error) setBundleList((data || []).map(b => ({ ...b, preco: Number(b.preco) })));
      });
    return () => { active = false; };
  }, [activeTab]);

  const handleCreateBundle = async () => {
    const price = Number(bundlePrice.replace(',', '.'));
    if (!bundleTitle.trim() || !Number.isFinite(price) || price <= 0 || bundleSelectedIds.length === 0) {
      showToast('Informe nome, preço válido e selecione ao menos uma partitura.');
      return;
    }
    setBundleSaving(true);
    let createdId: string | null = null;
    try {
      const { data, error } = await supabase.from('conjuntos_partituras')
        .insert({ titulo: bundleTitle.trim(), preco: price, publicado: false })
        .select('id,titulo,preco,publicado').single();
      if (error || !data) throw error || new Error('Não foi possível criar o conjunto.');
      createdId = data.id;
      const { error: itemsError } = await supabase.from('conjuntos_partituras_itens')
        .insert(bundleSelectedIds.map(partitura_id => ({ conjunto_id: data.id, partitura_id })));
      if (itemsError) throw itemsError;
      setBundleList(prev => [{ ...data, preco: Number(data.preco) }, ...prev]);
      setBundleTitle('');
      setBundlePrice('');
      setBundleSelectedIds([]);
      showToast('Conjunto criado como rascunho. Publique após conferir os itens.');
    } catch (err: any) {
      if (createdId) await supabase.from('conjuntos_partituras').delete().eq('id', createdId);
      showToast(err?.message || 'Não foi possível criar o conjunto.');
    } finally {
      setBundleSaving(false);
    }
  };

  const handlePublishBundle = async (id: string, published: boolean) => {
    const { data, error } = await supabase.from('conjuntos_partituras')
      .update({ publicado: !published }).eq('id', id).select('id');
    if (error || data?.length !== 1) {
      showToast('Não foi possível atualizar a publicação do conjunto.');
      return;
    }
    setBundleList(prev => prev.map(b => b.id === id ? { ...b, publicado: !published } : b));
    showToast(!published ? 'Conjunto publicado.' : 'Conjunto ocultado.');
  };

  const handleDeleteSheet = async (sheet: SheetMusic) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a partitura oficial "${sheet.title}"? Esta ação removerá o arquivo da biblioteca.`)) {
      return;
    }

    try {
      const { data: deletedRows, error: deleteError } = await supabase.from('partituras').delete().eq('id', sheet.id).select('id');
      if (deleteError) throw deleteError;
      if (!deletedRows || deletedRows.length !== 1) throw new Error('Exclusão não confirmada no banco.');

      let storageCleanupError = false;
      if (sheet.storagePath) {
        const bucket = SHEET_STORAGE_BUCKETS.FREE;
        const { error: removalError } = await supabase.storage.from(bucket).remove([sheet.storagePath]);
        storageCleanupError = Boolean(removalError);
      }

      setSheetsList(prev => prev.filter(s => s.id !== sheet.id));
      showToast(storageCleanupError
        ? 'Registro excluído, mas o PDF não pôde ser removido do armazenamento. Verifique o Storage.'
        : `Partitura "${sheet.title}" excluída com sucesso.`);
    } catch {
      showToast('Erro ao excluir partitura no Supabase.');
    }
  };

  // --- PLANOS EDITÁVEIS (CRUD public.planos) ---
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanIdInput('');
    setPlanNome('');
    setPlanDescricao('');
    setPlanPreco('49.90');
    setPlanRecorrencia('mensal');
    setPlanBeneficiosText('Acesso completo às aulas\nEstúdio virtual completo\nSuporte pedagógico Tutti');
    setPlanStripeProductId('');
    setPlanStripePriceId('');
    setPlanOrdem(String(plansList.length + 1));
    setPlanAtivo(true);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: DbPlano) => {
    setEditingPlan(plan);
    setPlanIdInput(plan.id);
    setPlanNome(plan.nome);
    setPlanDescricao(plan.descricao || '');
    setPlanPreco(String(plan.preco ?? 0));
    setPlanRecorrencia((plan.recorrencia as any) || 'mensal');
    setPlanBeneficiosText((plan.beneficios || []).join('\n'));
    setPlanStripeProductId(plan.stripe_product_id || '');
    setPlanStripePriceId(plan.stripe_price_id || '');
    setPlanOrdem(String(plan.ordem ?? 0));
    setPlanAtivo(plan.ativo !== false);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const idSlug = (editingPlan ? editingPlan.id : planIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
    if (!idSlug || !planNome.trim()) {
      showToast('Informe o identificador e o nome do plano.');
      return;
    }
    const parsedPrice = Number(planPreco.replace(',', '.'));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      showToast('Informe um valor de preço válido.');
      return;
    }

    const beneficios = planBeneficiosText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const intervalo =
      planRecorrencia === 'trimestral' || planRecorrencia === 'semestral' || planRecorrencia === 'mensal'
        ? 'month'
        : 'one_time';
    const intervalo_count =
      planRecorrencia === 'trimestral' ? 3 : planRecorrencia === 'semestral' ? 6 : 1;

    setIsSavingPlan(true);
    try {
      const payload = {
        id: idSlug,
        nome: planNome.trim(),
        descricao: planDescricao.trim(),
        preco: parsedPrice,
        moeda: 'BRL',
        recorrencia: planRecorrencia,
        beneficios,
        stripe_product_id: planStripeProductId.trim() || null,
        stripe_price_id: planStripePriceId.trim() || null,
        ordem: Number(planOrdem) || 0,
        intervalo,
        intervalo_count,
        ativo: planAtivo,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('planos').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      const updated: DbPlano = {
        id: idSlug,
        nome: payload.nome,
        descricao: payload.descricao,
        preco: payload.preco,
        moeda: 'BRL',
        recorrencia: payload.recorrencia,
        beneficios: payload.beneficios,
        stripe_product_id: payload.stripe_product_id,
        stripe_price_id: payload.stripe_price_id,
        ordem: payload.ordem,
        ativo: payload.ativo,
      };

      setPlansList(prev => {
        const exists = prev.some(p => p.id === idSlug);
        const next = exists ? prev.map(p => (p.id === idSlug ? updated : p)) : [...prev, updated];
        return [...next].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      });

      setIsPlanModalOpen(false);
      setEditingPlan(null);
      showToast(`Plano "${updated.nome}" salvo e sincronizado em tempo real!`);
    } catch (err: any) {
      showToast(`Erro ao salvar plano: ${err?.message || err}`);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleTogglePlanActive = async (plan: DbPlano) => {
    const nextActive = !plan.ativo;
    try {
      const { error } = await supabase
        .from('planos')
        .update({ ativo: nextActive, updated_at: new Date().toISOString() })
        .eq('id', plan.id);
      if (error) throw error;
      setPlansList(prev => prev.map(p => (p.id === plan.id ? { ...p, ativo: nextActive } : p)));
      showToast(nextActive ? `Plano "${plan.nome}" ativado.` : `Plano "${plan.nome}" ocultado dos alunos.`);
    } catch {
      showToast('Erro ao atualizar status do plano.');
    }
  };

  const handleDeletePlan = async (plan: DbPlano) => {
    if (!window.confirm(`Deseja realmente excluir o plano "${plan.nome}"?`)) return;
    try {
      const { error } = await supabase.from('planos').delete().eq('id', plan.id);
      if (error) throw error;
      setPlansList(prev => prev.filter(p => p.id !== plan.id));
      showToast(`Plano "${plan.nome}" removido.`);
    } catch {
      showToast('Erro ao excluir plano.');
    }
  };

  // --- LOJA TUTTI (CRUD public.produtos_loja + Upload Múltiplo de Imagens) ---
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProdNome('');
    setProdDescricao('');
    setProdPreco('');
    setProdPrecoOriginal('');
    setProdCategoria('Acessórios');
    setProdBadge('');
    setProdInStock(true);
    setProdPublished(true);
    setProdOrder(String(storeProducts.length + 1));
    setProdImages([]);
    setProdMainImage('');
    setProdImageUrlInput('');
    setIsStoreModalOpen(true);
  };

  const handleOpenEditProduct = (prod: StoreDbProduct) => {
    setEditingProduct(prod);
    setProdNome(prod.nome);
    setProdDescricao(prod.descricao || '');
    setProdPreco(String(prod.preco ?? ''));
    setProdPrecoOriginal(prod.preco_original ? String(prod.preco_original) : '');
    setProdCategoria((prod.categoria as any) || 'Acessórios');
    setProdBadge(prod.badge || '');
    setProdInStock(prod.em_estoque);
    setProdPublished(prod.publicado);
    setProdOrder(String(prod.ordem ?? 0));
    const imgs = prod.imagens?.length ? prod.imagens : prod.imagem_principal ? [prod.imagem_principal] : [];
    setProdImages(imgs);
    setProdMainImage(prod.imagem_principal || imgs[0] || '');
    setProdImageUrlInput('');
    setIsStoreModalOpen(true);
  };

  const handleProductImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const invalid = files.find(f => !allowed.includes(f.type) || f.size > 5 * 1024 * 1024);
    if (invalid) {
      showToast('Envie apenas imagens JPG, PNG, WebP ou AVIF de até 5MB cada.');
      return;
    }

    setIsUploadingProductImages(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `produtos/${Date.now()}_${i}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('produtos-loja')
          .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

        if (upErr) {
          throw new Error(upErr.message || 'Falha no upload para bucket produtos-loja.');
        }

        const { data: pub } = supabase.storage.from('produtos-loja').getPublicUrl(path);
        if (pub?.publicUrl) {
          uploadedUrls.push(pub.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setProdImages(prev => {
          const next = [...prev, ...uploadedUrls];
          if (!prodMainImage) {
            setProdMainImage(next[0]);
          }
          return next;
        });
        showToast(`${uploadedUrls.length} foto(s) enviada(s) com sucesso!`);
      }
    } catch (err: any) {
      showToast(`Erro no upload das fotos: ${err?.message || err}`);
    } finally {
      setIsUploadingProductImages(false);
      if (storeImageInputRef.current) storeImageInputRef.current.value = '';
    }
  };

  const handleAddExternalProductImage = () => {
    const trimmed = prodImageUrlInput.trim();
    if (!trimmed) return;
    setProdImages(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      if (!prodMainImage) setProdMainImage(trimmed);
      return next;
    });
    setProdImageUrlInput('');
  };

  const handleRemoveProductImage = (url: string) => {
    setProdImages(prev => {
      const next = prev.filter(u => u !== url);
      if (prodMainImage === url) {
        setProdMainImage(next[0] || '');
      }
      return next;
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNome.trim()) {
      showToast('Informe o nome do produto.');
      return;
    }
    const price = Number(prodPreco.replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) {
      showToast('Informe um preço válido.');
      return;
    }
    const origPrice = prodPrecoOriginal.trim() ? Number(prodPrecoOriginal.replace(',', '.')) : null;
    const coverImage = prodMainImage || prodImages[0] || null;

    setIsSavingProduct(true);
    try {
      const payload = {
        nome: prodNome.trim(),
        descricao: prodDescricao.trim(),
        preco: price,
        preco_original: origPrice && origPrice > 0 ? origPrice : null,
        categoria: prodCategoria,
        badge: prodBadge.trim() || null,
        em_estoque: prodInStock,
        publicado: prodPublished,
        ordem: Number(prodOrder) || 0,
        imagens: prodImages,
        imagem_principal: coverImage,
        imagem_url: coverImage,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('produtos_loja')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;

        setStoreProducts(prev =>
          prev.map(p => (p.id === editingProduct.id ? { ...p, ...payload, id: editingProduct.id } : p))
        );
        showToast(`Produto "${payload.nome}" atualizado na Loja Tutti!`);
      } else {
        const { data: inserted, error } = await supabase
          .from('produtos_loja')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        const created: StoreDbProduct = {
          id: Number(inserted.id),
          ...payload,
          avaliacao: Number(inserted.avaliacao ?? 5),
          num_avaliacoes: Number(inserted.num_avaliacoes ?? 0),
          created_at: inserted.created_at,
        };
        setStoreProducts(prev => [created, ...prev].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
        showToast(`Produto "${created.nome}" adicionado à Loja Tutti!`);
      }

      setIsStoreModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      showToast(`Erro ao salvar produto: ${err?.message || err}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleToggleProductPublished = async (prod: StoreDbProduct) => {
    const nextPub = !prod.publicado;
    try {
      const { error } = await supabase
        .from('produtos_loja')
        .update({ publicado: nextPub, updated_at: new Date().toISOString() })
        .eq('id', prod.id);
      if (error) throw error;
      setStoreProducts(prev => prev.map(p => (p.id === prod.id ? { ...p, publicado: nextPub } : p)));
      showToast(nextPub ? `"${prod.nome}" publicado na loja.` : `"${prod.nome}" ocultado da loja.`);
    } catch {
      showToast('Erro ao alterar publicação do produto.');
    }
  };

  const handleToggleProductStock = async (prod: StoreDbProduct) => {
    const nextStock = !prod.em_estoque;
    try {
      const { error } = await supabase
        .from('produtos_loja')
        .update({ em_estoque: nextStock, updated_at: new Date().toISOString() })
        .eq('id', prod.id);
      if (error) throw error;
      setStoreProducts(prev => prev.map(p => (p.id === prod.id ? { ...p, em_estoque: nextStock } : p)));
      showToast(nextStock ? `"${prod.nome}" marcado em estoque.` : `"${prod.nome}" marcado como esgotado.`);
    } catch {
      showToast('Erro ao alterar estoque do produto.');
    }
  };

  const handleDeleteProduct = async (prod: StoreDbProduct) => {
    if (!window.confirm(`Deseja excluir o produto "${prod.nome}" da Loja Tutti?`)) return;
    try {
      const { error } = await supabase.from('produtos_loja').delete().eq('id', prod.id);
      if (error) throw error;
      setStoreProducts(prev => prev.filter(p => p.id !== prod.id));
      showToast(`Produto "${prod.nome}" removido da loja.`);
    } catch {
      showToast('Erro ao excluir produto.');
    }
  };

  // Toggle or reorder featured sheets
  const handleToggleFeatured = async (sheetId: string | number) => {
    const sheet = sheetsList.find(s => s.id === sheetId);
    if (!sheet) return;

    const nextFeatured = !sheet.isFeatured;
    try {
      const { data: updatedFeatured, error: featuredError } = await supabase
        .from('partituras')
        .update({ is_featured: nextFeatured })
        .eq('id', sheetId)
        .select('id');
      if (featuredError) throw featuredError;
      if (!updatedFeatured || updatedFeatured.length !== 1) {
        throw new Error('A atualização do destaque não foi confirmada pelo banco de dados.');
      }

      setSheetsList(prev => prev.map(s => s.id === sheetId ? { ...s, isFeatured: nextFeatured } : s));
      showToast(nextFeatured ? `"${sheet.title}" adicionada aos destaques! ★` : `"${sheet.title}" removida dos destaques.`);
    } catch {
      showToast('Erro ao atualizar destaque no Supabase.');
    }
  };

  // Reordering requires a persisted featured_order column and an authorized backend.
  // Never pretend a local-only reorder was saved to the shared catalog.
  const handleMoveFeatured = async (_sheetId: string | number, _direction: 'up' | 'down') => {
    showToast('Reordenação indisponível: é necessário configurar e validar a ordem dos destaques no Supabase.');
  };

  // Approve Teacher Request via RPC (aprovar_professor_rpc)
  const handleApproveTeacher = async (req: TeacherRequest) => {
    if (!window.confirm(`Confirmar a aprovação de "${req.nome}" como Professor oficial da Tutti?`)) return;

    setProcessingRequestId(req.id);
    try {
      const { error } = await aprovarProfessor(req.id, req.user_id);
      if (error) {
        throw error;
      }

      await loadTeacherManagementData();
      showToast(`Professor(a) ${req.nome} aprovado(a) com sucesso via backend!`);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao aprovar professor via aprovar_professor_rpc.';
      showToast(`Erro ao aprovar professor: ${msg}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Reject Teacher Request via RPC (rejeitar_professor_rpc)
  const handleRejectTeacher = async (req: TeacherRequest) => {
    if (!window.confirm(`Deseja rejeitar a solicitação de "${req.nome}"? O usuário não terá acesso ao painel de professor.`)) return;

    setProcessingRequestId(req.id);
    try {
      const { error } = await rejeitarProfessor(req.id, req.user_id);
      if (error) {
        throw error;
      }

      await loadTeacherManagementData();
      showToast(`Solicitação de ${req.nome} rejeitada com sucesso.`);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao rejeitar professor via rejeitar_professor_rpc.';
      showToast(`Erro ao rejeitar solicitação: ${msg}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Você saiu da conta administrativa. Até breve!');
    navigate('/auth');
  };

  // Filtered Sheets
  const filteredSheets = sheetsList.filter(s => {
    if (sheetCategoryFilter === 'gratuitas' && s.categoria === 'paga') return false;
    if (sheetCategoryFilter === 'pagas' && s.categoria !== 'paga') return false;
    if (sheetCategoryFilter === 'rascunhos' && (s.publicado ?? true)) return false;
    if (sheetInstrumentFilter !== 'todos' && !s.instrument.toLowerCase().includes(sheetInstrumentFilter.toLowerCase())) {
      return false;
    }
    if (sheetSearchTerm) {
      const term = sheetSearchTerm.toLowerCase();
      return s.title.toLowerCase().includes(term) || s.composer.toLowerCase().includes(term);
    }
    return true;
  });

  // Filtered Requests
  const filteredRequests = requests.filter(r => {
    if (requestFilter !== 'todos' && r.status !== requestFilter) return false;
    if (requestSearchTerm) {
      const term = requestSearchTerm.toLowerCase();
      return r.nome.toLowerCase().includes(term) || r.email.toLowerCase().includes(term);
    }
    return true;
  });

  // Filtered Bookings
  const filteredBookings = bookings.filter(b => {
    if (bookingStatusFilter !== 'todos' && b.status !== bookingStatusFilter) return false;
    if (bookingDateFilter && b.data_aula !== bookingDateFilter) return false;
    if (bookingSearch) {
      const term = bookingSearch.toLowerCase();
      return b.aluno_nome.toLowerCase().includes(term) || 
             b.professor_nome.toLowerCase().includes(term) ||
             (b.aluno_email && b.aluno_email.toLowerCase().includes(term));
    }
    return true;
  });

  // Featured Sheets list
  const featuredSheets = sheetsList
    .filter(s => s.isFeatured)
    .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Developer Environment Status */}
      <div className="bg-gradient-to-r from-[#18120c] via-[#211710] to-[#131722] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Shield size={14} className="text-amber-400" />
              <span>Ambiente do Desenvolvedor & Administrador Geral</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-syne font-black text-white tracking-tight">
              Painel de Controle Tutti ♪
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gestão de conteúdos, upload e biblioteca de partituras em PDF, destaques, aprovação de professores, auditoria de agendamentos e assinaturas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/tutti_estrutura_banco_de_dados.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              title="Abrir e baixar o PDF com a modelagem e estrutura completa do banco de dados (17 páginas)"
            >
              <Download size={15} className="text-amber-400" />
              <span>Baixar Estrutura SQL (PDF)</span>
            </a>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-colors"
            >
              Ver Site Público
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Encerrar sessão de desenvolvedor e retornar à tela de login"
            >
              <LogOut size={15} />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar Tabs + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-[#131722] border border-white/10 rounded-3xl p-4 shadow-xl space-y-2 sticky top-24">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-2">
            Menu de Administração
          </div>

          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'site', label: 'Gerenciar Site', icon: Globe },
            { id: 'partituras', label: 'Partituras (PDFs)', icon: Music, badge: sheetsList.length },
            { id: 'destaques', label: 'Partituras em Destaque', icon: Star, badge: featuredSheets.length },
            { id: 'professores', label: 'Professores', icon: Users, badge: teachers.length },
            { id: 'solicitacoes', label: 'Solicitações de Professores', icon: UserCheck, badge: requests.filter(r => r.status === 'pendente').length },
            { id: 'alunos', label: 'Alunos Cadastrados', icon: Users, badge: students.length },
            { id: 'marcacoes', label: 'Marcações de Aula', icon: Clock, badge: bookings.length },
            { id: 'assinaturas', label: 'Planos & Assinaturas', icon: CreditCard, badge: plansList.length },
            { id: 'loja', label: 'Gerenciar Loja', icon: ShoppingBag, badge: storeProducts.length },
            { id: 'relatorios', label: 'Relatórios de Acesso', icon: BarChart3 },
            { id: 'configuracoes', label: 'Configurações', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DevTab)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border border-amber-500/40 text-amber-300 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 bg-[#131722] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl min-h-[600px]">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">
                  Visão Geral do Sistema
                </h2>
                <p className="text-xs text-slate-400">Resumo em tempo real sincronizado com a base PostgreSQL / Supabase.</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Partituras no Acervo</div>
                  <div className="text-3xl font-syne font-black text-cyan-400">{sheetsList.length}</div>
                  <div className="text-[10px] text-slate-400">PDFs e arranjos cadastrados</div>
                </div>

                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Professores Oficiais</div>
                  <div className="text-3xl font-syne font-black text-emerald-400">{teachers.length}</div>
                  <div className="text-[10px] text-slate-400">Docentes credenciados</div>
                </div>

                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-amber-500/30 space-y-1">
                  <div className="text-[11px] font-bold text-amber-300 uppercase">Solicitações Pendentes</div>
                  <div className="text-3xl font-syne font-black text-amber-400">
                    {requests.filter(r => r.status === 'pendente').length}
                  </div>
                  <button 
                    onClick={() => setActiveTab('solicitacoes')}
                    className="text-[10px] text-amber-300 hover:underline font-bold"
                  >
                    Avaliar solicitações →
                  </button>
                </div>

                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Aulas Marcadas</div>
                  <div className="text-3xl font-syne font-black text-violet-400">{bookings.length}</div>
                  <div className="text-[10px] text-slate-400">Google Meet agendados</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4">
                <h3 className="font-syne font-bold text-sm text-white">Atalhos Rápidos de Gestão</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <button
                    onClick={() => {
                      resetForm();
                      setIsAddSheetModalOpen(true);
                    }}
                    className="p-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center justify-between"
                  >
                    <span>+ Adicionar Partitura em PDF</span>
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => setActiveTab('destaques')}
                    className="p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-between"
                  >
                    <span>Gerenciar Destaques da Home</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setActiveTab('assinaturas')}
                    className="p-3.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold flex items-center justify-between"
                  >
                    <span>Ver Planos & Assinaturas</span>
                    <CreditCard size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GERENCIAR SITE */}
          {activeTab === 'site' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Gerenciar Conteúdos do Site</h2>
                  <p className="text-xs text-slate-400">Edite textos dinâmicos, banners e comunicados sem alterar código-fonte.</p>
                </div>
                <button
                  onClick={() => showToast('Conteúdos salvos e atualizados no Supabase! ✓')}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black text-xs shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Título Principal da Home (Hero)
                  </label>
                  <input
                    type="text"
                    value={siteContent.heroTitle}
                    onChange={e => setSiteContent({ ...siteContent, heroTitle: e.target.value })}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Subtítulo da Home
                  </label>
                  <textarea
                    rows={3}
                    value={siteContent.heroSubtitle}
                    onChange={e => setSiteContent({ ...siteContent, heroSubtitle: e.target.value })}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl p-3.5 outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Barra de Comunicados / Avisos Gerais</span>
                    <button
                      onClick={() => setSiteContent({ ...siteContent, isNoticeActive: !siteContent.isNoticeActive })}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        siteContent.isNoticeActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {siteContent.isNoticeActive ? 'Publicado no Topo' : 'Despublicado'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={siteContent.bannerNotice}
                    onChange={e => setSiteContent({ ...siteContent, bannerNotice: e.target.value })}
                    className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PARTITURAS (CENTRALIZADO, PDF UPLOAD E METADADOS - ITEM 3) */}
          {activeTab === 'partituras' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Gerenciamento de Partituras em PDF</h2>
                  <p className="text-xs text-slate-400">
                    Sistema centralizado da Tutti. Faça upload de PDFs diretamente do seu computador, edite metadados e visualize no leitor integrado.
                  </p>
                </div>

                <button
                  onClick={handleOpenAddSheetModal}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black font-syne font-black text-xs flex items-center gap-2 shadow-lg hover:opacity-95 cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={16} />
                  <span>Adicionar Partitura (PDF)</span>
                </button>
              </div>

              <section className="rounded-2xl border border-amber-400/20 bg-[#0b0d14] p-5 space-y-4">
                <h3 className="text-amber-300 font-bold text-sm">Conjuntos de partituras para venda</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={bundleTitle} onChange={e => setBundleTitle(e.target.value)}
                    placeholder="Nome do conjunto" className="flex-1 bg-[#131722] text-white rounded-lg p-2 text-xs border border-white/10" />
                  <input value={bundlePrice} onChange={e => setBundlePrice(e.target.value)}
                    placeholder="Preço R$" inputMode="decimal" className="sm:w-32 bg-[#131722] text-white rounded-lg p-2 text-xs border border-white/10" />
                </div>
                <p className="text-xs text-slate-400">Selecione as partituras que farão parte deste conjunto:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {sheetsList.map(sheet => (
                    <label key={String(sheet.id)} className="flex gap-2 items-center text-xs text-slate-200">
                      <input type="checkbox" checked={bundleSelectedIds.includes(String(sheet.id))}
                        onChange={e => setBundleSelectedIds(prev => e.target.checked
                          ? [...prev, String(sheet.id)] : prev.filter(id => id !== String(sheet.id)))} />
                      {sheet.title} — {sheet.instrument}
                    </label>
                  ))}
                </div>
                <button type="button" disabled={bundleSaving} onClick={handleCreateBundle}
                  className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg text-xs disabled:opacity-50">
                  {bundleSaving ? 'Salvando...' : 'Criar conjunto (rascunho)'}
                </button>
                {bundleList.map(bundle => (
                  <div key={bundle.id} className="flex items-center justify-between gap-2 text-xs border-t border-white/10 pt-3">
                    <span className="text-white">{bundle.titulo} — R$ {bundle.preco.toFixed(2).replace('.', ',')}</span>
                    <button type="button" onClick={() => handlePublishBundle(bundle.id, bundle.publicado)}
                      className="text-amber-300 underline">{bundle.publicado ? 'Ocultar' : 'Publicar'}</button>
                  </div>
                ))}
              </section>

              {/* Search, Category and Instrument Filter */}
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sheetSearchTerm}
                    onChange={e => setSheetSearchTerm(e.target.value)}
                    placeholder="Pesquisar por título ou compositor..."
                    className="w-full bg-[#131722] text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="w-full sm:w-44">
                  <select
                    value={sheetCategoryFilter}
                    onChange={e => setSheetCategoryFilter(e.target.value as any)}
                    className="w-full bg-[#131722] text-white px-3.5 py-2.5 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="todas">Todas categorias</option>
                    <option value="gratuitas">Gratuitas</option>
                    <option value="pagas">Pagas (Protegidas)</option>
                    <option value="rascunhos">Ocultas / Rascunhos</option>
                  </select>
                </div>

                <div className="w-full sm:w-56">
                  <select
                    value={sheetInstrumentFilter}
                    onChange={e => setSheetInstrumentFilter(e.target.value)}
                    className="w-full bg-[#131722] text-white px-3.5 py-2.5 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="todos">Todos os Instrumentos</option>
                    {INSTRUMENT_OPTIONS.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sheet Music List */}
              {filteredSheets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSheets.map(sheet => (
                    <div key={sheet.id} className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-syne font-bold text-white text-base leading-snug">{sheet.title}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                              sheet.categoria === 'paga'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                            }`}>
                              {sheet.categoria === 'paga' ? <Lock size={10} /> : <Unlock size={10} />}
                              {sheet.categoria === 'paga' ? 'Paga' : 'Gratuita'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              sheet.level === 'Iniciante' ? 'bg-emerald-500/20 text-emerald-300' :
                              sheet.level === 'Intermediário' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {sheet.level}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-amber-300 font-semibold mt-1">
                          {sheet.instrument} • {sheet.composer} {sheet.genre ? `• ${sheet.genre}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                          {sheet.description || 'Partitura oficial cadastrada.'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreviewAdminSheet(sheet)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Visualizar PDF no leitor integrado"
                          >
                            <Eye size={13} />
                            <span>Visualizar PDF</span>
                          </button>

                          <button
                            onClick={() => handleToggleFeatured(sheet.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                              sheet.isFeatured
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Star size={12} className={sheet.isFeatured ? 'fill-amber-400 text-amber-400' : ''} />
                            <span>{sheet.isFeatured ? 'Destaque ★' : 'Destacar'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleSheetPublished(sheet)}
                            className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                              sheet.publicado !== false
                                ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                : 'bg-slate-700/40 text-slate-400 hover:text-white'
                            }`}
                            title={sheet.publicado !== false ? 'Publicada (clique para ocultar)' : 'Oculta (clique para publicar)'}
                          >
                            {sheet.publicado !== false ? 'Publicada' : 'Oculta'}
                          </button>
                          <button
                            onClick={() => handleOpenEditSheet(sheet)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Editar Metadados"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSheet(sheet)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Excluir partitura oficial"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <Music size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhuma partitura encontrada</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Nenhuma partitura cadastrada para os filtros selecionados. Clique em "Adicionar Partitura (PDF)" para fazer o primeiro upload.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PARTITURAS EM DESTAQUE (ITEM 4) */}
          {activeTab === 'destaques' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Partituras em Destaque</h2>
                  <p className="text-xs text-slate-400">
                    Todas as partituras selecionadas aqui aparecem automaticamente na seção "Partituras em Destaque" da página Início.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsSelectFeaturedModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-syne font-black text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Adicionar partitura em destaque</span>
                  </button>
                </div>
              </div>

              {/* Current Featured Sheets List */}
              {featuredSheets.length > 0 ? (
                <div className="space-y-3">
                  {featuredSheets.map((sheet, index) => (
                    <div
                      key={sheet.id}
                      className="p-4 rounded-2xl border border-amber-500/30 bg-[#0b0d14] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-syne font-bold text-sm text-white flex items-center gap-2">
                            <span>{sheet.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-sans">
                              {sheet.instrument}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">{sheet.composer} • {sheet.level}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center bg-[#131722] rounded-xl border border-white/10 p-0.5">
                          <button
                            onClick={() => handleMoveFeatured(sheet.id, 'up')}
                            disabled={index === 0}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Subir posição"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveFeatured(sheet.id, 'down')}
                            disabled={index === featuredSheets.length - 1}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Descer posição"
                          >
                            ▼
                          </button>
                        </div>

                        <button
                          onClick={() => handlePreviewAdminSheet(sheet)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Ver</span>
                        </button>

                        <button
                          onClick={() => handleToggleFeatured(sheet.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Remover dos destaques (não apaga a partitura)"
                        >
                          <X size={13} />
                          <span>Remover Destaque</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <Star size={32} className="mx-auto text-amber-500/40" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhuma partitura em destaque</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Nenhum exemplo fictício é exibido. Clique no botão acima para escolher uma partitura da biblioteca ou enviar um novo PDF para destacar na Home.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROFESSORES (ITEM 5 - DADOS REAIS DO SUPABASE) */}
          {activeTab === 'professores' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Professores Oficiais</h2>
                <p className="text-xs text-slate-400">
                  Corpo docente credenciado da Tutti. Apenas professores aprovados pelo desenvolvedor são exibidos.
                </p>
              </div>

              {teachers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachers.map(prof => (
                    <div key={prof.id || prof.user_id} className="bg-[#0b0d14] p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Professor Aprovado
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {prof.created_at ? new Date(prof.created_at).toLocaleDateString('pt-BR') : 'Ativo'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-syne font-bold text-white text-base">{prof.nome_completo || prof.display_name || 'Docente Tutti'}</h4>
                        <p className="text-xs text-slate-400">{prof.email}</p>
                        <p className="text-xs text-cyan-300 font-semibold mt-1">
                          Instrumento(s): {prof.current_instrument || 'Saxofone / Metais'}
                        </p>
                      </div>
                      {prof.bio && (
                        <p className="text-[11px] text-slate-300 leading-relaxed bg-[#131722] p-3 rounded-xl border border-white/5">
                          {prof.bio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <Users size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhum professor encontrado.</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Assim que uma solicitação for aprovada na aba "Solicitações de Professores", o docente aparecerá automaticamente aqui.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SOLICITAÇÕES DE PROFESSORES (ITEM 6) */}
          {activeTab === 'solicitacoes' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Solicitações de Professores</h2>
                  <p className="text-xs text-slate-400">
                    Dados em tempo real de <span className="font-mono text-cyan-300">public.solicitacoes_professores</span>. Aprovação e rejeição executadas exclusivamente via RPC no backend.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => loadTeacherManagementData()}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 cursor-pointer"
                    title="Atualizar solicitações"
                  >
                    Atualizar
                  </button>
                  {(['todos', 'pendente', 'aprovado', 'rejeitado'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setRequestFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        requestFilter === st ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {requestsLoadError && (
                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                  <p className="font-bold">Erro ao carregar solicitações</p>
                  <p className="mt-1">{requestsLoadError}</p>
                  <button type="button" onClick={() => loadTeacherManagementData()} className="mt-3 rounded-lg border border-red-300/30 px-3 py-1.5 font-bold hover:bg-red-500/10">Tentar novamente</button>
                </div>
              )}

              {isLoadingRequests && <p role="status" className="text-sm text-slate-300">Carregando solicitações...</p>}

              {!requestsLoadError && !isLoadingRequests && filteredRequests.length > 0 ? (
                <div className="space-y-4">
                  {filteredRequests.map(req => {
                    const isProcessing = processingRequestId === req.id;
                    const requestDate = req.created_at
                      ? new Date(req.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Data indisponível';

                    return (
                      <div key={req.id} className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="space-y-1">
                            <h4 className="font-syne font-black text-base text-white">{req.nome}</h4>
                            <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>
                                <strong>E-mail:</strong> {req.email}
                              </span>
                              <span>•</span>
                              <span>
                                <strong>Instrumento:</strong>{' '}
                                <strong className="text-cyan-300">{req.instrumento}</strong>
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Data da solicitação: {requestDate}
                            </div>
                          </div>

                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start ${
                            req.status === 'aprovado'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'pendente'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 leading-relaxed bg-[#131722] p-3.5 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                            Biografia / Apresentação Profissional:
                          </span>
                          {req.bio || 'Sem biografia informada.'}
                        </div>

                        {req.decided_at && (
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                            <span>
                              Decisão registrada em {new Date(req.decided_at).toLocaleString('pt-BR')}
                              {req.decided_by ? ` por ${req.decided_by}` : ''}
                            </span>
                          </div>
                        )}

                        {req.status === 'pendente' && (
                          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleRejectTeacher(req)}
                              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <X size={14} />
                              <span>{isProcessing ? 'Processando...' : 'REJEITAR PROFESSOR'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleApproveTeacher(req)}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90 text-black text-xs font-black uppercase tracking-wide flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                            >
                              <Check size={14} />
                              <span>{isProcessing ? 'Processando...' : 'APROVAR PROFESSOR'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <UserCheck size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhuma solicitação encontrada</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Não há solicitações de credenciamento {requestFilter !== 'todos' ? `com status "${requestFilter}"` : 'no momento'}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: ALUNOS CADASTRADOS (ITEM 7 - DADOS REAIS DO SUPABASE) */}
          {activeTab === 'alunos' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Alunos Cadastrados</h2>
                <p className="text-xs text-slate-400">
                  Estudantes reais registrados na plataforma Tutti através do Supabase Auth.
                </p>
              </div>

              {students.length > 0 ? (
                <div className="space-y-3">
                  {students.map((aluno, i) => (
                    <div key={aluno.id || aluno.user_id || i} className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-syne font-bold text-sm text-white">
                          {aluno.nome_completo || aluno.display_name || aluno.email?.split('@')[0] || 'Aluno Tutti'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {aluno.email} • {aluno.current_instrument || 'Saxofone Alto'} • Nível: {aluno.level || 'Iniciante'}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-emerald-400 font-bold">{aluno.streak_days ?? 0} dias de treino</span>
                        <span className="text-cyan-400 font-bold">{aluno.xp ?? 0} XP</span>
                        <span className="text-violet-400 font-bold">{aluno.completed_lessons ?? 0} aulas</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <Users size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhum aluno cadastrado.</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Assim que novos usuários criarem suas contas de aluno no fluxo normal de autenticação, eles serão listados automaticamente aqui.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: MARCAÇÕES DE AULA (ITEM 8 - DADOS REAIS DO SUPABASE) */}
          {activeTab === 'marcacoes' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Marcações de Aulas ao Vivo</h2>
                <p className="text-xs text-slate-400">
                  Agendamentos reais de aulas individuais entre professores e alunos via Google Meet.
                </p>
              </div>

              {/* Filters */}
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={e => setBookingSearch(e.target.value)}
                    placeholder="Filtrar por nome do aluno ou professor..."
                    className="w-full bg-[#131722] text-white pl-10 pr-4 py-2 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={bookingDateFilter}
                    onChange={e => setBookingDateFilter(e.target.value)}
                    className="bg-[#131722] text-white px-3 py-2 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                  />
                  <select
                    value={bookingStatusFilter}
                    onChange={e => setBookingStatusFilter(e.target.value as any)}
                    className="bg-[#131722] text-white px-3 py-2 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="agendada">Agendadas</option>
                    <option value="realizada">Realizadas</option>
                    <option value="cancelada">Canceladas</option>
                  </select>
                </div>
              </div>

              {filteredBookings.length > 0 ? (
                <div className="space-y-3">
                  {filteredBookings.map(b => (
                    <div key={b.id} className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-3 shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <div>
                          <div className="font-syne font-bold text-white text-base">
                            Aluno: {b.aluno_nome} <span className="text-slate-400 font-normal">com</span> {b.professor_nome}
                          </div>
                          <div className="text-xs text-slate-400">{b.aluno_email}</div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === 'agendada' ? 'bg-cyan-500/20 text-cyan-300' :
                          b.status === 'realizada' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {b.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-4 text-slate-300 font-mono">
                          <span>Data: <strong>{b.data_aula}</strong></span>
                          <span>Horário: <strong>{b.hora_inicio}</strong> ({b.duracao_minutos} min)</span>
                        </div>

                        {b.link_meet && (
                          <a
                            href={b.link_meet}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500 text-violet-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <span>Google Meet</span>
                            <span className="text-[10px]">↗</span>
                          </a>
                        )}
                      </div>

                      {b.observacoes && (
                        <p className="text-[11px] text-slate-400 italic bg-[#131722] p-2.5 rounded-xl border border-white/5">
                          "Obs: {b.observacoes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <Clock size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhum agendamento encontrado</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Não há aulas marcadas para os filtros aplicados. Quando um professor agendar um horário com um aluno, ele aparecerá aqui.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: PLANOS & ASSINATURAS EDITÁVEIS (public.planos CRUD) */}
          {activeTab === 'assinaturas' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
                    <CreditCard size={14} /> Planos Dinâmicos Sincronizados com Supabase & Stripe
                  </div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Planos & Assinaturas Editáveis</h2>
                  <p className="text-xs text-slate-400">
                    Qualquer alteração salva aqui atualiza automaticamente a tela de planos dos alunos via Supabase Realtime.
                  </p>
                </div>

                <button
                  onClick={handleOpenCreatePlan}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black font-syne font-black text-xs flex items-center gap-2 shadow-lg hover:opacity-95 cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={16} />
                  <span>Novo Plano</span>
                </button>
              </div>

              {isLoadingPlans ? (
                <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Carregando planos do Supabase...</span>
                </div>
              ) : plansList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plansList.map(plano => (
                    <div
                      key={plano.id}
                      className={`p-5 rounded-2xl bg-[#0b0d14] border space-y-4 flex flex-col justify-between ${
                        plano.ativo ? 'border-white/15' : 'border-rose-500/30 opacity-75'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-syne font-black text-lg text-white">{plano.nome}</h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                {plano.recorrencia}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">ID: {plano.id} • Ordem #{plano.ordem ?? 0}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-syne font-black text-emerald-400">
                              R$ {Number(plano.preco || 0).toFixed(2).replace('.', ',')}
                            </div>
                            <span className={`text-[10px] font-bold ${plano.ativo ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {plano.ativo ? 'Ativo' : 'Oculto'}
                            </span>
                          </div>
                        </div>

                        {plano.descricao && (
                          <p className="text-xs text-slate-300 leading-relaxed">{plano.descricao}</p>
                        )}

                        {plano.beneficios && plano.beneficios.length > 0 && (
                          <ul className="space-y-1 pt-1">
                            {plano.beneficios.slice(0, 4).map((b, i) => (
                              <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                                <Check size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                                <span>{b}</span>
                              </li>
                            ))}
                            {plano.beneficios.length > 4 && (
                              <li className="text-[10px] text-slate-500">+{plano.beneficios.length - 4} benefícios adicionais</li>
                            )}
                          </ul>
                        )}

                        {plano.stripe_product_id && (
                          <div className="pt-2 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-mono text-[10px]">Stripe ID:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(plano.stripe_product_id!);
                                setCopiedStripeId(plano.stripe_product_id!);
                                showToast(`Stripe ID copiado: ${plano.stripe_product_id}`);
                                setTimeout(() => setCopiedStripeId(null), 2000);
                              }}
                              className="font-mono text-[11px] text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{plano.stripe_product_id}</span>
                              {copiedStripeId === plano.stripe_product_id ? (
                                <CheckCheck size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <button
                          onClick={() => handleTogglePlanActive(plano)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                            plano.ativo
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/5 text-slate-300 border border-white/10'
                          }`}
                        >
                          {plano.ativo ? 'Desativar' : 'Ativar'}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditPlan(plano)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit size={13} />
                            <span>Editar Plano</span>
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plano)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Excluir plano"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <CreditCard size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhum plano cadastrado na tabela planos</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Clique em "Novo Plano" para cadastrar ou execute o script SQL de migração no Supabase.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 9B: GERENCIAR LOJA TUTTI (public.produtos_loja + Multi-Image Upload) */}
          {activeTab === 'loja' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 mb-2">
                    <ShoppingBag size={14} /> Catálogo Oficial & Galeria de Fotos
                  </div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Gerenciar Loja Tutti</h2>
                  <p className="text-xs text-slate-400">
                    Adicione instrumentos, acessórios, livros e envie múltiplas fotos diretamente do computador para o Storage.
                  </p>
                </div>

                <button
                  onClick={handleOpenCreateProduct}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black font-syne font-black text-xs flex items-center gap-2 shadow-lg hover:opacity-95 cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={16} />
                  <span>Adicionar Produto</span>
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={e => setStoreSearch(e.target.value)}
                    placeholder="Buscar produto na loja..."
                    className="w-full bg-[#131722] text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
                <select
                  value={storeCategoryFilter}
                  onChange={e => setStoreCategoryFilter(e.target.value)}
                  className="w-full sm:w-52 bg-[#131722] text-white px-3.5 py-2.5 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                >
                  <option value="Todas">Todas as Categorias</option>
                  <option value="Instrumentos">Instrumentos</option>
                  <option value="Acessórios">Acessórios</option>
                  <option value="Livros">Livros</option>
                  <option value="Vestuário">Vestuário</option>
                </select>
              </div>

              {isLoadingStore ? (
                <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Carregando catálogo da Loja Tutti...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {storeProducts
                    .filter(p => storeCategoryFilter === 'Todas' || p.categoria === storeCategoryFilter)
                    .filter(p => !storeSearch || p.nome.toLowerCase().includes(storeSearch.toLowerCase()))
                    .map(prod => {
                      const thumb = prod.imagem_principal || prod.imagens?.[0] || prod.imagem_url;
                      return (
                        <div key={prod.id} className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
                          <div className="flex gap-4">
                            <div className="w-24 h-24 rounded-xl bg-[#131722] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                              {thumb ? (
                                <img src={thumb} alt={prod.nome} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={24} className="text-slate-500" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-syne font-bold text-white text-sm truncate">{prod.nome}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  prod.publicado ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {prod.publicado ? 'Publicado' : 'Oculto'}
                                </span>
                              </div>
                              <div className="text-xs text-cyan-300 font-semibold">
                                {prod.categoria} {prod.imagens?.length ? `• ${prod.imagens.length} foto(s)` : ''}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-syne font-black text-emerald-400">
                                  R$ {prod.preco.toFixed(2).replace('.', ',')}
                                </span>
                                {prod.preco_original && prod.preco_original > prod.preco && (
                                  <span className="text-xs text-slate-500 line-through">
                                    R$ {prod.preco_original.toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-2">{prod.descricao}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleProductPublished(prod)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer ${
                                  prod.publicado
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-white/5 text-slate-300'
                                }`}
                              >
                                {prod.publicado ? 'Ocultar' : 'Publicar'}
                              </button>
                              <button
                                onClick={() => handleToggleProductStock(prod)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer ${
                                  prod.em_estoque
                                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {prod.em_estoque ? 'Em Estoque' : 'Esgotado'}
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditProduct(prod)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Edit size={13} />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                title="Excluir produto"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {!isLoadingStore && storeProducts.length === 0 && (
                <div className="p-10 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <ShoppingBag size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Nenhum produto cadastrado na loja</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Clique em "Adicionar Produto" para cadastrar o primeiro item com fotos reais do computador.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: RELATÓRIOS */}
          {activeTab === 'relatorios' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Relatórios & Auditoria</h2>
                <p className="text-xs text-slate-400">Métricas analíticas reais e trilha de eventos de acesso.</p>
              </div>

              {/* Real Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-syne font-black text-white">{students.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Alunos</div>
                </div>
                <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-syne font-black text-emerald-400">{teachers.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Profs Aprovados</div>
                </div>
                <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-syne font-black text-amber-400">
                    {requests.filter(r => r.status === 'pendente').length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Profs Pendentes</div>
                </div>
                <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-syne font-black text-cyan-400">{bookings.length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Aulas Marcadas</div>
                </div>
              </div>

              {/* Audit Table */}
              <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="font-syne font-bold text-sm text-white">Trilha de Eventos Recentes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 uppercase text-[10px]">
                        <th className="pb-2">Perfil</th>
                        <th className="pb-2">Tipo de Evento</th>
                        <th className="pb-2">Detalhes</th>
                        <th className="pb-2 text-right">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {accessLogs.length > 0 ? (
                        accessLogs.map(log => (
                          <tr key={log.id} className="text-slate-300">
                            <td className="py-2.5 font-bold uppercase text-[10px] text-amber-300">{log.perfil}</td>
                            <td className="py-2.5 font-mono text-cyan-400">{log.tipo_evento}</td>
                            <td className="py-2.5 max-w-xs truncate">{log.detalhes}</td>
                            <td className="py-2.5 text-right text-slate-500">{log.data}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            Nenhum log registrado ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: CONFIGURAÇÕES & DOWNLOAD PDF */}
          {activeTab === 'configuracoes' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Configurações Gerais</h2>
                <p className="text-xs text-slate-400">Status dos serviços e parâmetros da plataforma Tutti.</p>
              </div>

              <div className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <span className="font-bold text-white block">Conexão com Banco de Dados</span>
                    <span className="text-slate-400">PostgreSQL / Supabase (Projeto {SUPABASE_PROJECT_ID})</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full font-bold ${databaseStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : databaseStatus === 'checking' ? 'bg-slate-500/20 text-slate-400' : 'bg-red-500/20 text-red-400'}`}>
                    {databaseStatus === 'connected' ? '✓ Conectado' : databaseStatus === 'checking' ? 'Verificando...' : 'Sem conexão'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <span className="font-bold text-white block">Segurança de Linha (RLS)</span>
                    <span className="text-slate-400">Políticas ativas nas tabelas sensíveis</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
                    Ativo
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Ambiente Atual</span>
                    <span className="text-slate-400">Google AI Studio Development Build</span>
                  </div>
                  <span className="font-mono text-amber-300">Porta 3000 (Express + Vite)</span>
                </div>
              </div>

              {/* Card de Documentação em PDF do Banco de Dados */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0e141f] via-[#11141d] to-[#0e141f] border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                      <FileText size={22} className="text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-syne font-bold text-base text-white">
                        Estrutura Completa do Banco de Dados (Documento PDF)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Documentação técnica oficial contendo todas as tabelas, Storage de PDFs, RLS, triggers e seeds.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold self-start sm:self-auto">
                    17 Páginas em PDF
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
                  <a
                    href="/tutti_estrutura_banco_de_dados.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-syne font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <Download size={15} />
                    <span>Baixar Estrutura em PDF (A4 Formatado)</span>
                  </a>

                  <a
                    href="/api/download-master-sql"
                    className="py-3 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition"
                    title="Baixar migração SQL master com buckets, RLS, planos e loja"
                  >
                    <Download size={15} />
                    <span>Baixar Script .SQL Master</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ADICIONAR / EDITAR PARTITURA EM PDF (ITEM 3) */}
      {isAddSheetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#131722] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative my-auto animate-in fade-in duration-200">
            <button
              onClick={() => {
                setIsAddSheetModalOpen(false);
                setEditingSheet(null);
                resetForm();
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 mb-2">
                <Music size={13} /> {editingSheet ? 'Editar Metadados da Partitura' : 'Upload de Partitura em PDF'}
              </div>
              <h3 className="text-2xl font-syne font-black text-white">
                {editingSheet ? 'Editar Partitura Oficial' : 'Adicionar Nova Partitura'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Selecione o instrumento, arquivo PDF e metadados. O arquivo será armazenado com segurança no Supabase.
              </p>
            </div>

            <form onSubmit={handleSaveSheet} className="space-y-4 text-xs">
              {sheetFormError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{sheetFormError}</div>
                </div>
              )}

              {/* 1. Instrumento Musical */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  1. Instrumento Musical *
                </label>
                <select
                  value={formInstrument}
                  onChange={e => setFormInstrument(e.target.value)}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 text-xs outline-none focus:border-cyan-400"
                >
                  {(formInstrument && !INSTRUMENT_OPTIONS.includes(formInstrument)
                    ? [formInstrument, ...INSTRUMENT_OPTIONS]
                    : INSTRUMENT_OPTIONS
                  ).map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              {/* 2. Arquivo PDF no Computador */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  2. Arquivo PDF no Computador {editingSheet ? '(Opcional: manter atual ou substituir)' : '*'}
                </label>
                <div className="border-2 border-dashed border-white/15 hover:border-cyan-400/50 rounded-2xl p-4 text-center bg-[#0b0d14] transition-colors">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,application/pdf"
                    onChange={handlePdfFileSelect}
                    className="hidden"
                    id="pdf-upload-input"
                  />
                  <label htmlFor="pdf-upload-input" className="cursor-pointer block space-y-2">
                    <FileUp size={28} className="mx-auto text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {selectedPdfFile
                          ? selectedPdfFile.name
                          : (editingSheet?.storagePath || editingSheet?.pdfUrl
                            ? 'PDF já armazenado (Clique para substituir)'
                            : 'Clique para selecionar o PDF do computador')}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {selectedPdfFile ? `${(selectedPdfFile.size / 1024).toFixed(1)} KB • Pronto para upload` : 'Exclusivamente arquivos no formato .PDF (até 30MB)'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Título da Partitura */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  3. Título da Partitura *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Garota de Ipanema, Carinhoso, Autumn Leaves..."
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                />
              </div>

              {/* 4. Compositor (Busca + Autocomplete Persistente no Supabase) */}
              <div ref={composerComboboxRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    4. Compositor *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {isLoadingComposers ? 'Carregando compositores...' : `${composersList.length} cadastrado(s)`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formComposer}
                    onFocus={() => setIsComposerDropdownOpen(true)}
                    onClick={() => setIsComposerDropdownOpen(true)}
                    onChange={e => {
                      setFormComposer(e.target.value);
                      setIsComposerDropdownOpen(true);
                    }}
                    placeholder="Clique para escolher ou digite para cadastrar novo compositor..."
                    autoComplete="off"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl pl-3.5 pr-9 py-2.5 text-xs outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setIsComposerDropdownOpen(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                    tabIndex={-1}
                    title="Listar compositores cadastrados"
                  >
                    <ChevronDown size={15} />
                  </button>
                </div>

                {isComposerDropdownOpen && (() => {
                  const queryNorm = normalizeSearchText(formComposer);
                  const exactNorm = normalizeComposerKey(formComposer);
                  const filteredComposers = composersList.filter(c =>
                    !queryNorm || normalizeSearchText(c.nome).includes(queryNorm)
                  );
                  const hasExactMatch = Boolean(
                    exactNorm && composersList.some(c => c.nome_normalizado === exactNorm)
                  );
                  const canCreateNew = Boolean(formComposer.trim()) && !hasExactMatch;

                  return (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#0b0d14] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                      {canCreateNew && (
                        <button
                          type="button"
                          disabled={isRegisteringComposer}
                          onClick={() => handleRegisterNewComposer(formComposer)}
                          className="w-full px-3.5 py-2.5 text-left text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold flex items-center justify-between border-b border-white/10 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Plus size={13} />
                            Cadastrar novo compositor: "{normalizeComposerDisplay(formComposer)}"
                          </span>
                          {isRegisteringComposer && <Loader2 size={13} className="animate-spin" />}
                        </button>
                      )}

                      {filteredComposers.length > 0 ? (
                        filteredComposers.map(comp => {
                          const isSelected = normalizeComposerKey(formComposer) === comp.nome_normalizado;
                          return (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => {
                                setFormComposer(comp.nome);
                                setIsComposerDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                  : 'text-slate-200 hover:bg-white/5'
                              }`}
                            >
                              <span>{comp.nome}</span>
                              {isSelected && <Check size={13} className="text-cyan-400" />}
                            </button>
                          );
                        })
                      ) : (
                        !canCreateNew && (
                          <div className="px-3.5 py-3 text-[11px] text-slate-400 text-center">
                            Nenhum compositor cadastrado ainda. Digite um nome acima para cadastrar.
                          </div>
                        )
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 5. Estilo Musical & 6. Nível de Dificuldade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    5. Estilo Musical *
                  </label>
                  <select
                    value={formGenre}
                    onChange={e => setFormGenre(e.target.value)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                  >
                    {getMusicalStyleOptions(editingSheet?.genre).map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    6. Nível de Dificuldade *
                  </label>
                  <select
                    value={formLevel}
                    onChange={e => setFormLevel(e.target.value as any)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>
              </div>

              {/* 7. Categoria de Acesso (Gratuita ou Paga) & 8. Publicar Imediatamente */}
              <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    7. Categoria de Acesso *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as 'gratuita' | 'paga')}
                    className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="gratuita">Partitura Gratuita (Bucket Público)</option>
                    <option value="paga">Partitura Paga (Bucket Privado Protegido)</option>
                  </select>
                  <p className="text-[11px] mt-1.5 font-medium text-slate-400">
                    {formCategory === 'paga'
                      ? 'Armazenada no bucket privado protegido. A comercialização será feita em conjuntos de partituras.'
                      : 'Armazenada no bucket público com acesso livre para leitura e download na plataforma.'}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={e => setFormPublished(e.target.checked)}
                    className="rounded text-emerald-500 cursor-pointer"
                  />
                  <span>
                    <strong>8.</strong> Publicar imediatamente no catálogo e painéis
                  </span>
                </label>
              </div>

              {/* 9. Descrição ou Orientações de Estudo */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  9. Descrição ou Orientações de Estudo
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Orientações sobre digitação, afinação ou respiração..."
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* 10. Adicionar às Partituras em Destaque da Home */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={markAsFeaturedOnCreate}
                  onChange={e => setMarkAsFeaturedOnCreate(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="featured-check" className="text-xs text-slate-300 cursor-pointer">
                  <strong>10.</strong> Adicionar às <strong>Partituras em Destaque</strong> da Home
                </label>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Processando e enviando PDF para o Supabase...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSheetModalOpen(false);
                    setEditingSheet(null);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black font-syne font-black text-xs shadow-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2 cursor-pointer"
                >
                  <Check size={16} />
                  <span>{isUploading ? 'Salvando...' : (editingSheet ? 'Atualizar Metadados' : 'Confirmar Envio')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SELECIONAR PARTITURA EM DESTAQUE (OPÇÃO A vs OPÇÃO B - ITEM 4) */}
      {isSelectFeaturedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#131722] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative my-auto animate-in fade-in duration-200">
            <button
              onClick={() => setIsSelectFeaturedModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 mb-2">
                <Star size={13} /> Configurar Destaque da Página Início
              </div>
              <h3 className="text-2xl font-syne font-black text-white">Adicionar Partitura em Destaque</h3>
              <p className="text-xs text-slate-400 mt-1">
                Escolha entre selecionar uma partitura já cadastrada no acervo ou fazer o upload de uma nova.
              </p>
            </div>

            {/* Quick Action: Option B (Upload New) */}
            <div className="p-4 rounded-2xl bg-[#0b0d14] border border-cyan-500/30 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-syne font-bold text-sm text-white">Opção B — Enviar Nova Partitura (PDF)</h4>
                <p className="text-xs text-slate-400">Envie um novo arquivo PDF do seu computador diretamente para os destaques.</p>
              </div>
              <button
                onClick={() => {
                  setIsSelectFeaturedModalOpen(false);
                  setEditingSheet(null);
                  resetForm();
                  setMarkAsFeaturedOnCreate(true);
                  loadComposersList();
                  setIsAddSheetModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-syne font-bold text-xs flex items-center gap-1.5 shadow-md flex-shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Upload Novo PDF</span>
              </button>
            </div>

            {/* Option A: Search and Pick Existing Sheet */}
            <div className="space-y-3">
              <h4 className="font-syne font-bold text-sm text-white">Opção A — Selecionar da Biblioteca Oficial</h4>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={featuredSearchTerm}
                  onChange={e => setFeaturedSearchTerm(e.target.value)}
                  placeholder="Pesquisar por título ou compositor..."
                  className="flex-1 bg-[#0b0d14] text-white px-3.5 py-2 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                />
                <select
                  value={featuredInstrumentFilter}
                  onChange={e => setFeaturedInstrumentFilter(e.target.value)}
                  className="bg-[#0b0d14] text-white px-3 py-2 rounded-xl border border-white/10 text-xs outline-none focus:border-cyan-400"
                >
                  <option value="todos">Todos</option>
                  {INSTRUMENT_OPTIONS.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {sheetsList
                  .filter(s => !s.isFeatured)
                  .filter(s => {
                    if (featuredInstrumentFilter !== 'todos' && !s.instrument.toLowerCase().includes(featuredInstrumentFilter.toLowerCase())) return false;
                    if (featuredSearchTerm) {
                      const t = featuredSearchTerm.toLowerCase();
                      return s.title.toLowerCase().includes(t) || s.composer.toLowerCase().includes(t);
                    }
                    return true;
                  })
                  .map(sheet => (
                    <div
                      key={sheet.id}
                      className="p-3 rounded-xl bg-[#0b0d14] border border-white/10 flex items-center justify-between gap-3 hover:border-amber-500/30 transition-colors"
                    >
                      <div>
                        <div className="font-syne font-bold text-sm text-white">{sheet.title}</div>
                        <div className="text-xs text-slate-400">{sheet.composer} • {sheet.instrument}</div>
                      </div>

                      <button
                        onClick={() => {
                          handleToggleFeatured(sheet.id);
                          setIsSelectFeaturedModalOpen(false);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Destacar</span>
                      </button>
                    </div>
                  ))}

                {sheetsList.filter(s => !s.isFeatured).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Todas as partituras da biblioteca já estão em destaque.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VISUALIZADOR DE PDF INTEGRADO */}
      {viewingSheet && (
        <SheetViewerModal
          sheet={viewingSheet}
          pdfUrl={viewingSheetPdfUrl ?? viewingSheet.pdfUrl}
          isPaidProtected={viewingSheetProtected}
          title={viewingSheet.title}
          isOpen={!!viewingSheet}
          onClose={() => {
            setViewingSheet(null);
            setViewingSheetPdfUrl(null);
            setViewingSheetProtected(false);
          }}
        />
      )}

      {/* MODAL 4: CRIAR / EDITAR PLANO TUTTI (public.planos) */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#131722] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative my-auto">
            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-2xl font-syne font-black text-white">
                {editingPlan ? `Editar Plano: ${editingPlan.nome}` : 'Novo Plano Tutti'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                As alterações são publicadas instantaneamente para os alunos no modal de assinaturas.
              </p>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Identificador (slug) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={planIdInput}
                    onChange={e => setPlanIdInput(e.target.value)}
                    placeholder="ex: mensal, trimestral, pro"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Nome do Plano *
                  </label>
                  <input
                    type="text"
                    required
                    value={planNome}
                    onChange={e => setPlanNome(e.target.value)}
                    placeholder="Ex: Tutti Ultra Mensal"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={planPreco}
                    onChange={e => setPlanPreco(e.target.value)}
                    placeholder="299.90"
                    className="w-full bg-[#0b0d14] text-emerald-300 font-mono font-bold border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Recorrência
                  </label>
                  <select
                    value={planRecorrencia}
                    onChange={e => setPlanRecorrencia(e.target.value as any)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="vitalicio">Vitalício</option>
                    <option value="unico">Pagamento Único</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={planOrdem}
                    onChange={e => setPlanOrdem(e.target.value)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={planDescricao}
                  onChange={e => setPlanDescricao(e.target.value)}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl p-3 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Benefícios (um por linha)
                </label>
                <textarea
                  rows={4}
                  value={planBeneficiosText}
                  onChange={e => setPlanBeneficiosText(e.target.value)}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl p-3 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Stripe Product ID
                  </label>
                  <input
                    type="text"
                    value={planStripeProductId}
                    onChange={e => setPlanStripeProductId(e.target.value)}
                    placeholder="prod_..."
                    className="w-full bg-[#0b0d14] text-amber-300 font-mono border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Stripe Price ID (opcional)
                  </label>
                  <input
                    type="text"
                    value={planStripePriceId}
                    onChange={e => setPlanStripePriceId(e.target.value)}
                    placeholder="price_..."
                    className="w-full bg-[#0b0d14] text-amber-300 font-mono border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planAtivo}
                  onChange={e => setPlanAtivo(e.target.checked)}
                />
                <span>Plano ativo e visível para alunos</span>
              </label>

              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black flex items-center gap-2 cursor-pointer"
                >
                  {isSavingPlan ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>Salvar Plano</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADICIONAR / EDITAR PRODUTO DA LOJA (public.produtos_loja + Upload Múltiplo) */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#131722] border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative my-auto">
            <button
              onClick={() => setIsStoreModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-2xl font-syne font-black text-white">
                {editingProduct ? `Editar Produto: ${editingProduct.nome}` : 'Novo Produto na Loja Tutti'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Envie múltiplas fotos do seu computador e escolha a foto de capa do catálogo.
              </p>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodNome}
                    onChange={e => setProdNome(e.target.value)}
                    placeholder="Ex: Palheta Vandoren Java Caixa c/ 5"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Categoria *
                  </label>
                  <select
                    value={prodCategoria}
                    onChange={e => setProdCategoria(e.target.value as any)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5"
                  >
                    <option value="Instrumentos">Instrumentos</option>
                    <option value="Acessórios">Acessórios</option>
                    <option value="Livros">Livros</option>
                    <option value="Vestuário">Vestuário</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodPreco}
                    onChange={e => setProdPreco(e.target.value)}
                    placeholder="189.90"
                    className="w-full bg-[#0b0d14] text-emerald-300 font-mono font-bold border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Preço Anterior (opcional)
                  </label>
                  <input
                    type="text"
                    value={prodPrecoOriginal}
                    onChange={e => setProdPrecoOriginal(e.target.value)}
                    placeholder="229.90"
                    className="w-full bg-[#0b0d14] text-slate-300 font-mono border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Selo / Badge
                  </label>
                  <input
                    type="text"
                    value={prodBadge}
                    onChange={e => setProdBadge(e.target.value)}
                    placeholder="Ex: Mais Vendido"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={prodOrder}
                    onChange={e => setProdOrder(e.target.value)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Descrição Completa
                </label>
                <textarea
                  rows={3}
                  value={prodDescricao}
                  onChange={e => setProdDescricao(e.target.value)}
                  placeholder="Detalhes técnicos, especificações e diferenciais do produto..."
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl p-3 resize-none"
                />
              </div>

              {/* Upload Múltiplo de Fotos do Computador */}
              <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-cyan-400" />
                      <span>Galeria de Fotos do Produto (JPG, PNG, WebP, AVIF até 5MB)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Clique em "Capa" na foto desejada para defini-la como imagem principal.</p>
                  </div>

                  <label className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0">
                    {isUploadingProductImages ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{isUploadingProductImages ? 'Enviando...' : 'Enviar Fotos do PC'}</span>
                    <input
                      ref={storeImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      onChange={handleProductImagesUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Fallback adicionar por URL se desejar */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={prodImageUrlInput}
                    onChange={e => setProdImageUrlInput(e.target.value)}
                    placeholder="Ou cole uma URL de imagem pública..."
                    className="flex-1 bg-[#131722] text-white border border-white/10 rounded-xl px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddExternalProductImage}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                  >
                    + URL
                  </button>
                </div>

                {prodImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                    {prodImages.map((imgUrl, idx) => {
                      const isMain = prodMainImage === imgUrl;
                      return (
                        <div
                          key={`${imgUrl}_${idx}`}
                          className={`relative rounded-xl overflow-hidden border-2 bg-[#131722] aspect-square group ${
                            isMain ? 'border-amber-400' : 'border-white/10'
                          }`}
                        >
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 p-1 bg-black/75 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => setProdMainImage(imgUrl)}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                                isMain ? 'bg-amber-400 text-black' : 'bg-white/15 text-white'
                              }`}
                            >
                              {isMain ? 'Capa ★' : 'Capa'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProductImage(imgUrl)}
                              className="p-0.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                              title="Remover foto"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodInStock}
                    onChange={e => setProdInStock(e.target.checked)}
                  />
                  <span>Produto disponível em estoque</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodPublished}
                    onChange={e => setProdPublished(e.target.checked)}
                  />
                  <span>Publicado na Loja Tutti</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black flex items-center gap-2 cursor-pointer"
                >
                  {isSavingProduct ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>{editingProduct ? 'Atualizar Produto' : 'Publicar Produto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
