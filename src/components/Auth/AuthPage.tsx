import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, LogIn, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';

export const AuthPage: React.FC = () => {
  const { user, loading, loginWithEmail, signUpWithEmail, resetPassword, loginWithGoogle } = useAuth();
  const { queryParams, navigate, showToast } = useAppRouter();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const destination = queryParams.redirectTo || '/perfil';

  // If user is already authenticated, redirect to destination
  useEffect(() => {
    if (!loading && user) {
      navigate(destination);
    }
  }, [loading, user, destination, navigate]);

  const translateAuthError = (err: any): string => {
    const msg = err?.message || err?.error_description || String(err || '');
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'E-mail ou senha incorretos. Verifique os dados digitados.';
    }
    if (msg.includes('User already registered') || msg.includes('already registered')) {
      return 'Este e-mail já possui cadastro. Faça login ou solicite recuperação de senha.';
    }
    if (msg.includes('Password should be at least 6 characters')) {
      return 'A senha precisa ter no mínimo 6 caracteres.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique o link enviado para sua caixa de entrada.';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return 'Falha de conexão com o Supabase. Verifique sua conexão com a internet.';
    }
    return msg || 'Ocorreu um erro na autenticação.';
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
        const { error } = await loginWithEmail(cleanEmail, password);
        if (error) throw error;
        showToast('Login realizado com sucesso! Bem-vindo(a) de volta ♪');
        navigate(destination);
      } else if (authMode === 'signup') {
        const cleanName = displayName.trim() || 'Músico Tutti';
        const { error } = await signUpWithEmail(cleanEmail, password, cleanName);
        if (error) throw error;
        setSuccessMsg('Cadastro realizado com sucesso no Supabase! Acesse sua conta.');
        showToast('Conta criada com sucesso! 🎶');
        navigate(destination);
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

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-12 px-4 animate-in fade-in duration-300">
      <div className="bg-[#131722] border border-amber-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative space-y-8 backdrop-blur-xl">
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
            <h1 className="text-2xl sm:text-3xl font-syne font-black text-white tracking-tight">
              {authMode === 'signin' && 'Entrar na Tutti Escola de Música'}
              {authMode === 'signup' && 'Criar sua Conta de Aluno'}
              {authMode === 'forgot' && 'Recuperar Senha de Acesso'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {queryParams.redirectTo ? (
                <span className="text-amber-400 font-semibold">
                  Faça login para continuar para a sua página solicitada.
                </span>
              ) : (
                'Estudo de saxofone, flauta, teoria e harmonia com o Maestro Lucas.'
              )}
            </p>
          </div>
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
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-lg shadow-cyan-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn size={15} />
              <span>Já sou Aluno (Entrar)</span>
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
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-lg shadow-cyan-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={15} />
              <span>Criar Nova Conta</span>
            </button>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10">
          {/* Nome Completo (apenas no cadastro) */}
          {authMode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Nome Completo ou Artístico
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Rafael Drumond"
                  required
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-cyan-400 transition-colors shadow-inner"
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
                placeholder="aluno@tutti.mus.br"
                required
                className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-none focus:border-cyan-400 transition-colors shadow-inner"
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
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer font-semibold"
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
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-xs sm:text-sm outline-none focus:border-cyan-400 transition-colors shadow-inner font-mono"
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
            className="w-full py-3.5 rounded-2xl font-syne font-black text-sm bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-600 text-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 glow cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"></span>
                <span>Processando no Supabase...</span>
              </span>
            ) : authMode === 'signin' ? (
              <span className="flex items-center gap-2">
                <span>Entrar na Plataforma</span>
                <ArrowRight size={17} />
              </span>
            ) : authMode === 'signup' ? (
              <span className="flex items-center gap-2">
                <span>Concluir Cadastro</span>
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
            <div className="text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Ou continue com
              </span>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl font-syne font-bold text-xs sm:text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-md transition-all flex items-center justify-center gap-3 active:scale-98 disabled:opacity-50 cursor-pointer"
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
