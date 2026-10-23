import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const suites=['p10c-storefront-truth','p10d-product-detail','premium-storefront-v1','holiday-checkout-basket','p09a-contact','p07b4-contact'];
const results=[];
for(const name of suites){const r=spawnSync(process.execPath,['--import','./tests/fixtures/offline-guard.mjs','tests/'+name+'.mjs'],{encoding:'utf8',timeout:60000,env:process.env});results.push({suite:name,exitCode:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?String(r.error):null});}
const report={node:process.version,status:results.every(r=>r.exitCode===0)?'PASS':'FAIL',results};
await writeFile(join(process.argv[2],'REGRESSION_RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(report.status,'PASS');
