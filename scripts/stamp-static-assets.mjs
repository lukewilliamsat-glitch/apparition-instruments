// Build-only cache identity: every first-party static module and stylesheet URL
// carries the same deployment revision, including transitive ES module imports.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const local=url=>/^(?:\.{1,2}\/|\/(?!\/))/.test(url)&&/\.(?:mjs|js|css)(?:\?|$)/.test(url);
function stamp(url,revision){
 if(!local(url))return url;
 const [path,query='']=url.split('?'),params=new URLSearchParams(query);
 params.set('build',revision);
 return path+'?'+params.toString();
}
export function stampSource(source,kind,revision){
 if(!/^[a-f0-9]{7,40}$/.test(revision))throw Error('Invalid deployment revision');
 if(kind==='html')return source.replace(/((?:src|href|data-admin-entry)=["'])([^"']+)(["'])/g,(all,before,url,after)=>before+(before.includes('data-admin-entry')?url.split(',').map(value=>stamp(value.trim(),revision)).join(','):stamp(url,revision))+after);
 if(kind==='mjs'||kind==='js')return source.replace(/(\b(?:from|import)\s*\(?\s*["']|\bnew\s+URL\(\s*["'])([^"']+)(["'])/g,(all,before,url,after)=>before+stamp(url,revision)+after);
 return source;
}
export async function stampTree(root,revision){
 let changed=0;
 async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,item.name);if(item.isDirectory()){await walk(path);continue;}
  const kind=extname(path).slice(1);if(!['html','mjs','js'].includes(kind))continue;
  const before=await readFile(path,'utf8'),after=stampSource(before,kind,revision);
  if(before!==after){await writeFile(path,after);changed++;}
 }}
 await walk(root);return changed;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const revision=process.env.GITHUB_SHA||process.argv[3],root=process.argv[2]||'dist';
 stampTree(root,revision).then(count=>console.log(`Stamped ${count} static files for ${revision}`)).catch(error=>{console.error(error);process.exitCode=1;});
}
