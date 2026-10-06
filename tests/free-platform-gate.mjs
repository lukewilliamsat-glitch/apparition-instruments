// One bounded integrated gate; offline subprocesses, no browser or production.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const cases=[
 ['shared-electronics-core'],['p12a-circuit-forge'],['response-lab-v1'],
 ['free-forge-workflow'],['forge-entry'],['signal-forge-integration'],
 ['instrument-v25-dom','tele'],['instrument-v25-dom','hss'],
 ['instrument-v25-dom','mobile-320'],['instrument-v25-dom','generator-tele'],
 ['instrument-v25-dom','designer-tele'],['free-knowledge'],['free-journeys'],
 ['free-parts'],['free-commercial'],['kit-builder-dom','base'],
 ['kit-builder-dom','holiday'],['holiday-checkout-basket'],
 ['operations-v2-isolated'],['free-announcements'],['free-platform-preservation'],
 ['operations-v1-admin-dom'],['hub-cms-admin'],['hub-cms-data'],
 ['hub-cms-db'],['hub-cms-docx'],['admin-gate'],['p11ef-product-commerce']
];
let cursor=0;const failures=[];
async function worker(){while(cursor<cases.length){const args=cases[cursor++],name=args.join(' '),result=await new Promise(resolve=>{const child=spawn(process.execPath,['--import','./tests/fixtures/admin-offline.mjs','tests/'+args[0]+'.mjs',...args.slice(1)],{env:process.env});let output='';child.stdout.on('data',s=>output+=s);child.stderr.on('data',s=>output+=s);const timer=setTimeout(()=>child.kill(),60000);child.on('close',code=>{clearTimeout(timer);resolve({code,output});});});if(result.code!==0){failures.push(name);console.log('FAIL '+name+'\n'+result.output);}else console.log('PASS '+name);}}
await Promise.all(Array.from({length:4},worker));assert.equal(failures.length,0,'Failed integrated contracts: '+failures.join(', '));console.log('Free platform integrated gate: '+cases.length+' targeted suites/scenarios PASS; no browser or production access.');
