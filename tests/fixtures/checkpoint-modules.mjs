import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,posix} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
// Hermetic baseline comparison from Git; copy only the requested module closure.
export function checkpointModules(paths,sha='5238c3f1f5662c5346febd8b9d924e32cbf99d8d'){
 const root=mkdtempSync(join(tmpdir(),'apparition-checkpoint-')),copied=new Set();
 function copy(path){if(copied.has(path))return;copied.add(path);const source=execFileSync('git',['show',sha+':'+path],{encoding:'utf8'}),target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);for(const match of source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))copy(posix.normalize(posix.join(posix.dirname(path),match[1].split('?')[0])));}
 try{paths.forEach(copy);}catch(error){rmSync(root,{recursive:true,force:true});throw error;}
 return {url:path=>pathToFileURL(join(root,path)),close:()=>rmSync(root,{recursive:true,force:true})};
}
