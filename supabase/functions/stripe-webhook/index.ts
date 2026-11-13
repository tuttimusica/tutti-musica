// Supabase Edge Function: stripe-webhook
// Local: supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeKey || !endpointSecret || !supabaseServiceKey) {
    console.error('Configurações de ambiente ausentes no Supabase.');
    return new Response('Configuração de servidor incompleta.', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Obter o corpo original (raw body) e a assinatura
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Cabeçalho stripe-signature ausente.', { status: 400 });
  }

  let event: Stripe.Event;
  const rawBody = await req.text();

  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Falha na validação da assinatura Stripe: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2. Garantir idempotência: verificar se o evento já foi processado
  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_eventos')
    .select('id, processado')
    .eq('id', event.id)
    .maybeSingle();

  if (existingEvent?.processado) {
    console.log(`Evento ${event.id} já foi processado anteriormente. Ignorando.`);
    return new Response(JSON.stringify({ received: true, status: 'already_processed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Registrar evento na tabela de auditoria
  await supabaseAdmin.from('stripe_eventos').upsert({
    id: event.id,
    tipo: event.type,
    payload: event.data.object,
    processado: false,
    created_at: new Date().toISOString(),
  });

  try {
    // 3. Processar o ciclo de vida da assinatura conforme o evento Stripe
    switch (event.type) {
      // ------------------------------------------------------------------------
      // EVENTO: checkout.session.completed
      // Ação no Tutti: Registrar a sessão e relacionar usuário e assinatura
      // ------------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const tipo = session.metadata?.tipo || 'assinatura';
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;

        if (tipo === 'partitura') {
          const partituraId = Number(session.metadata?.partitura_id);
          if (userId && partituraId) {
            await supabaseAdmin.from('partituras_acessos').upsert(
              {
                user_id: userId,
                partitura_id: partituraId,
                tipo_acesso: 'compra',
                stripe_session_id: session.id,
                valor_pago: (session.amount_total || 0) / 100,
                granted_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,partitura_id' }
            );
          }
          break;
        }

        if (tipo === 'loja') {
          const orderId = session.metadata?.order_id;
          if (orderId) {
            await supabaseAdmin
              .from('orders')
              .update({ status: 'paid', stripe_session_id: session.id })
              .eq('id', orderId);
          }
          break;
        }

        const planoId = session.metadata?.plano_id || 'mensal';

        if (!userId) {
          console.warn(`checkout.session.completed sem user_id: ${session.id}`);
          break;
        }

        let dataFim: string | null = null;
        const valorPago = (session.amount_total || 0) / 100;

        // Se for assinatura recorrente, buscar os dados completos no Stripe
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          dataFim = new Date(sub.current_period_end * 1000).toISOString();
        }

        // Upsert na tabela assinaturas_usuarios
        const { data: subData, error: subError } = await supabaseAdmin
          .from('assinaturas_usuarios')
          .upsert(
            {
              user_id: userId,
              plano_id: planoId,
              status: 'ativo',
              data_inicio: new Date().toISOString(),
              data_fim: dataFim,
              cancel_at_period_end: false,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              valor_pago: valorPago,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'stripe_subscription_id' }
          )
          .select()
          .maybeSingle();

        if (subError) {
          console.error('Erro ao salvar assinatura em checkout.session.completed:', subError);
        }

        // Registrar pagamento inicial
        await supabaseAdmin.from('pagamentos').insert({
          user_id: userId,
          assinatura_id: subData?.id || null,
          stripe_payment_intent_id: (session.payment_intent as string) || null,
          valor: valorPago,
          moeda: 'BRL',
          status: 'pago',
          data_pagamento: new Date().toISOString(),
        });

        break;
      }

      // ------------------------------------------------------------------------
      // EVENTO: customer.subscription.created
      // Ação no Tutti: Registrar a assinatura
      // ------------------------------------------------------------------------
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = sub.metadata?.user_id;
        const planoId = sub.metadata?.plano_id || 'mensal';

        // Localizar usuário pelo metadata ou pela assinatura existente
        let targetUserId = userId;
        if (!targetUserId) {
          const { data: existingUser } = await supabaseAdmin
            .from('assinaturas_usuarios')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .limit(1)
            .maybeSingle();
          targetUserId = existingUser?.user_id;
        }

        if (targetUserId) {
          const status = sub.status === 'active' || sub.status === 'trialing' ? 'ativo' : 'pendente';
          const dataFim = new Date(sub.current_period_end * 1000).toISOString();

          await supabaseAdmin.from('assinaturas_usuarios').upsert(
            {
              user_id: targetUserId,
              plano_id: planoId,
              status,
              data_inicio: new Date(sub.start_date * 1000).toISOString(),
              data_fim: dataFim,
              cancel_at_period_end: sub.cancel_at_period_end,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub.id,
              stripe_price_id: sub.items.data[0]?.price.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'stripe_subscription_id' }
          );
        }
        break;
      }

      // ------------------------------------------------------------------------
      // EVENTO: customer.subscription.updated
      // Ação no Tutti: Atualizar plano, situação e período
      // ------------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        let mappedStatus: 'ativo' | 'cancelado' | 'inadimplente' | 'pendente' = 'ativo';

        if (sub.status === 'past_due') {
          mappedStatus = 'inadimplente';
        } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
          mappedStatus = 'cancelado';
        } else if (sub.status === 'active' || sub.status === 'trialing') {
          mappedStatus = 'ativo';
        } else {
          mappedStatus = 'pendente';
        }

        const dataFim = new Date(sub.current_period_end * 1000).toISOString();

        await supabaseAdmin
          .from('assinaturas_usuarios')
          .update({
            status: mappedStatus,
            data_fim: dataFim,
            cancel_at_period_end: sub.cancel_at_period_end,
            stripe_price_id: sub.items.data[0]?.price.id,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        break;
      }

      // ------------------------------------------------------------------------
      // EVENTO: customer.subscription.deleted
      // Ação no Tutti: Encerrar o acesso ao fim do período contratado
      // ------------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('assinaturas_usuarios')
          .update({
            status: 'cancelado',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      // ------------------------------------------------------------------------
      // EVENTO: invoice.paid
      // Ação no Tutti: Confirmar pagamento e renovar a vigência
      // ------------------------------------------------------------------------
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        const customerId = invoice.customer as string;
        const valor = (invoice.amount_paid || 0) / 100;

        // Localizar assinatura correspondente
        let assinaturaId: string | null = null;
        let userId: string | null = null;

        if (subscriptionId) {
          const { data: subRec } = await supabaseAdmin
            .from('assinaturas_usuarios')
            .select('id, user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

          if (subRec) {
            assinaturaId = subRec.id;
            userId = subRec.user_id;
          }
        }

        if (!userId && customerId) {
          const { data: subRecByCust } = await supabaseAdmin
            .from('assinaturas_usuarios')
            .select('id, user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          if (subRecByCust) {
            assinaturaId = subRecByCust.id;
            userId = subRecByCust.user_id;
          }
        }

        if (userId) {
          // Registrar pagamento com comprovante
          await supabaseAdmin.from('pagamentos').insert({
            user_id: userId,
            assinatura_id: assinaturaId,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent as string || null,
            valor,
            moeda: 'BRL',
            status: 'pago',
            comprovante_url: invoice.hosted_invoice_url || invoice.invoice_pdf || null,
            data_pagamento: new Date().toISOString(),
          });

          // Renovar vigência ativa da assinatura
          if (subscriptionId) {
            const lineItem = invoice.lines.data[0];
            const newPeriodEnd = lineItem?.period?.end 
              ? new Date(lineItem.period.end * 1000).toISOString()
              : null;

            await supabaseAdmin
              .from('assinaturas_usuarios')
              .update({
                status: 'ativo',
                ...(newPeriodEnd ? { data_fim: newPeriodEnd } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscriptionId);
          }
        }
        break;
      }

      // ------------------------------------------------------------------------
      // EVENTO: invoice.payment_failed
      // Ação no Tutti: Registrar inadimplência e aplicar regra de bloqueio/tolerância
      // ------------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        const valor = (invoice.amount_due || 0) / 100;

        let userId: string | null = null;
        let assinaturaId: string | null = null;

        if (subscriptionId) {
          const { data: subRec } = await supabaseAdmin
            .from('assinaturas_usuarios')
            .select('id, user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();
          if (subRec) {
            userId = subRec.user_id;
            assinaturaId = subRec.id;
          }
        }

        if (userId) {
          // Registrar falha de pagamento
          await supabaseAdmin.from('pagamentos').insert({
            user_id: userId,
            assinatura_id: assinaturaId,
            stripe_invoice_id: invoice.id,
            valor,
            moeda: 'BRL',
            status: 'falhou',
            data_pagamento: new Date().toISOString(),
          });

          // Marcar inadimplência na assinatura
          if (subscriptionId) {
            await supabaseAdmin
              .from('assinaturas_usuarios')
              .update({
                status: 'inadimplente',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscriptionId);
          }
        }
        break;
      }

      default:
        console.log(`Evento ${event.type} recebido sem processador específico.`);
    }

    // 4. Marcar evento como processado com sucesso na auditoria
    await supabaseAdmin
      .from('stripe_eventos')
      .update({
        processado: true,
        processado_em: new Date().toISOString(),
      })
      .eq('id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error(`Erro ao processar evento ${event.id}:`, error);

    // Registrar erro na auditoria para possibilitar reprocessamento
    await supabaseAdmin
      .from('stripe_eventos')
      .update({
        processado: false,
        erro: error.message || 'Erro desconhecido no processamento do evento',
      })
      .eq('id', event.id);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
