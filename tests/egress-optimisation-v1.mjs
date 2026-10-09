import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {readPublicRows,invalidatePublicReads,technicalColumns,componentColumns,publicCachePolicy} from '../dist/backend/public-read.mjs';
import {createPublicComponentRepository} from '../dist/backend/component-data.mjs';
const config={url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'},realNow=Date.now;let now=realNow();Date.now=()=>now;
let calls=0,release,fail=false;const request=async(url)=>{calls++;if(release)await release.promise;if(fail)throw Error('offline fixture');return {ok:true,json:async()=>[{id:'fixture',stock:2,specs:{Resistance:'500kΩ'},image:'data:image/png;base64,AAAA'}]};};
const load=()=>readPublicRows({config,request},'catalogue_components','?select='+componentColumns);
try{
 const [a,b]=await Promise.all([load(),load()]);assert.equal(calls,1);a[0].specs.Resistance='mutated';assert.equal(b[0].specs.Resistance,'500kΩ');assert.equal((await load())[0].specs.Resistance,'500kΩ');assert.equal(calls,1);
 now+=publicCachePolicy.maxAgeMs+1;await load();assert.equal(calls,2);invalidatePublicReads(request);await load();assert.equal(calls,3);
 now+=publicCachePolicy.maxAgeMs+1;fail=true;await assert.rejects(load(),/offline/);await assert.rejects(load(),/offline/);assert.equal(calls,5,'Expired cache never falls back offline');fail=false;
 await assert.rejects(readPublicRows({config,request},'orders','?select=*'),/Unsupported/);
 let resolve;release={promise:new Promise(r=>resolve=r)};const inFlight=load();invalidatePublicReads(request);release=null;resolve();await inFlight;const previous=calls;await load();assert.equal(calls,previous+1,'Invalidation during request prevents stale repopulation');
 await readPublicRows({config,request,maxAgeMs:0},'catalogue_components','?select='+componentColumns);assert.equal(calls,previous+2,'Build/live bypass');
 const urls=[];const technical=await createPublicComponentRepository({config,includeImages:false,request:async url=>{urls.push(new URL(url));return {ok:true,json:async()=>[{id:'fixture',stock:1}]};}}).list('fixture');assert.equal(technical.length,1);assert(!urls[0].searchParams.get('select').split(',').includes('image'));assert.equal(urls[0].searchParams.get('id'),'eq.fixture');assert(!technicalColumns.split(',').includes('image'));
 // Bounded entries: oldest request is evicted, recent requests remain cached.
 let boundedCalls=0;const bounded=async()=>{boundedCalls++;return {ok:true,json:async()=>[]};};for(let i=0;i<40;i++)await readPublicRows({config,request:bounded},'catalogue_components','?select=id&id=eq.'+i);await readPublicRows({config,request:bounded},'catalogue_components','?select=id&id=eq.39');assert.equal(boundedCalls,40);await readPublicRows({config,request:bounded},'catalogue_components','?select=id&id=eq.0');assert.equal(boundedCalls,41);
 // Measured controlled payloads, not billable/network bandwidth.
 const images=Array.from({length:6},(_,i)=>({id:'p'+i,name:'Fixture',stock:2,image:'data:image/png;base64,'+Buffer.alloc(512*1024,i+30).toString('base64')}));const before=Buffer.from(JSON.stringify(images)),after=Buffer.from(JSON.stringify(images.map(({image,...r})=>r)));console.log(JSON.stringify({fixtureRawBefore:before.length,fixtureRawAfter:after.length,fixtureGzipBefore:gzipSync(before).length,fixtureGzipAfter:gzipSync(after).length}));
 const workflow=readFileSync('.github/workflows/static.yml','utf8');assert(workflow.includes("cron: '*/15 * * * *'"));assert(workflow.includes('cancel-in-progress: false'));assert.equal((workflow.match(/uses: actions\/upload-pages-artifact/g)||[]).length,1);assert(workflow.includes('Generate CMS published articles'));assert(readFileSync('dist/circuit-forge/app.mjs','utf8').includes('includeImages:false'));assert(readFileSync('dist/operations/public.mjs','utf8').includes('includeImages:false}).list(id)'));
 console.log('Egress optimisation focused PASS: concurrent/settled dedup, isolation, strict expiry, invalidation/race, failure retry, bounded cache, public-only boundary, image-free scoped reads and workflow responsibilities.');
}finally{Date.now=realNow;}
