// Diagnostic/regression: real entry and renderer with happy-dom, not Chrome.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {components,kits} from './fixture.mjs';
import {createPublicComponentRepository} from '../../dist/backend/component-data.mjs';
import {createPublicAssemblyRepository} from '../../dist/backend/assembly-data.mjs';
import {setComponentRepository} from '../../dist/admin/component-repository.mjs';
import {setAssemblyRepository} from '../../dist/admin/assembly-repository.mjs';
const empty=process.argv.includes('--empty'),calls=[];
const request=async url=>{const resource=new URL(url).pathname.split('/').at(-1);calls.push(resource);if(resource==='catalogue_components')return Response.json(empty?[]:components);if(resource==='catalogue_wiring_kits')return Response.json(kits);if(resource==='kit_permitted_components')return Response.json(components.map(p=>({assembly_id:'kit-les-paul',component_id:p.id})));throw Error('Unexpected fictional resource');};
const config={url:'https://fixture.invalid',publishableKey:'fictional'};
const w=new Window({url:'http://127.0.0.1:7777/components/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});w.document.write(readFileSync('dist/components/index.html','utf8'));w.apparitionStoreState={state:'OPEN'};
Object.assign(globalThis,{window:w,document:w.document,location:w.location,localStorage:w.localStorage,sessionStorage:w.sessionStorage,CustomEvent:w.CustomEvent,history:w.history});
setComponentRepository(createPublicComponentRepository({config,request}));setAssemblyRepository(createPublicAssemblyRepository({config,request}));
try{await import('../../dist/components/components.mjs?v=p11');assert.equal(w.document.querySelectorAll('.component-card').length,empty?0:components.filter(p=>p.individually).length);assert.equal(calls.filter(p=>p==='catalogue_components').length,1);if(empty)assert.match(w.document.querySelector('main').textContent,/No individual components/);else {assert([...w.document.querySelectorAll('button[data-add]')].some(b=>!b.disabled));}console.log(JSON.stringify({status:'PASS',mode:empty?'empty':'success',renderer:'native',DOM:'happy-dom',catalogueReads:1}));}finally{await w.happyDOM.close();}
