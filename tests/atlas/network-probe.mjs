import assert from 'node:assert/strict';
import net from 'node:net';
import dns from 'node:dns/promises';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
const results=[];
for(const host of ['192.0.2.1','2001:db8::1','127.0.0.1','::1']){
 const code=await new Promise((resolve,reject)=>{const s=net.connect({host,port:9});s.on('connect',()=>{s.destroy();reject(Error('Network isolation failed'));});s.on('error',e=>resolve(e.code));s.setTimeout(2000,()=>{s.destroy();reject(Error('Probe timed out instead of being rejected'));});});assert.ok(['EPERM','EACCES'].includes(code),host+': '+code);results.push({probe:'TCP '+host,blocked:true,error:code});
}
try{await dns.resolve4('atlas-isolation-probe.invalid');throw Error('DNS unexpectedly succeeded');}catch(e){assert.notEqual(e.message,'DNS unexpectedly succeeded');results.push({probe:'DNS .invalid',blocked:true,error:e.code||e.message});}
await assert.rejects(fetch('https://atlas-isolation-probe.invalid'),/ATLAS_OFFLINE_FETCH_DENIED/);results.push({probe:'fetch API',blocked:true});
assert.throws(()=>new WebSocket('wss://atlas-isolation-probe.invalid'),/ATLAS_OFFLINE_WEBSOCKET_DENIED/);results.push({probe:'WebSocket API',blocked:true});
const r=spawnSync(process.execPath,['--input-type=module','-e',"import net from 'node:net';const s=net.connect({host:'192.0.2.1',port:9});s.on('connect',()=>process.exit(20));s.on('error',e=>{console.log(e.code);process.exit(['EPERM','EACCES'].includes(e.code)?0:21)});"],{encoding:'utf8',env:process.env,timeout:4000});assert.equal(r.status,0,r.stderr+r.stdout);results.push({probe:'inherited child direct TCP',blocked:true,error:r.stdout.trim()});
const status=await fs.readFile('/proc/self/status','utf8');assert.match(status,/Seccomp:\s+2/);assert.match(status,/NoNewPrivs:\s+1/);results.push({probe:'kernel seccomp and no_new_privs',enabled:true});
console.log(JSON.stringify({runtime:process.version,platform:process.platform,architecture:process.arch,results,productionEndpointsUsed:false},null,2));
