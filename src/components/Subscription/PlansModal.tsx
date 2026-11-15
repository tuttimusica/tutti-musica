import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Sparkles, Zap, Crown, ArrowRight, MessageCircle, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import { useAppRouter } from '../../App';
import { useAuth } from '../../context/AuthContext';
import { TUTTI_STRIPE_PLANS } from '../../data/stripePlans';
import { createStripeCheckoutSession } from '../../services/stripeService';
import { supabase } from '../../lib/supabase';
import { OfficialContacts, buildTuttiWhatsAppUrl } from '../Common/OfficialContacts';

export interface DbPlano {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  moeda?: string;
  recorrencia: string; // 'mensal' | 'trimestral' | 'semestral' | 'vitalicio' | 'unico'
  beneficios: string[];
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  ordem?: number;
  ativo: boolean;
}

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FALLBACK_PLANS: DbPlano[] = [
  {
    id: 'free',
    nome: 'Grátis',
    descricao: 'Acesso inicial para explorar a plataforma e começar seus estudos.',
    preco: 0,
    recorrencia: 'mensal',
    beneficios: [
      'Partituras gratuitas liberadas',
      'Acordes maiores/menores violão e teclado',
      'Desenhos técnicos de sopros e metais',
      'Metrônomo / afinador',
      'Maestro IA limitada (5 perguntas/semana)',
    ],
    ordem: 1,
    ativo: true,
  },
  {
    id: 'pro',
    nome: 'Pro',
    descricao: 'Pagamento único de R$ 19,90 e acesso vitalício aos recursos digitais Pro; aulas particulares exigem um plano Ultra válido.',
    preco: 19.9,
    recorrencia: 'vitalicio',
    beneficios: [
      'Acesso completo às aulas gravadas e trilha prática',
      'Acordes e digitações avançadas',
      'Metrônomo / afinador profissional',
      'IA Maestro ilimitada',
      'Suporte direto com a equipe Tutti',
    ],
    ordem: 2,
    ativo: true,
  },
  {
    id: 'mensal',
    nome: 'Ultra Mensal',
    descricao: 'Pagamento antecipado por um mês de aulas individuais e acompanhamento VIP. Renovação opcional, sem cobrança automática.',
    preco: 299.9,
    recorrencia: 'mensal',
    beneficios: [
      'Aulas virtuais individuais com professores reais',
      'Suporte VIP e acompanhamento individual',
      'Acesso completo às aulas gravadas e IA Maestro ilimitada',
      'Estúdio completo com timbres reais e BPM configurável',
    ],
    stripe_product_id: TUTTI_STRIPE_PLANS.monthly.stripeProductId,
    ordem: 3,
    ativo: true,
  },
  {
    id: 'trimestral',
    nome: 'Tutti Ultra Trimestral',
    descricao: 'Plano trimestral exclusivo com mentoria VIP e professores reais.',
    preco: 799.9,
    recorrencia: 'trimestral',
    beneficios: [
      'Aulas virtuais e individuais com professores reais',
      'Mentoria personalizada e suporte pedagógico VIP',
      'Acesso a todas as partituras gratuitas e aulas completas',
      'Maestro IA ilimitado 24h',
      'Estúdio completo (Sopros, Metais, Teclado e Violão)',
    ],
    stripe_product_id: TUTTI_STRIPE_PLANS.trimestral.stripeProductId,
    ordem: 4,
    ativo: true,
  },
  {
    id: 'semestral',
    nome: 'Tutti Ultra Semestral',
    descricao: 'Formação completa semestral com professores e acompanhamento VIP.',
    preco: 1649.9,
    recorrencia: 'semestral',
    beneficios: [
      'Aulas virtuais e individuais com professores reais',
      'Mentoria personalizada e suporte pedagógico VIP',
      'Acesso completo às aulas e partituras gratuitas',
      'Maestro IA ilimitado 24h',
      'Estúdio completo (Sopros, Metais, Teclado e Violão)',
    ],
    stripe_product_id: TUTTI_STRIPE_PLANS.semestral.stripeProductId,
    ordem: 5,
    ativo: true,
  },
];

export const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => {
  const { userPlan, setUserPlan, showToast, navigate } = useAppRouter();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'trimestral' | 'semestral'>('monthly');
  const [loadingCheckoutPlan, setLoadingCheckoutPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<DbPlano[]>(FALLBACK_PLANS);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: DbPlano[] = data.map((row: any) => ({
          id: String(row.id),
          nome: row.nome,
          descricao: row.descricao || '',
          preco: Number(row.preco_centavos || 0) / 100,
          moeda: row.moeda || 'BRL',
          recorrencia: (row.recorrencia || 'mensal').toLowerCase(),
          beneficios: Array.isArray(row.beneficios) ? row.beneficios : [],
          stripe_product_id: row.stripe_product_id || null,
          stripe_price_id: row.stripe_price_id || null,
          ordem: Number(FALLBACK_PLANS.find(p => p.id === row.id)?.ordem ?? 99),
          ativo: Boolean(row.ativo),
        }));
        // Keep unseeded plans visible; server validates all amounts independently.
        const ids = new Set(mapped.map(p => p.id));
        setPlans([...FALLBACK_PLANS.filter(p => !ids.has(p.id)), ...mapped]);
      } else {
        setPlans(FALLBACK_PLANS);
      }
    } catch {
      setPlans(FALLBACK_PLANS);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadPlans();

    const channel = supabase
      .channel('plans-modal-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planos' }, () => {
        loadPlans();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, loadPlans]);

  if (!isOpen) return null;

  const whatsappUrl = buildTuttiWhatsAppUrl(
    `Olá! Gostaria de tirar dúvidas sobre o plano ${
      billingPeriod === 'trimestral' ? 'Trimestral' : billingPeriod === 'semestral' ? 'Semestral' : 'Mensal / Vitalício'
    } da Tutti Escola de Música.`
  );

  const handleSelectFree = () => {
    setUserPlan('free');
    showToast('Plano Grátis ativo! Aproveite a plataforma e o Maestro IA.');
    onClose();
  };

  const handleInitiateStripeCheckout = async (planoId: string) => {
    if (!user) {
      showToast('Por favor, faça login ou cadastre-se na Tutti antes de contratar um plano.');
      onClose();
      navigate('/auth');
      return;
    }

    try {
      setLoadingCheckoutPlan(planoId);
      showToast('Conectando ao Checkout Seguro da Stripe...');
      const { url } = await createStripeCheckoutSession(planoId);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de pagamento não retornada.');
      }
    } catch (err: any) {
      setLoadingCheckoutPlan(null);
      showToast(err.message || 'Erro ao gerar checkout seguro com a Stripe.');
    }
  };

  const visiblePlans = plans.filter((p) => {
    if (billingPeriod === 'trimestral') return p.recorrencia === 'trimestral';
    if (billingPeriod === 'semestral') return p.recorrencia === 'semestral';
    return p.recorrencia === 'mensal' || p.recorrencia === 'vitalicio' || p.recorrencia === 'unico';
  });

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl my-auto bg-[#0f0b08] text-slate-100 border border-amber-900/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 overflow-hidden modal-dark">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors z-20 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center space-y-3 relative z-10 max-w-2xl mx-auto pt-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_kkz0gekkz0gekkz0_03cb0dc7.jfif"
              alt="Tutti Escola de Música"
              className="w-7 h-7 rounded-full border border-amber-500/40 object-cover shadow-sm"
            />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-amber-300 font-mono">
              TUTTI ESCOLA DE MÚSICA • PLANOS
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-syne font-black tracking-tight text-white leading-tight">
            Comece de graça. Escale quando{' '}
            <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-white to-cyan-300">
              quiser.
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Valores e benefícios sincronizados em tempo real com a escola. Escolha o plano ideal para o seu instrumento.
          </p>

          {/* Billing Switch */}
          <div className="pt-3 flex justify-center items-center">
            <div className="inline-flex p-1 bg-[#131722] rounded-full border border-white/10 shadow-inner gap-1">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensal & Vitalício
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('trimestral')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingPeriod === 'trimestral'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Trimestral
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('semestral')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingPeriod === 'semestral'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semestral
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Plans Grid */}
        {loadingPlans && plans.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-amber-400" /> Carregando planos...
          </div>
        ) : visiblePlans.length > 0 ? (
          <div className={`grid gap-6 items-stretch relative z-10 pt-2 ${
            visiblePlans.length === 1
              ? 'grid-cols-1 max-w-xl mx-auto w-full'
              : visiblePlans.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto w-full'
              : 'grid-cols-1 lg:grid-cols-3'
          }`}>
            {visiblePlans.map((plano) => {
              const isFree = plano.id === 'free' || Number(plano.preco) === 0;
              const isPro = plano.id === 'pro' || plano.recorrencia === 'vitalicio' || plano.recorrencia === 'unico';
              const isUltra = !isFree && !isPro;
              const isCurrent = (isFree && userPlan === 'free') || (isPro && userPlan === 'pro') || (isUltra && userPlan === 'ultra');

              return (
                <div
                  key={plano.id}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border-2 transition-all duration-300 relative ${
                    isUltra
                      ? 'bg-[#18130e] border-emerald-500/75 shadow-xl shadow-emerald-500/15'
                      : isPro
                      ? 'bg-[#1c1611] border-amber-500/80 shadow-2xl shadow-amber-500/20'
                      : 'bg-[#18130e]/80 border-amber-900/30'
                  }`}
                >
                  {(isPro || isUltra) && (
                    <div className="absolute -top-3.5 right-6 z-20">
                      <span className={`px-3.5 py-1 rounded-full text-black text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 ${
                        isUltra ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500' : 'bg-gradient-to-r from-amber-500 to-yellow-500'
                      }`}>
                        {isUltra ? <Crown size={11} /> : <Sparkles size={11} />}
                        <span>{isUltra ? 'Aulas Ao Vivo VIP' : 'Acesso Vitalício'}</span>
                      </span>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xl font-syne font-bold text-white flex items-center gap-2">
                          <span>{plano.nome}</span>
                          {isUltra && <Crown size={18} className="text-amber-400" />}
                        </h3>
                      </div>

                      <div className="flex items-baseline gap-1 mt-3">
                        <span className="text-3xl sm:text-4xl font-syne font-black text-white">
                          {formatBRL(plano.preco)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {isFree
                            ? ''
                            : plano.recorrencia === 'vitalicio' || plano.recorrencia === 'unico'
                            ? 'único'
                            : `/${plano.recorrencia}`}
                        </span>
                      </div>

                      {plano.descricao && (
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plano.descricao}</p>
                      )}
                    </div>

                    <div className="h-px bg-white/10" />

                    <ul className="space-y-3 text-xs leading-relaxed">
                      {plano.beneficios.map((ben, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-200">
                          <Check size={16} className={`${isUltra ? 'text-emerald-400' : 'text-amber-400'} flex-shrink-0 mt-0.5`} />
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
                        className="w-full py-3.5 rounded-2xl bg-[#08090e] hover:bg-white/10 text-white font-syne font-bold text-xs border border-white/15 transition-all cursor-pointer"
                      >
                        {isCurrent ? 'Plano Atual (Começar Agora)' : 'Começar Agora'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!!loadingCheckoutPlan}
                        onClick={() => handleInitiateStripeCheckout(plano.id)}
                        className={`w-full py-3.5 rounded-2xl font-syne font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                          isUltra
                            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black'
                            : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white'
                        }`}
                      >
                        {loadingCheckoutPlan === plano.id ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Conectando ao Stripe...</span>
                          </>
                        ) : (
                          <>
                            {isPro ? <Zap size={15} /> : <CreditCard size={15} />}
                            <span>{isCurrent ? `Seu Plano Atual (${plano.nome})` : `Assinar ${plano.nome} (${formatBRL(plano.preco)})`}</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-[11px] px-1 gap-2">
                      {plano.stripe_product_id ? (
                        <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          <ShieldCheck size={12} /> {plano.stripe_product_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Tutti Escola de Música</span>
                      )}
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle size={12} className="text-emerald-400" />
                        <span>Secretaria (21) 92037-5422</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-[#131722] rounded-2xl border border-white/10">
            Nenhum plano ativo cadastrado para este período.
          </div>
        )}

        {/* Official Contacts */}
        <div className="pt-4 border-t border-white/10 relative z-10 space-y-4">
          <OfficialContacts compact />
          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Cancelamento fácil a qualquer momento • Pagamento criptografado e seguro com Stripe</span>
            </div>
            <div>Planos gerenciados em tempo real pelo painel da Tutti</div>
          </div>
        </div>
      </div>
    </div>
  );
};

