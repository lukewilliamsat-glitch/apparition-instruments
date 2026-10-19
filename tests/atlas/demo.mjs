import * as fs from 'node:fs/promises';
import path from 'node:path';
import {fixture,modeInput,writeFiles} from './fixture.mjs';
import {validateSnapshot} from '../../scripts/atlas/validate-snapshot.mjs';
import {assembleStaticOverlay,verifyArtifact} from '../../scripts/atlas/assemble-static-overlay.mjs';
import {resolvePublicationMode} from '../../scripts/atlas/resolve-publication-mode.mjs';
import {stable,sha256} from '../../scripts/atlas/core.mjs';
import assert from 'node:assert/strict';
const out=path.resolve(process.argv[2]);await fs.mkdir(out,{mode:0o700});
const f=await fixture(out),baseline=await validateSnapshot(f.baselineRoot,f.baselineManifest);assert.equal(baseline.valid,true);
await fs.writeFile(path.join(out,'baseline-validation.json'),stable(baseline));
const decision=resolvePublicationMode(modeInput());await fs.writeFile(path.join(out,'synthetic-mode-input.json'),stable(modeInput()));await fs.writeFile(path.join(out,'synthetic-decision.json'),stable(decision));
const result=await assembleStaticOverlay(f);const check=await verifyArtifact(f.output,{expectedReceiptSHA256:result.receiptSHA256});
const rejection=[];
for(const p of ['products/cde-synthetic/index.html','products/cde-synthetic/image.png','news/synthetic-notice/index.html','checkout/index.html','circuit-forge/app.mjs','surprise.sh']){
 const ov=path.join(out,'rejected-overlay');await fs.cp(f.overlayRoot,ov,{recursive:true,errorOnExist:true,force:false});await writeFiles(ov,{[p]:'unauthorised synthetic bytes'});
 try{await assembleStaticOverlay({...f,overlayRoot:ov,output:path.join(out,'must-not-exist')});throw Error('Unauthorised overlay accepted');}catch(e){assert.equal(e.code,'INVALID_OVERLAY');rejection.push({path:p,rejected:true,code:e.code});}finally{await fs.rm(ov,{recursive:true,force:true});}
}
const report={kind:'synthetic-only-demonstration',actualSpectreSourceUsed:false,productionContentUsed:false,baselineFiles:f.baselineManifest.files.length,candidateFiles:result.files,protectedFilesUnchanged:result.protectedUnchanged,homepageException:'Exact insertion only; baseline byte hash bound by policy',mode:decision.mode,decisionNotProductionAuthority:true,result,verify:check,rejected:rejection,baselinePreserved:(await validateSnapshot(f.baselineRoot,f.baselineManifest)).valid,readyReceiptSHA256:result.receiptSHA256};
await fs.writeFile(path.join(out,'demo-report.json'),stable(report));console.log(stable(report));
