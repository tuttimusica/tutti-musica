import React, { useState } from 'react';
import { X, Check, Sparkles, Zap, Crown, ArrowRight, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAppRouter } from '../../App';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => {
  const { userPlan, setUserPlan, showToast } = useAppRouter();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<'pro' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // WhatsApp company URL with custom message for Ultra plan
  const whatsappNumber = '5511999999999'; // Número comercial da Tutti
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    'Olá! Tenho interesse no Plano Ultra da Tutti Escola de Música (aulas individuais ao vivo com professores reais e mentoria VIP). Como funciona para começar?'
  )}`;

  const handleSelectFree = () => {
    setUserPlan('free');
    showToast('Plano Grátis ativo! Aproveite suas 30 partituras e o Maestro IA.');
    onClose();
  };

  const handleConfirmProUpgrade = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setUserPlan('pro');
      setIsProcessing(false);
      setSelectedPlanForCheckout(null);
      showToast('🎉 Parabéns! Acesso Vitalício Tutti Pro ativado com sucesso! Mais de 1000 partituras e Maestro IA agora são ilimitados.');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl my-auto bg-[#0f0b08] text-slate-100 border border-amber-900/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 overflow-hidden modal-dark">
        {/* Background glow effects matching logo warmth */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors z-20 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header Section (styled like reference screenshot with school logo) */}
        <div className="text-center space-y-3 relative z-10 max-w-2xl mx-auto pt-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img 
              src="/assets/aistudio/Logo__836740ff.jpeg" 
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
            Escolha o plano ideal para acelerar seus estudos musicais, seja no saxofone, flauta, trombone, violão ou teclado.
          </p>

          {/* Billing Switch (Mensal / Anual) */}
          <div className="pt-3 flex justify-center items-center">
            <div className="inline-flex p-1 bg-[#131722] rounded-full border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingPeriod === 'yearly'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Anual</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-extrabold border border-emerald-500/30">
                  -17% OFF
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Plans Grid (Grátis / Pro / Ultra) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch relative z-10 pt-2">
          {/* PLAN 1: GRÁTIS */}
          <div className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all duration-300 ${
            userPlan === 'free'
              ? 'bg-[#18130e] border-amber-500/40 shadow-xl'
              : 'bg-[#18130e]/70 hover:bg-[#18130e] border-amber-900/30'
          }`}>
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-syne font-bold text-white">Grátis</h3>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-4xl sm:text-5xl font-syne font-black text-white">R$ 0,00</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mt-1">
                  Acesso Gratuito
                </span>
              </div>

              <div className="h-px bg-white/10" />

              {/* Features List */}
              <ul className="space-y-3 text-xs leading-relaxed">
                {/* Active items */}
                <li className="flex items-start gap-2.5 text-slate-200">
                  <Check size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  <span>30 partituras aleatórias</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-200">
                  <Check size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  <span>Acordes maiores/menores violão e teclado</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-200">
                  <Check size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  <span>Desenhos de notas saxofone</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-200">
                  <Check size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  <span>Metrônomo / afinador</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-200">
                  <Check size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  <span>Maestro IA limitada (5 perguntas/semana)</span>
                </li>

                {/* Strikethrough items */}
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>Aulas iniciantes</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>Suporte</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>Acesso a todas as partituras</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>IA Maestro ilimitada</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>Aulas virtuais com professores reais</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>Suporte VIP</span>
                </li>
              </ul>
            </div>

            {/* Bottom Button */}
            <div className="pt-6">
              <button
                type="button"
                onClick={handleSelectFree}
                className="w-full py-3.5 rounded-2xl bg-[#08090e] hover:bg-white/10 text-white font-syne font-bold text-xs border border-white/15 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                {userPlan === 'free' ? 'Plano Atual (Começar Agora)' : 'Começar Agora'}
              </button>
            </div>
          </div>

          {/* PLAN 2: PRO (Featured / Acesso Vitalício) */}
          <div className="rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative bg-[#1c1611] border-2 border-amber-500/80 shadow-2xl shadow-amber-500/20 transform lg:-translate-y-2">
            {/* Top Badge: "mais popular" */}
            <div className="absolute -top-3.5 right-6">
              <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-black text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                <Sparkles size={11} className="text-black" /> mais popular
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-syne font-bold text-white flex items-center gap-2">
                  <span>Pro</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                    Acesso Vitalício
                  </span>
                </h3>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-4xl sm:text-5xl font-syne font-black text-white">
                    R$ 147,00
                  </span>
                  <span className="text-xs font-bold text-amber-300 ml-1">único</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider mt-1">
                  PAGAMENTO ÚNICO • ACESSO VITALÍCIO
                </span>
              </div>

              <div className="h-px bg-amber-900/40" />

              {/* Features List */}
              <ul className="space-y-3 text-xs leading-relaxed">
                <li className="flex items-start gap-2.5 text-white font-semibold">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Mais de 1000 partituras</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Acordes maiores/menores violão e teclado</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Desenhos de notas saxofone</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Metrônomo / afinador</span>
                </li>
                <li className="flex items-start gap-2.5 text-white font-semibold">
                  <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Aulas iniciantes</span>
                </li>
                <li className="flex items-start gap-2.5 text-white font-semibold">
                  <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Suporte</span>
                </li>
                <li className="flex items-start gap-2.5 text-white font-semibold">
                  <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Acesso a todas as partituras</span>
                </li>
                <li className="flex items-start gap-2.5 text-white font-bold text-amber-300">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>IA Maestro ilimitada</span>
                </li>

                {/* Strikethrough items */}
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>Aulas virtuais com professores reais</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-500 line-through decoration-slate-600">
                  <span className="w-4 text-center font-bold text-slate-600">-</span>
                  <span>Suporte VIP</span>
                </li>
              </ul>
            </div>

            {/* Bottom Button */}
            <div className="pt-6">
              <button
                type="button"
                onClick={() => setSelectedPlanForCheckout('pro')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-syne font-black text-sm hover:opacity-95 transition-all shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Zap size={16} />
                <span>{userPlan === 'pro' ? 'Seu Plano Atual (Vitalício)' : 'Garantir Acesso Vitalício (Pro)'}</span>
              </button>
            </div>
          </div>

          {/* PLAN 3: ULTRA (Com Selo de Maior Indicação) */}
          <div className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border-2 transition-all duration-300 relative ${
            userPlan === 'ultra'
              ? 'bg-[#18130e] border-emerald-400 shadow-2xl shadow-emerald-500/20'
              : 'bg-[#18130e] hover:bg-[#1c1611] border-emerald-500/70 shadow-xl shadow-emerald-500/10'
          }`}>
            {/* Top Badge: "Maior Indicação" */}
            <div className="absolute -top-3.5 right-6 z-20">
              <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 border border-emerald-300/40">
                <Crown size={12} className="text-black" /> Maior Indicação
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-syne font-bold text-white flex items-center gap-2">
                    <span>Ultra</span>
                    <Crown size={18} className="text-amber-400" />
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                    ★ Maior Indicação
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-xs text-slate-400 uppercase font-bold mr-1">a partir de</span>
                  <span className="text-3xl sm:text-4xl font-syne font-black text-white">R$ 299,90</span>
                  <span className="text-xs font-semibold text-slate-400">/mês</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider mt-1">
                  COBRANÇA MENSAL
                </span>
              </div>

              <div className="h-px bg-white/10" />

              {/* Features List (100% liberated) */}
              <ul className="space-y-3 text-xs leading-relaxed">
                <li className="flex items-start gap-2.5 text-white font-semibold">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Mais de 1000 partituras</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Acordes maiores/menores violão e teclado</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Desenhos de notas saxofone</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Metrônomo / afinador</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Aulas iniciantes</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Suporte</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Acesso a todas as partituras</span>
                </li>
                <li className="flex items-start gap-2.5 text-white">
                  <Check size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>IA Maestro ilimitada</span>
                </li>
                <li className="flex items-start gap-2.5 text-amber-300 font-bold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                  <Crown size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Aulas virtuais com professores reais</span>
                </li>
                <li className="flex items-start gap-2.5 text-amber-300 font-bold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                  <Sparkles size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Suporte VIP e acompanhamento individual</span>
                </li>
              </ul>
            </div>

            {/* Bottom Button: Direct WhatsApp link */}
            <div className="pt-6">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-[#08090e] hover:bg-emerald-600 text-white hover:text-white font-syne font-bold text-xs border border-emerald-500/40 transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <MessageCircle size={16} className="text-emerald-400" />
                <span>Quero acessar</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer info & Security note */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400 relative z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Cancelamento fácil a qualquer momento • Pagamento seguro via Pix ou Cartão</span>
          </div>
          <div>Dúvidas sobre os planos? Fale com nosso time de atendimento musical.</div>
        </div>
      </div>

      {/* QUICK CHECKOUT MODAL FOR PRO PLAN */}
      {selectedPlanForCheckout === 'pro' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in">
          <div className="bg-[#131722] border border-cyan-400/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative">
            <button
              onClick={() => setSelectedPlanForCheckout(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/30">
                <Zap size={13} /> Assinatura Tutti Pro
              </div>
              <h3 className="text-2xl font-syne font-black text-white">Finalizar Assinatura</h3>
              <p className="text-xs text-slate-400">
                Acesso imediato e ilimitado a todas as partituras, aulas e mentoria com o Maestro IA.
              </p>
            </div>

            <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <div>
                <span className="font-bold text-white block text-sm">Plano Tutti Pro (Acesso Vitalício)</span>
                <span className="text-[11px] text-amber-400 font-semibold">Pagamento Único • Sem mensalidades</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-syne font-black text-amber-400">
                  R$ 147,00
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">pagamento único</span>
              </div>
            </div>

            {/* Payment Method selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Forma de Pagamento:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                      : 'bg-[#0b0d14] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⚡ Pix Instantâneo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                      : 'bg-[#0b0d14] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>💳 Cartão de Crédito</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'pix' ? (
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-emerald-500/20 text-center space-y-2">
                <div className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <Check size={14} /> Chave Pix & Liberação Imediata
                </div>
                <div className="p-3 bg-[#131722] rounded-xl font-mono text-[11px] text-slate-300 select-all border border-white/10 break-all">
                  00020126580014br.gov.bcb.pix0136tutti-musica-oficial@pix.com520400005303986540549.905802BR5925TUTTI ESCOLA DE MUSICA6009SAO PAULO62070503***6304E2D1
                </div>
                <p className="text-[10px] text-slate-400">Copie a chave Pix acima ou confirme abaixo para ativação instantânea.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Número do Cartão de Crédito"
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Validade (MM/AA)"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmProUpgrade}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-600 text-black font-syne font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Processando Assinatura...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Confirmar & Ativar Tutti Pro Vitalício</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
