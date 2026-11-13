// Supabase Edge Function: create-checkout-session
// Local: supabase/functions/create-checkout-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Tratar pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada no ambiente do Supabase.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.');
    }

    // 1. Exigir autenticação válida do Supabase (JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autenticação não fornecido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado ou sessão expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Extrair plano_id do corpo da requisição
    const { plano_id, return_url } = await req.json();
    if (!plano_id) {
      return new Response(JSON.stringify({ error: 'O identificador do plano (plano_id) é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Buscar o plano no banco de dados pelo identificador recebido (Nunca confiar no front-end)
    const { data: plano, error: planoError } = await supabaseAdmin
      .from('planos')
      .select('*')
      .eq('id', plano_id)
      .single();

    if (planoError || !plano) {
      return new Response(JSON.stringify({ error: 'Plano não encontrado no catálogo da Tutti.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Verificar se o plano está ativo e pode ser contratado
    if (!plano.ativo) {
      return new Response(JSON.stringify({ error: 'Este plano não está disponível para novas contratações.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 5. Criar ou recuperar o Stripe Customer vinculado ao usuário autenticado
    let stripeCustomerId: string | null = null;
    const { data: existingSub } = await supabaseAdmin
      .from('assinaturas_usuarios')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      // Buscar cliente no Stripe por e-mail ou criar novo
      const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          metadata: {
            supabase_user_id: user.id,
            platform: 'tutti_musica',
          },
        });
        stripeCustomerId = newCustomer.id;
      }
    }

    const origin = return_url || req.headers.get('origin') || 'https://tutti-musica-2sbahjsww-tutti8.vercel.app';
    const successUrl = `${origin}/?session_id={CHECKOUT_SESSION_ID}&status=success&tab=assinatura`;
    const cancelUrl = `${origin}/?status=cancelled&tab=assinatura`;

    // 6. Preparar line_items do Stripe Checkout
    // Se o plano tiver stripe_price_id configurado, usa-o.
    // Senão, cria a estrutura com o stripe_product_id ou cria com os dados oficiais do banco.
    let lineItems: any[];

    if (plano.stripe_price_id) {
      lineItems = [{ price: plano.stripe_price_id, quantity: 1 }];
    } else if (plano.stripe_product_id) {
      lineItems = [
        {
          price_data: {
            currency: 'brl',
            product: plano.stripe_product_id,
            unit_amount: Math.round(Number(plano.preco) * 100),
            recurring: {
              interval: (plano.intervalo as 'month' | 'year') || 'month',
              interval_count: plano.intervalo_count || 1,
            },
          },
          quantity: 1,
        },
      ];
    } else {
      // Fallback seguro usando dados validados do banco
      lineItems = [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: plano.nome,
              description: plano.descricao || 'Assinatura Tutti Escola de Música',
            },
            unit_amount: Math.round(Number(plano.preco) * 100),
            ...(plano.recorrencia === 'vitalicio'
              ? {}
              : {
                  recurring: {
                    interval: (plano.intervalo as 'month' | 'year') || 'month',
                    interval_count: plano.intervalo_count || 1,
                  },
                }),
          },
          quantity: 1,
        },
      ];
    }

    const sessionMode = plano.recorrencia === 'vitalicio' ? 'payment' : 'subscription';

    // 7. Criar sessão Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: sessionMode,
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        user_email: user.email || '',
        plano_id: plano.id,
        plano_nome: plano.nome,
      },
      subscription_data: sessionMode === 'subscription' ? {
        metadata: {
          user_id: user.id,
          plano_id: plano.id,
        },
      } : undefined,
    });

    // 8. Retornar somente a URL segura do Checkout ao frontend
    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro na criação de sessão checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao iniciar checkout seguro com a Stripe.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
