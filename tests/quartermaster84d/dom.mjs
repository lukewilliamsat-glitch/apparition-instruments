import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {parseHTML}=createRequire(import.meta.url)(process.env.QUARTERMASTER_DOM??'linkedom');
const {mountAdminWorkspace}=await import(pathToFileURL(resolve(process.argv[2],'admin/quartermaster/entry.mjs')));
for(const mode of ['dormant','workshop','foreign']){
const {window,document}=parseHTML('<html><body><main id="quartermaster-workshop"></main><output id="result"></output></body></html>');
const handlers=new Map([
 ['quartermaster84d_access',()=>({mode:mode==='dormant'?'disabled':'workshop',packing:true,receive:true,finance:true})],
 ['quartermaster84d_suppliers',()=>[{id:'00000000-0000-4000-8000-000000000014',name:'Rehearsal supplier'}]],
 ['quartermaster84w_workspace',()=>({schema:1,mode:'workshop',order:{reference:'REHEARSAL',generation:1,revision:2,state:'packed',picks:[{id:'part',title:'Component',quantity:2,picked:2}],materials:[],batches:[],canReserve:false,canPick:false,canRelease:false,canReceive:true,canRecordPostage:false,cost:{material:40,estimate:130,actual:115},parcel:null}})],
 ['quartermaster84d_finance_proposal',()=>({state:'ready',revision:1,packaging:40,postage:115,basis:'a'.repeat(64),evidence:'b'.repeat(64)})],
 ['quartermaster84d_finance_save',options=>{if(options.method!=='POST')throw Error('approval method');return {outcome:'committed',revision:2}}],
 ['quartermaster84_review',()=>({schema:1,mode:'observe',order:{reference:'REHEARSAL',picks:[{name:'Component',quantity:2,picked:0}],materials:[],cost:{packagingActualMinor:null,postageEstimatedMinor:null,postageActualMinor:null},parcel:null,readyForReview:false}})]
]);
const calls=[];
const fixtureFetch=async(url,options)=>{
 const target=new URL(url);
 if(target.origin!=='https://acdxpxvksvdwfajntzfx.supabase.co')throw Error('unexpected fixture destination');
 const name=target.pathname.split('/').at(-1);calls.push(name);
 if(!handlers.has(name))throw Error('unknown route');
 return Response.json(handlers.get(name)(options));
};
const token='fixture.'+btoa(JSON.stringify({iss:(mode==='foreign'?'https://foreign.invalid':'https://acdxpxvksvdwfajntzfx.supabase.co')+'/auth/v1'}))+'.fixture';
Object.defineProperty(window,'fetch',{value:fixtureFetch, configurable:true});
Object.defineProperty(document,'location',{value:new URL('http://localhost/?order=00000000-0000-4000-8000-000000000013')});
const mounted=mountAdminWorkspace({document,auth:{accessToken:async()=>token}});
const check=(condition,message)=>{if(!condition)throw Error(message)};
 const root=document.querySelector('main');
 for(let i=0;i<30 && !/Read-only packing review|Approve packing costs|No accessible packing record/.test(root.textContent);i++)await new Promise(r=>setTimeout(r,20));
 if(mode==='dormant'){
  check(root.textContent.includes('Read-only packing review'),'observe fallback');
  check(!root.querySelector('button'),'unexpected writer controls');
 }else if(mode==='foreign')check(!calls.length && root.textContent.includes('No accessible packing record'),'foreign session must fail closed');
 else {
  check(root.textContent.includes('Rehearsal supplier'),'supplier selector');
  check(root.textContent.includes('£1.30') && root.textContent.includes('£1.15'),'postage separation');
  const approve=[...root.querySelectorAll('button')].find(b=>b.textContent.includes('Approve packing costs'));
  check(approve,'missing finance action');
  approve.dispatchEvent(new window.Event('click'));
  await new Promise(r=>setTimeout(r,40));
  check(root.textContent.includes('Saved ECLIPSE revision 2'),'approval receipt');
 }

 mounted.lock();
 assert.equal(root.textContent,'');
 console.log('PASS rendered Admin '+mode);
}
