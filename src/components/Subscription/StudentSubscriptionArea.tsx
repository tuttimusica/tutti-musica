import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppRouter } from '../../context/RouterContext';
import {
  fetchUserActiveSubscription,
  fetchUserPaymentHistory,
  createStripeCustomerPortal,
  UserSubscriptionDetails,
  PaymentHistoryItem
} from '../../services/stripeService';
import {
  Crown,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Receipt,
  ShieldCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface StudentSubscriptionAreaProps {
  onOpenPlansModal: () => void;
}

export const StudentSubscriptionArea: React.FC<StudentSubscriptionAreaProps> = ({ onOpenPlansModal }) => {
  const { user } = useAuth();
  const { showToast } = useAppRouter();
  const [subscription, setSubscription] = useState<UserSubscriptionDetails | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [urlStatus, setUrlStatus] = useState<string | null>(null);
  const [isVerifyingWebhook, setIsVerifyingWebhook] = useState(false);

  // Analisar parâmetros de retorno da Stripe na URL (?status=success&session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status) {
      setUrlStatus(status);
      if (status === 'success') {
        setIsVerifyingWebhook(true);
      }
    }
  }, []);

  const loadSubscriptionData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const sub = await fetchUserActiveSubscription(user.id);
      const hist = await fetchUserPaymentHistory(user.id);
      setSubscription(sub);
      setPayments(hist);

      if (sub && sub.status === 'ativo') {
        setIsVerifyingWebhook(false);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de assinatura:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [user?.id]);

  // Se retornou com status=success mas o webhook ainda não processou, faz pooling a cada 3s (máx 5 vezes)
  useEffect(() => {
    if (!isVerifyingWebhook || !user?.id) return;
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      const sub = await fetchUserActiveSubscription(user.id);
      if (sub?.status === 'ativo' || count >= 5) {
        setSubscription(sub);
        setIsVerifyingWebhook(false);
        clearInterval(interval);
        if (sub?.status === 'ativo') {
          showToast('🎉 Pagamento confirmado pela Stripe! Sua assinatura Tutti está ativa.');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isVerifyingWebhook, user?.id]);

  const handleOpenCustomerPortal = async () => {
    try {
      setIsOpeningPortal(true);
      showToast('Abrindo Portal Seguro Stripe...');
      const { url } = await createStripeCustomerPortal();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      showToast(err.message || 'Não foi possível abrir o portal de faturamento.');
      setIsOpeningPortal(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Vitalício / Sem expiração';
    try {
      return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* BANNER DE RETORNO DO STRIPE CHECKOUT */}
      {urlStatus === 'success' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-start gap-3 shadow-lg">
          <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-syne font-bold text-white text-base">Sessão de Pagamento Concluída no Stripe!</h4>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              {isVerifyingWebhook ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={13} className="animate-spin text-emerald-400" />
                  Sincronizando confirmação do webhook com o banco de dados... Seu acesso será liberado em instantes.
                </span>
              ) : subscription?.status === 'ativo' ? (
                'Seu pagamento foi confirmado com sucesso e sua assinatura já está 100% ativa no backend.'
              ) : (
                'O comprovante foi enviado pela Stripe e está sendo registrado no sistema. Atualize a página se necessário.'
              )}
            </p>
          </div>
        </div>
      )}

      {urlStatus === 'cancelled' && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
            <span>Processo de checkout cancelado. Nenhuma cobrança foi efetuada no seu cartão.</span>
          </div>
          <button
            type="button"
            onClick={onOpenPlansModal}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Planos</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-syne font-black text-white flex items-center gap-2">
            <span>Minha Assinatura & Faturamento</span>
            <ShieldCheck size={22} className="text-emerald-400" />
          </h2>
          <p className="text-xs text-slate-400">
            Controle de plano, ciclo de vigência, recibos fiscais e cancelamento seguro via Stripe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSubscriptionData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#131722] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Atualizar status"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {subscription?.stripeCustomerId && (
            <button
              type="button"
              onClick={handleOpenCustomerPortal}
              disabled={isOpeningPortal}
              className="px-4 py-2.5 rounded-xl bg-[#131722] hover:bg-white/10 border border-white/10 text-white font-syne font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ExternalLink size={14} className="text-cyan-400" />
              <span>{isOpeningPortal ? 'Abrindo Portal...' : 'Portal Stripe (Faturas & Cancelamento)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPlansModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-black font-syne font-black text-xs hover:opacity-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Crown size={14} />
            <span>Mudar de Plano</span>
          </button>
        </div>
      </div>

      {/* CARD DO PLANO ATUAL */}
      {loading ? (
        <div className="p-8 rounded-2xl bg-[#0b0d14] border border-white/10 text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-amber-400 mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Consultando assinatura ativa no Supabase...</p>
        </div>
      ) : subscription ? (
        <div className="bg-[#0b0d14] p-6 rounded-3xl border border-emerald-500/30 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Situação: {subscription.status.toUpperCase()}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Clock size={12} /> Não será renovada automaticamente
                  </span>
                )}
              </div>
              <h3 className="text-2xl sm:text-3xl font-syne font-black text-white flex items-center gap-2 pt-1">
                <span>{subscription.planoNome}</span>
                <Crown size={22} className="text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Acesso aos materiais protegidos, aulas exclusivas e suporte pedagógico.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-3xl font-syne font-black text-emerald-400">
                {subscription.preco > 0 ? `R$ ${subscription.preco.toFixed(2).replace('.', ',')}` : 'Grátis'}
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                {subscription.periodicidade === 'vitalicio' ? 'pagamento único vitalício' : `cobrança ${subscription.periodicidade}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
            <div className="bg-[#131722] p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px] uppercase font-bold flex items-center gap-1">
                <Calendar size={13} className="text-cyan-400" /> Início da Vigência
              </span>
              <span className="font-syne font-bold text-white text-sm">
                {formatDate(subscription.dataInicio)}
              </span>
            </div>

            <div className="bg-[#131722] p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px] uppercase font-bold flex items-center gap-1">
                <Clock size={13} className="text-amber-400" /> Próxima Renovação / Fim
              </span>
              <span className="font-syne font-bold text-white text-sm">
                {formatDate(subscription.dataFim)}
              </span>
            </div>

            <div className="bg-[#131722] p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px] uppercase font-bold flex items-center gap-1">
                <CreditCard size={13} className="text-emerald-400" /> Processamento Seguro
              </span>
              <span className="font-syne font-bold text-emerald-300 text-sm flex items-center gap-1">
                <ShieldCheck size={14} /> Stripe Billing
              </span>
            </div>
          </div>

          {/* Ações de gerenciamento seguro */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Cancelamento fácil a qualquer momento pelo portal Stripe sem taxas ou burocracia.</span>
            </div>

            {subscription.stripeCustomerId && (
              <button
                type="button"
                onClick={handleOpenCustomerPortal}
                disabled={isOpeningPortal}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <span>Gerenciar forma de pagamento ou cancelar renovação</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-[#0b0d14] border border-white/10 text-center space-y-4">
          <Crown size={32} className="text-amber-400 mx-auto opacity-70" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-xl font-syne font-black text-white">Plano Grátis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você está utilizando a versão introdutória da Tutti. Desbloqueie mais de 1000 partituras, aulas individuais ao vivo e mentoria com mestres e professores reais.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPlansModal}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-black font-syne font-black text-xs hover:opacity-95 transition-all shadow-lg cursor-pointer"
          >
            Assinar Tutti Ultra ou Vitalício
          </button>
        </div>
      )}

      {/* HISTÓRICO REAL DE PAGAMENTOS */}
      <div className="bg-[#0b0d14] p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-syne font-black text-lg text-white flex items-center gap-2">
            <Receipt size={18} className="text-cyan-400" />
            <span>Histórico de Pagamentos & Comprovantes</span>
          </h3>
          <span className="text-xs text-slate-400">
            {payments.length} registro(s) no banco
          </span>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-white/10">
                  <th className="pb-3 font-semibold">Data</th>
                  <th className="pb-3 font-semibold">Valor</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 text-slate-300 font-mono">{formatDate(p.dataPagamento)}</td>
                    <td className="py-3 font-syne font-bold text-white">
                      R$ {p.valor.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'pago' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        p.status === 'falhou' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {p.comprovanteUrl ? (
                        <a
                          href={p.comprovanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1"
                        >
                          <span>Recibo Stripe</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500">
            Nenhum histórico de fatura registrado para este usuário.
          </div>
        )}
      </div>
    </div>
  );
};
