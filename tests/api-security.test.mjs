import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../api/health.js';
import check from '../api/auth/check.js';
import adminStatus from '../api/auth/admin-status.js';

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
