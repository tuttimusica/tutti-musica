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
  GraduationCap,
  Music,
  LogOut,
  ChevronRight,
  Clock,
  Shield,
  FileText,
  X,
  HelpCircle,
  AlertTriangle
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
    logout
  } = useAuth();
  const { queryParams, navigate, showToast } = useAppRouter();

  // Active view: 'signin' | 'signup_aluno' | 'teacher_flow' | 'forgot'
  const [authMode, setAuthMode] = useState<'signin' | 'signup_aluno' | 'teacher_flow' | 'forgot'>('signin');
  
  // Teacher sub-view: 'login' | 'register'
  const [teacherSubMode, setTeacherSubMode] = useState<'login' | 'register'>('register');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [instrumento, setInstrumento] = useState('Saxofone Alto');
  const [outroInstrumento, setOutroInstrumento] = useState('');
  const [bio, setBio] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [oauthDiagnosticInfo, setOauthDiagnosticInfo] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingTeacherNotice, setPendingTeacherNotice] = useState(false);
  
  // Terms & Privacy Modals
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const routeByRole = (role?: string) => {
    if (role === 'desenvolvedor' || role === 'admin') return '/admin';
    if (role === 'professor') return '/professor';
    return '/aluno';
  };

  // Inspect URL parameters and Hash on component mount for OAuth errors or callbacks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Check URL query string
      const searchParams = new URLSearchParams(window.location.search);
      const searchError = searchParams.get('error');
      const searchErrorDesc = searchParams.get('error_description');

      // 2. Check URL hash (Supabase Auth returns errors and tokens in hash)
      let hashError: string | null = null;
      let hashErrorDesc: string | null = null;
      if (window.location.hash && window.location.hash.includes('error=')) {
        const hashString = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hashString);
        hashError = hashParams.get('error');
        hashErrorDesc = hashParams.get('error_description');
      }

      const rawError = searchError || hashError;
      const rawDesc = searchErrorDesc || hashErrorDesc;

      if (rawError || rawDesc) {
        const combined = `${rawError || ''}: ${rawDesc || ''}`.toLowerCase();
        
        if (combined.includes('deleted_client') || combined.includes('client was deleted')) {
          setOauthDiagnosticInfo(
            'O Cliente OAuth do Google configurado no provedor Supabase foi excluído ou desativado no Google Cloud Console (Erro 401: deleted_client). É necessário criar um novo Client ID e atualizar as credenciais no painel do Supabase.'
          );
          setErrorMsg('O login com Google está temporariamente indisponível devido a credenciais desatualizadas no servidor. Por favor, utilize seu E-mail e Senha abaixo.');
        } else if (combined.includes('access_denied')) {
          setErrorMsg('A autenticação com o Google foi cancelada por você.');
        } else if (combined.includes('unsupported_provider') || combined.includes('provider is not enabled')) {
          setErrorMsg('O provedor Google ainda não está habilitado no painel do Supabase. Utilize o login convencional.');
        } else if (combined.includes('redirect_uri_mismatch')) {
          setOauthDiagnosticInfo(
            'A URL de redirecionamento autorizada não coincide com a cadastrada no Google Cloud Console. A URL obrigatória é: https://viwxalwpvuvgcyxsdjbi.supabase.co/auth/v1/callback'
          );
          setErrorMsg('Erro de configuração de URL no Google OAuth.');
        } else {
          setErrorMsg(rawDesc || rawError || 'Falha na autenticação via Google.');
        }

        // Clean up hash to prevent stale errors on page refresh
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.debug('OAuth URL inspection notice:', e);
    }
  }, []);

  // When user is already authenticated or becomes authenticated via OAuth on /auth, redirect seamlessly
  useEffect(() => {
    if (!loading && user) {
      const dest = queryParams.redirectTo || routeByRole(profile?.role);
      // Small timeout to allow state to settle
      const timer = setTimeout(() => {
        showToast('Login realizado com sucesso! Bem-vindo(a) à Tutti ♪');
        navigate(dest);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [user, loading, profile?.role, queryParams.redirectTo, navigate, showToast]);

  // Translate Supabase and OAuth errors to Portuguese
  const translateAuthError = (err: any): string => {
    const msg = err?.message || err?.error_description || String(err || '');
    if (msg.includes('deleted_client') || msg.includes('client was deleted')) {
      setOauthDiagnosticInfo(
        'O Client ID do Google configurado no Supabase não existe mais no Google Cloud. O administrador precisa gerar um novo Client ID e atualizar o Supabase.'
      );
      return 'O provedor Google OAuth está com credenciais excluídas no Google Cloud (Erro 401: deleted_client). Por favor, use login com E-mail e Senha.';
    }
    if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
      return 'O provedor Google OAuth está sendo ativado no painel do Supabase. Por favor, utilize o login com E-mail e Senha.';
    }
    if (msg.includes('email_address_invalid') || msg.includes('is invalid')) {
      return 'Por favor, informe um endereço de e-mail com formato válido (ex: seu-nome@exemplo.com).';
    }
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'E-mail ou senha incorretos. Verifique os dados digitados ou crie uma conta.';
    }
    if (msg.includes('User already registered') || msg.includes('already registered')) {
      return 'Este e-mail já está cadastrado. Faça login ou utilize a recuperação de senha.';
    }
    if (msg.includes('Password should be at least 6 characters')) {
      return 'A senha precisa ter no mínimo 6 caracteres.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique a caixa de entrada do seu provedor de e-mail.';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return 'Falha de comunicação com o servidor de autenticação. Verifique sua conexão com a internet.';
    }
    return msg || 'Ocorreu uma falha no processamento da autenticação. Tente novamente.';
  };

  // Reset errors when changing modes
  const switchMode = (mode: 'signin' | 'signup_aluno' | 'teacher_flow' | 'forgot') => {
    setAuthMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPendingTeacherNotice(false);
  };

  // 1. Submit Login (Email + Senha)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Informe o seu endereço de e-mail.');
      return;
    }
    if (!password) {
      setErrorMsg('Informe sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error, data } = await loginWithEmail(cleanEmail, password);
      if (error) throw error;

      showToast('Login realizado com sucesso! Bem-vindo(a) à Tutti ♪');

      const userRole = profile?.role || data?.user?.user_metadata?.role;
      const targetPath = routeByRole(userRole);
      navigate(queryParams.redirectTo || targetPath);
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Aluno Signup
  const handleAlunoSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setErrorMsg('Informe o seu nome completo.');
      return;
    }
    if (!cleanEmail) {
      setErrorMsg('Informe o seu endereço de e-mail.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Você precisa concordar com os Termos de Uso e Política de Privacidade para criar sua conta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUpWithEmail(cleanEmail, password, cleanName, 'aluno');
      if (res.error) throw res.error;

      showToast('Conta de aluno criada com sucesso! 🎶');

      if (res.data?.session) {
        navigate('/aluno');
      } else {
        setSuccessMsg('Cadastro realizado com sucesso! Verifique a mensagem de confirmação enviada para o seu e-mail.');
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Teacher Request
  const handleTeacherSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanName = displayName.trim();
    const finalInstrumento = instrumento === 'Outro' ? outroInstrumento.trim() : instrumento;

    if (!cleanName) {
      setErrorMsg('Informe o seu nome completo.');
      return;
    }
    if (!cleanEmail) {
      setErrorMsg('Informe o seu endereço de e-mail profissional.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }
    if (!finalInstrumento) {
      setErrorMsg('Informe o(s) instrumento(s) que você leciona.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Você precisa aceitar os termos de credenciamento docente para enviar sua solicitação.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUpWithEmail(cleanEmail, password, cleanName, 'professor', {
        instrumento: finalInstrumento,
        bio: bio.trim() || 'Docente musical solicitando credenciamento.'
      });
      if (res.error) throw res.error;

      setPendingTeacherNotice(true);
      showToast('Solicitação de credenciamento enviada!');
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Submit Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Informe o endereço de e-mail cadastrado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await resetPassword(cleanEmail);
      if (error) throw error;
      setSuccessMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada e pasta de spam.');
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setOauthDiagnosticInfo(null);
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
      setIsSubmitting(false);
    }
  };

  // 6. Sign Out
  const handleLogout = async () => {
    await logout();
    showToast('Sessão encerrada com sucesso.');
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-4 animate-in fade-in duration-300">
      <div className="bg-[#11141d] border border-amber-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative space-y-8 backdrop-blur-xl">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="text-center space-y-3 relative z-10">
          <div
            className="w-20 h-20 mx-auto rounded-full overflow-hidden p-1 bg-gradient-to-tr from-amber-400 via-amber-600 to-yellow-500 shadow-xl shadow-amber-500/15 cursor-pointer"
            onClick={() => navigate('/')}
          >
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
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Acesse seus cursos, partituras exclusivas, estúdio interativo e agendamento de aulas.
            </p>
          </div>
        </div>

        {/* Diagnostic Banner if Google OAuth Error 401: deleted_client is detected */}
        {oauthDiagnosticInfo && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 relative z-10 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle size={16} />
              <span>Diagnóstico de Autenticação Google (Erro 401: deleted_client)</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              {oauthDiagnosticInfo}
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-white/10 flex items-center justify-between">
              <span>Alternativa imediata: Utilize seu <strong>E-mail e Senha</strong> abaixo para entrar.</span>
              <button
                type="button"
                onClick={() => setOauthDiagnosticInfo(null)}
                className="text-amber-400 hover:text-white transition font-semibold"
              >
                Dispensar aviso
              </button>
            </div>
          </div>
        )}

        {/* Current Active Session Banner (if already logged in) */}
        {user && (
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300">
                {profile?.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-xs text-slate-400">Você está conectado como:</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{profile?.displayName || user.email}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {profile?.role === 'desenvolvedor' ? 'Desenvolvedor' : profile?.role === 'professor' ? 'Professor' : 'Aluno'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(routeByRole(profile?.role))}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Ir para Meu Painel</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Sair desta conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs (Only when not viewing teacher pending notice) */}
        {!pendingTeacherNotice && authMode !== 'forgot' && (
          <div className="flex bg-[#0b0d14] p-1.5 rounded-2xl border border-white/10 relative z-10">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signin'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn size={14} />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup_aluno')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signup_aluno'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music size={14} />
              <span>Criar Conta de Aluno</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('teacher_flow')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'teacher_flow'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap size={14} />
              <span>Sou Professor</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: SIGN IN (EMAIL + SENHA + GOOGLE) */}
        {/* ======================================================== */}
        {authMode === 'signin' && !pendingTeacherNotice && (
          <div className="space-y-5 relative z-10">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-semibold"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
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

              {/* Feedback de Erro */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in shake duration-300">
                  <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
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
                    <span>Autenticando...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Entrar na Plataforma Tutti</span>
                    <ArrowRight size={17} />
                  </span>
                )}
              </button>
            </form>

            {/* Separador Google */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-xs font-mono uppercase text-slate-400">
                Ou acesse com Google
              </span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

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
              <span>Continuar com Conta Google</span>
            </button>

            {/* Quick footer switchers */}
            <div className="pt-2 text-center space-y-1.5 text-xs text-slate-400">
              <p>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup_aluno')}
                  className="text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer"
                >
                  Cadastre-se como Aluno
                </button>
              </p>
              <p>
                É docente musical?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('teacher_flow')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold transition cursor-pointer"
                >
                  Solicite credenciamento como Professor
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CADASTRO DE ALUNO */}
        {/* ======================================================== */}
        {authMode === 'signup_aluno' && !pendingTeacherNotice && (
          <div className="space-y-5 relative z-10">
            <form onSubmit={handleAlunoSignupSubmit} className="space-y-4">
              {/* Nome Completo */}
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
                    placeholder="Ex: Carlos Drumond de Andrade"
                    required
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner"
                  />
                </div>
              </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Senha (mínimo 6 dígitos)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Termos de uso checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-[#0b0d14] text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
                  />
                  <span>
                    Concordo com os{' '}
                    <button
                      type="button"
                      onClick={() => setActiveLegalModal('terms')}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Termos de Uso
                    </button>{' '}
                    e a{' '}
                    <button
                      type="button"
                      onClick={() => setActiveLegalModal('privacy')}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Política de Privacidade
                    </button>{' '}
                    da Tutti Escola de Música.
                  </span>
                </label>
              </div>

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

              {/* Botão de Conclusão */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl font-serif font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"></span>
                    <span>Criando conta de aluno...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Concluir Cadastro de Aluno</span>
                    <ArrowRight size={17} />
                  </span>
                )}
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-slate-400">
              Já possui uma conta cadastrada?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer"
              >
                Fazer login agora
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: ÁREA DO PROFESSOR (LOGIN OU SOLICITAÇÃO) */}
        {/* ======================================================== */}
        {authMode === 'teacher_flow' && !pendingTeacherNotice && (
          <div className="space-y-5 relative z-10">
            {/* Sub-Switch: Já sou professor vs Quero solicitar acesso */}
            <div className="flex bg-[#0b0e15] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setTeacherSubMode('register');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  teacherSubMode === 'register'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Novo Professor (Solicitar Acesso)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeacherSubMode('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  teacherSubMode === 'login'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Já Sou Professor (Login)
              </button>
            </div>

            {teacherSubMode === 'login' ? (
              // Teacher direct login form
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 flex-shrink-0" />
                  <span>Acesso restrito ao corpo docente já credenciado e aprovado.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    E-mail do Docente
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="professor@tutti.mus.br"
                      required
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-emerald-400 transition-colors shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Senha Docente
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer font-semibold"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm outline-none focus:border-emerald-400 transition-colors shadow-inner font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl font-serif font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Verificando...' : 'Entrar no Painel do Professor'}
                </button>
              </form>
            ) : (
              // Teacher Registration / Request Form
              <form onSubmit={handleTeacherSignupSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-[#0b0e15] border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Após o cadastro, sua solicitação de credenciamento passará por validação da coordenação pedagógica. Você poderá usar sua conta como aluno enquanto aguarda a aprovação.
                  </span>
                </div>

                {/* Nome Completo */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Nome Completo do Docente
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Profª Clara Vasconcelos"
                      required
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    E-mail Profissional
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="prof.clara@exemplo.com"
                      required
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner"
                    />
                  </div>
                </div>

                {/* Instrumento(s) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Instrumento Principal / Área de Docência
                  </label>
                  <select
                    value={instrumento}
                    onChange={(e) => setInstrumento(e.target.value)}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner cursor-pointer"
                  >
                    <option value="Saxofone Alto">Saxofone Alto</option>
                    <option value="Saxofone Tenor">Saxofone Tenor</option>
                    <option value="Saxofone Soprano">Saxofone Soprano</option>
                    <option value="Clarinete">Clarinete</option>
                    <option value="Flauta Transversal">Flauta Transversal</option>
                    <option value="Trompete">Trompete</option>
                    <option value="Trombone">Trombone</option>
                    <option value="Violão & Guitarra">Violão & Guitarra</option>
                    <option value="Piano & Teclado">Piano & Teclado</option>
                    <option value="Teoria & Percepção Musical">Teoria & Percepção Musical</option>
                    <option value="Outro">Outro instrumento / Especialidade</option>
                  </select>
                </div>

                {instrumento === 'Outro' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Especifique o Instrumento / Especialidade
                    </label>
                    <input
                      type="text"
                      value={outroInstrumento}
                      onChange={(e) => setOutroInstrumento(e.target.value)}
                      placeholder="Ex: Cello, Bateria, Harmonia Funcional..."
                      required
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner"
                    />
                  </div>
                )}

                {/* Breve biografia / currículo */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Breve Biografia / Experiência Musical
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Conte sobre sua formação, experiência com aulas e trajetória musical..."
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl p-3.5 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner resize-none"
                  ></textarea>
                </div>

                {/* Senha e Confirmação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Senha (mínimo 6 dígitos)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors shadow-inner font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Termos de docência checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 bg-[#0b0d14] text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
                    />
                    <span>
                      Declaro veracidade nas informações e aceito as diretrizes pedagógicas e os{' '}
                      <button
                        type="button"
                        onClick={() => setActiveLegalModal('terms')}
                        className="text-amber-400 hover:underline font-semibold"
                      >
                        Termos de Uso
                      </button>{' '}
                      da Tutti Escola de Música.
                    </span>
                  </label>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in shake duration-300">
                    <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl font-serif font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"></span>
                      <span>Registrando solicitação docente...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Enviar Solicitação de Credenciamento</span>
                      <ArrowRight size={17} />
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: PENDING TEACHER NOTICE (MANDATORY EXACT WORDING) */}
        {/* ======================================================== */}
        {pendingTeacherNotice && (
          <div className="space-y-6 relative z-10 py-4 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-inner animate-pulse">
              <Clock size={32} />
            </div>

            <div className="space-y-3">
              <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30 inline-block">
                Solicitação Recebida
              </span>

              {/* MANDATORY EXACT WORDING PRESCRIBED BY USER SPECIFICATION */}
              <div className="p-5 rounded-2xl bg-[#0b0d14] border border-amber-500/30 text-amber-200 font-serif font-bold text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                &ldquo;Perfil em análise, aguarde! Utilize a sua conta como aluno até a sua aprovação. Grato!&rdquo;
              </div>

              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed pt-1">
                Seus dados foram enviados para o painel de aprovação. Enquanto a equipe docente avalia seu credenciamento, você já pode explorar partituras, estúdios e recursos como aluno.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/aluno')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <span>Acessar Área do Aluno Agora</span>
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => setPendingTeacherNotice(false)}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition cursor-pointer"
              >
                Voltar à tela de login
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: FORGOT PASSWORD */}
        {/* ======================================================== */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4 relative z-10">
            <div className="space-y-1 text-center">
              <h3 className="font-serif font-bold text-lg text-white">Recuperação de Senha</h3>
              <p className="text-xs text-slate-400">
                Digite o e-mail cadastrado na Tutti para receber as instruções de redefinição.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                E-mail Cadastrado
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

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl font-serif font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando link...' : 'Enviar Link de Recuperação'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Voltar para a tela de login</span>
            </button>
          </form>
        )}

        {/* Bottom Footer: Voltar ao Início & Termos de Uso */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 relative z-10">
          <button
            onClick={() => navigate('/')}
            className="hover:text-amber-400 transition flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <ArrowLeft size={13} />
            <span>Voltar ao site Tutti (Página Inicial)</span>
          </button>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveLegalModal('terms')}
              className="hover:text-slate-200 transition underline underline-offset-2 cursor-pointer"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveLegalModal('privacy')}
              className="hover:text-slate-200 transition underline underline-offset-2 cursor-pointer"
            >
              Política de Privacidade
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LEGAL MODALS: TERMOS DE USO & POLÍTICA DE PRIVACIDADE */}
      {/* ======================================================== */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#11141d] border border-amber-500/30 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActiveLegalModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 text-amber-400">
              {activeLegalModal === 'terms' ? <FileText size={20} /> : <Shield size={20} />}
              <h3 className="font-serif font-bold text-lg text-white">
                {activeLegalModal === 'terms' ? 'Termos de Uso da Tutti Escola de Música' : 'Política de Privacidade & Proteção de Dados'}
              </h3>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed border-t border-white/10 pt-3">
              {activeLegalModal === 'terms' ? (
                <>
                  <p>
                    <strong>1. Objetivo da Plataforma:</strong> A Tutti Escola de Música oferece ambiente de aprendizagem musical digital, biblioteca de partituras, ferramentas de estúdio (metrônomo, afinador, sintetizador) e agendamento de aulas com professores credenciados.
                  </p>
                  <p>
                    <strong>2. Uso das Partituras e Materiais:</strong> Todas as partituras, exercícios e materiais pedagógicos disponíveis são destinados exclusivamente para o estudo individual e prática dos alunos matriculados, sendo vedada a comercialização não autorizada.
                  </p>
                  <p>
                    <strong>3. Credenciamento de Docentes:</strong> O cadastro de professores está sujeito à análise da coordenação pedagógica. A Tutti reserva-se o direito de aprovar, reprovar ou revogar o acesso docente mediante critérios de qualidade e compromisso pedagógico.
                  </p>
                  <p>
                    <strong>4. Conduta na Comunidade:</strong> É obrigatório manter o respeito mútuo nos murais e salas de aula virtuais. Conteúdos ofensivos ensejam cancelamento imediato de conta.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>1. Coleta e Uso de Informações:</strong> Coletamos apenas informações necessárias para a prestação dos serviços musicais (nome, e-mail, instrumento de estudo e registros de prática).
                  </p>
                  <p>
                    <strong>2. Autenticação Segura:</strong> As credenciais e sessões são protegidas pela infraestrutura de autenticação do Supabase, com suporte a criptografia padrão de mercado e conformidade com a LGPD.
                  </p>
                  <p>
                    <strong>3. Compartilhamento de Dados:</strong> A Tutti não comercializa dados pessoais com terceiros. As informações de agendamento são compartilhadas estritamente entre o aluno e o professor designado.
                  </p>
                  <p>
                    <strong>4. Seus Direitos:</strong> Você pode solicitar a exclusão ou alteração de seus dados pessoais a qualquer momento pelo suporte da Tutti ou no seu painel de perfil.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Entendi e Concordo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
