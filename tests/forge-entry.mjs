import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync('dist/circuit-forge/index.html','utf8');
const css=readFileSync('dist/circuit-forge/forge.css','utf8');
const app=readFileSync('dist/circuit-forge/app.mjs','utf8');
const boot=html.match(/<script>\(function\(\)\{([\s\S]*?)\}\)\(\);<\/script>/)?.[0].replace(/^<script>|<\/script>$/g,'');
assert(boot&&html.indexOf(boot)<html.indexOf('<body>'),'entry bootstrap runs before body and modules');
assert(html.includes('forge-entry-v1b')&&html.includes('id="forge-entry-error"'));
assert(app.includes('if(render())window.__forgeEntry?.ready();else window.__forgeEntry?.fail();'));
assert.equal((app.match(/__forgeEntry\?\.ready\(\)/g)||[]).length,1,'entry completes once after initial render, not on mode or selector interactions');
assert(css.includes('.forge-entry-brief')&&css.includes('prefers-reduced-motion:reduce'));

const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve()};
function setup({reduced=false,seen=false}={}){
 const names=new Set(),timers=new Map(),storage=new Map(seen?[['apparition-forge-entered','1']]:[]);let next=0,clock=0,frames=[];
 const root={classList:{add:(...v)=>v.forEach(x=>names.add(x)),remove:(...v)=>v.forEach(x=>names.delete(x))}};
 const error={hidden:true,removeAttribute(){this.hidden=false}};
 const doc={documentElement:root,fonts:{ready:Promise.resolve()},querySelector:()=>error};
 const win={};
 const timeout=(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id};
 runInNewContext(boot,{document:doc,window:win,performance:{now:()=>clock},matchMedia:()=>({matches:reduced}),sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:timeout,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>frames.push(fn)});
 return {names,timers,frames,error,win,storage,advance:async delay=>{clock+=delay;for(const [id,item] of [...timers])if(item.delay<=delay){timers.delete(id);item.fn()}await flush();for(const frame of frames.splice(0))frame();await flush()}};
}
let entry=setup();assert(entry.names.has('forge-entering'));assert(!entry.names.has('forge-entry-brief'));
const pending=entry.win.__forgeEntry.ready();await flush();assert(entry.names.has('forge-entering'),'readiness alone cannot skip minimum');
await entry.advance(800);await pending;assert(!entry.names.has('forge-entering'));assert.equal(entry.storage.get('apparition-forge-entered'),'1');
entry=setup({reduced:true});assert(entry.names.has('forge-entry-brief'));const immediate=entry.win.__forgeEntry.ready();await flush();await entry.advance(0);await immediate;assert(!entry.names.has('forge-entering'));
entry=setup({seen:true});assert(entry.names.has('forge-entry-brief'));const repeat=entry.win.__forgeEntry.ready();await flush();await entry.advance(0);await repeat;assert(!entry.names.has('forge-entering'),'same-session visit still waits for readiness but skips the designed minimum');
entry=setup({seen:true});entry.win.__forgeEntry.fail();assert(entry.error.hidden===false&&entry.names.has('forge-entry-failed'));
entry=setup();await entry.advance(8000);assert(!entry.names.has('forge-entering')&&!entry.error.hidden,'missing module cannot trap the visitor');
console.log('Forge entry readiness, minimum, replay, reduced motion and failure recovery PASS');
