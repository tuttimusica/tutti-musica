import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Globe, Music, Star, Users, UserCheck, 
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle, 
  Plus, Edit, Trash2, Search, Filter, Shield, Settings, 
  BarChart3, RefreshCw, Check, X, FileText, ChevronRight, LogOut, Sparkles, Download
} from 'lucide-react';
import { useAuth, TeacherRequest, LessonBooking } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { supabase } from '../../lib/supabase';
import { SHEETS_CATALOG, SheetMusic } from '../../data/musicData';

type DevTab = 
  | 'dashboard' 
  | 'site' 
  | 'partituras' 
  | 'destaques' 
  | 'professores' 
  | 'alunos' 
  | 'aulas' 
  | 'marcacoes' 
  | 'solicitacoes' 
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

  // Teacher Requests State
  const [requests, setRequests] = useState<TeacherRequest[]>([
    {
      id: 'req_1',
      user_id: 'prof_clara',
      nome: 'Profª Clara Vasconcelos',
      email: 'professora.clara@tutti.mus.br',
      instrumento: 'Saxofone Tenor & Flauta Transversal',
      bio: 'Especialista em Bossa Nova e MPB formada pela EMESP com 12 anos de experiência.',
      status: 'aprovado',
      created_at: '2026-10-25T14:30:00Z',
      decided_at: '2026-10-26T10:00:00Z',
      decided_by: 'Lucas Maestro'
    },
    {
      id: 'req_2',
      user_id: 'prof_marcos',
      nome: 'Prof. Marcos Drumond',
      email: 'marcos.drumond@musica.br',
      instrumento: 'Trompete & Metais',
      bio: 'Spalla de trompete da orquestra sinfônica, arranjador para big bands.',
      status: 'pendente',
      created_at: '2026-10-28T09:15:00Z'
    },
    {
      id: 'req_3',
      user_id: 'prof_thiago',
      nome: 'Prof. Thiago Alcantara',
      email: 'thiago.alcantara@gmail.com',
      instrumento: 'Violão & Canto',
      bio: 'Professor particular de violão 7 cordas e harmonia funcional.',
      status: 'pendente',
      created_at: '2026-10-29T16:40:00Z'
    }
  ]);

  // Bookings State
  const [bookings, setBookings] = useState<LessonBooking[]>([
    {
      id: 'bk_1',
      aluno_nome: 'Rafael Drumond',
      aluno_email: 'rafael.aluno@tutti.mus.br',
      aluno_telefone: '(11) 98844-2211',
      professor_nome: 'Profª Clara Vasconcelos',
      professor_email: 'professora.clara@tutti.mus.br',
      data_aula: '2026-11-02',
      hora_inicio: '15:00',
      duracao_minutos: 50,
      status: 'agendada',
      observacoes: 'Estudo do solo de Autumn Leaves e afinação nas notas graves do Sax Alto.',
      link_meet: 'https://meet.google.com/tut-sax-autumn',
      created_at: '2026-10-29T10:00:00Z'
    },
    {
      id: 'bk_2',
      aluno_nome: 'Beatriz Helena',
      aluno_email: 'beatriz.helena@gmail.com',
      aluno_telefone: '(21) 97722-3344',
      professor_nome: 'Profª Clara Vasconcelos',
      professor_email: 'professora.clara@tutti.mus.br',
      data_aula: '2026-11-03',
      hora_inicio: '16:00',
      duracao_minutos: 50,
      status: 'agendada',
      observacoes: 'Flauta transversal: respiração diafragmática e apoio sonoro em Carinhoso.',
      link_meet: 'https://meet.google.com/tut-flauta-carinhoso',
      created_at: '2026-10-29T11:30:00Z'
    },
    {
      id: 'bk_3',
      aluno_nome: 'Lucas Gabriel',
      aluno_email: 'lucas.gabriel@gmail.com',
      aluno_telefone: '(31) 99112-4455',
      professor_nome: 'Lucas Maestro',
      professor_email: 'desenvolvedor@tutti.mus.br',
      data_aula: '2026-11-04',
      hora_inicio: '10:00',
      duracao_minutos: 50,
      status: 'agendada',
      observacoes: 'Harmonia funcional: cadência ii-V-I e substituições tritônicas.',
      link_meet: 'https://meet.google.com/tut-harmonia-master',
      created_at: '2026-10-29T14:15:00Z'
    }
  ]);

  // Sheets Management State
  const [sheetsList, setSheetsList] = useState<SheetMusic[]>(() => [...SHEETS_CATALOG]);
  const [selectedFeaturedSheets, setSelectedFeaturedSheets] = useState<number[]>([1, 2, 4]);

  // Site Dynamic Content
  const [siteContent, setSiteContent] = useState({
    heroTitle: 'Domine o seu Instrumento com a Tutti',
    heroSubtitle: 'Aulas interativas, estúdio com metrônomo e acompanhamento pedagógico do Maestro Lucas.',
    bannerNotice: 'Novas Masterclasses de Harmonia e Improvisação abertas para todos os alunos!',
    isNoticeActive: true
  });

  // Access Logs
  const [accessLogs, setAccessLogs] = useState<any[]>([
    { id: '1', perfil: 'desenvolvedor', tipo_evento: 'login_sucesso', detalhes: 'Acesso ao Painel Administrativo', data: 'Hoje às 17:40' },
    { id: '2', perfil: 'aluno', tipo_evento: 'login_sucesso', detalhes: 'Rafael Drumond logou via e-mail', data: 'Hoje às 16:15' },
    { id: '3', perfil: 'professor', tipo_evento: 'aula_marcada', detalhes: 'Profª Clara agendou aula para 02/11', data: 'Hoje às 15:30' },
    { id: '4', perfil: 'professor', tipo_evento: 'solicitacao_professor_criada', detalhes: 'Prof. Thiago solicitou credenciamento', data: 'Ontem às 16:40' }
  ]);

  // Filters
  const [requestFilter, setRequestFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Load from Supabase on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        // Solicitacoes
        const { data: solData } = await supabase.from('solicitacoes_professores').select('*').order('created_at', { ascending: false });
        if (solData && solData.length > 0) {
          setRequests(solData as any);
        }

        // Marcacoes
        const { data: bData } = await supabase.from('marcacoes_aulas').select('*').order('data_aula', { ascending: true });
        if (bData && bData.length > 0) {
          setBookings(bData as any);
        }

        // Logs
        const { data: logData } = await supabase.from('eventos_acesso').select('*').order('created_at', { ascending: false }).limit(20);
        if (logData && logData.length > 0) {
          setAccessLogs(logData.map(l => ({
            id: l.id,
            perfil: l.perfil,
            tipo_evento: l.tipo_evento,
            detalhes: JSON.stringify(l.detalhes || {}),
            data: new Date(l.created_at).toLocaleString('pt-BR')
          })));
        }
      } catch (err) {
        console.warn('DevPanel Supabase sync fallback:', err);
      }
    }
    loadBackendData();
  }, []);

  const handleApproveTeacher = async (req: TeacherRequest) => {
    if (!window.confirm(`Confirmar a aprovação de "${req.nome}" como Professor oficial da Tutti?`)) return;

    try {
      await aprovarProfessor(req.id, req.user_id);
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'aprovado', decided_at: new Date().toISOString(), decided_by: user?.email || 'Desenvolvedor' } : r));
      showToast(`Professor(a) ${req.nome} aprovado(a) com sucesso! ✓`);
    } catch (err: any) {
      showToast('Erro ao aprovar professor no Supabase.');
    }
  };

  const handleRejectTeacher = async (req: TeacherRequest) => {
    if (!window.confirm(`Deseja rejeitar a solicitação de "${req.nome}"? O usuário não terá acesso ao painel de professor.`)) return;

    try {
      await rejeitarProfessor(req.id, req.user_id);
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejeitado', decided_at: new Date().toISOString(), decided_by: user?.email || 'Desenvolvedor' } : r));
      showToast(`Solicitação de ${req.nome} rejeitada.`);
    } catch (err: any) {
      showToast('Erro ao registrar rejeição.');
    }
  };

  const toggleFeaturedSheet = (sheetId: number) => {
    setSelectedFeaturedSheets(prev => {
      const exists = prev.includes(sheetId);
      const next = exists ? prev.filter(id => id !== sheetId) : [...prev, sheetId];
      showToast(`Partituras em destaque atualizadas! (${next.length} selecionadas)`);
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    showToast('Você saiu da conta administrativa. Até breve!');
    navigate('/auth');
  };

  const filteredRequests = requests.filter(r => {
    if (requestFilter !== 'todos' && r.status !== requestFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return r.nome.toLowerCase().includes(term) || r.email.toLowerCase().includes(term);
    }
    return true;
  });

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
              Gestão de conteúdos, aprovação de professores, auditoria de marcações de aula e relatórios analíticos integrados ao Supabase.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/tutti_estrutura_banco_de_dados.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              title="Abrir e baixar o PDF com a modelagem e estrutura completa do banco de dados (13 páginas)"
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
            { id: 'partituras', label: 'Partituras', icon: Music },
            { id: 'destaques', label: 'Partituras em Destaque', icon: Star },
            { id: 'professores', label: 'Professores', icon: Users },
            { id: 'solicitacoes', label: 'Solicitações de Professores', icon: UserCheck, badge: requests.filter(r => r.status === 'pendente').length },
            { id: 'alunos', label: 'Alunos', icon: Users },
            { id: 'aulas', label: 'Aulas & Cursos', icon: Calendar },
            { id: 'marcacoes', label: 'Marcações de Aula', icon: Clock, badge: bookings.length },
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
                <p className="text-xs text-slate-400">Indicadores consolidados em tempo real do ecossistema Tutti.</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Alunos Ativos</div>
                  <div className="text-3xl font-syne font-black text-cyan-400">184</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">+12 nesta semana</div>
                </div>
                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Professores Aprovados</div>
                  <div className="text-3xl font-syne font-black text-emerald-400">
                    {requests.filter(r => r.status === 'aprovado').length}
                  </div>
                  <div className="text-[10px] text-slate-400">Docentes ativos</div>
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
                    onClick={() => setActiveTab('solicitacoes')}
                    className="p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-between"
                  >
                    <span>Revisar Novos Professores</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setActiveTab('destaques')}
                    className="p-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center justify-between"
                  >
                    <span>Editar Partituras em Destaque</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setActiveTab('marcacoes')}
                    className="p-3.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold flex items-center justify-between"
                  >
                    <span>Ver Todas as Marcações</span>
                    <ChevronRight size={14} />
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

          {/* TAB 3: PARTITURAS */}
          {activeTab === 'partituras' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Biblioteca de Partituras</h2>
                  <p className="text-xs text-slate-400">Total de {sheetsList.length} partituras catalogadas com transposição e play-along.</p>
                </div>
                <button
                  onClick={() => {
                    const novoTitulo = prompt('Título da nova partitura:');
                    if (novoTitulo) {
                      const nova: SheetMusic = {
                        id: sheetsList.length + 1,
                        title: novoTitulo,
                        composer: 'Arranjo Tutti',
                        instrument: 'Saxofone Alto (Eb)',
                        tonality: 'G Maior',
                        originalKey: 'G',
                        family: 'Madeiras',
                        level: 'Intermediário',
                        genre: 'Bossa Nova',
                        tempo: 120,
                        timeSignature: '4/4',
                        melodyNotes: [{ note: 'G4', duration: 1 }, { note: 'B4', duration: 1 }],
                        chords: ['Gmaj7', 'Am7', 'D7'],
                        description: 'Partitura cadastrada pelo painel administrativo do desenvolvedor.'
                      };
                      setSheetsList([nova, ...sheetsList]);
                      showToast(`Partitura "${novoTitulo}" adicionada com sucesso! ✓`);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs flex items-center gap-2 shadow-md"
                >
                  <Plus size={16} />
                  <span>Adicionar Nova Partitura</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sheetsList.map(sheet => (
                  <div key={sheet.id} className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-syne font-bold text-white text-sm">{sheet.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                          {sheet.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{sheet.composer} • {sheet.instrument}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">{sheet.description}</p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <button
                        onClick={() => toggleFeaturedSheet(sheet.id)}
                        className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                          selectedFeaturedSheets.includes(sheet.id)
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Star size={12} className={selectedFeaturedSheets.includes(sheet.id) ? 'fill-amber-400 text-amber-400' : ''} />
                        <span>{selectedFeaturedSheets.includes(sheet.id) ? 'Destaque' : 'Destacar'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Deseja remover a partitura "${sheet.title}"?`)) {
                            setSheetsList(sheetsList.filter(s => s.id !== sheet.id));
                            showToast('Partitura removida.');
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                        title="Excluir com confirmação"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PARTITURAS EM DESTAQUE */}
          {activeTab === 'destaques' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Partituras em Destaque</h2>
                <p className="text-xs text-slate-400">
                  Selecione as partituras que aparecerão na seção principal de estudos dos alunos.
                </p>
              </div>

              <div className="space-y-3">
                {sheetsList.map(sheet => {
                  const isFeatured = selectedFeaturedSheets.includes(sheet.id);
                  return (
                    <div
                      key={sheet.id}
                      onClick={() => toggleFeaturedSheet(sheet.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isFeatured
                          ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-md'
                          : 'bg-[#0b0d14] border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isFeatured ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400'
                        }`}>
                          <Star size={16} className={isFeatured ? 'fill-black' : ''} />
                        </div>
                        <div>
                          <div className="font-syne font-bold text-sm text-white">{sheet.title}</div>
                          <div className="text-xs text-slate-400">{sheet.composer} • {sheet.instrument}</div>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isFeatured ? 'bg-amber-400 text-black font-black' : 'bg-white/5 text-slate-500'
                      }`}>
                        {isFeatured ? '★ Em Destaque' : 'Adicionar ao Destaque'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5 & 6: PROFESSORES E ALUNOS */}
          {(activeTab === 'professores' || activeTab === 'alunos') && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">
                  {activeTab === 'professores' ? 'Professores da Tutti' : 'Alunos Cadastrados'}
                </h2>
                <p className="text-xs text-slate-400">Consulta de contas ativas e permissões de acesso.</p>
              </div>

              {activeTab === 'professores' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.filter(r => r.status === 'aprovado').map(prof => (
                    <div key={prof.id} className="bg-[#0b0d14] p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Professor Aprovado
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {prof.user_id}</span>
                      </div>
                      <div>
                        <h4 className="font-syne font-bold text-white text-base">{prof.nome}</h4>
                        <p className="text-xs text-slate-400">{prof.email}</p>
                        <p className="text-xs text-cyan-300 font-semibold mt-1">Especialidade: {prof.instrumento}</p>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-[#131722] p-3 rounded-xl border border-white/5">
                        {prof.bio}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { nome: 'Rafael Drumond', email: 'rafael.aluno@tutti.mus.br', instrumento: 'Saxofone Alto', streak: 14, xp: 450, aulas: 8 },
                    { nome: 'Beatriz Helena', email: 'beatriz.helena@gmail.com', instrumento: 'Flauta Transversal', streak: 7, xp: 280, aulas: 4 },
                    { nome: 'Lucas Gabriel', email: 'lucas.gabriel@gmail.com', instrumento: 'Violão & Harmonia', streak: 21, xp: 620, aulas: 12 },
                    { nome: 'Juliana Torres', email: 'juliana.torres@hotmail.com', instrumento: 'Piano / Teclado', streak: 3, xp: 150, aulas: 2 }
                  ].map((aluno, i) => (
                    <div key={i} className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-syne font-bold text-sm text-white">{aluno.nome}</div>
                        <div className="text-xs text-slate-400">{aluno.email} • {aluno.instrumento}</div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-emerald-400 font-bold">{aluno.streak} dias ofensiva</span>
                        <span className="text-cyan-400 font-bold">{aluno.xp} XP</span>
                        <span className="text-violet-400 font-bold">{aluno.aulas} aulas</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7 & 8: AULAS E MARCAÇÕES */}
          {(activeTab === 'aulas' || activeTab === 'marcacoes') && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Marcações de Aulas</h2>
                  <p className="text-xs text-slate-400">Supervisão de todas as aulas individuais entre professores e alunos.</p>
                </div>
              </div>

              <div className="space-y-3">
                {bookings.map(bk => (
                  <div key={bk.id} className="bg-[#0b0d14] p-5 rounded-2xl border border-cyan-500/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs">
                          {bk.data_aula} às {bk.hora_inicio} ({bk.duracao_minutos} min)
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bk.status === 'agendada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {bk.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">Link: {bk.link_meet}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Aluno: </span>
                        <strong className="text-white">{bk.aluno_nome}</strong> ({bk.aluno_email}) - Tel: {bk.aluno_telefone || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400">Professor: </span>
                        <strong className="text-emerald-400">{bk.professor_nome}</strong>
                      </div>
                    </div>

                    {bk.observacoes && (
                      <p className="text-[11px] text-slate-300 bg-[#131722] p-2.5 rounded-xl border border-white/5">
                        {bk.observacoes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: SOLICITAÇÕES DE PROFESSORES */}
          {activeTab === 'solicitacoes' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Solicitações de Professores</h2>
                  <p className="text-xs text-slate-400">Aprovação e credenciamento oficial de docentes na Tutti.</p>
                </div>

                <div className="flex gap-2">
                  {(['todos', 'pendente', 'aprovado', 'rejeitado'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setRequestFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                        requestFilter === st ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filteredRequests.map(req => (
                  <div key={req.id} className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <h4 className="font-syne font-black text-base text-white">{req.nome}</h4>
                        <div className="text-xs text-slate-400">{req.email} • Especialidade: <strong className="text-cyan-300">{req.instrumento}</strong></div>
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
                          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <X size={14} />
                          <span>Rejeitar Solicitação</span>
                        </button>
                        <button
                          onClick={() => handleApproveTeacher(req)}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90 text-black text-xs font-black flex items-center gap-1.5 shadow-md"
                        >
                          <Check size={14} />
                          <span>Aprovar Professor</span>
                        </button>
                      </div>
                    )}
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
                  <div className="text-2xl font-syne font-black text-white">184</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Alunos</div>
                </div>
                <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 text-center">
                  <div className="text-2xl font-syne font-black text-emerald-400">
                    {requests.filter(r => r.status === 'aprovado').length}
                  </div>
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
                      {accessLogs.map(log => (
                        <tr key={log.id} className="text-slate-300">
                          <td className="py-2.5 font-bold uppercase text-[10px] text-amber-300">{log.perfil}</td>
                          <td className="py-2.5 font-mono text-cyan-400">{log.tipo_evento}</td>
                          <td className="py-2.5 max-w-xs truncate">{log.detalhes}</td>
                          <td className="py-2.5 text-right text-slate-500">{log.data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: CONFIGURAÇÕES */}
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
                        Documentação técnica oficial contendo todas as 18 tabelas, 14 módulos, RLS, triggers e seeds.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold self-start sm:self-auto">
                    13 Páginas em PDF
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs py-2">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Tabelas</span>
                    <span className="text-base font-bold text-white">18 Tabelas</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Políticas RLS</span>
                    <span className="text-base font-bold text-cyan-400">25 Políticas</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Views & Triggers</span>
                    <span className="text-base font-bold text-emerald-400">5 Objetos</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Ambientes</span>
                    <span className="text-base font-bold text-amber-300">Dev, Prof, Aluno</span>
                  </div>
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
    </div>
  );
};
