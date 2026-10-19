// Explicit offline acceptance: real pure modules with injected fixtures, syntax and markup checks.
// This is not browser rendering, authenticated acceptance or production API testing.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {loadJSON,readRegular,sha256,inventory,sameFiles,fail,record,isHash} from './core.mjs';
import {htmlTokens} from './references.mjs';
export async function runtimeAcceptance({root,manifestFile,manifestSHA256}){
 const manifest=(await loadJSON(manifestFile,manifestSHA256)).value,actual=await inventory(root);if(!sameFiles(actual,{files:manifest.files}))fail('RUNTIME_BASELINE','Candidate bytes changed');
 const checks=[],add=(id,status,detail)=>checks.push({id,status,detail}),names=new Set(actual.files.map(f=>f.path));let parsed=0;
 const isolation=await fs.readFile('/proc/self/status','utf8');if(!/^NoNewPrivs:\s+1$/m.test(isolation)||!/^Seccomp:\s+2$/m.test(isolation))fail('RUNTIME_ISOLATION','Run acceptance under the reviewed inherited network-denial launcher');
 if(typeof vm.SourceTextModule!=='function')add('javascript-syntax','pending','Node 22 --experimental-vm-modules is required for parser-only checks');
 else{const errors=[];for(const f of actual.files.filter(x=>/\.(mjs|js)$/.test(x.path))){try{const text=(await readRegular(path.join(root,f.path))).toString();if(f.path.endsWith('.mjs'))new vm.SourceTextModule(text,{identifier:f.path});else new vm.Script(text,{filename:f.path});parsed++;}catch(e){errors.push({path:f.path,error:e.name});}}add('javascript-syntax',errors.length?'failed':'passed',{parsed,errors,execution:'No browser entry module evaluated'});}
 for(const [id,p]of [['homepage-markup','index.html'],['checkout-shell-markup','checkout/index.html'],['news-markup','news/index.html']]){
  if(!names.has(p)){add(id,'failed','Missing '+p);continue;}const tokens=htmlTokens((await readRegular(path.join(root,p))).toString());add(id,tokens.some(t=>t.name==='title'&&!t.closing&&t.content?.trim())&&tokens.some(t=>t.name==='h1'&&!t.closing)?'passed':'failed','Static title/heading only; browser rendering pending');
 }
 const productPages=actual.files.filter(f=>/^products\/.+\/index.html$/.test(f.path));add('product-markup',productPages.length?'passed':'failed',{pages:productPages.length});
 const imageFiles=actual.files.filter(f=>/^products\/.+\/image\.png$/.test(f.path));let pngOK=true;for(const f of imageFiles)if((await readRegular(path.join(root,f.path))).subarray(0,8).toString('hex')!=='89504e470d0a1a0a')pngOK=false;add('product-image-integrity',pngOK&&imageFiles.length>0?'passed':'failed',{files:imageFiles.length,validation:'Exact manifest SHA-256 plus PNG signature; no quality conversion'});
 const config=(await readRegular(path.join(root,'backend/image-delivery-config.mjs'))).toString();add('public-adapter-disabled',/enabled\s*:\s*false/.test(config)?'passed':'failed','No activation performed');
 const model=await import(pathToFileURL(path.join(root,'operations/model.mjs')).href),news=await import(pathToFileURL(path.join(root,'operations/news-render.mjs')).href),publicRead=await import(pathToFileURL(path.join(root,'backend/public-read.mjs')).href);
 const item={desired_state:'ORDERS_PAUSED',pause_from:'2026-01-01T00:00:00Z',resume_at:null,customer_title:'Orders are temporarily paused Test',customer_message:'Synthetic fixture',updated_at:'fixture'};
 const announcement=model.activeAnnouncement(item,[],Date.parse('2026-10-19T00:00:00Z'));add('operations-fixture',announcement.title===item.customer_title&&model.safeHref('javascript:bad')===null?'passed':'failed','Real pure model; synthetic state; no checkout authority');
 const cards=news.newsCards([{slug:'fixture-news',title:'<fixture>',excerpt:'Synthetic',category:'NEWS',publication_at:'2026-10-01T00:00:00Z'}]);add('news-fixture',cards.includes('/news/fixture-news/')&&!cards.includes('<fixture>')?'passed':'failed','Real renderer with synthetic News only');
 let calls=0;const transport=async()=>{calls++;return {ok:true,status:200,json:async()=>[{id:'fixture-component',stock:3}]};},cfg={config:{url:'https://catalogue.fixture.invalid',publishableKey:'fixture-only'},request:transport,maxAgeMs:30000};
 const query='?select=id,stock',a=await publicRead.readPublicRows(cfg,'catalogue_components',query),b=await publicRead.readPublicRows(cfg,'catalogue_components',query);a[0].stock=999;
 add('catalogue-cache-fixture',calls===1&&b[0].stock===3?'passed':'failed',{mockedGETs:calls,productionRequests:0});publicRead.invalidatePublicReads(transport);await publicRead.readPublicRows(cfg,'catalogue_components',query);add('catalogue-invalidation-fixture',calls===2?'passed':'failed',{mockedGETs:calls});
 let denied=false;try{await publicRead.readPublicRows({...cfg,request:async()=>({ok:false,status:402,json:async()=>[]})},'catalogue_components',query);}catch{denied=true;}add('catalogue-failure-fixture',denied?'passed':'failed','Failure rejected; no stale or browser-local substitution');
 const component=await import(pathToFileURL(path.join(root,'backend/component-data.mjs')).href);let writeDenied=false;try{await component.createPublicComponentRepository({config:cfg.config,request:transport,includeImages:false}).save({id:'fixture'});}catch{writeDenied=true;}add('public-write-denial-fixture',writeDenied?'passed':'failed','Real repository rejects writes before transport');
 add('browser-rendering','pending','Connected Chrome is available for read-only repository settings, but offers no documented disposable-profile/process-level network isolation or verified fixture-origin reachability');
 add('browser-console-and-layout','pending','No candidate application page opened; no browser console or visual pass claimed');
 return {schemaVersion:1,kind:'atlas-runtime-acceptance',baselineManifestSHA256:manifestSHA256,mode:'offline-node-fixtures-and-static-analysis',nodeVersion:process.version,networkIsolation:'reviewed-inherited-seccomp; fixture transports; no production credentials',checks,counts:{passed:checks.filter(x=>x.status==='passed').length,failed:checks.filter(x=>x.status==='failed').length,pending:checks.filter(x=>x.status==='pending').length,parsedModules:parsed},browserAccepted:false,productionRequests:0,paymentsCreated:0,ordersCreated:0};
}
