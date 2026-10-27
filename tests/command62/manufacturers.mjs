import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {bootCatalogueSettings} from '../../dist/admin/catalogue-settings/settings.mjs';
import {createAdminOptionRepository} from '../../dist/backend/catalogue-options.mjs';
const used={option_set:'manufacturer',option_key:'fixture_used',label:'Fictional used maker',aliases:['Old maker'],active:false,sort_order:0};
const unused={...used,option_key:'fixture_unused',label:'Fictional unused maker',aliases:[],active:true};
let count=0;
async function fixture({components=[],result={deleted:true},status=200}={}){
 const w=new Window({url:'https://fixture.invalid/admin/catalogue-settings/',settings:{disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}}),d=w.document;d.body.innerHTML='<p id="option-status" role="status"></p><div id="option-groups"></div>';let options=[used,unused].map(x=>structuredClone(x)),calls=[];
 const transport={send:async(path,request={})=>{calls.push({path,...request});if(path==='catalogue_options')return Response.json(options);assert.equal(path,'rpc/delete_unused_catalogue_option');assert.deepEqual(request.body,{p_set:'manufacturer',p_key:'fixture_unused'});if(result.deleted&&status===200)options=options.filter(x=>x.option_key!=='fixture_unused');return Response.json(result,{status});}};
 const repo=createAdminOptionRepository(transport);await bootCatalogueSettings({document:d,repo,componentRepo:{list:async()=>structuredClone(components)}}).ready;
 const row=key=>d.querySelector('[data-option-key="'+key+'"]'),button=(root,text)=>[...root.querySelectorAll('button')].find(x=>x.textContent===text),settle=()=>new Promise(r=>setTimeout(r,0));return {w,d,calls,row,button,settle,repo};
}
{
 const f=await fixture({components:[{id:'fixture-component',name:'Fictional part',manufacturer:'Old maker'}]});f.button(f.row('fixture_used'),'Delete permanently').click();assert.equal(f.d.querySelector('dialog'),null);assert.match(f.d.querySelector('#option-status').textContent,/Deletion blocked/);const link=f.d.querySelector('.catalogue-dependency-notice a');assert.match(link.href,/edit=component&component=fixture-component/);assert.equal(f.calls.filter(x=>x.method==='POST').length,0);assert.match(f.row('fixture_used').textContent,/Disabled/);count++;await f.w.happyDOM.close();
}
for(const escape of [false,true]){
 const f=await fixture();const invoker=f.button(f.row('fixture_unused'),'Delete permanently');invoker.focus();invoker.click();const dialog=f.d.querySelector('dialog');assert(dialog.open);if(escape)dialog.dispatchEvent(new f.w.Event('cancel',{cancelable:true}));else f.button(dialog,'Cancel').click();await f.settle();assert.equal(f.d.querySelector('dialog'),null);assert.equal(f.d.activeElement,invoker);assert.match(f.d.querySelector('#option-status').textContent,/cancelled/);assert.equal(f.calls.filter(x=>x.method==='POST').length,0);count++;await f.w.happyDOM.close();
}
{
 const f=await fixture();f.button(f.row('fixture_unused'),'Delete permanently').click();const b=f.button(f.d.querySelector('dialog'),'Delete permanently');b.click();b.click();await f.settle();assert.equal(f.row('fixture_unused'),null);assert(f.row('fixture_used'));assert.match(f.d.querySelector('#option-status').textContent,/deleted permanently/);assert.equal(f.calls.filter(x=>x.method==='POST').length,1);count++;await f.w.happyDOM.close();
}
{
 const f=await fixture({result:{deleted:false,dependencies:[{kind:'Kit Definition',id:'fixture-kit'}]}});f.button(f.row('fixture_unused'),'Delete permanently').click();f.button(f.d.querySelector('dialog'),'Delete permanently').click();await f.settle();assert(f.row('fixture_unused'));assert.match(f.d.querySelector('.catalogue-dependency-notice').textContent,/fixture-kit/);assert.match(f.d.querySelector('#option-status').textContent,/Cannot delete/);assert.equal(f.calls.filter(x=>x.method==='POST').length,1);count++;await f.w.happyDOM.close();
}
{
 const f=await fixture({result:{message:'Admin membership required'},status:403});f.button(f.row('fixture_unused'),'Delete permanently').click();f.button(f.d.querySelector('dialog'),'Delete permanently').click();await f.settle();assert(f.row('fixture_unused'));assert.match(f.d.querySelector('#option-status').textContent,/Admin membership required/);assert.equal(f.button(f.row('fixture_unused'),'Delete permanently').disabled,false);count++;await f.w.happyDOM.close();
}
{
 const f=await fixture();const before=f.calls.length;f.button(f.d.body,'Refresh references').click();await f.settle();assert.equal(f.calls.length,before+1);assert.equal(f.calls.filter(x=>x.method==='POST').length,0);assert.equal(f.d.querySelectorAll('.catalogue-option-section>.admin-table-scroll').length,5);count++;await f.w.happyDOM.close();
}
console.log(JSON.stringify({manufacturerWorkflowGroups:count,result:'PASS',liveRecordsChanged:0}));
