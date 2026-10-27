import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file='dist/admin/admin.mjs',source=await readFile(file,'utf8'),before=JSON.parse(await readFile('tests/command61/retained-writers.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
// This presentation pass must not change the existing editor/stock/export writer lifecycle.
assert.equal(hash(source.slice(source.indexOf('function collectSpecs()'))),before.writerTailSHA256);
const active=s=>s.match(/input.addEventListener\('change',async\(\)=>\{input.disabled=true;[\s\S]*?input.disabled=false;\}\);/)[0];
assert.equal(hash(active(source)),before.activeHandlerSHA256);
assert.match(source,/dataset.inventoryCards=String\(!assemblies&&view==='components'\)/);
assert.match(source,/th.scope='col'/);assert.match(source,/setAttribute\('role','table'\)/);
assert(!/\.fetch\(|setInterval\(/.test(source));
console.log('COMMAND61 Inventory PASS: business writers byte-identical, existing active-status writer identical, no fetch/polling added, table/card semantics scoped to components.');
