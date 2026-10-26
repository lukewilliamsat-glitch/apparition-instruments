import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {createServer} from 'node:http';
import {createStaticWindow} from '../../scripts/static-dom.mjs';
const read=p=>readFileSync(p,'utf8'),legacy=read('.github/workflows/static.yml'),command=read('.github/workflows/command-publication.yml');
const condition=(source,label)=>source.slice(source.indexOf(label)).match(/^\s+if: (.+)$/m)?.[1];
const evaluate=(expr,event,message='',operation='release')=>runInNewContext(expr.replace(/^\$\{\{\s*|\s*\}\}$/g,''),{github:{event_name:event,repository:'lukewilliamsat-glitch/apparition-instruments',ref:'refs/heads/main',event:{head_commit:{message}}},inputs:{operation},contains:(v,s)=>String(v??'').includes(s)},{timeout:100});
const check=(...args)=>Boolean(evaluate(...args));
const legacyIf=condition(legacy,'  deploy:'),generators=['Generate public product pages from Supabase','Generate public News and Operations presentation','Generate CMS published articles'];
for(const [event,message,expected] of [['push','ordinary change',[true,true,true]],['push','[static-only]',[false,false,false]],['push','[cms-only]',[false,false,true]],['workflow_dispatch','',[true,true,true]],['schedule','',[true,true,true]]]){
 assert(check(legacyIf,event,message));
 assert.deepEqual(generators.map(name=>check(condition(legacy,'- name: '+name),event,message)),expected,event+' '+message);
}
assert(!check(legacyIf,'push','[command-exact-release]'));
assert(legacy.includes("'docs/**'")&&legacy.includes("'**/*.md'"));
console.log('PASS 1: actual generator conditions preserve full/CMS builds and prohibit all static-only backend generators');
const publishIf=condition(command,'  exact-publication:'),inspectIf=condition(command,'  inspect-pages:');
for(const mode of ['release','restore'])assert(check(publishIf,'workflow_dispatch','',mode));
assert(!check(publishIf,'workflow_dispatch','','inspect'));assert(check(inspectIf,'workflow_dispatch','','inspect'));assert(!check(inspectIf,'push','[command-pages-status]'));
const inspector=command.slice(command.indexOf('  inspect-pages:'),command.indexOf('  exact-publication:'));
assert(inspector.includes('pages: read')&&!inspector.includes('pages: write')&&!inspector.includes('environment:'));
assert(inspector.includes('re.fullmatch')&&inspector.includes('NoRedirect')&&inspector.includes("deployment=os.environ['DEPLOYMENT_ID']"));
console.log('PASS 2: inspection is explicit, bounded, read-only and cannot select a publication job');
const group=source=>source.match(/^\s+group: (.+)$/m)[1];
assert.equal(evaluate(group(legacy),'push','ordinary'),'pages');
assert.equal(evaluate(group(command),'push','ordinary'),'pages-command-guard');
assert.equal(evaluate(group(legacy),'push','[command-exact-release]'),'pages-command-guard');
assert.equal(evaluate(group(command),'push','[command-exact-release]'),'pages');
for(const mode of ['release','restore'])assert.equal(evaluate(group(command),'workflow_dispatch','',mode),'pages');
assert.equal(evaluate(group(command),'workflow_dispatch','','inspect'),'pages-inspection');
for(const source of [legacy,command])for(const line of source.matchAll(/^\s+(?:-\s+)?uses: ([^\s]+)$/gm))assert(/@[a-f0-9]{40}$/.test(line[1]),'Action must be pinned: '+line[1]);
const minutes=Number(command.slice(command.indexOf('  exact-publication:')).match(/timeout-minutes: (\d+)/)[1]);
const deployTimeouts=[...command.matchAll(/timeout: '(\d+)'/g)].map(m=>Number(m[1]));assert.equal(deployTimeouts.length,2);assert(minutes*60000>=deployTimeouts.reduce((a,b)=>a+b,0)+300000,'Job must cover publication, restoration and overhead');
assert(command.includes('cancel-in-progress: false')&&legacy.includes('cancel-in-progress: false'));
assert(read('scripts/command-release/transport.py').includes("require(ref.get('object',{}).get('sha')==tooling_commit,'Current main changed')"));
console.log('PASS 3: pinned actions, serialized publishing, main identity guard and complete rollback time budget');
const manifest=JSON.parse(read('docs/command/command05/COMMAND_RELEASE_SOURCE.json'));
const baseCheckout=command.slice(command.indexOf('- name: Read the exact accepted base source'),command.indexOf('- uses: actions/setup-python'));
assert(baseCheckout.includes('ref: '+manifest.baseSourceCommit)&&baseCheckout.includes('fetch-depth: 1')&&baseCheckout.includes('persist-credentials: false'));
const script=command.match(/node --input-type=module <<'JS'\n([\s\S]*?)\n          JS/)[1].split('\n').map(l=>l.replace(/^ {10}/,'')).join('\n');
const temporary=mkdtempSync(join(tmpdir(),'apparition-release-check-'));
try{
 const copy=(source,target)=>{mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);};
 for(const path of ['scripts/command-release/cache-overlay.mjs','scripts/stamp-static-assets.mjs','docs/command/command05/COMMAND_RELEASE_SOURCE.json',...manifest.entries.map(e=>'dist/'+e.path)])copy(path,join(temporary,path));
 for(const e of manifest.entries.filter(e=>e.beforeSHA256!==null)){
  const target=join(temporary,'.command55-base-source/dist',e.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,execFileSync('git',['show',manifest.baseSourceCommit+':dist/'+e.path]));
 }
 const result=spawnSync(process.execPath,['--input-type=module'],{cwd:temporary,input:script,encoding:'utf8',env:{PATH:process.env.PATH,GITHUB_WORKSPACE:temporary,RUNNER_TEMP:temporary}});
 assert.equal(result.status,0,result.stderr);
 const value=JSON.parse(read(join(temporary,'command-compiled/source-manifest.json'))),sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
 assert.equal(createHash('sha256').update(JSON.stringify(sort(value))).digest('hex'),JSON.parse(read('docs/command/command05/FRONTEND_RELEASE_55.json')).compiledManifestSHA256);
}finally{rmSync(temporary,{recursive:true,force:true});}
console.log('PASS 4: actual workflow compiler succeeds without a .git directory or any main history; accepted 21-file compilation is identical');
let requests=0;const server=createServer((req,res)=>{requests++;res.end('fixture');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/',window=createStaticWindow({url});
try{
 window.document.write('<html><head><link rel="stylesheet" href="'+url+'style.css"><script src="'+url+'script.js"></script></head><body><script>document.body.dataset.executed="yes"</script><iframe src="'+url+'frame"></iframe></body></html>');
 await window.happyDOM.waitUntilComplete();assert.equal(requests,0);assert.equal(window.document.body.dataset.executed,undefined);
}finally{await window.happyDOM.close();await new Promise(resolve=>server.close(resolve));}
console.log('PASS 5: static renderer neither executes page JavaScript nor fetches stylesheet/script/iframe resources');
