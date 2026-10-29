import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, MessageCircle, Instagram, Sparkles, Share2, Music2 } from 'lucide-react';
import { useAppRouter } from '../../App';

interface SocialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SocialModal: React.FC<SocialModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useAppRouter();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const socialLinks = [
    {
      id: 'instagram',
      name: 'Instagram Oficial',
      handle: '@tuttiescolademusica',
      url: 'https://instagram.com/tuttiescolademusica',
      copyValue: '@tuttiescolademusica',
      description: 'Partituras diárias, vídeos de alunos, dicas de sax, violão e bastidores das aulas.',
      color: 'from-pink-500 via-purple-500 to-indigo-500',
      badge: 'Reels & Dicas',
      followers: '14.8k seguidores',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
          <Instagram size={24} />
        </div>
      ),
    },
    {
      id: 'tiktok',
      name: 'TikTok da Escola',
      handle: '@tuttiescolademusica',
      url: 'https://tiktok.com/@tuttiescolademusica',
      copyValue: '@tuttiescolademusica',
      description: 'Vídeos curtos de 30s com técnicas rápidas, dedilhados de sax e desafios musicais.',
      color: 'from-cyan-400 via-rose-500 to-slate-900',
      badge: 'Vídeos Curtos',
      followers: '32.5k seguidores',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-rose-500/30" />
          <Music2 size={24} className="relative z-10 text-cyan-300" />
        </div>
      ),
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Tutti',
      handle: '+55 (11) 99999-9999',
      url: `https://wa.me/5511999999999?text=${encodeURIComponent(
        'Olá! Vim através do site da Tutti Escola de Música e gostaria de tirar algumas dúvidas sobre os cursos e planos!'
      )}`,
      copyValue: '11999999999',
      description: 'Fale diretamente com nossa coordenação pedagógica para matrículas, suporte e aulas ao vivo.',
      color: 'from-emerald-500 to-teal-600',
      badge: 'Atendimento Rápido',
      followers: 'Online agora',
      icon: (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <MessageCircle size={24} />
        </div>
      ),
    },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    showToast(`Copiado para a área de transferência: ${text}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0b0d14] text-slate-100 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden my-auto">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors z-20 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header with Company Emblem */}
        <div className="text-center space-y-3 relative z-10 pt-2">
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-gradient-to-tr from-cyan-500/30 via-violet-500/30 to-emerald-500/30 border border-white/20 shadow-xl mb-1">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_kkz0gekkz0gekkz0_03cb0dc7.jfif"
              alt="Logo Tutti Escola de Música"
              className="w-16 h-16 rounded-full object-cover shadow-inner"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles size={12} className="text-cyan-400" />
            <span>Diretórios Oficiais Tutti</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-syne font-black text-white">
            Conecte-se com a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400">
              Tutti Escola de Música
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Siga nossas redes sociais para receber partituras, aulas em vídeo, novidades e fale diretamente conosco no WhatsApp.
          </p>
        </div>

        {/* Directories Cards */}
        <div className="space-y-3.5 relative z-10">
          {socialLinks.map((item) => {
            const isCopied = copiedKey === item.id;
            return (
              <div
                key={item.id}
                className="bg-[#131722] hover:bg-[#181e2c] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {item.icon}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-syne font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                        {item.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-semibold">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs font-mono font-semibold text-cyan-400">
                      {item.handle}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <button
                    onClick={() => handleCopy(item.copyValue, item.id)}
                    title="Copiar usuário ou número"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-300 text-[11px]">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span className="hidden sm:inline text-[11px]">Copiar</span>
                      </>
                    )}
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 text-black hover:opacity-90 font-syne font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <span>Acessar</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info banner */}
        <div className="bg-[#08090e] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-cyan-400" />
            <span>Compartilhe a Tutti com amigos músicos</span>
          </div>
          <button
            onClick={() => handleCopy(window.location.origin, 'website')}
            className="text-cyan-400 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            {copiedKey === 'website' ? 'Link Copiado!' : 'Copiar Link do Site'}
          </button>
        </div>
      </div>
    </div>
  );
};
