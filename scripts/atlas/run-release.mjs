// End-to-end local preflight. No network, Supabase import, generator, upload or deployment.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {record,fail,isHash,portablePath,loadJSON,sha256,stable} from './core.mjs';
import {assessRecovery} from './assess-recovery.mjs';
import {prepareRelease} from './prepare-release.mjs';
import {verifyArtifact} from './assemble-static-overlay.mjs';
import {certifyBaseline,requireReleaseReadiness} from './certify-baseline.mjs';
export async function runRelease({planFile,planSHA256,sourceRevision,output,approvalFile,approvalSHA256,certificationRequestFile,certificationRequestSHA256,trustedSigners={},trustedOwnerDispositions=[]}){
 if(!isHash(planSHA256)||!/^[a-f0-9]{40}$/.test(sourceRevision||''))fail('RELEASE_PIN','Independent plan pin and trusted source revision required');
 const plan=(await loadJSON(planFile,planSHA256)).value;
 record(plan,['schemaVersion','kind','sourceRevision','mode','context','preparation','evidence','scope','provenance'],'release run');
 if(plan.schemaVersion!==1||plan.kind!=='atlas-release-run'||plan.sourceRevision!==sourceRevision)fail('RELEASE_VERSION','Run contract/source mismatch');
 if(!['static-only','validation-only','audit-only','full-build','cms-only'].includes(plan.mode))fail('RELEASE_MODE','Unknown mode; no fallback');
 if(['full-build','cms-only'].includes(plan.mode))fail('LIVE_BUILD_UNAVAILABLE','Live-data modes are unavailable in this isolated release path');
 if(plan.context?.mode!==(plan.mode==='audit-only'?'audit-only':'static-only'))fail('RELEASE_MODE','Run mode and preparation context disagree');
 const base=path.dirname(path.resolve(planFile));
 const input=async key=>{record(plan[key],['path','sha256'],key);if(!isHash(plan[key].sha256))fail('RELEASE_PIN','Every run input must be pinned');const file=path.join(base,portablePath(plan[key].path));return {file,pin:plan[key].sha256,value:(await loadJSON(file,plan[key].sha256)).value};};
 const prep=await input('preparation'),evidence=await input('evidence'),scope=await input('scope'),provenance=await input('provenance');
 const root=path.join(path.dirname(prep.file),portablePath(prep.value.baseline.root)),manifestFile=path.join(path.dirname(prep.file),portablePath(prep.value.baseline.manifest));
 const assessment=await assessRecovery({root,manifestFile,manifestSHA256:prep.value.baseline.sha256,scopeFile:scope.file,scopeSHA256:scope.pin,provenanceFile:provenance.file,provenanceSHA256:provenance.pin});
 if(assessment.classification==='invalid-evidence')fail('RELEASE_EVIDENCE','Integrity/provenance failure blocks staging');
 const assessmentSHA256=sha256(stable(assessment));
 let certificate=null;
 if(plan.mode==='static-only'){
  if(assessment.classification!=='complete-authenticated-artifact'&&assessment.classification!=='reconstructed-candidate-requiring-approval')fail('RELEASE_INCOMPLETE','Partial/unknown/synthetic evidence cannot enter static production preflight');
  if(assessment.unknownPaths.length||assessment.referenceClosure!=='passed'||assessment.versionCompatibility!=='externally-reviewed-assertion'||assessment.inventoryAuthority!=='owner-reviewed'||assessment.hasSynthetic)fail('RELEASE_INCOMPLETE','Independent inventory/version/coverage gates have not passed');
  if(!approvalFile||!isHash(approvalSHA256))fail('RELEASE_APPROVAL_REQUIRED','Separate owner-reviewed completeness approval pin required');
  const a=(await loadJSON(approvalFile,approvalSHA256)).value;record(a,['schemaVersion','kind','assessmentSHA256','manifestSHA256','sourceRevision','approvalReference'],'completeness approval');
  if(a.schemaVersion!==1||a.kind!=='atlas-completeness-approval'||a.assessmentSHA256!==assessmentSHA256||a.manifestSHA256!==assessment.manifestSHA256||a.sourceRevision!==sourceRevision||typeof a.approvalReference!=='string'||!a.approvalReference.trim())fail('RELEASE_APPROVAL_BINDING','Owner review does not bind exact assessment, baseline and source');
  if(!certificationRequestFile||!isHash(certificationRequestSHA256))fail('CERTIFICATION_REQUIRED','Production preflight requires independent technical evidence in addition to approval');
  certificate=await certifyBaseline({requestFile:certificationRequestFile,requestSHA256:certificationRequestSHA256,trustedSigners,trustedOwnerDispositions});requireReleaseReadiness(certificate,assessment.manifestSHA256);
 }
 const staging=await prepareRelease({inputFile:prep.file,inputSHA256:prep.pin,evidenceFile:evidence.file,evidenceSHA256:evidence.pin,sourceRevision,context:plan.context,purpose:plan.mode==='static-only'?'production-preflight':'validation-only',output,certificate});
 if(staging.candidateCreated)await verifyArtifact(output,{expectedReceiptSHA256:staging.assembled.receiptSHA256});
 // Recheck all pinned inputs and assessment after staging; no stale approval reuse.
 await loadJSON(planFile,planSHA256);for(const i of [prep,evidence,scope,provenance])await loadJSON(i.file,i.pin);
 if(plan.mode==='static-only')await loadJSON(approvalFile,approvalSHA256);
 const after=await assessRecovery({root,manifestFile,manifestSHA256:prep.value.baseline.sha256,scopeFile:scope.file,scopeSHA256:scope.pin,provenanceFile:provenance.file,provenanceSHA256:provenance.pin});if(sha256(stable(after))!==assessmentSHA256)fail('RELEASE_INPUT_CHANGED','Baseline/evidence changed during rehearsal');
 if(certificate){const rechecked=await certifyBaseline({requestFile:certificationRequestFile,requestSHA256:certificationRequestSHA256,trustedSigners,trustedOwnerDispositions});requireReleaseReadiness(rechecked,assessment.manifestSHA256);if(stable(certificate)!==stable(rechecked))fail('RELEASE_INPUT_CHANGED','Certification evidence changed during staging');}
 const releaseId=sha256(stable({planSHA256,sourceRevision,baselineManifestSHA256:assessment.manifestSHA256,receiptSHA256:staging.assembled?.receiptSHA256??null,certificationRequestSHA256:certificate?.requestSHA256??null}));
 return {schemaVersion:1,status:staging.candidateCreated?'rehearsal-verified':'audit-verified',releaseId,planSHA256,assessmentSHA256,assessment,certificate,staging,deployable:false,deploymentEnabled:false,productionPublicationAuthorised:false,rollback:{baselineId:assessment.manifestSHA256,baselineManifestSHA256:assessment.manifestSHA256,retainOriginalBaseline:true,automaticRollback:false},summary:'Integrity rehearsal only. No publication action is implemented.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [planFile,planSHA256,sourceRevision,output,approvalFile,approvalSHA256,certificationRequestFile,certificationRequestSHA256,trustFile,trustSHA256,ownerTrustFile,ownerTrustSHA256]=process.argv.slice(2);if(trustFile&&!isHash(trustSHA256))fail('CERT_PIN','Separate trust pin required');const trustedSigners=trustFile?(await loadJSON(trustFile,trustSHA256)).value:{};if(ownerTrustFile&&!isHash(ownerTrustSHA256))fail('CERT_PIN','Separate owner trust pin required');const trustedOwnerDispositions=ownerTrustFile?(await loadJSON(ownerTrustFile,ownerTrustSHA256)).value:[];const r=await runRelease({planFile,planSHA256,sourceRevision,output,approvalFile,approvalSHA256,certificationRequestFile,certificationRequestSHA256,trustedSigners,trustedOwnerDispositions});process.stdout.write(stable(r));}
 catch(e){process.stdout.write(stable({status:'blocked',deployable:false,deploymentEnabled:false,errorCode:e.code||'RELEASE_IO'}));process.exitCode=1;}
}
