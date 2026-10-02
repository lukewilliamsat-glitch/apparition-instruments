import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
const w=new Window({url:'https://apparitioninstruments.co.uk/treble-bleed-designer/'});w.document.write(readFileSync('dist/treble-bleed-designer/index.html','utf8'));
Object.assign(globalThis,{document:w.document,window:w,location:w.location});globalThis.fetch=async()=>{throw Error('Catalogue unavailable');};
// Isolate the late catalogue outage from the separately required Kit Definition bootstrap.
// These records live only in this Window's storage; no production endpoint is used.
const {createLocalComponentRepository,setComponentRepository}=await import('../dist/admin/component-repository.mjs');
const {createLocalAssemblyRepository,setAssemblyRepository}=await import('../dist/admin/assembly-repository.mjs');
const local=createLocalComponentRepository(w.localStorage);
setComponentRepository(local);setAssemblyRepository(createLocalAssemblyRepository(w.localStorage));
await import('../dist/wiring-kits/kit-data.mjs');
setComponentRepository({...local,async list(){throw Error('Catalogue unavailable');}});
await import('../dist/treble-bleed-designer/app.mjs?offline-test');await new Promise(resolve=>setTimeout(resolve,70));
assert(w.document.querySelector('#summary-values dd'));assert(w.document.querySelector('#matching-products').textContent.includes('Designer remains available'));
w.close();console.log('Designer DOM: catalogue failure does not disable electrical modelling PASS');
