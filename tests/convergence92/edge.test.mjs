import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
let handler;
const expected='https://prwmowexhonguvtiywsy.supabase.co';
let environment=expected;
globalThis.Deno={env:{get:key=>key==='SUPABASE_URL'?environment:key==='SUPABASE_SERVICE_ROLE_KEY'?'fixture-private-key':null},
 serve:fn=>{handler=fn;}};
await import(pathToFileURL(new URL('./index.ts',import.meta.url).pathname));
const request=(body,signature='t=123,v1=test')=>new Request('https://fixture.invalid/webhook',
 {method:'POST',headers:{'stripe-signature':signature},body});
const original=globalThis.fetch;
let calls=0;
try {
 assert.equal((await handler(new Request('https://fixture.invalid/webhook'))).status,405);
 assert.equal((await handler(request('{}',''))).status,400);
 environment='https://acdxpxvksvdwfajntzfx.supabase.co';
 assert.equal((await handler(request('{}'))).status,503);
 environment=expected;
 assert.equal((await handler(request('a'.repeat(98305)))).status,413);
 globalThis.fetch=async (url,options)=>{
  calls++;
  assert.equal(url,expected+'/rest/v1/rpc/convergence92_receive');
  assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{p_raw:'{"fixture":true}',p_signature:'t=123,v1=test'});
  return Response.json({outcome:'paid'});
 };
 const response=await handler(request('{"fixture":true}'));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{outcome:'paid'});
 assert.equal(calls,1);
 console.log('PASS HTTP method, stage target, body bounds and exact signed payload forwarding');
} finally {globalThis.fetch=original;delete globalThis.Deno;}
