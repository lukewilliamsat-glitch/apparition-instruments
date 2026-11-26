import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=await mkdtemp(join(tmpdir(),'checkout93-config-'));
try{
 await mkdir(join(root,'checkout'));await mkdir(join(root,'_shared'));
 for(const [from,to] of [['create-checkout.staging.review.ts','checkout/index.ts'],['session.mjs','checkout/session.mjs'],['customer-auth.baseline.ts','_shared/customer-auth.ts']])
  await copyFile(new URL(from,import.meta.url),join(root,to));
 const {startCheckout}=await import(pathToFileURL(join(root,'checkout/index.ts')).href);
 const base={SUPABASE_URL:'https://prwmowexhonguvtiywsy.supabase.co',SUPABASE_ANON_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-private',UNITY92_CHECKOUT:'enabled'};
 const run=async extra=>startCheckout(new Request('https://fixture.invalid',{method:'POST',body:'{}'}),{get:name=>({...base,...extra})[name]},async()=>{throw Error('Configuration tests must not contact providers.');});
 assert.equal((await run({})).status,503);
 assert.equal((await run({STRIPE_SECRET_KEY:'sk_test_Disposable93'})).status,400);
 assert.equal((await run({STRIPE_SANDBOX_SECRET_KEY:'rk_test_Disposable93'})).status,400);
 assert.equal((await run({STRIPE_SECRET_KEY:'sk_live_Disposable93'})).status,503);
 assert.equal((await run({STRIPE_SANDBOX_SECRET_KEY:'sk_live_Disposable93',STRIPE_SECRET_KEY:'sk_test_Disposable93'})).status,503);
 assert.equal((await run({STRIPE_SECRET_KEY:'sk_test_Disposable93',UNITY92_CHECKOUT:undefined})).status,503);
 assert.equal((await run({STRIPE_SECRET_KEY:'sk_test_Disposable93',SUPABASE_URL:'https://acdxpxvksvdwfajntzfx.supabase.co'})).status,503);
 console.log('PASS staging secret alias, live-key rejection, exact staging target and disabled gate; no provider requests');
}finally{await rm(root,{recursive:true,force:true});}
