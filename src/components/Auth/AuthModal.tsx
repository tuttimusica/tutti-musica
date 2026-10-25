import React, { useState } from 'react';
import { X, LogIn, LogOut, CheckCircle2, Sparkles, Shield, User, Database, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, projectId, loginWithGoogle, loginWithEmail, signUpWithEmail, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.warn('Login error:', err);
      setErrorMsg(err?.message || 'Não foi possível autenticar com o Google. Tente com email e senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Preencha seu e-mail e senha.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'signin') {
        const { error } = await loginWithEmail(email, password);
        if (error) throw error;
        onClose();
      } else {
        const { error } = await signUpWithEmail(email, password, displayName || 'Músico Tutti');
        if (error) throw error;
        setSuccessMsg('Conta criada com sucesso no Supabase! Verifique seu e-mail se a confirmação estiver ativada.');
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar autenticação no Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
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
                  className="w-24 h-24 rounded-full border-2 border-cyan-400 mx-auto shadow-xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-600 flex items-center justify-center text-black font-syne font-black text-2xl mx-auto shadow-xl">
                  {profile?.displayName?.slice(0, 2).toUpperCase() || 'TT'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-400 border-2 border-[#131722] flex items-center justify-center text-black text-[10px] font-bold">
                ✓
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-syne font-black text-2xl text-white">
                  {profile?.displayName || user.email?.split('@')[0] || 'Músico Tutti'}
                </h3>
                {profile?.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{user.email}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 mt-1">
                <Database size={12} /> Supabase ({projectId}) Conectado
              </div>
            </div>

            <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xl font-syne font-black text-cyan-400">{profile?.xp || 0}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">XP no Supabase</div>
              </div>
              <div>
                <div className="text-xl font-syne font-black text-emerald-400">{profile?.streakDays || 0} dias</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Ofensiva Salva</div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-white/10"
            >
              <LogOut size={16} /> Encerrar Sessão
            </button>
          </div>
        ) : (
          // Unauthenticated State
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-violet-600 flex items-center justify-center text-black font-syne font-black text-xl mx-auto shadow-xl shadow-cyan-500/20 glow">
                ♪
              </div>
              <h3 className="font-syne font-black text-2xl text-white">
                Entrar no Tutti ♪
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                <Database size={11} /> Backend Supabase: {projectId}
              </div>
            </div>

            {/* Sign in / Sign up Mode tabs */}
            <div className="flex bg-[#0b0d14] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  authMode === 'signin' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  authMode === 'signup' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Rafael Drumond"
                      className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aluno@tutti.mus.br"
                    required
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl font-syne font-bold text-xs bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg glow"
              >
                {isSubmitting ? 'Processando...' : authMode === 'signin' ? 'Entrar com E-mail' : 'Cadastrar no Supabase'}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full"></div>
              <span className="bg-[#131722] px-3 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                ou
              </span>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-syne font-bold text-xs bg-white hover:bg-slate-100 text-slate-900 shadow-md transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50"
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
          </div>
        )}
      </div>
    </div>
  );
};
