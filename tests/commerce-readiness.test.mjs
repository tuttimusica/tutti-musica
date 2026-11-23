import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/stripe/create-plan-checkout.js';
import { parseAdminBearerToken } from '../lib/stripe/admin-readiness.js';

function invoke(method='GET',headers={}) {
  const req={method,headers,query:{readiness:'1'}};
  const headersSent={};
  const res={
    statusCode:200,
    status(value){this.statusCode=value;return this;},
    json(value){this.body=value;},
    setHeader(key,value){headersSent[key.toLowerCase()]=value;},
    end(value){this.body=JSON.parse(value);}
  };
  return Promise.resolve(handler(req,res)).then(()=>({status:res.statusCode,body:res.body,headers:headersSent}));
}

test('commerce readiness requires authenticated administrator',async()=>{
  const response=await invoke();
  assert.equal(response.status,401);
  assert.equal(response.body.error,'unauthorized');
  assert.equal(response.headers['cache-control'],'private, no-store');
});
test('commerce readiness rejects POST without a valid Pro request',async()=>{
  const response=await invoke('POST');
  assert.equal(response.status,403);
  assert.equal(response.body.error,'only_pro_lifetime_online');
});
test('commerce readiness rejects malformed bearer',async()=>{
  const response=await invoke('GET',{authorization:'Basic fake'});
  assert.equal(response.status,401);
});

test('valid Bearer header is parsed for server-side authentication', () => {
  assert.equal(parseAdminBearerToken('Bearer valid.token-value'),'valid.token-value');
  assert.equal(parseAdminBearerToken('bearer valid.token-value'),'valid.token-value');
  assert.equal(parseAdminBearerToken('  Bearer valid.token-value  '),'valid.token-value');
});
test('invalid or missing token cannot bypass authentication', () => {
  for(const header of [null,undefined,'','Basic abc','Bearer','Bearer ','Bearer one two',{}]) {
    assert.equal(parseAdminBearerToken(header),null);
  }
});
