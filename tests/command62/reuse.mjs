import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files={
 'dist/admin/orders/economics.mjs':'a086dcef8f33b14d880c8accc91f2f5bfeabf463a3241237a7ac49392ebbba3a',
 'tests/command61/economics.mjs':'6aec303848dcfdbe53fa4bc8af03f85125b765ffbd838d808622145d0b208668'
};
for(const [path,expected]of Object.entries(files))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),expected,'Accepted financial arithmetic/source assumptions changed: '+path);
console.log(JSON.stringify({result:'PASS',acceptedCalculationGroupsReused:35,calculationSuiteRerun:false,authority:'AUTHORISATION_62 sections 3–4',patchSHA256:'0ab84780d8174903ee6a88f0be1a9c162c09b560a32f73a41a25ab866765a4e0',files}));
