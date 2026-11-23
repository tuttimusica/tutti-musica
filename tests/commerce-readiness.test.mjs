import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin/commerce-readiness.js';

function invoke(method='GET',headers={}) {
  const req={method,headers};
  const headersSent={};
  const res={
    statusCode:200,
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
test('commerce readiness rejects POST without processing payments',async()=>{
  const response=await invoke('POST');
  assert.equal(response.status,405);
  assert.equal(response.headers.allow,'GET');
});
test('commerce readiness rejects malformed bearer',async()=>{
  const response=await invoke('GET',{authorization:'Basic fake'});
  assert.equal(response.status,401);
});
