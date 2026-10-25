// Preload for local logic tests. CI additionally enforces a kernel network namespace.
const deny=()=>{throw new Error('COMMAND01 test network/child-process access denied');};
for(const name of ['node:net','node:tls','node:http','node:https','node:http2','node:dgram','node:dns','node:child_process']){
 const mod=require(name);
 for(const key of ['connect','createConnection','request','get','createSocket','resolve','lookup','exec','execFile','spawn','fork','execSync','execFileSync','spawnSync'])if(typeof mod[key]==='function')mod[key]=deny;
 if(mod.promises)for(const key of ['lookup','resolve','resolve4','resolve6'])if(typeof mod.promises[key]==='function')mod.promises[key]=deny;
}
globalThis.fetch=deny;globalThis.WebSocket=class{constructor(){deny();}};
require('node:module').syncBuiltinESMExports();
