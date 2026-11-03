import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import { Lock, LogIn, ShieldAlert, Clock, ArrowRight, UserCheck } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  routeName?: string;
  isActive?: boolean;
  requiredRole?: 'desenvolvedor' | 'professor' | 'aluno';
  allowedRoles?: ('desenvolvedor' | 'professor' | 'aluno')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  routeName = 'esta área restrita',
  isActive = true,
  requiredRole,
  allowedRoles
}) => {
  const { user, profile, loading, logout } = useAuth();
  const { currentPath, navigate, showToast } = useAppRouter();

  useEffect(() => {
    // Only redirect if this protected route is currently active, loading finished, and user is unauthenticated
    if (isActive && !loading && !user) {
      navigate('/auth', { redirectTo: currentPath });
    }
  }, [isActive, loading, user, currentPath]);

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
            Validando sua sessão e permissões com o Supabase Auth.
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
            Acesso Restrito
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Para acessar {routeName}, faça login com suas credenciais cadastradas no Tutti Escola de Música.
          </p>
        </div>
        <button
          onClick={() => navigate('/auth', { redirectTo: currentPath })}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-syne font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xl cursor-pointer"
        >
          <LogIn size={16} />
          <span>Fazer Login / Criar Conta</span>
        </button>
      </div>
    );
  }

  const currentRole = profile?.role || 'aluno';
  const approvalStatus = profile?.approvalStatus || 'aprovado';

  // 3. Role Validation: Developer Protected Route
  if (requiredRole === 'desenvolvedor' || (allowedRoles && allowedRoles.includes('desenvolvedor') && !allowedRoles.includes(currentRole))) {
    if (currentRole !== 'desenvolvedor') {
      return (
        <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in duration-300 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl">
            <ShieldAlert size={30} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-syne font-black text-white">
              Acesso Não Autorizado
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O Painel do Desenvolvedor é restrito ao administrador técnico autorizado da Tutti Escola de Música. Sua conta atual ({user.email}) não possui privilégios de desenvolvedor.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(currentRole === 'professor' ? '/professor' : '/aluno')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-2"
            >
              <span>Ir para meu ambiente ({currentRole})</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      );
    }
  }

  // 4. Role Validation: Teacher Protected Route
  if (requiredRole === 'professor') {
    // Developers have administrative access to teacher views
    if (currentRole !== 'professor' && currentRole !== 'desenvolvedor') {
      return (
        <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in duration-300 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
            <UserCheck size={30} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-syne font-black text-white">
              Ambiente Restrito a Professores
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Esta área é destinada exclusivamente ao corpo docente credenciado da Tutti.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/aluno')}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition"
            >
              Ir para Área do Aluno
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition"
            >
              Solicitar Acesso como Professor
            </button>
          </div>
        </div>
      );
    }

    // Teacher Pending Approval Status Check (Mandatory Exact Phrase)
    if (currentRole === 'professor' && approvalStatus === 'pendente') {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-300">
          <div className="bg-[#131722] border-2 border-amber-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-inner animate-pulse">
              <Clock size={36} />
            </div>

            <div className="space-y-3">
              <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30 inline-block">
                Solicitação em Análise
              </span>

              {/* MANDATORY EXACT WORDING REQUIRED BY SPECIFICATION */}
              <div className="p-5 rounded-2xl bg-[#0b0d14] border border-amber-500/30 text-amber-200 font-syne font-bold text-sm sm:text-base leading-relaxed">
                &ldquo;Perfil em análise, aguarde! Utilize a sua conta como aluno até a sua aprovação. Grato!&rdquo;
              </div>

              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed pt-2">
                Sua solicitação de acesso como Professor está registrada e aguarda aprovação da coordenação e do desenvolvedor da Tutti. Enquanto isso, aproveite as partituras, aulas e estúdio virtual na sua conta de aluno.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => navigate('/aluno')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-syne font-bold text-xs shadow-lg transition"
              >
                Continuar como Aluno
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/auth');
                  showToast('Sessão encerrada com sucesso.');
                }}
                className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition"
              >
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Teacher Rejected Status Check
    if (currentRole === 'professor' && approvalStatus === 'rejeitado') {
      return (
        <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-300">
          <div className="bg-[#131722] border-2 border-rose-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto text-2xl">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-syne font-black text-white">Solicitação de Docência Não Aprovada</h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Sua solicitação de credenciamento não foi aprovada pelo corpo diretivo. Sua conta permanece ativa com acesso total aos conteúdos como Aluno.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => navigate('/aluno')} className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs">
                Acessar Área do Aluno
              </button>
              <button onClick={async () => { await logout(); navigate('/auth'); }} className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs">
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 5. Authenticated & Authorized: render the protected page
  return <>{children}</>;
};
