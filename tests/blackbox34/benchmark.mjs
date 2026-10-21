// Real byte hashing / CPU / wall-time under injected, non-network Responses.
import assert from 'node:assert/strict';import {readFile,writeFile,rm} from 'node:fs/promises';
import {workload,fixtureTransport,config,delivery,sha} from './fixtures.mjs';
import {readCatalogueComponents,acquireDemandImage,demandImageDiagnostics,verifyStaticImageBytes} from '../../dist/backend/catalogue-image-delivery.mjs';
globalThis.fetch=()=>{throw Error('Uninjected network prohibited');};
const snapshot=await readFile(new URL('./baseline-resolver.txt',import.meta.url));
assert.equal(sha(snapshot),'0f52310bd39a66f62d393f69f355b39801a2f1e97c7d7f349eaff4f85cdc55f8');
const marker="throw Error('Static image source identity mismatch');\n}";
assert(snapshot.toString().includes(marker));
const instrumented=snapshot.toString().replace(marker,"throw Error('Static image source identity mismatch');\n globalThis.__nightfallVerified?.();\n}");
const path=new URL('../../dist/backend/.nightfall-baseline.fixture.mjs',import.meta.url);await writeFile(path,instrumented);
const baseline=await import(path.href),results=[];
try{
 for(const [count,size,unique] of [[14,102400,10],[14,512000,10],[14,1048576,10],[14,3145728,10],[100,102400,25],[100,512000,25],[100,1048576,25],[500,102400,50],[500,512000,50]]){
  const f=workload(count,size,unique),row={count,size,uniqueImages:unique,neededProducts:6};
  for(const mode of ['baseline','candidate']){
   const t=fixtureTransport(f),start=performance.now(),cpu=process.cpuUsage(),before=process.memoryUsage();let peak=before.rss,firstVerified=null;
   globalThis.__nightfallVerified=()=>{firstVerified??=performance.now()-start;};
   const monitor=setInterval(()=>peak=Math.max(peak,process.memoryUsage().rss),2);
   const rows=await (mode==='baseline'?baseline.readCatalogueComponents:readCatalogueComponents)({config,delivery:mode==='baseline'?{...delivery,verificationMode:undefined}:delivery,request:t.request});
   const usable=performance.now()-start,leases=[];
   if(mode==='candidate'){leases.push(await acquireDemandImage(rows[0].image));firstVerified=performance.now()-start;leases.push(...await Promise.all(rows.slice(1,6).map(r=>acquireDemandImage(r.image))));}
   const firstRequired=performance.now()-start,bytes=t.metrics.bodyBytes,calls=t.metrics.calls.length;
   const warmStart=performance.now();const warmRows=await (mode==='baseline'?baseline.readCatalogueComponents:readCatalogueComponents)({config,delivery:mode==='baseline'?{...delivery,verificationMode:undefined}:delivery,request:t.request});
   const warm=mode==='candidate'?await Promise.all(warmRows.slice(0,6).map(r=>acquireDemandImage(r.image))):[];
   const warmMs=performance.now()-warmStart,after=process.memoryUsage(),used=process.cpuUsage(cpu);clearInterval(monitor);
   row[mode]={metadataUsableMs:usable,firstVerifiedImageMs:firstVerified,firstRequiredImagesMs:firstRequired,coldAssetBodyBytes:bytes,coldRequests:calls,peakConcurrent:t.metrics.peak,warmAdditionalBodyBytes:t.metrics.bodyBytes-bytes,warmAdditionalRequests:t.metrics.calls.length-calls,warmMs,cpuUserMs:used.user/1000,cpuSystemMs:used.system/1000,rssBefore:before.rss,rssAfter:after.rss,sampledPeakRSS:Math.max(peak,after.rss),arrayBuffersAfter:after.arrayBuffers,...mode==='candidate'?{verifiedPool:demandImageDiagnostics(t.request)}:{}};
   [...leases,...warm].forEach(l=>l.release());
   // Release state/leases before next fixture; no dependence on garbage collection.
   if(mode==='candidate'){const {invalidatePublicReads}=await import('../../dist/backend/public-read.mjs');invalidatePublicReads(t.request);demandImageDiagnostics(t.request);}
  }
  assert.equal(row.candidate.coldAssetBodyBytes,6*size);assert.equal(row.baseline.coldAssetBodyBytes,unique*size);assert(row.candidate.peakConcurrent<=4);assert.equal(row.candidate.warmAdditionalBodyBytes,0);results.push(row);
 }
 const f=workload(1,3145728,1),asset=[...f.assets.values()][0],cpu=process.cpuUsage(),start=performance.now();
 for(let i=0;i<3;i++)await verifyStaticImageBytes(new Response(asset.bytes,{headers:{'content-type':'image/png'}}),asset.entry);
 const cost=process.cpuUsage(cpu);
 console.log(JSON.stringify({suite:'nightfall-performance',runtime:process.version,passed:results.length,results,verification3x3MiB:{wallMs:performance.now()-start,cpuUserMs:cost.user/1000,cpuSystemMs:cost.system/1000},method:'Injected uncached byte transport; real full-byte SHA-256/source hashing. Warm result is JavaScript verified cache, not native HTTP cache. Timings are runner-specific; RSS is process-level sampled, not isolated allocation or browser decoded-image memory.',productionRequests:0}));
}finally{delete globalThis.__nightfallVerified;await rm(path,{force:true});}
