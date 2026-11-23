import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveReversalPaymentIntent } from '../lib/stripe/dispute-payment.js';

test('full refund uses payment intent from charge payload', async () => {
  const stripe = {charges:{retrieve:()=>{throw Error('unexpected charge lookup');}}};
  assert.equal(await resolveReversalPaymentIntent(stripe,'charge.refunded',{payment_intent:'pi_refund123'}),'pi_refund123');
});
test('dispute uses direct payment intent when available', async () => {
  const stripe = {charges:{retrieve:()=>{throw Error('unexpected charge lookup');}}};
  assert.equal(await resolveReversalPaymentIntent(stripe,'charge.dispute.created',{payment_intent:{id:'pi_direct123'},charge:'ch_direct123'}),'pi_direct123');
});
test('dispute resolves payment intent from original charge when absent', async () => {
  let lookedUp;
  const stripe = {charges:{retrieve:async id=>{lookedUp=id;return {payment_intent:'pi_fallback123'};}}};
  assert.equal(await resolveReversalPaymentIntent(stripe,'charge.dispute.created',{charge:'ch_fallback123'}),'pi_fallback123');
  assert.equal(lookedUp,'ch_fallback123');
});
test('invalid identifiers cannot trigger arbitrary Stripe lookups', async () => {
  const stripe={charges:{retrieve:()=>{throw Error('unexpected lookup');}}};
  assert.equal(await resolveReversalPaymentIntent(stripe,'charge.dispute.created',{charge:'bad'}),null);
  assert.equal(await resolveReversalPaymentIntent(stripe,'charge.refunded',{charge:'ch_123'}),null);
  assert.equal(await resolveReversalPaymentIntent(stripe,'charge.dispute.created',null),null);
});
test('missing charge payment intent fails closed', async () => {
  const stripe={charges:{retrieve:async()=>({payment_intent:null})}};
  assert.equal(await resolveReversalPaymentIntent(stripe,'charge.dispute.created',{charge:'ch_valid123'}),null);
});
test('Stripe charge lookup failure propagates so webhook retries', async () => {
  const stripe={charges:{retrieve:async()=>{throw new Error('transient');}}};
  await assert.rejects(resolveReversalPaymentIntent(stripe,'charge.dispute.created',{charge:'ch_valid123'}),/transient/);
});
