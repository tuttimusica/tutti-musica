-- ============================================================================
-- TUTTI ESCOLA DE MÚSICA ♪ - INTEGRAÇÃO STRIPE & CICLO DE VIDA DE ASSINATURAS
-- Projeto Supabase: https://viwxalwpvuvgcyxsdjbi.supabase.co
-- Versão: 3.0 (Idempotente, Compatível, RLS Restritivo e Auditoria)
-- ============================================================================
-- Este script adiciona/atualiza as tabelas para suportar Stripe Checkout,
-- Webhooks de ciclo de vida, idempotência, pagamentos e controle de acesso real.
-- ============================================================================

-- 1. TABELA DE PLANOS COMERCIALIZADOS (public.planos)
CREATE TABLE IF NOT EXISTS public.planos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  recorrencia TEXT NOT NULL,
  descricao TEXT,
  beneficios JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  ativo BOOLEAN DEFAULT true,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  intervalo TEXT DEFAULT 'month',
  intervalo_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que as colunas Stripe existam se a tabela já foi criada anteriormente
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS intervalo TEXT DEFAULT 'month';
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS intervalo_count INTEGER DEFAULT 1;
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Atualização e inserção dos planos oficiais da Tutti com os Stripe Product IDs cadastrados
INSERT INTO public.planos (id, nome, preco, recorrencia, descricao, stripe_product_id, intervalo, intervalo_count, ativo, badge)
VALUES
  (
    'mensal',
    'Tutti Ultra Mensal',
    299.90,
    'mensal',
    'Cobrança mensal com aulas individuais ao vivo, mentoria VIP e estúdio completo',
    'prod_Vb7a4cZFfk1zKO',
    'month',
    1,
    true,
    'Maior Indicação'
  ),
  (
    'trimestral',
    'Tutti Ultra Trimestral',
    799.90,
    'trimestral',
    'Cobrança recorrente a cada 3 meses com mentoria VIP e acompanhamento individual',
    'prod_Vb7bFGhgGPvHtW',
    'month',
    3,
    true,
    'Plano Trimestral Exclusivo'
  ),
  (
    'semestral',
    'Tutti Ultra Semestral',
    1649.90,
    'semestral',
    'Cobrança recorrente a cada 6 meses com formação completa e maestros dedicados',
    'prod_Vb7e0rGvV0Hqhf',
    'month',
    6,
    true,
    'Plano Semestral Exclusivo'
  ),
  (
    'pro',
    'Tutti Pro Vitalício',
    49.90,
    'vitalicio',
    'Pagamento único e acesso vitalício a mais de 1000 partituras e Maestro IA',
    NULL,
    'one_time',
    0,
    true,
    'Mais Popular'
  ),
  (
    'free',
    'Grátis',
    0.00,
    'gratis',
    'Acesso introdutório a 30 partituras e Maestro IA com limite semanal',
    NULL,
    'free',
    0,
    true,
    'Acesso Gratuito'
  )
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  preco = EXCLUDED.preco,
  recorrencia = EXCLUDED.recorrencia,
  descricao = EXCLUDED.descricao,
  stripe_product_id = EXCLUDED.stripe_product_id,
  intervalo = EXCLUDED.intervalo,
  intervalo_count = EXCLUDED.intervalo_count,
  ativo = EXCLUDED.ativo,
  badge = EXCLUDED.badge,
  updated_at = NOW();

-- Regra de negócio: Desativar novas contratações do plano anual, preservando históricos
UPDATE public.planos 
SET ativo = false, updated_at = NOW() 
WHERE id = 'anual' OR recorrencia = 'anual';


-- 2. TABELA DE ASSINATURAS DOS USUÁRIOS (public.assinaturas_usuarios)
CREATE TABLE IF NOT EXISTS public.assinaturas_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_id TEXT REFERENCES public.planos(id),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('ativo', 'cancelado', 'pendente', 'inadimplente', 'expirado', 'trialing')),
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  valor_pago NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas adicionais para instalações prévias
ALTER TABLE public.assinaturas_usuarios ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE public.assinaturas_usuarios ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.assinaturas_usuarios ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.assinaturas_usuarios ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE public.assinaturas_usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices de alta performance para busca e validação no backend
CREATE INDEX IF NOT EXISTS idx_assinaturas_user_id ON public.assinaturas_usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas_usuarios(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_stripe_sub ON public.assinaturas_usuarios(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_stripe_cust ON public.assinaturas_usuarios(stripe_customer_id);


-- 3. TABELA DE HISTÓRICO DE PAGAMENTOS (public.pagamentos)
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assinatura_id UUID REFERENCES public.assinaturas_usuarios(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  valor NUMERIC(10, 2) NOT NULL,
  moeda TEXT DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('pago', 'pendente', 'falhou', 'reembolsado')),
  data_pagamento TIMESTAMPTZ DEFAULT NOW(),
  comprovante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_invoice ON public.pagamentos(stripe_invoice_id);


-- 4. TABELA DE IDEMPOTÊNCIA E AUDITORIA DE EVENTOS STRIPE (public.stripe_eventos)
CREATE TABLE IF NOT EXISTS public.stripe_eventos (
  id TEXT PRIMARY KEY, -- ID original do evento na Stripe (ex: evt_1O...)
  tipo TEXT NOT NULL,
  payload JSONB,
  processado BOOLEAN DEFAULT false,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_eventos_tipo ON public.stripe_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_stripe_eventos_processado ON public.stripe_eventos(processado);


-- 5. FUNÇÃO DE VERIFICAÇÃO DE ASSINATURA ATIVA NO BACKEND (SECURITY DEFINER)
-- Nunca confia no front-end: verifica a vigência real no banco de dados.
CREATE OR REPLACE FUNCTION public.has_active_subscription(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_is_dev BOOLEAN;
  v_has_active_sub BOOLEAN;
BEGIN
  -- Se for desenvolvedor autorizado, possui acesso administrativo total
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = target_user_id
    AND LOWER(u.email) IN ('eliandrolucas.el@gmail.com', 'desenvolvedor@tutti.mus.br')
  ) INTO v_is_dev;

  IF v_is_dev THEN
    RETURN true;
  END IF;

  -- Verifica se existe assinatura com status ativo e dentro da vigência
  SELECT EXISTS (
    SELECT 1 FROM public.assinaturas_usuarios
    WHERE user_id = target_user_id
      AND status = 'ativo'
      AND (data_fim IS NULL OR data_fim >= NOW())
  ) INTO v_has_active_sub;

  RETURN v_has_active_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_eventos ENABLE ROW LEVEL SECURITY;

-- Planos: Leitura pública de planos ativos
DROP POLICY IF EXISTS "Leitura de planos pública" ON public.planos;
CREATE POLICY "Leitura de planos pública" ON public.planos
  FOR SELECT USING (true);

-- Assinaturas: Aluno pode apenas CONSULTAR as suas próprias assinaturas
DROP POLICY IF EXISTS "Aluno consulta sua própria assinatura" ON public.assinaturas_usuarios;
CREATE POLICY "Aluno consulta sua própria assinatura" ON public.assinaturas_usuarios
  FOR SELECT USING (auth.uid() = user_id);

-- Restrição rígida: Alunos NÃO podem inserir nem atualizar assinaturas diretamente
DROP POLICY IF EXISTS "Bloqueio de inserção direta por aluno" ON public.assinaturas_usuarios;
CREATE POLICY "Bloqueio de inserção direta por aluno" ON public.assinaturas_usuarios
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Bloqueio de atualização direta por aluno" ON public.assinaturas_usuarios;
CREATE POLICY "Bloqueio de atualização direta por aluno" ON public.assinaturas_usuarios
  FOR UPDATE USING (false);

-- Pagamentos: Aluno pode consultar apenas seus próprios comprovantes
DROP POLICY IF EXISTS "Aluno consulta seus pagamentos" ON public.pagamentos;
CREATE POLICY "Aluno consulta seus pagamentos" ON public.pagamentos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Bloqueio de inserção de pagamentos por aluno" ON public.pagamentos;
CREATE POLICY "Bloqueio de inserção de pagamentos por aluno" ON public.pagamentos
  FOR INSERT WITH CHECK (false);

-- Eventos Stripe: Tabela interna restrita
DROP POLICY IF EXISTS "Stripe eventos apenas leitura admin" ON public.stripe_eventos;
CREATE POLICY "Stripe eventos apenas leitura admin" ON public.stripe_eventos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND LOWER(u.email) IN ('eliandrolucas.el@gmail.com', 'desenvolvedor@tutti.mus.br')
    )
  );
