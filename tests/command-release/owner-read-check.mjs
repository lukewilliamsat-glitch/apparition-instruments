import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {buildOwnerCheck} from '../../scripts/command-release/build-owner-check.mjs';
import {createProductionFixture,fixtureConfig,jsonReply} from '../command05/production-fixture.mjs';
const root=resolve('.'),bundle=await buildOwnerCheck(root,{read:async path=>path==='dist/backend/public-config.mjs'?'export const publicBackendConfig=Object.freeze('+JSON.stringify(fixtureConfig)+');':readFile(resolve(root,path),'utf8')});
for(const mode of ['ready','refresh','denied','wrong-origin','missing-approval','no-session','private-field']){
 const fixture=createProductionFixture(),requests=[];
 if(mode==='denied')fixture.setMember(false);
 if(mode==='no-session')fixture.storage.removeItem('apparition.admin.supabase-session.v1');
 if(mode==='refresh'){const value=JSON.parse(fixture.storage.getItem('apparition.admin.supabase-session.v1'));value.expires_at=0;fixture.storage.setItem('apparition.admin.supabase-session.v1',JSON.stringify(value));}
 if(mode==='private-field')fixture.hook(async({url,normal})=>{if(url.pathname.endsWith('/components')){const response=normal(),rows=await response.json();rows[0].image='forbidden';return jsonReply(rows,{range:'0-13/14'});}});
 const context={TextEncoder,TextDecoder,URL,URLSearchParams,AbortController,crypto,structuredClone,atob,Date,setTimeout,clearTimeout,localStorage:fixture.storage,location:{origin:'https://fixture-owner.invalid'},fetch:async(url,options)=>{requests.push({path:new URL(url).pathname,method:options.method||'GET'});return fixture.request(url,options);}};
 runInNewContext(bundle.source,context);assert.equal(requests.length,0,'Loading must be inert');
 const args={approvalRef:'FICTIONAL-OWNER-APPROVAL',metadataSHA256:'a'.repeat(64),sourceCommit:'1'.repeat(40),origin:mode==='wrong-origin'?'https://wrong.invalid':'https://fixture-owner.invalid',inventoryRead:true};if(mode==='missing-approval')delete args.approvalRef;
 const report=await context.COMMAND55_READ_CHECK(args);assert.equal(report.sourceCommit,'df78c5bf5144b012a7d96c628186180fa6432df3','Caller cannot relabel the compiled source');assert(!JSON.stringify(report).includes('fixture-signature'));assert(!JSON.stringify(report).includes('DEMO-POT'));assert(!JSON.stringify(report).includes('00000000-0000-4000'));
 if(mode==='ready'||mode==='refresh'){assert.equal(report.status,'PASS_READ_COMPATIBILITY_OWNER_OPERATED');assert.equal(report.catalogueRows,14);assert.equal(report.requests,mode==='ready'?8:9);assert.equal(report.authRefreshes,mode==='ready'?0:1);assert.equal(report.productionWrites,false);const before=requests.length;const again=await context.COMMAND55_READ_CHECK(args);assert.equal(again.code,'ALREADY_ATTEMPTED_NO_RETRY');assert.equal(requests.length,before);assert.throws(()=>runInNewContext(bundle.source,context),/already installed/);}
 else{assert.equal(report.status,'HOLD');if(['wrong-origin','missing-approval','no-session'].includes(mode))assert.equal(requests.length,0);if(mode==='denied')assert(!requests.some(r=>r.path.endsWith('/components')));}
 assert(requests.length<=9);assert(requests.every(r=>r.method==='GET'||r.path==='/auth/v1/token'));fixture.adapter.dispose();console.log('PASS inert owner live-check fixture: '+mode);
}
console.log(JSON.stringify({bundleClosure:bundle.modules.length,allResponsesFictional:true,providerRequests:0,sourceTests:7}));
