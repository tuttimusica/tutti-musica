import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Sparkles,
  Zap,
  Crown,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAppRouter } from '../../App';
import { useAuth } from '../../context/AuthContext';
import {
  CheckoutError,
  createStripeCheckoutSession,
  hasActiveProOrUltraSubscription,
} from '../../services/stripeService';
import {
  DbPlano,
  buildUltraWhatsAppUrl,
  fetchActivePlans,
  formatBrlFromCents,
  isFreePlan,
  isProPlan,
  isTuttiPaymentsEnabled,
  isUltraPlan,
} from '../../services/plansService';
import { supabase } from '../../lib/supabase';
import { OfficialContacts, TUTTI_PHONE_DISPLAY, buildTuttiWhatsAppUrl } from '../Common/OfficialContacts';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => {
  const { userPlan, setUserPlan, showToast, navigate } = useAppRouter();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'all' | 'monthly' | 'trimestral' | 'semestral'>('all');
  const [loadingCheckoutPlan, setLoadingCheckoutPlan] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);
  const [plans, setPlans] = useState<DbPlano[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [alreadyOwnsPaid, setAlreadyOwnsPaid] = useState(false);

  const paymentsLiveFlag = isTuttiPaymentsEnabled();

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setPlansError(null);
    try {
      const dbPlans = await fetchActivePlans();
      setPlans(dbPlans);
    } catch (err: any) {
      setPlansError(err?.message || 'Erro ao carregar planos do servidor.');
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCheckoutBanner(null);
    loadPlans();

    if (user?.id) {
      hasActiveProOrUltraSubscription(user.id).then(setAlreadyOwnsPaid).catch(() => {});
    } else {
      setAlreadyOwnsPaid(false);
    }

    const channel = supabase
      .channel('plans-modal-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planos' }, () => {
        loadPlans();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user?.id, loadPlans]);

  if (!isOpen) return null;

  const generalWhatsappUrl = buildTuttiWhatsAppUrl(
    'Olá Secretaria Tutti Escola de Música! Gostaria de tirar dúvidas sobre os planos e matrículas.'
  );

  const handleSelectFree = () => {
    setUserPlan('free');
    showToast('Plano Grátis selecionado! Aproveite o acervo gratuito e as ferramentas.');
    onClose();
  };

  const handleInitiateProCheckout = async (plano: DbPlano) => {
    setCheckoutBanner(null);

    if (!user) {
      showToast('Faça login para continuar com a assinatura Tutti Pro.');
      onClose();
      navigate('/auth', { redirect: 'checkout_pro' });
      return;
    }

    if (alreadyOwnsPaid || userPlan === 'pro' || userPlan === 'ultra') {
      const msg = 'Plano já adquirido nesta conta.';
      setCheckoutBanner(msg);
      showToast(msg);
      return;
    }

    try {
      setLoadingCheckoutPlan(plano.id);
      showToast('Conectando ao Checkout Seguro da Stripe...');
      const { url } = await createStripeCheckoutSession(plano.id);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de pagamento não retornada.');
      }
    } catch (err: any) {
      setLoadingCheckoutPlan(null);
      if (err instanceof CheckoutError && err.code === 'ALREADY_OWNED') {
        setAlreadyOwnsPaid(true);
        setCheckoutBanner('Plano já adquirido nesta conta.');
        showToast('Plano já adquirido nesta conta.');
        return;
      }
      const message = err?.message || 'Erro ao gerar checkout seguro com a Stripe.';
      setCheckoutBanner(message);
      showToast(message);
    }
  };

  const visiblePlans = plans.filter((p) => {
    if (billingPeriod === 'all') return true;
    if (billingPeriod === 'trimestral') return p.id.includes('trimestral');
    if (billingPeriod === 'semestral') return p.id.includes('semestral');
    return p.id === 'free' || p.id === 'pro' || p.id === 'mensal';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="modal-dark relative w-full max-w-6xl my-auto bg-[#0f0b08] text-slate-100 border border-amber-900/40 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar janela de planos"
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center border border-white/15 transition-colors z-20 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center space-y-3 relative z-10 max-w-3xl mx-auto pt-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_kkz0gekkz0gekkz0_03cb0dc7.jfif"
              alt="Tutti Escola de Música"
              className="w-7 h-7 rounded-full border border-amber-500/40 object-cover shadow-sm"
            />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-amber-300 font-mono">
              TUTTI ESCOLA DE MÚSICA • PLANOS OFICIAIS
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-syne font-black tracking-tight text-white leading-tight">
            Comece de graça. Evolua no{' '}
            <span className="font-serif italic font-normal text-amber-300">
              seu ritmo.
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Valores oficiais sincronizados diretamente com o catálogo da Tutti. Tutti Pro com acesso vitalício às partituras exclusivas e Tutti Ultra com aulas individuais ao vivo via Secretaria.
          </p>

          {/* Filtro por ciclo */}
          <div className="pt-2 flex justify-center items-center">
            <div className="inline-flex flex-wrap justify-center p-1 bg-[#141824] rounded-full border border-white/15 shadow-inner gap-1">
              {(
                [
                  { id: 'all', label: 'Todos os Planos', activeClass: 'bg-amber-500 text-slate-950' },
                  { id: 'monthly', label: 'Mensal & Vitalício', activeClass: 'bg-violet-600 text-white' },
                  { id: 'trimestral', label: 'Trimestral', activeClass: 'bg-emerald-600 text-white' },
                  { id: 'semestral', label: 'Semestral', activeClass: 'bg-amber-600 text-white' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBillingPeriod(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    billingPeriod === tab.id
                      ? `${tab.activeClass} shadow-md`
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Aviso controlado quando checkout público live está em modo piloto */}
        {!paymentsLiveFlag && (
          <div className="relative z-10 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/35 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
              <span>
                <strong>Modo Piloto Controlado:</strong> o Tutti Pro Vitalício pode operar com validação controlada no servidor; os planos Tutti Ultra são contratados diretamente pelo WhatsApp oficial.
              </span>
            </div>
            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:text-emerald-200 font-bold underline flex items-center gap-1"
            >
              <MessageCircle size={13} /> Falar com a Secretaria
            </a>
          </div>
        )}

        {checkoutBanner && (
          <div className="relative z-10 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-100 text-xs flex flex-wrap items-center justify-between gap-3">
            <span>{checkoutBanner}</span>
            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1"
            >
              <MessageCircle size={12} /> Chamar no WhatsApp
            </a>
          </div>
        )}

        {/* Grade de Planos */}
        {loadingPlans ? (
          <div className="py-12 text-center text-slate-300 text-sm flex items-center justify-center gap-2 relative z-10">
            <Loader2 size={18} className="animate-spin text-amber-400" /> Carregando valores atualizados...
          </div>
        ) : plansError ? (
          <div className="p-8 text-center text-xs text-rose-200 bg-[#131722] rounded-2xl border border-rose-500/30 space-y-3 relative z-10">
            <p>{plansError}</p>
            <button
              type="button"
              onClick={loadPlans}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : visiblePlans.length > 0 ? (
          <div
            className={`grid gap-5 items-stretch relative z-10 pt-2 ${
              visiblePlans.length === 1
                ? 'grid-cols-1 max-w-xl mx-auto w-full'
                : visiblePlans.length === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto w-full'
                : visiblePlans.length >= 4
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                : 'grid-cols-1 lg:grid-cols-3'
            }`}
          >
            {visiblePlans.map((plano) => {
              const isFree = isFreePlan(plano);
              const isPro = isProPlan(plano);
              const isUltra = isUltraPlan(plano);
              const formattedPrice = formatBrlFromCents(plano.preco_centavos);
              const isCurrent =
                (isFree && userPlan === 'free') ||
                (isPro && (userPlan === 'pro' || alreadyOwnsPaid)) ||
                (isUltra && userPlan === 'ultra');
              const ultraWaUrl = buildUltraWhatsAppUrl(plano, user?.email);

              return (
                <div
                  key={plano.id}
                  className={`rounded-3xl p-6 flex flex-col justify-between border-2 transition-all duration-300 relative ${
                    isUltra
                      ? 'bg-[#121a18] border-emerald-500/60 shadow-xl shadow-emerald-500/10'
                      : isPro
                      ? 'bg-[#1c1611] border-amber-500/80 shadow-2xl shadow-amber-500/15'
                      : 'bg-[#151822] border-white/15'
                  }`}
                >
                  {(isPro || isUltra) && (
                    <div className="absolute -top-3 right-5 z-20">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 ${
                          isUltra
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-400 text-slate-950'
                        }`}
                      >
                        {isUltra ? <Crown size={11} /> : <Sparkles size={11} />}
                        <span>{isUltra ? 'Aulas Ao Vivo VIP' : 'Acesso Vitalício'}</span>
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-syne font-bold text-white flex items-center gap-2">
                        <span>{plano.nome}</span>
                        {isUltra && <Crown size={18} className="text-emerald-400" />}
                      </h3>

                      <div className="flex items-baseline gap-1.5 mt-2.5">
                        <span className="text-3xl font-syne font-black text-white">
                          {formattedPrice}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {isFree
                            ? 'sem custo'
                            : isPro
                            ? 'pagamento único'
                            : plano.periodo
                            ? `/${plano.periodo}`
                            : ''}
                        </span>
                      </div>

                      {plano.descricao && (
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{plano.descricao}</p>
                      )}
                    </div>

                    <div className="h-px bg-white/10" />

                    <ul className="space-y-2.5 text-xs leading-relaxed">
                      {(plano.beneficios || []).map((ben, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-200">
                          <Check
                            size={15}
                            className={`${isUltra ? 'text-emerald-400' : 'text-amber-400'} flex-shrink-0 mt-0.5`}
                          />
                          <span>{ben}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 space-y-2.5">
                    {isFree ? (
                      <button
                        type="button"
                        onClick={handleSelectFree}
                        className="w-full py-3.5 px-4 rounded-2xl bg-[#1f2433] hover:bg-[#2a3145] text-white font-syne font-bold text-xs border border-white/20 transition-all cursor-pointer"
                      >
                        {isCurrent ? 'Plano Atual • Começar Agora' : 'Começar Grátis'}
                      </button>
                    ) : isPro ? (
                      alreadyOwnsPaid || userPlan === 'pro' || userPlan === 'ultra' ? (
                        <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-syne font-bold text-xs flex items-center justify-center gap-2">
                          <CheckCircle2 size={15} />
                          <span>Plano já adquirido</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(loadingCheckoutPlan)}
                          onClick={() => handleInitiateProCheckout(plano)}
                          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-syne font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {loadingCheckoutPlan === plano.id ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Conectando ao Stripe...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={15} />
                              <span>Assinar {plano.nome} ({formattedPrice})</span>
                              <ArrowRight size={14} />
                            </>
                          )}
                        </button>
                      )
                    ) : (
                      /* TUTTI ULTRA: Fluxo principal oficial via WhatsApp sem Stripe Checkout */
                      <a
                        href={ultraWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-syne font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 text-center"
                      >
                        <MessageCircle size={15} />
                        <span>Conversar no WhatsApp e contratar</span>
                        <ArrowRight size={14} />
                      </a>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-[11px] px-1 gap-2">
                      <span className="text-slate-300 text-[10px] font-medium">
                        {isUltra
                          ? 'Matrícula assistida pela Secretaria'
                          : isPro
                          ? 'Checkout Seguro Stripe • Acesso Vitalício'
                          : 'Tutti Escola de Música'}
                      </span>
                      <a
                        href={isUltra ? ultraWaUrl : generalWhatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-300 hover:text-emerald-200 flex items-center gap-1 transition-colors font-semibold"
                      >
                        <MessageCircle size={12} />
                        <span>{TUTTI_PHONE_DISPLAY}</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-300 bg-[#131722] rounded-2xl border border-white/10 relative z-10">
            Nenhum plano ativo disponível para este filtro.
          </div>
        )}

        {/* Contatos Oficiais */}
        <div className="pt-4 border-t border-white/10 relative z-10 space-y-4">
          <OfficialContacts compact />
          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Preços sincronizados em tempo real com a Tutti Escola de Música</span>
            </div>
            <div>Tutti Pro via Stripe • Tutti Ultra via Secretaria WhatsApp</div>
          </div>
        </div>
      </div>
    </div>
  );
};