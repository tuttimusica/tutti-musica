import Stripe from 'stripe';
import { inspectStripePreflight } from '../lib/stripe/readiness-stripe.js';

// TEMPORARY production-only read-only probe. Revert immediately after verifying logs.
// Never log credentials, Stripe objects, emails, user details, or exception text.
async function verifyServerStripeCredentials() {
  const key=process.env.TUTTI_STRIPE_LIVE_SECRET_KEY;
  const priceId='price_1UdKia0U9nB6Q0cfUj7V4993';
  const accountId='acct_1UZuju0U9nB6Q0cf';
  if(typeof key!=='string'||! /^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key)) {
    console.info('TUTTI_PRO_SERVER_PREFLIGHT',JSON.stringify({configured:false,valid:false,category:'key_format_invalid'}));
    return;
  }
  try {
    const stripe=new Stripe(key,{timeout:7000,maxNetworkRetries:0});
    const report=await inspectStripePreflight(stripe,priceId,accountId);
    console.info('TUTTI_PRO_SERVER_PREFLIGHT',JSON.stringify({
      configured:true,
      account:report.checks.stripeAccount,
      price:report.checks.stripePrice,
      reads:report.checks.stripeRequiredReads,
      issues:report.issues
    }));
  }catch {
    console.info('TUTTI_PRO_SERVER_PREFLIGHT',JSON.stringify({configured:true,valid:false,category:'probe_unavailable'}));
  }
}

/**
 * Non-sensitive deployment probe for Tutti's Vercel Node.js backend.
 * Run a temporary independent verification using the live server credential.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }
  if(process.env.VERCEL_ENV==='production') await verifyServerStripeCredentials();
  res.statusCode = 200;
  res.end(JSON.stringify({ service: 'tutti-api', status: 'ok' }));
}
