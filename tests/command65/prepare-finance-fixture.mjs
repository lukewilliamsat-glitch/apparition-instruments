import {readdir,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative,dirname} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),source=join(root,'dist'),target=fileURLToPath(new URL('./runtime/',import.meta.url));
async function copy(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())await copy(path);else if(item.isFile()&&path.endsWith('.mjs')){const dest=join(target,relative(source,path));await mkdir(dirname(dest),{recursive:true});await writeFile(dest,await readFile(path));}}}
await copy(source);
// Fixture-local inactive configuration preserves the inherited disabled-path assertions.
// No production activation file is modified; all requests in the tests are injected.
await writeFile(join(target,'admin/orders/finance-activation.mjs'),'export const financeActivation=Object.freeze({enabled:false,backendEvidenceSHA256:null,livePersistenceEvidenceSHA256:null});\n');
