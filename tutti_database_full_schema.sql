-- ============================================================================
-- TUTTI ESCOLA DE MÚSICA ♪ - ARQUITETURA COMPLETA DE BANCO DE DADOS (SUPABASE)
-- Projeto: https://viwxalwpvuvgcyxsdjbi.supabase.co
-- Versão: 2.0 (Completa, Relacional, RLS e Seeds)
-- ============================================================================
-- Este script pode ser executado no SQL Editor do painel do Supabase.
-- Ele cria toda a estrutura de tabelas, relacionamentos, triggers automáticos,
-- views consolidadas, políticas de segurança (RLS) e dados iniciais (seeds).
-- ============================================================================

-- 0. EXTENSÕES DO POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELA PRINCIPAL DE USUÁRIOS E PERFIS (public.usuarios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome_completo TEXT NOT NULL,
  bio TEXT DEFAULT 'Estudando Saxofone e Harmonia no Tutti Escola de Música 🎶',
  avatar_url TEXT,
  current_instrument TEXT DEFAULT 'Saxofone Alto',
  level TEXT DEFAULT 'Intermediário' CHECK (level IN ('Iniciante', 'Intermediário', 'Avançado')),
  streak_days INTEGER DEFAULT 14,
  xp INTEGER DEFAULT 450,
  practice_hours INTEGER DEFAULT 26,
  completed_lessons INTEGER DEFAULT 8,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_user_id ON public.usuarios(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger automático para criar o perfil em public.usuarios sempre que um aluno se cadastrar no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (user_id, nome_completo, avatar_url, bio)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    ),
    'Estudando no Tutti Escola de Música 🎶'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.usuarios.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de compatibilidade (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  role TEXT DEFAULT 'student',
  current_instrument TEXT DEFAULT 'Saxofone',
  level TEXT DEFAULT 'Intermediário',
  streak_days INTEGER DEFAULT 14,
  xp INTEGER DEFAULT 450,
  practice_hours INTEGER DEFAULT 26,
  completed_lessons INTEGER DEFAULT 8,
  bio TEXT DEFAULT 'Estudando no Tutti ♪',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. PLANOS DE ASSINATURA & ASSINATURAS DE ALUNOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.planos (
  id TEXT PRIMARY KEY, -- 'free', 'pro', 'ultra'
  nome TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  recorrencia TEXT NOT NULL, -- 'gratis', 'vitalicio', 'anual'
  descricao TEXT,
  beneficios JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assinaturas_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_id TEXT REFERENCES public.planos(id),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado', 'pendente')),
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  valor_pago NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CATÁLOGO DE INSTRUMENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instrumentos (
  id TEXT PRIMARY KEY, -- 'sax', 'flauta', 'trombone', 'trompete', 'teclado', 'violao'
  nome TEXT NOT NULL,
  afinacao TEXT NOT NULL, -- 'Eb', 'Bb', 'C', etc.
  familia TEXT NOT NULL CHECK (familia IN ('Sopro / Madeiras', 'Sopro / Metais', 'Teclas', 'Cordas', 'Voz', 'Percussão')),
  emoji TEXT,
  imagem_url TEXT,
  professor_responsavel TEXT,
  descricao TEXT,
  tecnicas_foco JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true
);

-- ============================================================================
-- 4. CURSOS, AULAS & PROGRESSO DO ALUNO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cursos (
  id TEXT PRIMARY KEY,
  instrumento_id TEXT REFERENCES public.instrumentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  nivel TEXT DEFAULT 'Iniciante',
  capa_url TEXT,
  professor TEXT,
  total_aulas INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.aulas (
  id SERIAL PRIMARY KEY,
  instrumento_id TEXT REFERENCES public.instrumentos(id) ON DELETE CASCADE,
  curso_id TEXT REFERENCES public.cursos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  modulo TEXT NOT NULL,
  duracao TEXT,
  nivel TEXT DEFAULT 'Iniciante',
  professor TEXT,
  video_url TEXT,
  resumo TEXT,
  pontos_chave JSONB DEFAULT '[]'::jsonb,
  cifras JSONB DEFAULT '[]'::jsonb,
  tablatura TEXT,
  exercicios_praticos JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);

-- ============================================================================
-- 5. BIBLIOTECA DE PARTITURAS & FAVORITOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.partituras (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  compositor TEXT NOT NULL,
  instrumento TEXT NOT NULL,
  tonalidade TEXT NOT NULL,
  tom_original TEXT,
  nivel TEXT DEFAULT 'Intermediário' CHECK (nivel IN ('Iniciante', 'Intermediário', 'Avançado')),
  genero TEXT DEFAULT 'Bossa Nova',
  tempo_bpm INTEGER DEFAULT 120,
  compasso TEXT DEFAULT '4/4',
  descricao TEXT,
  arquivo_pdf_url TEXT,
  audio_playalong_url TEXT,
  youtube_url TEXT,
  cifras JSONB DEFAULT '[]'::jsonb,
  melodia_notas JSONB DEFAULT '[]'::jsonb,
  visualizacoes INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favoritos_partituras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partitura_id INTEGER REFERENCES public.partituras(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partitura_id)
);

-- ============================================================================
-- 6. GRAVAÇÕES & ESTÚDIO DE AUTOAVALIAÇÃO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.practice_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  audio_data_url TEXT,
  notes TEXT,
  bpm_praticado INTEGER,
  afinacao_precisao NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_logs_user ON public.practice_logs(user_id);

-- ============================================================================
-- 7. MURAL DA COMUNIDADE MUSICAL & COMENTÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY DEFAULT ('post_' || extract(epoch from now())::bigint::text),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  instrument TEXT DEFAULT 'Saxofone',
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  likes INTEGER DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  shares INTEGER DEFAULT 0,
  tag TEXT DEFAULT '#Tutti',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.amizades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amigo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'aceito' CHECK (status IN ('pendente', 'aceito', 'bloqueado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, amigo_id)
);

-- ============================================================================
-- 8. LOJA TUTTI, PRODUTOS & PEDIDOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produtos_loja (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  preco_antigo NUMERIC(10, 2),
  categoria TEXT NOT NULL CHECK (categoria IN ('Acessórios', 'Instrumentos', 'Vestuário', 'Livros', 'Partituras')),
  imagem_url TEXT,
  avaliacao NUMERIC(3, 2) DEFAULT 4.9,
  total_avaliacoes INTEGER DEFAULT 25,
  badge TEXT,
  descricao TEXT,
  em_estoque BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cupons_desconto (
  codigo TEXT PRIMARY KEY,
  percentual_desconto NUMERIC(5, 2) NOT NULL,
  valido_ate TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'shipped', 'cancelled')),
  shipping_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);

-- ============================================================================
-- 9. MASTERCLASSES AO VIVO & INSCRIÇÕES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.masterclasses (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  instrutor TEXT NOT NULL,
  instrumento TEXT NOT NULL,
  data_evento DATE NOT NULL,
  horario TEXT NOT NULL,
  vagas_maximas INTEGER DEFAULT 200,
  inscritos_count INTEGER DEFAULT 0,
  nivel TEXT DEFAULT 'Todos os Níveis',
  status TEXT DEFAULT 'Inscrições Abertas' CHECK (status IN ('Inscrições Abertas', 'Hoje', 'Encerrado')),
  descricao TEXT,
  link_ao_vivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.masterclass_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  masterclass_id INTEGER REFERENCES public.masterclasses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, masterclass_id)
);

-- ============================================================================
-- 10. VIEWS CONSOLIDADAS & DASHBOARD
-- ============================================================================

-- View de serviços e cursos em destaque solicitada
CREATE OR REPLACE VIEW public.v_servicos_destaque AS
SELECT 
  'curso_sax' AS id,
  'Saxofone Express' AS titulo,
  'Do zero à improvisação no Saxofone Alto e Tenor' AS descricao,
  'Instrumentos de Sopro' AS categoria,
  4.9 AS avaliacao,
  true AS em_destaque
UNION ALL
SELECT 
  'curso_flauta' AS id,
  'Flauta Transversal & Respiração' AS titulo,
  'Técnica diafragmática, embocadura e afinação' AS descricao,
  'Sopro / Madeiras' AS categoria,
  5.0 AS avaliacao,
  true AS em_destaque
UNION ALL
SELECT 
  'plano_pro' AS id,
  'Assinatura Tutti Pro Vitalício' AS titulo,
  'Mais de 1000 partituras interativas, estúdio e play-alongs sem mensalidades' AS descricao,
  'Planos de Ensino' AS categoria,
  4.98 AS avaliacao,
  true AS em_destaque;

-- View do Ranking de Alunos por XP
CREATE OR REPLACE VIEW public.v_ranking_alunos AS
SELECT 
  id,
  nome_completo,
  avatar_url,
  current_instrument,
  level,
  xp,
  streak_days,
  completed_lessons,
  RANK() OVER (ORDER BY xp DESC) AS posicao
FROM public.usuarios
WHERE role = 'student';

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) - POLÍTICAS DE ACESSO
-- ============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrumentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos_partituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amizades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons_desconto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masterclasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masterclass_rsvps ENABLE ROW LEVEL SECURITY;

-- Catálogos públicos (Leitura livre)
CREATE POLICY "Leitura de planos" ON public.planos FOR SELECT USING (true);
CREATE POLICY "Leitura de instrumentos" ON public.instrumentos FOR SELECT USING (true);
CREATE POLICY "Leitura de cursos" ON public.cursos FOR SELECT USING (true);
CREATE POLICY "Leitura de aulas" ON public.aulas FOR SELECT USING (true);
CREATE POLICY "Leitura de partituras" ON public.partituras FOR SELECT USING (true);
CREATE POLICY "Leitura de produtos da loja" ON public.produtos_loja FOR SELECT USING (true);
CREATE POLICY "Leitura de cupons ativos" ON public.cupons_desconto FOR SELECT USING (ativo = true);
CREATE POLICY "Leitura de masterclasses" ON public.masterclasses FOR SELECT USING (true);
CREATE POLICY "Leitura de perfis de alunos" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "Leitura de perfis compatibilidade" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Leitura de posts da comunidade" ON public.community_posts FOR SELECT USING (true);

-- Permissões do Usuário Autenticado sobre seus próprios dados
CREATE POLICY "Usuário insere seu perfil" 
  ON public.usuarios FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Usuário atualiza apenas seu perfil" 
  ON public.usuarios FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário consulta suas assinaturas" 
  ON public.assinaturas_usuarios FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuário consulta seu progresso de aulas" 
  ON public.lesson_progress FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'guest' OR auth.uid() IS NOT NULL);

CREATE POLICY "Usuário salva seu progresso de aulas" 
  ON public.lesson_progress FOR ALL USING (auth.uid()::text = user_id OR user_id = 'guest' OR auth.uid() IS NOT NULL);

CREATE POLICY "Usuário gerencia suas partituras favoritas" 
  ON public.favoritos_partituras FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuário salva gravações no estúdio" 
  ON public.practice_logs FOR ALL USING (auth.uid()::text = user_id OR user_id = 'guest' OR auth.uid() IS NOT NULL);

CREATE POLICY "Criação de postagens na comunidade" 
  ON public.community_posts FOR INSERT WITH CHECK (true);

CREATE POLICY "Curtidas de postagens da comunidade" 
  ON public.community_posts FOR UPDATE USING (true);

CREATE POLICY "Usuário curte postagens" 
  ON public.post_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuário consulta seus pedidos" 
  ON public.orders FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'guest' OR auth.uid() IS NOT NULL);

CREATE POLICY "Usuário cria pedidos" 
  ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuário se inscreve em masterclasses" 
  ON public.masterclass_rsvps FOR ALL USING (auth.uid()::text = user_id OR user_id = 'guest' OR auth.uid() IS NOT NULL);

-- ============================================================================
-- 12. DADOS INICIAIS (SEEDS)
-- ============================================================================

-- Planos Oficiais da Tutti Escola de Música
INSERT INTO public.planos (id, nome, preco, recorrencia, descricao, beneficios, badge)
VALUES
  ('free', 'Plano Gratuito', 0.00, 'gratis', 'Ideal para conhecer a metodologia e primeiros passos', 
   '["Aulas básicas demonstrativas", "Acesso ao metrônomo e afinador", "Biblioteca inicial de partituras", "Maestro IA limitado (5 perguntas/semana)"]'::jsonb, NULL),
  ('pro', 'Plano Tutti Pro Vitalício', 49.90, 'vitalicio', 'Acesso completo vitalício sem mensalidades', 
   '["Mais de 1000 partituras completas e interativas", "Estúdio virtual com digitações completas", "Play-alongs sincronizados com áudio real", "Aulas do iniciante ao avançado", "Acesso vitalício sem cobrança mensal"]'::jsonb, 'Mais Popular'),
  ('ultra', 'Plano Tutti Ultra', 99.90, 'vitalicio', 'Experiência máxima de performance e mentoria', 
   '["Mais de 1000 partituras com arranjos exclusivos", "Acesso prioritário a masterclasses ao vivo com concertistas", "Feedback de áudio das suas gravações", "Mentoria com o Maestro", "Garantia estendida e suporte VIP"]'::jsonb, 'Maior Indicação')
ON CONFLICT (id) DO UPDATE SET
  preco = EXCLUDED.preco,
  recorrencia = EXCLUDED.recorrencia,
  beneficios = EXCLUDED.beneficios,
  badge = EXCLUDED.badge;

-- Instrumentos de Sopro e Base
INSERT INTO public.instrumentos (id, nome, afinacao, familia, emoji, professor_responsavel, descricao, ordem)
VALUES
  ('sax', 'Saxofone Alto', 'Eb', 'Sopro / Madeiras', '🎷', 'Maestro Lucas', 'Sonoridade encorpada, ideal para Bossa Nova, Choro, MPB e Jazz.', 1),
  ('sax_tenor', 'Saxofone Tenor', 'Bb', 'Sopro / Madeiras', '🎷', 'Maestro Lucas', 'Timbre quente e aveludado, presença marcante nos solos clássicos.', 2),
  ('sax_soprano', 'Saxofone Soprano', 'Bb', 'Sopro / Madeiras', '🎷', 'Maestro Lucas', 'Afinação expressiva e brilhante, clássico de canções instrumentais.', 3),
  ('flauta', 'Flauta Transversal', 'C', 'Sopro / Madeiras', '🪈', 'Profª Mariana Sales', 'Respiração diafragmática, fluidez harmônica e agilidade melódica.', 4),
  ('trombone', 'Trombone de Vara', 'Bb/F', 'Sopro / Metais', '🎺', 'Prof. Sérgio Metal', 'Contrapontos, glissandos perfeitos e peso orquestral.', 5),
  ('trompete', 'Trompete', 'Bb', 'Sopro / Metais', '🎺', 'Prof. Roberto Soares', 'Ataque límpido, extensão aguda brilhante e liderança do naipe.', 6),
  ('teclado', 'Piano / Teclado', 'C', 'Teclas', '🎹', 'Profª Clara Vasconcelos', 'Base harmônica, leitura de partituras e condução de acordes.', 7),
  ('violao', 'Violão & Harmonia', 'C', 'Cordas', '🎸', 'Prof. Lucas Arruda', 'Harmonia funcional brasileira, levadas de samba e bossa.', 8)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  afinacao = EXCLUDED.afinacao,
  familia = EXCLUDED.familia,
  descricao = EXCLUDED.descricao;

-- Partituras Clássicas do Repertório Brasileiro e Internacional
INSERT INTO public.partituras (titulo, compositor, instrumento, tonalidade, tom_original, nivel, genero, tempo_bpm, compasso, descricao, visualizacoes)
VALUES
  ('Carinhoso', 'Pixinguinha & João de Barro', 'Saxofone Alto (Eb)', 'G Maior', 'F Maior', 'Intermediário', 'Choro', 76, '2/4', 'Arranjo com contraponto lírico clássico e modulações tradicionais brasileiras.', 1420),
  ('Garota de Ipanema', 'Tom Jobim & Vinicius de Moraes', 'Saxofone Tenor (Bb)', 'F Maior', 'F Maior', 'Intermediário', 'Bossa Nova', 126, '4/4', 'A clássica progressão ii-V-I da Bossa Nova com síncopes marcadas.', 2890),
  ('Autumn Leaves', 'Joseph Kosma', 'Saxofone Alto (Eb)', 'G Menor', 'G Menor', 'Iniciante', 'Jazz Standard', 115, '4/4', 'Música ideal para iniciar a improvisação sobre ciclos de quintas.', 3150),
  ('Brasileirinho', 'Waldir Azevedo', 'Flauta Transversal (C)', 'A Maior', 'A Maior', 'Avançado', 'Choro', 132, '2/4', 'Exercício supremo de agilidade e técnica de respiração circular.', 1890),
  ('Wave', 'Tom Jobim', 'Flauta Transversal (C)', 'D Maior', 'D Maior', 'Intermediário', 'Bossa Nova', 130, '4/4', 'Melodia fluida que exige afinação estável nas notas agudas.', 1220),
  ('Na Baixa do Sapateiro', 'Ary Barroso', 'Trombone de Vara', 'Bb Maior', 'Bb Maior', 'Intermediário', 'Samba-Choro', 110, '2/4', 'Naipe de metais com posições rápidas de vara e apoio diafragmático.', 840);

-- Produtos Populares da Loja Tutti
INSERT INTO public.produtos_loja (nome, preco, preco_antigo, categoria, imagem_url, avaliacao, total_avaliacoes, badge, descricao)
VALUES
  ('Palheta Vandoren Java Red Sax Alto 2.5 (Caixa com 5)', 189.90, 219.00, 'Acessórios', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&auto=format&fit=crop&q=80', 4.9, 87, 'Mais Vendido', 'Palhetas flexíveis com sonoridade brilhante e resposta imediata.'),
  ('Boquilha Yamaha 4C para Sax Alto', 289.00, 320.00, 'Acessórios', 'https://images.unsplash.com/photo-1525994886773-080587e161c2?w=400&auto=format&fit=crop&q=80', 5.0, 142, 'Recomendado', 'A boquilha padrão de conservatórios para afinação limpa e fácil emissão.'),
  ('Método Amadeu Russo para Saxofone & Flauta', 69.90, 85.00, 'Livros', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80', 4.8, 64, NULL, 'Exercícios clássicos de sonoridade, intervalos e digitações cromáticas.'),
  ('Suporte Dobrável de Chão para Sax Alto e Tenor', 139.90, 169.00, 'Acessórios', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80', 4.9, 43, NULL, 'Estrutura metálica reforçada com proteção em veludo para evitar arranhões.');

-- Cupom Inicial de Boas-Vindas
INSERT INTO public.cupons_desconto (codigo, percentual_desconto, valido_ate, ativo)
VALUES ('TUTTI10', 10.00, NOW() + INTERVAL '365 days', true)
ON CONFLICT (codigo) DO NOTHING;

-- Masterclasses em Destaque
INSERT INTO public.masterclasses (titulo, instrutor, instrumento, data_evento, horario, vagas_maximas, inscritos_count, nivel, status, descricao)
VALUES
  ('Oficina de Saúde Vocal e Alta Performance', 'Dra. Mariana Sales', 'Voz & Canto', CURRENT_DATE, '20:00', 250, 189, 'Todos os Níveis', 'Hoje', 'Aprenda técnicas de fonoaudiologia para cantar com afinação e proteger as pregas vocais.'),
  ('Masterclass: O Som Aveludado no Saxofone', 'Maestro Lucas', 'Saxofone Alto & Tenor', CURRENT_DATE + INTERVAL '5 days', '19:30', 200, 94, 'Intermediário', 'Inscrições Abertas', 'Segredos de embocadura, garganta relaxada e controle de dinâmicas pianíssimo.');

-- Postagens Iniciais do Mural da Comunidade
INSERT INTO public.community_posts (id, author_id, author_name, author_avatar, instrument, content, likes, shares, tag)
VALUES
  ('p_init_1', 'admin_maestro', 'Maestro Lucas 🎼', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Saxofone Alto & Harmonia', 'Sejam bem-vindos à Tutti Escola de Música! Pratique ao menos 20 minutos hoje: 5 min de notas longas, 5 min de escalas com metrônomo e 10 min no seu repertório favorito.', 48, 12, '#DicaDoMaestro #Saxofone'),
  ('p_init_2', 'aluno_clara', 'Clara Vasconcelos', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 'Flauta Transversal', 'Estudando o arranjo de "Carinhoso" na flauta! O estúdio virtual com o afinador ajudou demais a estabilizar a 3ª oitava.', 35, 6, '#FlautaTransversal #Choro');

-- ============================================================================
-- FIM DO SCRIPT DE ARQUITETURA TUTTI ♪
-- ============================================================================
