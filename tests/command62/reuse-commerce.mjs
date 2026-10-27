import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const evidence=JSON.parse(await readFile('tests/command62/commerce-reuse.json','utf8'));
for(const [path,hash]of Object.entries(evidence.sha256))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,path);
console.log(JSON.stringify({acceptedCommerceEvidenceReused:{source:evidence.source,run:evidence.run,pricingGroups:evidence.pricingGroups,referenceGroups:evidence.referenceGroups,DOM:evidence.DOM,nativeGroups:evidence.nativeGroups},unchangedSuitesRerun:false}));
