import assert from 'node:assert/strict';
import test from 'node:test';
import {createPreviewAccess} from './preview-access.mjs';

const project='apparition-phoenix-preview', origin='https://123abcde.'+project+'.pages.dev';
const creds={clientId:'fixture-id',clientSecret:'fixture-secret'};

test('negative and positive checks use exact immutable preview; no headers or redirects are followed to other hosts',async()=>{
 const calls=[];
 const a=createPreviewAccess(origin,project,creds,async(url,opts)=>{
  calls.push({url,opts});
  return opts.headers['CF-Access-Client-Id']?new Response('expected asset'):
   new Response(null,{status:302,headers:{Location:'https://test-team.cloudflareaccess.com/cdn-cgi/access/login/preview'}});
 });
 await a.assertProtected();
 assert.equal(await (await a.get('/backend/component-data.mjs')).text(),'expected asset');
 assert(calls.every(({url,opts})=>url.origin===origin&&opts.redirect==='manual'));
 assert.deepEqual(calls[0].opts.headers,{});
 assert.deepEqual(calls[1].opts.headers,{'CF-Access-Client-Id':creds.clientId,'CF-Access-Client-Secret':creds.clientSecret});
 for (const path of ['//other.example/sink','/\\other.example/sink','/?secret=1'])await assert.rejects(a.get(path));
 assert.equal(calls.length,2);
});

test('missing credentials, production-like aliases, public previews and redirected authenticated checks fail closed',async()=>{
 assert.throws(()=>createPreviewAccess(origin,project,{}));
 for(const url of ['https://'+project+'.pages.dev','https://nightfall.'+project+'.pages.dev','https://123abcde.'+project+'.pages.dev.other.example'])
  assert.throws(()=>createPreviewAccess(url,project,creds));
 await assert.rejects(createPreviewAccess(origin,project,creds,async()=>new Response('public')).assertProtected(),/not gated/);
 await assert.rejects(createPreviewAccess(origin,project,creds,async()=>new Response(null,{status:302,headers:{Location:'https://elsewhere.test'}})).get('/'),/failed/);
});
