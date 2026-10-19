import * as fs from 'node:fs/promises';
import path from 'node:path';
import {fixture} from './fixture.mjs';
import {sha256,stable} from '../../scripts/atlas/core.mjs';
export const SOURCE='1111111111111111111111111111111111111111';
export async function releaseFixture(root){
 const f=await fixture(root);
 const input={schemaVersion:1,kind:'atlas-release-input',sourceRevision:SOURCE,baseline:{root:'baseline',manifest:'baseline-manifest.json',sha256:sha256(stable(f.baselineManifest))},overlay:{root:'overlay',manifest:'overlay-manifest.json',sha256:sha256(stable(f.overlayManifest))},protection:{path:'protection.json',sha256:sha256(stable(f.protectedManifest))},policy:{path:'policy.json',sha256:sha256(stable(f.policy))}};
 const evidence={schemaVersion:1,kind:'atlas-baseline-evidence',classification:'synthetic',baselineManifestSHA256:input.baseline.sha256,sourceRevision:SOURCE,approvalReference:'Offline synthetic test only; no production completeness claim'};
 const config={inputFile:path.join(root,'release-input.json'),evidenceFile:path.join(root,'evidence.json'),sourceRevision:SOURCE,context:{event:'workflow_dispatch',ref:'refs/heads/main',mode:'static-only',commitMessage:''},purpose:'validation-only',output:f.output};
 async function save(){await fs.writeFile(config.inputFile,stable(input));await fs.writeFile(config.evidenceFile,stable(evidence));config.inputSHA256=sha256(stable(input));config.evidenceSHA256=sha256(stable(evidence));}
 await save();return {f,input,evidence,config,save};
}
