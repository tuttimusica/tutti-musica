import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const send = (res,status,body) => {res.statusCode=status;res.end(JSON.stringify(body));};
async function readRawBody(req) {
  const chunks=[]; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function reversedPayment(stripe,session) {
  if (!session.payment_intent) return true;
  const payment=await stripe.paymentIntents.retrieve(session.payment_intent,{expand:['latest_charge']});
  const charge=payment.latest_charge;
  if (typeof charge==='object' && charge && (charge.refunded || charge.disputed || charge.amount_refunded > 0)) return true;
  return payment.status!=='succeeded';
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'});}
  if(process.env.TUTTI_PAYMENT_TEST_MODE!=='true'||process.env.VERCEL_ENV==='production')
    return send(res,503,{error:'test_webhook_disabled'});
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey=process.env.STRIPE_SECRET_KEY;
  const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Security boundary: the backend must never query a different Supabase project
  // from the frontend build. Fail closed instead of crossing production/staging.
  if (!url || !process.env.VITE_SUPABASE_URL || url !== process.env.VITE_SUPABASE_URL)
    return send(res,503,{error:'supabase_environment_mismatch'});

  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if(!secret||!stripeKey?.startsWith('sk_test_')||!url||!serviceKey) return send(res,503,{error:'test_webhook_unconfigured'});
  const signature=req.headers['stripe-signature'];
  if(typeof signature!=='string') return send(res,400,{error:'invalid_signature'});
  let event; const stripe=new Stripe(stripeKey);
  try { event=stripe.webhooks.constructEvent(await readRawBody(req),signature,secret); }
  catch {return send(res,400,{error:'invalid_signature'});}
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  if(event.type==='charge.refunded'||event.type==='charge.dispute.created') {
    try {
      const intent=event.data.object.payment_intent;
      if(typeof intent!=='string') return send(res,200,{received:true,ignored:true});
      const matches=await stripe.checkout.sessions.list({payment_intent:intent,limit:5});
      const session=matches.data.find(s=>s.metadata?.tipo==='conjunto_partituras');
      if(!session) return send(res,200,{received:true,ignored:true});
      const {error}=await admin.from('conjuntos_acessos').delete().eq('stripe_session_id',session.id);
      if(error) throw error;
      return send(res,200,{received:true,revoked:true});
    } catch { return send(res,503,{error:'revocation_unavailable'}); }
  }
  if(event.type!=='checkout.session.completed' && event.type!=='checkout.session.async_payment_succeeded')
    return send(res,200,{received:true,ignored:true});
  const incoming=event.data.object;
  if(incoming.metadata?.tipo!=='conjunto_partituras') return send(res,200,{received:true,ignored:true});
  const userId=incoming.metadata?.user_id, bundleId=incoming.metadata?.conjunto_id;
  if(!uuidPattern.test(userId||'')||!uuidPattern.test(bundleId||'')||incoming.client_reference_id!==userId)
    return send(res,400,{error:'invalid_metadata'});
  try {
    // Re-fetch authoritative Stripe data. Never grant based only on browser data or event metadata.
    const session=await stripe.checkout.sessions.retrieve(incoming.id);
    if(session.livemode||session.mode!=='payment'||session.payment_status!=='paid'||
       session.currency?.toLowerCase()!=='brl'||session.client_reference_id!==userId||
       session.metadata?.user_id!==userId||session.metadata?.conjunto_id!==bundleId||
       session.metadata?.tipo!=='conjunto_partituras') return send(res,200,{received:true,not_granted:true});
    const {data:bundle,error:bundleError}=await admin.from('conjuntos_partituras')
      .select('id,preco,publicado').eq('id',bundleId).maybeSingle();
    if(bundleError) throw bundleError;
    const expected=Math.round(Number(bundle?.preco)*100);
    if(!bundle?.publicado||!Number.isSafeInteger(expected)||expected<50||session.amount_total!==expected)
      return send(res,200,{received:true,not_granted:true});
    if(await reversedPayment(stripe,session)) return send(res,200,{received:true,reversed:true});

    const previous=await admin.from('stripe_eventos').select('processado').eq('id',event.id).maybeSingle();
    if(previous.error) throw previous.error;
    if(previous.data?.processado) return send(res,200,{received:true,duplicate:true});
    const eventWrite=await admin.from('stripe_eventos').upsert({
      id:event.id,tipo:event.type,payload:session,processado:false,
    },{onConflict:'id'});
    if(eventWrite.error) throw eventWrite.error;
    const grant=await admin.from('conjuntos_acessos').upsert({
      user_id:userId,conjunto_id:bundleId,stripe_session_id:session.id,
    },{onConflict:'user_id,conjunto_id'});
    if(grant.error) throw grant.error;
    const marked=await admin.from('stripe_eventos').update({
      processado:true,processado_em:new Date().toISOString(),erro:null,
    }).eq('id',event.id).select('id');
    if(marked.error||marked.data?.length!==1) throw marked.error||new Error('event_update_failed');
    return send(res,200,{received:true});
  } catch { return send(res,503,{error:'grant_unavailable'}); }
}
