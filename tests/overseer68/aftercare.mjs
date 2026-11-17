import assert from 'node:assert/strict';
import {handleAftercare,sender} from '../../supabase/functions/overseer-aftercare/index.ts';
const admin='68a00000-0000-4000-8000-000000000001',order='68a00000-0000-4000-8000-000000000003';
const staging='https://prwmowexhonguvtiywsy.supabase.co',origin='https://overseer.apparition-phoenix-preview.pages.dev';
const data={SUPABASE_URL:staging,SUPABASE_ANON_KEY:'fixture',SUPABASE_SERVICE_ROLE_KEY:'service-fixture',OVERSEER_EBAY_SMTP_ENABLED:'true',SMTP_FROM_EMAIL:sender};
const env={get:n=>data[n]},claims=[];
let member=true,recipient='synthetic@example.invalid',outbound=0,finished=0;
const transport=async (target,init)=>{
 assert.equal(new URL(target).origin,staging);assert.equal(init.redirect,'error');
 const path=new URL(target).pathname;
 if(path==='/auth/v1/user')return Response.json({id:admin,role:'authenticated'});
 if(path==='/rest/v1/admin_members')return Response.json(member?[{user_id:admin}]:[]);
 assert.equal(init.headers.Authorization,'Bearer service-fixture');
 const p=JSON.parse(init.body);
 if(path.endsWith('/overseer_aftercare_context')){assert.equal(p.p_mode,'sink');return Response.json({orderId:order,recipient,reference:'AI-068001',firstName:'<Synthetic>'});}
 if(path.endsWith('/overseer_aftercare_claim')){if(claims.length)return Response.json(false);claims.push(p);return Response.json(true);}
 if(path.endsWith('/overseer_aftercare_finish')){assert.equal(p.p_state,'sink_recorded');finished++;return Response.json(true);}
 throw Error('Unexpected provider request');
};
const setup=(action,extra={})=>({action,orderId:order,template:'order_support',...extra});
let t=Date.now();
const call=(payload,headers={})=>handleAftercare(new Request(staging+'/functions/v1/overseer-aftercare',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+('x'.repeat(30)),...headers},body:JSON.stringify(payload)}),env,transport,async()=>{outbound++;throw Error('No mail permitted');},()=>t);
assert.equal((await call(setup('draft'),{Origin:'https://unrelated.example'})).status,403);
member=false;assert.equal((await call(setup('draft'))).status,403);member=true;
assert.equal((await call(setup('draft',{recipient:'different@example.invalid'}))).status,400);
recipient='buy@members.ebay.com';assert.equal((await call(setup('draft'))).status,409);recipient='synthetic@example.invalid';
const draft={subject:'Order {{order_number}}',message:'Hello {{first_name}},\nPlease reply in eBay.'};
assert.equal((await call(setup('preview',{...draft,message:'Buy here: https://example.com'}))).status,400);
const preview=await (await call(setup('preview',draft))).json();
assert(preview.html.includes('&lt;Synthetic&gt;'));assert(!preview.html.includes('<Synthetic>'));
const confirm=(overrides={})=>setup('confirm',{...draft,token:preview.token,confirmed:true,...overrides});
assert.equal((await call(confirm({message:'A different message.'}))).status,409);
assert.equal((await call(confirm({confirmed:false}))).status,409);
t+=300000;assert.equal((await call(confirm())).status,409);t-=300000;
assert.equal((await (await call(confirm())).json()).state,'sink_recorded');
assert.equal((await call(confirm())).status,409);assert.equal(claims.length,1);assert.equal(finished,1);assert.equal(outbound,0);
console.log('Aftercare Direct: provider-isolated transport, recipient binding, Admin verification, content escaping, preview confirmation and expiry, and duplicate protection PASS');
