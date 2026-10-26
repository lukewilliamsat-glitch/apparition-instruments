// Fixed, offline linker for this reviewed module closure; no package downloads,
// eval, minifier, dependencies or arbitrary entry points. Output is inert on load.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const allowed=new Set(['scripts/command-release/owner-read-check.mjs','dist/backend/public-config.mjs','dist/admin/admin-auth.mjs','dist/admin/command/bounded-json.mjs','dist/admin/command/read-activation.mjs','dist/admin/command/production-read.mjs','dist/admin/command/read-boundary.mjs','dist/admin/command/command01/model.mjs']);
export async function buildOwnerCheck(root,{read=path=>readFile(resolve(root,path),'utf8')}={}){
 const boundSource=JSON.parse(await read('docs/command/command05/COMMAND_RELEASE_SOURCE.json')).sourceCommit;
 if(!/^[a-f0-9]{40}$/.test(boundSource||''))throw Error('Pinned application source required.');
 const visited=new Set(),parts=[],sources=[];
 async function module(path){
  if(visited.has(path))return;visited.add(path);if(!allowed.has(path))throw Error('Unreviewed owner-check module.');
  let text=await read(path);sources.push({path,sha256:sha(text)});const imports=[];
  text=text.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm,(_,bindings,specifier)=>{if(!specifier.startsWith('.'))throw Error('External module forbidden.');const dep=relative(root,resolve(root,dirname(path),specifier)).replaceAll('\\','/');imports.push({bindings:bindings.trim().replace(/\s+as\s+/g,':'),dep});return '';});
  for(const {dep} of imports)await module(dep);
  const exports=[...text.matchAll(/\bexport\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g)].map(m=>[m[1],m[1]]);
  text=text.replace(/^export\s*\{([^}]+)\};?\s*$/gm,(_,names)=>{for(const entry of names.split(',')){const [local,name=local]=entry.trim().split(/\s+as\s+/);exports.push([name,local]);}return '';}).replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|class)\b)/g,'');
  if(/^\s*(?:import|export)\s/m.test(text))throw Error('Unsupported module syntax; do not silently broaden linker.');
  parts.push('__m['+JSON.stringify(path)+']=(function('+imports.map(i=>'{'+i.bindings+'}').join(',')+'){\n'+text+'\nreturn {'+exports.map(([name,local])=>JSON.stringify(name)+':'+local).join(',')+'};\n})('+imports.map(i=>'__m['+JSON.stringify(i.dep)+']').join(',')+');');
 }
 await module('scripts/command-release/owner-read-check.mjs');
 const source='/* COMMAND55 owner-only read check. Loading this defines a function and sends zero requests. Separate exact live approval required. */\n(()=>{if(Object.hasOwn(globalThis,"COMMAND55_READ_CHECK"))throw Error("Owner check already installed; no automatic replacement.");const __m=Object.create(null);\n'+parts.join('\n')+'\nglobalThis.COMMAND55_READ_CHECK=options=>__m["scripts/command-release/owner-read-check.mjs"].ownerReadCheck({...options,sourceCommit:'+JSON.stringify(boundSource)+'});})();\n';
 return {source,sha256:sha(source),bytes:Buffer.byteLength(source),modules:sources};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [root,out]=process.argv.slice(2);if(!root||!out)throw Error('Usage: node build-owner-check.mjs <source-root> <new-output.js>');const bundle=await buildOwnerCheck(resolve(root));await writeFile(out,bundle.source,{flag:'wx',mode:0o600});console.log(JSON.stringify({sha256:bundle.sha256,bytes:bundle.bytes,modules:bundle.modules.length,inertOnLoad:true,requests:0}));}
