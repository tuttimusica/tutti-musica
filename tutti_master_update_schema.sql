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

-- Garante que is_admin() exista e reconheça os desenvolvedores autorizados
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
-- 2. PARTITURAS GRATUITAS VS PAGAS + CONTROLE DE ACESSO + BUCKET PRIVADO
-- ============================================================================
ALTER TABLE public.partituras
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'gratuita';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partituras_categoria_check'
  ) THEN
    ALTER TABLE public.partituras
      ADD CONSTRAINT partituras_categoria_check CHECK (categoria IN ('gratuita', 'paga'));
  END IF;
END $$;

ALTER TABLE public.partituras
  ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.partituras
  ADD COLUMN IF NOT EXISTS publicado BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.partituras
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_partituras_categoria ON public.partituras(categoria);
CREATE INDEX IF NOT EXISTS idx_partituras_publicado ON public.partituras(publicado);
CREATE INDEX IF NOT EXISTS idx_partituras_featured ON public.partituras(is_featured, featured_order);

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

ALTER TABLE public.partituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partituras_acessos ENABLE ROW LEVEL SECURITY;

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

-- Storage Buckets para Partituras (Gratuitas = público; Pagas = PRIVADO)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partituras',
  'partituras',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partituras-pagas',
  'partituras-pagas',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false;

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
  USING (bucket_id = 'partituras' AND public.is_admin());

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
  USING (bucket_id = 'partituras-pagas' AND public.is_admin());

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
  END IF;
END $$;

-- ============================================================================
-- FIM DA MIGRAÇÃO MASTER TUTTI ♪
-- ============================================================================
