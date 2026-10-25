import React, { useState, useEffect, createContext, useContext, useMemo, useRef } from 'react';
import { 
  Home, Music, BookOpen, ShoppingBag, User, 
  Search, Play, MessageSquare, ShoppingCart, 
  Star, CheckCircle2, Menu, X, ArrowRight,
  Headphones, Book, Users, Calendar, Sparkles,
  Volume2, VolumeX, Activity, Radio, Award,
  Flame, Clock, Check, Layers, ChevronRight,
  Folder, HardDrive, Sun, Moon, Video, Edit3, Image as ImageIcon, ExternalLink,
  Plus, Link as LinkIcon, Lock, Mic, Square, Heart, MessageCircle, Share2
} from 'lucide-react';

import { 
  INSTRUMENTS, SHEETS_CATALOG, LESSONS_DATABASE, 
  STORE_PRODUCTS, MASTERCLASSES, COMMUNITY_POSTS,
  Instrument, SheetMusic, Lesson, Product 
} from './data/musicData';
import { audioEngine } from './services/audioEngine';
import { VirtualKeyboard } from './components/AudioTools/VirtualKeyboard';
import { MetronomeModal } from './components/AudioTools/MetronomeModal';
import { TunerModal } from './components/AudioTools/TunerModal';
import { MaestroPanel } from './components/MaestroIA/MaestroPanel';
import { SheetViewerModal } from './components/SheetMusic/SheetViewerModal';
import { LocalSheetLibrary } from './components/SheetMusic/LocalSheetLibrary';
import { CheckoutModal } from './components/Store/CheckoutModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/Auth/AuthModal';
import { supabase, SUPABASE_PROJECT_ID } from './services/supabase';
import { SaxophoneStudio } from './components/Studio/SaxophoneStudio';
import { GuitarStudio } from './components/Studio/GuitarStudio';
import { KeyboardStudio } from './components/Studio/KeyboardStudio';
import { CommunityFeed } from './components/Community/CommunityFeed';
import { PlansModal } from './components/Subscription/PlansModal';
import { SocialModal } from './components/Social/SocialModal';

// --- ROUTER CONTEXT ---
interface RouterContextType {
  currentPath: string;
  queryParams: Record<string, string>;
  navigate: (path: string, params?: Record<string, string>) => void;
  openMetronome: () => void;
  openTuner: () => void;
  openSheetViewer: (sheet: SheetMusic) => void;
  openAuthModal: () => void;
  openPlansModal: () => void;
  openSocialModal: () => void;
  userPlan: 'free' | 'pro' | 'ultra';
  setUserPlan: (plan: 'free' | 'pro' | 'ultra') => void;
  cart: { product: Product; quantity: number }[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  openCheckout: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  userStats: {
    xp: number;
    streakDays: number;
    practiceHours: number;
    completedLessons: number;
  };
  completeTask: (xpGain: number) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

export const useAppRouter = () => {
  const context = useContext(RouterContext);
  if (!context) throw new Error("useAppRouter must be used within RouterProvider");
  return context;
};

// SEO helper
const useSEO = (title: string, description: string) => {
  useEffect(() => {
    document.title = `${title} | Tutti ♪`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
  }, [title, description]);
};

// --- HEADER COMPONENT ---
const Header: React.FC = () => {
  const { 
    currentPath, navigate, openMetronome, openTuner, 
    cart, openCheckout, openAuthModal, openPlansModal, userPlan,
    theme, toggleTheme 
  } = useAppRouter();
  const { user, profile } = useAuth();
  const totalCartCount = cart.reduce((acc, c) => acc + c.quantity, 0);

  const navLinks: { path: string; label: string; badge?: string }[] = [
    { path: '/', label: 'Início' },
    { path: '/aulas', label: 'Aulas' },
    { path: '/partituras', label: 'Partituras' },
    { path: '/estudio', label: 'Estúdio & Instrumentos' },
    { path: '/agenda', label: 'Agenda de Aula' },
    { path: '/comunidade', label: 'Comunidade' },
    { path: '/loja', label: 'Loja', badge: 'Em Breve' },
  ];

  const displayName = profile?.displayName || user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Rafael Drumond';
  const photoUrl = profile?.photoURL || user?.user_metadata?.avatar_url;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#0b0d14]/90 backdrop-blur-md border-b border-white/10 z-40 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Brand Logo */}
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('/')}
      >
        <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-cyan-500/15 group-hover:scale-105 transition-transform bg-[#131722] flex items-center justify-center">
          <img
            src="/assets/aistudio/logo_tutti_dark.jpg"
            alt="Logo Tutti Escola de Música"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <span className="text-2xl font-black font-syne tracking-tight text-white">
            Tutti
          </span>
        </div>
      </div>

      {/* Center Nav for Desktop */}
      <nav className="hidden xl:flex items-center gap-1 bg-[#131722] p-1.5 rounded-full border border-white/10 shadow-inner">
        {navLinks.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentPath === item.path
                ? 'bg-gradient-to-r from-cyan-400 to-violet-600 text-black shadow-md shadow-cyan-500/20 font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                currentPath === item.path 
                  ? 'bg-black/30 text-black font-black' 
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right Quick Tools: Theme Toggle, Metronome, Tuner, Cart, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Screen Color Toggle (Preto ⇄ Branco) */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? "Mudar tela para Preto (Modo Escuro)" : "Mudar tela para Branco (Modo Claro)"}
          className="p-2.5 rounded-xl bg-[#131722] hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
        >
          {theme === 'light' ? (
            <Moon size={18} className="text-violet-400" />
          ) : (
            <Sun size={18} className="text-amber-400" />
          )}
        </button>

        {/* Metronome quick launcher */}
        <button
          onClick={openMetronome}
          title="Abrir Metrônomo Studio"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#131722] hover:bg-white/10 text-slate-300 hover:text-cyan-400 border border-white/10 text-xs font-bold transition-colors"
        >
          <Activity size={16} className="text-cyan-400" />
          <span>Metrônomo</span>
        </button>

        {/* Tuner quick launcher */}
        <button
          onClick={openTuner}
          title="Abrir Afinador"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#131722] hover:bg-white/10 text-slate-300 hover:text-emerald-400 border border-white/10 text-xs font-bold transition-colors"
        >
          <Radio size={16} className="text-emerald-400" />
          <span>Afinador</span>
        </button>

        {/* Assinatura Tutti Pro button */}
        <button
          onClick={openPlansModal}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/20 active:scale-95 cursor-pointer border border-violet-400/30"
          title="Conhecer Assinatura Tutti Pro"
        >
          <Sparkles size={14} className="text-amber-300" />
          <span>{userPlan === 'pro' ? 'Tutti Pro' : userPlan === 'ultra' ? 'Tutti Ultra' : 'Planos Pro'}</span>
        </button>

        {/* Cart button */}
        <button
          onClick={openCheckout}
          className="relative p-2.5 rounded-xl bg-[#131722] hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          title="Ver Carrinho"
        >
          <ShoppingCart size={18} />
          {totalCartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-[11px] font-black flex items-center justify-center shadow-md">
              {totalCartCount}
            </span>
          )}
        </button>

        {/* Auth / Profile trigger */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/perfil')}
            className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all border ${
              currentPath === '/perfil'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-[#131722] hover:bg-white/10 border-white/10 text-white'
            }`}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full border border-cyan-400 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-600 flex items-center justify-center text-black font-bold text-xs">
                {initials || 'RD'}
              </div>
            )}
            <span className="hidden md:inline text-xs font-bold">
              {displayName.split(' ')[0]}
            </span>
          </button>

          <button
            onClick={openAuthModal}
            title={user ? "Gerenciar Conta Supabase" : "Entrar no Supabase"}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400 border border-white/10 text-xs font-bold transition-colors"
          >
            <User size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

// --- MOBILE NAVIGATION BAR ---
const MobileNav: React.FC = () => {
  const { currentPath, navigate, openMetronome, openTuner } = useAppRouter();

  const items = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/aulas', icon: Play, label: 'Aulas' },
    { path: '/partituras', icon: Music, label: 'Partituras' },
    { path: '/estudio', icon: Headphones, label: 'Estúdio' },
    { path: '/perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-[#0b0d14]/95 backdrop-blur-lg border-t border-white/10 pb-safe z-40">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
                isActive ? 'text-cyan-400 scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// --- PAGES ---

// 1. HOME PAGE
const HomePage: React.FC = () => {
  const { navigate, openSheetViewer, theme, toggleTheme, openPlansModal, openSocialModal } = useAppRouter();
  useSEO("Início", "Aprenda Saxofone, Teclado, Violão, Canto, Bateria e Violino com o Maestro Lucas.");

  const playDemoSound = (note: string) => {
    audioEngine.playNote(note, 0.8, 'sax');
  };

  return (
    <div className="space-y-24 animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 flex flex-col-reverse lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-center lg:text-left">

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-1">
              Plataforma de Música Digital
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-syne font-black tracking-tight leading-tight text-white">
              Tutti
            </h1>
          </div>

          {/* BOTÃO EM BAIXO DO TUTTI: Troca de cor da tela (Preto ⇄ Branco) */}
          <div className="flex justify-center lg:justify-start pt-1 pb-1">
            <button
              onClick={toggleTheme}
              className={`inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer border transform hover:scale-102 active:scale-98 ${
                theme === 'light'
                  ? 'bg-slate-900 !text-white hover:bg-slate-800 border-slate-700 shadow-slate-900/15'
                  : 'bg-white text-slate-950 hover:bg-slate-100 border-white/30 shadow-white/10'
              }`}
              title="Clique para alternar a cor da tela entre preto e branco"
            >
              {theme === 'light' ? (
                <>
                  <Moon size={19} className="text-violet-400 animate-pulse" />
                  <span className="font-extrabold tracking-tight !text-white">Trocar Cor da Tela: Ficar Preto (Modo Escuro)</span>
                </>
              ) : (
                <>
                  <Sun size={19} className="text-amber-500 animate-spin-slow" />
                  <span className="font-extrabold tracking-tight text-slate-950">Trocar Cor da Tela: Ficar Branco (Modo Claro)</span>
                </>
              )}
            </button>
          </div>

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Aprenda a tocar do zero ou aprimore sua técnica com aulas estruturadas, biblioteca de partituras interativas, estúdio virtual com digitações completas e mentoria com o Maestro Lucas.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
            <button
              onClick={() => navigate('/aulas')}
              className="px-8 py-4 rounded-2xl font-syne font-black text-base bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-600 text-black hover:opacity-90 transition-all shadow-xl shadow-cyan-500/25 glow flex items-center justify-center gap-2 cursor-pointer"
            >
              Começar Aulas Grátis <ArrowRight size={18} />
            </button>
            <button
              onClick={openPlansModal}
              className="px-6 py-4 rounded-2xl font-syne font-bold text-base bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:opacity-90 text-white border border-violet-400/30 transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-500/20 cursor-pointer"
            >
              <Sparkles size={18} className="text-amber-300" />
              <span>Conhecer Assinatura Tutti Pro</span>
            </button>
            <button
              onClick={() => navigate('/estudio')}
              className="px-6 py-4 rounded-2xl font-syne font-bold text-base bg-[#131722] hover:bg-white/10 text-white border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Abrir Estúdio & Acordes
            </button>
          </div>

          {/* Highlights metrics */}
          <div className="pt-4 flex flex-wrap justify-center lg:justify-start gap-8 border-t border-white/10">
            <div>
              <div className="text-2xl font-syne font-black text-white">+15.000</div>
              <div className="text-xs text-slate-400 font-medium">Alunos ativos no Brasil</div>
            </div>
            <div>
              <div className="text-2xl font-syne font-black text-cyan-400">100%</div>
              <div className="text-xs text-slate-400 font-medium">Didática prática e interativa</div>
            </div>
            <div>
              <div className="text-2xl font-syne font-black text-emerald-400">4.9 / 5.0</div>
              <div className="text-xs text-slate-400 font-medium">Avaliação da comunidade</div>
            </div>
          </div>
        </div>

        {/* Hero Visual: Logo Oficial Tutti Escola de Música (Imagem cheia, sem borda ao redor, redes em oculto) */}
        <div className="flex-1 relative w-full max-w-lg lg:max-w-none flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-violet-500/20 to-emerald-500/15 blur-[90px] rounded-full pointer-events-none"></div>
          
          <div 
            onClick={openSocialModal}
            title="Tutti Escola de Música"
            className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full overflow-hidden shadow-2xl group cursor-pointer transition-all duration-300 active:scale-98 select-none"
          >
            <img
              src="/assets/aistudio/logo_tutti_dark.jpg"
              alt="Logo Oficial Tutti Escola de Música"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </section>

      {/* Popular Instruments Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-5xl font-syne font-black text-white">
            Programas Populares & Cursos
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Desenvolvidos por mestres e concertistas para que você aprenda com a melhor ergonomia, repertório atraente e técnica impecável.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {INSTRUMENTS.map((inst) => (
            <div
              key={inst.id}
              onClick={() => navigate('/aulas', { instrument: inst.id })}
              className="group cursor-pointer bg-[#131722] rounded-3xl border border-white/10 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 hover:-translate-y-2 shadow-xl flex flex-col justify-between"
            >
              <div className="h-44 bg-[#0b0d14] relative flex items-center justify-center overflow-hidden">
                {inst.image ? (
                  <img
                    src={inst.image}
                    alt={inst.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <>
                    <div className={`absolute inset-0 bg-gradient-to-tr ${inst.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                    <span className="text-7xl group-hover:scale-125 group-hover:rotate-6 transition-transform duration-500">
                      {inst.emoji}
                    </span>
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#131722] via-black/20 to-transparent opacity-75 pointer-events-none"></div>
                <span className="absolute top-3 right-3 text-[10px] font-bold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15 z-10 shadow-sm">
                  {inst.family}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-2xl font-syne font-black text-white group-hover:text-cyan-400 transition-colors">
                    {inst.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-semibold mb-2">
                    {inst.teacher} • <span className="text-emerald-400">{inst.tuning}</span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {inst.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold text-cyan-400">
                  <span>Acessar Trilha de Estudos</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Virtual Studio Keyboard Showcase */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Estúdio Prático Tutti</span>
            <h2 className="text-3xl sm:text-4xl font-syne font-black text-white">Experimente Tocar Agora</h2>
            <p className="text-slate-400 text-sm">Toque notas, acordes e teste o sintetizador com timbres de Piano, Sax e Violão.</p>
          </div>
          <button
            onClick={() => navigate('/estudio')}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold inline-flex items-center gap-2 self-start sm:self-auto"
          >
            Abrir Estúdio Completo <ArrowRight size={14} />
          </button>
        </div>

        <VirtualKeyboard compact />
      </section>

      {/* Featured Sheets of the Week */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Acervo Musical</span>
            <h2 className="text-3xl sm:text-4xl font-syne font-black text-white">Partituras em Destaque</h2>
            <p className="text-slate-400 text-sm">Com áudio interativo, transposição de tom e integração da pasta do computador.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/partituras', { tab: 'local' })}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 hover:text-black text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-cyan-500/30"
            >
              <Folder size={14} /> Pasta Local (Área de Trabalho/música)
            </button>
            <button
              onClick={() => navigate('/partituras', { tab: 'online' })}
              className="text-sm font-bold text-cyan-400 hover:underline flex items-center gap-1 px-2 py-1"
            >
              Ver acervo online ({SHEETS_CATALOG.length}) <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHEETS_CATALOG.slice(0, 3).map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => openSheetViewer(sheet)}
              className="bg-[#131722] hover:bg-[#191f2e] border border-white/10 hover:border-cyan-400/50 rounded-3xl p-6 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-3xl font-serif group-hover:scale-110 transition-transform">
                    𝄞
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-bold border border-white/10">
                      {sheet.level}
                    </span>
                    <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      YouTube Sincronizado
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-syne font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                  {sheet.title}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mb-3">
                  {sheet.composer} • {sheet.instrument}
                </p>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                  <span>Tom: {sheet.tonality}</span>
                  <span>•</span>
                  <span>{sheet.tempo} BPM</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 group-hover:underline flex items-center gap-1">
                  <Play size={13} fill="currentColor" /> Visualizar & Tocar com YouTube
                </span>
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-400 group-hover:text-black transition-colors shadow-sm">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Local Folder Music Integration Banner */}
      <section className="banner-dark bg-gradient-to-r from-[#131722] via-[#161f30] to-[#131722] p-8 sm:p-10 rounded-3xl border border-cyan-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold">
            <HardDrive size={14} className="text-cyan-400" />
            <span>Biblioteca de Partituras do Computador</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-syne font-black text-white">
            Suas Partituras Locais integradas ao Tutti ♪
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Selecione a pasta <code className="text-cyan-300 font-mono text-xs bg-[#0b0d14] px-2 py-0.5 rounded border border-white/10">Área de Trabalho/música</code> para visualizar, exportar e organizar instantaneamente seus arquivos de <strong>Sax Alto</strong>, <strong>Sax Tenor</strong>, <strong>Flauta</strong>, <strong>Trompete</strong> e <strong>Trombone</strong> com segurança 100% local e sem envio para servidores externos.
          </p>
        </div>
        <button
          onClick={() => navigate('/partituras', { tab: 'local' })}
          className="px-6 py-3.5 rounded-2xl font-syne font-black text-sm bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-600 text-black hover:opacity-90 transition-all flex items-center gap-2 flex-shrink-0 shadow-lg glow"
        >
          <Folder size={18} />
          <span>Acessar Biblioteca Local</span>
        </button>
      </section>

      {/* Masterclass Banner */}
      <section className="banner-dark bg-gradient-to-r from-violet-950/60 via-[#131722] to-cyan-950/60 p-8 sm:p-12 rounded-3xl border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider inline-block">
            🔴 Ao Vivo Hoje às 20h
          </span>
          <h3 className="text-3xl sm:text-4xl font-syne font-black text-white">
            Oficina Ao Vivo: Saúde Vocal e Alta Performance
          </h3>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Com a fonoaudióloga e cantora Dra. Mariana Sales. Aprenda técnicas para afinar com facilidade, expandir sua extensão e proteger a musculatura vocal.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/agenda')}
              className="px-6 py-3 rounded-xl font-syne font-bold text-sm bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-opacity"
            >
              Garantir Minha Vaga Grátis
            </button>
            <button
              onClick={() => navigate('/agenda')}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold border border-white/10 transition-colors"
            >
              Ver Grade Completa
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

// 2. AULAS PAGE
const AulasPage: React.FC = () => {
  const { queryParams, navigate, completeTask, showToast, openPlansModal } = useAppRouter();
  const { saveLessonProgressToDb, addXp } = useAuth();
  const currentInstId = queryParams.instrument || 'sax';
  const instrument = INSTRUMENTS.find(i => i.id === currentInstId) || INSTRUMENTS[0];
  const lessons = LESSONS_DATABASE[instrument.id] || LESSONS_DATABASE.sax;

  const [activeLesson, setActiveLesson] = useState<Lesson>(lessons[0]);
  const [activeTab, setActiveTab] = useState<'video' | 'tab' | 'exercises' | 'maestro'>('video');
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoProgress, setVideoProgress] = useState<number>(35);

  useSEO(`Aulas de ${instrument.name}`, `Aprenda ${instrument.name} do zero ao avançado com o Tutti.`);

  useEffect(() => {
    setActiveLesson(lessons[0]);
  }, [instrument.id]);

  const toggleTask = async (taskId: string) => {
    let updated: string[];
    if (completedTaskIds.includes(taskId)) {
      updated = completedTaskIds.filter(id => id !== taskId);
      setCompletedTaskIds(updated);
    } else {
      updated = [...completedTaskIds, taskId];
      setCompletedTaskIds(updated);
      completeTask(25);
      await addXp(25);
      showToast('Exercício concluído! +25 XP sincronizado no Supabase 🎉');
    }
    await saveLessonProgressToDb(String(activeLesson.id), instrument.id, updated);
  };

  const playLessonDemoMelody = () => {
    if (isPlayingDemo) {
      audioEngine.stopMelody();
      setIsPlayingDemo(false);
    } else {
      setIsPlayingDemo(true);
      const timbre = instrument.id === 'sax' ? 'sax' : instrument.id === 'violao' ? 'guitar' : 'piano';
      audioEngine.playMelody(
        activeLesson.demoMelody,
        90,
        timbre,
        undefined,
        () => setIsPlayingDemo(false)
      );
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Instrument Switcher Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10 no-scrollbar">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            onClick={() => navigate('/aulas', { instrument: inst.id })}
            className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-all ${
              instrument.id === inst.id
                ? 'bg-gradient-to-r from-cyan-400 to-violet-600 text-black shadow-lg shadow-cyan-500/20 font-black'
                : 'bg-[#131722] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            <span>{inst.emoji}</span>
            <span>{inst.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Lesson Player & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simulated Video Player */}
          <div className="aspect-video bg-[#0b0d14] rounded-3xl border border-cyan-500/30 overflow-hidden relative shadow-2xl flex flex-col justify-between p-6">
            <div className="flex justify-between items-center z-10">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-white border border-white/10 flex items-center gap-1.5">
                <span>{instrument.emoji}</span> {activeLesson.module}
              </span>
              <span className="text-xs bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full font-bold">
                HD 1080p
              </span>
            </div>

            {/* Center Play Button & Poster */}
            <div className="flex flex-col items-center justify-center space-y-3 z-10">
              <div 
                onClick={playLessonDemoMelody}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center text-black cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl shadow-cyan-500/30 glow"
              >
                {isPlayingDemo ? <Square size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </div>
              <p className="text-xs font-bold text-slate-300 bg-black/60 px-4 py-1.5 rounded-full border border-white/10">
                {isPlayingDemo ? 'Tocando áudio da lição...' : 'Clique para ouvir o trecho prático da aula'}
              </p>
            </div>

            {/* Bottom Scrub Bar & Controls */}
            <div className="z-10 bg-black/70 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoProgress}
                  onChange={(e) => setVideoProgress(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-white/20 rounded"
                />
                <span className="text-[11px] font-mono text-slate-300 font-bold">
                  {Math.floor((videoProgress / 100) * 14)}:32 / {activeLesson.duration}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={playLessonDemoMelody}
                    className="text-cyan-400 hover:text-white font-bold"
                  >
                    {isPlayingDemo ? 'Pausar Áudio' : 'Ouvir Frase'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px]">Velocidade:</span>
                  {[0.75, 1, 1.25].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        playbackSpeed === speed ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Title & Module Info */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1">
              <span>{instrument.name}</span> • <span>Nível: {activeLesson.level}</span> • <span>Instrutor: {activeLesson.teacher}</span>
            </div>
            <h1 className="text-3xl font-syne font-black text-white mb-2">{activeLesson.title}</h1>
            <p className="text-sm text-slate-300 leading-relaxed">{activeLesson.summary}</p>
          </div>

          {/* Lesson Sub-tabs */}
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-white/10 pb-2">
              {[
                { id: 'video', label: '📖 Pontos Chave' },
                { id: 'tab', label: '🎼 Tablatura & Cifras' },
                { id: 'exercises', label: `✅ Exercícios (${completedTaskIds.length}/${activeLesson.practiceTasks.length})` },
                { id: 'maestro', label: '🤖 Maestro IA' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Pontos Chave */}
            {activeTab === 'video' && (
              <div className="bg-[#131722] p-5 rounded-2xl border border-white/10 space-y-3">
                <h4 className="font-syne font-bold text-white text-base">Orientações do Professor</h4>
                <ul className="space-y-2">
                  {activeLesson.keyPoints.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab: Tablatura / Cifras */}
            {activeTab === 'tab' && (
              <div className="bg-[#131722] p-5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-syne font-bold text-white text-base">Digitação & Acordes</h4>
                  <button
                    onClick={playLessonDemoMelody}
                    className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Volume2 size={14} /> Ouvir Digitação
                  </button>
                </div>
                <div className="bg-[#0b0d14] p-4 rounded-xl border border-white/10 font-mono text-cyan-400 text-sm whitespace-pre-wrap">
                  {activeLesson.tabSnippet}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeLesson.chords.map((ch, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-xl bg-white/5 text-slate-200 text-xs font-bold border border-white/10">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Exercícios */}
            {activeTab === 'exercises' && (
              <div className="bg-[#131722] p-5 rounded-2xl border border-white/10 space-y-3">
                <h4 className="font-syne font-bold text-white text-base">Desafios de Fixação</h4>
                <div className="space-y-2">
                  {activeLesson.practiceTasks.map((task) => {
                    const isDone = completedTaskIds.includes(task.id);
                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#0b0d14] border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDone ? 'bg-emerald-400 text-black' : 'border border-white/20'}`}>
                            {isDone && <Check size={16} />}
                          </div>
                          <span className={`text-sm ${isDone ? 'line-through text-slate-400' : 'font-medium'}`}>
                            {task.text}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-cyan-400">+25 XP</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Maestro IA */}
            {activeTab === 'maestro' && (
              <MaestroPanel
                currentInstrument={instrument.name}
                currentLessonContext={`${activeLesson.title} (${activeLesson.module})`}
                compact
              />
            )}
          </div>
        </div>

        {/* Sidebar: Lessons Playlist */}
        <div className="space-y-6">
          <div className="bg-[#131722] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-syne font-black text-xl text-white">Trilha de Aulas</h3>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 font-bold px-2.5 py-1 rounded-full">
                {lessons.length} aulas
              </span>
            </div>

            <div className="space-y-2.5">
              {lessons.map((lesson, idx) => {
                const isActive = activeLesson.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-[#0b0d14] border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                      isActive ? 'bg-cyan-400 text-black' : 'bg-white/10 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold line-clamp-1">{lesson.title}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <Clock size={12} /> {lesson.duration} • <span className="text-cyan-400">{lesson.level}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pro Upgrade Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-cyan-950/60 to-violet-950/60 border border-cyan-500/20 text-center space-y-2 mt-4">
              <Sparkles className="mx-auto text-cyan-400" size={20} />
              <div className="text-sm font-bold text-white">Desbloqueie +80 Aulas Avançadas</div>
              <p className="text-xs text-slate-400">
                Acesso irrestrito a masterclasses internacionais, acompanhamentos em áudio e mentoria com o Maestro IA.
              </p>
              <button
                onClick={openPlansModal}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-md"
              >
                Conhecer Assinatura Tutti Pro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. PARTITURAS PAGE
const PartiturasPage: React.FC = () => {
  const { openSheetViewer, queryParams } = useAppRouter();
  const [activeTab, setActiveTab] = useState<'local' | 'online'>(
    queryParams?.tab === 'online' ? 'online' : 'local'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFamily, setFilterFamily] = useState('Todas');
  const [filterLevel, setFilterLevel] = useState('Todos');
  const [filterGenre, setFilterGenre] = useState('Todos');

  useSEO(
    activeTab === 'local' ? "Biblioteca de Partituras Locais" : "Partituras Interativas",
    "Acesse partituras de Sax Alto, Sax Tenor, Flauta, Trompete e Trombone da pasta Área de Trabalho/música ou explore nosso acervo online."
  );

  const families = ['Todas', 'Metais', 'Teclas', 'Cordas', 'Voz'];
  const levels = ['Todos', 'Iniciante', 'Intermediário', 'Avançado'];
  const genres = ['Todos', 'Bossa Nova', 'Jazz Standard', 'Baião', 'Choro', 'Impressionismo', 'MPB'];

  const filteredSheets = useMemo(() => {
    return SHEETS_CATALOG.filter(sheet => {
      const matchSearch = sheet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sheet.composer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sheet.instrument.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFamily = filterFamily === 'Todas' || sheet.family === filterFamily;
      const matchLevel = filterLevel === 'Todos' || sheet.level === filterLevel;
      const matchGenre = filterGenre === 'Todos' || sheet.genre === filterGenre;
      return matchSearch && matchFamily && matchLevel && matchGenre;
    });
  }, [searchTerm, filterFamily, filterLevel, filterGenre]);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Biblioteca de Partituras</span>
        <h1 className="text-4xl sm:text-5xl font-syne font-black text-white">
          Biblioteca de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500">Partituras & Acervo</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Acesse partituras do seu computador (<code className="text-cyan-300 font-mono text-xs bg-[#131722] px-2 py-0.5 rounded border border-white/10">Área de Trabalho/música</code>) organizadas por instrumento ou estude com nosso acervo digital com áudio e transposição.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="bg-[#131722] p-1.5 rounded-2xl border border-white/10 inline-flex flex-wrap gap-2 shadow-xl">
          <button
            onClick={() => setActiveTab('local')}
            className={`px-5 py-2.5 rounded-xl font-syne font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'local'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-lg shadow-cyan-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Folder size={16} />
            <span>Biblioteca do Computador (Área de Trabalho/música)</span>
          </button>
          <button
            onClick={() => setActiveTab('online')}
            className={`px-5 py-2.5 rounded-xl font-syne font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'online'
                ? 'bg-gradient-to-r from-cyan-400 to-violet-600 text-black shadow-lg shadow-cyan-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Music size={16} />
            <span>Acervo Digital Tutti ({SHEETS_CATALOG.length} Partituras)</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'local' ? (
        <LocalSheetLibrary />
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Filter and Search Bar */}
          <div className="bg-[#131722] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por música, compositor (ex: Tom Jobim, Pixinguinha) ou instrumento..."
                className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Família</label>
                <select
                  value={filterFamily}
                  onChange={(e) => setFilterFamily(e.target.value)}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-cyan-400"
                >
                  {families.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nível de Dificuldade</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-cyan-400"
                >
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gênero Musical</label>
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-cyan-400"
                >
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Sheets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSheets.length > 0 ? (
              filteredSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  onClick={() => openSheetViewer(sheet)}
                  className="bg-[#131722] hover:bg-[#191f2e] border border-white/10 hover:border-cyan-400/50 rounded-3xl p-6 transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-3xl font-serif group-hover:scale-110 transition-transform">
                        𝄞
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        sheet.level === 'Iniciante' ? 'bg-emerald-500/20 text-emerald-400' :
                        sheet.level === 'Intermediário' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {sheet.level}
                      </span>
                    </div>

                    <h3 className="text-xl font-syne font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                      {sheet.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mb-2">
                      {sheet.composer} • {sheet.instrument}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {sheet.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-mono">
                      <strong className="text-white">{sheet.tonality}</strong> • {sheet.tempo} BPM
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-400 text-cyan-300 group-hover:text-black font-bold text-xs flex items-center gap-1.5 transition-colors">
                      <Play size={12} fill="currentColor" /> Abrir Partitura
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400 bg-[#131722] rounded-3xl border border-white/10">
                Nenhuma partitura encontrada com esses filtros. Tente pesquisar por outro título ou limpar as seleções.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 4. ESTÚDIO & INSTRUMENTOS INTERATIVOS PAGE
const EstudioPage: React.FC = () => {
  const { openMetronome, openTuner, queryParams } = useAppRouter();
  const initialInstrument = queryParams.instrument === 'sax' ? 'sax' : queryParams.instrument === 'guitar' ? 'violao' : 'sax';
  const [activeTab, setActiveTab] = useState<'sax' | 'violao' | 'teclado' | 'sintetizador' | 'maestro'>(initialInstrument as any);

  useSEO("Estúdio Virtual Tutti", "Dedilhado de saxofone até o altíssimo, dicionário de acordes de violão e teclado, sintetizador e mentoria com Maestro Lucas.");

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Laboratório Musical Prático</span>
        <h1 className="text-4xl sm:text-5xl font-syne font-black text-white">
          Estúdio <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500">Virtual Tutti</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Acesse o dedilhado do saxofone com chaves em vermelho até os superagudos, o dicionário de acordes de violão e teclado, sintetizador e mentoria com o Maestro Lucas.
        </p>
      </div>

      {/* Main Studio Instrument Switcher Tabs */}
      <div className="flex justify-center">
        <div className="bg-[#131722] p-1.5 rounded-2xl border border-white/10 inline-flex flex-wrap gap-1.5 shadow-xl max-w-full justify-center">
          <button
            onClick={() => setActiveTab('sax')}
            className={`px-5 py-3 rounded-xl font-syne font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sax'
                ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg shadow-red-500/25 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎷 Saxofone (Digitações & Altíssimo)</span>
          </button>

          <button
            onClick={() => setActiveTab('violao')}
            className={`px-5 py-3 rounded-xl font-syne font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'violao'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-lg shadow-cyan-500/25 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎸 Violão (Acordes M, m, 7M, 7, 9...)</span>
          </button>

          <button
            onClick={() => setActiveTab('teclado')}
            className={`px-5 py-3 rounded-xl font-syne font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'teclado'
                ? 'bg-gradient-to-r from-cyan-400 to-violet-600 text-black shadow-lg shadow-violet-500/25 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎹 Teclado (Acordes no Piano)</span>
          </button>

          <button
            onClick={() => setActiveTab('sintetizador')}
            className={`px-4 py-3 rounded-xl font-syne font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sintetizador'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎛️ Teclado Sintetizador Livre</span>
          </button>

          <button
            onClick={() => setActiveTab('maestro')}
            className={`px-4 py-3 rounded-xl font-syne font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'maestro'
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black shadow-lg shadow-cyan-500/25 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={15} />
            <span>Maestro Lucas</span>
          </button>
        </div>
      </div>

      {/* Quick Launch Cards for Metronome and Tuner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={openMetronome}
          className="bg-[#131722] hover:bg-[#191f2e] border border-cyan-500/20 hover:border-cyan-400 p-5 rounded-3xl cursor-pointer transition-all flex items-center gap-4 shadow-xl group"
        >
          <div className="w-13 h-13 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Activity size={26} />
          </div>
          <div>
            <h3 className="font-syne font-bold text-base text-white">Metrônomo Studio Pro</h3>
            <p className="text-xs text-slate-400">Compassos Simples, Compostos (6/8, 12/8) e Longos (4/2) com acentuações.</p>
          </div>
        </div>

        <div
          onClick={openTuner}
          className="bg-[#131722] hover:bg-[#191f2e] border border-emerald-500/20 hover:border-emerald-400 p-5 rounded-3xl cursor-pointer transition-all flex items-center gap-4 shadow-xl group"
        >
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Radio size={26} />
          </div>
          <div>
            <h3 className="font-syne font-bold text-base text-white">Afinador Tutti Pro</h3>
            <p className="text-xs text-slate-400">Captação via microfone em tempo real e gerador de tom padrão 440 Hz.</p>
          </div>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'sax' && (
        <SaxophoneStudio />
      )}

      {activeTab === 'violao' && (
        <GuitarStudio />
      )}

      {activeTab === 'teclado' && (
        <KeyboardStudio />
      )}

      {activeTab === 'sintetizador' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-syne font-bold text-xl text-white">Sintetizador & Teclado Multifuncional</h2>
            <span className="text-xs text-slate-400">Suporte a atalhos do teclado QWERTY</span>
          </div>
          <VirtualKeyboard />
        </div>
      )}

      {activeTab === 'maestro' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-syne font-bold text-xl text-white">Orientação com o Maestro Lucas</h2>
            <span className="text-xs text-cyan-400 font-semibold">Mentoria Musical com IA</span>
          </div>
          <MaestroPanel currentInstrument="Saxofone, Violão e Teclado" />
        </div>
      )}
    </div>
  );
};

// 5. AGENDA DE AULA PAGE (Agenda própria de cada aluno com Google Meet)
interface StudentLesson {
  id: string;
  studentName: string;
  instrument: string;
  topic: string;
  date: string;
  time: string;
  googleMeetUrl: string;
  instructor: string;
}

const AgendaPage: React.FC = () => {
  const { showToast, openPlansModal } = useAppRouter();
  const { user, profile } = useAuth();
  useSEO("Agenda de Aula", "Sua agenda própria e individual de aulas com link exclusivo do Google Meet.");

  const [lessons, setLessons] = useState<StudentLesson[]>(() => {
    try {
      const saved = localStorage.getItem('tutti_student_lessons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showProgrammerPanel, setShowProgrammerPanel] = useState<boolean>(false);
  const [newTopic, setNewTopic] = useState('');
  const [newInstrument, setNewInstrument] = useState('Saxofone Alto');
  const [newDate, setNewDate] = useState('25 de Outubro, 2026');
  const [newTime, setNewTime] = useState('19:30');
  const [newMeetCode, setNewMeetCode] = useState('https://meet.google.com/tut-musi-sax');

  const studentName = profile?.displayName || user?.user_metadata?.full_name || 'Aluno(a) Tutti';

  const handleGenerateMeetLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const p1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const p3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const generated = `https://meet.google.com/${p1}-${p2}-${p3}`;
    setNewMeetCode(generated);
    showToast('Novo link do Google Meet gerado com sucesso! 📹');
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) {
      showToast('Por favor, informe o conteúdo ou tema da aula.');
      return;
    }

    const created: StudentLesson = {
      id: `lesson_${Date.now()}`,
      studentName,
      instrument: newInstrument,
      topic: newTopic.trim(),
      date: newDate,
      time: newTime,
      googleMeetUrl: newMeetCode.startsWith('http') ? newMeetCode : `https://${newMeetCode}`,
      instructor: 'Programador / Professor Maestro'
    };

    const updated = [created, ...lessons];
    setLessons(updated);
    try {
      localStorage.setItem('tutti_student_lessons', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
    setNewTopic('');
    showToast('Aula adicionada pelo programador à sua agenda com Google Meet! 🎵');
  };

  const handleRemoveLesson = (id: string) => {
    const updated = lessons.filter(l => l.id !== id);
    setLessons(updated);
    try {
      localStorage.setItem('tutti_student_lessons', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
    showToast('Aula removida da sua agenda.');
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Aulas Individuais & Google Meet
        </span>
        <h1 className="text-4xl sm:text-5xl font-syne font-black text-white">
          Agenda de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500">Aula</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Esta agenda de aula é própria e individual de <strong>{studentName}</strong>. Suas aulas são adicionadas pelo programador/professor de acordo com a sua necessidade, com acesso direto via Google Meet.
        </p>
      </div>

      {/* Main Student Lessons Section */}
      {lessons.length === 0 ? (
        /* Empty State: Requested Message */
        <div className="bg-[#131722] p-10 sm:p-14 rounded-3xl border border-white/10 shadow-2xl text-center space-y-5 animate-in fade-in">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto text-4xl shadow-inner border border-cyan-500/20">
            📅
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-syne font-black text-2xl text-white">
              Você ainda não possui aulas
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              No momento você ainda não possui aulas agendadas. As aulas serão adicionadas pelo programador de acordo com a sua necessidade pedagógica, com um link exclusivo do Google Meet gerado para você entrar ao vivo.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowProgrammerPanel(prev => !prev)}
              className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-xs font-bold border border-white/10 transition-colors inline-flex items-center gap-2"
            >
              <span>{showProgrammerPanel ? 'Ocultar Painel do Programador' : 'Área do Programador (Adicionar Aula)'}</span>
            </button>
            <button
              onClick={openPlansModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/20 inline-flex items-center gap-2 cursor-pointer border border-violet-400/30"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>Conhecer Assinatura Tutti Pro</span>
            </button>
          </div>
        </div>
      ) : (
        /* List of Scheduled Lessons for This Student */
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Suas Aulas Agendadas ({lessons.length})
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={openPlansModal}
                className="text-xs text-violet-400 hover:text-violet-300 hover:underline font-bold flex items-center gap-1"
              >
                <Sparkles size={13} className="text-amber-300" />
                <span>Conhecer Assinatura Tutti Pro</span>
              </button>
              <button
                onClick={() => setShowProgrammerPanel(prev => !prev)}
                className="text-xs text-cyan-400 hover:underline font-bold"
              >
                {showProgrammerPanel ? 'Fechar Painel' : '+ Adicionar Nova Aula (Programador)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-[#131722] border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-5 hover:border-cyan-400/60 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                      ✓ Aula Agendada
                    </span>
                    <h3 className="text-xl font-syne font-bold text-white pt-1">
                      {lesson.topic}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Instrumento: <strong className="text-cyan-300">{lesson.instrument}</strong> • Aluno: {lesson.studentName}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveLesson(lesson.id)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Excluir aula da agenda"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-cyan-400" />
                    <span>Data: <strong className="text-white">{lesson.date}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-emerald-400" />
                    <span>Horário: <strong className="text-white">{lesson.time}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video size={15} className="text-rose-400" />
                    <span className="truncate">Google Meet: <strong className="text-cyan-400 font-mono text-[11px]">{lesson.googleMeetUrl}</strong></span>
                  </div>
                </div>

                <a
                  href={lesson.googleMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-2xl font-syne font-bold text-xs bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  <Video size={16} />
                  <span>Entrar na Aula pelo Google Meet</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Programmer Panel: To add lessons as needed with generated Google Meet links */}
      {showProgrammerPanel && (
        <div className="bg-[#0b0d14] p-6 sm:p-8 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-5 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                💻
              </span>
              <div>
                <h3 className="font-syne font-bold text-lg text-white">
                  Painel do Programador / Professor: Adicionar Aula
                </h3>
                <p className="text-xs text-slate-400">
                  Adicione uma aula sob medida para a agenda de <strong>{studentName}</strong> com link oficial do Google Meet.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowProgrammerPanel(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddLesson} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Tema / Conteúdo da Aula:
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Ex: Aula de Embocadura e Digitação de Sax Alto"
                  className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Instrumento:
                </label>
                <select
                  value={newInstrument}
                  onChange={(e) => setNewInstrument(e.target.value)}
                  className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                >
                  <option value="Saxofone Alto">Saxofone Alto</option>
                  <option value="Saxofone Tenor">Saxofone Tenor</option>
                  <option value="Flauta Transversal">Flauta Transversal</option>
                  <option value="Trombone de Vara">Trombone de Vara</option>
                  <option value="Trompete">Trompete</option>
                  <option value="Violão">Violão</option>
                  <option value="Teclado / Piano">Teclado / Piano</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Data:
                </label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder="Ex: 28 de Outubro, 2026"
                  className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Horário:
                </label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Ex: 19:30 BRT"
                  className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Google Meet Link Generator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  Link do Google Meet:
                </label>
                <button
                  type="button"
                  onClick={handleGenerateMeetLink}
                  className="text-cyan-400 hover:underline text-[11px] font-bold flex items-center gap-1"
                >
                  <span>🎲 Gerar Novo Código Meet</span>
                </button>
              </div>
              <input
                type="text"
                value={newMeetCode}
                onChange={(e) => setNewMeetCode(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowProgrammerPanel(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-xs font-black shadow-lg hover:opacity-90"
              >
                + Adicionar Aula à Agenda do Aluno
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 6. COMUNIDADE PAGE (Rede social completa tipo Facebook com fotos, vídeos e amigos)
const ComunidadePage: React.FC = () => {
  useSEO("Comunidade Tutti", "Conecte-se com alunos e músicos apaixonados: poste fotos, vídeos, faça amigos e compartilhe sua jornada.");

  return (
    <div className="space-y-6">
      <CommunityFeed />
    </div>
  );
};


// 7. LOJA PAGE (EM ESTRUTURAÇÃO / EM BREVE)
const LojaPage: React.FC = () => {
  const { navigate } = useAppRouter();
  useSEO("Loja Oficial Tutti - Em Breve", "Equipamentos, palhetas, boquilhas e instrumentos físicos em estruturação.");

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto py-8 sm:py-12 space-y-8 text-center pb-20">
      <div className="bg-[#131722] border border-cyan-500/30 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-600 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-cyan-500/20">
          🛍️
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Sparkles size={14} />
            <span>Novidade em Estruturação</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-syne font-black text-white tracking-tight">
            Loja Oficial Tutti <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Em Breve</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed pt-1">
            Estamos estruturando nossa loja física oficial com os melhores instrumentos, boquilhas artesanais, palhetas de alto nível e acessórios com curadoria exclusiva dos nossos professores e luthiers parceiros.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left max-w-3xl mx-auto">
          <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="text-2xl">🎷</div>
            <h4 className="font-syne font-bold text-white text-sm">Instrumentos Selecionados</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Saxofones, flautas transversais, trombones e teclados inspecionados e regulados antes do envio.
            </p>
          </div>

          <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="text-2xl">📦</div>
            <h4 className="font-syne font-bold text-white text-sm">Acessórios de Qualidade</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Palhetas importadas, boquilhas de precisão, correias ergonômicas, metrônomos e estojos.
            </p>
          </div>

          <div className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="text-2xl">🛡️</div>
            <h4 className="font-syne font-bold text-white text-sm">Garantia & Luthieria</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apoio de luthier profissional, nota fiscal e envio seguro para todo o território nacional.
            </p>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/partituras')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-syne font-bold text-xs bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
          >
            <Music size={16} />
            <span>Explorar Biblioteca de Partituras</span>
          </button>

          <button
            onClick={() => navigate('/aulas')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-syne font-bold text-xs bg-[#0b0d14] hover:bg-white/10 text-white border border-white/15 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <BookOpen size={16} />
            <span>Ver Aulas Disponíveis</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 8. PERFIL PAGE
const PerfilPage: React.FC = () => {
  const { userStats, showToast, openAuthModal, openPlansModal, userPlan } = useAppRouter();
  const { user, profile, savePracticeAudio } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useSEO("Meu Perfil", "Acompanhe seu progresso de estudos, conquistas e gravações.");

  const startPracticeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        await savePracticeAudio(
          profile?.currentInstrument || 'Saxofone',
          15,
          audioUrl,
          'Autoavaliação salva no Supabase'
        );
        showToast('Gravação de prática salva com sucesso no Supabase! Ouça abaixo.');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Rec error:', err);
      showToast('Permissão de microfone necessária para gravar seu treino.');
    }
  };

  const stopPracticeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>(() => {
    return localStorage.getItem('tutti_custom_display_name') || profile?.displayName || user?.user_metadata?.full_name || 'Rafael Drumond';
  });
  const maxBioLength = 350;
  const [profileBio, setProfileBio] = useState<string>(() => {
    return localStorage.getItem('tutti_custom_bio') || profile?.bio || 'Músico e estudante apaixonado por Saxofone Alto e Harmonia Brasileira. Praticando diariamente no Tutti ♪';
  });
  const [profileInstrument, setProfileInstrument] = useState<string>(() => {
    return localStorage.getItem('tutti_custom_instrument') || profile?.currentInstrument || 'Saxofone Alto';
  });

  const [archivedTab, setArchivedTab] = useState<'all' | 'photos' | 'videos'>('all');

  // Load user posts from community feed
  const [userArchivedPosts, setUserArchivedPosts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('tutti_community_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter((p: any) => p.isCurrentUser || p.author?.includes('Rafael') || p.author?.includes(profileName));
        if (filtered.length > 0) return filtered;
      }
    } catch {
      // fallback
    }
    // Default sample user archived publications
    return [
      {
        id: 'u_post_1',
        content: 'Treinando escalas pentatônicas e arpejos em Si Menor no Sax Alto. Timbre ficando muito mais encorpado e o ataque staccato bem limpo!',
        imageUrl: '/assets/instruments/alto_sax.jpg',
        timeAgo: 'Ontem às 18:40',
        likes: 38,
        comments: 5
      },
      {
        id: 'u_post_2',
        content: 'Execução do solo de Autumn Leaves com o play-along sincronizado do Tutti. Transição entre o ii-V-I maior e menor dominada!',
        videoUrl: 'https://www.youtube.com/watch?v=PPHtQn3LjbQ',
        timeAgo: 'Há 3 dias',
        likes: 54,
        comments: 11
      }
    ];
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('tutti_custom_display_name', profileName.trim());
    localStorage.setItem('tutti_custom_bio', profileBio.trim());
    localStorage.setItem('tutti_custom_instrument', profileInstrument);
    setIsEditingProfile(false);
    showToast('Perfil atualizado com sucesso! ✓');
  };

  const effectiveDisplayName = profileName;
  const effectivePhotoUrl = profile?.photoURL || user?.user_metadata?.avatar_url;
  const effectiveXp = profile?.xp ?? userStats.xp;
  const effectiveStreak = profile?.streakDays ?? userStats.streakDays;
  const effectiveHours = profile?.practiceHours ?? userStats.practiceHours;
  const effectiveLessons = profile?.completedLessons ?? userStats.completedLessons;
  const effectiveLevel = profile?.level || 'Nível 4: Músico Intermediário';
  const effectiveInstrument = profileInstrument;

  const filteredArchive = userArchivedPosts.filter(p => {
    if (archivedTab === 'photos') return !!p.imageUrl;
    if (archivedTab === 'videos') return !!p.videoUrl;
    return true;
  });

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-[#131722] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-6 sm:gap-8">
        <div className="relative flex-shrink-0">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-emerald-400 via-cyan-400 to-violet-600 p-1 glow">
            {effectivePhotoUrl ? (
              <img
                src={effectivePhotoUrl}
                alt={effectiveDisplayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#0b0d14] flex items-center justify-center text-3xl sm:text-4xl font-syne font-black text-white">
                {effectiveDisplayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}
          </div>
          <span className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-cyan-400 text-black flex items-center justify-center font-bold text-xs shadow-lg">
            🎷
          </span>
        </div>

        <div className="flex-1 text-center md:text-left space-y-3 min-w-0 w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-syne font-black text-white truncate max-w-xs sm:max-w-md">
                {effectiveDisplayName}
              </h1>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-400/30">
                {effectiveLevel}
              </span>
              <button
                onClick={openPlansModal}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400/40 shadow-sm hover:scale-105"
                title="Ver planos e assinatura"
              >
                <Sparkles size={12} className="text-amber-300" />
                <span>Assinatura: {userPlan === 'pro' ? 'Tutti Pro' : userPlan === 'ultra' ? 'Tutti Ultra' : 'Grátis'}</span>
                <span className="text-[10px] text-cyan-300 underline ml-0.5">{userPlan === 'free' ? 'Fazer Upgrade' : 'Gerenciar'}</span>
              </button>
            </div>

            <button
              onClick={() => setIsEditingProfile(prev => !prev)}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-syne font-bold text-xs flex items-center gap-1.5 transition-colors border border-white/15"
            >
              <Edit3 size={14} />
              <span>{isEditingProfile ? 'Fechar Edição' : 'Editar Perfil'}</span>
            </button>
          </div>

          {/* Followers and Relationship counts (Requested feature) */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-slate-300 py-1">
            <div className="flex items-center gap-1.5 bg-[#0b0d14] px-3 py-1 rounded-xl border border-white/10">
              <span className="text-cyan-400 font-bold font-mono">184</span>
              <span className="text-slate-400">Seguidores</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0b0d14] px-3 py-1 rounded-xl border border-white/10">
              <span className="text-emerald-400 font-bold font-mono">92</span>
              <span className="text-slate-400">Seguindo</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0b0d14] px-3 py-1 rounded-xl border border-white/10">
              <span className="text-violet-400 font-bold font-mono">64</span>
              <span className="text-slate-400">Amigos Conectados</span>
            </div>
          </div>

          {/* Bio text */}
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            {profileBio}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xl font-syne font-black text-emerald-400 flex items-center justify-center gap-1">
                <Flame size={18} className="text-amber-400 fill-amber-400" /> {effectiveStreak} dias
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Ofensiva Prática</div>
            </div>

            <div className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xl font-syne font-black text-cyan-400">{effectiveXp}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Pontos de XP</div>
            </div>

            <div className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xl font-syne font-black text-violet-400">{effectiveHours}h</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Tempo de Estudo</div>
            </div>

            <div className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 text-center">
              <div className="text-xl font-syne font-black text-rose-400">{effectiveLessons}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Aulas Concluídas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Drawer / Form (Requested feature: Editable Name and Bio with Max Char Limit) */}
      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} className="bg-[#131722] p-6 sm:p-8 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-5 animate-in slide-in-from-top-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
              <Edit3 size={18} className="text-cyan-400" /> Editar Dados do Perfil
            </h3>
            <span className="text-xs text-slate-400">Salvo no seu dispositivo</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                Nome de Exibição:
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                maxLength={60}
                placeholder="Seu nome completo ou artístico"
                className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  Biografia Musical (Apresentação):
                </label>
                <span className={`text-[10px] font-mono font-bold ${
                  profileBio.length >= maxBioLength ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  {profileBio.length}/{maxBioLength} letras (máximo considerável)
                </span>
              </div>
              <textarea
                value={profileBio}
                onChange={(e) => {
                  if (e.target.value.length <= maxBioLength) {
                    setProfileBio(e.target.value);
                  }
                }}
                rows={4}
                maxLength={maxBioLength}
                placeholder="Conte sobre sua trajetória musical, instrumentos que toca, metas e repertório favorito..."
                className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl p-3.5 text-xs outline-none focus:border-cyan-400 resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                Instrumento Principal:
              </label>
              <select
                value={profileInstrument}
                onChange={(e) => setProfileInstrument(e.target.value)}
                className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-400"
              >
                <option value="Saxofone Alto">Saxofone Alto (Eb)</option>
                <option value="Saxofone Tenor">Saxofone Tenor (Bb)</option>
                <option value="Flauta Transversal">Flauta Transversal</option>
                <option value="Trombone de Vara">Trombone de Vara</option>
                <option value="Trompete">Trompete</option>
                <option value="Violão & Harmonia">Violão & Harmonia</option>
                <option value="Piano / Teclado">Piano / Teclado</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-xs font-black shadow-lg hover:opacity-90"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ARCHIVE OF USER POSTS (PHOTOS AND VIDEOS) - REQUESTED FEATURE */}
      <div className="bg-[#131722] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-syne font-bold text-xl text-white flex items-center gap-2">
              <span>Publicações & Mídias Arquivadas</span>
            </h3>
            <p className="text-xs text-slate-400">
              Fotos, vídeos e postagens criadas por {effectiveDisplayName} arquivadas no seu perfil.
            </p>
          </div>

          {/* Sub-tab pills */}
          <div className="bg-[#0b0d14] p-1 rounded-2xl border border-white/10 flex items-center gap-1 text-xs">
            <button
              onClick={() => setArchivedTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                archivedTab === 'all' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({userArchivedPosts.length})
            </button>
            <button
              onClick={() => setArchivedTab('photos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                archivedTab === 'photos' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fotos ({userArchivedPosts.filter(p => !!p.imageUrl).length})
            </button>
            <button
              onClick={() => setArchivedTab('videos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                archivedTab === 'videos' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vídeos ({userArchivedPosts.filter(p => !!p.videoUrl).length})
            </button>
          </div>
        </div>

        {/* Grid of Archived Posts */}
        {filteredArchive.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArchive.map((post) => (
              <div
                key={post.id}
                className="bg-[#0b0d14] p-5 rounded-2xl border border-white/10 space-y-3 shadow-md flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Photo attachment */}
                  {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-white/10 max-h-48 bg-black">
                      <img
                        src={post.imageUrl}
                        alt="Foto arquivada"
                        className="w-full h-44 object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )}

                  {/* Video attachment */}
                  {post.videoUrl && (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video relative">
                      <iframe
                        src={post.videoUrl.includes('embed') ? post.videoUrl : `https://www.youtube-nocookie.com/embed/${post.videoUrl.split('v=')[1] || ''}`}
                        title="Vídeo Arquivado"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {post.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{post.timeAgo || 'Arquivado'}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400">❤️ {post.likes || 0}</span>
                    <span className="text-cyan-400">💬 {post.comments?.length || post.comments || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2 bg-[#0b0d14] rounded-2xl border border-white/5">
            <p>Nenhuma mídia encontrada nesta categoria de arquivo.</p>
          </div>
        )}
      </div>

      {/* Practice Audio Recorder for Self-Evaluation */}
      <div className="bg-[#131722] p-6 rounded-3xl border border-cyan-500/20 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-syne font-bold text-lg text-white flex items-center gap-2">
              <Mic size={18} className="text-cyan-400" /> Gravador de Autoavaliação
            </h3>
            <p className="text-xs text-slate-400">Grave trechos da sua prática diária para ouvir sua afinação e timbre.</p>
          </div>

          {isRecording ? (
            <button
              onClick={stopPracticeRecording}
              className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg animate-pulse"
            >
              <Square size={14} fill="currentColor" /> Parar Gravação
            </button>
          ) : (
            <button
              onClick={startPracticeRecording}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-colors shadow-md"
            >
              <Mic size={14} /> Iniciar Gravação
            </button>
          )}
        </div>

        {recordedAudioUrl && (
          <div className="bg-[#0b0d14] p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-300">Sua Última Gravação:</span>
            <audio controls src={recordedAudioUrl} className="w-full h-10 accent-cyan-400" />
          </div>
        )}
      </div>

      {/* Badges and Milestones */}
      <div className="bg-[#131722] p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
        <h3 className="font-syne font-bold text-xl text-white">Conquistas & Selos Tutti</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Primeira Nota', desc: 'Concluiu a 1ª aula prática', emoji: '🎵', unlocked: true },
            { title: 'Ouvido Afinado', desc: 'Usou o afinador por 7 dias', emoji: '👂', unlocked: true },
            { title: 'Ritmo Perfeito', desc: 'Estudou com o metrônomo a 120 BPM', emoji: '⏱️', unlocked: true },
            { title: 'Bossa Master', desc: 'Tocou Garota de Ipanema sem erros', emoji: '🌴', unlocked: false },
          ].map((b, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border text-center space-y-2 transition-all ${
                b.unlocked
                  ? 'bg-[#0b0d14] border-cyan-500/30'
                  : 'bg-[#0b0d14]/40 border-white/5 opacity-50'
              }`}
            >
              <div className="text-3xl">{b.emoji}</div>
              <div className="font-syne font-bold text-sm text-white">{b.title}</div>
              <div className="text-[11px] text-slate-400 leading-snug">{b.desc}</div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                b.unlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500'
              }`}>
                {b.unlocked ? 'Desbloqueado' : 'Em Progresso'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- APP SHELL AND PROVIDER ---
export default function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [activeSheetModal, setActiveSheetModal] = useState<SheetMusic | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tab State & Scroll Persistence across tabs
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['/']));
  const tabScrollPositions = useRef<Record<string, number>>({});

  // Screen theme state (Preto / Branco)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('tutti_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('tutti_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // User Subscription Plan ('free' | 'pro' | 'ultra')
  const [userPlan, setUserPlanState] = useState<'free' | 'pro' | 'ultra'>(() => {
    try {
      return (localStorage.getItem('tutti_user_plan') as any) || 'free';
    } catch {
      return 'free';
    }
  });

  const setUserPlan = (plan: 'free' | 'pro' | 'ultra') => {
    setUserPlanState(plan);
    try {
      localStorage.setItem('tutti_user_plan', plan);
    } catch (e) {
      console.warn('Storage error:', e);
    }
  };

  const [isPlansModalOpen, setIsPlansModalOpen] = useState<boolean>(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState<boolean>(false);

  // Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);

  // User stats
  const [userStats, setUserStats] = useState({
    xp: 450,
    streakDays: 14,
    practiceHours: 26,
    completedLessons: 8
  });

  // Persistent navigation: saves scroll, retains page instances in DOM, doesn't reload page
  const navigate = (path: string, params: Record<string, string> = {}) => {
    // 1. Save scroll position of current tab
    tabScrollPositions.current[currentPath] = window.scrollY;

    // 2. Mark new tab as visited
    setVisitedTabs(prev => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });

    // 3. Switch current path
    setCurrentPath(path);
    setQueryParams(params);

    // 4. Restore scroll position of target tab without resetting state
    requestAnimationFrame(() => {
      const targetY = tabScrollPositions.current[path] ?? 0;
      window.scrollTo({ top: targetY, behavior: 'instant' });
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const completeTask = (xpGain: number) => {
    setUserStats(prev => ({
      ...prev,
      xp: prev.xp + xpGain,
      completedLessons: prev.completedLessons + 1
    }));
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`"${product.name}" adicionado ao carrinho! 🛒`);
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const contextValue: RouterContextType = {
    currentPath,
    queryParams,
    navigate,
    openMetronome: () => setIsMetronomeOpen(true),
    openTuner: () => setIsTunerOpen(true),
    openSheetViewer: (sheet: SheetMusic) => setActiveSheetModal(sheet),
    openAuthModal: () => setIsAuthModalOpen(true),
    openPlansModal: () => setIsPlansModalOpen(true),
    openSocialModal: () => setIsSocialModalOpen(true),
    userPlan,
    setUserPlan,
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    openCheckout: () => setIsCheckoutOpen(true),
    toast: toastMessage,
    showToast,
    theme,
    toggleTheme,
    userStats,
    completeTask
  };

  return (
    <AuthProvider>
      <RouterContext.Provider value={contextValue}>
        <div className={`min-h-screen ${theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#0b0d14] text-slate-100'} flex flex-col pt-20 pb-20 xl:pb-8 selection:bg-cyan-500 selection:text-black transition-colors duration-300`}>
          <Header />
          
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Preserved tab instances in DOM: switching tabs does not restart or reload */}
            <div style={{ display: currentPath === '/' ? 'block' : 'none' }}>
              <HomePage />
            </div>
            {visitedTabs.has('/aulas') && (
              <div style={{ display: currentPath === '/aulas' ? 'block' : 'none' }}>
                <AulasPage />
              </div>
            )}
            {visitedTabs.has('/partituras') && (
              <div style={{ display: currentPath === '/partituras' ? 'block' : 'none' }}>
                <PartiturasPage />
              </div>
            )}
            {visitedTabs.has('/estudio') && (
              <div style={{ display: currentPath === '/estudio' ? 'block' : 'none' }}>
                <EstudioPage />
              </div>
            )}
            {visitedTabs.has('/agenda') && (
              <div style={{ display: currentPath === '/agenda' ? 'block' : 'none' }}>
                <AgendaPage />
              </div>
            )}
            {visitedTabs.has('/comunidade') && (
              <div style={{ display: currentPath === '/comunidade' ? 'block' : 'none' }}>
                <ComunidadePage />
              </div>
            )}
            {visitedTabs.has('/loja') && (
              <div style={{ display: currentPath === '/loja' ? 'block' : 'none' }}>
                <LojaPage />
              </div>
            )}
            {visitedTabs.has('/perfil') && (
              <div style={{ display: currentPath === '/perfil' ? 'block' : 'none' }}>
                <PerfilPage />
              </div>
            )}
          </main>

          <MobileNav />

          {/* Global Modals */}
          <MetronomeModal
            isOpen={isMetronomeOpen}
            onClose={() => setIsMetronomeOpen(false)}
          />

          <TunerModal
            isOpen={isTunerOpen}
            onClose={() => setIsTunerOpen(false)}
          />

          <SheetViewerModal
            sheet={activeSheetModal}
            isOpen={!!activeSheetModal}
            onClose={() => setActiveSheetModal(null)}
          />

          <CheckoutModal
            cart={cart}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onClearCart={clearCart}
          />

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          <PlansModal
            isOpen={isPlansModalOpen}
            onClose={() => setIsPlansModalOpen(false)}
          />

          <SocialModal
            isOpen={isSocialModalOpen}
            onClose={() => setIsSocialModalOpen(false)}
          />

          {/* Toast Alert */}
          {toastMessage && (
            <div className="fixed bottom-20 xl:bottom-8 right-6 z-50 bg-[#131722] border border-cyan-400 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 glow animate-in slide-in-from-bottom-5">
              <Sparkles size={18} className="text-cyan-400" />
              <span className="text-xs font-bold">{toastMessage}</span>
            </div>
          )}
        </div>
      </RouterContext.Provider>
    </AuthProvider>
  );
}
