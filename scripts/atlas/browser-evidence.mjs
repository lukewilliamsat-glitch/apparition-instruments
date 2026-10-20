// Receipt validation is not proof of execution. Independent witness trust remains mandatory.
import path from 'node:path';
import {record,portablePath,pathsUnique,sha256,stable,readRegular,isHash,fail} from './core.mjs';
export const BROWSER_CHECKS=['rendered-heading','navigation','styles-loaded','scripts-executed','no-fatal-console-errors','no-broken-images','offline-content','no-mutation','responsive-layout'];
export function browserAcceptancePlan(manifest,manifestSHA256){
 const files=new Set(manifest.files.map(f=>f.path)),selected=['index.html','components/index.html','products/bleed-duncan/index.html','products/ai-pot-ss-alphamini-a500k/index.html','products/bleed-premium/index.html','news/index.html','news/workshop-closure/index.html','privacy/index.html','terms/index.html','basket/index.html','checkout/index.html','luthier-hub/index.html'];
 if(!isHash(manifestSHA256)||selected.some(p=>!files.has(p)))fail('BROWSER_PLAN','Required local route missing');
 return {schemaVersion:1,kind:'atlas-browser-plan',baselineManifestSHA256:manifestSHA256,viewports:[{id:'desktop',width:1440,height:900},{id:'mobile',width:390,height:844}],routes:selected.map(p=>({path:p,documentSHA256:manifest.files.find(f=>f.path===p).sha256,screenshotRequired:true,checks:BROWSER_CHECKS})),network:'exact loopback fixture origin only; no backend, Stripe, forms, authentication or external navigation',authority:'Offline presentation acceptance only; no production integration or publication authority'};
}
const bools=['disposableProfile','serviceWorkersDisabled','externalHTTPBlocked','externalWebSocketBlocked','processIsolationVerified','dnsBypassBlocked','ipv6BypassBlocked','redirectEscapeBlocked'];
export async function checkBrowserEvidence({report,plan,planSHA256,artifactsRoot}){
 if(sha256(stable(plan))!==planSHA256||report.planSHA256!==planSHA256||report.baselineManifestSHA256!==plan.baselineManifestSHA256)fail('BROWSER_BINDING','Browser evidence binds another plan/baseline');
 record(report,['schemaVersion','kind','planSHA256','baselineManifestSHA256','engine','isolation','sessionsCreated','formsSubmitted','productionRequests','routes'],'browser receipt');
 if(report.schemaVersion!==1||report.kind!=='atlas-browser-evidence'||report.sessionsCreated!==0||report.formsSubmitted!==0||report.productionRequests!==0||!Array.isArray(report.routes))fail('BROWSER_EVIDENCE','Invalid browser receipt or mutation');
 record(report.engine,['name','version','provenance'],'browser engine');if(!['Chrome','Chromium','Firefox','WebKit'].includes(report.engine.name)||!/^\d+(?:\.\d+){1,3}$/.test(report.engine.version)||!report.engine.provenance)fail('BROWSER_EVIDENCE','Real engine/version/provenance required');
 record(report.isolation,['origin',...bools,'probeEvidence'],'browser isolation');let origin;try{origin=new URL(report.isolation.origin);}catch{fail('BROWSER_ISOLATION','Invalid fixture origin');}
 if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||bools.some(x=>report.isolation[x]!==true))fail('BROWSER_ISOLATION','Verified disposable loopback-only isolation required');
 const proof=report.isolation.probeEvidence;record(proof,['path','sha256'],'isolation artifact');portablePath(proof.path);if(!isHash(proof.sha256)||sha256(await readRegular(path.join(artifactsRoot,proof.path)))!==proof.sha256)fail('BROWSER_ISOLATION','Isolation probe artifact missing or changed');
 const required=new Map(plan.routes.flatMap(r=>plan.viewports.map(v=>[r.path+'|'+v.id,{route:r,viewport:v}]))),seen=new Set(),pending=[],failed=[];
 for(const r of report.routes){
  record(r,['path','viewport','documentSHA256','status','checks','screenshot','console','network'],'browser route');portablePath(r.path);const key=r.path+'|'+r.viewport,expect=required.get(key);
  if(!expect||seen.has(key)||r.documentSHA256!==expect.route.documentSHA256||!['passed','failed','blocked','not-executed','requires-live-verification'].includes(r.status)||!Array.isArray(r.checks))fail('BROWSER_COVERAGE','Unknown, duplicate or wrong-byte route');seen.add(key);
  pathsUnique(r.checks.map(c=>c.id),'browser checks');if(stable(r.checks.map(c=>c.id).sort())!==stable([...BROWSER_CHECKS].sort()))fail('BROWSER_COVERAGE','Incomplete browser checks');
  for(const c of r.checks){record(c,['id','status','detail'],'browser check');if(!['passed','failed','blocked','not-executed','requires-live-verification'].includes(c.status)||typeof c.detail!=='string'||!c.detail.trim())fail('BROWSER_EVIDENCE','Unexplained browser result');}
  record(r.console,['errors','unhandledRejections'],'browser console');if(!Array.isArray(r.console.errors)||!Array.isArray(r.console.unhandledRejections))fail('BROWSER_EVIDENCE','Console diagnostics required');
  record(r.network,['allowed','blocked'],'browser network');if(!Array.isArray(r.network.allowed)||!Array.isArray(r.network.blocked))fail('BROWSER_EVIDENCE','Network diagnostics required');
  for(const n of r.network.allowed){record(n,['url','method','status'],'allowed request');let u;try{u=new URL(n.url);}catch{fail('BROWSER_NETWORK','Invalid request URL');}if(u.origin!==origin.origin||n.method!=='GET'||!Number.isInteger(n.status)||u.username||u.password||u.hash)fail('BROWSER_NETWORK','External request or mutation reported as allowed');}
  if(r.status==='passed'&&(r.checks.some(c=>c.status!=='passed')||r.console.errors.length||r.console.unhandledRejections.length||!r.network.allowed.length||r.network.allowed.some(n=>n.status>=400)))fail('BROWSER_FALSE_PASS','Failure/pending state cannot be labelled passed');
  if(r.status==='passed'&&expect.route.screenshotRequired&&!r.screenshot)fail('BROWSER_SCREENSHOT','Required responsive screenshot missing');
  if(r.screenshot){record(r.screenshot,['path','sha256'],'browser screenshot');portablePath(r.screenshot.path);const b=await readRegular(path.join(artifactsRoot,r.screenshot.path));if(sha256(b)!==r.screenshot.sha256||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.length<24||b.readUInt32BE(16)!==expect.viewport.width||b.readUInt32BE(20)<expect.viewport.height)fail('BROWSER_SCREENSHOT','Screenshot hash/PNG/viewport mismatch');}
  if(r.status==='failed')failed.push(key);else if(r.status!=='passed')pending.push(key);
 }
 for(const key of required.keys())if(!seen.has(key))pending.push(key);
 return {browserAccepted:pending.length===0&&failed.length===0,executed:seen.size,required:required.size,failed,pending,receiptSHA256:sha256(stable(report)),authority:'Structural/artifact verification only; independent signed witness still required'};
}
