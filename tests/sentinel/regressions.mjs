import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const suites=['tests/sentinel/basket.mjs','tests/sentinel/checkout.mjs','tests/sentinel/contact.mjs','tests/kit-snapshot.mjs','tests/p11ef-product-commerce.mjs'];
const results=suites.map(path=>{const r=spawnSync(process.execPath,['--import','./tests/fixtures/offline-guard.mjs',path],{encoding:'utf8',timeout:60000,env:process.env});return{path,exitCode:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?String(r.error):null};});
const report={status:results.every(r=>r.exitCode===0)?'PASS':'FAIL',node:process.version,results};await writeFile(join(process.argv[2],'SENTINEL_NODE_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(report.status,'PASS');
