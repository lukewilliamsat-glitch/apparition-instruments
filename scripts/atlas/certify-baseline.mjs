// Offline technical certification. Operator-supplied trust anchors are separate from evidence.
// Signatures authenticate an independent witness, not the truth of an arbitrary claim.
// Bytes, inventories, reference closure and discrepancy bindings are checked locally as well.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verify,createPublicKey} from 'node:crypto';
import {record,fail,isHash,portablePath,pathsUnique,loadJSON,readRegular,sha256,stable,manifestContract,inventory,sameFiles,safeRoot} from './core.mjs';
import {validateSnapshot} from './validate-snapshot.mjs';
import {stampSource} from '../stamp-static-assets.mjs';
import {verifyOwnerDispositions} from './owner-dispositions.mjs';
import {checkDeploymentInventory,checkRuntimeAcceptance} from './readiness-evidence.mjs';

export const CATEGORIES=['routes','staticAssets','productImages','productContent','news','cms','homepage','legal','checkout'];
export const CHECKS=['static-preservation','checkout-compatibility','runtime-dependencies','product-image-availability','news-cms-consistency','rollback-recovery'];
export const FIRST_PARTY_ORIGIN='https://apparitioninstruments.co.uk';
const issued=new WeakSet();
const exact=(v,keys,label)=>{record(v,keys,label);if(keys.some(k=>!Object.hasOwn(v,k)))fail('CERT_SCHEMA','Missing '+label+' field');return v;};
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=2000;
const entry=(v,keys,label)=>{exact(v,keys,label);if(!isHash(v.sha256))fail('CERT_SCHEMA','Invalid '+label+' hash');return v;};
const same=(a,b)=>stable(a)===stable(b);
function disjoint(a,b){return a!==b&&!a.startsWith(b+path.sep)&&!b.startsWith(a+path.sep);}

// A caller cannot manufacture a successful certificate with a plain JSON object.
// Re-certify after process restart; saved verdicts are evidence, never bearer authority.
export function requireCertifiedBaseline(certificate,manifestSHA256){
 if(!issued.has(certificate)||certificate.technicalStatus!=='certified'||certificate.baselineManifestSHA256!==manifestSHA256)fail('CERTIFICATION_REQUIRED','Independent technical certification required; owner approval cannot replace it');
 return certificate;
}
export function requireReleaseReadiness(certificate,manifestSHA256){requireCertifiedBaseline(certificate,manifestSHA256);if(certificate.evidenceVersion!==2)fail('READINESS_REQUIRED','Production preflight requires version 2 deployment and runtime evidence');return certificate;}

export async function certifyBaseline({requestFile,requestSHA256,trustedSigners={},trustedOwnerDispositions=[]}){
 if(!isHash(requestSHA256))fail('CERT_PIN','An independently supplied certification request pin is required');
 const request=(await loadJSON(requestFile,requestSHA256)).value;
 const required=['schemaVersion','kind','baselineId','sourceRevision','baseline','repository','observations','reference','rollback','requirements','matrix','inventoryWitness','functionalWitness'];record(request,[...required,'ownerDispositions','deploymentInventory','runtimeAcceptance'],'certification request');if(required.some(k=>!Object.hasOwn(request,k)))fail('CERT_SCHEMA','Missing certification request field');
 if(![1,2].includes(request.schemaVersion)||request.kind!=='atlas-baseline-certification'||!text(request.baselineId)||!/^[a-f0-9]{40}$/.test(request.sourceRevision))fail('CERT_SCHEMA','Unknown certification contract/identity');
 if(request.schemaVersion===2&&(!request.deploymentInventory||!request.runtimeAcceptance))fail('READINESS_REQUIRED','Deployment inventory and runtime acceptance are mandatory in version 2');
 const base=path.dirname(path.resolve(requestFile)),pins=[],issues=[];
 const issue=(code,detail)=>issues.push({code,detail});
 const local=p=>path.join(base,portablePath(p));
 async function jsonRef(v,label){entry(v,['path','sha256'],label);const file=local(v.path);pins.push([file,v.sha256]);return (await loadJSON(file,v.sha256)).value;}
 async function snapshot(v,label){
  entry(v,['root','manifest','sha256'],label);const root=await safeRoot(local(v.root)),file=local(v.manifest),manifest=manifestContract((await loadJSON(file,v.sha256)).value);pins.push([file,v.sha256]);
  const actual=await inventory(root),expected={files:manifest.files};if(!sameFiles(actual,expected))issue('SNAPSHOT_INTEGRITY',label);
  return {root,manifest,actual,pin:v.sha256};
 }
 const baseline=await snapshot(request.baseline,'baseline'),repository=await snapshot(request.repository,'repository'),observations=await snapshot(request.observations,'observations'),rollback=await snapshot(request.rollback,'rollback');
 if(baseline.manifest.provenance.type==='synthetic')issue('SYNTHETIC_BASELINE','Synthetic evidence cannot receive production certification');
 // Source roots must be separate physical trees, not aliases of candidate output.
 for(const s of [repository,observations,rollback])if(!disjoint(baseline.root,s.root))issue('DEPENDENT_SOURCE','Baseline and source/rollback roots overlap');
 let reference=null;
 if(request.reference!==null){reference=await snapshot(request.reference,'reference');if(!disjoint(baseline.root,reference.root))issue('DEPENDENT_SOURCE','Reference aliases candidate');}
 else issue('REFERENCE_MISSING','No independently preserved complete deployment/reference snapshot');
 const validation=await validateSnapshot(baseline.root,baseline.manifest);
 if(!validation.valid)issue('REFERENCE_CLOSURE','Baseline bytes or references invalid');
 if(!sameFiles(baseline.actual,rollback.actual))issue('ROLLBACK_MISMATCH','Rollback is not the exact baseline inventory');
 if(reference&&!sameFiles(baseline.actual,reference.actual))issue('VERSION_SET_MISMATCH','Independent reference and candidate file sets/bytes differ');

 const requirements=await jsonRef(request.requirements,'requirements');
 exact(requirements,['schemaVersion','kind','categories','emptyCategoryReasons','unknownDynamicDependencies'],'requirements');
 if(requirements.schemaVersion!==1||requirements.kind!=='atlas-certification-requirements')fail('CERT_SCHEMA','Unknown requirements');
 exact(requirements.categories,CATEGORIES,'categories');record(requirements.emptyCategoryReasons,CATEGORIES,'empty reasons');
 const candidate=new Map(baseline.actual.files.map(f=>[f.path,f])),all=new Set();
 // The older closure scanner explicitly classifies absolute-scheme URLs as external.
 // Independently require same-origin references as local files, including product PNGs.
 const firstPartyMissing=new Set();
 for(const ref of validation.referenceReport.external){
  // Bare module specifiers need import-map/runtime review, not URL-relative inference.
  if(!/^(?:https?:)?\/\//i.test(ref.reference))continue;
  let url;try{url=new URL(ref.reference,FIRST_PARTY_ORIGIN);}catch{continue;}
  if(url.origin!==FIRST_PARTY_ORIGIN)continue;
  let p;try{p=decodeURIComponent(url.pathname).replace(/^\//,'');}catch{issue('FIRST_PARTY_URL_INVALID',ref.file);continue;}
  if(!p||p.endsWith('/'))p+='index.html';else if(candidate.has(p+'/index.html'))p+='/index.html';
  try{portablePath(p);}catch{issue('FIRST_PARTY_URL_INVALID',ref.file);continue;}
  if(!candidate.has(p)){firstPartyMissing.add(p);issue('FIRST_PARTY_ASSET_MISSING',p);}
 }
 for(const c of CATEGORIES){pathsUnique(requirements.categories[c],c);if(!requirements.categories[c].length&&!text(requirements.emptyCategoryReasons[c]))issue('COVERAGE_MISSING',c);for(const p of requirements.categories[c]){all.add(p);if(!candidate.has(p))issue('REQUIRED_FILE_MISSING',p);}}
 if(!Array.isArray(requirements.unknownDynamicDependencies)||requirements.unknownDynamicDependencies.some(x=>!text(x)))fail('CERT_SCHEMA','Unknown dependencies must be explicit strings');
 if(requirements.unknownDynamicDependencies.length)issue('DYNAMIC_DEPENDENCIES_UNKNOWN','Runtime dependency review incomplete');
 for(const p of candidate.keys()){
  if(!all.has(p))issue('UNSCOPED_FILE',p);
  const required=[];
  if(/\.html?$/.test(p))required.push('routes');else required.push('staticAssets');
  if(p==='index.html')required.push('homepage');
  if(/^(privacy|terms)\//.test(p))required.push('legal');
  if(/^(checkout|basket)\//.test(p))required.push('checkout');
  if(/^products\/.+\.html?$/.test(p))required.push('productContent');
  if(/^products\/.*\.(png|jpe?g|webp|svg|gif)$/.test(p))required.push('productImages');
  if(/^news\//.test(p))required.push('news');if(/^luthier-hub\//.test(p))required.push('cms');
  for(const c of required)if(!requirements.categories[c].includes(p))issue('MISCLASSIFIED_COVERAGE',c+':'+p);
 }
 if(!requirements.categories.homepage.includes('index.html'))issue('HOMEPAGE_MISSING','index.html must be required');
 const repo=new Map(repository.actual.files.map(f=>[f.path,f])),observed=new Map(observations.actual.files.map(f=>[f.path,f]));
 let matchedSources=0;
 for(const f of candidate.values()){
  const o=observed.get(f.path),r=repo.get(f.path);
  let canonicalSourceMatch=false;if(r&&/\.(?:html?|m?js)$/.test(f.path)){const bytes=await readRegular(path.join(repository.root,f.path));canonicalSourceMatch=f.sha256===sha256(stampSource(bytes.toString(),path.extname(f.path).slice(1),request.sourceRevision));}if(f.sha256!==o?.sha256&&f.sha256!==r?.sha256&&!canonicalSourceMatch)issue('PROVENANCE_MISSING',f.path);else matchedSources++;
  // An observed version cannot be silently replaced with a historical version.
  if(o&&o.sha256!==f.sha256)issue('OBSERVED_VERSION_REPLACED',f.path);
 }
 const matrix=await jsonRef(request.matrix,'version matrix');
 exact(matrix,['schemaVersion','kind','sourceCommit','observation','rows'],'version matrix');
 if(matrix.schemaVersion!==1||matrix.kind!=='atlas-version-matrix'||matrix.sourceCommit!==request.sourceRevision||!text(matrix.observation)||!Array.isArray(matrix.rows))fail('CERT_SCHEMA','Invalid matrix');
 const rowKeys=['path','repositorySHA256','candidateSHA256','observedLiveSHA256','canonicalStampedSHA256','exactCanonicalStampMatch','repositoryBytes','observedBytes','sourceCommit','observedRevision','classification','authoritativeVersion','proposedDisposition','ownerDecisionRequired','renderedContentImpact','productImageImpact','newsCMSImpact','javascriptImpact','checkoutImpact','seoImpact','evidence','authorityLimitation'];
 let ownerReview={resolved:[],issues:[]};
 if(request.ownerDispositions!==undefined&&request.ownerDispositions!==null){const value=await jsonRef(request.ownerDispositions,'owner dispositions');ownerReview=verifyOwnerDispositions({value,digest:request.ownerDispositions.sha256,trustedDigests:trustedOwnerDispositions,rows:matrix.rows});for(const x of ownerReview.issues)issue(x.code,x.detail);}
 pathsUnique(matrix.rows.map(x=>x.path),'matrix paths');
 const differences=[...observed.values()].filter(f=>repo.has(f.path)&&repo.get(f.path).sha256!==f.sha256).map(f=>f.path).sort();
 if(!same([...matrix.rows.map(r=>r.path)].sort(),differences))issue('MATRIX_COVERAGE','Every actual repository/observed difference must be present exactly once');
 for(const row of matrix.rows){
  exact(row,rowKeys,'matrix row');const r=repo.get(row.path),o=observed.get(row.path),c=candidate.get(row.path);
  for(const k of ['repositorySHA256','candidateSHA256','observedLiveSHA256','canonicalStampedSHA256'])if(!isHash(row[k]))fail('CERT_SCHEMA','Invalid matrix hash');
  for(const k of ['exactCanonicalStampMatch','ownerDecisionRequired','renderedContentImpact','productImageImpact','newsCMSImpact','javascriptImpact','checkoutImpact','seoImpact'])if(typeof row[k]!=='boolean')fail('CERT_SCHEMA','Invalid matrix boolean');
  if(!Number.isSafeInteger(row.repositoryBytes)||!Number.isSafeInteger(row.observedBytes)||row.repositoryBytes<0||row.observedBytes<0||row.sourceCommit!==request.sourceRevision||!text(row.observedRevision)||!text(row.evidence)||!text(row.authoritativeVersion)||!text(row.authorityLimitation)||row.proposedDisposition!=='retain-observed-bytes; no source overwrite')fail('CERT_SCHEMA','Invalid matrix evidence');
  if(row.repositorySHA256!==r?.sha256||row.observedLiveSHA256!==o?.sha256||row.candidateSHA256!==c?.sha256||row.repositoryBytes!==r?.size||row.observedBytes!==o?.size)issue('MATRIX_BINDING',row.path);
  const raw=r?await readRegular(path.join(repository.root,row.path)):Buffer.alloc(0),stamped=stampSource(raw.toString(),path.extname(row.path).slice(1),request.sourceRevision),stampHash=sha256(stamped),exactStamp=stampHash===o?.sha256;
  if(row.canonicalStampedSHA256!==stampHash||row.exactCanonicalStampMatch!==exactStamp)issue('STAMP_EVIDENCE',row.path);
  if(!['expected-generated-difference','verified-live-version','verified-historical-source-version','recoverable-version-mismatch','requires-owner-review','unresolved-unsafe'].includes(row.classification))fail('CERT_SCHEMA','Unknown difference classification');
  if(row.classification==='expected-generated-difference'&&!exactStamp)issue('FALSE_GENERATED_CLAIM',row.path);
  const ownerResolved=ownerReview.resolved.includes(row.path);
  if(row.ownerDecisionRequired&&!ownerResolved||!['expected-generated-difference','verified-live-version'].includes(row.classification)&&!(row.classification==='requires-owner-review'&&ownerResolved))issue('UNRESOLVED_DIFFERENCE',row.path);
 }

 // Ed25519 public keys come only from the operator's separately pinned trust file.
 // No private key or self-declared signer in a reconstruction is accepted as trust.
 async function witness(ref,kind){
  if(ref===null){issue('WITNESS_MISSING',kind);return null;}
  const envelope=await jsonRef(ref,kind);exact(envelope,['payload','signer','signature'],'witness envelope');
  if(!text(envelope.signer)||typeof envelope.signature!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature))fail('CERT_SCHEMA','Malformed Ed25519 envelope');
  const pem=Object.hasOwn(trustedSigners,envelope.signer)?trustedSigners[envelope.signer]:null;
  if(!pem){issue('UNTRUSTED_WITNESS',kind);return null;}
  try{const key=createPublicKey(pem);if(key.asymmetricKeyType!=='ed25519'||!verify(null,Buffer.from(stable(envelope.payload)),key,Buffer.from(envelope.signature,'base64'))){issue('WITNESS_SIGNATURE',kind);return null;}}catch{issue('WITNESS_SIGNATURE',kind);return null;}
  return envelope.payload;
 }
 let deploymentReview=null,runtimeReview=null;
 if(request.deploymentInventory){deploymentReview=checkDeploymentInventory(await jsonRef(request.deploymentInventory,'deployment inventory'),baseline.pin,baseline.manifest.files);if(deploymentReview.versionMismatches.length)issue('DEPLOYMENT_VERSION_MISMATCH','Observed runtime/static bytes differ: '+deploymentReview.versionMismatches.join(','));}
 if(request.runtimeAcceptance){runtimeReview=checkRuntimeAcceptance(await jsonRef(request.runtimeAcceptance,'runtime acceptance'),baseline.pin);if(runtimeReview.fixtureFailures.length)issue('RUNTIME_FIXTURE_FAILURE',runtimeReview.fixtureFailures.join(','));if(!runtimeReview.browserAccepted)issue('RUNTIME_BROWSER_PENDING','Isolated real-browser evidence is incomplete');}
 const inventoryWitness=await witness(request.inventoryWitness,'inventory witness');
 if(inventoryWitness){
  exact(inventoryWitness,['schemaVersion','kind','baselineId','deploymentId','baselineManifestSHA256','referenceManifestSHA256','repositoryManifestSHA256','observationsManifestSHA256','requirementsSHA256','matrixSHA256',...(request.schemaVersion===2?['deploymentInventorySHA256','runtimeAcceptanceSHA256']:[])],'inventory witness payload');
  if(inventoryWitness.schemaVersion!==1||inventoryWitness.kind!=='atlas-inventory-witness'||!text(inventoryWitness.deploymentId)||inventoryWitness.baselineId!==request.baselineId||inventoryWitness.baselineManifestSHA256!==baseline.pin||inventoryWitness.referenceManifestSHA256!==reference?.pin||inventoryWitness.repositoryManifestSHA256!==repository.pin||inventoryWitness.observationsManifestSHA256!==observations.pin||inventoryWitness.requirementsSHA256!==request.requirements.sha256||inventoryWitness.matrixSHA256!==request.matrix.sha256)issue('WITNESS_BINDING','Inventory witness does not bind exact independent evidence');
  if(request.schemaVersion===2&&(inventoryWitness.deploymentInventorySHA256!==request.deploymentInventory.sha256||inventoryWitness.runtimeAcceptanceSHA256!==request.runtimeAcceptance.sha256))issue('WITNESS_BINDING','Version 2 witness does not bind exact deployment and runtime reports');
 }
 const functionalWitness=await witness(request.functionalWitness,'functional witness');
 if(functionalWitness){
  exact(functionalWitness,['schemaVersion','kind','baselineManifestSHA256','requirementsSHA256','checks'],'functional witness payload');
  if(functionalWitness.schemaVersion!==1||functionalWitness.kind!=='atlas-functional-witness'||functionalWitness.baselineManifestSHA256!==baseline.pin||functionalWitness.requirementsSHA256!==request.requirements.sha256||!Array.isArray(functionalWitness.checks))fail('CERT_SCHEMA','Invalid functional witness');
  const names=functionalWitness.checks.map(c=>c.name);if(!same([...names].sort(),[...CHECKS].sort()))issue('FUNCTIONAL_COVERAGE','All six independent functional reviews required exactly once');
  for(const c of functionalWitness.checks){exact(c,['name','status','evidence'],'functional check');if(!CHECKS.includes(c.name)||!['passed','failed','unknown'].includes(c.status))fail('CERT_SCHEMA','Unknown functional check/status');await jsonRef(c.evidence,'functional evidence');if(c.status!=='passed')issue('FUNCTIONAL_NOT_PASSED',c.name);}
 }
 // Re-read snapshots and pins after analysis: no mutable-evidence substitution.
 for(const [file,pin] of pins)await loadJSON(file,pin);
 for(const s of [baseline,repository,observations,rollback,reference].filter(Boolean))if(!sameFiles(s.actual,await inventory(s.root)))issue('EVIDENCE_CHANGED','Snapshot changed during certification');
 await loadJSON(requestFile,requestSHA256);
 const unique=[...new Map(issues.map(x=>[x.code+':'+x.detail,x])).values()].sort((a,b)=>(a.code+':'+a.detail).localeCompare(b.code+':'+b.detail,'en'));
 const failed=code=>unique.some(x=>code.includes(x.code));
 const verdict={schemaVersion:1,kind:'atlas-certification-verdict',baselineId:request.baselineId,requestSHA256,baselineManifestSHA256:baseline.pin,technicalStatus:unique.length?'blocked':'certified',properties:{referenceCompleteness:validation.valid&&!firstPartyMissing.size?'passed':'failed',authenticity:inventoryWitness&&reference&&!failed(['SNAPSHOT_INTEGRITY','PROVENANCE_MISSING','DEPENDENT_SOURCE','WITNESS_BINDING','WITNESS_SIGNATURE','UNTRUSTED_WITNESS'])?'witness-verified':'unknown',versionConsistency:reference&&!failed(['VERSION_SET_MISMATCH','MATRIX_COVERAGE','MATRIX_BINDING','UNRESOLVED_DIFFERENCE','STAMP_EVIDENCE','FALSE_GENERATED_CLAIM','OBSERVED_VERSION_REPLACED'])?'passed':'blocked',functionalReadiness:functionalWitness&&!failed(['FUNCTIONAL_COVERAGE','FUNCTIONAL_NOT_PASSED','DYNAMIC_DEPENDENCIES_UNKNOWN'])?'witness-verified':'unknown',publicationAuthorisation:'not-granted'},counts:{files:candidate.size,sourceMatchedFiles:matchedSources,differences:differences.length,missingFirstPartyAssets:firstPartyMissing.size},issues:unique,deployable:false,deploymentEnabled:false};
 verdict.properties.ownerContentDisposition=matrix.rows.some(r=>r.ownerDecisionRequired&&!ownerReview.resolved.includes(r.path))?'blocked':ownerReview.resolved.length?'verified-preservation':'not-required';verdict.counts.ownerDispositionsVerified=ownerReview.resolved.length;
 verdict.evidenceVersion=request.schemaVersion;verdict.properties.deploymentCompleteness=reference&&inventoryWitness&&!failed(['VERSION_SET_MISMATCH','WITNESS_BINDING','WITNESS_SIGNATURE','SNAPSHOT_INTEGRITY'])?'witness-verified':'unknown';verdict.properties.runtimeCompatibility=runtimeReview?.browserAccepted&&functionalWitness&&!failed(['WITNESS_BINDING','WITNESS_SIGNATURE','FUNCTIONAL_NOT_PASSED','RUNTIME_FIXTURE_FAILURE'])?'witness-verified':'pending';
 if(deploymentReview?.historicalPathSetExact!==undefined){verdict.properties.historicalPathInventory=deploymentReview.historicalPathSetExact?'log-verified':'blocked';verdict.counts.exactObservedBytes=deploymentReview.independentlyObserved;verdict.counts.unobservedDeployedBytes=deploymentReview.unobservedDeployedBytes.length;}
 verdict.conclusions={historicalReconstruction:{verdict:deploymentReview?.historicalPathSetExact?'Partially attested, publication blocked':'Unknown',authority:'Historical source/path membership and individual observed bytes are assessed separately from original payload authentication'},currentProductionBaseline:{verdict:'Unknown',authority:'This certificate request has no independently time-bound complete current-production observation; historical reconstruction cannot establish current live identity'}};
 if(!unique.length)issued.add(verdict);return verdict;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [requestFile,requestSHA256,trustFile,trustSHA256,ownerTrustFile,ownerTrustSHA256]=process.argv.slice(2);const trustedSigners=trustFile?(await loadJSON(trustFile,trustSHA256)).value:{};if(trustFile&&!isHash(trustSHA256))fail('CERT_PIN','Separate operator trust pin required');if(ownerTrustFile&&!isHash(ownerTrustSHA256))fail('CERT_PIN','Separate owner trust pin required');const trustedOwnerDispositions=ownerTrustFile?(await loadJSON(ownerTrustFile,ownerTrustSHA256)).value:[];const verdict=await certifyBaseline({requestFile,requestSHA256,trustedSigners,trustedOwnerDispositions});process.stdout.write(stable(verdict));if(verdict.technicalStatus!=='certified')process.exitCode=2;}catch(e){process.stdout.write(stable({technicalStatus:'blocked',deployable:false,errorCode:e.code||'CERT_IO'}));process.exitCode=1;}
}
