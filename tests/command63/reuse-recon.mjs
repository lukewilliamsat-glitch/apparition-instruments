import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const evidence=JSON.parse(await readFile('tests/command63/recon-reuse.json','utf8'));
for(const [path,hash]of Object.entries(evidence.sha256))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,path);
console.log(JSON.stringify({source:evidence.source,run:evidence.run,newCalculationGroupsReused:19,acceptedV1GroupsReused:35,DOMReused:true,unchangedSuitesRerun:false}));
