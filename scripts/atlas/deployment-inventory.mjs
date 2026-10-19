// Independently inspect local source/HTTP evidence; never discover completeness from a source tree.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {loadJSON,readRegular,sha256,stable,inventory,sameFiles,record,isHash,fail,portablePath} from './core.mjs';
import {stampSource} from '../stamp-static-assets.mjs';
export function protectedClasses(p){return [p==='index.html'?'homepage':null,/^(checkout|basket)\//.test(p)?'checkout':null,/^products\/.+\.html$/.test(p)?'product-content':null,/^products\/.*\.(png|jpe?g|webp)$/.test(p)?'product-image':null,/^news\//.test(p)?'news':null,/^luthier-hub\//.test(p)?'cms':null,/^(privacy|terms)\//.test(p)?'legal':null,/\.(m?js|css)$/.test(p)?'runtime-asset':null].filter(Boolean);}
export async function deploymentInventory({root,manifestFile,manifestSHA256,repositoryRoot,repositoryRevision,observationsRoot,observationManifestFile,observationManifestSHA256,freshRoot,freshLedgerFile,freshLedgerSHA256,deployment}){
 const manifest=(await loadJSON(manifestFile,manifestSHA256)).value,actual=await inventory(root);if(!sameFiles(actual,{files:manifest.files}))fail('INVENTORY_BASELINE','Candidate changed');
 const preserved=(await loadJSON(observationManifestFile,observationManifestSHA256)).value,old=new Map(preserved.files.map(x=>[x.path,x]));
 for(const f of preserved.files)if(sha256(await readRegular(path.join(observationsRoot,f.path)))!==f.sha256)fail('INVENTORY_OBSERVATION','Preserved observation changed');
 const ledger=(await loadJSON(freshLedgerFile,freshLedgerSHA256)).value;if(ledger.origin!=='https://apparitioninstruments.co.uk'||!Array.isArray(ledger.records)||ledger.records.length>31)fail('INVENTORY_LEDGER','Unexpected capture');
 const fresh=new Map();for(const f of ledger.records){portablePath(f.path);if(!f.sha256)continue;if(fresh.has(f.path)||f.status!==200||f.url!==ledger.origin+'/'+f.path||f.method!=='GET'||f.redirects!==0||f.retries!==0)fail('INVENTORY_LEDGER','Invalid response record');const b=await readRegular(path.join(freshRoot,f.path));if(sha256(b)!==f.sha256||b.length!==f.bytes)fail('INVENTORY_OBSERVATION','Current response changed');fresh.set(f.path,f);}
 const entries=[];
 for(const f of actual.files){let repositorySHA256=null,canonicalSHA256=null;try{const b=await readRegular(path.join(repositoryRoot,f.path));repositorySHA256=sha256(b);canonicalSHA256=/\.(?:html?|m?js)$/.test(f.path)?sha256(stampSource(b.toString(),path.extname(f.path).slice(1),repositoryRevision)):repositorySHA256;}catch(e){if(e.code!=='ENOENT')throw e;}
  const o=old.get(f.path),n=fresh.get(f.path),observedSHA256=n?.sha256??o?.sha256??null;
  const provenance=n?'current-public-http':o?'preserved-public-http':f.sha256===repositorySHA256?'historical-git-object':f.sha256===canonicalSHA256?'deterministic-canonical-source-transform':'unresolved';
  entries.push({path:f.path,sha256:f.sha256,bytes:f.size,protectedContent:protectedClasses(f.path),provenance,repositorySHA256,canonicalSHA256,observedSHA256,versionEvidence:observedSHA256?observedSHA256===f.sha256?'exact-observed-match':'candidate-version-mismatch':f.sha256===canonicalSHA256?'deterministic-source-only':'historical-source-only',deploymentAssociation:{runId:deployment.runId,sourceRevision:deployment.sourceRevision,association:'Pages-settings-and-successful-run; per-file publication not attested'},completenessStatus:observedSHA256?'observed-file-only':'not-independently-observed'});
 }
 const counts={files:entries.length,directlyObserved:entries.filter(x=>x.observedSHA256).length,unobserved:entries.filter(x=>!x.observedSHA256).length,versionMismatches:entries.filter(x=>x.versionEvidence==='candidate-version-mismatch').length,currentResponses:fresh.size};
 return {schemaVersion:1,kind:'atlas-deployment-inventory',baselineManifestSHA256:manifestSHA256,observationManifestSHA256,freshLedgerSHA256,deployment,entries,counts,complete:false,limitation:'Successful deployment association and individually checked bytes do not expose a full deployed path inventory or authenticate unobserved generated content.'};
}
