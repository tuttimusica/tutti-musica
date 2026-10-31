import React, { useState } from 'react';
import {
  X,
  LogOut,
  Mail,
  Lock,
  User,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Music,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    profile,
    projectId,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    loginAsRole,
    resetPassword,
    logout
  } = useAuth();
  const { navigate, showToast } = useAppRouter();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signUpRole, setSignUpRole] = useState<'aluno' | 'professor'>('aluno');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const translateAuthError = (err: any): string => {
    const msg = err?.message || err?.error_description || String(err || '');
    if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
      return 'O provedor Google ainda não foi ativado no painel do Supabase. Utilize o login com E-mail e Senha abaixo.';
    }
    if (msg.includes('requested path is invalid') || msg.includes('Invalid path') || msg.includes('PGRST125') || msg.includes('PGRST126')) {
      return 'Atenção: Acesso direto por esta interface.';
    }
    if (msg.includes('email_address_invalid') || msg.includes('is invalid')) {
      return 'Por favor, informe um endereço de e-mail válido.';
    }
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('User already registered') || msg.includes('already registered')) {
      return 'Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.';
    }
    if (msg.includes('Password should be at least 6 characters')) {
      return 'A senha precisa ter pelo menos 6 caracteres.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return 'Erro de conexão com o Supabase. Verifique sua internet.';
    }
    return msg || 'Ocorreu um erro na autenticação.';
  };

  const routeByRole = (role?: string) => {
    if (role === 'desenvolvedor' || role === 'admin') return '/admin';
    if (role === 'professor') return '/professor';
    return '/aluno';
  };

  const handleRoleSelect = async (role: 'desenvolvedor' | 'professor' | 'aluno') => {
    setIsSubmitting(true);
    try {
      await loginAsRole(role, 'aprovado');
      onClose();
      showToast(`Conectado com perfil: ${role.toUpperCase()}!`);
      navigate(routeByRole(role));
    } catch (err: any) {
      setErrorMsg('Erro ao alternar perfil: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.warn('Login error:', err);
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Informe o seu e-mail.');
      return;
    }

    if (authMode !== 'forgot' && !password) {
      setErrorMsg('Digite sua senha.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'signin') {
        const { error } = await loginWithEmail(email, password);
        if (error) throw error;
        setSuccessMsg('Login efetuado com sucesso!');
        setTimeout(() => {
          onClose();
          navigate(routeByRole(profile?.role));
        }, 500);
      } else if (authMode === 'signup') {
        const res = await signUpWithEmail(email, password, displayName || 'Músico Tutti', signUpRole);
        if (res.error) throw res.error;
        if (res.data?.session) {
          setSuccessMsg('Conta criada e autenticada com sucesso! Bem-vindo(a) ♪');
          setTimeout(() => {
            onClose();
            navigate(routeByRole(signUpRole));
          }, 600);
        } else {
          setSuccessMsg('Conta criada no Supabase! Verifique seu e-mail para ativar seu acesso.');
        }
      } else if (authMode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccessMsg('Instruções de redefinição de senha enviadas para o seu e-mail!');
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onClose();
    navigate('/auth');
    showToast('Sessão encerrada com sucesso. Voltando para login.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#11141d] border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative space-y-6 modal-dark max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {user ? (
          // Signed-in State
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              {profile?.photoURL || user.user_metadata?.avatar_url ? (
                <img
                  src={profile?.photoURL || user.user_metadata?.avatar_url}
                  alt={profile?.displayName || 'Avatar'}
                  className="w-20 h-20 rounded-full border-2 border-amber-400 mx-auto shadow-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-serif font-bold text-2xl mx-auto shadow-xl">
                  {profile?.displayName?.slice(0, 2).toUpperCase() || 'TT'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-400 border-2 border-[#11141d] flex items-center justify-center text-black text-[10px] font-bold">
                ✓
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif font-bold text-xl text-white">
                {profile?.displayName || user.email}
              </h3>
              <p className="text-xs text-slate-400">{user.email}</p>
              <div className="pt-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block">
                  Perfil: {profile?.role || 'aluno'}
                </span>
              </div>
            </div>

            {/* Quick Navigation to specific panel */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <button
                onClick={() => {
                  onClose();
                  navigate(routeByRole(profile?.role));
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Meu Painel ({profile?.role})</span>
                <ChevronRight size={15} />
              </button>

              <div className="text-[11px] text-slate-400 pt-1">
                Trocar de perfil imediatamente:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRoleSelect('desenvolvedor')}
                  className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-[10px] text-amber-300 border border-white/10 hover:border-amber-500/30 transition"
                >
                  Dev
                </button>
                <button
                  onClick={() => handleRoleSelect('professor')}
                  className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[10px] text-emerald-300 border border-white/10 hover:border-emerald-500/30 transition"
                >
                  Professor
                </button>
                <button
                  onClick={() => handleRoleSelect('aluno')}
                  className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-[10px] text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition"
                >
                  Aluno
                </button>
              </div>
            </div>

            {/* Sign Out Button (Returns directly to /auth) */}
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sair da Conta (Voltar para o Login)</span>
            </button>
          </div>
        ) : (
          // Signed-out State
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-bold">
                Tutti Escola de Música
              </span>
              <h3 className="font-serif font-bold text-xl text-white">
                Entrar na Plataforma
              </h3>
              <p className="text-xs text-slate-400">
                Selecione seu tipo de acesso ou entre com suas credenciais.
              </p>
            </div>

            {/* Direct 3-Role Entry Selection */}
            <div className="p-3.5 rounded-2xl bg-[#0b0e15] border border-amber-500/20 space-y-2.5">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Entrar Diretamente Como:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRoleSelect('desenvolvedor')}
                  className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex flex-col items-center gap-1.5 transition text-center"
                >
                  <ShieldCheck size={18} />
                  <span>Dev / Admin</span>
                </button>
                <button
                  onClick={() => handleRoleSelect('professor')}
                  className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex flex-col items-center gap-1.5 transition text-center"
                >
                  <GraduationCap size={18} />
                  <span>Professor</span>
                </button>
                <button
                  onClick={() => handleRoleSelect('aluno')}
                  className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex flex-col items-center gap-1.5 transition text-center"
                >
                  <Music size={18} />
                  <span>Aluno</span>
                </button>
              </div>
            </div>

            {/* Tab switch */}
            {authMode !== 'forgot' && (
              <div className="flex bg-[#0b0d14] p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'signin'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'signup'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cadastre-se
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'signup' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase">Perfil Desejado</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignUpRole('aluno')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold ${
                          signUpRole === 'aluno'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        Aluno
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignUpRole('professor')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold ${
                          signUpRole === 'professor'
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        Professor
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <User size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#0b0d14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#0b0d14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {authMode !== 'forgot' && (
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Sua senha (mínimo 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-[#0b0d14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="text-xs text-rose-300 bg-rose-500/15 p-2.5 rounded-xl border border-rose-500/30 flex items-start gap-2">
                  <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="text-xs text-emerald-300 bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/30 flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-serif font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Processando...'
                  : authMode === 'signin'
                  ? 'Entrar na Plataforma'
                  : authMode === 'signup'
                  ? 'Concluir Cadastro'
                  : 'Enviar E-mail de Recuperação'}
              </button>

              {authMode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="w-full py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Voltar para o Login
                </button>
              )}
            </form>

            {authMode !== 'forgot' && (
              <>
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/10 w-full"></div>
                  <span className="bg-[#11141d] px-3 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    ou
                  </span>
                </div>

                {/* Google OAuth Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-900 shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer"
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
                  <span>Continuar com Google</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
