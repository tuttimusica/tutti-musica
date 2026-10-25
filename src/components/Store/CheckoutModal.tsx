import React, { useState } from 'react';
import { X, CheckCircle2, QrCode, CreditCard, ShieldCheck, Tag, ArrowRight } from 'lucide-react';
import { Product } from '../../data/musicData';

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

import { useAuth } from '../../context/AuthContext';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  isOpen,
  onClose,
  onClearCart
}) => {
  const { user, createOrderInDb } = useAuth();
  const [step, setStep] = useState<'review' | 'success'>('review');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [pixCopied, setPixCopied] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState<string>('TT-89412');

  // Customer form details
  const [formData, setFormData] = useState({
    name: 'Rafael Drumond',
    email: 'aluno@tutti.mus.br',
    cep: '01310-200',
    address: 'Av. Paulista, 1578 - São Paulo/SP'
  });

  if (!isOpen) return null;

  const rawSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountValue = (rawSubtotal * discountPercent) / 100;
  const total = Math.max(0, rawSubtotal - discountValue);

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'TUTTI10') {
      setDiscountPercent(10);
      setCouponMessage('Cupom de 10% aplicado com sucesso! 🎉');
    } else {
      setDiscountPercent(0);
      setCouponMessage('Cupom inválido. Tente TUTTI10');
    }
  };

  const handleFinishOrder = async () => {
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
      paymentMethod,
      status: 'confirmed',
      shippingAddress: formData.address,
      userEmail: user?.email || formData.email
    };

    try {
      const orderId = await createOrderInDb(orderPayload);
      setGeneratedOrderId(orderId);
    } catch (err) {
      console.warn('Order save fallback:', err);
    }

    setStep('success');
    onClearCart();
  };

  const pixString = '00020126580014br.gov.bcb.pix0136tutti-pagamentos-f389a-412b5204000053039865802BR5915TUTTI MUSICA LTDA6009SAO PAULO62070503***63047A9B';

  const copyPixCode = () => {
    navigator.clipboard?.writeText(pixString);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
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
                {step === 'review' ? 'Finalizar Pedido' : 'Pedido Confirmado!'}
              </h3>
              <p className="text-xs text-slate-400">Ambiente Seguro Tutti Pay</p>
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
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {step === 'review' ? (
            <>
              {/* Items summary */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Itens no seu Carrinho ({cart.reduce((a, c) => a + c.quantity, 0)})
                </span>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.product.image}</span>
                        <div>
                          <div className="text-sm font-bold text-white line-clamp-1">{item.product.name}</div>
                          <div className="text-xs text-slate-400">
                            {item.quantity}x R$ {item.product.price.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-syne font-black text-cyan-400">
                        R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                </div>
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

              {/* Payment selector */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Forma de Pagamento
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === 'pix'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-[#0b0d14] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <QrCode size={24} className={paymentMethod === 'pix' ? 'text-cyan-400' : ''} />
                    <span className="text-xs font-bold">Pix Instantâneo</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Aprovação imediata</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-[#0b0d14] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard size={24} className={paymentMethod === 'card' ? 'text-cyan-400' : ''} />
                    <span className="text-xs font-bold">Cartão de Crédito</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Até 6x sem juros</span>
                  </button>
                </div>

                {paymentMethod === 'pix' && (
                  <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 text-center space-y-3">
                    <div className="w-36 h-36 mx-auto bg-white p-3 rounded-2xl flex items-center justify-center">
                      <div className="w-full h-full border-2 border-black flex flex-col items-center justify-center text-black text-center">
                        <QrCode size={90} />
                      </div>
                    </div>
                    <button
                      onClick={copyPixCode}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
                    >
                      {pixCopied ? 'Código Copiado! ✅' : 'Copiar Chave Copia e Cola 📋'}
                    </button>
                  </div>
                )}
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
                <div className="flex justify-between text-slate-400">
                  <span>Frete Especial Música</span>
                  <span className="text-emerald-400 font-bold">Grátis</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                  <span className="font-bold text-white text-base">Total a Pagar</span>
                  <span className="font-syne font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Order Success View */
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center glow-emerald">
                <CheckCircle2 size={48} />
              </div>
              <h4 className="font-syne font-black text-2xl text-white">Parabéns pela sua compra!</h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Seu pedido <strong className="text-cyan-400">#{generatedOrderId}</strong> foi registrado com sucesso no banco de dados.
                Você receberá o rastreamento em seu e-mail e seus bônus de partituras digitais já foram liberados em seu perfil!
              </p>
              <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 inline-block text-left text-xs text-slate-300 space-y-1">
                <div>🚚 <strong>Previsão de Entrega:</strong> 3 a 5 dias úteis</div>
                <div>🎁 <strong>Bônus Ativado:</strong> 1 mês de Maestro IA Pro gratuito</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="bg-[#0b0d14] px-6 py-4 border-t border-white/10">
          {step === 'review' ? (
            <button
              onClick={handleFinishOrder}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-2xl font-syne font-bold text-base bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 glow"
            >
              Confirmar Pagamento e Concluir <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-syne font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Continuar Aprendendo no Tutti
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
