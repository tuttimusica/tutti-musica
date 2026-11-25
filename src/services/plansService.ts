import { supabase } from '../lib/supabase';
import { TUTTI_PHONE_DISPLAY, buildTuttiWhatsAppUrl } from '../components/Common/OfficialContacts';

/**
 * Schema exato de public.planos no Supabase (10 colunas ativas)
 */
export interface DbPlano {
  id: string;
  nome: string;
  ativo: boolean;
  periodo: string | null;
  preco_centavos: number;
  descricao: string | null;
  beneficios: string[] | null;
  stripe_price_id: string | null;
  recorrencia: string | null;
  stripe_test_price_id: string | null;
}

export const PLANOS_SELECT_COLUMNS =
  'id, nome, ativo, periodo, preco_centavos, descricao, beneficios, stripe_price_id, recorrencia, stripe_test_price_id';

const FREE_PLAN_FALLBACK: DbPlano = {
  id: 'free',
  nome: 'Grátis',
  ativo: true,
  periodo: null,
  preco_centavos: 0,
  descricao: 'Acesso inicial gratuito para explorar a escola, partituras abertas e ferramentas básicas.',
  beneficios: [
    'Partituras gratuitas liberadas',
    'Acordes maiores/menores violão e teclado',
    'Desenhos técnicos de sopros e metais',
    'Metrônomo e afinador essencial',
  ],
  stripe_price_id: null,
  recorrencia: 'gratuito',
  stripe_test_price_id: null,
};

const PLAN_SORT_ORDER: Record<string, number> = {
  free: 1,
  pro: 2,
  mensal: 3,
  trimestral: 4,
  ultra_trimestral: 5,
  semestral: 6,
  ultra_semestral: 7,
};

export function isTuttiPaymentsEnabled(): boolean {
  const envVal = import.meta.env.VITE_TUTTI_PAYMENTS_ENABLED;
  return String(envVal ?? 'false').toLowerCase() === 'true';
}

export function getPlanoPriceCents(plan: Pick<DbPlano, 'preco_centavos'>): number {
  const cents = Number(plan.preco_centavos ?? 0);
  if (!Number.isFinite(cents) || cents < 0) return 0;
  return Math.round(cents);
}

export function getPlanoPriceReais(plan: Pick<DbPlano, 'preco_centavos'>): number {
  return getPlanoPriceCents(plan) / 100;
}

export function formatBrlFromCents(cents: number | null | undefined): string {
  const value = Math.max(0, Number(cents ?? 0)) / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function isFreePlan(plan: Pick<DbPlano, 'id' | 'preco_centavos'>): boolean {
  return plan.id === 'free' || Number(plan.preco_centavos) === 0;
}

export function isProPlan(plan: Pick<DbPlano, 'id'>): boolean {
  return plan.id === 'pro';
}

export function isUltraPlan(plan: Pick<DbPlano, 'id' | 'recorrencia'>): boolean {
  const id = plan.id.toLowerCase();
  return (
    id === 'mensal' ||
    id === 'trimestral' ||
    id === 'semestral' ||
    id === 'ultra' ||
    id.startsWith('ultra_') ||
    plan.recorrencia === 'contrato_manual'
  );
}

export function sortPlans(plans: DbPlano[]): DbPlano[] {
  return [...plans].sort((a, b) => {
    const orderA = PLAN_SORT_ORDER[a.id] ?? 99;
    const orderB = PLAN_SORT_ORDER[b.id] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.preco_centavos ?? 0) - (b.preco_centavos ?? 0);
  });
}

export function normalizePlanBenefits(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function buildUltraWhatsAppUrl(
  plan: Pick<DbPlano, 'id' | 'nome' | 'preco_centavos' | 'periodo'>,
  userEmail?: string | null
): string {
  const formattedPrice = formatBrlFromCents(plan.preco_centavos);
  const periodoLabel = plan.periodo ? ` (${plan.periodo})` : '';
  const emailHint = userEmail ? `\nMeu e-mail cadastrado na Tutti: ${userEmail}` : '';
  return buildTuttiWhatsAppUrl(
    `Olá Secretaria Tutti Escola de Música (${TUTTI_PHONE_DISPLAY})! Tenho interesse em contratar o plano ${plan.nome}${periodoLabel} no valor de ${formattedPrice}.${emailHint}\nGostaria de combinar os horários das aulas ao vivo e concluir a matrícula.`
  );
}

/**
 * Busca todos os planos ativos direto do Supabase (`public.planos`), sem colunas inexistentes.
 * Garante ordenação consistente e inclui Grátis caso não exista como linha ativa no banco.
 */
export async function fetchActivePlans(): Promise<DbPlano[]> {
  const { data, error } = await supabase
    .from('planos')
    .select(PLANOS_SELECT_COLUMNS)
    .eq('ativo', true);

  if (error) {
    throw new Error(`Erro ao carregar planos: ${error.message}`);
  }

  const normalized = (data || []).map((row: Record<string, any>) => ({
    ...row,
    preco_centavos: Number(row.preco_centavos ?? 0),
    beneficios: normalizePlanBenefits(row.beneficios),
  })) as DbPlano[];

  if (!normalized.some((p) => p.id === 'free')) {
    normalized.unshift(FREE_PLAN_FALLBACK);
  }

  return sortPlans(normalized);
}

/**
 * Busca todos os planos (ativos e inativos) para administração no DeveloperPanel.
 */
export async function fetchAllPlans(): Promise<DbPlano[]> {
  const { data, error } = await supabase
    .from('planos')
    .select(PLANOS_SELECT_COLUMNS);

  if (error) {
    throw new Error(`Erro ao carregar catálogo de planos: ${error.message}`);
  }

  const normalized = (data || []).map((row: Record<string, any>) => ({
    ...row,
    preco_centavos: Number(row.preco_centavos ?? 0),
    beneficios: normalizePlanBenefits(row.beneficios),
  })) as DbPlano[];

  return sortPlans(normalized);
}