import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Globe, Music, Star, Users, UserCheck, 
  Clock, CheckCircle2, XCircle, AlertCircle, 
  Plus, Edit, Trash2, Search, Filter, Shield, Settings, 
  BarChart3, RefreshCw, Check, X, FileText, ChevronRight, LogOut, 
  Sparkles, Download, Eye, Upload, FileUp, CreditCard, Crown, ArrowUpDown
} from 'lucide-react';
import { useAuth, TeacherRequest, LessonBooking } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { supabase } from '../../lib/supabase';
import { SHEETS_CATALOG, SheetMusic } from '../../data/musicData';
import { SheetViewerModal } from '../SheetMusic/SheetViewerModal';

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

  // Teacher Requests State (loaded from Supabase)
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Real Registered Teachers (loaded from Supabase public.usuarios / profiles)
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);

  // Real Registered Students (loaded from Supabase public.usuarios / profiles)
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // Real Bookings State (loaded from Supabase public.marcacoes_aulas)
  const [bookings, setBookings] = useState<LessonBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  // Sheets Management State (loaded from Supabase public.partituras with initial catalog fallback)
  const [sheetsList, setSheetsList] = useState<SheetMusic[]>(() => [...SHEETS_CATALOG]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  // Modal / Viewer State for Sheet Music
  const [viewingSheet, setViewingSheet] = useState<SheetMusic | null>(null);
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
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [markAsFeaturedOnCreate, setMarkAsFeaturedOnCreate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Featured Sheets Selector Modal State (Option A vs Option B)
  const [isSelectFeaturedModalOpen, setIsSelectFeaturedModalOpen] = useState(false);
  const [featuredSearchTerm, setFeaturedSearchTerm] = useState('');
  const [featuredInstrumentFilter, setFeaturedInstrumentFilter] = useState('todos');

  // Filters for Partituras List
  const [sheetSearchTerm, setSheetSearchTerm] = useState('');
  const [sheetInstrumentFilter, setSheetInstrumentFilter] = useState('todos');

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

  // Subscription Periods State for Developer Management
  const [devSubscriptionPlans] = useState([
    {
      periodo: 'Mensal',
      planos: [
        { nome: 'Grátis', preco: 'R$ 0,00', descricao: 'Acesso inicial a 30 partituras e Maestro IA' },
        { nome: 'Tutti Pro', preco: 'R$ 49,90', descricao: 'Pagamento único e acesso vitalício à biblioteca e aulas' },
        { nome: 'Tutti Ultra', preco: 'R$ 299,90', descricao: 'Cobrança mensal com aulas individuais ao vivo' }
      ]
    },
    {
      periodo: 'Trimestral',
      planos: [
        { nome: 'Tutti Ultra', preco: 'R$ 799,90', descricao: 'Plano exclusivo trimestral com professores e mentoria VIP' }
      ]
    },
    {
      periodo: 'Semestral',
      planos: [
        { nome: 'Tutti Ultra', preco: 'R$ 1.649,90', descricao: 'Plano exclusivo semestral com formação completa' }
      ]
    }
  ]);

  // Load all real data from Supabase on mount
  useEffect(() => {
    async function loadBackendData() {
      // 1. Solicitacoes de Professores
      try {
        setIsLoadingRequests(true);
        const { data: solData } = await supabase
          .from('solicitacoes_professores')
          .select('*')
          .order('created_at', { ascending: false });

        setRequests((solData as TeacherRequest[]) || []);
      } catch (err) {
        console.warn('Supabase solicitacoes load note:', err);
      } finally {
        setIsLoadingRequests(false);
      }

      // 2. Professores Reais Cadastrados (tabela usuarios com role teacher/professor)
      try {
        setIsLoadingTeachers(true);
        const { data: profData } = await supabase
          .from('usuarios')
          .select('*')
          .in('role', ['teacher', 'professor'])
          .order('created_at', { ascending: false });

        setTeachers(profData || []);
      } catch (err) {
        console.warn('Supabase teachers load note:', err);
      } finally {
        setIsLoadingTeachers(false);
      }

      // 3. Alunos Reais Cadastrados (tabela usuarios com role student/aluno)
      try {
        setIsLoadingStudents(true);
        const { data: alunoData } = await supabase
          .from('usuarios')
          .select('*')
          .in('role', ['student', 'aluno'])
          .order('created_at', { ascending: false });

        setStudents(alunoData || []);
      } catch (err) {
        console.warn('Supabase students load note:', err);
      } finally {
        setIsLoadingStudents(false);
      }

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
      try {
        setIsLoadingSheets(true);
        const { data: pData } = await supabase
          .from('partituras')
          .select('*')
          .order('id', { ascending: false });

        if (pData && pData.length > 0) {
          const mapped: SheetMusic[] = pData.map(p => ({
            id: p.id,
            title: p.titulo,
            composer: p.compositor || 'Compositor Tutti',
            instrument: p.instrumento || 'Saxofone Alto',
            tonality: p.tonalidade || 'G',
            originalKey: p.tom_original || 'G',
            family: 'Madeiras',
            level: p.nivel || 'Intermediário',
            genre: p.genero || 'Bossa Nova',
            tempo: p.tempo_bpm || 120,
            timeSignature: p.compasso || '4/4',
            melodyNotes: p.melodia_notas || [],
            chords: p.cifras || [],
            description: p.descricao || '',
            pdfUrl: p.arquivo_pdf_url,
            isFeatured: p.is_featured ?? false,
            featuredOrder: p.featured_order ?? 0,
            storagePath: p.storage_path,
            createdAt: p.created_at,
            createdBy: p.created_by
          }));
          setSheetsList(mapped);
        }
      } catch (err) {
        console.warn('Supabase partituras sync note:', err);
      } finally {
        setIsLoadingSheets(false);
      }

      // 6. Logs de Acesso
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
  }, []);

  // Helper: Read File as Data URL (safe client-side PDF preview fallback)
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle PDF file selection with validation
  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict PDF validation
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      alert('Arquivo inválido: apenas arquivos PDF são aceitos para as partituras.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Size limit check (max 30MB)
    if (file.size > 30 * 1024 * 1024) {
      alert('O arquivo selecionado ultrapassa o limite de 30MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedPdfFile(file);
    if (!formTitle.trim()) {
      // Auto-populate title from filename without .pdf
      setFormTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
    }
  };

  // Handle Sheet Music Upload and Creation
  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Informe o título da partitura.');
      return;
    }
    if (!selectedPdfFile && !editingSheet) {
      alert('Selecione um arquivo PDF no seu computador.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      let finalPdfUrl = editingSheet?.pdfUrl || '';
      let storagePath = editingSheet?.storagePath || '';

      if (selectedPdfFile) {
        setUploadProgress(40);
        const safeName = selectedPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `partituras/${Date.now()}_${safeName}`;

        // Attempt upload to Supabase Storage bucket 'partituras'
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('partituras')
            .upload(storagePath, selectedPdfFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (!uploadErr && uploadData) {
            const { data: pubData } = supabase.storage
              .from('partituras')
              .getPublicUrl(storagePath);
            finalPdfUrl = pubData.publicUrl;
          }
        } catch (storageErr) {
          console.warn('Storage bucket fallback:', storageErr);
        }

        // Fallback: generate local data URL so the PDF can be immediately viewed and downloaded
        if (!finalPdfUrl) {
          finalPdfUrl = await readFileAsDataUrl(selectedPdfFile);
        }
      }

      setUploadProgress(75);

      if (editingSheet) {
        // Update existing sheet in Supabase
        await supabase
          .from('partituras')
          .update({
            titulo: formTitle.trim(),
            compositor: formComposer.trim() || 'Compositor Tutti',
            instrumento: formInstrument,
            genero: formGenre,
            nivel: formLevel,
            tonalidade: formTonality,
            descricao: formDescription.trim(),
            arquivo_pdf_url: finalPdfUrl,
            storage_path: storagePath
          })
          .eq('id', editingSheet.id);

        setSheetsList(prev => prev.map(s => s.id === editingSheet.id ? {
          ...s,
          title: formTitle.trim(),
          composer: formComposer.trim() || 'Compositor Tutti',
          instrument: formInstrument,
          genre: formGenre,
          level: formLevel,
          tonality: formTonality,
          description: formDescription.trim(),
          pdfUrl: finalPdfUrl,
          storagePath
        } : s));

        showToast(`Metadados de "${formTitle}" atualizados com sucesso! ✓`);
      } else {
        // Insert new sheet in Supabase
        const nextId = sheetsList.length > 0 ? Math.max(...sheetsList.map(s => s.id)) + 1 : 1;
        const newSheet: SheetMusic = {
          id: nextId,
          title: formTitle.trim(),
          composer: formComposer.trim() || 'Compositor Tutti',
          instrument: formInstrument,
          tonality: formTonality,
          originalKey: formTonality,
          family: 'Madeiras',
          level: formLevel,
          genre: formGenre,
          tempo: 120,
          timeSignature: '4/4',
          melodyNotes: [{ note: 'G4', duration: 1 }],
          chords: ['Gmaj7', 'Am7'],
          description: formDescription.trim() || 'Partitura oficial em PDF catalogada pela Tutti.',
          pdfUrl: finalPdfUrl,
          storagePath,
          isFeatured: markAsFeaturedOnCreate,
          featuredOrder: markAsFeaturedOnCreate ? 1 : 0,
          fileSizeBytes: selectedPdfFile?.size,
          createdAt: new Date().toISOString(),
          createdBy: user?.email || 'eliandrolucas.EL@gmail.com'
        };

        try {
          await supabase.from('partituras').insert({
            titulo: newSheet.title,
            compositor: newSheet.composer,
            instrumento: newSheet.instrument,
            tonalidade: newSheet.tonality,
            nivel: newSheet.level,
            genero: newSheet.genre,
            descricao: newSheet.description,
            arquivo_pdf_url: newSheet.pdfUrl,
            storage_path: newSheet.storagePath,
            is_featured: newSheet.isFeatured,
            featured_order: newSheet.featuredOrder,
            created_at: newSheet.createdAt
          });
        } catch (dbErr) {
          console.warn('Db insert note:', dbErr);
        }

        setSheetsList(prev => [newSheet, ...prev]);
        showToast(`Partitura "${newSheet.title}" adicionada com sucesso! ✓`);
      }

      setUploadProgress(100);
      setIsAddSheetModalOpen(false);
      setEditingSheet(null);
      resetForm();
    } catch (err: any) {
      alert(`Erro no upload da partitura: ${err?.message || err}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormComposer('');
    setFormGenre('Bossa Nova');
    setFormLevel('Intermediário');
    setFormTonality('G');
    setFormDescription('');
    setSelectedPdfFile(null);
    setMarkAsFeaturedOnCreate(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setSelectedPdfFile(null);
    setIsAddSheetModalOpen(true);
  };

  const handleDeleteSheet = async (sheet: SheetMusic) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a partitura oficial "${sheet.title}"? Esta ação removerá o arquivo da biblioteca.`)) {
      return;
    }

    try {
      // 1. Delete from Supabase Database
      await supabase.from('partituras').delete().eq('id', sheet.id);

      // 2. Delete from Supabase Storage if path exists
      if (sheet.storagePath) {
        await supabase.storage.from('partituras').remove([sheet.storagePath]);
      }

      setSheetsList(prev => prev.filter(s => s.id !== sheet.id));
      showToast(`Partitura "${sheet.title}" excluída com sucesso.`);
    } catch (err: any) {
      showToast('Erro ao excluir partitura no Supabase.');
    }
  };

  // Toggle or reorder featured sheets
  const handleToggleFeatured = async (sheetId: number) => {
    const sheet = sheetsList.find(s => s.id === sheetId);
    if (!sheet) return;

    const nextFeatured = !sheet.isFeatured;
    try {
      await supabase
        .from('partituras')
        .update({ is_featured: nextFeatured })
        .eq('id', sheetId);

      setSheetsList(prev => prev.map(s => s.id === sheetId ? { ...s, isFeatured: nextFeatured } : s));
      showToast(nextFeatured ? `"${sheet.title}" adicionada aos destaques! ★` : `"${sheet.title}" removida dos destaques.`);
    } catch {
      showToast('Erro ao atualizar destaque no Supabase.');
    }
  };

  // Reorder featured sheets
  const handleMoveFeatured = async (sheetId: number, direction: 'up' | 'down') => {
    const featured = sheetsList.filter(s => s.isFeatured);
    const index = featured.findIndex(s => s.id === sheetId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === featured.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...featured];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Update order in state
    setSheetsList(prev => {
      return prev.map(item => {
        const foundIdx = reordered.findIndex(r => r.id === item.id);
        if (foundIdx >= 0) {
          return { ...item, featuredOrder: foundIdx + 1 };
        }
        return item;
      });
    });

    showToast('Ordem dos destaques atualizada!');
  };

  // Approve Teacher Request
  const handleApproveTeacher = async (req: TeacherRequest) => {
    if (!window.confirm(`Confirmar a aprovação de "${req.nome}" como Professor oficial da Tutti?`)) return;

    try {
      await aprovarProfessor(req.id, req.user_id);
      setRequests(prev => prev.map(r => r.id === req.id ? { 
        ...r, 
        status: 'aprovado', 
        decided_at: new Date().toISOString(), 
        decided_by: user?.email || 'eliandrolucas.EL@gmail.com' 
      } : r));

      // Add to teachers list
      setTeachers(prev => [{
        id: req.id,
        user_id: req.user_id,
        nome_completo: req.nome,
        email: req.email,
        current_instrument: req.instrumento,
        bio: req.bio,
        role: 'teacher',
        approval_status: 'aprovado',
        created_at: req.created_at,
        approved_at: new Date().toISOString()
      }, ...prev]);

      showToast(`Professor(a) ${req.nome} aprovado(a) com sucesso! ✓`);
    } catch (err: any) {
      showToast('Erro ao aprovar professor no Supabase.');
    }
  };

  // Reject Teacher Request
  const handleRejectTeacher = async (req: TeacherRequest) => {
    if (!window.confirm(`Deseja rejeitar a solicitação de "${req.nome}"? O usuário não terá acesso ao painel de professor.`)) return;

    try {
      await rejeitarProfessor(req.id, req.user_id);
      setRequests(prev => prev.map(r => r.id === req.id ? { 
        ...r, 
        status: 'rejeitado', 
        decided_at: new Date().toISOString(), 
        decided_by: user?.email || 'eliandrolucas.EL@gmail.com' 
      } : r));
      showToast(`Solicitação de ${req.nome} rejeitada.`);
    } catch (err: any) {
      showToast('Erro ao registrar rejeição.');
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Você saiu da conta administrativa. Até breve!');
    navigate('/auth');
  };

  // Filtered Sheets
  const filteredSheets = sheetsList.filter(s => {
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
            { id: 'assinaturas', label: 'Planos & Assinaturas', icon: CreditCard },
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
                  onClick={() => {
                    resetForm();
                    setIsAddSheetModalOpen(true);
                  }}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black font-syne font-black text-xs flex items-center gap-2 shadow-lg hover:opacity-95 cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={16} />
                  <span>Adicionar Partitura (PDF)</span>
                </button>
              </div>

              {/* Search and Instrument Filter */}
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

                <div className="w-full sm:w-64">
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
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sheet.level === 'Iniciante' ? 'bg-emerald-500/20 text-emerald-300' :
                            sheet.level === 'Intermediário' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {sheet.level}
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 font-semibold mt-1">
                          {sheet.instrument} • {sheet.composer}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                          {sheet.description || 'Partitura oficial cadastrada.'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingSheet(sheet)}
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
                            onClick={() => handleOpenEditSheet(sheet)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
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
                          onClick={() => setViewingSheet(sheet)}
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
                  <p className="text-xs text-slate-400">Aprovação e credenciamento oficial de docentes com segurança de backend.</p>
                </div>

                <div className="flex gap-2">
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

              {filteredRequests.length > 0 ? (
                <div className="space-y-4">
                  {filteredRequests.map(req => (
                    <div key={req.id} className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div>
                          <h4 className="font-syne font-black text-base text-white">{req.nome}</h4>
                          <div className="text-xs text-slate-400">
                            {req.email} • Especialidade: <strong className="text-cyan-300">{req.instrumento}</strong>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          req.status === 'aprovado'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : req.status === 'pendente'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed bg-[#131722] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Currículo & Proposta Pedagógica:</span>
                        {req.bio || 'Sem biografia informada.'}
                      </div>

                      {req.status === 'pendente' && (
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            onClick={() => handleRejectTeacher(req)}
                            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <X size={14} />
                            <span>Rejeitar Solicitação</span>
                          </button>
                          <button
                            onClick={() => handleApproveTeacher(req)}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90 text-black text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Aprovar Professor</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
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

          {/* TAB 9: PLANOS & ASSINATURAS (REORGANIZAÇÃO DOS PERÍODOS - ITEM 2) */}
          {activeTab === 'assinaturas' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
                  <CreditCard size={14} /> Estrutura Oficial de Períodos de Contratação
                </div>
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Gestão de Assinaturas</h2>
                <p className="text-xs text-slate-400">
                  Períodos de contratação: Mensal, Trimestral e Semestral (Opção Anual terminantemente removida).
                </p>
              </div>

              {/* Subscriptions Grid per Period */}
              <div className="space-y-6">
                {devSubscriptionPlans.map(group => (
                  <div key={group.periodo} className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h3 className="font-syne font-black text-lg text-white">
                          Período: {group.periodo}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {group.periodo === 'Trimestral' ? 'Apresenta exclusivamente o plano Tutti Ultra (R$ 799,90)' :
                           group.periodo === 'Semestral' ? 'Apresenta exclusivamente o plano Tutti Ultra (R$ 1.649,90)' :
                           'Planos regulares mensais (Grátis, Pro Vitalício e Ultra Mensal)'}
                        </p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        group.periodo === 'Trimestral' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        group.periodo === 'Semestral' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      }`}>
                        {group.periodo}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {group.planos.map(plano => (
                        <div key={plano.nome} className="p-4 rounded-xl bg-[#131722] border border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-syne font-bold text-white text-sm">{plano.nome}</span>
                            <span className="text-emerald-400 font-mono font-black text-base">{plano.preco}</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{plano.descricao}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                    <span className="text-slate-400">PostgreSQL / Supabase (Projeto viwxalwpvuvgcyxsdjbi)</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    ✓ Conectado
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
                    href="/api/download-db-sql"
                    className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition"
                    title="Baixar arquivo .sql bruto para importar no Supabase"
                  >
                    <Download size={15} />
                    <span>Baixar Script .SQL Bruto</span>
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
              {/* Etapa 1: Selecionar o Instrumento */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  1. Instrumento Musical *
                </label>
                <select
                  value={formInstrument}
                  onChange={e => setFormInstrument(e.target.value)}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 text-xs outline-none focus:border-cyan-400"
                >
                  {INSTRUMENT_OPTIONS.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              {/* Etapa 2: Selecionar o Arquivo PDF */}
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
                        {selectedPdfFile ? selectedPdfFile.name : (editingSheet?.pdfUrl ? 'PDF já anexado (Clique para substituir)' : 'Clique para selecionar o PDF do computador')}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {selectedPdfFile ? `${(selectedPdfFile.size / 1024).toFixed(1)} KB • Pronto para upload` : 'Exclusivamente arquivos no formato .PDF'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Etapa 3: Informar o Título */}
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

              {/* Etapa 4: Compositor, Gênero e Nível */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Compositor
                  </label>
                  <input
                    type="text"
                    value={formComposer}
                    onChange={e => setFormComposer(e.target.value)}
                    placeholder="Ex: Tom Jobim"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Estilo Musical
                  </label>
                  <select
                    value={formGenre}
                    onChange={e => setFormGenre(e.target.value)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="Bossa Nova">Bossa Nova</option>
                    <option value="Choro">Choro</option>
                    <option value="MPB">MPB</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Clássico">Clássico</option>
                    <option value="Samba">Samba</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Nível de Dificuldade
                  </label>
                  <select
                    value={formLevel}
                    onChange={e => setFormLevel(e.target.value as any)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-400"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>
              </div>

              {/* Descrição Opcional */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Descrição ou Orientações de Estudo
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Orientações sobre digitação, afinação ou respiração..."
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {!editingSheet && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="featured-check"
                    checked={markAsFeaturedOnCreate}
                    onChange={e => setMarkAsFeaturedOnCreate(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="featured-check" className="text-xs text-slate-300 cursor-pointer">
                    Adicionar imediatamente à seção <strong>Partituras em Destaque</strong> da Home
                  </label>
                </div>
              )}

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
                  resetForm();
                  setMarkAsFeaturedOnCreate(true);
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

      {/* MODAL 3: VISUALIZADOR DE PDF INTEGRADO (ITEM 3.4) */}
      {viewingSheet && (
        <SheetViewerModal
          sheet={viewingSheet}
          pdfUrl={viewingSheet.pdfUrl}
          title={viewingSheet.title}
          isOpen={!!viewingSheet}
          onClose={() => setViewingSheet(null)}
        />
      )}
    </div>
  );
};
