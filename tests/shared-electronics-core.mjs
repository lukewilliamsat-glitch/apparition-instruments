import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stampSource,stampTree} from '../scripts/stamp-static-assets.mjs';
import {forgeCircuit} from '../dist/circuit-forge/model.mjs';
import {pathDetails,circuitChanges} from '../dist/wiring-generator/inspection.mjs';
import {routeDiagram} from '../dist/wiring-generator/routing.mjs';
const rev='a5d0fd1e49fb0e20777121b2f8b40d90f94ef5b6';
assert.equal(stampSource('<script src="/circuit-forge/app.mjs"></script><link href="/circuit-forge/forge.css">','html',rev),`<script src="/circuit-forge/app.mjs?build=${rev}"></script><link href="/circuit-forge/forge.css?build=${rev}">`);
assert.equal(stampSource('import {x} from "./other.mjs?v=old"; import "../shared.mjs";','mjs',rev),`import {x} from "./other.mjs?v=old&build=${rev}"; import "../shared.mjs?build=${rev}";`);
assert.equal(stampSource("await import('../components/catalogue.mjs')",'mjs',rev),`await import('../components/catalogue.mjs?build=${rev}')`);
assert.equal(stampSource("new URL('./landing.css',import.meta.url)",'mjs',rev),`new URL('./landing.css?build=${rev}',import.meta.url)`);
assert.equal(stampSource('<script data-admin-entry="/admin/orders/app.mjs,/admin/orders/create.mjs"></script>','html',rev),`<script data-admin-entry="/admin/orders/app.mjs?build=${rev},/admin/orders/create.mjs?build=${rev}"></script>`);
assert.equal(stampSource(stampSource('import "./other.mjs"','mjs',rev),'mjs',rev),`import "./other.mjs?build=${rev}"`);
assert.equal(stampSource('<script src="https://third.example/app.js"></script>','html',rev),'<script src="https://third.example/app.js"></script>');
const dir=await mkdtemp(join(tmpdir(),'forge-stamp-'));try{
 await mkdir(join(dir,'tool'));await writeFile(join(dir,'tool','index.html'),'<script type="module" src="./app.mjs"></script>');await writeFile(join(dir,'tool','app.mjs'),'import "./dependency.mjs"');
 assert.equal(await stampTree(dir,rev),2);assert.equal(await stampTree(dir,rev),0);
 assert((await readFile(join(dir,'tool','app.mjs'),'utf8')).includes(`dependency.mjs?build=${rev}`));
}finally{await rm(dir,{recursive:true,force:true});}
const a=forgeCircuit().circuit,b=forgeCircuit({wiring:'50s'}).circuit;
assert(pathDetails(a,'jack.tip').references.includes('jack.tip'));
assert(circuitChanges(a,b).some(x=>x.id==='neckToneFeed'));
const first=routeDiagram(a),again=routeDiagram(a);assert.equal(first,again,'same route input shares cache');
const changed=structuredClone(a);changed.connections[0].route=[[123,456]];
assert.notEqual(routeDiagram(changed),first,'route hints are part of route cache identity');
const html=await readFile('dist/circuit-forge/index.html','utf8');assert(html.includes('id="forge-loading-help" hidden'));assert(html.includes('Ctrl + Shift + R'));assert(html.includes('Cmd + Shift + R'));assert(html.includes('Preparing the circuit'));
console.log('Shared electronics core, router cache identity and static asset stamping PASS');
