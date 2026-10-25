import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw, Volume2, Music, CheckCircle2, Zap, Lock } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';
import { useAppRouter } from '../../App';

interface Message {
  id: string;
  sender: 'user' | 'maestro';
  text: string;
  timestamp: string;
  suggestedChords?: string[];
}

interface MaestroPanelProps {
  currentInstrument?: string;
  currentLessonContext?: string;
  compact?: boolean;
}

export const MaestroPanel: React.FC<MaestroPanelProps> = ({
  currentInstrument = 'Violão',
  currentLessonContext = '',
  compact = false
}) => {
  const { userPlan, openPlansModal } = useAppRouter();
  const FREE_DAILY_LIMIT = 5;

  const getTodayKey = () => `tutti_maestro_usage_${new Date().toISOString().slice(0, 10)}`;

  const [dailyUsage, setDailyUsage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(getTodayKey());
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const remainingFreeMessages = Math.max(0, FREE_DAILY_LIMIT - dailyUsage);
  const isLimitReached = userPlan === 'free' && dailyUsage >= FREE_DAILY_LIMIT;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'maestro',
      text: `Olá! Sou o **Maestro Lucas**, seu mentor de música no Tutti ♪. Estou aqui para tirar suas dúvidas de harmonia, técnica de ${currentInstrument}, afinação, levadas e criar exercícios para a sua prática hoje. Como posso te guiar?`,
      timestamp: 'Agora'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const promptSuggestions = [
    'Qual o campo harmônico de Sol Maior?',
    'Dicas de respiração diafragmática para sopro e canto',
    'Como improvisar sobre Autumn Leaves?',
    'Exercícios diários de 15 min com metrônomo',
    'Como trocar de acorde mais rápido?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    if (isLimitReached) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'maestro',
          text: `⚠️ **Limite de perguntas diárias atingido (Plano Grátis)**\n\nVocê utilizou todas as 5 perguntas gratuitas de hoje com o Maestro Lucas.\n\nPara ter acesso **ILIMITADO** a qualquer hora e mentoria musical completa sem limites, faça o upgrade para o **Tutti Pro**!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // If on free plan, increment usage count
    if (userPlan === 'free') {
      const nextUsage = dailyUsage + 1;
      setDailyUsage(nextUsage);
      try {
        localStorage.setItem(getTodayKey(), String(nextUsage));
      } catch (e) {
        console.warn('Usage storage error:', e);
      }
    }

    try {
      const response = await fetch('/api/maestro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          instrument: currentInstrument,
          level: 'Intermediário',
          context: currentLessonContext
        })
      });

      if (!response.ok) throw new Error('Falha ao comunicar com o Maestro');
      const data = await response.json();

      const maestroMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'maestro',
        text: data.reply || 'Continue praticando com foco e constância!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, maestroMessage]);
    } catch (err) {
      console.warn('Maestro fetch fallback:', err);
      // Client-side fallback
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'maestro',
            text: `🎵 **Dica do Maestro para ${currentInstrument}:** Lembre-se de manter os ombros relaxados e utilizar o metrônomo a 60 BPM para fixar o tempo. Divida a frase difícil em 2 notas por vez e pratique devagar antes de acelerar!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 600);
    } finally {
      setIsLoading(false);
    }
  };

  const playDemoChordProgression = () => {
    // Play warm I-vi-IV-V progression
    const sequence = [
      { note: 'C4', duration: 1 },
      { note: 'A3', duration: 1 },
      { note: 'F3', duration: 1 },
      { note: 'G3', duration: 1 }
    ];
    audioEngine.playMelody(sequence, 90, 'piano');
  };

  return (
    <div className={`bg-[#131722] border border-cyan-500/25 rounded-2xl flex flex-col shadow-2xl overflow-hidden ${compact ? 'h-[460px]' : 'h-[540px]'}`}>
      {/* Header */}
      <div className="bg-[#0b0d14] px-4 sm:px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-600 flex items-center justify-center text-white glow">
              <Sparkles size={18} />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0b0d14]"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-syne font-bold text-white text-sm">Maestro Lucas</h3>
              <span className="text-[10px] bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-extrabold px-2 py-0.5 rounded-full">
                Mentor IA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Mestre musical inteligente com mentoria personalizada</p>
          </div>
        </div>

        {/* Plan & Usage indicator badge */}
        <div className="flex items-center gap-2">
          {userPlan === 'free' ? (
            <button
              onClick={openPlansModal}
              className={`text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isLimitReached
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-white/5 text-slate-300 hover:text-cyan-300 border-white/10 hover:border-cyan-400/40'
              }`}
              title="Clique para desbloquear perguntas ilimitadas"
            >
              <Zap size={12} className={isLimitReached ? 'text-rose-400' : 'text-amber-400'} />
              <span>
                {isLimitReached
                  ? '0/5 Hoje • Liberar Pro'
                  : `${remainingFreeMessages} de ${FREE_DAILY_LIMIT} grátis hoje`}
              </span>
            </button>
          ) : (
            <div className="text-[11px] px-3 py-1 rounded-full font-bold bg-gradient-to-r from-violet-600/30 to-cyan-500/30 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-300" />
              <span>IA Ilimitada ({userPlan.toUpperCase()})</span>
            </div>
          )}

          <button
            onClick={playDemoChordProgression}
            title="Tocar progressão harmônica demonstrativa"
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Volume2 size={14} />
            <span className="hidden sm:inline">Exemplo</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isMaestro = m.sender === 'maestro';
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isMaestro ? 'justify-start' : 'justify-end'}`}
            >
              {isMaestro && (
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0 flex items-center justify-center font-bold text-xs mt-1">
                  <Bot size={15} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  isMaestro
                    ? 'bg-[#0b0d14] text-slate-200 border border-white/10'
                    : 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-medium ml-auto'
                }`}
              >
                {/* Formatting markdown paragraphs */}
                <div className="whitespace-pre-line space-y-1">
                  {m.text.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx} className="break-words">
                      {paragraph.split('**').map((chunk, cIdx) => 
                        cIdx % 2 === 1 ? <strong key={cIdx} className="text-white font-bold">{chunk}</strong> : chunk
                      )}
                    </p>
                  ))}
                </div>

                {/* If this is the limit message, render upgrade CTA button */}
                {isMaestro && m.text.includes('Limite de perguntas diárias atingido') && (
                  <div className="pt-3">
                    <button
                      onClick={openPlansModal}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-syne font-bold text-xs flex items-center gap-1.5 shadow-md shadow-violet-500/30 hover:opacity-90 active:scale-95 cursor-pointer"
                    >
                      <Zap size={14} />
                      <span>Conhecer Assinatura Tutti Pro</span>
                    </button>
                  </div>
                )}

                <div className="mt-1 text-[10px] text-slate-400 text-right">{m.timestamp}</div>
              </div>
              {!isMaestro && (
                <div className="w-7 h-7 rounded-full bg-violet-600/30 text-violet-300 flex-shrink-0 flex items-center justify-center font-bold text-xs mt-1">
                  <User size={14} />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-slate-400 text-xs py-2">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-spin">
              <RefreshCw size={14} />
            </div>
            <span>Maestro IA está analisando sua pergunta musical...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Free Plan Limit Notice Bar if reached */}
      {isLimitReached && (
        <div className="px-4 py-2 bg-gradient-to-r from-violet-950/80 to-slate-900 border-t border-violet-500/30 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-rose-400" />
            <span>Limite diário do plano Grátis atingido (5/5).</span>
          </div>
          <button
            onClick={openPlansModal}
            className="text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Assinar Tutti Pro</span>
            <Sparkles size={12} />
          </button>
        </div>
      )}

      {/* Quick Prompts Chips */}
      {!isLimitReached && (
        <div className="px-4 py-2 bg-[#0b0d14]/70 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
          {promptSuggestions.map((suggestion, sIdx) => (
            <button
              key={sIdx}
              onClick={() => handleSend(suggestion)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border border-white/10 transition-colors cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-[#0b0d14] border-t border-white/10 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLimitReached}
          placeholder={
            isLimitReached
              ? 'Limite de 5 perguntas atingido. Assine o Tutti Pro para continuar.'
              : `Pergunte ao Maestro sobre ${currentInstrument}, harmonia, técnica...`
          }
          className="flex-1 bg-[#131722] text-white border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading || isLimitReached}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-600 text-black font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center glow cursor-pointer"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
