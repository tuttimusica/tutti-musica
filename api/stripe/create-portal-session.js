import {createClient} from '@supabase/supabase-js';
import Stripe from 'stripe';

const send=(res,status,body)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(body);};
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'});}
 if(process.env.VERCEL_ENV==='production'||process.env.TUTTI_PAYMENT_TEST_MODE!=='true')
   return send(res,503,{error:'payment_portal_not_enabled'});
 const token=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return send(res,401,{error:'unauthorized'});
 const url=process.env.VITE_SUPABASE_URL;
 const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 const sk=process.env.STRIPE_SECRET_KEY;
 const origin=process.env.TUTTI_TEST_ORIGIN;
 if(!url||!key||!sk?.startsWith('sk_test_')||!origin?.startsWith('https://'))
   return send(res,503,{error:'test_portal_unconfigured'});
 try {
   const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:{user},error}=await client.auth.getUser(token);
   if(error||!user?.id||!user.email_confirmed_at)return send(res,401,{error:'unauthorized'});
   const {data:subscriptions,error:queryErr}=await client.from('assinaturas_usuarios')
     .select('stripe_customer_id,stripe_subscription_id,plano_id')
     .eq('user_id',user.id).not('stripe_subscription_id','is',null)
     .order('created_at',{ascending:false}).limit(5);
   if(queryErr)return send(res,503,{error:'subscription_lookup_unavailable'});
   const record=(subscriptions||[]).find(s=>s.stripe_customer_id?.startsWith('cus_'));
   if(!record)return send(res,404,{error:'no_subscription_customer'});
   const stripe=new Stripe(sk);
   const customer=await stripe.customers.retrieve(record.stripe_customer_id);
   if(!customer||customer.deleted||customer.livemode)
     return send(res,403,{error:'customer_not_valid_for_test'});
   const portal=await stripe.billingPortal.sessions.create({
     customer:customer.id,return_url:origin+'/?billing=return',
     configuration:'bpc_1UdAue1lh39aZRou8iGNLWCb'
   });
   if(!portal.url?.startsWith('https://billing.stripe.com/'))
     return send(res,503,{error:'portal_unavailable'});
   return send(res,200,{url:portal.url});
 }catch{return send(res,503,{error:'portal_unavailable'});}
}
