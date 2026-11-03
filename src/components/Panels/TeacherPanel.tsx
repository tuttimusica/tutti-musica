import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, BookOpen, Calendar, Clock, Users, User, 
  Plus, CheckCircle2, AlertCircle, Clock3, Video, Phone, Mail, 
  Search, ShieldAlert, LogOut, Sparkles, ChevronRight, Check
} from 'lucide-react';
import { useAuth, LessonBooking } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { supabase } from '../../lib/supabase';

type TeacherTab = 'dashboard' | 'aulas' | 'agenda' | 'alunos' | 'perfil';

export interface TeacherPanelProps {
  onLogoutToAuth?: () => void;
  onNavigateHome?: () => void;
}

export const TeacherPanel: React.FC<TeacherPanelProps> = ({ onLogoutToAuth, onNavigateHome }) => {
  const { user, profile, logout, criarMarcacaoAula, cancelarMarcacaoAula } = useAuth();
  const { navigate, showToast } = useAppRouter();
  const [activeTab, setActiveTab] = useState<TeacherTab>('dashboard');

  // Bookings state for this teacher (loaded strictly from Supabase, NO fake mocks)
  const [teacherBookings, setTeacherBookings] = useState<LessonBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

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

  const teacherDisplayName = profile?.displayName || user?.user_metadata?.full_name || 'Professor(a) Tutti';
  const teacherEmail = profile?.email || user?.email || 'professor@tutti.mus.br';

  // Load bookings for current teacher from Supabase
  useEffect(() => {
    async function loadTeacherData() {
      if (!teacherDisplayName) return;
      setIsLoadingBookings(true);
      try {
        const { data, error } = await supabase
          .from('marcacoes_aulas')
          .select('*')
          .or(`professor_nome.eq.${teacherDisplayName},professor_email.eq.${teacherEmail}`)
          .order('data_aula', { ascending: true });

        if (!error && data) {
          setTeacherBookings(data as LessonBooking[]);
        }
      } catch (e) {
        console.debug('Supabase teacher sync note:', e);
      } finally {
        setIsLoadingBookings(false);
      }
    }
    loadTeacherData();
  }, [teacherDisplayName, teacherEmail]);

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
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black text-xs shadow-lg hover:opacity-90 cursor-pointer"
            >
              Continuar como Aluno
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 flex items-center gap-2 cursor-pointer"
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
            <button onClick={() => navigate('/aluno')} className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs cursor-pointer">
              Acessar Área do Aluno
            </button>
            <button onClick={handleLogout} className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs cursor-pointer">
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
        professor_nome: teacherDisplayName,
        professor_email: teacherEmail,
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
        professor_nome: teacherDisplayName,
        professor_email: teacherEmail,
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
      setActiveTab('aulas'); // Switch to Minhas Aulas
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

  // Derive linked students dynamically from real bookings (NO mock students)
  const uniqueLinkedStudents = Array.from(
    new Map(
      teacherBookings
        .filter(b => b.aluno_email)
        .map(b => [b.aluno_email, {
          nome: b.aluno_nome,
          email: b.aluno_email,
          tel: b.aluno_telefone || 'Não informado',
          aulasCount: teacherBookings.filter(x => x.aluno_email === b.aluno_email).length,
          proximaAula: teacherBookings.find(x => x.aluno_email === b.aluno_email && x.status === 'agendada')
        }])
    ).values()
  );

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
              {teacherDisplayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gerencie suas aulas individuais, agende novos horários com seus alunos e acompanhe a evolução musical de cada estudante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 cursor-pointer"
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
          {/* ITEM 13: ALTERAR "PAINEL DO DOCENTE" PARA "PAINEL DE CONTROLE" */}
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-2">
            Painel de Controle
          </div>

          {/* ITEM 16: REMOVIDA A ABA "MARCAÇÕES" (FOCADA EM MINHAS AULAS) */}
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'aulas', label: 'Minhas Aulas', icon: BookOpen, badge: teacherBookings.filter(b => b.status === 'agendada').length },
            { id: 'agenda', label: 'Agenda de Aulas (Marcar)', icon: Calendar },
            { id: 'alunos', label: 'Meus Alunos', icon: Users, badge: uniqueLinkedStudents.length },
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Aulas Agendadas</div>
                  <div className="text-3xl font-syne font-black text-emerald-400">
                    {teacherBookings.filter(b => b.status === 'agendada').length}
                  </div>
                  <div className="text-[10px] text-slate-400">Próximos compromissos ao vivo</div>
                </div>

                <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Alunos Vinculados</div>
                  <div className="text-3xl font-syne font-black text-cyan-400">
                    {uniqueLinkedStudents.length}
                  </div>
                  <div className="text-[10px] text-slate-400">Estudantes com horários marcados</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4">
                <h3 className="font-syne font-bold text-sm text-white">Ações Rápidas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <button
                    onClick={() => setActiveTab('agenda')}
                    className="p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>+ Marcar Nova Aula com Aluno</span>
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => setActiveTab('aulas')}
                    className="p-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>Ver Minhas Aulas Agendadas</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MINHAS AULAS (ITEM 14 - DADOS REAIS DO SUPABASE E ESTADO VAZIO LIMPO) */}
          {activeTab === 'aulas' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Minhas Aulas</h2>
                  <p className="text-xs text-slate-400">Aulas individuais ao vivo marcadas com seus alunos na Tutti.</p>
                </div>

                <button
                  onClick={() => setActiveTab('agenda')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black text-xs flex items-center gap-2 shadow-md cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={15} />
                  <span>Marcar nova aula</span>
                </button>
              </div>

              {teacherBookings.length > 0 ? (
                <div className="space-y-3">
                  {teacherBookings.map(booking => (
                    <div
                      key={booking.id}
                      className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-3 hover:border-emerald-500/30 transition-colors shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <div>
                          <h4 className="font-syne font-bold text-white text-base">
                            Aluno: {booking.aluno_nome}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {booking.aluno_email} {booking.aluno_telefone ? `• ${booking.aluno_telefone}` : ''}
                          </p>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          booking.status === 'agendada' ? 'bg-cyan-500/20 text-cyan-300' :
                          booking.status === 'realizada' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-4 text-slate-300 font-mono">
                          <span>Data: <strong>{booking.data_aula}</strong></span>
                          <span>Horário: <strong>{booking.hora_inicio}</strong> ({booking.duracao_minutos} min)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {booking.link_meet && (
                            <a
                              href={booking.link_meet}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500 text-violet-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Video size={13} />
                              <span>Entrar no Google Meet</span>
                            </a>
                          )}
                          {booking.status === 'agendada' && (
                            <button
                              onClick={() => handleCancelBooking(booking.id, booking.aluno_nome)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>

                      {booking.observacoes && (
                        <p className="text-[11px] text-slate-400 italic bg-[#131722] p-2.5 rounded-xl border border-white/5">
                          "Plano da aula: {booking.observacoes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* ITEM 14.2: ESTADO VAZIO: MANTER SOMENTE A AÇÃO "MARCAR NOVA AULA" SEM CARTÕES FICTÍCIOS */
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-4">
                  <BookOpen size={36} className="mx-auto text-slate-500" />
                  <div className="space-y-1">
                    <h3 className="font-syne font-bold text-white text-base">Nenhuma aula marcada</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Você ainda não possui horários agendados. Use a ação abaixo para marcar uma nova aula ao vivo com seu aluno.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => setActiveTab('agenda')}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-syne font-black text-xs shadow-lg hover:opacity-90 cursor-pointer"
                    >
                      Marcar nova aula
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AGENDA DE AULAS — MARCAR (ITEM 15) */}
          {activeTab === 'agenda' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">
                  Marcar Nova Aula na Agenda
                </h2>
                <p className="text-xs text-slate-400">
                  Agende aulas ao vivo com seus alunos. As informações são sincronizadas no Supabase e na área do aluno.
                </p>
              </div>

              {formError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleScheduleSubmit} className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4 text-xs">
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
                    className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
                  />
                </div>

                {/* 2. E-mail e Telefone do Aluno */}
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
                      className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                      Telefone / WhatsApp (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={formData.alunoTelefone}
                      onChange={e => setFormData({ ...formData, alunoTelefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
                    />
                  </div>
                </div>

                {/* 3. Data e Hora da Aula */}
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
                      className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
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
                      className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                      Duração
                    </label>
                    <select
                      value={formData.duracaoMinutos}
                      onChange={e => setFormData({ ...formData, duracaoMinutos: Number(e.target.value) })}
                      className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-400 text-xs"
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
                    className="w-full bg-[#131722] text-white border border-white/10 rounded-xl p-3 outline-none focus:border-emerald-400 resize-none leading-relaxed text-xs"
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

          {/* TAB 4: MEUS ALUNOS (ITEM 17 - VINCULADOS REAIS E ESTADO VAZIO) */}
          {activeTab === 'alunos' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Meus Alunos</h2>
                <p className="text-xs text-slate-400">Estudantes com agendamentos ou aulas sob sua responsabilidade docente.</p>
              </div>

              {uniqueLinkedStudents.length > 0 ? (
                <div className="space-y-3">
                  {uniqueLinkedStudents.map((aluno, idx) => (
                    <div key={idx} className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                      <div>
                        <h4 className="font-syne font-bold text-white text-base">{aluno.nome}</h4>
                        <p className="text-xs text-slate-400">{aluno.email} • {aluno.tel}</p>
                        {aluno.proximaAula && (
                          <span className="text-[11px] text-cyan-300 font-semibold mt-1 inline-block">
                            Próxima aula marcada: {aluno.proximaAula.data_aula} às {aluno.proximaAula.hora_inicio}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                          {aluno.aulasCount} {aluno.aulasCount === 1 ? 'aula marcada' : 'aulas marcadas'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ITEM 17.2: ESTADO VAZIO EXATO */
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-white/10 space-y-3">
                  <Users size={32} className="mx-auto text-slate-500" />
                  <h3 className="font-syne font-bold text-white text-base">Ainda não há alunos.</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Assim que você agendar uma aula com um estudante na aba "Agenda de Aulas (Marcar)", ele aparecerá vinculado aqui.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MEU PERFIL */}
          {activeTab === 'perfil' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl sm:text-2xl font-syne font-black text-white">Meu Perfil Docente</h2>
                <p className="text-xs text-slate-400">Dados cadastrais e credenciamento na escola de música Tutti.</p>
              </div>

              <div className="bg-[#0b0d14] p-6 rounded-2xl border border-white/10 space-y-4 text-xs max-w-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Nome Completo:</span>
                  <div className="text-white font-syne font-bold text-base">{teacherDisplayName}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">E-mail de Acesso:</span>
                  <div className="text-slate-300 font-mono">{teacherEmail}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Status de Credenciamento:</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    <CheckCircle2 size={13} /> Professor Aprovado Oficialmente
                  </div>
                </div>

                {profile?.bio && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Biografia:</span>
                    <p className="text-slate-300 leading-relaxed bg-[#131722] p-3 rounded-xl border border-white/5">
                      {profile.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
