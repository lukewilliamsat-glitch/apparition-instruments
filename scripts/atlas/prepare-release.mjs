// Local, digest-pinned release input adapter. No fetch, generator, upload or deploy.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {record,fail,isHash,portablePath,loadJSON,stable,inventory} from './core.mjs';
import {validateSnapshot} from './validate-snapshot.mjs';
import {assembleStaticOverlay,verifyArtifact} from './assemble-static-overlay.mjs';
import {resolvePublicationMode} from './resolve-publication-mode.mjs';
import {requireReleaseReadiness} from './certify-baseline.mjs';

const classifications=['synthetic','partial-capture','candidate-reconstruction','authenticated-complete-production-artifact','owner-attested-reconstruction'];
const complete=classifications.slice(3);
const extensions=/\.(?:html?|css|m?js|json|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|txt|xml|pdf|wasm)$/i;
export async function prepareRelease({inputFile,inputSHA256,evidenceFile,evidenceSHA256,sourceRevision,context,purpose,output,certificate}){
 if(!isHash(inputSHA256)||!isHash(evidenceSHA256))fail('PIN_REQUIRED','Independent input and review SHA-256 pins required');
 if(!['validation-only','production-preflight'].includes(purpose))fail('PURPOSE_REQUIRED','Explicit validation-only or production-preflight purpose required');
 if(!/^[a-f0-9]{40}$/.test(sourceRevision||''))fail('SOURCE_REQUIRED','Trusted runner source revision required');
 record(context,['event','ref','mode','commitMessage'],'runner context');
 if(!['push','workflow_dispatch','schedule'].includes(context.event)||typeof context.ref!=='string'||typeof context.commitMessage!=='string'||context.commitMessage.length>65536||!['full-build','static-only','cms-only','audit-only'].includes(context.mode))fail('INVALID_CONTEXT','Explicit supported event/ref/mode and actual commit message (empty for non-push) required');
 // Live-data modes have no implementation here and never fall back to committed dist.
 if(['full-build','cms-only'].includes(context.mode))fail('LIVE_BUILD_UNAVAILABLE','Full/CMS builds require separately authorised live data; no fallback');
 if(context.event==='schedule'&&context.mode!=='audit-only')fail('SCHEDULE_NO_PUBLICATION','Schedules are audit-only');
 if(context.event==='push'&&(context.mode!=='static-only'||!/\[static-only\]/i.test(context.commitMessage)||/\[cms-only\]/i.test(context.commitMessage)))fail('MODE_MISMATCH','Actual push message must agree with the explicit static-only mode');
 if(context.event!=='push'&&context.commitMessage!=='')fail('INVALID_CONTEXT','Non-push context must not invent a commit message');
 const input=(await loadJSON(inputFile,inputSHA256)).value;
 record(input,['schemaVersion','kind','sourceRevision','baseline','overlay','protection','policy'],'release input');
 if(input.schemaVersion!==1||input.kind!=='atlas-release-input'||input.sourceRevision!==sourceRevision)fail('SOURCE_MISMATCH','Input is not bound to the verified source revision');
 for(const key of ['baseline','overlay'])record(input[key],['root','manifest','sha256'],key);
 for(const key of ['protection','policy'])record(input[key],['path','sha256'],key);
 for(const key of ['baseline','overlay','protection','policy'])if(!isHash(input[key].sha256))fail('PIN_REQUIRED','Every supplied manifest/policy requires a SHA-256 pin');
 const root=path.dirname(path.resolve(inputFile));
 const local=p=>path.join(root,portablePath(p));
 const baselineRoot=local(input.baseline.root),overlayRoot=local(input.overlay.root);
 const baselineManifest=(await loadJSON(local(input.baseline.manifest),input.baseline.sha256)).value;
 const evidence=(await loadJSON(evidenceFile,evidenceSHA256)).value;
 record(evidence,['schemaVersion','kind','classification','baselineManifestSHA256','sourceRevision','approvalReference'],'baseline evidence');
 if(evidence.schemaVersion!==1||evidence.kind!=='atlas-baseline-evidence'||!classifications.includes(evidence.classification)||evidence.baselineManifestSHA256!==input.baseline.sha256||evidence.sourceRevision!==sourceRevision||typeof evidence.approvalReference!=='string'||!evidence.approvalReference.trim()||evidence.approvalReference.length>2000)fail('EVIDENCE_BINDING','Independent pinned review does not bind this baseline/source');
 const baselineComplete=complete.includes(evidence.classification);
 if(purpose==='production-preflight'&&!baselineComplete)fail('BASELINE_NOT_ATTESTED','Synthetic, partial and unapproved reconstructions cannot enter production preflight');
 if(baselineComplete&&baselineManifest.provenance.type==='synthetic')fail('SYNTHETIC_ATTESTATION','Synthetic content cannot become production evidence');
 if(evidence.classification==='authenticated-complete-production-artifact'&&baselineManifest.provenance.type!=='supplied-artifact')fail('PROVENANCE_MISMATCH','An authenticated artifact needs artifact provenance');
 if(evidence.classification==='owner-attested-reconstruction'&&baselineManifest.provenance.type!=='public-reconstruction')fail('PROVENANCE_MISMATCH','A reconstruction needs reconstruction provenance');
 if(purpose==='production-preflight')requireReleaseReadiness(certificate,input.baseline.sha256);
 async function rejectExecutables(dir){
  const inv=await inventory(dir);
  for(const f of inv.files){
   const st=await fs.lstat(path.join(dir,f.path));
   if((st.mode&0o111)||(!extensions.test(f.path)&&f.path!=='.nojekyll'))fail('UNEXPECTED_EXECUTABLE','Executable or unsupported publication file: '+f.path);
  }
 }
 await rejectExecutables(baselineRoot);
 const validation=await validateSnapshot(baselineRoot,baselineManifest);
 if(!validation.valid)fail('INVALID_BASELINE','Pinned baseline failed byte/reference verification');
 const common={schemaVersion:1,productionPublicationAuthorised:false,deploymentEnabled:false,purpose,sourceRevision,baselineClassification:evidence.classification,baselineManifestSHA256:input.baseline.sha256,baselineCompleteness:baselineComplete?'externally-asserted-review-pin':'not-attested',evidenceSHA256,rollback:{baselineManifestSHA256:input.baseline.sha256,retainOriginalBaseline:true,automaticRollback:false}};
 if(context.mode==='audit-only')return {...common,status:'audit-passed',candidateCreated:false};
 // The existing resolver consumes only facts derived above and from verified assembly.
 // Synthetic fixtures can exercise assembly, but never receive a production decision.
 const decision=resolvePublicationMode({schemaVersion:1,event:context.event,ref:context.ref,commitMessage:context.commitMessage,dispatch:context.event==='workflow_dispatch'?{mode:'static-only'}:{},gates:{sourceRevisionVerified:true,baselineComplete,overlayAllowlisted:true,validationPassed:true,protectedFilesPreserved:true}});
 if(purpose==='production-preflight'&&(!decision.allowed||decision.mode!=='static-only'))fail('MODE_BLOCKED','Production preflight refused by mode resolver');
 if(purpose==='validation-only'&&context.ref!=='refs/heads/main')fail('REF_BLOCKED','Synthetic publication context must explicitly model main; it is never actual publication authority');
 const overlayManifest=(await loadJSON(local(input.overlay.manifest),input.overlay.sha256)).value;
 const protectedManifest=(await loadJSON(local(input.protection.path),input.protection.sha256)).value;
 const policy=(await loadJSON(local(input.policy.path),input.policy.sha256)).value;
 await rejectExecutables(overlayRoot);
 const assembled=await assembleStaticOverlay({baselineRoot,baselineManifest,overlayRoot,overlayManifest,protectedManifest,policy,output});
 const verified=await verifyArtifact(output,{expectedReceiptSHA256:assembled.receiptSHA256});
 return {...common,status:'candidate-verified',candidateCreated:true,modeDecision:decision,assembled,verified,publicationAllowed:false};
}

export async function releaseCLI(args){
 const keys=['input','input-sha256','evidence','evidence-sha256','source-revision','event','ref','mode','commit-message','purpose','output'],o={};
 for(let i=0;i<args.length;i+=2){const k=args[i]?.slice(2);if(!args[i]?.startsWith('--')||!keys.includes(k)||Object.hasOwn(o,k)||typeof args[i+1]!=='string'||args[i+1].startsWith('--'))fail('USAGE','Invalid or duplicate release option');o[k]=args[i+1];}
 for(const k of keys)if(!Object.hasOwn(o,k)||(k!=='commit-message'&&!o[k]))fail('USAGE','Missing --'+k);
 return prepareRelease({inputFile:o.input,inputSHA256:o['input-sha256'],evidenceFile:o.evidence,evidenceSHA256:o['evidence-sha256'],sourceRevision:o['source-revision'],context:{event:o.event,ref:o.ref,mode:o.mode,commitMessage:o['commit-message']},purpose:o.purpose,output:o.output});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.stdout.write(stable(await releaseCLI(process.argv.slice(2))));}
 catch(e){process.stdout.write(stable({schemaVersion:1,status:'blocked',productionPublicationAuthorised:false,deploymentEnabled:false,error:{code:e.code||'IO_ERROR',message:e.message}}));process.exitCode=1;}
}
