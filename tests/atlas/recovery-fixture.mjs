import * as fs from 'node:fs/promises';
import path from 'node:path';
import {releaseFixture,SOURCE} from './release-fixture.mjs';
import {stable,sha256} from '../../scripts/atlas/core.mjs';
import {makeProtection,makePolicy} from '../../scripts/atlas/assemble-static-overlay.mjs';
export async function recoveryFixture(root){
 const x=await releaseFixture(root),files=x.f.baselineManifest.files;
 const scope={schemaVersion:1,kind:'atlas-completeness-scope',categories:{routes:['index.html','checkout/index.html'],protectedContent:files.map(f=>f.path),productImages:['products/cde-synthetic/image.png'],news:['news/synthetic-notice/index.html'],cms:['news/synthetic-notice/index.html'],checkout:['checkout/index.html','checkout/app.mjs'],staticAssets:['style.css','assets/grid.svg']},emptyCategoryReasons:{},inventoryAuthority:'unattested',inventoryReference:'Explicit synthetic scope only',versionCompatibilityReviewed:false,unknownPaths:[],excludedPaths:[],artifactReview:null};
 const provenance={schemaVersion:1,kind:'atlas-recovery-provenance',files:files.map(f=>({path:f.path,sha256:f.sha256,sourceType:'synthetic-fixture',sourceId:'fixture/'+f.path,revision:'synthetic-v1'}))};
 const plan={schemaVersion:1,kind:'atlas-release-run',sourceRevision:SOURCE,mode:'validation-only',context:{...x.config.context},preparation:{path:'release-input.json',sha256:x.config.inputSHA256},evidence:{path:'evidence.json',sha256:x.config.evidenceSHA256},scope:{path:'scope.json',sha256:''},provenance:{path:'provenance.json',sha256:''}};
 const assess={root:x.f.baselineRoot,manifestFile:path.join(root,'baseline-manifest.json'),manifestSHA256:x.input.baseline.sha256,scopeFile:path.join(root,'scope.json'),scopeSHA256:'',provenanceFile:path.join(root,'provenance.json'),provenanceSHA256:''};
 const run={planFile:path.join(root,'run-plan.json'),planSHA256:'',sourceRevision:SOURCE,output:x.config.output};
 async function save(){await x.save();plan.preparation.sha256=x.config.inputSHA256;plan.evidence.sha256=x.config.evidenceSHA256;assess.manifestSHA256=x.input.baseline.sha256;for(const [file,value,key] of [[assess.scopeFile,scope,'scope'],[assess.provenanceFile,provenance,'provenance']]){await fs.writeFile(file,stable(value));assess[key+'SHA256']=sha256(stable(value));plan[key].sha256=assess[key+'SHA256'];}await fs.writeFile(run.planFile,stable(plan));run.planSHA256=sha256(stable(plan));}
 async function mockReviewedReconstruction(){
  // Simulated review for contract testing only; never an actual completeness decision.
  x.f.baselineManifest.provenance={type:'public-reconstruction',description:'Mock reviewed reconstruction for synthetic contract testing'};
  x.f.protectedManifest=makeProtection(x.f.baselineManifest);x.f.policy=makePolicy(x.f.baselineManifest,x.f.overlayManifest,x.f.protectedManifest);
  for(const [name,value,key] of [['baseline-manifest.json',x.f.baselineManifest,'baseline'],['protection.json',x.f.protectedManifest,'protection'],['policy.json',x.f.policy,'policy']]){await fs.writeFile(path.join(root,name),stable(value));x.input[key].sha256=sha256(stable(value));}
  x.evidence.classification='owner-attested-reconstruction';x.evidence.baselineManifestSHA256=x.input.baseline.sha256;
  provenance.files.forEach(f=>{f.sourceType='verified-historical-repository-object';f.revision='mock-git-revision';});scope.inventoryAuthority='owner-reviewed';scope.inventoryReference='Mock review only';scope.versionCompatibilityReviewed=true;await save();
 }
 await save();return {x,scope,provenance,plan,assess,run,save,mockReviewedReconstruction};
}
