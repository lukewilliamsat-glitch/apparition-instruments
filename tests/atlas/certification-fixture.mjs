// Synthetic cryptographic contract fixture only. No production attestation/signing key.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {releaseFixture} from './release-fixture.mjs';
import {makeManifest,sha256,stable} from '../../scripts/atlas/core.mjs';
import {makeProtection,makePolicy} from '../../scripts/atlas/assemble-static-overlay.mjs';
import {CATEGORIES,CHECKS} from '../../scripts/atlas/certify-baseline.mjs';
import {RUNTIME_CHECKS} from '../../scripts/atlas/readiness-evidence.mjs';
import {stampSource} from '../../scripts/stamp-static-assets.mjs';
export async function certificationFixture(root){
 const x=await releaseFixture(root);
 x.f.baselineManifest.provenance={type:'supplied-artifact',description:'Synthetic mock deployment for witness contract testing ONLY'};
 x.f.protectedManifest=makeProtection(x.f.baselineManifest);x.f.policy=makePolicy(x.f.baselineManifest,x.f.overlayManifest,x.f.protectedManifest);
 for(const [n,v,k]of [['baseline-manifest.json',x.f.baselineManifest,'baseline'],['protection.json',x.f.protectedManifest,'protection'],['policy.json',x.f.policy,'policy']]){await fs.writeFile(path.join(root,n),stable(v));x.input[k].sha256=sha256(stable(v));}
 x.evidence.classification='authenticated-complete-production-artifact';x.evidence.baselineManifestSHA256=x.input.baseline.sha256;await x.save();
 const keys=generateKeyPairSync('ed25519'),trustedSigners={'fixture-reviewer':keys.publicKey.export({type:'spki',format:'pem'})};
 const request={schemaVersion:2,kind:'atlas-baseline-certification',baselineId:'synthetic-contract-not-production',sourceRevision:x.config.sourceRevision,baseline:{...x.input.baseline},repository:null,observations:null,reference:null,rollback:null,requirements:null,matrix:null,inventoryWitness:null,functionalWitness:null};
 for(const key of ['repository','observations','reference','rollback']){await fs.cp(x.f.baselineRoot,path.join(root,key),{recursive:true});const m=await makeManifest(path.join(root,key),{provenance:{type:'supplied-artifact',description:'Independent synthetic fixture snapshot'}});const name=key+'-manifest.json';await fs.writeFile(path.join(root,name),stable(m));request[key]={root:key,manifest:name,sha256:sha256(stable(m))};}
 const categories=Object.fromEntries(CATEGORIES.map(c=>[c,[]]));
 for(const f of x.f.baselineManifest.files){const p=f.path;categories[/\.html?$/.test(p)?'routes':'staticAssets'].push(p);if(p==='index.html')categories.homepage.push(p);if(/^(privacy|terms)\//.test(p))categories.legal.push(p);if(/^(checkout|basket)\//.test(p))categories.checkout.push(p);if(/^products\/.+\.html?$/.test(p))categories.productContent.push(p);if(/^products\/.*\.(png|jpe?g|webp|svg|gif)$/.test(p))categories.productImages.push(p);if(/^news\//.test(p))categories.news.push(p);if(/^luthier-hub\//.test(p))categories.cms.push(p);}
 const requirements={schemaVersion:1,kind:'atlas-certification-requirements',categories,emptyCategoryReasons:{cms:'No CMS in this explicit synthetic fixture'},unknownDynamicDependencies:[]},matrix={schemaVersion:1,kind:'atlas-version-matrix',sourceCommit:request.sourceRevision,observation:'Synthetic independent fixture only',rows:[]};
 const functional={schemaVersion:1,kind:'atlas-functional-witness',baselineManifestSHA256:request.baseline.sha256,requirementsSHA256:'',checks:[]};
 async function write(name,value){await fs.writeFile(path.join(root,name),stable(value));return {path:name,sha256:sha256(stable(value))};}
 for(const name of CHECKS)functional.checks.push({name,status:'passed',evidence:await write('check-'+name+'.json',{kind:'synthetic-test-only',result:'passed'})});
 const options={requestFile:path.join(root,'certification.json'),requestSHA256:'',trustedSigners};
 async function save(){
  request.requirements=await write('requirements.json',requirements);request.matrix=await write('matrix.json',matrix);
  // Mock independently witnessed browser/inventory contracts; no actual browser execution claimed.
  const currentManifest=JSON.parse(await fs.readFile(path.join(root,request.baseline.manifest)));
  request.deploymentInventory=await write('deployment-inventory.json',{schemaVersion:1,kind:'atlas-deployment-inventory',baselineManifestSHA256:request.baseline.sha256,observationManifestSHA256:request.observations.sha256,freshLedgerSHA256:'a'.repeat(64),deployment:{runId:'synthetic'},entries:currentManifest.files.map(f=>({path:f.path,sha256:f.sha256,bytes:f.size,protectedContent:[],provenance:'preserved-public-http',repositorySHA256:f.sha256,canonicalSHA256:f.sha256,observedSHA256:f.sha256,versionEvidence:'exact-observed-match',deploymentAssociation:{runId:1,sourceRevision:request.sourceRevision,association:'Synthetic contract ONLY'},completenessStatus:'observed-file-only'})),counts:{files:currentManifest.files.length},complete:false,limitation:'Synthetic contract fixture ONLY'});
  request.runtimeAcceptance=await write('runtime-acceptance.json',{schemaVersion:1,kind:'atlas-runtime-acceptance',baselineManifestSHA256:request.baseline.sha256,mode:'isolated-browser-and-node-fixtures',nodeVersion:'v22.20.0',networkIsolation:'independently-attested-process-isolation',checks:RUNTIME_CHECKS.map(id=>({id,status:'passed',detail:'Synthetic contract witness, not executed browser evidence'})),counts:{passed:RUNTIME_CHECKS.length},browserAccepted:true,productionRequests:0,paymentsCreated:0,ordersCreated:0});
  const inventoryWitness={schemaVersion:1,kind:'atlas-inventory-witness',baselineId:request.baselineId,deploymentId:'mock-deployment-not-real',baselineManifestSHA256:request.baseline.sha256,referenceManifestSHA256:request.reference?.sha256??'a'.repeat(64),repositoryManifestSHA256:request.repository.sha256,observationsManifestSHA256:request.observations.sha256,requirementsSHA256:request.requirements.sha256,matrixSHA256:request.matrix.sha256,...request.schemaVersion===2?{deploymentInventorySHA256:request.deploymentInventory.sha256,runtimeAcceptanceSHA256:request.runtimeAcceptance.sha256}:{}};
  const envelope=payload=>({payload,signer:'fixture-reviewer',signature:sign(null,Buffer.from(stable(payload)),keys.privateKey).toString('base64')});
  request.inventoryWitness=await write('inventory-witness.json',envelope(inventoryWitness));functional.requirementsSHA256=request.requirements.sha256;request.functionalWitness=await write('functional-witness.json',envelope(functional));
  await write('certification.json',request);options.requestSHA256=sha256(stable(request));
 }
 async function saveRequest(){await write('certification.json',request);options.requestSHA256=sha256(stable(request));}
 async function addHistoricalDifference(){
  const p='checkout/app.mjs',historical='export const checkoutFixture = "historical synthetic version";\n';await fs.writeFile(path.join(root,'repository',p),historical);
  const m=await makeManifest(path.join(root,'repository'),{provenance:{type:'supplied-artifact',description:'Synthetic historical source'}});await write('repository-manifest.json',m);request.repository.sha256=sha256(stable(m));
  const observed=await fs.readFile(path.join(root,'observations',p)),stamped=stampSource(historical,'mjs',request.sourceRevision);
  const row={path:p,repositorySHA256:sha256(historical),candidateSHA256:sha256(observed),observedLiveSHA256:sha256(observed),canonicalStampedSHA256:sha256(stamped),exactCanonicalStampMatch:false,repositoryBytes:Buffer.byteLength(historical),observedBytes:observed.length,sourceCommit:request.sourceRevision,observedRevision:'synthetic-observation',classification:'verified-live-version',authoritativeVersion:'Synthetic observed bytes only',proposedDisposition:'retain-observed-bytes; no source overwrite',ownerDecisionRequired:false,renderedContentImpact:true,productImageImpact:false,newsCMSImpact:false,javascriptImpact:true,checkoutImpact:true,seoImpact:false,evidence:'Synthetic exact difference fixture',authorityLimitation:'Not real production evidence'};matrix.rows.push(row);await save();return row;
 }
 await save();return {root,x,request,requirements,matrix,functional,options,save,saveRequest,write,addHistoricalDifference};
}
