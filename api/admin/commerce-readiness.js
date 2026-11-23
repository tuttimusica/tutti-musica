import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { ensureProWebhookReadPermissions } from '../../lib/stripe/pro-readiness.js';

// Admin-only, read-only production readiness. Does not create Checkout Sessions,
// trigger payments, grant entitlements, or reveal credential values.
const reply = (res,status,data) => {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.statusCode=status;
  res.end(JSON.stringify(data));
};

export default async function handler(req,res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow','GET');
    return reply(res,405,{error:'method_not_allowed'});
  }
  const token = /^Bearer\\s+(.+)$/i.exec(req.headers?.authorization||'')?.[1];
  if (!token) return reply(res,401,{error:'unauthorized'});

  const url=process.env.VITE_SUPABASE_URL;
  const publicKey=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey=process.env.TUTTI_PRO_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) return reply(res,503,{error:'supabase_configuration_unavailable'});
  try {
    if (process.env.VERCEL_ENV !== 'production' ||
        new URL(url).hostname !== 'viwxalwpvuvgcyxsdjbi.supabase.co')
      return reply(res,503,{error:'production_environment_unavailable'});
  } catch {
    return reply(res,503,{error:'production_environment_unavailable'});
  }

  try {
    const auth=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await auth.auth.getUser(token);
    if (authError||!user?.id||!user.email||!user.email_confirmed_at)
      return reply(res,401,{error:'unauthorized'});

    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:admins,error:adminsError}=await admin.from('administradores_autorizados').select('email').limit(1000);
    if (adminsError) return reply(res,503,{error:'admin_authorization_unavailable'});
    const email=user.email.trim().toLowerCase();
    if (!(admins||[]).some(a=>typeof a.email==='string'&&a.email.trim().toLowerCase()===email))
      return reply(res,403,{error:'forbidden'});

    const checks={
      frontendEnabled:process.env.VITE_TUTTI_PAYMENTS_ENABLED==='true',
      serverEnabled:process.env.TUTTI_PRO_LIVE_CHECKOUT_ENABLED==='true',
      stripeAccount:false,
      stripePrice:false,
      stripeRequiredReads:false,
      webhookSecretConfigured:false,
      catalog:false,
      fulfillmentProject:false,
    };
    const {data:identity,error:identityError}=await admin.auth.admin.getUserById(user.id);
    checks.fulfillmentProject=!identityError&&identity?.user?.id===user.id;
    const {data:plan,error:planError}=await admin.from('planos')
      .select('stripe_price_id,ativo,periodo,recorrencia,preco_centavos')
      .eq('id','pro').maybeSingle();
    const {count,error:countError}=await admin.from('partituras')
      .select('id',{head:true,count:'exact'}).eq('publicado',true).eq('categoria','paga');
    checks.catalog=!countError&&Number(count)>0;
    const priceId=plan?.stripe_price_id;
    const planReady=!planError&&plan?.ativo===true&&plan.periodo==='vitalicio'&&
      plan.recorrencia==='unico'&&plan.preco_centavos===1990&&
      typeof priceId==='string'&&priceId.startsWith('price_');
    const key=process.env.TUTTI_STRIPE_LIVE_SECRET_KEY;
    checks.webhookSecretConfigured=typeof process.env.TUTTI_STRIPE_LIVE_WEBHOOK_SECRET==='string'&&
      process.env.TUTTI_STRIPE_LIVE_WEBHOOK_SECRET.startsWith('whsec_');
    const stripeKeyConfigured=typeof key==='string'&&/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key);
    if(stripeKeyConfigured&&planReady) {
      try {
        const stripe=new Stripe(key);
        const owner=await stripe.accounts.retrieve();
        checks.stripeAccount=owner?.id==='acct_1UZuju0U9nB6Q0cf'&&owner.charges_enabled===true;
        const price=await stripe.prices.retrieve(priceId);
        checks.stripePrice=price?.active===true&&price?.livemode===true&&
          price.currency==='brl'&&price.unit_amount===1990&&!price.recurring;
        try {
          await ensureProWebhookReadPermissions(stripe);
          checks.stripeRequiredReads=true;
        } catch {}
      } catch {}
    }
    // These checks are preflight only. Actual payment-to-download has not been tested.
    const checksPass=checks.fulfillmentProject&&checks.catalog&&checks.stripeAccount&&
      checks.stripePrice&&checks.stripeRequiredReads&&checks.webhookSecretConfigured;
    return reply(res,200,{
      product:'Tutti Pro Vitalício',
      amountBRL:'19,90',
      checks,
      preflightPass:checksPass,
      endToEndProven:false,
      publicSalesApproved:false,
      note:'Pré-verificação sem cobrança. Exige compra controlada e confirmação do webhook e PDF para liberar vendas.',
    });
  } catch {
    return reply(res,503,{error:'readiness_check_unavailable'});
  }
}
