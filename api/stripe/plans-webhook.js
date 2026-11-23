import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { resolveReversalPaymentIntent } from '../../lib/stripe/dispute-payment.js';

export const config={api:{bodyParser:false}};
const send=(res,status,data)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(data);};
const PROD_HOST='viwxalwpvuvgcyxsdjbi.supabase.co';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function rawBody(req){
 const chunks=[];
 for await(const piece of req)chunks.push(Buffer.isBuffer(piece)?piece:Buffer.from(piece));
 return Buffer.concat(chunks);
}
const isPro=(s)=>s?.mode==='payment'&&s?.metadata?.tipo==='tutti_plano'&&
 s?.metadata?.plano_id==='pro'&&uuid.test(s.metadata?.user_id||'')&&
 s.client_reference_id===s.metadata.user_id;

export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'});}
 const prod=process.env.VERCEL_ENV==='production';
 const enabled=prod?process.env.TUTTI_PRO_LIVE_CHECKOUT_ENABLED==='true':
   process.env.TUTTI_PAYMENT_TEST_MODE==='true';
 if(!enabled)return send(res,503,{error:'pro_webhook_not_enabled'});
 const key=prod?process.env.TUTTI_STRIPE_LIVE_SECRET_KEY:process.env.STRIPE_SECRET_KEY;
 const secret=prod?process.env.TUTTI_STRIPE_LIVE_WEBHOOK_SECRET:process.env.STRIPE_PLANS_WEBHOOK_SECRET;
 const url=process.env.VITE_SUPABASE_URL;
 const service=process.env.TUTTI_PRO_SUPABASE_SERVICE_ROLE_KEY;
 if(!(typeof key === 'string' && (prod ? /^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key) : /^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(key)))||!secret?.startsWith('whsec_')||
   !service||!url)return send(res,503,{error:'pro_webhook_unconfigured'});
 try{
   if(prod&&new URL(url).hostname!==PROD_HOST)
     return send(res,503,{error:'supabase_project_mismatch'});
 }catch{return send(res,503,{error:'supabase_project_mismatch'});}
 const stripe=new Stripe(key);
 const signature=req.headers['stripe-signature'];
 if(typeof signature!=='string')return send(res,400,{error:'invalid_signature'});
 let event;
 try{event=stripe.webhooks.constructEvent(await rawBody(req),signature,secret);}
 catch{return send(res,400,{error:'invalid_signature'});}
 if(event.livemode!==prod)return send(res,400,{error:'stripe_environment_mismatch'});
 // The webhook must use credentials belonging to Tutti Musica's actual
 // receiving account, not the older restricted Stripe sandbox account.
 if(prod){
   const expectedAccount=process.env.TUTTI_STRIPE_LIVE_ACCOUNT_ID;
   if(expectedAccount!=='acct_1UZuju0U9nB6Q0cf')
     return send(res,503,{error:'stripe_live_account_not_configured'});
   try {
     const owner=await stripe.accounts.retrieve();
     if(owner.id!==expectedAccount)
       return send(res,503,{error:'stripe_live_account_mismatch'});
   } catch {
     return send(res,503,{error:'stripe_live_account_unavailable'});
   }
 }
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
   if(event.type==='checkout.session.completed'||
      event.type==='checkout.session.async_payment_succeeded'){
     const incoming=event.data.object;
     if(!isPro(incoming))return send(res,200,{received:true,ignored:true});
     const s=await stripe.checkout.sessions.retrieve(incoming.id);
     if(!isPro(s)||s.livemode!==prod||
        s.payment_status!=='paid'||s.currency!=='brl'||s.amount_total!==1990)
       return send(res,200,{received:true,not_granted:true});
     // Price, product and quantity must match the catalog; session metadata
     // alone is not proof of which product was actually purchased.
     const {data:plan,error:planError}=await admin.from('planos')
       .select('stripe_test_price_id,stripe_price_id,ativo,preco_centavos,periodo,recorrencia')
       .eq('id','pro').maybeSingle();
     if(planError||!plan?.ativo||plan.preco_centavos!==1990||
        plan.periodo!=='vitalicio'||plan.recorrencia!=='unico')
       return send(res,503,{error:'plan_not_ready'});
     const expectedPrice=prod?plan.stripe_price_id:plan.stripe_test_price_id;
     const lines=await stripe.checkout.sessions.listLineItems(s.id,{limit:3});
     if(!expectedPrice||lines.data.length!==1||lines.has_more||
        lines.data[0]?.price?.id!==expectedPrice||lines.data[0]?.quantity!==1)
       return send(res,503,{error:'line_item_mismatch'});
     if(!s.payment_intent)return send(res,503,{error:'payment_intent_missing'});
     const payment=await stripe.paymentIntents.retrieve(s.payment_intent,{expand:['latest_charge']});
     const charge=payment.latest_charge;
     if(payment.status!=='succeeded'||(
       typeof charge==='object'&&charge&&
       (charge.refunded||charge.disputed||charge.amount_refunded>0)))
       return send(res,200,{received:true,reversed_or_unpaid:true});
     // A wrong-project service key will fail here: never use browser metadata as a grant.
     const id=s.metadata.user_id;
     const {data:identity,error:identityError}=await admin.auth.admin.getUserById(id);
     if(identityError||identity?.user?.id!==id)
       return send(res,503,{error:'supabase_auth_project_unavailable'});
     const {data,error}=await admin.rpc('tutti_apply_pro_purchase',{
       p_session_id:s.id,p_event_id:event.id,p_user_id:id,p_price_id:expectedPrice,
       p_amount_cents:1990,p_paid_at:new Date(event.created*1000).toISOString(),
       p_livemode:prod
     });
     if(error)return send(res,503,{error:'pro_grant_unavailable'});
     return send(res,200,{received:true,granted:data===true});
   }
   if(event.type==='charge.refunded'||event.type==='charge.dispute.created'){
     const obj=event.data.object;
     if(event.type==='charge.refunded'&&!obj.refunded)
       return send(res,200,{received:true,partial_refund_ignored:true});
     const pi=await resolveReversalPaymentIntent(stripe,event.type,obj);
     if(!pi)return send(res,200,{received:true,ignored:true});
     const matches=await stripe.checkout.sessions.list({payment_intent:pi,limit:10});
     const pro=matches.data.find(x=>isPro(x)&&x.livemode===prod);
     if(!pro)return send(res,200,{received:true,ignored:true});
     const {error}=await admin.rpc('tutti_reverse_pro_purchase',{
       p_session_id:pro.id,p_event_id:event.id,p_reason:event.type
     });
     if(error)return send(res,503,{error:'pro_refund_unavailable'});
     return send(res,200,{received:true,revocation_processed:true});
   }
   return send(res,200,{received:true,ignored:true});
 }catch{return send(res,503,{error:'pro_webhook_processing_unavailable'});}
}
