import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getPlan } from './plan-policy.js';

const send = (res, status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res,405,{error:'method_not_allowed'}); }
  // Fail closed: no checkout outside explicitly isolated test environment.
  if (process.env.TUTTI_PAYMENT_TEST_MODE !== 'true' || process.env.VERCEL_ENV === 'production')
    return send(res,503,{error:'test_checkout_disabled'});
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) return send(res,401,{error:'unauthorized'});
  const planId = req.body?.plano_id;
  if (planId !== 'pro') return send(res,403,{error:'ultra_contract_only'});
  let plan;
  try { plan = getPlan(planId); } catch { return send(res,400,{error:'invalid_plan'}); }
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Security boundary: the backend must never query a different Supabase project
  // from the frontend build. Fail closed instead of crossing production/staging.
  if (!url || !process.env.VITE_SUPABASE_URL || url !== process.env.VITE_SUPABASE_URL)
    return send(res,503,{error:'supabase_environment_mismatch'});

  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const key = process.env.STRIPE_SECRET_KEY;
  const origin = process.env.TUTTI_TEST_ORIGIN;
  if (!url || !anonKey || !key?.startsWith('sk_test_') || !origin?.startsWith('https://'))
    return send(res,503,{error:'test_checkout_unconfigured'});
  try {
    const auth = createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error} = await auth.auth.getUser(token);
    if (error || !user?.id || !user.email_confirmed_at) return send(res,401,{error:'unauthorized'});
    // Server-owned plan and price reference: the browser never supplies amounts.
    const {data:storedPlan,error:catalogError}=await auth.from('planos')
      .select('id,ativo,periodo,recorrencia,preco_centavos,stripe_test_price_id')
      .eq('id','pro').maybeSingle();
    if(catalogError||!storedPlan?.ativo||storedPlan.periodo!=='vitalicio'||
       storedPlan.recorrencia!=='unico'||storedPlan.preco_centavos!==1990||
       !storedPlan.stripe_test_price_id?.startsWith('price_'))
      return send(res,503,{error:'pro_price_not_configured'});
    const {data:existing,error:existingError}=await auth.from('assinaturas_usuarios')
      .select('id').eq('user_id',user.id).eq('plano_id','pro').eq('status','ativo')
      .limit(1);
    if(existingError)return send(res,503,{error:'entitlement_check_unavailable'});
    if(existing?.length)return send(res,409,{error:'pro_already_owned'});
    const stripe = new Stripe(key);
    const stripePrice=await stripe.prices.retrieve(storedPlan.stripe_test_price_id);
    if(!stripePrice.active||stripePrice.livemode||stripePrice.recurring||
       stripePrice.currency!=='brl'||stripePrice.unit_amount!==plan.amountCents||
       stripePrice.product!=='prod_VdjsXzU2lrVLYk')
      return send(res,503,{error:'pro_stripe_product_mismatch'});
    const checkout = await stripe.checkout.sessions.create({
      mode:'payment',
      customer_email:user.email,
      line_items:[{price:stripePrice.id,quantity:1}],
      client_reference_id:user.id,
      metadata:{tipo:'tutti_plano',user_id:user.id,plano_id:'pro'},
      success_url:origin+'/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:origin+'/?checkout=cancelled'
    });
    return send(res,200,{url:checkout.url,sessionId:checkout.id});
  } catch { return send(res,503,{error:'test_checkout_unavailable'}); }
}
