import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, BookOpen, Calendar, Clock, Users, User, 
  Plus, CheckCircle2, AlertCircle, Clock3, Video, Phone, Mail, 
  Search, ShieldAlert, LogOut, Sparkles, ChevronRight, Check
} from 'lucide-react';
import { useAuth, LessonBooking } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { supabase } from '../../lib/supabase';

type TeacherTab = 'dashboard' | 'aulas' | 'agenda' | 'marcacoes' | 'alunos' | 'perfil';

export interface TeacherPanelProps {
  onLogoutToAuth?: () => void;
  onNavigateHome?: () => void;
}

export const TeacherPanel: React.FC<TeacherPanelProps> = ({ onLogoutToAuth, onNavigateHome }) => {
  const { user, profile, logout, criarMarcacaoAula, cancelarMarcacaoAula } = useAuth();
  const { navigate, showToast } = useAppRouter();
  const [activeTab, setActiveTab] = useState<TeacherTab>('dashboard');

  // Bookings state for this teacher
  const [teacherBookings, setTeacherBookings] = useState<LessonBooking[]>([
    {
      id: 'tb_1',
      aluno_nome: 'Rafael Drumond',
      aluno_email: 'rafael.aluno@tutti.mus.br',
      aluno_telefone: '(11) 98844-2211',
      professor_nome: profile?.displayName || 'Profª Clara Vasconcelos',
      professor_email: profile?.email || 'professora.clara@tutti.mus.br',
      data_aula: '2026-11-02',
      hora_inicio: '15:00',
      duracao_minutos: 50,
      status: 'agendada',
      observacoes: 'Estudo do solo de Autumn Leaves e afinação nas notas graves do Sax Alto.',
      link_meet: 'https://meet.google.com/tut-sax-autumn',
      created_at: '2026-10-29T10:00:00Z'
    },
    {
      id: 'tb_2',
      aluno_nome: 'Beatriz Helena',
      aluno_email: 'beatriz.helena@gmail.com',
      aluno_telefone: '(21) 97722-3344',
      professor_nome: profile?.displayName || 'Profª Clara Vasconcelos',
      professor_email: profile?.email || 'professora.clara@tutti.mus.br',
      data_aula: '2026-11-03',
      hora_inicio: '16:00',
      duracao_minutos: 50,
      status: 'agendada',
      observacoes: 'Flauta transversal: respiração diafragmática e apoio sonoro em Carinhoso.',
      link_meet: 'https://meet.google.com/tut-flauta-carinhoso',
      created_at: '2026-10-29T11:30:00Z'
    }
  ]);

  // Form State for Scheduling a Class
  const [formData, setFormData] = useState({
    alunoNome: '',
    alunoEmail: '',
    alunoTelefone: '',
    dataAula: '',
    horaInicio: '14:00',
    duracaoMinutos: 50,
    observacoes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load bookings for current teacher from Supabase
  useEffect(() => {
    async function loadTeacherData() {
      try {
        const { data } = await supabase
          .from('marcacoes_aulas')
          .select('*')
          .eq('professor_nome', profile?.displayName || 'Profª Clara Vasconcelos')
          .order('data_aula', { ascending: true });

        if (data && data.length > 0) {
          setTeacherBookings(data as any);
        }
      } catch (e) {
        console.debug('Supabase teacher sync:', e);
      }
    }
    loadTeacherData();
  }, [profile]);

  const handleLogout = async () => {
    await logout();
    showToast('Você saiu da conta de professor. Até logo!');
    navigate('/auth');
  };

  // CHECK APPROVAL STATUS: PENDING OR REJECTED (Strict requirements per Master Prompt)
  const isPending = profile?.approvalStatus === 'pendente';
  const isRejected = profile?.approvalStatus === 'rejeitado';

  if (isPending) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-300">
        <div className="bg-[#131722] border-2 border-amber-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-inner animate-pulse">
            ⏳
          </div>

          <div className="space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30 inline-block">
              Solicitação em Análise
            </span>

            {/* MANDATORY EXACT WORDING REQUIRED BY SPEC */}
            <div className="p-5 rounded-2xl bg-[#0b0d14] border border-amber-500/30 text-amber-200 font-syne font-bold text-sm sm:text-base leading-relaxed">
              &ldquo;Perfil em análise, aguarde! Utilize a sua conta como aluno até a sua aprovação. Grato!&rdquo;
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed pt-2">
              Sua solicitação de acesso como Professor está sendo avaliada pelo desenvolvedor e coordenador pedagógico da Tutti. Enquanto isso, você tem acesso irrestrito à área de aluno para estudar e praticar.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/aluno')}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black text-xs shadow-lg hover:opacity-90"
            >
              Continuar como Aluno
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 flex items-center gap-2"
            >
              <LogOut size={14} />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-300">
        <div className="bg-[#131722] border-2 border-rose-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto text-2xl">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-syne font-black text-white">Solicitação de Docência Não Aprovada</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              No momento, sua solicitação para atuar como professor na Tutti não foi aprovada pelo corpo diretivo. Sua conta continua ativa com acesso total como Aluno.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/aluno')} className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs">
              Acessar Área do Aluno
            </button>
            <button onClick={handleLogout} className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs">
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Create Booking with conflict validation
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.alunoNome || !formData.alunoEmail || !formData.dataAula || !formData.horaInicio) {
      setFormError('Preencha todos os campos obrigatórios do agendamento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await criarMarcacaoAula({
        aluno_nome: formData.alunoNome.trim(),
        aluno_email: formData.alunoEmail.trim(),
        aluno_telefone: formData.alunoTelefone.trim() || undefined,
        professor_nome: profile?.displayName || 'Profª Clara Vasconcelos',
        professor_email: profile?.email || 'professora.clara@tutti.mus.br',
        data_aula: formData.dataAula,
        hora_inicio: formData.horaInicio,
        duracao_minutos: Number(formData.duracaoMinutos) || 50,
        status: 'agendada',
        observacoes: formData.observacoes.trim() || undefined
      });

      if (res.error) {
        setFormError(res.error.message || 'Erro ao agendar aula.');
        return;
      }

      const newBooking: LessonBooking = res.data || {
        id: `tb_${Date.now()}`,
        aluno_nome: formData.alunoNome.trim(),
        aluno_email: formData.alunoEmail.trim(),
        aluno_telefone: formData.alunoTelefone.trim(),
        professor_nome: profile?.displayName || 'Profª Clara Vasconcelos',
        professor_email: profile?.email || 'professora.clara@tutti.mus.br',
        data_aula: formData.dataAula,
        hora_inicio: formData.horaInicio,
        duracao_minutos: Number(formData.duracaoMinutos) || 50,
        status: 'agendada',
        observacoes: formData.observacoes.trim(),
        link_meet: 'https://meet.google.com/tut-nova-aula',
        created_at: new Date().toISOString()
      };

      setTeacherBookings(prev => [newBooking, ...prev]);
      showToast(`Aula marcada com sucesso com ${formData.alunoNome}! Link do Google Meet gerado. ✓`);
      setFormData({
        alunoNome: '',
        alunoEmail: '',
        alunoTelefone: '',
        dataAula: '',
        horaInicio: '14:00',
        duracaoMinutos: 50,
        observacoes: ''
      });
      setActiveTab('marcacoes');
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao agendar aula.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string, alunoNome: string) => {
    if (!window.confirm(`Deseja cancelar a aula com ${alunoNome}?`)) return;
    try {
      await cancelarMarcacaoAula(id);
      setTeacherBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelada' } : b));
      showToast('Aula cancelada com sucesso.');
    } catch {
      showToast('Erro ao cancelar aula.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Teacher Header Banner */}
      <div className="bg-gradient-to-r from-[#121921] via-[#15232d] to-[#131722] border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Ambiente do Professor Tutti (Docente Autorizado)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-syne font-black text-white tracking-tight">
              {profile?.displayName || 'Profª Clara Vasconcelos'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gerencie suas aulas individuais, agende novos horários com seus alunos e acompanhe a evolução musical de cada estudante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10"
            >
              Ver Início
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Sair da conta e voltar para a tela de login"
            >
              <LogOut size={15} />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Navigation + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-[#131722] border border-white/10 rounded-3xl p-4 shadow-xl space-y-2 sticky top-24">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-2">
            Painel do Docente
          </div>

          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'aulas', label: 'Minhas Aulas', icon: BookOpen },
            { id: 'agenda', label: 'Agenda de Aulas (Marcar)', icon: Calendar },
            { id: 'marcacoes', label: 'Marcações', icon: Clock, badge: teacherBookings.filter(b => b.status === 'agendada').length },
            { id: 'alunos', label: 'Meus Alunos', icon: Users },
            { id: 'perfil', label: 'Meu Perfil', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TeacherTab)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-300 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-9 bg-[#131722] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl min-h-[550px]">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">
                  Resumo Pedagógico
                </h2>
                <p className="text-xs text-slate-400">Suas próximas aulas e alunos sob sua mentoria musical.</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Aulas Agendadas</div>
                  <div className="text-3xl font-syne font-black text-emerald-400">
                    {teacherBookings.filter(b => b.status === 'agendada').length}
                  </div>
                  <div className="text-[10px] text-slate-400">Próximos compromissos</div>
                </div>

                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Alunos Vinculados</div>
                  <div className="text-3xl font-syne font-black text-cyan-400">
                    {new Set(teacherBookings.map(b => b.aluno_email)).size}
                  </div>
                  <div className="text-[10px] text-slate-400">Estudantes ativos</div>
                </div>

                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Horas Ministradas</div>
                  <div className="text-3xl font-syne font-black text-violet-400">18h</div>
                  <div className="text-[10px] text-slate-400">Neste semestre</div>
                </div>
              </div>

              {/* Next Class Highlights */}
              <div className="bg-[#0b0d14] p-6 rounded-2xl border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-syne font-bold text-sm text-white flex items-center gap-2">
                    <Clock size={16} className="text-emerald-400" /> Próxima Aula Agendada
                  </h3>
                  <button
                    onClick={() => setActiveTab('agenda')}
                    className="text-xs text-cyan-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>+ Marcar Nova Aula</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {teacherBookings.filter(b => b.status === 'agendada').length > 0 ? (
                  <div className="p-4 rounded-xl bg-[#131722] border border-white/5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-syne font-bold text-base text-white">
                        {teacherBookings[0].aluno_nome}
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                        {teacherBookings[0].data_aula} às {teacherBookings[0].hora_inicio}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{teacherBookings[0].observacoes}</p>
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">E-mail: {teacherBookings[0].aluno_email}</span>
                      <a
                        href={teacherBookings[0].link_meet}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5"
                      >
                        <Video size={14} />
                        <span>Entrar no Google Meet</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Nenhuma aula agendada no momento.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2 & 4: MINHAS AULAS / MARCAÇÕES */}
          {(activeTab === 'aulas' || activeTab === 'marcacoes') && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">
                    Minhas Marcações de Aula
                  </h2>
                  <p className="text-xs text-slate-400">Aulas sob sua responsabilidade docente.</p>
                </div>

                <button
                  onClick={() => setActiveTab('agenda')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-md"
                >
                  <Plus size={16} />
                  <span>Marcar Nova Aula</span>
                </button>
              </div>

              <div className="space-y-4">
                {teacherBookings.map(b => (
                  <div key={b.id} className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-syne font-bold text-white text-sm">{b.aluno_nome}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'agendada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {b.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-cyan-300">
                        {b.data_aula} às {b.hora_inicio} ({b.duracao_minutos} min)
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        <span>{b.aluno_email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />
                        <span>{b.aluno_telefone || 'Sem telefone informado'}</span>
                      </div>
                    </div>

                    {b.observacoes && (
                      <p className="text-[11px] text-slate-400 bg-[#131722] p-2.5 rounded-xl border border-white/5">
                        {b.observacoes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <a
                        href={b.link_meet}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Video size={14} />
                        <span>Abrir Link do Google Meet</span>
                      </a>

                      {b.status === 'agendada' && (
                        <button
                          onClick={() => handleCancelBooking(b.id, b.aluno_nome)}
                          className="text-rose-400 hover:text-rose-300 hover:underline text-[11px] font-bold"
                        >
                          Cancelar Aula
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AGENDA DE AULAS (FORMULÁRIO DE MARCAÇÃO EXIGIDO NO PROMPT MASTER) */}
          {activeTab === 'agenda' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">
                  Agendar Nova Aula com Aluno
                </h2>
                <p className="text-xs text-slate-400">
                  Preencha os dados do aluno e horário. O sistema valida conflitos de agenda automaticamente no Supabase.
                </p>
              </div>

              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
                {/* 1. Nome do Aluno */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Nome Completo do Aluno *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.alunoNome}
                    onChange={e => setFormData({ ...formData, alunoNome: e.target.value })}
                    placeholder="Ex: Rafael Drumond"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                {/* 2. E-mail e Telefone do Aluno (CAMPOS ESPECIFICADOS NO PROMPT MASTER) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                      E-mail do Aluno *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.alunoEmail}
                      onChange={e => setFormData({ ...formData, alunoEmail: e.target.value })}
                      placeholder="aluno@tutti.mus.br"
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                      Telefone do Aluno (WhatsApp)
                    </label>
                    <input
                      type="text"
                      value={formData.alunoTelefone}
                      onChange={e => setFormData({ ...formData, alunoTelefone: e.target.value })}
                      placeholder="(11) 98844-2211"
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* 3. Data e Hora da Aula (CAMPOS ESPECIFICADOS NO PROMPT MASTER) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                      Data da Aula *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dataAula}
                      onChange={e => setFormData({ ...formData, dataAula: e.target.value })}
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                      Horário de Início *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.horaInicio}
                      onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                      Duração
                    </label>
                    <select
                      value={formData.duracaoMinutos}
                      onChange={e => setFormData({ ...formData, duracaoMinutos: Number(e.target.value) })}
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={50}>50 minutos (Padrão)</option>
                      <option value={80}>80 minutos (Intensivo)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Observações Pedagógicas */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Observações & Metas da Aula
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Ex: Treino de afinação e fraseado na música Garota de Ipanema. Trazer palheta 2.5."
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl p-3 outline-none focus:border-emerald-400 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black text-xs shadow-lg hover:opacity-90 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check size={16} />
                    <span>{isSubmitting ? 'Validando no Supabase...' : 'Confirmar e Salvar Marcação'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: MEUS ALUNOS */}
          {activeTab === 'alunos' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Meus Alunos</h2>
                <p className="text-xs text-slate-400">Alunos com aulas ativas ou agendadas com você.</p>
              </div>

              <div className="space-y-3">
                {[
                  { nome: 'Rafael Drumond', email: 'rafael.aluno@tutti.mus.br', tel: '(11) 98844-2211', instrumento: 'Saxofone Alto', aulasCount: 6 },
                  { nome: 'Beatriz Helena', email: 'beatriz.helena@gmail.com', tel: '(21) 97722-3344', instrumento: 'Flauta Transversal', aulasCount: 3 }
                ].map((al, idx) => (
                  <div key={idx} className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-syne font-bold text-white text-sm">{al.nome}</h4>
                      <p className="text-xs text-slate-400">{al.email} • {al.tel}</p>
                      <span className="text-[11px] text-cyan-300 font-semibold mt-1 inline-block">
                        Instrumento: {al.instrumento}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-xl">
                        {al.aulasCount} aulas concluídas
                      </span>
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, alunoNome: al.nome, alunoEmail: al.email, alunoTelefone: al.tel }));
                          setActiveTab('agenda');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors"
                      >
                        Nova Aula
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MEU PERFIL */}
          {activeTab === 'perfil' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Perfil do Docente</h2>
                <p className="text-xs text-slate-400">Informações públicas exibidas aos seus alunos.</p>
              </div>

              <div className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">Nome de Exibição</label>
                  <div className="text-white font-bold text-sm">{profile?.displayName || 'Profª Clara Vasconcelos'}</div>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">E-mail Cadastrado</label>
                  <div className="text-white">{profile?.email || 'professora.clara@tutti.mus.br'}</div>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">Instrumentos Ministrados</label>
                  <div className="text-cyan-300 font-semibold">Saxofone Tenor, Flauta Transversal, Harmonia</div>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">Biografia Pedagógica</label>
                  <p className="text-slate-300 leading-relaxed bg-[#131722] p-3 rounded-xl border border-white/5">
                    {profile?.bio || 'Docente de Saxofone Tenor, Flauta Transversal e Improvisação Brasileira 🎷'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
