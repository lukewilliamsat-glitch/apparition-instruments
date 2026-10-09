import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
const original={};for(const k of ['window','sessionStorage','localStorage','location','caches','crypto','fetch'])original[k]=Object.getOwnPropertyDescriptor(globalThis,k);
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),clear:()=>m.clear()};};
let calls=0,stock=2,fail=false;const bucketRows=new Map(),bucket={match:async k=>bucketRows.get(typeof k==='string'?k:k.url)?.clone(),put:async(k,r)=>bucketRows.set(k,r.clone()),delete:async k=>bucketRows.delete(typeof k==='string'?k:k.url),keys:async()=>[...bucketRows.keys()].map(k=>new Request(k))};
const values={window:{},sessionStorage:storage(),localStorage:storage(),location:{href:'https://fixture.test/components/'},caches:{open:async()=>bucket},crypto:webcrypto,fetch:async()=>{calls++;if(fail)throw Error('offline');return new Response(JSON.stringify([{id:'public',stock,image:'data:image/png;base64,'+'A'.repeat(100000)}]),{status:200});}};
for(const [k,v] of Object.entries(values))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
const config={url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'},realNow=Date.now;let now=realNow();Date.now=()=>now;
try{
 const a=await import('../dist/backend/public-read.mjs?first-browser');await a.readPublicRows({config},'catalogue_components','?select=id,stock,image');assert.equal(calls,1);assert.equal(bucketRows.size,1);
 const b=await import('../dist/backend/public-read.mjs?next-navigation');assert.equal((await b.readPublicRows({config},'catalogue_components','?select=id,stock,image'))[0].stock,2);assert.equal(calls,1,'Cache Storage reuses large public image result across navigation');
 stock=4;const {createAuthenticatedRepositoryTransport}=await import('../dist/backend/providers.mjs');const transport=createAuthenticatedRepositoryTransport({accessToken:async()=>'mock-admin-token'},{config,request:async()=>new Response('[]',{status:200})});await transport.send('inventory',{method:'PATCH',body:{quantity:4}});assert.equal((await b.readPublicRows({config},'catalogue_components','?select=id,stock,image'))[0].stock,4);assert.equal(calls,2,'Actual shared authenticated transport invalidates public caches');
 now+=30001;fail=true;await assert.rejects(b.readPublicRows({config},'catalogue_components','?select=id,stock,image'),/offline/);assert.equal(bucketRows.size,0,'Expired persisted rows deleted and never substituted');fail=false;
 globalThis.sessionStorage.setItem=()=>{throw Error('quota');};await b.readPublicRows({config},'catalogue_components','?select=id');assert.equal(calls,4,'Denied session writes do not prevent live read');
 await assert.rejects(transport.send('customer_secrets'),/Unsupported/);
 console.log('Browser cache integration PASS: large-image navigation reuse, actual authenticated Admin transport invalidation, strict persisted expiry/offline denial, optional storage and private allowlist preserved.');
}finally{Date.now=realNow;for(const [k,d] of Object.entries(original)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
