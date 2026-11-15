/**
 * Tutti Escola de Música — Configuração Oficial dos Planos Stripe
 * 
 * IDs de produtos existentes na conta Stripe de testes; seus preços atuais são recorrentes e NÃO devem ser usados no checkout novo:
 * - Mensal: prod_Vb7a4cZFfk1zKO (R$ 299,90 por mês de acesso, renovação manual)
 * - Ultra trimestral: prod_Vb7bFGhgGPvHtW (R$ 799,90 por 3 meses de acesso, pagamento único)
 * - Ultra semestral: prod_Vb7e0rGvV0Hqhf (R$ 1.649,90 por 6 meses de acesso, pagamento único)
 */

export interface TuttiStripePlan {
  id: 'monthly' | 'trimestral' | 'semestral';
  name: string;
  badge: string;
  priceFormatted: string;
  periodLabel: string;
  billingSubtitle: string;
  amountCents: number;
  stripeProductId: string;
  stripePriceId?: string;
  paymentLinkUrl?: string;
  features: string[];
  vipFeatures?: string[];
  recommended?: boolean;
}

export const TUTTI_STRIPE_PLANS: Record<'monthly' | 'trimestral' | 'semestral', TuttiStripePlan> = {
  monthly: {
    id: 'monthly',
    name: 'Tutti Ultra Mensal',
    badge: 'Maior Indicação',
    priceFormatted: 'R$ 299,90',
    periodLabel: '/mês',
    billingSubtitle: 'PAGAMENTO ANTECIPADO • RENOVAÇÃO MANUAL, SEM COBRANÇA AUTOMÁTICA',
    amountCents: 29990,
    stripeProductId: 'prod_Vb7a4cZFfk1zKO',
    features: [
      'Mais de 1000 partituras completas',
      'Acordes maiores/menores violão e teclado',
      'Desenhos de notas saxofone',
      'Metrônomo e afinador profissional',
      'Aulas para iniciantes',
      'Suporte prioritário',
      'Acesso a todas as partituras em PDF',
      'IA Maestro ilimitada 24h',
    ],
    vipFeatures: [
      'Aulas virtuais com professores reais',
      'Suporte VIP e acompanhamento individual'
    ],
    recommended: true
  },
  trimestral: {
    id: 'trimestral',
    name: 'Tutti Ultra Trimestral',
    badge: 'Plano Trimestral Exclusivo',
    priceFormatted: 'R$ 799,90',
    periodLabel: '/trimestre',
    billingSubtitle: 'PAGAMENTO ÚNICO • 3 MESES DE ACESSO • SEM RENOVAÇÃO AUTOMÁTICA',
    amountCents: 79990,
    stripeProductId: 'prod_Vb7bFGhgGPvHtW',
    features: [
      'Aulas virtuais e individuais com professores reais',
      'Mentoria personalizada e suporte pedagógico VIP',
      'Acesso a todas as partituras em PDF da biblioteca',
      'Maestro IA ilimitado para tirar dúvidas 24h',
      'Estúdio completo (Saxofone, Teclado, Violão, Afinador e Metrônomo)',
      'Economia garantida no ciclo trimestral'
    ],
    vipFeatures: [
      'Aulas virtuais com professores reais',
      'Mentoria personalizada e suporte pedagógico VIP'
    ]
  },
  semestral: {
    id: 'semestral',
    name: 'Tutti Ultra Semestral',
    badge: 'Plano Semestral Exclusivo',
    priceFormatted: 'R$ 1.649,90',
    periodLabel: '/semestre',
    billingSubtitle: 'PAGAMENTO ÚNICO • 6 MESES DE ACESSO • SEM RENOVAÇÃO AUTOMÁTICA',
    amountCents: 164990,
    stripeProductId: 'prod_Vb7e0rGvV0Hqhf',
    features: [
      'Aulas virtuais e individuais com professores reais',
      'Mentoria personalizada e suporte pedagógico VIP',
      'Acesso a todas as partituras em PDF da biblioteca',
      'Maestro IA ilimitado para tirar dúvidas 24h',
      'Estúdio completo (Saxofone, Teclado, Violão, Afinador e Metrônomo)',
      'Máxima economia no ciclo semestral e mentoria contínua'
    ],
    vipFeatures: [
      'Aulas virtuais com professores reais',
      'Mentoria personalizada e suporte pedagógico VIP'
    ]
  }
};

/**
 * Retorna os detalhes de um plano Stripe pelo seu ID de ciclo
 */
export function getStripePlanByPeriod(period: 'monthly' | 'trimestral' | 'semestral'): TuttiStripePlan {
  return TUTTI_STRIPE_PLANS[period];
}

/**
 * Retorna os detalhes de um plano Stripe pelo Product ID
 */
export function getStripePlanByProductId(productId: string): TuttiStripePlan | undefined {
  return Object.values(TUTTI_STRIPE_PLANS).find(p => p.stripeProductId === productId);
}
