import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../api/health.js';
import check from '../api/auth/check.js';
import adminStatus from '../api/auth/admin-status.js';
import teacherRequests from '../api/admin/teacher-requests.js';
import signedSheetUrl from '../api/partituras/signed-url.js';
import sheetCheckout from '../api/stripe/create-sheet-checkout.js';
import sheetsWebhook from '../api/stripe/sheets-webhook.js';
import planCheckout from '../api/stripe/create-plan-checkout.js';
import plansWebhook from '../api/stripe/plans-webhook.js';

function invoke(handler, { method = 'GET', authorization } = {}) {
  const headers = {};
  const req = { method, headers: authorization ? { authorization } : {} };
  const res = {
    statusCode: 200,
    setHeader(key, value) { headers[key.toLowerCase()] = value; },
    end(value) { this.body = JSON.parse(value); },
  };
  return Promise.resolve(handler(req, res)).then(() => ({ status: res.statusCode, body: res.body, headers }));
}

test('health endpoint is available without authentication', async () => {
  const result = await invoke(health);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { service: 'tutti-api', status: 'ok' });
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('health endpoint rejects non-GET requests', async () => {
  const result = await invoke(health, { method: 'POST' });
  assert.equal(result.status, 405);
  assert.equal(result.headers.allow, 'GET');
});

test('auth check rejects unauthenticated requests', async () => {
  const result = await invoke(check);
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { authenticated: false });
});

test('admin status rejects unauthenticated requests', async () => {
  const result = await invoke(adminStatus);
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: 'unauthorized' });
});

test('admin status rejects malformed bearer headers', async () => {
  const result = await invoke(adminStatus, { authorization: 'Basic test' });
  assert.equal(result.status, 401);
});

test('auth endpoints reject POST requests', async () => {
  for (const handler of [check, adminStatus]) {
    const result = await invoke(handler, { method: 'POST' });
    assert.equal(result.status, 405);
    assert.equal(result.headers.allow, 'GET');
  }
});

test('teacher requests reject unauthenticated access', async () => {
  const result = await invoke(teacherRequests);
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: 'unauthorized' });
});

test('teacher requests reject non-GET methods', async () => {
  const result = await invoke(teacherRequests, { method: 'POST' });
  assert.equal(result.status, 405);
  assert.equal(result.headers.allow, 'GET');
});

test('teacher requests reject malformed authorization headers', async () => {
  const result = await invoke(teacherRequests, { authorization: 'Basic test' });
  assert.equal(result.status, 401);
});

test('sheet PDF signing rejects missing or malformed UUID', async () => {
  const missing = await invoke(signedSheetUrl, { method: 'POST' });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.error, 'partitura_id inválido');
});
test('sheet PDF signing rejects GET', async () => {
  const result = await invoke(signedSheetUrl);
  assert.equal(result.status, 405);
});
test('bundle checkout is disabled when test-payment gate is off', async () => {
  const result = await invoke(sheetCheckout, { method: 'POST' });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'test_checkout_disabled');
});

test('plan checkout is disabled when test-payment gate is off', async () => {
  const result = await invoke(planCheckout, { method: 'POST' });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'test_checkout_disabled');
});

test('plans webhook is disabled when test-payment gate is off', async () => {
  const result = await invoke(plansWebhook, { method: 'POST' });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'test_webhook_disabled');
});

test('sheets webhook is disabled when test-payment gate is off', async () => {
  const result = await invoke(sheetsWebhook, { method: 'POST' });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'test_webhook_disabled');
});
test('bundle checkout rejects GET', async () => {
  const result = await invoke(sheetCheckout);
  assert.equal(result.status, 405);
});
test('sheet webhook rejects GET', async () => {
  const result = await invoke(sheetsWebhook);
  assert.equal(result.status, 405);
});
