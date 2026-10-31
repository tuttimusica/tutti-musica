import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Music,
  LogOut,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';

export const AuthPage: React.FC = () => {
  const {
    user,
    profile,
    loading,
    loginWithEmail,
    signUpWithEmail,
    resetPassword,
    loginWithGoogle,
    loginAsRole,
    logout
  } = useAuth();
  const { currentPath, queryParams, navigate, showToast } = useAppRouter();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signUpRole, setSignUpRole] = useState<'aluno' | 'professor'>('aluno');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Translate Supabase errors to Portuguese
  const translateAuthError = (err: any): string => {
    const msg = err?.message || err?.error_description || String(err || '');
    if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
      return 'O provedor Google ainda não foi ativado no painel do Supabase. Utilize o login com E-mail e Senha abaixo ou a seleção direta de ambiente.';
    }
    if (msg.includes('requested path is invalid') || msg.includes('Invalid path') || msg.includes('PGRST125') || msg.includes('PGRST126')) {
      return 'Atenção: Acesso direto por esta interface.';
    }
    if (msg.includes('email_address_invalid') || msg.includes('is invalid')) {
      return 'Por favor, informe um endereço de e-mail com formato válido (ex: seu-nome@gmail.com).';
    }
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'E-mail ou senha incorretos. Se ainda não possui cadastro, crie sua conta na aba ao lado.';
    }
    if (msg.includes('User already registered') || msg.includes('already registered')) {
      return 'Este e-mail já possui cadastro. Faça login ou solicite recuperação de senha.';
    }
    if (msg.includes('Password should be at least 6 characters')) {
      return 'A senha precisa ter no mínimo 6 caracteres.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique a mensagem enviada para sua caixa de entrada.';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return 'Falha de conexão com o Supabase. Verifique sua conexão com a internet.';
    }
    return msg || 'Ocorreu um erro na autenticação.';
  };

  const routeByRole = (role?: string) => {
    if (role === 'desenvolvedor' || role === 'admin') return '/admin';
    if (role === 'professor') return '/professor';
    return '/aluno';
  };

  const handleSelectRole = async (role: 'desenvolvedor' | 'professor' | 'aluno', status: 'aprovado' | 'pendente' = 'aprovado') => {
    setIsSubmitting(true);
    try {
      await loginAsRole(role, status);
      const roleNames = {
        desenvolvedor: 'Desenvolvedor & Administrador',
        professor: 'Professor Tutti',
        aluno: 'Aluno Tutti'
      };
      showToast(`Conectado como ${roleNames[role]}! Redirecionando...`);
      navigate(routeByRole(role));
    } catch (err: any) {
      setErrorMsg('Erro ao trocar de ambiente: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Informe o seu endereço de e-mail.');
      return;
    }

    if (authMode !== 'forgot' && (!password || password.length < 6)) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (authMode === 'signin') {
        const { error, data } = await loginWithEmail(cleanEmail, password);
        if (error) throw error;
        showToast('Login realizado com sucesso! Bem-vindo(a) de volta ♪');
        
        // Determine destination based on logged user profile role
        const targetPath = routeByRole(profile?.role);
        navigate(queryParams.redirectTo || targetPath);
      } else if (authMode === 'signup') {
        const cleanName = displayName.trim() || (signUpRole === 'professor' ? 'Professor Tutti' : 'Aluno Tutti');
        const res = await signUpWithEmail(cleanEmail, password, cleanName, signUpRole);
        if (res.error) throw res.error;

        if (signUpRole === 'professor') {
          setSuccessMsg('Cadastro de professor registrado! Seu perfil passará por análise da coordenação Tutti.');
          showToast('Solicitação de professor enviada com sucesso!');
        } else {
          showToast('Conta criada com sucesso! 🎶');
        }

        if (res.data?.session) {
          navigate(routeByRole(signUpRole));
        } else {
          setSuccessMsg('Cadastro realizado com sucesso! Verifique seu e-mail ou utilize o acesso rápido por ambiente acima.');
        }
      } else if (authMode === 'forgot') {
        const { error } = await resetPassword(cleanEmail);
        if (error) throw error;
        setSuccessMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada e spam.');
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Sessão encerrada com sucesso.');
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4 animate-in fade-in duration-300">
      <div className="bg-[#11141d] border border-amber-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative space-y-8 backdrop-blur-xl">
        {/* Decorative Golden Ambient Aura */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="text-center space-y-3 relative z-10">
          <div className="w-20 h-20 mx-auto rounded-full overflow-hidden p-1 bg-gradient-to-tr from-amber-400 via-amber-600 to-yellow-500 shadow-xl shadow-amber-500/15">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_kkz0gekkz0gekkz0_03cb0dc7.jfif"
              alt="Logo Tutti Escola de Música"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold">
              Tutti Escola de Música
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mt-1">
              Portal de Acesso e Autenticação
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
              Escolha seu ambiente de acesso direto (Desenvolvedor, Professor ou Aluno) ou entre com suas credenciais.
            </p>
          </div>
        </div>

        {/* Current Active Session Banner (if already logged in) */}
        {user && (
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300">
                {profile?.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-xs text-slate-400">Você está conectado como:</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{profile?.displayName || user.email}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {profile?.role || 'aluno'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(routeByRole(profile?.role))}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <span>Ir para Meu Painel</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5"
                title="Sair desta conta e deslogar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION: 3 ROLE SELECTOR BUTTONS */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-slate-200">
              Acesso Imediato por Ambiente (Selecione o seu Perfil)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. DESENVOLVEDOR */}
            <button
              type="button"
              onClick={() => handleSelectRole('desenvolvedor')}
              disabled={isSubmitting}
              className="p-4 rounded-2xl bg-[#0b0e15] hover:bg-[#151a24] border border-amber-500/30 hover:border-amber-400 text-left transition-all group shadow-lg hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform mb-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-white text-base group-hover:text-amber-300 transition">
                    Desenvolvedor
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Gerenciar site, partituras, professores, relatórios, cadastros e sistema.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-amber-400">
                <span>Entrar como Dev</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 2. PROFESSOR */}
            <button
              type="button"
              onClick={() => handleSelectRole('professor', 'aprovado')}
              disabled={isSubmitting}
              className="p-4 rounded-2xl bg-[#0b0e15] hover:bg-[#151a24] border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group shadow-lg hover:shadow-emerald-500/10 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform mb-3">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-white text-base group-hover:text-emerald-300 transition">
                    Professor
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    Docente
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Agenda de aulas, alunos, marcações de horários e sala de aula Google Meet.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span>Entrar como Professor</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 3. ALUNO */}
            <button
              type="button"
              onClick={() => handleSelectRole('aluno')}
              disabled={isSubmitting}
              className="p-4 rounded-2xl bg-[#0b0e15] hover:bg-[#151a24] border border-cyan-500/30 hover:border-cyan-400 text-left transition-all group shadow-lg hover:shadow-cyan-500/10 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform mb-3">
                  <Music className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-white text-base group-hover:text-cyan-300 transition">
                    Aluno
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                    Estudante
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Minhas aulas, partituras exclusivas, agendamentos e material didático.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span>Entrar como Aluno</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => handleSelectRole('professor', 'pendente')}
              className="text-[11px] text-slate-400 hover:text-amber-400 transition underline underline-offset-4 cursor-pointer"
            >
              Testar visualização de Professor com status Pendente de Análise
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-4 text-xs font-mono uppercase text-slate-400">
            Ou acesse com e-mail e senha
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* Mode Tabs (Entrar / Criar Conta) */}
        {authMode !== 'forgot' && (
          <div className="flex bg-[#0b0d14] p-1.5 rounded-2xl border border-white/10 relative z-10">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                authMode === 'signin'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn size={15} />
              <span>Já possuo Conta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={15} />
              <span>Cadastrar Novo Usuário</span>
            </button>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10">
          {/* Role selection on Signup */}
          {authMode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Deseja se cadastrar como:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSignUpRole('aluno')}
                  className={`p-3 rounded-xl border text-left transition ${
                    signUpRole === 'aluno'
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" /> Aluno
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Acesso aos cursos e partituras</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSignUpRole('professor')}
                  className={`p-3 rounded-xl border text-left transition ${
                    signUpRole === 'professor'
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Professor
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Requer aprovação da coordenação</div>
                </button>
              </div>
            </div>
          )}

          {/* Nome Completo (apenas no cadastro) */}
          {authMode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Carlos Drumond"
                  required
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner"
                />
              </div>
            </div>
          )}

          {/* E-mail */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Endereço de E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
                required
                className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Senha */}
          {authMode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-semibold"
                  >
                    Esqueceu sua senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Feedback de Erro */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in shake duration-300">
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Feedback de Sucesso */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-300">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl font-serif font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"></span>
                <span>Processando...</span>
              </span>
            ) : authMode === 'signin' ? (
              <span className="flex items-center gap-2">
                <span>Entrar na Plataforma Tutti</span>
                <ArrowRight size={17} />
              </span>
            ) : authMode === 'signup' ? (
              <span className="flex items-center gap-2">
                <span>{signUpRole === 'professor' ? 'Solicitar Acesso Docente' : 'Concluir Cadastro de Aluno'}</span>
                <ArrowRight size={17} />
              </span>
            ) : (
              <span>Enviar Link de Recuperação</span>
            )}
          </button>

          {/* Voltar para login no modo esqueci a senha */}
          {authMode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Voltar para a tela de login</span>
            </button>
          )}
        </form>

        {/* Separador e Login com Google */}
        {authMode !== 'forgot' && (
          <div className="space-y-4 pt-2 relative z-10 border-t border-white/10">
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-md transition-all flex items-center justify-center gap-3 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.15C3.31 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.31 2.64 1.27 6.61l4 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>Entrar com Conta Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
