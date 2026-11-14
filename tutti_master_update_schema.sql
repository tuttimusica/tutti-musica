-- ============================================================================
-- TUTTI ESCOLA DE MÚSICA ♪ - MIGRAÇÃO MASTER DE ATUALIZAÇÃO (IDEMPOTENTE)
-- Projeto Supabase: https://viwxalwpvuvgcyxsdjbi.supabase.co
-- Versão: 4.0
-- ============================================================================
-- Execute este script no SQL Editor do painel do Supabase.
-- Ele preserva dados existentes e aplica todas as atualizações de:
--   1. Controle de e-mails de boas-vindas (idempotência após confirmação)
--   2. Separação de Partituras Gratuitas e Pagas + Acessos + Bucket Privado
--   3. Gestão dinâmica de Planos pelo Desenvolvedor
--   4. Reativação da Loja Tutti + Galeria multi-imagem + Bucket Produtos
--   5. Realtime e Políticas RLS granulares
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Garante que is_admin() exista, reconheça os desenvolvedores autorizados e seja executável via RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
      SELECT LOWER(email) FROM public.administradores_autorizados
    )
    OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
      'eliandrolucas.el@gmail.com',
      'desenvolvedor@tutti.mus.br'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Caso exista função legada tutti_is_admin(), garante permissão para evitar erro 42501 em tabelas existentes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'tutti_is_admin'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.tutti_is_admin() TO anon, authenticated, service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- 1. AUDITORIA & IDEMPOTÊNCIA DE E-MAIL DE BOAS-VINDAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.welcome_email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'unconfigured')),
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welcome_email_logs_user_id ON public.welcome_email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_welcome_email_logs_status ON public.welcome_email_logs(status);

ALTER TABLE public.welcome_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de welcome_email_logs por usuario ou admin" ON public.welcome_email_logs;
CREATE POLICY "Leitura de welcome_email_logs por usuario ou admin"
  ON public.welcome_email_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================================
-- 2. PARTITURAS GRATUITAS VS PAGAS + COMPOSITORES + CONJUNTOS + BUCKETS
-- ============================================================================
-- Garante compatibilidade incremental de todas as colunas usadas pelo app e por registros legados
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS instrumento TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS instrumento_id TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS tonalidade TEXT DEFAULT 'C';
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS tom_original TEXT DEFAULT 'C';
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS nivel TEXT DEFAULT 'Intermediário';
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS nivel_dificuldade TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS genero TEXT DEFAULT 'Bossa Nova';
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS estilo_musical TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS tempo_bpm INTEGER DEFAULT 120;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS compasso TEXT DEFAULT '4/4';
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS arquivo_pdf_url TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS featured_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS cifras JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS melodia_notas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'gratuita';
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS publicado BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.partituras ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Relaxa NOT NULL legado caso instrumento_id ou tonalidade tenham sido criados obrigatórios sem default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partituras' AND column_name = 'instrumento_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.partituras ALTER COLUMN instrumento_id DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partituras' AND column_name = 'tonalidade' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.partituras ALTER COLUMN tonalidade DROP NOT NULL;
  END IF;
END $$;

-- Sincroniza registros existentes caso tenham usado colunas legadas (instrumento_id / estilo_musical / nivel_dificuldade)
UPDATE public.partituras
SET
  instrumento = COALESCE(NULLIF(TRIM(instrumento), ''), NULLIF(TRIM(instrumento_id), ''), 'Saxofone Alto'),
  genero = COALESCE(NULLIF(TRIM(genero), ''), NULLIF(TRIM(estilo_musical), ''), 'Bossa Nova'),
  estilo_musical = COALESCE(NULLIF(TRIM(estilo_musical), ''), NULLIF(TRIM(genero), ''), 'Bossa Nova'),
  nivel = COALESCE(NULLIF(TRIM(nivel), ''), NULLIF(TRIM(nivel_dificuldade), ''), 'Intermediário'),
  nivel_dificuldade = COALESCE(NULLIF(TRIM(nivel_dificuldade), ''), NULLIF(TRIM(nivel), ''), 'Intermediário'),
  tonalidade = COALESCE(NULLIF(TRIM(tonalidade), ''), 'C')
WHERE instrumento IS NULL OR genero IS NULL OR estilo_musical IS NULL OR nivel IS NULL OR tonalidade IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partituras_categoria_check'
  ) THEN
    ALTER TABLE public.partituras
      ADD CONSTRAINT partituras_categoria_check CHECK (categoria IN ('gratuita', 'paga'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partituras_categoria ON public.partituras(categoria);
CREATE INDEX IF NOT EXISTS idx_partituras_publicado ON public.partituras(publicado);
CREATE INDEX IF NOT EXISTS idx_partituras_featured ON public.partituras(is_featured, featured_order);
CREATE INDEX IF NOT EXISTS idx_partituras_compositor ON public.partituras(compositor);

-- 2.1 Cadastro Persistente de Compositores (deduplicado por nome normalizado)
CREATE TABLE IF NOT EXISTS public.compositores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compositores_nome ON public.compositores(nome);
CREATE INDEX IF NOT EXISTS idx_compositores_nome_normalizado ON public.compositores(nome_normalizado);

-- Backfill seguro de compositores já cadastrados em public.partituras
INSERT INTO public.compositores (nome, nome_normalizado)
SELECT DISTINCT
  TRIM(REGEXP_REPLACE(compositor, '\s+', ' ', 'g')) AS nome,
  LOWER(TRIM(REGEXP_REPLACE(compositor, '\s+', ' ', 'g'))) AS nome_normalizado
FROM public.partituras
WHERE compositor IS NOT NULL AND TRIM(compositor) <> ''
ON CONFLICT (nome_normalizado) DO NOTHING;

ALTER TABLE public.compositores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de compositores" ON public.compositores;
CREATE POLICY "Leitura publica de compositores"
  ON public.compositores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin gerencia compositores" ON public.compositores;
CREATE POLICY "Admin gerencia compositores"
  ON public.compositores FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tabela de acessos/compras individuais de partituras pagas
CREATE TABLE IF NOT EXISTS public.partituras_acessos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partitura_id INTEGER NOT NULL REFERENCES public.partituras(id) ON DELETE CASCADE,
  tipo_acesso TEXT NOT NULL DEFAULT 'compra' CHECK (tipo_acesso IN ('compra', 'assinatura', 'cortesia', 'admin')),
  stripe_session_id TEXT,
  valor_pago NUMERIC(10, 2) DEFAULT 0.00,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partitura_id)
);

CREATE INDEX IF NOT EXISTS idx_partituras_acessos_user ON public.partituras_acessos(user_id);
CREATE INDEX IF NOT EXISTS idx_partituras_acessos_partitura ON public.partituras_acessos(partitura_id);

-- 2.2 Estrutura Preparada para Conjuntos / Pacotes Comerciais de Partituras
CREATE TABLE IF NOT EXISTS public.conjuntos_partituras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  publicado BOOLEAN NOT NULL DEFAULT false,
  imagem_url TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conjuntos_partituras_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conjunto_id UUID NOT NULL REFERENCES public.conjuntos_partituras(id) ON DELETE CASCADE,
  partitura_id INTEGER NOT NULL REFERENCES public.partituras(id) ON DELETE CASCADE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conjunto_id, partitura_id)
);

CREATE TABLE IF NOT EXISTS public.conjuntos_acessos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conjunto_id UUID NOT NULL REFERENCES public.conjuntos_partituras(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  valor_pago NUMERIC(10, 2) DEFAULT 0.00,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, conjunto_id)
);

CREATE INDEX IF NOT EXISTS idx_conjuntos_itens_conjunto ON public.conjuntos_partituras_itens(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_conjuntos_itens_partitura ON public.conjuntos_partituras_itens(partitura_id);
CREATE INDEX IF NOT EXISTS idx_conjuntos_acessos_user ON public.conjuntos_acessos(user_id);

ALTER TABLE public.partituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partituras_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conjuntos_partituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conjuntos_partituras_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conjuntos_acessos ENABLE ROW LEVEL SECURITY;

-- RLS de Partituras: público/alunos/professores veem apenas publicadas; admin vê e gerencia tudo
DROP POLICY IF EXISTS "Leitura de partituras" ON public.partituras;
DROP POLICY IF EXISTS "Leitura de partituras publicadas ou admin" ON public.partituras;
CREATE POLICY "Leitura de partituras publicadas ou admin"
  ON public.partituras FOR SELECT
  USING (publicado = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia partituras" ON public.partituras;
CREATE POLICY "Admin gerencia partituras"
  ON public.partituras FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RLS de Acessos a Partituras Pagas
DROP POLICY IF EXISTS "Usuario ve seus acessos a partituras" ON public.partituras_acessos;
CREATE POLICY "Usuario ve seus acessos a partituras"
  ON public.partituras_acessos FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia acessos a partituras" ON public.partituras_acessos;
CREATE POLICY "Admin gerencia acessos a partituras"
  ON public.partituras_acessos FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RLS de Conjuntos de Partituras
DROP POLICY IF EXISTS "Leitura de conjuntos publicados ou admin" ON public.conjuntos_partituras;
CREATE POLICY "Leitura de conjuntos publicados ou admin"
  ON public.conjuntos_partituras FOR SELECT
  USING (publicado = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia conjuntos" ON public.conjuntos_partituras;
CREATE POLICY "Admin gerencia conjuntos"
  ON public.conjuntos_partituras FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Leitura de itens de conjuntos" ON public.conjuntos_partituras_itens;
CREATE POLICY "Leitura de itens de conjuntos"
  ON public.conjuntos_partituras_itens FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.conjuntos_partituras c
      WHERE c.id = conjunto_id AND c.publicado = true
    )
  );

DROP POLICY IF EXISTS "Admin gerencia itens de conjuntos" ON public.conjuntos_partituras_itens;
CREATE POLICY "Admin gerencia itens de conjuntos"
  ON public.conjuntos_partituras_itens FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Usuario ve seus acessos a conjuntos" ON public.conjuntos_acessos;
CREATE POLICY "Usuario ve seus acessos a conjuntos"
  ON public.conjuntos_acessos FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia acessos a conjuntos" ON public.conjuntos_acessos;
CREATE POLICY "Admin gerencia acessos a conjuntos"
  ON public.conjuntos_acessos FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Storage Buckets para Partituras (Gratuitas = público; Pagas = PRIVADO)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partituras',
  'partituras',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partituras-pagas',
  'partituras-pagas',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- Policies Storage: bucket gratuito 'partituras'
DROP POLICY IF EXISTS "Leitura publica partituras gratuitas" ON storage.objects;
CREATE POLICY "Leitura publica partituras gratuitas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partituras');

DROP POLICY IF EXISTS "Admin envia partituras gratuitas" ON storage.objects;
CREATE POLICY "Admin envia partituras gratuitas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'partituras' AND public.is_admin());

DROP POLICY IF EXISTS "Admin atualiza partituras gratuitas" ON storage.objects;
CREATE POLICY "Admin atualiza partituras gratuitas"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'partituras' AND public.is_admin())
  WITH CHECK (bucket_id = 'partituras' AND public.is_admin());

DROP POLICY IF EXISTS "Admin remove partituras gratuitas" ON storage.objects;
CREATE POLICY "Admin remove partituras gratuitas"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'partituras' AND public.is_admin());

-- Policies Storage: bucket PRIVADO 'partituras-pagas' (sem SELECT público!)
DROP POLICY IF EXISTS "Admin acessa partituras pagas" ON storage.objects;
CREATE POLICY "Admin acessa partituras pagas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partituras-pagas' AND public.is_admin());

DROP POLICY IF EXISTS "Admin envia partituras pagas" ON storage.objects;
CREATE POLICY "Admin envia partituras pagas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'partituras-pagas' AND public.is_admin());

DROP POLICY IF EXISTS "Admin atualiza partituras pagas" ON storage.objects;
CREATE POLICY "Admin atualiza partituras pagas"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'partituras-pagas' AND public.is_admin())
  WITH CHECK (bucket_id = 'partituras-pagas' AND public.is_admin());

DROP POLICY IF EXISTS "Admin remove partituras pagas" ON storage.objects;
CREATE POLICY "Admin remove partituras pagas"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'partituras-pagas' AND public.is_admin());

-- ============================================================================
-- 3. PLANOS EDITÁVEIS PELO DESENVOLVEDOR (public.planos)
-- ============================================================================
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS intervalo TEXT DEFAULT 'month';
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS intervalo_count INTEGER DEFAULT 1;
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Atualiza ordem padrão sem sobrescrever edições manuais de nome/preço caso já existam
UPDATE public.planos SET ordem = 0 WHERE id = 'free' AND COALESCE(ordem, 0) = 0;
UPDATE public.planos SET ordem = 1 WHERE id = 'pro' AND COALESCE(ordem, 0) = 0;
UPDATE public.planos SET ordem = 2 WHERE id = 'mensal' AND COALESCE(ordem, 0) = 0;
UPDATE public.planos SET ordem = 3 WHERE id = 'trimestral' AND COALESCE(ordem, 0) = 0;
UPDATE public.planos SET ordem = 4 WHERE id = 'semestral' AND COALESCE(ordem, 0) = 0;
UPDATE public.planos SET ordem = 5 WHERE id = 'ultra' AND COALESCE(ordem, 0) = 0;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de planos" ON public.planos;
DROP POLICY IF EXISTS "Leitura de planos pública" ON public.planos;
DROP POLICY IF EXISTS "Leitura de planos ativos ou admin" ON public.planos;
CREATE POLICY "Leitura de planos ativos ou admin"
  ON public.planos FOR SELECT
  USING (ativo = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia planos" ON public.planos;
CREATE POLICY "Admin gerencia planos"
  ON public.planos FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- 4. REATIVAÇÃO DA LOJA TUTTI & UPLOAD DE IMAGENS (public.produtos_loja)
-- ============================================================================
ALTER TABLE public.produtos_loja DROP CONSTRAINT IF EXISTS produtos_loja_categoria_check;
ALTER TABLE public.produtos_loja
  ADD CONSTRAINT produtos_loja_categoria_check
  CHECK (categoria IN ('Acessórios', 'Instrumentos', 'Vestuário', 'Livros', 'Partituras', 'Outros'));

ALTER TABLE public.produtos_loja ADD COLUMN IF NOT EXISTS imagens JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.produtos_loja ADD COLUMN IF NOT EXISTS imagem_principal TEXT;
ALTER TABLE public.produtos_loja ADD COLUMN IF NOT EXISTS publicado BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.produtos_loja ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
ALTER TABLE public.produtos_loja ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill de imagem principal / array de imagens para produtos já existentes
UPDATE public.produtos_loja
SET
  imagem_principal = COALESCE(imagem_principal, imagem_url),
  imagens = CASE
    WHEN (imagens IS NULL OR jsonb_array_length(imagens) = 0) AND imagem_url IS NOT NULL AND imagem_url <> ''
      THEN jsonb_build_array(imagem_url)
    ELSE COALESCE(imagens, '[]'::jsonb)
  END
WHERE imagem_principal IS NULL OR imagens IS NULL OR jsonb_array_length(imagens) = 0;

ALTER TABLE public.produtos_loja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de produtos da loja" ON public.produtos_loja;
DROP POLICY IF EXISTS "Leitura de produtos publicados ou admin" ON public.produtos_loja;
CREATE POLICY "Leitura de produtos publicados ou admin"
  ON public.produtos_loja FOR SELECT
  USING (publicado = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia produtos da loja" ON public.produtos_loja;
CREATE POLICY "Admin gerencia produtos da loja"
  ON public.produtos_loja FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Storage Bucket público 'produtos-loja' para fotos dos produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produtos-loja',
  'produtos-loja',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Leitura publica fotos produtos loja" ON storage.objects;
CREATE POLICY "Leitura publica fotos produtos loja"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'produtos-loja');

DROP POLICY IF EXISTS "Admin envia fotos produtos loja" ON storage.objects;
CREATE POLICY "Admin envia fotos produtos loja"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'produtos-loja' AND public.is_admin());

DROP POLICY IF EXISTS "Admin atualiza fotos produtos loja" ON storage.objects;
CREATE POLICY "Admin atualiza fotos produtos loja"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'produtos-loja' AND public.is_admin());

DROP POLICY IF EXISTS "Admin remove fotos produtos loja" ON storage.objects;
CREATE POLICY "Admin remove fotos produtos loja"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'produtos-loja' AND public.is_admin());

-- Atualização da tabela de pedidos (public.orders) para suportar pagamento pendente/Stripe real
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'pending_payment', 'paid', 'confirmed', 'shipped', 'cancelled'));

-- ============================================================================
-- 5. SUPABASE REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partituras'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.partituras;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'planos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.planos;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'produtos_loja'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos_loja;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partituras_acessos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.partituras_acessos;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'compositores'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.compositores;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conjuntos_partituras'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conjuntos_partituras;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'usuarios'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'solicitacoes_professores'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_professores;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 6. CADASTRO, CREDENCIAMENTO, APROVAÇÃO E SEGURANÇA DE PROFESSORES (v5.0)
-- ============================================================================

-- 6.1 Garantir colunas essenciais em public.usuarios e public.profiles
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'aprovado';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS current_instrument TEXT DEFAULT 'Saxofone Alto';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS instrumento_principal TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Intermediário';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS practice_hours INTEGER DEFAULT 0;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS completed_lessons INTEGER DEFAULT 0;

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('student', 'teacher', 'admin'));

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_approval_status_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_approval_status_check
  CHECK (approval_status IN ('nao_solicitado', 'pendente', 'aprovado', 'rejeitado'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'aprovado';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_instrument TEXT DEFAULT 'Saxofone Alto';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('nao_solicitado', 'pendente', 'aprovado', 'rejeitado'));

-- 6.2 Garantir estrutura e unicidade de pendentes em public.solicitacoes_professores
CREATE TABLE IF NOT EXISTS public.solicitacoes_professores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  instrumento TEXT NOT NULL,
  bio TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.solicitacoes_professores ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE public.solicitacoes_professores ADD COLUMN IF NOT EXISTS decided_by TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_professores(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_email ON public.solicitacoes_professores(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_solicitacoes_user_id ON public.solicitacoes_professores(user_id);

DROP INDEX IF EXISTS idx_solicitacao_pendente_unica;
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacao_pendente_unica
  ON public.solicitacoes_professores (LOWER(email))
  WHERE status = 'pendente';

CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacao_user_pendente_unica
  ON public.solicitacoes_professores (user_id)
  WHERE status = 'pendente' AND user_id <> 'anonimo';

-- 6.3 Trigger de Blindagem de Roles (impede auto-promoção no frontend/API)
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.bypass_role_protection', true) = 'on' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Usuário comum nunca pode se inserir como teacher ou admin diretamente
    NEW.role := 'student';
    IF NEW.approval_status IS NULL OR NEW.approval_status NOT IN ('nao_solicitado', 'pendente') THEN
      NEW.approval_status := 'nao_solicitado';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Usuário comum nunca pode alterar seu próprio role ou approval_status
    NEW.role := OLD.role;
    NEW.approval_status := OLD.approval_status;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.usuarios;
CREATE TRIGGER trg_protect_user_roles
  BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_roles();

DROP TRIGGER IF EXISTS trg_protect_profiles_role ON public.profiles;
CREATE TRIGGER trg_protect_profiles_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_roles();

-- 6.4 Trigger Automático de Cadastro (auth.users -> public.usuarios + solicitacoes_professores)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_nome TEXT;
  v_avatar TEXT;
  v_account_type TEXT;
  v_instrumento TEXT;
  v_bio TEXT;
  v_is_admin_email BOOLEAN;
  v_is_teacher_request BOOLEAN;
  v_role TEXT;
  v_approval_status TEXT;
BEGIN
  PERFORM set_config('app.bypass_role_protection', 'on', true);

  v_email := LOWER(TRIM(COALESCE(NEW.email, '')));
  v_nome := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(v_email, '@', 1), ''),
    'Músico Tutti'
  );
  v_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), ''),
    NULL
  );
  v_account_type := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'account_type', 'student')));
  v_instrumento := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'instrumento'), ''), 'Saxofone Alto');
  v_bio := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'bio'), ''), 'Estudando no Tutti Escola de Música 🎶');

  SELECT EXISTS (
    SELECT 1 FROM public.administradores_autorizados WHERE LOWER(email) = v_email
  ) OR v_email IN ('eliandrolucas.el@gmail.com', 'desenvolvedor@tutti.mus.br')
  INTO v_is_admin_email;

  v_is_teacher_request := (NOT v_is_admin_email) AND (v_account_type = 'teacher');

  IF v_is_admin_email THEN
    v_role := 'admin';
    v_approval_status := 'aprovado';
  ELSIF v_is_teacher_request THEN
    -- REGRA DE SEGURANÇA: todo novo professor inicia como student + approval_status = 'pendente'
    v_role := 'student';
    v_approval_status := 'pendente';
  ELSE
    v_role := 'student';
    v_approval_status := 'aprovado';
  END IF;

  INSERT INTO public.usuarios (
    user_id, email, nome_completo, avatar_url, bio,
    current_instrument, instrumento_principal, role, approval_status
  )
  VALUES (
    NEW.id,
    v_email,
    v_nome,
    v_avatar,
    v_bio,
    v_instrumento,
    v_instrumento,
    v_role,
    v_approval_status
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(NULLIF(public.usuarios.email, ''), EXCLUDED.email),
    nome_completo = COALESCE(NULLIF(public.usuarios.nome_completo, ''), EXCLUDED.nome_completo),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.usuarios.avatar_url),
    current_instrument = COALESCE(NULLIF(EXCLUDED.current_instrument, ''), public.usuarios.current_instrument),
    instrumento_principal = COALESCE(NULLIF(EXCLUDED.instrumento_principal, ''), public.usuarios.instrumento_principal),
    bio = COALESCE(NULLIF(EXCLUDED.bio, ''), public.usuarios.bio),
    role = CASE WHEN public.usuarios.role IN ('teacher', 'admin') THEN public.usuarios.role ELSE EXCLUDED.role END,
    approval_status = CASE
      WHEN public.usuarios.role = 'teacher' AND public.usuarios.approval_status = 'aprovado' THEN 'aprovado'
      ELSE EXCLUDED.approval_status
    END,
    updated_at = NOW();

  INSERT INTO public.profiles (
    id, email, display_name, photo_url, role, approval_status, current_instrument, bio
  )
  VALUES (
    NEW.id, v_email, v_nome, v_avatar, v_role, v_approval_status, v_instrumento, v_bio
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
    display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
    photo_url = COALESCE(EXCLUDED.photo_url, public.profiles.photo_url),
    current_instrument = COALESCE(NULLIF(EXCLUDED.current_instrument, ''), public.profiles.current_instrument),
    bio = COALESCE(NULLIF(EXCLUDED.bio, ''), public.profiles.bio),
    role = CASE WHEN public.profiles.role IN ('teacher', 'admin') THEN public.profiles.role ELSE EXCLUDED.role END,
    approval_status = CASE
      WHEN public.profiles.role = 'teacher' AND public.profiles.approval_status = 'aprovado' THEN 'aprovado'
      ELSE EXCLUDED.approval_status
    END,
    updated_at = NOW();

  -- Criação automática da solicitação pendente de professor (sem duplicidade)
  IF v_is_teacher_request THEN
    INSERT INTO public.solicitacoes_professores (
      user_id, nome, email, instrumento, bio, status, created_at
    )
    SELECT
      NEW.id::text,
      v_nome,
      v_email,
      v_instrumento,
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'bio'), ''), 'Solicitação de credenciamento enviada no cadastro docente.'),
      'pendente',
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.solicitacoes_professores
      WHERE (LOWER(email) = v_email OR user_id = NEW.id::text)
        AND status = 'pendente'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6.5 RLS segura em usuarios, profiles e solicitacoes_professores
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_professores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de usuarios permitida" ON public.usuarios;
DROP POLICY IF EXISTS "Usuario ve seu perfil ou professores aprovados ou admin" ON public.usuarios;
CREATE POLICY "Usuario ve seu perfil ou professores aprovados ou admin"
  ON public.usuarios FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (role = 'teacher' AND approval_status = 'aprovado')
  );

DROP POLICY IF EXISTS "Usuario cria seu proprio perfil" ON public.usuarios;
CREATE POLICY "Usuario cria seu proprio perfil"
  ON public.usuarios FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'student');

DROP POLICY IF EXISTS "Usuario atualiza seu proprio perfil ou admin" ON public.usuarios;
CREATE POLICY "Usuario atualiza seu proprio perfil ou admin"
  ON public.usuarios FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Public ou Alunos podem criar solicitacao de professor" ON public.solicitacoes_professores;
CREATE POLICY "Public ou Alunos podem criar solicitacao de professor"
  ON public.solicitacoes_professores FOR INSERT
  WITH CHECK (
    status = 'pendente'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = user_id
  );

DROP POLICY IF EXISTS "Desenvolvedor gerencia solicitacoes" ON public.solicitacoes_professores;
CREATE POLICY "Desenvolvedor gerencia solicitacoes"
  ON public.solicitacoes_professores FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid()::text = user_id
    OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Apenas desenvolvedor decide solicitacoes" ON public.solicitacoes_professores;
CREATE POLICY "Apenas desenvolvedor decide solicitacoes"
  ON public.solicitacoes_professores FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Apenas desenvolvedor remove solicitacoes" ON public.solicitacoes_professores;
CREATE POLICY "Apenas desenvolvedor remove solicitacoes"
  ON public.solicitacoes_professores FOR DELETE
  USING (public.is_admin());

-- 6.6 RPCs de Aprovação e Rejeição de Professores (Acesso exclusivo do Desenvolvedor)
CREATE OR REPLACE FUNCTION public.aprovar_professor_rpc(p_solicitacao_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT;
  v_email TEXT;
  v_nome TEXT;
  v_instrumento TEXT;
  v_bio TEXT;
  v_resolved_auth_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas o desenvolvedor autorizado pode aprovar professores.';
  END IF;

  PERFORM set_config('app.bypass_role_protection', 'on', true);

  UPDATE public.solicitacoes_professores
  SET status = 'aprovado',
      decided_at = NOW(),
      decided_by = COALESCE(auth.jwt() ->> 'email', 'Desenvolvedor Autorizado')
  WHERE id = p_solicitacao_id
  RETURNING user_id, email, nome, instrumento, bio
  INTO v_user_id, v_email, v_nome, v_instrumento, v_bio;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de professor não encontrada.';
  END IF;

  -- Resolve UUID do auth.users caso necessário
  IF v_user_id IS NOT NULL AND v_user_id <> 'anonimo' THEN
    BEGIN
      v_resolved_auth_id := v_user_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_resolved_auth_id := NULL;
    END;
  END IF;

  IF v_resolved_auth_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_resolved_auth_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(v_email)
    LIMIT 1;
  END IF;

  IF v_resolved_auth_id IS NOT NULL THEN
    INSERT INTO public.usuarios (
      user_id, email, nome_completo, current_instrument, instrumento_principal, bio, role, approval_status
    )
    VALUES (
      v_resolved_auth_id,
      LOWER(v_email),
      COALESCE(v_nome, 'Professor Tutti'),
      COALESCE(v_instrumento, 'Saxofone Alto'),
      COALESCE(v_instrumento, 'Saxofone Alto'),
      COALESCE(v_bio, 'Professor credenciado pela Tutti Escola de Música.'),
      'teacher',
      'aprovado'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = COALESCE(NULLIF(public.usuarios.email, ''), EXCLUDED.email),
      nome_completo = COALESCE(NULLIF(public.usuarios.nome_completo, ''), EXCLUDED.nome_completo),
      current_instrument = COALESCE(NULLIF(EXCLUDED.current_instrument, ''), public.usuarios.current_instrument),
      instrumento_principal = COALESCE(NULLIF(EXCLUDED.instrumento_principal, ''), public.usuarios.instrumento_principal),
      bio = COALESCE(NULLIF(EXCLUDED.bio, ''), public.usuarios.bio),
      role = 'teacher',
      approval_status = 'aprovado',
      updated_at = NOW();

    INSERT INTO public.profiles (
      id, email, display_name, current_instrument, bio, role, approval_status
    )
    VALUES (
      v_resolved_auth_id,
      LOWER(v_email),
      COALESCE(v_nome, 'Professor Tutti'),
      COALESCE(v_instrumento, 'Saxofone Alto'),
      COALESCE(v_bio, 'Professor credenciado pela Tutti Escola de Música.'),
      'teacher',
      'aprovado'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'teacher',
      approval_status = 'aprovado',
      updated_at = NOW();
  ELSIF v_email IS NOT NULL THEN
    UPDATE public.usuarios
    SET role = 'teacher',
        approval_status = 'aprovado',
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(v_email);

    UPDATE public.profiles
    SET role = 'teacher',
        approval_status = 'aprovado',
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(v_email);
  END IF;

  INSERT INTO public.eventos_acesso (user_id, perfil, tipo_evento, detalhes)
  VALUES (
    auth.uid()::text,
    'desenvolvedor',
    'professor_aprovado',
    jsonb_build_object(
      'solicitacao_id', p_solicitacao_id,
      'professor_user_id', v_resolved_auth_id,
      'email_professor', v_email,
      'nome', v_nome
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'aprovado',
    'user_id', v_resolved_auth_id,
    'professor_email', v_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.rejeitar_professor_rpc(p_solicitacao_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT;
  v_email TEXT;
  v_nome TEXT;
  v_resolved_auth_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas o desenvolvedor autorizado pode rejeitar professores.';
  END IF;

  PERFORM set_config('app.bypass_role_protection', 'on', true);

  UPDATE public.solicitacoes_professores
  SET status = 'rejeitado',
      decided_at = NOW(),
      decided_by = COALESCE(auth.jwt() ->> 'email', 'Desenvolvedor Autorizado')
  WHERE id = p_solicitacao_id
  RETURNING user_id, email, nome
  INTO v_user_id, v_email, v_nome;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de professor não encontrada.';
  END IF;

  IF v_user_id IS NOT NULL AND v_user_id <> 'anonimo' THEN
    BEGIN
      v_resolved_auth_id := v_user_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_resolved_auth_id := NULL;
    END;
  END IF;

  IF v_resolved_auth_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_resolved_auth_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(v_email)
    LIMIT 1;
  END IF;

  IF v_resolved_auth_id IS NOT NULL THEN
    UPDATE public.usuarios
    SET role = 'student',
        approval_status = 'rejeitado',
        updated_at = NOW()
    WHERE user_id = v_resolved_auth_id;

    UPDATE public.profiles
    SET role = 'student',
        approval_status = 'rejeitado',
        updated_at = NOW()
    WHERE id = v_resolved_auth_id;
  ELSIF v_email IS NOT NULL THEN
    UPDATE public.usuarios
    SET role = 'student',
        approval_status = 'rejeitado',
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(v_email);

    UPDATE public.profiles
    SET role = 'student',
        approval_status = 'rejeitado',
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(v_email);
  END IF;

  INSERT INTO public.eventos_acesso (user_id, perfil, tipo_evento, detalhes)
  VALUES (
    auth.uid()::text,
    'desenvolvedor',
    'professor_rejeitado',
    jsonb_build_object(
      'solicitacao_id', p_solicitacao_id,
      'professor_user_id', v_resolved_auth_id,
      'email_professor', v_email,
      'nome', v_nome
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'rejeitado',
    'user_id', v_resolved_auth_id,
    'professor_email', v_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.aprovar_professor_rpc(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aprovar_professor_rpc(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rejeitar_professor_rpc(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rejeitar_professor_rpc(UUID) TO authenticated, service_role;

-- ============================================================================
-- FIM DA MIGRAÇÃO MASTER TUTTI ♪
-- ============================================================================

