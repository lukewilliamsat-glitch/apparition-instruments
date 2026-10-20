// Capture-disabled generation: lightweight authoritative rows + verified archive.
// No HTTP in this module; mismatched/new images require explicit capture.
import {verifyArchive,sha} from './trusted-image-publisher.mjs';
import {validateImageManifest} from '../dist/backend/catalogue-image-delivery.mjs';
import {readFile} from 'node:fs/promises';import {join} from 'node:path';
export async function retainedCatalogueSnapshot(rows,root,{revision}={}){
 if(!Array.isArray(rows)||rows.length>2000)throw Error('Invalid retained catalogue');const archive=await verifyArchive(root),ids=new Set();
 if(revision!==undefined){if(!/^[a-f0-9]{64}$/.test(revision))throw Error('Invalid retained manifest revision');archive.manifest=validateImageManifest(JSON.parse(await readFile(join(root,'assets/catalogue-images/manifest.'+revision+'.json'),'utf8')));if(archive.manifest.revision!==revision||sha(JSON.stringify(archive.manifest.entries))!==revision)throw Error('Retained manifest revision mismatch');}
 return rows.map(row=>{if(!row||typeof row.id!=='string'||ids.has(row.id)||Object.hasOwn(row,'image')||row.image_reference!==null)throw Error('Invalid retained catalogue row');ids.add(row.id);const {image_identity,image_reference,...metadata}=row;
 if(image_identity===null)return {...metadata,image:null};const e=archive.manifest.entries[row.id];if(!e||e.sourceHash!==image_identity)throw Error('Image change requires separately enabled capture: '+row.id);
 return {...metadata,image:{kind:'object',key:e.assetHash,url:'https://apparitioninstruments.co.uk'+e.path,mimeType:e.mime}};});
}
