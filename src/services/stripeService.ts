/**
 * Tutti Escola de Música ♪ — Serviço de Assinaturas e Stripe
 * 
 * Comunicação segura com o Backend (Supabase Edge Functions / Express)
 * para criação de Checkout Sessions, Customer Portal e consulta de assinaturas reais.
 * 
 * Regra: NUNCA envia preços ou permissões arbitrárias; valida tudo no backend.
 */

import { supabase } from '../lib/supabase';
import { TUTTI_STRIPE_PLANS } from '../data/stripePlans';

export interface UserSubscriptionDetails {
  id: string;
  userId: string;
  planoId: 'free' | 'pro' | 'mensal' | 'trimestral' | 'semestral';
  planoNome: string;
  preco: number;
  periodicidade: string;
  status: 'ativo' | 'cancelado' | 'pendente' | 'inadimplente' | 'expirado' | 'trialing';
  dataInicio: string;
  dataFim: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  comprovanteUltimoPagamento?: string;
}

export interface PaymentHistoryItem {
  id: string;
  valor: number;
  moeda: string;
  status: 'pago' | 'pendente' | 'falhou' | 'reembolsado';
  dataPagamento: string;
  comprovanteUrl?: string;
  stripeInvoiceId?: string;
}

/**
 * Cria uma sessão do Stripe Checkout via Backend autenticado e retorna a URL segura
 */
export async function createStripeCheckoutSession(planoId: string): Promise<{ url: string; sessionId?: string }> {
  // 1. Obter sessão atual do usuário
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Você precisa estar autenticado na Tutti para assinar um plano.');
  }

  const returnUrl = window.location.origin;

  // 2. Tentar chamar a Supabase Edge Function oficial 'create-checkout-session'
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        plano_id: planoId,
        return_url: returnUrl,
      },
    });

    if (!error && data?.url) {
      return { url: data.url, sessionId: data.sessionId };
    }
  } catch (edgeFnErr) {
    console.warn('Tentando endpoint de checkout no servidor local...', edgeFnErr);
  }

  // 3. Fallback para endpoint local de desenvolvimento (/api/stripe/create-checkout-session)
  const res = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      plano_id: planoId,
      return_url: returnUrl,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Não foi possível gerar a sessão de checkout segura com a Stripe.');
  }

  if (!json.url) {
    throw new Error('URL de checkout não retornada pelo servidor.');
  }

  return { url: json.url, sessionId: json.sessionId };
}

/**
 * Cria uma sessão do Stripe Customer Portal para o aluno gerenciar faturas e cancelamentos
 */
export async function createStripeCustomerPortal(): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Você precisa estar autenticado para acessar o portal de faturamento.');
  }

  // 1. Tentar Supabase Edge Function 'create-portal-session'
  try {
    const { data, error } = await supabase.functions.invoke('create-portal-session');
    if (!error && data?.url) {
      return { url: data.url };
    }
  } catch (edgeFnErr) {
    console.warn('Tentando endpoint local do portal...', edgeFnErr);
  }

  // 2. Fallback para endpoint local do servidor
  const res = await fetch('/api/stripe/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Não foi possível gerar a sessão do portal de assinaturas.');
  }

  return { url: json.url };
}

/**
 * Consulta a assinatura ativa real do aluno diretamente no Supabase
 */
export async function fetchUserActiveSubscription(userId: string): Promise<UserSubscriptionDetails | null> {
  try {
    const { data, error } = await supabase
      .from('assinaturas_usuarios')
      .select('*, planos(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const plano = data.planos || {};
    return {
      id: data.id,
      userId: data.user_id,
      planoId: data.plano_id,
      planoNome: plano.nome || (data.plano_id === 'mensal' ? 'Tutti Ultra Mensal' : data.plano_id === 'trimestral' ? 'Tutti Ultra Trimestral' : data.plano_id === 'semestral' ? 'Tutti Ultra Semestral' : data.plano_id === 'pro' ? 'Tutti Pro Vitalício' : 'Grátis'),
      preco: Number(data.valor_pago || plano.preco || 0),
      periodicidade: plano.recorrencia || 'mensal',
      status: data.status,
      dataInicio: data.data_inicio,
      dataFim: data.data_fim,
      cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
    };
  } catch (err) {
    console.warn('Erro ao consultar assinatura no Supabase:', err);
    return null;
  }
}

/**
 * Consulta o histórico real de pagamentos do aluno no Supabase
 */
export async function fetchUserPaymentHistory(userId: string): Promise<PaymentHistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('user_id', userId)
      .order('data_pagamento', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      valor: Number(item.valor),
      moeda: item.moeda || 'BRL',
      status: item.status,
      dataPagamento: item.data_pagamento || item.created_at,
      comprovanteUrl: item.comprovante_url,
      stripeInvoiceId: item.stripe_invoice_id,
    }));
  } catch (err) {
    console.warn('Erro ao carregar histórico de pagamentos:', err);
    return [];
  }
}
