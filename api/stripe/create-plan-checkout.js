import {createClient} from '@supabase/supabase-js';
import Stripe from 'stripe';
import {getPlan} from './plan-policy.js';

const send=(res,status,body)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(body);};
const MODES={pro:'payment',mensal:'subscription',trimestral:'subscription',semestral:'subscription'};
const CYCLES={mensal:1,trimestral:3,semestral:6};

export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'});}
 // Never enable real billing merely by deploying code. Live credentials, webhooks,
 // account reconciliation and end-to-end purchase/refund tests are still required.
 if(process.env.VERCEL_ENV==='production'||process.env.TUTTI_PAYMENT_TEST_MODE!=='true')
   return send(res,503,{error:'payment_not_enabled'});
 const token=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return send(res,401,{error:'unauthorized'});
 const planId=req.body?.plano_id;
 if(!Object.hasOwn(MODES,planId))return send(res,400,{error:'invalid_plan'});
 const policy=getPlan(planId);
 const url=process.env.VITE_SUPABASE_URL;
 const anon=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.STRIPE_SECRET_KEY;
 const origin=process.env.TUTTI_TEST_ORIGIN;
 if(!url||!anon||!secret?.startsWith('sk_test_')||
    !origin?.startsWith('https://')||!url.includes('.supabase.co'))
   return send(res,503,{error:'test_checkout_unconfigured'});
 try{
   const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:{user},error}=await auth.auth.getUser(token);
   if(error||!user?.id||!user.email||!user.email_confirmed_at)
     return send(res,401,{error:'unauthorized'});
   // Never accept a price, currency, amount, recurrence or product ID from the browser.
   const {data:row,error:planError}=await auth.from('planos')
     .select('id,ativo,periodo,recorrencia,preco_centavos,stripe_test_price_id')
     .eq('id',planId).maybeSingle();
   if(planError||!row?.ativo||row.preco_centavos!==policy.amountCents||
      row.stripe_test_price_id?.startsWith('price_')!==true||
      (planId==='pro' ? row.recorrencia!=='unico' :
      row.recorrencia!=='recorrente'||row.periodo!==planId))
     return send(res,503,{error:'plan_not_ready'});
   const {data:owned,error:ownedError}=await auth.from('assinaturas_usuarios')
     .select('plano_id,status,data_fim,stripe_subscription_id')
     .eq('user_id',user.id).eq('status','ativo');
   if(ownedError)return send(res,503,{error:'subscription_lookup_failed'});
   if((owned||[]).some(x=>x.plano_id==='pro'&&planId==='pro'))
     return send(res,409,{error:'lifetime_plan_already_owned'});
   if(planId!=='pro'&&(owned||[]).some(x=>
        x.stripe_subscription_id&&(!x.data_fim||new Date(x.data_fim)>new Date())))
     return send(res,409,{error:'already_subscribed_use_portal'});
   const stripe=new Stripe(secret);
   const price=await stripe.prices.retrieve(row.stripe_test_price_id);
   if(!price?.active||price.livemode||price.currency!=='brl'||
       price.unit_amount!==policy.amountCents||
       (planId==='pro' ? !!price.recurring : !price.recurring||
         price.recurring.interval!=='month'||price.recurring.interval_count!==CYCLES[planId]))
     return send(res,503,{error:'stripe_price_mismatch'});
   const metadata={tipo:'tutti_plano',user_id:user.id,plano_id:planId};
   const params={
     mode:MODES[planId],customer_email:user.email,
     line_items:[{price:price.id,quantity:1}],client_reference_id:user.id,
     metadata,success_url:origin+'/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
     cancel_url:origin+'/?checkout=cancelled',
     ...(planId==='pro'?{}:{subscription_data:{metadata}})
   };
   const session=await stripe.checkout.sessions.create(params,{
     idempotencyKey:'tutti-'+user.id+'-'+planId+'-'+Math.floor(Date.now()/300000)
   });
   if(!session.url||!session.url.startsWith('https://checkout.stripe.com/'))
     return send(res,503,{error:'checkout_not_created'});
   return send(res,200,{url:session.url,sessionId:session.id});
 }catch{
   return send(res,503,{error:'checkout_unavailable'});
 }
}
