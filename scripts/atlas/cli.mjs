import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadJSON,stable,inventory,makeManifest,record,AtlasError} from './core.mjs';
import {validateSnapshot} from './validate-snapshot.mjs';
import {resolvePublicationMode} from './resolve-publication-mode.mjs';
import {assembleStaticOverlay,verifyArtifact} from './assemble-static-overlay.mjs';
const flags={inventory:['root'],manifest:['root','spec'],validate:['root','manifest','manifest-sha256'],resolve:['input','input-sha256'],assemble:['baseline','baseline-manifest','baseline-sha256','overlay','overlay-manifest','overlay-sha256','protection','protection-sha256','policy','policy-sha256','output'],verify:['artifact','receipt-sha256']};
export async function runCLI(argv){
 const [command,...args]=argv;if(!flags[command])throw new AtlasError('USAGE','Command must be inventory, manifest, validate, resolve, assemble or verify');
 const opt={};for(let i=0;i<args.length;i+=2){const k=args[i]?.slice(2);if(!args[i]?.startsWith('--')||!flags[command].includes(k)||Object.hasOwn(opt,k)||!args[i+1]||args[i+1].startsWith('--'))throw new AtlasError('USAGE','Invalid or duplicate CLI option');opt[k]=args[i+1];}
 for(const k of flags[command])if(!(command==='manifest'&&k==='spec')&&!opt[k])throw new AtlasError('USAGE','Missing --'+k);
 const read=(name,hash)=>loadJSON(opt[name],opt[hash]);
 if(command==='inventory')return {result:await inventory(opt.root),exitCode:0};
 if(command==='manifest'){const spec=opt.spec?(await loadJSON(opt.spec)).value:{};record(spec,['criticalRoutes','criticalAssets','provenance'],'manifest spec');return {result:await makeManifest(opt.root,spec),exitCode:0};}
 if(command==='validate'){const m=await read('manifest','manifest-sha256'),v=await validateSnapshot(opt.root,m.value);return {result:{...v,suppliedManifestByteSHA256:m.sha256},exitCode:v.valid?0:1};}
 if(command==='resolve'){const d=resolvePublicationMode((await read('input','input-sha256')).value);return {result:d,exitCode:d.allowed?0:1};}
 if(command==='verify')return {result:await verifyArtifact(opt.artifact,{expectedReceiptSHA256:opt['receipt-sha256']}),exitCode:0};
 return {result:await assembleStaticOverlay({baselineRoot:opt.baseline,baselineManifest:(await read('baseline-manifest','baseline-sha256')).value,overlayRoot:opt.overlay,overlayManifest:(await read('overlay-manifest','overlay-sha256')).value,protectedManifest:(await read('protection','protection-sha256')).value,policy:(await read('policy','policy-sha256')).value,output:opt.output}),exitCode:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const {result,exitCode}=await runCLI(process.argv.slice(2));process.stdout.write(stable(result));process.exitCode=exitCode;}
 catch(e){process.stdout.write(stable({schemaVersion:1,status:'blocked',valid:false,ready:false,error:{code:e.code||'IO_ERROR',message:e.message}}));process.exitCode=e.code==='USAGE'?2:1;}
}
