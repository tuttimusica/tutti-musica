import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, CreditCard, ShieldCheck, Tag, ArrowRight, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Product } from '../../data/musicData';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { OfficialContacts } from '../Common/OfficialContacts';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CheckoutModalProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearCart: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  isOpen,
  onClose,
  onClearCart
}) => {
  const { user, profile, createOrderInDb } = useAuth();
  const [step, setStep] = useState<'review' | 'pending'>('review');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [generatedOrderId, setGeneratedOrderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    setFormData(prev => ({
      name: prev.name || profile?.displayName || user?.user_metadata?.full_name || '',
      email: prev.email || user?.email || '',
      address: prev.address
    }));
  }, [profile?.displayName, user?.email, user?.user_metadata?.full_name]);

  if (!isOpen) return null;

  const rawSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountValue = (rawSubtotal * discountPercent) / 100;
  const total = Math.max(0, rawSubtotal - discountValue);

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'TUTTI10') {
      setDiscountPercent(10);
      setCouponMessage('Cupom TUTTI10 de 10% aplicado (sujeito à validação do servidor).');
    } else {
      setDiscountPercent(0);
      setCouponMessage('Cupom inválido.');
    }
  };

  const handleFinishOrder = async () => {
    setErrorMessage(null);
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMessage('Informe seu nome completo e e-mail para prosseguir.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/stripe/create-store-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.product.id,
            quantity: item.quantity,
          })),
          coupon: couponCode.trim() || undefined,
          shippingAddress: formData.address.trim(),
          customerName: formData.name.trim(),
          customerEmail: formData.email.trim(),
          returnUrl: window.location.origin,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.url) {
        window.location.href = json.url;
        return;
      }

      // If Stripe is not configured on this environment (503), register honestly as pending_payment
      if (res.status === 503) {
        const orderPayload = {
          items: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            image: item.product.image
          })),
          subtotal: rawSubtotal,
          discount: discountValue,
          total,
          coupon: couponCode || null,
          paymentMethod: 'stripe_pending',
          status: 'pending_payment',
          shippingAddress: formData.address,
          userEmail: user?.email || formData.email
        };

        const orderId = await createOrderInDb(orderPayload);
        setGeneratedOrderId(orderId);
        setStep('pending');
        onClearCart();
        return;
      }

      throw new Error(json.error || 'Não foi possível iniciar o checkout seguro da loja.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao iniciar o checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden modal-dark">
        {/* Header */}
        <div className="bg-[#0b0d14] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-xl text-white">
                {step === 'review' ? 'Finalizar Pedido da Loja' : 'Pedido Registrado — Pagamento Pendente'}
              </h3>
              <p className="text-xs text-slate-400">Checkout Oficial Stripe & Secretaria Tutti</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {step === 'review' ? (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Items summary */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Itens no Carrinho ({cart.reduce((a, c) => a + c.quantity, 0)})
                </span>
                <div className="space-y-2">
                  {cart.map((item) => {
                    const isImageUrl = item.product.image?.startsWith('http') || item.product.image?.startsWith('/');
                    return (
                      <div
                        key={item.product.id}
                        className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isImageUrl ? (
                            <img src={item.product.image} alt={item.product.name} className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" />
                          ) : (
                            <span className="text-2xl shrink-0">{item.product.image}</span>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white line-clamp-1">{item.product.name}</div>
                            <div className="text-xs text-slate-400">
                              {item.quantity}x R$ {item.product.price.toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-syne font-black text-cyan-400 shrink-0">
                          R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <MapPin size={14} className="text-cyan-400" /> Dados do Comprador & Entrega
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo *"
                    className="bg-[#131722] border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none focus:border-cyan-400"
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="E-mail *"
                    className="bg-[#131722] border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Endereço para entrega ou observações (opcional)"
                  className="w-full bg-[#131722] border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* Coupon */}
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Tag size={14} className="text-cyan-400" /> Cupom de Desconto:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Ex: TUTTI10 (10% OFF)"
                    className="flex-1 bg-[#131722] border border-white/10 rounded-xl px-4 py-2 text-sm text-white uppercase outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
                {couponMessage && (
                  <p className={`text-xs ${discountPercent > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {couponMessage}
                  </p>
                )}
              </div>

              {/* Payment info */}
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-cyan-500/20 flex items-center gap-3 text-xs text-slate-300">
                <CreditCard size={22} className="text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">Pagamento Seguro via Stripe Checkout</div>
                  <div className="text-slate-400">Os preços são validados diretamente no servidor a partir do catálogo oficial no Supabase.</div>
                </div>
              </div>

              {/* Order totals */}
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>R$ {rawSubtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Desconto ({discountPercent}%)</span>
                    <span>- R$ {discountValue.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                  <span className="font-bold text-white text-base">Total Estimado</span>
                  <span className="font-syne font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-4 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h4 className="font-syne font-black text-xl text-white">Pedido Registrado (Aguardando Pagamento)</h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  Seu pedido <strong className="text-cyan-400">#{generatedOrderId}</strong> foi salvo com status <strong className="text-amber-300">pendente</strong>. Como o gateway automático está aguardando configuração de chaves neste ambiente, finalize o pagamento com nossa secretaria:
                </p>
              </div>
              <div className="text-left">
                <OfficialContacts />
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="bg-[#0b0d14] px-6 py-4 border-t border-white/10">
          {step === 'review' ? (
            <button
              type="button"
              onClick={handleFinishOrder}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full py-4 rounded-2xl font-syne font-bold text-base bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Conectando ao Checkout Seguro...</span>
                </>
              ) : (
                <>
                  <span>Pagar com Segurança via Stripe</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStep('review');
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl font-syne font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

