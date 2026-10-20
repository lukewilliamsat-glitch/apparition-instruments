// Offline evidence analysis. Log path membership is NOT an artifact byte manifest.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadJSON,readRegular,sha256,stable,portablePath,pathsUnique,fail,isHash,inventory,sameFiles,record} from './core.mjs';
import {stampSource} from '../stamp-static-assets.mjs';
const same=(a,b)=>stable(a)===stable(b);
const gitHash=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
export function archiveListing({log,logSHA256,sourceRevision,run,job,repositoryId}){
 if(!isHash(logSHA256)||sha256(log)!==logSHA256)fail('DEPLOYMENT_LOG_PIN','Deployment log does not match independent pin');
 if(run.repository?.id!==repositoryId||run.head_sha!==sourceRevision||run.path!=='.github/workflows/static.yml'||run.status!=='completed'||run.conclusion!=='success'||run.run_attempt!==1||job.run_id!==run.id||job.conclusion!=='success')fail('DEPLOYMENT_ASSOCIATION','Unexpected repository/run/job association');
 for(const name of ['Checkout','Stamp first-party static asset URLs','Upload artifact','Deploy to GitHub Pages'])if(job.steps.filter(x=>x.name===name&&x.conclusion==='success').length!==1)fail('DEPLOYMENT_ASSOCIATION','Required deployment step missing');
 const text=Buffer.from(log).toString('utf8').replace(/^\uFEFF/,'').replace(/\u001b\[[0-9;]*m/g,''),lines=text.split(/\r?\n/).map(l=>l.replace(/^\d{4}-\d\d-\d\dT\S+Z /,''));
 if(!lines.includes(sourceRevision)||!lines.includes('Stamped 269 static files for '+sourceRevision))fail('DEPLOYMENT_ASSOCIATION','Checkout/stamp source not established');
 const starts=lines.flatMap((x,i)=>x==='##[group]Archive artifact'?[i]:[]);if(starts.length!==1)fail('ARCHIVE_LISTING','Missing or ambiguous tar listing');
 const end=lines.findIndex((x,i)=>i>starts[0]&&x.startsWith('##[endgroup]'));if(end<0)fail('ARCHIVE_LISTING','Truncated tar listing');
 const rows=lines.slice(starts[0]+1,end),files=[];for(const row of rows){if(!row.startsWith('./'))fail('ARCHIVE_LISTING','Unexpected archive output');if(row==='./'||row.endsWith('/'))continue;const name=portablePath(row.slice(2));files.push(name);}
 pathsUnique(files,'archived paths');if(!files.length)fail('ARCHIVE_LISTING','Empty tar listing');
 const digest=[...text.matchAll(/SHA256 digest of uploaded artifact zip is ([a-f0-9]{64})/g)],ids=[...text.matchAll(/Artifact github-pages\.zip successfully finalized\. Artifact ID (\d+)/g)];
 if(digest.length!==1||ids.length!==1||!text.includes('Found 1 artifact(s)')||!text.includes('"artifact_id": '+ids[0][1])||!text.includes('"pages_build_version": "'+sourceRevision+'"'))fail('ARCHIVE_ASSOCIATION','Upload/deployment binding missing or ambiguous');
 return {runId:run.id,jobId:job.id,repositoryId,sourceRevision,logSHA256,artifactId:Number(ids[0][1]),artifactZipSHA256:digest[0][1],paths:files.sort(),authority:'Authenticated GitHub job log; tar member names only; no per-member hashes or payload bytes'};
}
export function sourceMutationClass(p){
 if(p==='index.html')return 'search-verification-environment';
 if(/^products\/[^/]+\//.test(p)||p==='products/index.html'||/^components\/(?:index.html|[^/]+\/index.html)$/.test(p))return 'catalogue-generator-input';
 if(p.startsWith('news/')||p==='operations/snapshot.json')return 'operations-generator-input';
 if(p==='sitemap.xml'||p==='luthier-hub/discovery.json'||p==='luthier-hub/knowledge.json'||/^luthier-hub\/.+\/index.html$/.test(p)||p==='luthier-hub/index.html'||['circuit-forge/index.html','wiring-generator/index.html','treble-bleed-designer/index.html'].includes(p))return 'cms-generator-input';
 return 'source-or-canonical-stamp';
}
export async function independentAttestation({root,manifestFile,manifestSHA256,oldInventoryFile,oldInventorySHA256,previousManifestSHA256=manifestSHA256,repositoryRoot,sourceTree,listing,freshRoot=null,freshLedger=null}){
 const manifest=(await loadJSON(manifestFile,manifestSHA256)).value,actual=await inventory(root);if(!sameFiles(actual,{files:manifest.files}))fail('ATTESTATION_BASELINE','Candidate changed');
 const old=(await loadJSON(oldInventoryFile,oldInventorySHA256)).value;
 if(old.baselineManifestSHA256!==previousManifestSHA256)fail('ATTESTATION_BINDING','Prior evidence binds a different baseline');
 if(sourceTree.truncated!==false||!/^[a-f0-9]{40}$/.test(sourceTree.sha)||sourceTree.sha!==listing.sourceTreeSHA)fail('SOURCE_TREE_BINDING','Missing complete authenticated source tree');
 const tree=new Map(sourceTree.tree.filter(x=>x.type==='blob').map(x=>[x.path,x]));
 const oldRows=new Map(old.entries.map(x=>[x.path,x])),members=new Set(listing.paths),observations=new Map();
 if(freshLedger){
  if(freshLedger.origin!=='https://apparitioninstruments.co.uk'||freshLedger.budget.maxRequests!==16||freshLedger.records.length>16||freshLedger.bodyBytesRead>freshLedger.budget.maxBodyBytes)fail('OBSERVATION_LEDGER','Capture exceeds fixed scope');
  pathsUnique(freshLedger.records.map(x=>x.path),'fresh responses');
  for(const r of freshLedger.records){portablePath(r.path);if(r.url!==freshLedger.origin+'/'+r.path||r.method!=='GET'||r.redirects!==0||r.retries!==0)fail('OBSERVATION_LEDGER','Unexpected HTTP observation');if(r.status!==200||!r.sha256)continue;
   const b=await readRegular(path.join(freshRoot,r.path));if(sha256(b)!==r.sha256||b.length!==r.bytes)fail('OBSERVATION_BYTES','Captured bytes changed');observations.set(r.path,r);
  }
 }
 const entries=[];
 for(const f of manifest.files){
  const previous=oldRows.get(f.path),newObservation=observations.get(f.path);if(!previous||previous.sha256!==f.sha256&&(!newObservation||newObservation.sha256!==f.sha256||previous.observedSHA256))fail('ATTESTATION_BINDING','Only exact newly observed bytes may correct an unobserved reconstruction');
  let source=null;const member=tree.get('dist/'+f.path);
  if(member){const b=await readRegular(path.join(repositoryRoot,f.path));if(gitHash(b)!==member.sha||b.length!==member.size)fail('SOURCE_BLOB_BINDING','Source bytes do not match authenticated Git object: '+f.path);
   const transformed=/\.(?:html?|m?js)$/.test(f.path)?Buffer.from(stampSource(b.toString(),path.extname(f.path).slice(1),listing.sourceRevision)):b;
   source={blobSHA1:member.sha,sha256:sha256(b),canonicalSHA256:sha256(transformed),candidateMatchesCanonical:sha256(transformed)===f.sha256,mutationClass:sourceMutationClass(f.path)};
  }
  const current=observations.get(f.path),observed=current?.sha256??previous.observedSHA256,matched=observed===f.sha256,present=members.has(f.path);
  const evidenceType=observed?'directly-observed-live-bytes':source&&present?'deployment-associated-historical-source':source?'historical-source-without-deployment-proof':'reconstructed-candidate';
  entries.push({path:f.path,sha256:f.sha256,bytes:f.size,protectedContent:previous.protectedContent,evidenceType,evidenceExists:!!(observed||source||present),evidenceAuthoritative:matched,versionCompatible:observed?!matched?false:source?.candidateMatchesCanonical===false?'content-preservation-not-build-proof':true:source?.candidateMatchesCanonical?'source-derived-not-observed':null,sufficientForCertification:matched&&present,deploymentPathAuthenticated:present,deployedByteHashAuthenticated:false,observedSHA256:observed??null,observationSource:current?'authorisation-25-public-response':observed?previous.provenance:null,source,deployment:{runId:listing.runId,artifactId:listing.artifactId,sourceRevision:listing.sourceRevision},gaps:[...(!present?['not-in-upload-listing']:[]),...(!observed?['exact-deployed-bytes-unobserved']:!matched?['observed-byte-mismatch']:[]),...(source?.mutationClass!=='source-or-canonical-stamp'&&!observed?['generated-inputs-not-retained']:[])]});
 }
 const candidatePaths=entries.map(x=>x.path).sort(),pathSetExact=same(candidatePaths,listing.paths),extra=listing.paths.filter(x=>!actual.files.some(f=>f.path===x));
 const counts={files:entries.length,individuallyObserved:entries.filter(x=>x.observedSHA256).length,exactObservedMatches:entries.filter(x=>x.evidenceAuthoritative).length,authenticatedArtifactByteFiles:0,authenticatedDeploymentPaths:entries.filter(x=>x.deploymentPathAuthenticated).length,deploymentAssociatedSource:entries.filter(x=>x.source&&x.deploymentPathAuthenticated).length,sourceCanonicalMatches:entries.filter(x=>x.source?.candidateMatchesCanonical).length,unresolvedExactByteFiles:entries.filter(x=>!x.evidenceAuthoritative).length,byteMismatches:entries.filter(x=>x.observedSHA256&&x.observedSHA256!==x.sha256).length};
 return {schemaVersion:1,kind:'atlas-independent-attestation',baselineManifestSHA256:manifestSHA256,sourceRevision:listing.sourceRevision,evidence:{deploymentLogSHA256:listing.logSHA256,sourceTreeSHA1:sourceTree.sha,priorInventorySHA256:oldInventorySHA256,freshLedgerSHA256:freshLedger?sha256(stable(freshLedger)):null},archive:{runId:listing.runId,artifactId:listing.artifactId,artifactZipSHA256:listing.artifactZipSHA256,pathSetExact,unexpectedPaths:extra,payloadAvailable:false},entries,counts,classification:'coherent-reconstruction-with-authenticated-historical-path-membership',historicalDeploymentBytesAuthenticated:false,currentProductionBaselineVerified:false,complete:false};
}
export function checkIndependentAttestation(value,baselineSHA256,files){
 record(value,['schemaVersion','kind','baselineManifestSHA256','sourceRevision','evidence','archive','entries','counts','classification','historicalDeploymentBytesAuthenticated','currentProductionBaselineVerified','complete'],'independent attestation');
 if(value.kind!=='atlas-independent-attestation'||value.schemaVersion!==1||value.baselineManifestSHA256!==baselineSHA256||value.entries.length!==files.length)fail('ATTESTATION_BINDING','Attestation must cover exact baseline');
 pathsUnique(value.entries.map(x=>x.path),'attestation');const rows=new Map(value.entries.map(x=>[x.path,x]));
 for(const f of files){const r=rows.get(f.path);if(!r||r.sha256!==f.sha256||r.bytes!==f.size||!Array.isArray(r.gaps)||!Array.isArray(r.protectedContent)||!r.deployment||r.deployment.sourceRevision!==value.sourceRevision||!['directly-observed-live-bytes','deployment-associated-historical-source','historical-source-without-deployment-proof','reconstructed-candidate','authenticated-deployed-artifact','synthetic-fixture','unknown'].includes(r.evidenceType))fail('ATTESTATION_BINDING','Invalid per-file attestation');
  const matched=r.observedSHA256===r.sha256;if(r.evidenceAuthoritative!==matched||r.sufficientForCertification!==(matched&&r.deploymentPathAuthenticated)||r.deployedByteHashAuthenticated!==false)fail('ATTESTATION_ESCALATION','Path/source evidence cannot authenticate deployed payload bytes');
 }
 if(value.complete!==false||value.historicalDeploymentBytesAuthenticated!==false||value.currentProductionBaselineVerified!==false||value.archive.payloadAvailable!==false)fail('ATTESTATION_ESCALATION','This evidence cannot self-promote to complete production proof');
 return {pathSetExact:value.archive.pathSetExact===true&&rows.size===files.length,observed: value.entries.filter(x=>x.evidenceAuthoritative).length,missingBytePaths:value.entries.filter(x=>!x.evidenceAuthoritative).map(x=>x.path),mismatches:value.entries.filter(x=>x.observedSHA256&&x.observedSHA256!==x.sha256).map(x=>x.path),complete:false};
}
