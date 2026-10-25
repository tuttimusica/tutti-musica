import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, MessageCircle, Share2, Image as ImageIcon, Video, 
  Send, UserPlus, UserCheck, Sparkles, Music, Play, 
  Smile, MoreHorizontal, Camera, CheckCircle2, Bookmark,
  TrendingUp, Users, Film, Radio, Award, MapPin, Search, X
} from 'lucide-react';

export interface PostComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timeAgo: string;
}

export interface SocialPost {
  id: string;
  author: string;
  avatar: string;
  instrument: string;
  timeAgo: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string; // YouTube or direct video URL
  likes: number;
  userLiked?: boolean;
  comments: PostComment[];
  shares: number;
  tag?: string;
  isCurrentUser?: boolean;
}

export interface SuggestedFriend {
  id: string;
  name: string;
  avatar: string;
  instrument: string;
  level: string;
  city: string;
  mutualFriends: number;
  isFriend: boolean;
}

const DEFAULT_FRIENDS: SuggestedFriend[] = [
  {
    id: 'f1',
    name: 'Maestro',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    instrument: 'Saxofone & Harmonia',
    level: 'Mentor IA Oficial',
    city: 'São Paulo, SP',
    mutualFriends: 142,
    isFriend: true
  },
  {
    id: 'f2',
    name: 'Clara Vasconcelos',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    instrument: 'Piano & Teclado',
    level: 'Professora de Bossa',
    city: 'Rio de Janeiro, RJ',
    mutualFriends: 38,
    isFriend: false
  },
  {
    id: 'f3',
    name: 'Henrique Prado',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    instrument: 'Sax Alto & Tenor',
    level: 'Concertista',
    city: 'Belo Horizonte, MG',
    mutualFriends: 29,
    isFriend: false
  },
  {
    id: 'f4',
    name: 'Cecília Prado',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    instrument: 'Flauta Transversal',
    level: 'Choro & Clássico',
    city: 'Curitiba, PR',
    mutualFriends: 18,
    isFriend: false
  },
  {
    id: 'f5',
    name: 'Sérgio Trombonista',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    instrument: 'Trombone de Vara',
    level: 'Big Band & Gafieira',
    city: 'Salvador, BA',
    mutualFriends: 12,
    isFriend: false
  }
];

const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'p1',
    author: 'Henrique Prado',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    instrument: 'Saxofone Alto',
    timeAgo: 'Há 25 minutos',
    content: 'Hoje estudei os harmônicos e a digitação das notas superagudas (altíssimo) do Sax Alto com o novo dedilhado interativo do Tutti. A transição do Fá#6 para o Sol6 soou incrivelmente estável!',
    imageUrl: '/assets/instruments/alto_sax.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=x9q8mZqQc_M',
    likes: 42,
    userLiked: false,
    shares: 6,
    tag: '#SaxAlto #Dedilhado #Altissimo',
    comments: [
      {
        id: 'c1',
        author: 'Maestro',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'Excelente trabalho na embocadura, Henrique! Lembre-se de manter a garganta aberta como se dissesse "ÔÔ".',
        timeAgo: 'Há 18 minutos'
      }
    ]
  },
  {
    id: 'p2',
    author: 'Cecília Prado',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    instrument: 'Flauta Transversal',
    timeAgo: 'Há 1 hora',
    content: 'Apaixonada pela nova partitura de Carinhoso com áudio do YouTube no Tutti! Tocar junto com a gravação original faz toda a diferença para pegar o fraseado do Choro. Quem mais está estudando flauta essa semana?',
    imageUrl: '/assets/instruments/flauta.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=F3_68f8U8vE',
    likes: 38,
    userLiked: true,
    shares: 4,
    tag: '#FlautaTransversal #Choro #Carinhoso',
    comments: [
      {
        id: 'c2',
        author: 'Clara Vasconcelos',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'Esse arranjo de Carinhoso é emocionante! O contraponto da flauta é puro encanto.',
        timeAgo: 'Há 45 minutos'
      }
    ]
  },
  {
    id: 'p3',
    author: 'Sérgio Trombonista',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    instrument: 'Trombone de Vara',
    timeAgo: 'Há 3 horas',
    content: 'Ensaio de naipe de metais hoje à tarde. O glissando de 1ª para 6ª posição em "Na Baixa do Sapateiro" exige apoio diafragmático firme. Praticando com o metrônomo em 6/8 e 12/8!',
    imageUrl: '/assets/instruments/trombone.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=V9L7r94rXwM',
    likes: 54,
    userLiked: false,
    shares: 9,
    tag: '#TromboneDeVara #Metais #Gafieira',
    comments: []
  }
];

// Helper to extract YouTube ID
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0` : null;
}

interface CommunityFeedProps {
  currentUserProfile?: {
    name: string;
    avatar?: string;
    instrument?: string;
  };
  onNewUserPost?: (post: SocialPost) => void;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ currentUserProfile, onNewUserPost }) => {
  const [posts, setPosts] = useState<SocialPost[]>(() => {
    try {
      const saved = localStorage.getItem('tutti_community_posts_v2');
      return saved ? JSON.parse(saved) : INITIAL_POSTS;
    } catch {
      return INITIAL_POSTS;
    }
  });

  const [friends, setFriends] = useState<SuggestedFriend[]>(() => {
    try {
      const saved = localStorage.getItem('tutti_user_friends');
      return saved ? JSON.parse(saved) : DEFAULT_FRIENDS;
    } catch {
      return DEFAULT_FRIENDS;
    }
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'amigos' | 'videos' | 'meus_posts'>('geral');
  const [postText, setPostText] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video' | 'none'>('none');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [selectedInstrumentTag, setSelectedInstrumentTag] = useState('Saxofone');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState<string>('');
  const [friendFilter, setFriendFilter] = useState<'all' | 'friends' | 'suggestions'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync posts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tutti_community_posts_v2', JSON.stringify(posts));
    } catch (e) {
      console.warn('Post storage error:', e);
    }
  }, [posts]);

  // Sync friends to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tutti_user_friends', JSON.stringify(friends));
    } catch (e) {
      console.warn('Friends storage error:', e);
    }
  }, [friends]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Create new post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !postMediaUrl.trim()) return;

    const newPost: SocialPost = {
      id: `post_${Date.now()}`,
      author: currentUserProfile?.name || 'Rafael Drumond',
      avatar: currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      instrument: currentUserProfile?.instrument || selectedInstrumentTag,
      timeAgo: 'Agora mesmo',
      content: postText.trim(),
      imageUrl: postMediaType === 'image' ? postMediaUrl : undefined,
      videoUrl: postMediaType === 'video' ? postMediaUrl : undefined,
      likes: 1,
      userLiked: true,
      comments: [],
      shares: 0,
      tag: `#${selectedInstrumentTag.replace(/\s+/g, '')} #Música #Tutti`,
      isCurrentUser: true
    };

    setPosts([newPost, ...posts]);
    onNewUserPost?.(newPost);
    setPostText('');
    setPostMediaUrl('');
    setPostMediaType('none');
    setShowMediaInput(false);
    showToast('Publicação compartilhada com a comunidade musical! 🎵');
  };

  // Local image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPostMediaUrl(event.target.result as string);
          setPostMediaType('image');
          setShowMediaInput(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Like
  const handleToggleLike = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextLiked = !p.userLiked;
        return {
          ...p,
          userLiked: nextLiked,
          likes: nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
        };
      }
      return p;
    }));
  };

  // Toggle Friend
  const handleToggleFriend = (friendId: string) => {
    setFriends(prev => prev.map(f => {
      if (f.id === friendId) {
        const nextState = !f.isFriend;
        showToast(nextState ? `Você agora é amigo(a) de ${f.name}! 🤝` : `Amizade com ${f.name} desfeita.`);
        return { ...f, isFriend: nextState };
      }
      return f;
    }));
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment: PostComment = {
      id: `comm_${Date.now()}`,
      author: currentUserProfile?.name || 'Rafael Drumond',
      avatar: currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      text,
      timeAgo: 'Agora mesmo'
    };

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => new Set(prev).add(postId));
  };

  // Filter posts according to active tab
  const filteredPosts = posts.filter(post => {
    if (activeTab === 'geral') return true;
    if (activeTab === 'amigos') {
      const friendNames = friends.filter(f => f.isFriend).map(f => f.name);
      return friendNames.includes(post.author) || post.isCurrentUser;
    }
    if (activeTab === 'videos') {
      return !!post.videoUrl;
    }
    if (activeTab === 'meus_posts') {
      return post.isCurrentUser || post.author === (currentUserProfile?.name || 'Rafael Drumond');
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-24 right-6 z-50 bg-[#131722] border border-cyan-400 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 glow animate-in slide-in-from-bottom-5">
          <Sparkles size={18} className="text-cyan-400" />
          <span className="text-xs font-bold">{notification}</span>
        </div>
      )}

      {/* Stories / Momentos Musicais Bar (Estilo Facebook / Instagram) */}
      <div className="bg-[#131722] p-4 rounded-3xl border border-white/10 shadow-xl overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 min-w-max">
          {/* User's story button */}
          <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-emerald-400 to-violet-500 p-0.5 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-[#0b0d14] flex items-center justify-center overflow-hidden">
                <img
                  src={currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                  alt="Seu Perfil"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center font-bold text-xs shadow-md border-2 border-[#131722]">
                +
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-300">Seu Momento</span>
          </div>

          {/* Friends' stories */}
          {friends.map(friend => (
            <div
              key={friend.id}
              onClick={() => showToast(`Momento Musical de ${friend.name} tocando ${friend.instrument} 🎵`)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-cyan-400 p-0.5 group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-[#0b0d14] flex items-center justify-center overflow-hidden p-0.5">
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-300 truncate max-w-[70px] text-center">
                {friend.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Feed on Left / Friends & Suggestions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Post Creator + Feed */}
        <div className="lg:col-span-8 space-y-6">
          {/* Facebook-like Post Creator */}
          <div className="bg-[#131722] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <img
                src={currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt="Avatar"
                className="w-11 h-11 rounded-full object-cover border border-cyan-400/40"
              />
              <div className="flex-1 space-y-3">
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={`No que você está praticando hoje, ${currentUserProfile?.name?.split(' ')[0] || 'músico'}? Compartilhe seus estudos, dúvidas ou apresentações...`}
                  rows={3}
                  className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-2xl p-3.5 text-sm outline-none focus:border-cyan-400 transition-colors resize-none placeholder:text-slate-500"
                />

                {/* Media preview or URL input */}
                {showMediaInput && (
                  <div className="bg-[#0b0d14] p-3.5 rounded-2xl border border-white/10 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                      <span>{postMediaType === 'video' ? 'Link do Vídeo ou YouTube' : 'Link ou Arquivo de Foto'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMediaInput(false);
                          setPostMediaUrl('');
                          setPostMediaType('none');
                        }}
                        className="text-rose-400 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                    <input
                      type="text"
                      value={postMediaUrl}
                      onChange={(e) => setPostMediaUrl(e.target.value)}
                      placeholder={postMediaType === 'video' ? 'Cole o link do YouTube (ex: https://youtube.com/watch?v=...)' : 'URL da imagem ou use o botão de foto abaixo'}
                      className="w-full bg-[#131722] text-white border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-400"
                    />
                    {postMediaType === 'image' && postMediaUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden max-h-48 border border-white/10">
                        <img src={postMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {/* Instrument Tag Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Naipe:</span>
                    {['Saxofone', 'Flauta Transversal', 'Trombone', 'Piano/Teclado', 'Violão'].map(inst => (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => setSelectedInstrumentTag(inst)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          selectedInstrumentTag === inst
                            ? 'bg-cyan-500 text-black font-black'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {inst}
                      </button>
                    ))}
                  </div>

                  {/* Attachment Actions & Submit */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Adicionar Foto do seu instrumento ou partitura"
                    >
                      <ImageIcon size={15} />
                      <span className="hidden sm:inline">Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPostMediaType('video');
                        setShowMediaInput(true);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-rose-400 border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Adicionar Vídeo de Apresentação ou YouTube"
                    >
                      <Video size={15} />
                      <span className="hidden sm:inline">Vídeo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCreatePost}
                      disabled={!postText.trim() && !postMediaUrl.trim()}
                      className="px-5 py-2 rounded-xl font-syne font-black text-xs bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-600 text-black hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                    >
                      <Send size={13} />
                      <span>Publicar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feed Filter Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              {[
                { id: 'geral', label: 'Feed Geral', icon: Sparkles },
                { id: 'amigos', label: 'Apenas Amigos', icon: Users },
                { id: 'videos', label: 'Vídeos & Apresentações', icon: Film },
                { id: 'meus_posts', label: 'Minhas Publicações', icon: Award }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-2 rounded-xl font-syne font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              {filteredPosts.length} posts
            </span>
          </div>

          {/* Posts Feed */}
          <div className="space-y-6">
            {filteredPosts.length > 0 ? (
              filteredPosts.map(post => {
                const embedUrl = post.videoUrl ? getYouTubeEmbedUrl(post.videoUrl) : null;
                const isCommentsOpen = expandedComments.has(post.id);

                return (
                  <article
                    key={post.id}
                    className="bg-[#131722] rounded-3xl border border-white/10 shadow-xl overflow-hidden hover:border-white/20 transition-all"
                  >
                    {/* Post Header */}
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.avatar}
                          alt={post.author}
                          className="w-11 h-11 rounded-full object-cover border border-cyan-400/30"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-syne font-bold text-sm text-white">{post.author}</h3>
                            {post.author.includes('Maestro') && (
                              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                                Oficial
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span className="text-cyan-400 font-semibold">{post.instrument}</span>
                            <span>•</span>
                            <span>{post.timeAgo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.tag && (
                          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full hidden sm:inline">
                            {post.tag}
                          </span>
                        )}
                        <button className="text-slate-400 hover:text-white p-1">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Post Text Content */}
                    <div className="px-5 pb-3">
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                        {post.content}
                      </p>
                    </div>

                    {/* Embedded Media: Video or Photo */}
                    {embedUrl ? (
                      <div className="aspect-video w-full bg-black">
                        <iframe
                          src={embedUrl}
                          title={post.content}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : post.imageUrl ? (
                      <div className="w-full max-h-[460px] bg-[#0b0d14] overflow-hidden flex items-center justify-center">
                        <img
                          src={post.imageUrl}
                          alt="Post Media"
                          className="w-full h-full object-cover max-h-[460px]"
                        />
                      </div>
                    ) : null}

                    {/* Reaction Stats Strip */}
                    <div className="px-5 py-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-[10px] text-white">
                          ❤️
                        </span>
                        <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-white -ml-2">
                          👏
                        </span>
                        <span className="ml-1 font-semibold text-slate-300">{post.likes} curtidas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{post.comments.length} comentários</span>
                        <span>•</span>
                        <span>{post.shares} compartilhamentos</span>
                      </div>
                    </div>

                    {/* Action Buttons (Curtir, Comentar, Compartilhar) */}
                    <div className="px-4 py-2 border-t border-white/10 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          post.userLiked
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Heart size={16} fill={post.userLiked ? 'currentColor' : 'none'} />
                        <span>{post.userLiked ? 'Curtiu' : 'Curtir'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setExpandedComments(prev => {
                            const next = new Set(prev);
                            if (next.has(post.id)) next.delete(post.id);
                            else next.add(post.id);
                            return next;
                          });
                        }}
                        className="py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <MessageCircle size={16} />
                        <span>Comentar</span>
                      </button>

                      <button
                        onClick={() => {
                          showToast('Link da publicação copiado para compartilhar!');
                        }}
                        className="py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Share2 size={16} />
                        <span>Compartilhar</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {isCommentsOpen && (
                      <div className="p-5 border-t border-white/10 bg-[#0b0d14]/70 space-y-3 animate-in fade-in">
                        {/* List of comments */}
                        {post.comments.map(c => (
                          <div key={c.id} className="flex items-start gap-3">
                            <img src={c.avatar} alt={c.author} className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex-1 bg-[#131722] p-3 rounded-2xl border border-white/5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-white">{c.author}</span>
                                <span className="text-[10px] text-slate-400">{c.timeAgo}</span>
                              </div>
                              <p className="text-xs text-slate-300">{c.text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Comment input box */}
                        <div className="flex items-center gap-2 pt-2">
                          <img
                            src={currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                            alt="Me"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              placeholder="Escreva um comentário musical..."
                              className="w-full bg-[#131722] text-white border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs outline-none focus:border-cyan-400"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 p-1"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="bg-[#131722] p-12 rounded-3xl border border-white/10 text-center space-y-3">
                <Music size={36} className="text-cyan-400 mx-auto" />
                <h3 className="font-syne font-bold text-base text-white">Nenhuma publicação nesta categoria ainda</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Seja o primeiro a compartilhar seus estudos, fotos ou vídeos com seus colegas músicos!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fazer Amigos / Músicos Sugeridos & Comunidades */}
        <div className="lg:col-span-4 space-y-6">
          {/* Fazer Amigos Card com Pesquisa em Tempo Real */}
          <div className="bg-[#131722] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-syne font-bold text-base text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-cyan-400" />
                  <span>Rede de Músicos & Amigos</span>
                </h3>
                <p className="text-xs text-slate-400">Pesquise pessoas, faça amizades e monte seu grupo</p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {friends.filter(f => f.isFriend).length} amigos
              </span>
            </div>

            {/* Friend Search Bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={friendSearchQuery}
                onChange={(e) => setFriendSearchQuery(e.target.value)}
                placeholder="Pesquisar amigo por nome, instrumento ou cidade..."
                className="w-full bg-[#0b0d14] text-white border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs outline-none focus:border-cyan-400 placeholder:text-slate-500"
              />
              {friendSearchQuery && (
                <button
                  onClick={() => setFriendSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs: Todos, Meus Amigos, Sugestões */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0b0d14] rounded-xl border border-white/10 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFriendFilter('all')}
                className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                  friendFilter === 'all' ? 'bg-cyan-500 text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({friends.length})
              </button>
              <button
                type="button"
                onClick={() => setFriendFilter('friends')}
                className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                  friendFilter === 'friends' ? 'bg-cyan-500 text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Amigos ({friends.filter(f => f.isFriend).length})
              </button>
              <button
                type="button"
                onClick={() => setFriendFilter('suggestions')}
                className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                  friendFilter === 'suggestions' ? 'bg-cyan-500 text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sugestões ({friends.filter(f => !f.isFriend).length})
              </button>
            </div>

            {/* List of Filtered Friends */}
            <div className="space-y-3 pt-1 max-h-[380px] overflow-y-auto pr-1">
              {(() => {
                const query = friendSearchQuery.toLowerCase().trim();
                const filtered = friends.filter(friend => {
                  const match = !query || 
                    friend.name.toLowerCase().includes(query) ||
                    friend.instrument.toLowerCase().includes(query) ||
                    friend.city.toLowerCase().includes(query);
                  if (!match) return false;
                  if (friendFilter === 'friends') return friend.isFriend;
                  if (friendFilter === 'suggestions') return !friend.isFriend;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-6 bg-[#0b0d14] rounded-2xl border border-white/10 space-y-2 p-4">
                      <p className="text-xs text-slate-400">Nenhum músico encontrado com essa busca.</p>
                      {friendSearchQuery && (
                        <button
                          onClick={() => setFriendSearchQuery('')}
                          className="text-[11px] text-cyan-400 hover:underline font-bold"
                        >
                          Limpar busca
                        </button>
                      )}
                    </div>
                  );
                }

                return filtered.map(friend => (
                  <div
                    key={friend.id}
                    className="bg-[#0b0d14] p-3.5 rounded-2xl border border-white/10 flex items-center justify-between gap-3 group hover:border-cyan-400/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div className="min-w-0">
                        <h4 className="font-syne font-bold text-xs text-white truncate">{friend.name}</h4>
                        <p className="text-[11px] text-cyan-400 font-medium truncate">{friend.instrument}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MapPin size={10} />
                          <span>{friend.city}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFriend(friend.id)}
                      className={`px-3 py-1.5 rounded-xl font-syne font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 ${
                        friend.isFriend
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 shadow-sm'
                      }`}
                    >
                      {friend.isFriend ? (
                        <>
                          <UserCheck size={13} />
                          <span>Amigos</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} />
                          <span>Adicionar</span>
                        </>
                      )}
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Grupos e Naipes de Estudo */}
          <div className="bg-[#131722] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <h3 className="font-syne font-bold text-base text-white flex items-center gap-2">
              <Users size={18} className="text-emerald-400" />
              <span>Grupos & Rodas de Prática</span>
            </h3>

            <div className="space-y-2.5">
              {[
                { name: 'Naipe de Metais do Brasil', members: '1.240 membros', icon: '🎷' },
                { name: 'Roda de Choro & Bossa Nova', members: '2.890 membros', icon: '🎸' },
                { name: 'Flautistas e Madeiras', members: '840 membros', icon: '🪈' },
                { name: 'Trombone de Vara & Big Bands', members: '610 membros', icon: '🎺' }
              ].map((g, idx) => (
                <div
                  key={idx}
                  onClick={() => showToast(`Você ingressou no grupo ${g.name}! 🎵`)}
                  className="bg-[#0b0d14] p-3 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:border-cyan-400/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{g.icon}</span>
                    <div>
                      <div className="font-syne font-bold text-xs text-white">{g.name}</div>
                      <div className="text-[10px] text-slate-400">{g.members}</div>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10">
                    Entrar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
