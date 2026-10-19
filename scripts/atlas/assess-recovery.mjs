// Integrity/coverage assessment, never production approval. No network or generators.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {record,fail,isHash,portablePath,pathsUnique,loadJSON,stable,readRegular,sha256} from './core.mjs';
import {validateSnapshot} from './validate-snapshot.mjs';
export const CATEGORIES=['routes','protectedContent','productImages','news','cms','checkout','staticAssets'];
const ORIGINS=['verified-deployed-artifact','verified-historical-repository-object','publicly-observed-live-bytes','candidate-reconstructed-file','synthetic-fixture'];
export function gapInventory(validation,history={}){
 const grouped=new Map();for(const e of validation.errors||[]){if(!e.target)continue;let g=grouped.get(e.target);if(!g){g={path:e.target,occurrences:0,referrers:new Set()};grouped.set(e.target,g);}g.occurrences++;g.referrers.add(e.file);}
 const classify=p=>/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(p)?'image':/^(checkout|basket)\//.test(p)?'checkout':p.endsWith('.mjs')||p.endsWith('.js')?'script':p.endsWith('.css')?'stylesheet':/^news\//.test(p)?'news':/^luthier-hub\//.test(p)?'cms':'route-or-static';
 const gaps=[...grouped.values()].map(g=>({...g,referrers:[...g.referrers].sort(),category:classify(g.path),historicalCandidate:history[g.path]||null,historyStatus:Object.hasOwn(history,g.path)?history[g.path]?'identified-object':'absent-from-inspected-history':'not-inspected'})).sort((a,b)=>b.occurrences-a.occurrences||a.path.localeCompare(b.path));
 const external=[...new Set((validation.referenceReport?.external||[]).map(x=>x.reference))].sort();
 return {schemaVersion:1,referenceFailures:(validation.errors||[]).filter(e=>e.code==='BROKEN_REFERENCE').length,uniqueMissingPaths:gaps.length,duplicateReferenceFailures:gaps.reduce((n,g)=>n+Math.max(0,g.occurrences-1),0),gaps,externalReferences:external,dynamicOrUnproven:(validation.warnings||[]).filter(e=>/UNRESOLVED|RUNTIME/.test(e.code)),warning:'Static closure does not establish route inventory, historical compatibility or production authenticity.'};
}
export async function assessRecovery({root,manifestFile,manifestSHA256,scopeFile,scopeSHA256,provenanceFile,provenanceSHA256,artifactFile,artifactSHA256}){
 if(![manifestSHA256,scopeSHA256,provenanceSHA256].every(isHash))fail('ASSESSMENT_PIN','Independent manifest, scope and provenance pins required');
 const manifest=(await loadJSON(manifestFile,manifestSHA256)).value;
 const scope=(await loadJSON(scopeFile,scopeSHA256)).value;
 record(scope,['schemaVersion','kind','categories','emptyCategoryReasons','inventoryAuthority','inventoryReference','versionCompatibilityReviewed','unknownPaths','excludedPaths','artifactReview'],'coverage scope');
 if(scope.schemaVersion!==1||scope.kind!=='atlas-completeness-scope'||!['unattested','owner-reviewed'].includes(scope.inventoryAuthority)||typeof scope.inventoryReference!=='string'||typeof scope.versionCompatibilityReviewed!=='boolean')fail('ASSESSMENT_SCOPE','Invalid scope authority/version');
 record(scope.categories,CATEGORIES,'scope categories');record(scope.emptyCategoryReasons,CATEGORIES,'empty category reasons');
 for(const key of CATEGORIES){pathsUnique(scope.categories[key],key);if(!scope.categories[key].length&&(typeof scope.emptyCategoryReasons[key]!=='string'||!scope.emptyCategoryReasons[key].trim()))fail('ASSESSMENT_SCOPE','Empty category requires an explicit reason: '+key);}
 pathsUnique(scope.unknownPaths,'unknown paths');pathsUnique(scope.excludedPaths,'excluded paths');
 if(scope.inventoryAuthority==='owner-reviewed'&&!scope.inventoryReference.trim())fail('ASSESSMENT_SCOPE','External inventory review reference required');
 const provenance=(await loadJSON(provenanceFile,provenanceSHA256)).value;
 record(provenance,['schemaVersion','kind','files'],'provenance inventory');
 if(provenance.schemaVersion!==1||provenance.kind!=='atlas-recovery-provenance'||!Array.isArray(provenance.files))fail('ASSESSMENT_PROVENANCE','Invalid provenance inventory');
 pathsUnique(provenance.files.map(x=>x.path),'provenance files');
 const files=new Map(manifest.files?.map(f=>[f.path,f])||[]),origins=new Map();let badProvenance=false;
 for(const row of provenance.files){
  record(row,['path','sha256','sourceType','sourceId','revision'],'file provenance');portablePath(row.path);
  if(!isHash(row.sha256)||!ORIGINS.includes(row.sourceType)||typeof row.sourceId!=='string'||!row.sourceId||typeof row.revision!=='string'||!row.revision||!files.has(row.path)||files.get(row.path).sha256!==row.sha256)badProvenance=true;
  origins.set(row.path,row);
 }
 if(origins.size!==files.size||[...files.keys()].some(p=>!origins.has(p)))badProvenance=true;
 const validation=await validateSnapshot(root,manifest),gap=gapInventory(validation);
 const excluded=new Set(scope.excludedPaths);
 const coverage=Object.fromEntries(CATEGORIES.map(k=>[k,{required:scope.categories[k].length,present:scope.categories[k].filter(p=>files.has(p)).length,missing:scope.categories[k].filter(p=>!files.has(p)),excludedRequired:scope.categories[k].filter(p=>excluded.has(p))}]));
 if(scope.categories.routes.some(p=>!p.endsWith('.html'))||scope.categories.productImages.some(p=>!/\.(png|jpe?g|webp|gif|svg)$/i.test(p)))fail('ASSESSMENT_SCOPE','Route/image category has an unexpected file type');
 const unscopedProtectedPaths=manifest.files.map(f=>f.path).filter(p=>!scope.categories.protectedContent.includes(p));
 const unknown=[...new Set([...scope.unknownPaths,...gap.gaps.map(g=>g.path),...unscopedProtectedPaths])].sort();
 const hasSynthetic=provenance.files.some(x=>x.sourceType==='synthetic-fixture');
 const integrityFailed=validation.errors.some(e=>e.code!=='BROKEN_REFERENCE');
 const coverageComplete=Object.values(coverage).every(x=>!x.missing.length&&!x.excludedRequired.length)&&unknown.length===0;
 const allArtifact=provenance.files.length>0&&provenance.files.every(x=>x.sourceType==='verified-deployed-artifact');
 let artifactReviewed=false;
 if(scope.artifactReview!==null){
  record(scope.artifactReview,['manifestSHA256','archiveSHA256','artifactId','revision','reviewReference'],'artifact review');const a=scope.artifactReview;
  artifactReviewed=isHash(a.archiveSHA256)&&a.manifestSHA256===manifestSHA256&&typeof a.artifactId==='string'&&!!a.artifactId&&typeof a.reviewReference==='string'&&!!a.reviewReference&&typeof a.revision==='string'&&!!a.revision&&provenance.files.every(x=>x.sourceId===a.artifactId&&x.revision===a.revision);
  if(artifactReviewed)artifactReviewed=!!artifactFile&&isHash(artifactSHA256)&&artifactSHA256===a.archiveSHA256&&sha256(await readRegular(artifactFile,512*1024*1024))===artifactSHA256;
 }
 let classification='unknown';
 if(badProvenance||integrityFailed)classification='invalid-evidence';
 else if(!coverageComplete||!validation.valid||hasSynthetic)classification='incomplete-partial-capture';
 else if(scope.inventoryAuthority!=='owner-reviewed'||!scope.versionCompatibilityReviewed)classification='reconstructed-candidate-requiring-approval';
 else if(allArtifact&&artifactReviewed)classification='complete-authenticated-artifact';
 else classification='reconstructed-candidate-requiring-approval';
 return {schemaVersion:1,kind:'atlas-recovery-assessment',classification,deployable:false,productionPublicationAuthorised:false,manifestSHA256,scopeSHA256,provenanceSHA256,integrity:integrityFailed?'failed':'passed',referenceClosure:validation.valid?'passed':'failed',coverage,unscopedProtectedPaths,unknownPaths:unknown,provenanceValid:!badProvenance,hasSynthetic,versionCompatibility:scope.versionCompatibilityReviewed?'externally-reviewed-assertion':'unverified',inventoryAuthority:scope.inventoryAuthority,artifactReviewAccepted:artifactReviewed&&allArtifact,gaps:gap,approvalRequired:true,trustBoundary:'External review records and pins require independent approval. This tool checks their bindings and archive bytes; it does not authenticate GitHub, verify extraction mapping, discover every route or grant deployment authority.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [root,m,mh,s,sh,p,ph]=process.argv.slice(2);const r=await assessRecovery({root,manifestFile:m,manifestSHA256:mh,scopeFile:s,scopeSHA256:sh,provenanceFile:p,provenanceSHA256:ph});process.stdout.write(stable(r));if(['invalid-evidence','unknown'].includes(r.classification))process.exitCode=1;}
 catch(e){process.stdout.write(stable({classification:'invalid-evidence',deployable:false,errorCode:e.code||'ASSESSMENT_IO'}));process.exitCode=1;}
}
