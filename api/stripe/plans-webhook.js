import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { isPaidCheckout } from './plan-policy.js';

export const config = { api: { bodyParser: false } };
const send = (res,status,body) => { res.statusCode=status; res.end(JSON.stringify(body)); };
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
async function rawBody(req) { const parts=[]; for await (const c of req) parts.push(Buffer.isBuffer(c)?c:Buffer.from(c)); return Buffer.concat(parts); }

async function paymentReversed(stripe, session) {
  if (!session.payment_intent) return true;
  const payment=await stripe.paymentIntents.retrieve(session.payment_intent, {expand:['latest_charge']});
  const charge=payment.latest_charge;
  if (typeof charge === 'object' && charge && (charge.refunded || charge.disputed || charge.amount_refunded > 0)) return true;
  return payment.status !== 'succeeded';
}

async function findReversedSession(stripe,event) {
  const object=event.data.object;
  let paymentIntent=null;
  if(event.type==='charge.refunded') paymentIntent=object.payment_intent;
  if(event.type==='charge.dispute.created') paymentIntent=object.payment_intent;
  if(!paymentIntent || typeof paymentIntent!=='string') return null;
  const matches=await stripe.checkout.sessions.list({payment_intent:paymentIntent,limit:5});
  return matches.data.find(s=>s.metadata?.tipo==='tutti_plano') || null;
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST') { res.setHeader('Allow','POST'); return send(res,405,{error:'method_not_allowed'}); }
  if(process.env.TUTTI_PAYMENT_TEST_MODE!=='true'||process.env.VERCEL_ENV==='production')
    return send(res,503,{error:'test_webhook_disabled'});
  const key=process.env.STRIPE_SECRET_KEY;
  const secret=process.env.STRIPE_PLANS_WEBHOOK_SECRET;
  const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Security boundary: the backend must never query a different Supabase project
  // from the frontend build. Fail closed instead of crossing production/staging.
  if (!url || !process.env.VITE_SUPABASE_URL || url !== process.env.VITE_SUPABASE_URL)
    return send(res,503,{error:'supabase_environment_mismatch'});

  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if(!key?.startsWith('sk_test_')||!secret||!url||!serviceKey) return send(res,503,{error:'test_webhook_unconfigured'});
  const signature=req.headers['stripe-signature'];
  if(typeof signature!=='string') return send(res,400,{error:'invalid_signature'});
  const stripe=new Stripe(key);
  let event;
  try { event=stripe.webhooks.constructEvent(await rawBody(req),signature,secret); }
  catch { return send(res,400,{error:'invalid_signature'}); }

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  if(event.type==='charge.refunded'||event.type==='charge.dispute.created') {
    try {
      const session=await findReversedSession(stripe,event);
      if(!session) return send(res,200,{received:true,ignored:true});
      const {error}=await admin.rpc('tutti_revoke_paid_plan',{
        p_session_id:session.id,p_reason:event.type
      });
      if(error) throw error;
      return send(res,200,{received:true,revocation_processed:true});
    } catch {
      return send(res,503,{error:'revocation_unavailable'});
    }
  }

  if(event.type!=='checkout.session.completed' && event.type!=='checkout.session.async_payment_succeeded')
    return send(res,200,{received:true,ignored:true});
  const incoming=event.data.object;
  if(incoming.metadata?.tipo!=='tutti_plano') return send(res,200,{received:true,ignored:true});
  const userId=incoming.metadata?.user_id;
  const planId=incoming.metadata?.plano_id;
  if(!uuidPattern.test(userId||'')) return send(res,400,{error:'invalid_user'});
  try {
    const session=await stripe.checkout.sessions.retrieve(incoming.id);
    if(session.livemode || !isPaidCheckout(session,userId,planId))
      return send(res,200,{received:true,not_granted:true});
    // A reversal may race with the original checkout event. Never regrant it.
    if(await paymentReversed(stripe,session))
      return send(res,200,{received:true,reversed:true});
    const paidAt=new Date(event.created*1000).toISOString();
    const {data,error}=await admin.rpc('tutti_apply_paid_plan',{
      p_session_id:session.id,p_event_id:event.id,p_user_id:userId,
      p_plan_id:planId,p_amount_cents:session.amount_total,p_paid_at:paidAt
    });
    if(error) throw error;
    return send(res,200,{received:true,granted:data===true});
  } catch {
    return send(res,503,{error:'grant_unavailable'});
  }
}
