-- ==============================================================
-- SCHEMA POSTGRESQL PARA O BACKEND DO TUTTI ♪ NO SUPABASE
-- Project ID: nccsheimngnwccfikscy
-- ==============================================================

-- 1. TABELA DE PERFIS DOS ALUNOS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  current_instrument TEXT DEFAULT 'Saxofone',
  level TEXT DEFAULT 'Intermediário' CHECK (level IN ('Iniciante', 'Intermediário', 'Avançado')),
  streak_days INTEGER DEFAULT 14,
  xp INTEGER DEFAULT 450,
  practice_hours INTEGER DEFAULT 26,
  completed_lessons INTEGER DEFAULT 8,
  bio TEXT DEFAULT 'Estudando Saxofone e Harmonia de Bossa Nova no Tutti ♪',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE POSTS DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  instrument TEXT,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::jsonb,
  comments INTEGER DEFAULT 0,
  tag TEXT DEFAULT '#Estudos',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE PEDIDOS DA LOJA
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  coupon TEXT,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  shipping_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE PROGRESSO DAS AULAS
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  instrument_id TEXT,
  completed BOOLEAN DEFAULT false,
  completed_tasks JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- 5. TABELA DE GRAVAÇÕES E REGISTROS DE PRÁTICA
CREATE TABLE IF NOT EXISTS public.practice_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  audio_data_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE INSCRIÇÕES NAS MASTERCLASSES AO VIVO
CREATE TABLE IF NOT EXISTS public.masterclass_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  masterclass_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, masterclass_id)
);

-- ==============================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ==============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masterclass_rsvps ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE PERMISSÕES PERMISSIVAS PARA DESENVOLVIMENTO
CREATE POLICY "Leitura pública de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Inserção e atualização de perfis" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Leitura pública de posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Criação e curtida de posts" ON public.community_posts FOR ALL USING (true);

CREATE POLICY "Acesso a pedidos" ON public.orders FOR ALL USING (true);
CREATE POLICY "Acesso a progresso de aulas" ON public.lesson_progress FOR ALL USING (true);
CREATE POLICY "Acesso a logs de prática" ON public.practice_logs FOR ALL USING (true);
CREATE POLICY "Acesso a rsvps de masterclasses" ON public.masterclass_rsvps FOR ALL USING (true);
