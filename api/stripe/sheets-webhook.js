import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const send = (res,status,body) => {res.statusCode=status;res.end(JSON.stringify(body));};
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'});}
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if(!secret||!stripeKey||!url||!serviceKey)return send(res,503,{error:'webhook_unconfigured'});
  const signature = req.headers['stripe-signature'];
  if(typeof signature!=='string')return send(res,400,{error:'invalid_signature'});
  let event;
  try {
    const stripe = new Stripe(stripeKey);
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw,signature,secret);
  } catch {return send(res,400,{error:'invalid_signature'});}
  if(event.type!=='checkout.session.completed')return send(res,200,{received:true,ignored:true});
  const session = event.data.object;
  if(session.metadata?.tipo!=='conjunto_partituras')return send(res,200,{received:true,ignored:true});
  if(session.payment_status!=='paid')return send(res,200,{received:true,pending:true});
  const userId=session.metadata?.user_id;
  const bundleId=session.metadata?.conjunto_id;
  if(!uuidPattern.test(userId||'')||!uuidPattern.test(bundleId||'')||session.client_reference_id!==userId){
    return send(res,400,{error:'invalid_metadata'});
  }
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const previous=await admin.from('stripe_eventos').select('processado').eq('id',event.id).maybeSingle();
    if(previous.error)throw previous.error;
    if(previous.data?.processado)return send(res,200,{received:true,duplicate:true});
    const eventWrite=await admin.from('stripe_eventos').upsert({
      id:event.id,tipo:event.type,payload:event.data.object,processado:false,
    },{onConflict:'id'});
    if(eventWrite.error)throw eventWrite.error;
    const grant=await admin.from('conjuntos_acessos').upsert({
      user_id:userId,conjunto_id:bundleId,stripe_session_id:session.id,
    },{onConflict:'user_id,conjunto_id'});
    if(grant.error)throw grant.error;
    const marked=await admin.from('stripe_eventos').update({
      processado:true,processado_em:new Date().toISOString(),erro:null,
    }).eq('id',event.id).select('id');
    if(marked.error||marked.data?.length!==1)throw marked.error||new Error('event_update_failed');
    return send(res,200,{received:true});
  } catch {
    // Stripe retries on 5xx; do not acknowledge grants that were not verified.
    return send(res,503,{error:'grant_unavailable'});
  }
}
