import test from 'node:test';
import assert from 'node:assert/strict';
import {isAuthorizedProPilot} from '../lib/stripe/pilot-access.js';
test('pilot requires a server-owned administrator email',()=>{
  assert.equal(isAuthorizedProPilot('admin@example.com',[{email:'admin@example.com'}]),true);
  assert.equal(isAuthorizedProPilot(' ADMIN@EXAMPLE.COM ',[{email:'admin@example.com'}]),true);
});
test('pilot rejects unapproved students even if client claims developer role',()=>{
  assert.equal(isAuthorizedProPilot('student@example.com',[{email:'admin@example.com'}]),false);
  assert.equal(isAuthorizedProPilot('admin@example.com',[]),false);
  assert.equal(isAuthorizedProPilot(null,[{email:'admin@example.com'}]),false);
});
test('pilot excludes malformed allowlists and untrusted values',()=>{
  assert.equal(isAuthorizedProPilot('admin@example.com',[{role:'admin'}]),false);
  assert.equal(isAuthorizedProPilot('admin@example.com',null),false);
  assert.equal(isAuthorizedProPilot('',[{email:''}]),false);
});
