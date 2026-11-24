import assert from 'node:assert/strict';
import {marketplaceStageAuth} from './marketplace-stage-auth.mjs';
const origin='https://prwmowexhonguvtiywsy.supabase.co';
const actor='00000000-0000-4000-8000-000000000001';
const jwt=(iss,sub=actor)=>'fixture.'+Buffer.from(JSON.stringify({iss,sub})).toString('base64url')+'.fixture';
let calls=[];
let role=true;
let local=true;
let tooLarge=false;
const fetcher=async(url,init)=>{
 const u=new URL(url);
 calls.push(u.pathname);
 assert.equal(u.origin,origin);
 assert.equal(init.method,'GET');
 assert.equal(init.redirect,'error');
 if(u.pathname==='/auth/v1/user')
  return new Response(tooLarge?'x'.repeat(16500):JSON.stringify({id:actor}));
 return new Response(JSON.stringify(role?[{user_id:actor}]:[]));
};
const auth=token=>marketplaceStageAuth({request:new Request('https://fixture.example',{headers:{authorization:'Bearer '+token}}),
 publishableKey:'sb_publishable_fixture',sessionOrigin:origin,allowActor:async(id)=>local&&id===actor,fetcher});
assert.equal(await auth(jwt(origin+'/auth/v1')).requireAdmin(),actor);
assert.deepEqual(calls,['/auth/v1/user','/rest/v1/admin_members']);
calls=[];
await assert.rejects(auth(jwt('https://acdxpxvksvdwfajntzfx.supabase.co/auth/v1')).requireAdmin(),/Verified staging/);
assert.deepEqual(calls,[]);
role=false;await assert.rejects(auth(jwt(origin+'/auth/v1')).requireAdmin(),/Verified staging/);
role=true;local=false;await assert.rejects(auth(jwt(origin+'/auth/v1')).requireAdmin(),/Verified staging/);
local=true;tooLarge=true;await assert.rejects(auth(jwt(origin+'/auth/v1')).requireAdmin(),/Verified staging/);
console.log('PASS verified Auth subject, staging issuer, membership, dedicated Marketplace role and bounded response');
