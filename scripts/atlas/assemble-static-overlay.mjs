import * as fs from 'node:fs/promises';
import path from 'node:path';
import {record,fail,isHash,sha256,stable,safeRoot,readRegular,inventory,sameFiles,makeManifest,manifestContract,pathsUnique} from './core.mjs';
import {htmlTokens,textUTF8} from './references.mjs';
import {validateSnapshot} from './validate-snapshot.mjs';
export const SPECTRE_PATHS=Object.freeze(['index.html','landing-v02/index.html','landing-v02/spectre.css','landing-v02/spectre.mjs','landing-v02/state.mjs']);
const LINK='<a href="/landing-v02/">Preview Homepage V02 →</a>';
const ANCHOR='<div class="footer-links">';
export function footerInsertion(baseline){
 const s=textUTF8(baseline),tokens=htmlTokens(s),footers=tokens.filter(t=>t.name==='footer'),anchors=tokens.filter(t=>!t.closing&&t.name==='div'&&(t.attrs.class||'').split(/\s+/).includes('footer-links'));
 if(footers.length!==2||footers[0].closing||!footers[1].closing||anchors.length!==1)fail('FOOTER_AMBIGUOUS','Exactly one real footer and footer-links container required');
 const a=anchors[0];let depth=1,closed=false;for(const t of tokens.filter(t=>t.start>=a.end&&t.start<footers[1].start)){if(t.name==='div'){depth+=t.closing?-1:1;if(depth===0){closed=true;break;}}}if(!closed)fail('FOOTER_ANCHOR','Footer-links container has no closing div');if(a.raw!==ANCHOR||a.start<footers[0].end||a.end>footers[1].start||s.split(ANCHOR).length!==2)fail('FOOTER_ANCHOR','Expected unique exact footer anchor absent or ambiguous');
 if(s.includes('/landing-v02/')||s.includes('Preview Homepage V02'))fail('FOOTER_ALREADY_LINKED','Homepage already links to V02; no duplicate insertion permitted');
 return Buffer.from(s.slice(0,a.end)+LINK+s.slice(a.end),'utf8');
}
export function protectedContract(p,baseline){
 record(p,['schemaVersion','kind','files'],'protected manifest');if(p.schemaVersion!==1||p.kind!=='atlas-protected-baseline'||!Array.isArray(p.files))fail('INVALID_PROTECTION','Invalid protected manifest');
 for(const f of p.files)record(f,['path','size','sha256'],'protected file');pathsUnique(p.files.map(f=>f.path),'protected files');
 for(const f of p.files){record(f,['path','size','sha256'],'protected file');if(!isHash(f.sha256)||!Number.isSafeInteger(f.size)||f.size<0)fail('INVALID_PROTECTION','Invalid protected digest/size');}
 const triples=files=>files.map(({path,size,sha256})=>({path,size,sha256})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(stable(triples(p.files))!==stable(triples(baseline.files)))fail('PROTECTION_INCOMPLETE','Every baseline file must have matching protected hash and size');return p;
}
export function overlayPolicy(p,baseline,overlay,protection){
 record(p,['schemaVersion','kind','allowlist','baselineManifestSHA256','overlayManifestSHA256','protectedManifestSHA256','homepageBaselineSHA256'],'overlay policy');
 if(p.schemaVersion!==1||p.kind!=='spectre-v02-footer-v1')fail('INVALID_POLICY','Only narrow Spectre footer policy v1 is supported');
 pathsUnique(p.allowlist,'allowlist');
 if(stable([...p.allowlist].sort())!==stable([...SPECTRE_PATHS].sort()))fail('INVALID_ALLOWLIST','Exactly the five Spectre paths are supported; no wildcards or deletion');
 for(const [key,value] of [['baselineManifestSHA256',baseline],['overlayManifestSHA256',overlay],['protectedManifestSHA256',protection]])if(!isHash(p[key])||sha256(stable(value))!==p[key])fail('POLICY_BINDING','Policy digest does not bind supplied '+key);
 const home=baseline.files.find(f=>f.path==='index.html');if(!home||!isHash(p.homepageBaselineSHA256)||p.homepageBaselineSHA256!==home.sha256)fail('POLICY_BINDING','Homepage baseline digest mismatch');
 if(stable(overlay.files.map(f=>f.path).sort())!==stable([...SPECTRE_PATHS].sort()))fail('OVERLAY_PATHS','Overlay must contain exactly the five approved paths');
 for(const f of overlay.files)if(f.path!=='index.html'&&baseline.files.some(b=>b.path===f.path))fail('BASELINE_REPLACEMENT','Dedicated preview path already exists; this policy permits initial additions only');
 return p;
}
export const makeProtection=baseline=>({schemaVersion:1,kind:'atlas-protected-baseline',files:baseline.files.map(({path,size,sha256})=>({path,size,sha256}))});
export const makePolicy=(baseline,overlay,protection)=>({schemaVersion:1,kind:'spectre-v02-footer-v1',allowlist:[...SPECTRE_PATHS],baselineManifestSHA256:sha256(stable(baseline)),overlayManifestSHA256:sha256(stable(overlay)),protectedManifestSHA256:sha256(stable(protection)),homepageBaselineSHA256:baseline.files.find(f=>f.path==='index.html')?.sha256});
const overlaps=(a,b)=>a===b||a.startsWith(b+path.sep)||b.startsWith(a+path.sep);
export async function assembleStaticOverlay({baselineRoot,baselineManifest,overlayRoot,overlayManifest,policy,protectedManifest,output,signal,onPhase=async()=>{}}){
 const base=await safeRoot(baselineRoot),over=await safeRoot(overlayRoot),dest=path.resolve(output);await safeRoot(path.dirname(dest));
 if([base,over].some(r=>overlaps(r,dest))||overlaps(base,over))fail('ROOT_OVERLAP','Baseline, overlay and artifact roots must be disjoint');
 const abort=()=>{if(signal?.aborted)fail('ABORTED','Assembly cancelled');};abort();
 manifestContract(baselineManifest);manifestContract(overlayManifest);protectedContract(protectedManifest,baselineManifest);overlayPolicy(policy,baselineManifest,overlayManifest,protectedManifest);
 const before=await validateSnapshot(base,baselineManifest);if(!before.valid)fail('INVALID_BASELINE','Baseline integrity/reference validation failed');
 // Overlay is not a stand-alone website; references are checked against the final union.
 const overlayBefore=await inventory(over,{manifestPaths:overlayManifest.files.map(f=>f.path)});
 const expectedOver={files:overlayManifest.files};if(!sameFiles(overlayBefore,expectedOver))fail('INVALID_OVERLAY','Overlay does not match its separately pinned file manifest');
 const preview=htmlTokens(textUTF8(await readRegular(path.join(over,'landing-v02/index.html'))));if(!preview.some(t=>t.name==='meta'&&t.attrs.name?.toLowerCase()==='robots'&&t.attrs.content?.toLowerCase().split(/[\s,]+/).includes('noindex'))||!preview.some(t=>t.name==='a'&&!t.closing&&t.attrs.href==='/'))fail('PREVIEW_SEO','Preview needs noindex and an explicit root return link');
 const expectedHome=footerInsertion(await readRegular(path.join(base,'index.html')));
 if(!(await readRegular(path.join(over,'index.html'))).equals(expectedHome))fail('HOMEPAGE_SCOPE','Homepage differs from exact footer-only transformation');
 await onPhase('inputs-validated',{baseline:base,overlay:over});abort();
 let stage=null,reserved=null,committed=false;
 try{
  try{await fs.mkdir(dest,{mode:0o700});reserved=await fs.lstat(dest,{bigint:true});}catch(e){if(e.code==='EEXIST')fail('OUTPUT_EXISTS','Output already exists; never overwritten');throw e;}
  stage=await fs.mkdtemp(path.join(path.dirname(dest),'.atlas-stage-'));await fs.mkdir(path.join(stage,'site'),{mode:0o700});
  const copy=async(root,f)=>{abort();const b=await readRegular(path.join(root,...f.path.split('/')));if(sha256(b)!==f.sha256||b.length!==f.size)fail('INPUT_CHANGED','Input changed before copy');const p=path.join(stage,'site',...f.path.split('/'));await fs.mkdir(path.dirname(p),{recursive:true,mode:0o700});await fs.writeFile(p,b,{flag:'wx',mode:0o644});};
  for(const f of before.inventory.files)await copy(base,f);
  await onPhase('baseline-copied',{stage});abort();
  for(const f of overlayBefore.files){
   if(f.path==='index.html'){const current=await readRegular(path.join(stage,'site','index.html'));if(sha256(current)!==policy.homepageBaselineSHA256)fail('STAGING_CHANGED','Staged homepage changed');await fs.unlink(path.join(stage,'site','index.html'));}
   await copy(over,f);
  }
  await onPhase('overlay-applied',{stage});abort();
  const union=new Map(baselineManifest.files.map(f=>[f.path,{...f}]));for(const f of overlayManifest.files)union.set(f.path,{...f});
  const candidateManifest={...baselineManifest,files:[...union.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),protectedPaths:[...union.keys()].sort(),criticalRoutes:[...new Set([...baselineManifest.criticalRoutes,'landing-v02/index.html'])].sort(),criticalAssets:[...new Set([...baselineManifest.criticalAssets,...SPECTRE_PATHS.filter(p=>!p.endsWith('.html'))])].sort()};
  const preserved=protectedManifest.files.map(f=>({path:f.path,beforeSHA256:f.sha256,afterSHA256:union.get(f.path).sha256,status:f.path==='index.html'?'approved-footer-insertion':'unchanged'}));
  for(const f of preserved)if(f.path!=='index.html'&&f.beforeSHA256!==f.afterSHA256)fail('PROTECTED_MISMATCH','Protected file changed');
  await onPhase('before-final-validation',{stage});abort();
  const validation=await validateSnapshot(path.join(stage,'site'),candidateManifest);if(!validation.valid)fail('INVALID_CANDIDATE','Assembled output integrity/reference validation failed');
  if(!(await readRegular(path.join(stage,'site','index.html'))).equals(expectedHome))fail('HOMEPAGE_SCOPE','Staged homepage was modified');
  const baseAfter=await validateSnapshot(base,baselineManifest);if(!baseAfter.valid||!sameFiles(before.inventory,baseAfter.inventory))fail('BASELINE_CHANGED','Baseline changed during assembly');
  const overAfter=await inventory(over);if(!sameFiles(overlayBefore,overAfter))fail('OVERLAY_CHANGED','Overlay changed during assembly');
  const receipt={schemaVersion:1,kind:'atlas-local-candidate',ready:true,productionPublicationAuthorised:false,productionCompleteness:'not-attested',baselineManifestSHA256:sha256(stable(baselineManifest)),overlayManifestSHA256:sha256(stable(overlayManifest)),policySHA256:sha256(stable(policy)),protectedManifestSHA256:sha256(stable(protectedManifest)),candidateManifestSHA256:sha256(stable(candidateManifest)),validationSHA256:sha256(stable(validation)),preservationSHA256:sha256(stable(preserved)),siteRoot:'site',files:candidateManifest.files.length,homepageException:'exact-spectre-v02-footer-insertion-v1'};
  for(const [name,value] of [['manifest.json',candidateManifest],['validation.json',validation],['preservation.json',preserved],['READY.json',receipt]])await fs.writeFile(path.join(stage,name),stable(value),{flag:'wx',mode:0o600});
  // The reserved output directory was empty/private from the start. A concurrent Atlas
  // writer gets EEXIST. Rename commits complete site + receipts as one directory.
  const now=await fs.lstat(dest,{bigint:true});if(now.dev!==reserved.dev||now.ino!==reserved.ino||(await fs.readdir(dest)).length)fail('OUTPUT_CHANGED','Output reservation was replaced or populated');abort();
  await fs.rename(stage,dest);committed=true;stage=null;
  return {schemaVersion:1,status:'ready',ready:true,productionPublicationAuthorised:false,productionCompleteness:'not-attested',receiptSHA256:sha256(stable(receipt)),candidateManifestSHA256:receipt.candidateManifestSHA256,protectedUnchanged:preserved.filter(x=>x.status==='unchanged').length,approvedExceptions:1,files:receipt.files};
 }finally{
  if(stage)await fs.rm(stage,{recursive:true,force:true});
  if(!committed&&reserved){try{const s=await fs.lstat(dest,{bigint:true});if(s.dev===reserved.dev&&s.ino===reserved.ino&&(await fs.readdir(dest)).length===0)await fs.rmdir(dest);}catch(e){if(e.code!=='ENOENT')throw e;}}
 }
}
export async function verifyArtifact(root,{expectedReceiptSHA256}={}){
 const abs=await safeRoot(root);if(!isHash(expectedReceiptSHA256))fail('RECEIPT_PIN_REQUIRED','Independent receipt SHA-256 required');
 const {loadJSON}=await import('./core.mjs');const r=(await loadJSON(path.join(abs,'READY.json'),expectedReceiptSHA256)).value;
 record(r,['schemaVersion','kind','ready','productionPublicationAuthorised','productionCompleteness','baselineManifestSHA256','overlayManifestSHA256','policySHA256','protectedManifestSHA256','candidateManifestSHA256','validationSHA256','preservationSHA256','siteRoot','files','homepageException'],'receipt');
 if(r.schemaVersion!==1||r.kind!=='atlas-local-candidate'||r.ready!==true||r.siteRoot!=='site'||r.productionPublicationAuthorised!==false||r.productionCompleteness!=='not-attested'||r.homepageException!=='exact-spectre-v02-footer-insertion-v1'||!Number.isSafeInteger(r.files)||r.files<1||!['baselineManifestSHA256','overlayManifestSHA256','policySHA256','protectedManifestSHA256','candidateManifestSHA256','validationSHA256','preservationSHA256'].every(k=>isHash(r[k])))fail('INVALID_RECEIPT','Invalid receipt');
 const m=(await loadJSON(path.join(abs,'manifest.json'),r.candidateManifestSHA256)).value;await loadJSON(path.join(abs,'validation.json'),r.validationSHA256);await loadJSON(path.join(abs,'preservation.json'),r.preservationSHA256);
 const expected=['READY.json','manifest.json','preservation.json','site','validation.json'];if(stable((await fs.readdir(abs)).sort())!==stable(expected.sort()))fail('UNEXPECTED_ARTIFACT_FILE','Unexpected artifact container entry');
 const v=await validateSnapshot(path.join(abs,'site'),m);if(r.files!==m.files.length)fail('INVALID_RECEIPT','Receipt file count mismatch');if(!v.valid)fail('ARTIFACT_CHANGED','Candidate no longer matches pinned manifest');return {schemaVersion:1,valid:true,ready:true,productionPublicationAuthorised:false,files:m.files.length,productionCompleteness:'not-attested'};
}
