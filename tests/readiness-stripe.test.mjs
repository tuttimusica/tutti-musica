import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectStripePreflight, classifyStripePreflightError } from '../lib/stripe/readiness-stripe.js';
const account={id:'acct_expected',charges_enabled:true};
const price={active:true,livemode:true,currency:'brl',unit_amount:1990,recurring:null};
const testStripe=(accountError)=>{
  const listing=async()=>({data:[]});
  return {
    accounts:{retrieve:async()=>{if(accountError)throw accountError;return account;}},
    prices:{retrieve:async()=>price},
    checkout:{sessions:{list:listing}},
    paymentIntents:{list:listing},
    charges:{list:listing}
  };
};
test('independent preflight passes all read-only checks',async()=>{
  const result=await inspectStripePreflight(testStripe(), 'price_test','acct_expected');
  assert.deepEqual(result.checks,{stripeAccount:true,stripePrice:true,stripeRequiredReads:true});
  assert.deepEqual(result.issues,{});
});
test('account permission failure cannot conceal price and payment read status',async()=>{
  const result=await inspectStripePreflight(testStripe({statusCode:403}), 'price_test','acct_expected');
  assert.equal(result.checks.stripeAccount,false);
  assert.equal(result.issues.stripeAccount,'permissao_negada');
  assert.equal(result.checks.stripePrice,true);
  assert.equal(result.checks.stripeRequiredReads,true);
});
test('individual payment read permissions are diagnosed separately',async()=>{
  const stripe=testStripe();
  stripe.paymentIntents.list=async()=>{throw {statusCode:403};};
  const result=await inspectStripePreflight(stripe,'price_test','acct_expected');
  assert.equal(result.checks.stripeAccount,true);
  assert.equal(result.checks.stripePrice,true);
  assert.equal(result.checks.stripeRequiredReads,false);
  assert.equal(result.issues.paymentIntents,'permissao_negada');
});
test('sanitize errors without disclosing Stripe exception message',()=>{
  assert.equal(classifyStripePreflightError({statusCode:401,message:'sensitive'}),'credencial_invalida');
  assert.equal(classifyStripePreflightError({statusCode:403,message:'sensitive'}),'permissao_negada');
  assert.equal(classifyStripePreflightError(new Error('sensitive')),'falha_de_consulta');
});
