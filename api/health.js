import Stripe from 'stripe';
import { inspectStripePreflight } from '../lib/stripe/readiness-stripe.js';

// TEMPORARY verification after replacing the live key in Vercel.
// Only sanitized statuses are recorded. Do not log keys, IDs, responses or errors.
async function probeProductionStripe() {
  const value=process.env.TUTTI_STRIPE_LIVE_SECRET_KEY;
  if(typeof value!=='string'||! /^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(value)) {
    console.info('TUTTI_ROTATED_STRIPE_KEY_PROBE', JSON.stringify({
      formatValid:false,
      present:typeof value==='string'&&value.length>0
    }));
    return;
  }
  try {
    const stripe=new Stripe(value,{timeout:6500,maxNetworkRetries:0});
    const result=await inspectStripePreflight(stripe,'price_1UdKia0U9nB6Q0cfUj7V4993','acct_1UZuju0U9nB6Q0cf');
    console.info('TUTTI_ROTATED_STRIPE_KEY_PROBE',JSON.stringify({
      formatValid:true,
      accountOk:result.checks.stripeAccount,
      priceOk:result.checks.stripePrice,
      readsOk:result.checks.stripeRequiredReads,
      issues:result.issues
    }));
  }catch{
    console.info('TUTTI_ROTATED_STRIPE_KEY_PROBE',JSON.stringify({formatValid:true,probeUnavailable:true}));
  }
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET') {
    res.setHeader('Allow','GET');
    res.statusCode=405;
    res.end(JSON.stringify({error:'method_not_allowed'}));
    return;
  }
  if(process.env.VERCEL_ENV==='production') await probeProductionStripe();
  res.statusCode=200;
  res.end(JSON.stringify({service:'tutti-api',status:'ok'}));
}
