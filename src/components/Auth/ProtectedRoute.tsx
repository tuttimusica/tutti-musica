import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { Lock, LogIn, Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  routeName?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, routeName = 'esta área restrita' }) => {
  const { user, loading } = useAuth();
  const { currentPath, navigate } = useAppRouter();

  useEffect(() => {
    // If not loading and no user authenticated, redirect to /auth preserving destination
    if (!loading && !user) {
      navigate('/auth', { redirectTo: currentPath });
    }
  }, [loading, user, currentPath, navigate]);

  // 1. Loading state: checking Supabase session
  if (loading) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in duration-300">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-amber-300 font-syne font-black text-xl">
            ♪
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="font-syne font-bold text-lg text-white">
            Verificando autenticação segura...
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Validando sua sessão de aluno com o Supabase Auth.
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: safety fallback while redirection executes
  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl">
          <Lock size={28} />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-syne font-black text-white">
            Acesso Restrito a Alunos
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Para acessar {routeName}, faça login com seu e-mail e senha cadastrados no Tutti Escola de Música.
          </p>
        </div>
        <button
          onClick={() => navigate('/auth', { redirectTo: currentPath })}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-600 text-black font-syne font-black text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xl glow cursor-pointer"
        >
          <LogIn size={16} />
          <span>Fazer Login / Criar Conta</span>
        </button>
      </div>
    );
  }

  // 3. Authenticated: render the protected page
  return <>{children}</>;
};
