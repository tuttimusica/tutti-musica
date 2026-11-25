import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, LessonBooking } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { supabase } from '../../lib/supabase';
import {
  BookOpen,
  Calendar,
  Clock,
  Video,
  FileText,
  User,
  GraduationCap,
  LogOut,
  Download,
  Search,
  ExternalLink,
  ChevronRight,
  Music,
  Bell,
  CheckCircle,
  Sparkles,
  Award,
  CreditCard,
  Lock,
  Star,
  Eye,
  Loader2
} from 'lucide-react';
import { StudentSubscriptionArea } from '../Subscription/StudentSubscriptionArea';
import { PlansModal } from '../Subscription/PlansModal';
import { OfficialContacts } from '../Common/OfficialContacts';
import {
  DbPartitura,
  fetchPublishedPartituras,
  fetchUserLibraryAccess,
  normalizeSearchText,
  resolvePartituraPdfUrl,
} from '../../services/partiturasService';
import { filterActiveLessons } from '../../utils/agendaUtils';
import { SheetViewerModal } from '../SheetMusic/SheetViewerModal';
import { SheetMusic } from '../../data/musicData';

export interface StudentPanelProps {
  onLogoutToAuth?: () => void;
  onNavigateHome?: () => void;
}

export const StudentPanel: React.FC<StudentPanelProps> = ({ onLogoutToAuth, onNavigateHome }) => {
  const { user, profile, logout, cancelarMarcacaoAula } = useAuth();
  const { navigate, showToast, userPlan } = useAppRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assinatura' | 'aulas' | 'marcacoes' | 'partituras' | 'professores' | 'perfil'>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('tab') === 'assinatura' || p.get('status') === 'success' || p.get('status') === 'cancelled') {
        return 'assinatura';
      }
    } catch {}
    return 'dashboard';
  });
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [searchPartituras, setSearchPartituras] = useState('');
  const [studentBookings, setStudentBookings] = useState<LessonBooking[]>([]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [studyMaterials, setStudyMaterials] = useState<DbPartitura[]>([]);
  const [hasFullProAccess, setHasFullProAccess] = useState(false);
  const [unlockedSheetIds, setUnlockedSheetIds] = useState<Set<string>>(new Set());
  const [openingSheetId, setOpeningSheetId] = useState<string | null>(null);
  const [activeViewer, setActiveViewer] = useState<{ sheet: SheetMusic; pdfUrl: string | null; isPaidProtected: boolean } | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeBookings = React.useMemo(
    () => filterActiveLessons(studentBookings, new Date(nowTick)),
    [studentBookings, nowTick]
  );

  const loadPartiturasAndAccess = useCallback(async () => {
    try {
      const isAdmin = profile?.role === 'desenvolvedor';
      const [sheets, access] = await Promise.all([
        fetchPublishedPartituras(),
        fetchUserLibraryAccess(user?.id, userPlan, isAdmin),
      ]);
      setStudyMaterials(sheets);
      setHasFullProAccess(access.hasFullProAccess);
      setUnlockedSheetIds(access.unlockedIds);
    } catch (e) {
      console.debug('Erro ao carregar partituras no painel do aluno:', e);
    }
  }, [user?.id, userPlan, profile?.role]);

  // Load real student bookings, study materials, and approved teachers from Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Real bookings for this student
        if (user?.email) {
          const { data: bookingsData } = await supabase
            .from('marcacoes_aulas')
            .select('*')
            .or(`aluno_email.eq.${user.email},aluno_id.eq.${user.id}`)
            .order('data_aula', { ascending: true });

          if (bookingsData) {
            setStudentBookings(bookingsData as LessonBooking[]);
          }
        }

        // 2. Real study materials & unlocked paid sheets
        await loadPartiturasAndAccess();

        // 3. Real approved teachers
        const { data: teachersData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('role', 'teacher')
          .eq('approval_status', 'aprovado');

        if (teachersData && teachersData.length > 0) {
          setTeachers(teachersData.map((t: any) => ({
            name: t.nome || t.displayName || t.email?.split('@')[0] || 'Professor Tutti',
            instrument: t.instrumento || t.current_instrument || 'Diversos Instrumentos',
            bio: t.bio || 'Professor integrante do corpo docente oficial da Escola Tutti de Música.',
            rating: '5.0',
            avatar: t.photo_url || t.photoURL
          })));
        } else {
          const { data: solData } = await supabase
            .from('solicitacoes_professores')
            .select('*')
            .eq('status', 'aprovado');

          if (solData && solData.length > 0) {
            setTeachers(solData.map((s: any) => ({
              name: s.nome,
              instrument: s.instrumento,
              bio: s.bio || 'Professor credenciado pela Escola Tutti de Música.',
              rating: '5.0'
            })));
          } else {
            setTeachers([]);
          }
        }
      } catch (e) {
        console.debug('Erro ao carregar dados do aluno no Supabase:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const channel = supabase
      .channel('student-partituras-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partituras' }, () => {
        loadPartiturasAndAccess();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partituras_acessos' }, () => {
        loadPartiturasAndAccess();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, user?.id, loadPartiturasAndAccess]);

  const toSheetMusic = (item: DbPartitura): SheetMusic => ({
    id: item.id,
    title: item.titulo,
    composer: item.compositor || 'Compositor Tutti',
    instrument: item.instrumento || 'Instrumento Tutti',
    tonality: item.tonalidade || 'C',
    originalKey: item.tom_original || item.tonalidade || 'C',
    family: 'Tutti',
    level: (item.nivel as any) || 'Intermediário',
    genre: item.genero || 'Geral',
    tempo: item.tempo_bpm || 120,
    timeSignature: item.compasso || '4/4',
    melodyNotes: Array.isArray(item.melodia_notas) ? item.melodia_notas : [],
    chords: Array.isArray(item.cifras) ? item.cifras : [],
    description: item.descricao || '',
    youtubeUrl: item.youtube_url || undefined,
    pdfUrl: item.categoria === 'paga' ? undefined : (item.arquivo_pdf_url || undefined),
    storagePath: item.storage_path || undefined,
    isFeatured: item.is_featured,
    featuredOrder: item.featured_order,
    categoria: item.categoria || 'gratuita',
    preco: item.preco,
    publicado: item.publicado,
  });

  const handleOpenPartitura = async (item: DbPartitura) => {
    try {
      setOpeningSheetId(item.id);
      const { url, protected: isProtected } = await resolvePartituraPdfUrl(item);
      setActiveViewer({
        sheet: toSheetMusic(item),
        pdfUrl: url,
        isPaidProtected: isProtected,
      });
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível abrir o PDF desta partitura.');
      if ((err?.message || '').toLowerCase().includes('pro')) {
        setIsPlansModalOpen(true);
      }
    } finally {
      setOpeningSheetId(null);
    }
  };

  const handleUnlockProAccess = () => {
    showToast('Ative o Plano Tutti Pro Vitalício para acessar todas as partituras exclusivas.');
    setIsPlansModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    showToast('Sessão encerrada com sucesso.');
    if (onLogoutToAuth) {
      onLogoutToAuth();
    } else {
      navigate('/auth');
    }
  };

  const handleGoHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigate('/');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Início & Resumo', icon: Sparkles },
    { id: 'assinatura', label: 'Minha Assinatura', icon: CreditCard },
    { id: 'aulas', label: 'Minhas Aulas', icon: Video },
    { id: 'marcacoes', label: 'Marcações & Agenda', icon: Calendar },
    { id: 'partituras', label: 'Biblioteca de Partituras', icon: FileText },
    { id: 'professores', label: 'Nossos Professores', icon: GraduationCap },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#0c1017] border-r border-amber-500/20 flex flex-col justify-between shrink-0">
        <div>
          {/* Header Brand */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleGoHome}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
                <img
                  src="/assets/aistudio/Gemini_Generated_Image_kkz0gekkz0gekkz0_03cb0dc7.jfif"
                  alt="Tutti Logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <span className="font-serif text-lg font-bold tracking-wider text-amber-300 block">TUTTI</span>
                <span className="text-[10px] tracking-widest text-slate-400 uppercase font-sans">Área do Aluno</span>
              </div>
            </div>

            {/* Student Profile Card */}
            <div className="mt-5 p-3.5 rounded-xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-lg">
                  {profile?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-sm text-white truncate">{profile?.displayName || 'Aluno Tutti'}</h4>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-medium mt-0.5">
                    <CheckCircle className="w-3 h-3" /> Matrícula Ativa
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'marcacoes' && activeBookings.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full font-bold">
                      {activeBookings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Voltar para o Site Principal
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#07090e]">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400/90 font-mono tracking-wider uppercase">
                <Music className="w-3.5 h-3.5" /> Portal do Aluno Tutti
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mt-1">
                Olá, {profile?.displayName?.split(' ')[0] || 'Aluno'}! Bem-vindo aos seus estudos
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Acesse suas aulas agendadas, links do Google Meet, partituras exclusivas e histórico de aprendizado.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold transition"
                title="Desconectar do portal e voltar para tela de login"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair da Conta
              </button>
            </div>
          </div>

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Quick Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#0e141f] border border-white/10 hover:border-amber-500/30 transition">
                  <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-mono">
                    <span>Aulas Agendadas</span>
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-serif font-bold text-white mt-3">{activeBookings.length}</div>
                  <p className="text-xs text-slate-400 mt-1">Próximos encontros ativos</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e141f] border border-white/10 hover:border-cyan-500/30 transition">
                  <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-mono">
                    <span>Status da Matrícula</span>
                    <Award className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-400 mt-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Ativa & Regular
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Acesso completo à plataforma</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#0e141f] border border-white/10 hover:border-amber-500/30 transition">
                  <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-mono">
                    <span>Partituras Publicadas</span>
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-serif font-bold text-amber-300 mt-3">{studyMaterials.length}</div>
                  <p className="text-xs text-slate-400 mt-1">Acervo sincronizado em tempo real</p>
                </div>
              </div>

              {/* Next Scheduled Lesson Card */}
              {activeBookings.length > 0 ? (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#0e141f] to-[#0e141f] border border-amber-500/30">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">
                    <Bell className="w-4 h-4" /> Próxima Aula Agendada
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Aula com {activeBookings[0].professor_nome}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 mt-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          {activeBookings[0].data_aula}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-cyan-400" />
                          {activeBookings[0].hora_inicio} ({activeBookings[0].duracao_minutos} min)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {activeBookings[0].status}
                        </span>
                      </div>
                      {activeBookings[0].observacoes && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          "Obs: {activeBookings[0].observacoes}"
                        </p>
                      )}
                    </div>

                    <a
                      href={activeBookings[0].link_meet || 'https://meet.google.com/new'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition"
                    >
                      <Video className="w-4 h-4" />
                      Entrar no Google Meet
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-[#0e141f] border border-white/10 text-center">
                  <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white">Nenhuma aula agendada para hoje</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                    Seu professor entrará em contato para agendar o próximo horário ou você pode consultar seus professores disponíveis.
                  </p>
                  <button
                    onClick={() => setActiveTab('professores')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
                  >
                    Ver Professores Disponíveis
                  </button>
                </div>
              )}

              {/* Study Materials & Quick Navigation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-[#0e141f] border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-400" /> Material de Estudo Recomendado
                    </h3>
                    <button
                      onClick={() => setActiveTab('partituras')}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Ver acervo
                    </button>
                  </div>
                  <div className="space-y-3">
                    {studyMaterials.length > 0 ? (
                      studyMaterials.slice(0, 4).map((mat) => {
                        const isPaid = mat.categoria === 'paga';
                        const isUnlocked = !isPaid || hasFullProAccess || unlockedSheetIds.has(mat.id);
                        return (
                          <div key={mat.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{mat.titulo}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  {mat.compositor} • {mat.instrumento} • {isPaid ? (isUnlocked ? 'Pro Liberada' : 'Exclusiva Pro') : 'Gratuita'}
                                </p>
                              </div>
                            </div>
                            {isUnlocked ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPartitura(mat)}
                                disabled={openingSheetId === mat.id}
                                className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                {openingSheetId === mat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                <span>Abrir PDF</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleUnlockProAccess}
                                className="text-xs font-mono text-amber-300 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Lock className="w-3 h-3" /> Liberar Pro
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-xs text-slate-400 font-medium">Nenhum material publicado no momento.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#0e141f] border border-white/10">
                  <h3 className="font-serif font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Suporte e Secretaria Tutti
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Dúvidas sobre horários, reposição de aulas, mencionar aluno ou falar com a secretaria? Utilize os canais oficiais abaixo.
                  </p>
                  <OfficialContacts />
                </div>
              </div>
            </div>
          )}

          {/* TAB: MINHA ASSINATURA & STRIPE */}
          {activeTab === 'assinatura' && (
            <StudentSubscriptionArea onOpenPlansModal={() => setIsPlansModalOpen(true)} />
          )}

          {/* TAB: MINHAS AULAS */}
          {activeTab === 'aulas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white font-serif">Minhas Aulas Gravadas e Ao Vivo</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Conecte-se às salas de aula ao vivo ou revise o cronograma de aprendizado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBookings.map((aula) => (
                  <div key={aula.id} className="p-5 rounded-2xl bg-[#0e141f] border border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                          Aula Online Tutti
                        </span>
                        <span className="text-xs text-slate-400">
                          {aula.data_aula}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-3">Aula com {aula.professor_nome}</h3>
                      <p className="text-xs text-slate-400 mt-1">Horário: {aula.hora_inicio} ({aula.duracao_minutos} min)</p>
                      {aula.observacoes && (
                        <p className="text-xs text-slate-300 mt-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                          {aula.observacoes}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                      <a
                        href={aula.link_meet || 'https://meet.google.com/new'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Acessar Google Meet
                      </a>
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Confirmada
                      </span>
                    </div>
                  </div>
                ))}

                {activeBookings.length === 0 && (
                  <div className="col-span-2 p-12 text-center rounded-2xl bg-[#0e141f] border border-white/10 space-y-2">
                    <Video className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <h4 className="text-white font-bold text-base">Nenhuma aula próxima ou em andamento.</h4>
                    <p className="text-xs text-slate-400">
                      Suas próximas aulas aparecerão aqui assim que seu professor registrar os horários na agenda Tutti.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MARCAÇÕES & AGENDA */}
          {activeTab === 'marcacoes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white font-serif">Minha Agenda de Aulas</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Exibindo apenas aulas ativas, em andamento ou futuras (horário oficial de Brasília).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0e141f]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-slate-400 text-xs uppercase font-mono border-b border-white/10">
                    <tr>
                      <th className="p-4">Data e Hora</th>
                      <th className="p-4">Professor</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Sala Virtual</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeBookings.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-4">
                          <div className="font-semibold text-white">
                            {m.data_aula}
                          </div>
                          <div className="text-xs text-slate-400">
                            {m.hora_inicio} ({m.duracao_minutos} min)
                          </div>
                        </td>
                        <td className="p-4 text-slate-200">{m.professor_nome}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {m.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <a
                            href={m.link_meet || 'https://meet.google.com/new'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <Video className="w-3.5 h-3.5" /> Acessar Link
                          </a>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={async () => {
                              await cancelarMarcacaoAula(m.id);
                              setStudentBookings((prev) =>
                                prev.map((b) => (b.id === m.id ? { ...b, status: 'cancelada' } : b))
                              );
                              showToast('Aula cancelada e removida da agenda ativa.');
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            Cancelar Aula
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activeBookings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                          Nenhuma aula próxima encontrada na sua agenda ativa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: BIBLIOTECA DE PARTITURAS */}
          {activeTab === 'partituras' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white font-serif">Biblioteca de Partituras Tutti</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Baixe e estude partituras clássicas e modernas com arranjos exclusivos.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por título ou compositor..."
                      value={searchPartituras}
                      onChange={(e) => setSearchPartituras(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-64"
                    />
                  </div>
                </div>
              </div>

              {(() => {
                const term = normalizeSearchText(searchPartituras);
                const filtered = studyMaterials.filter(
                  (p) =>
                    !term ||
                    normalizeSearchText(p.titulo).includes(term) ||
                    normalizeSearchText(p.compositor || '').includes(term) ||
                    normalizeSearchText(p.instrumento || '').includes(term)
                );
                const featured = filtered.filter((p) => p.is_featured);
                const freeSheets = filtered.filter((p) => p.categoria !== 'paga');
                const paidSheets = filtered.filter((p) => p.categoria === 'paga');

                const renderCard = (item: DbPartitura) => {
                  const isPaid = item.categoria === 'paga';
                  const isUnlocked = !isPaid || hasFullProAccess || unlockedSheetIds.has(item.id);
                  const isBusy = openingSheetId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl bg-[#0e141f] border flex flex-col justify-between transition group ${
                        isPaid ? 'border-amber-500/30 hover:border-amber-400/60' : 'border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
                          <span className="text-amber-400 font-medium truncate">{item.instrumento}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.is_featured && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                <Star size={10} className="fill-amber-400" /> Destaque
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {isPaid ? (isUnlocked ? 'Pro Liberada' : 'Exclusiva Pro') : 'Gratuita'}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-serif font-bold text-white text-base mt-2 group-hover:text-amber-300 transition">
                          {item.titulo}
                        </h4>
                        <p className="text-xs text-slate-400">{item.compositor} • {item.nivel}</p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isPaid ? (isUnlocked ? 'Desbloqueada' : 'Exclusiva Pro') : 'Acesso Livre'}
                        </span>
                        {isUnlocked ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleOpenPartitura(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-black text-xs font-semibold transition cursor-pointer"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span>Abrir / Baixar PDF</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={handleUnlockProAccess}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black text-xs font-bold transition cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Liberar no Pro</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                };

                if (filtered.length === 0) {
                  return (
                    <div className="p-10 text-center rounded-2xl bg-[#0e141f] border border-white/10 text-xs text-slate-400">
                      Nenhuma partitura publicada encontrada no acervo no momento.
                    </div>
                  );
                }

                return (
                  <div className="space-y-8">
                    {featured.length > 0 && (
                      <section className="space-y-3">
                        <h3 className="text-sm font-syne font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                          <Star size={14} className="fill-amber-400" /> Partituras em Destaque ({featured.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {featured.map(renderCard)}
                        </div>
                      </section>
                    )}

                    <section className="space-y-3">
                      <h3 className="text-sm font-syne font-bold text-emerald-300 uppercase tracking-wider">
                        Partituras Gratuitas ({freeSheets.length})
                      </h3>
                      {freeSheets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {freeSheets.map(renderCard)}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Nenhuma partitura gratuita encontrada com o filtro atual.</p>
                      )}
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-syne font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <Lock size={14} /> Partituras Pagas / Premium ({paidSheets.length})
                      </h3>
                      {paidSheets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {paidSheets.map(renderCard)}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Nenhuma partitura paga encontrada com o filtro atual.</p>
                      )}
                    </section>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: PROFESSORES */}
          {activeTab === 'professores' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-serif">Corpo Docente da Escola Tutti</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Professores formados nos melhores conservatórios e universidades de música.
                </p>
              </div>

              {teachers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {teachers.map((prof, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-[#0e141f] border border-white/10 hover:border-amber-500/30 transition">
                      <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-serif font-bold text-xl mb-4 overflow-hidden">
                        {prof.avatar ? (
                          <img src={prof.avatar} alt={prof.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{prof.name.split(' ')[0]?.charAt(0) || 'P'}</span>
                        )}
                      </div>
                      <h3 className="font-serif font-bold text-lg text-white">{prof.name}</h3>
                      <p className="text-xs text-amber-400 font-medium mt-0.5">{prof.instrument}</p>
                      <p className="text-xs text-slate-400 mt-3 leading-relaxed">{prof.bio}</p>

                      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Corpo Docente</span>
                        <span className="text-amber-300 font-bold">★ {prof.rating || '5.0'} / 5.0</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#0e141f] border border-white/10 space-y-2">
                  <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-white font-bold text-base">Nenhum professor disponível no momento.</h4>
                  <p className="text-xs text-slate-400">
                    Novos professores credenciados serão disponibilizados aqui assim que forem aprovados pela coordenação.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: MEU PERFIL */}
          {activeTab === 'perfil' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-serif">Meu Perfil de Aluno</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Dados cadastrais da sua conta na Escola Tutti de Música.
                </p>
              </div>

              <div className="max-w-2xl p-6 rounded-2xl bg-[#0e141f] border border-white/10 space-y-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={profile?.displayName || 'Aluno Tutti'}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm opacity-90 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">E-mail Cadastrado</label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm opacity-90 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Tipo de Acesso</label>
                  <div className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Aluno Matriculado
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Deseja alterar a senha ou dados cadastrais?</span>
                  <button
                    onClick={() => showToast('Para alterar seus dados de matrícula, entre em contato com a secretaria pedagógica.')}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition"
                  >
                    Falar com Secretaria
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isPlansModalOpen && (
        <PlansModal isOpen={isPlansModalOpen} onClose={() => setIsPlansModalOpen(false)} />
      )}

      {activeViewer && (
        <SheetViewerModal
          sheet={activeViewer.sheet}
          pdfUrl={activeViewer.pdfUrl}
          isPaidProtected={activeViewer.isPaidProtected}
          isOpen={!!activeViewer}
          onClose={() => setActiveViewer(null)}
        />
      )}
    </div>
  );
};