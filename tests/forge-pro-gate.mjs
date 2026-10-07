import {spawnSync} from 'node:child_process';
const suites=['forge-pro-domain','forge-pro-db','forge-pro-ui','forge-pro-preservation','free-forge-workflow','p12a-circuit-forge','signal-forge-integration','free-parts','free-journeys','p09b-account','free-announcements'];
for(const suite of suites){const result=spawnSync(process.execPath,['--import','./tests/fixtures/admin-offline.mjs','tests/'+suite+'.mjs'],{encoding:'utf8',timeout:120000,maxBuffer:1000000});if(result.status!==0){console.error(suite+' FAILED\n'+result.stdout+result.stderr);process.exit(1);}console.log(result.stdout.trim());}
console.log('Forge Pro integrated gate: '+suites.length+' targeted suites PASS. No browser, production fixtures, broad electrical matrix or unrelated platform suites.');
