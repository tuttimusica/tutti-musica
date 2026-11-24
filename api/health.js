import Stripe from 'stripe';
import { inspectStripePreflight } from '../lib/stripe/readiness-stripe.js';

// Temporary production key probe; records only aggregated status and safe error categories.
// Revert immediately after one invocation. Never expose API key, tokens or Stripe objects.
async function probe() {
  const key=process.env.TUTTI_STRIPE_LIVE_SECRET_KEY;
  const formatValid=typeof key==='string'&&/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key);
  if(!formatValid){
    console.info('TUTTI_STRIPE_KEY_AUDIT_20261124',JSON.stringify({formatValid:false,present:typeof key==='string'&&key.length>0}));
    return;
  }
  try{
    const stripe=new Stripe(key,{timeout:7000,maxNetworkRetries:0});
    const report=await inspectStripePreflight(stripe,'price_1UdKia0U9nB6Q0cfUj7V4993','acct_1UZuju0U9nB6Q0cf');
    console.info('TUTTI_STRIPE_KEY_AUDIT_20261124',JSON.stringify({
      formatValid:true,accountOk:report.checks.stripeAccount,
      priceOk:report.checks.stripePrice,readPermissionsOk:report.checks.stripeRequiredReads,
      issues:report.issues
    }));
  }catch{
    console.info('TUTTI_STRIPE_KEY_AUDIT_20261124',JSON.stringify({formatValid:true,unexpectedError:true}));
  }
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');res.statusCode=405;
    res.end(JSON.stringify({error:'method_not_allowed'}));return;
  }
  if(process.env.VERCEL_ENV==='production') await probe();
  res.statusCode=200;
  res.end(JSON.stringify({service:'tutti-api',status:'ok'}));
}
