import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const send = (res, status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return send(res,405,{error:'method_not_allowed'}); }
  // Sheet checkout is disabled in production until the complete refund flow is validated.
  if (process.env.TUTTI_PAYMENT_TEST_MODE !== 'true' || process.env.VERCEL_ENV === 'production')
    return send(res,503,{error:'test_checkout_disabled'});
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) return send(res,401,{error:'unauthorized'});
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !anonKey || !secret || !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) return send(res,503,{error:'checkout_unconfigured'});
  const id = req.body?.conjunto_id;
  if (typeof id !== 'string' || !uuidPattern.test(id)) return send(res,400,{error:'conjunto_id_invalido'});
  try {
    const auth = createClient(url, anonKey, { auth: { persistSession:false, autoRefreshToken:false } });
    const { data:{user}, error } = await auth.auth.getUser(token);
    if (error || !user?.id || !user.email_confirmed_at) return send(res,401,{error:'unauthorized'});
    const admin = createClient(url, secret, { auth:{persistSession:false,autoRefreshToken:false} });
    const { data:bundle, error:bundleError } = await admin.from('conjuntos_partituras')
      .select('id,titulo,descricao,preco,publicado').eq('id',id).maybeSingle();
    if (bundleError) return send(res,503,{error:'bundle_unavailable'});
    if (!bundle?.publicado) return send(res,404,{error:'bundle_not_found'});
    const cents = Math.round(Number(bundle.preco)*100);
    if (!Number.isSafeInteger(cents) || cents < 50) return send(res,400,{error:'invalid_price'});
    const { data:existing,error:existingError } = await admin.from('conjuntos_acessos')
      .select('conjunto_id').eq('user_id',user.id).eq('conjunto_id',id).limit(1);
    if (existingError) return send(res,503,{error:'entitlements_unavailable'});
    if (existing?.length) return send(res,409,{error:'bundle_already_owned'});
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // Never accept a client-provided redirect origin.
    const origin = process.env.TUTTI_TEST_ORIGIN;
    if (!origin?.startsWith('https://')) return send(res,503,{error:'test_origin_unconfigured'});
    const session = await stripe.checkout.sessions.create({
      mode:'payment', customer_email:user.email,
      line_items:[{price_data:{currency:'brl',product_data:{name:bundle.titulo,description:bundle.descricao || 'Conjunto de partituras Tutti'},unit_amount:cents},quantity:1}],
      success_url:origin+'/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:origin+'/?checkout=cancelled',
      client_reference_id:user.id,
      metadata:{tipo:'conjunto_partituras',user_id:user.id,conjunto_id:id},
    });
    if (!session.url) return send(res,503,{error:'checkout_unavailable'});
    return send(res,200,{url:session.url});
  } catch {
    return send(res,503,{error:'checkout_unavailable'});
  }
}
