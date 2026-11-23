import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureProWebhookReadPermissions } from '../lib/stripe/pro-readiness.js';

function client(rejectAt) {
  const calls = [];
  const make = (name) => async ({limit}) => {
    calls.push([name,limit]);
    if (name === rejectAt) throw Error('Stripe restricted key permission denied');
    return {data:[]};
  };
  return {calls, stripe:{
    checkout:{sessions:{list:make('sessions')}},
    paymentIntents:{list:make('paymentIntents')},
    charges:{list:make('charges')},
  }};
}
test('fulfillment preflight accepts authorized read operations even without transactions', async () => {
  const {stripe,calls}=client();
  await ensureProWebhookReadPermissions(stripe);
  assert.deepEqual(calls.map(([name])=>name).sort(),['charges','paymentIntents','sessions']);
  assert.ok(calls.every(([,limit])=>limit===1));
});
for (const permission of ['sessions','paymentIntents','charges']) {
  test('fulfillment preflight fails closed if '+permission+' is unauthorized', async () => {
    await assert.rejects(ensureProWebhookReadPermissions(client(permission).stripe),/permission denied/);
  });
}
test('fulfillment preflight fails closed when clients are incomplete', async () => {
  await assert.rejects(ensureProWebhookReadPermissions({checkout:{sessions:{list:async()=>({})}}}),/stripe_read_clients_unavailable/);
});
