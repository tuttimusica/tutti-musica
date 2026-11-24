import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { ensureProWebhookReadPermissions } from '../../lib/stripe/pro-readiness.js';
import { handleAdminCommerceReadiness } from '../../lib/stripe/admin-readiness.js';
import { isAuthorizedProPilot } from '../../lib/stripe/pilot-access.js';

const send=(res,status,data)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(data);};
const LIVE_ORIGIN='https://tutti-musica.vercel.app';
const PROD_HOST='viwxalwpvuvgcyxsdjbi.supabase.co';
const TEST_PRODUCT='prod_VdjsXzU2lrVLYk';

export default async function handler(req,res){
 if(req.method==='GET' && req.query?.readiness==='1') return handleAdminCommerceReadiness(req,res);
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'});}
 if(req.body?.plano_id!=='pro')return send(res,403,{error:'only_pro_lifetime_online'});
 const prod=process.env.VERCEL_ENV==='production';
 const liveEnabled=prod&&process.env.TUTTI_PRO_LIVE_CHECKOUT_ENABLED==='true';
 const pilotEnabled=prod&&process.env.TUTTI_PRO_PILOT_CHECKOUT_ENABLED==='true';
 const enabled=prod ? (liveEnabled || pilotEnabled) : process.env.TUTTI_PAYMENT_TEST_MODE==='true';
 if(!enabled)return send(res,503,{error:'pro_checkout_not_enabled'});
 const key=prod ? process.env.TUTTI_STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_SECRET_KEY;
 const webhookSecret=prod ? process.env.TUTTI_STRIPE_LIVE_WEBHOOK_SECRET
   : process.env.STRIPE_PLANS_WEBHOOK_SECRET;
 if(!(typeof key === 'string' && (prod ? /^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key) : /^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(key)))||!webhookSecret?.startsWith('whsec_'))
   return send(res,503,{error:'stripe_not_configured'});
 const url=process.env.VITE_SUPABASE_URL;
 const anon=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 const fulfillmentKey=process.env.TUTTI_PRO_SUPABASE_SERVICE_ROLE_KEY;
 if(!fulfillmentKey)return send(res,503,{error:'pro_fulfillment_not_configured'});
 const origin=prod?LIVE_ORIGIN:process.env.TUTTI_TEST_ORIGIN;
 try{
   if(!url||new URL(url).hostname!==(prod?PROD_HOST:new URL(url).hostname)||
      !anon||!origin||new URL(origin).protocol!=='https:')
     return send(res,503,{error:'environment_not_configured'});
 }catch{return send(res,503,{error:'environment_not_configured'});}
 const token=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return send(res,401,{error:'unauthorized'});
 try{
   const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:{user},error}=await auth.auth.getUser(token);
   if(error||!user?.id||!user.email||!user.email_confirmed_at)
     return send(res,401,{error:'unauthorized'});
   // Before allowing a charge, validate that the webhook has a privileged
   // credential for the SAME Supabase project and can identify this user.
   // This is not authorization from client metadata; it is a backend readiness gate.
   const admin=createClient(url,fulfillmentKey,{auth:{persistSession:false,autoRefreshToken:false}});
   // While the public checkout is closed, only an email-confirmed developer
   // in the server-owned administrator allowlist may start a real pilot checkout.
   if(prod&&!liveEnabled) {
     const {data:authorized,error:pilotError}=await admin
       .from('administradores_autorizados').select('email').limit(1000);
     if(pilotError||!isAuthorizedProPilot(user.email,authorized))
       return send(res,403,{error:'pilot_not_authorized'});
   }

   const {data:ownedUser,error:adminError}=await admin.auth.admin.getUserById(user.id);
   if(adminError||ownedUser?.user?.id!==user.id)
     return send(res,503,{error:'pro_fulfillment_project_unavailable'});
   const {data:plan,error:planError}=await auth.from('planos')
     .select('id,ativo,periodo,recorrencia,preco_centavos,stripe_test_price_id,stripe_price_id')
     .eq('id','pro').maybeSingle();
   const priceId=prod?plan?.stripe_price_id:plan?.stripe_test_price_id;
   if(planError||!plan?.ativo||plan.periodo!=='vitalicio'||
      plan.recorrencia!=='unico'||plan.preco_centavos!==1990||
      !priceId?.startsWith('price_'))
     return send(res,503,{error:'pro_price_not_ready'});
   const {data:existing,error:accessError}=await auth.from('assinaturas_usuarios')
     .select('id').eq('user_id',user.id).eq('plano_id','pro')
     .eq('status','ativo').limit(1);
   if(accessError)return send(res,503,{error:'entitlement_lookup_failed'});
   if(existing?.length)return send(res,409,{error:'pro_already_owned'});
   // Never offer a paid lifetime catalog while it has no published exclusive PDFs.
   const {count:exclusiveCount,error:libraryError}=await auth.from('partituras')
     .select('id',{head:true,count:'exact'})
     .eq('categoria','paga').eq('publicado',true);
   if(libraryError||!exclusiveCount)
     return send(res,503,{error:'pro_library_not_ready'});
   const stripe=new Stripe(key);
   // Prevent accidentally using a credential from the restricted/test Stripe account.
   if(prod){
     const expectedAccount=process.env.TUTTI_STRIPE_LIVE_ACCOUNT_ID;
     if(expectedAccount!=='acct_1UZuju0U9nB6Q0cf')
       return send(res,503,{error:'stripe_live_account_not_configured'});
     const owner=await stripe.accounts.retrieve();
     if(owner.id!==expectedAccount)
       return send(res,503,{error:'stripe_live_account_mismatch'});
     // Stripe can suspend charges during regulatory/KYC review.
     // Fail closed rather than redirecting customers to a charge they cannot complete.
     if(owner.charges_enabled!==true)
       return send(res,503,{error:'stripe_account_not_approved'});
   }
   const price=await stripe.prices.retrieve(priceId);
   if(!price.active||price.livemode!==prod||price.currency!=='brl'||
      price.unit_amount!==1990||price.recurring||
      (!prod&&price.product!==TEST_PRODUCT))
     return send(res,503,{error:'stripe_pro_price_mismatch'});
   // Confirm the restricted key can also read payments and charges in the
   // production webhook. Failure here must happen before charging a customer.
   try { await ensureProWebhookReadPermissions(stripe); }
   catch { return send(res,503,{error:'stripe_fulfillment_permissions_unavailable'}); }
   const checkout=await stripe.checkout.sessions.create({
     mode:'payment',
     customer_email:user.email,
     client_reference_id:user.id,
     line_items:[{price:price.id,quantity:1}],
     metadata:{tipo:'tutti_plano',user_id:user.id,plano_id:'pro'},
     success_url:origin+'/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
     cancel_url:origin+'/?checkout=cancelled'
   },{idempotencyKey:'tutti-pro-'+user.id+'-'+Math.floor(Date.now()/300000)});
   if(!checkout.url?.startsWith('https://checkout.stripe.com/'))
     return send(res,503,{error:'checkout_unavailable'});
   return send(res,200,{url:checkout.url,sessionId:checkout.id});
 }catch{return send(res,503,{error:'checkout_unavailable'});}
}
