import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {parseHTML}=createRequire(import.meta.url)(process.env.QUARTERMASTER_DOM??'linkedom');
const rootPath=resolve(process.argv[2],'admin');
const file=name=>pathToFileURL(resolve(rootPath,name));
const {mountHQ,poundsToMinor}=await import(file('quartermaster/hq.mjs'));
const {mountWorkshop}=await import(file('quartermaster/workshop.mjs'));
const {workspaceFor,adminRoutes}=await import(file('application.mjs'));

const orderId='84000000-0000-4000-8000-000000000011';
const supplier='84000000-0000-4000-8000-000000000001';
const base='https://app.example.invalid/admin/quartermaster/';
assert.equal(workspaceFor(new URL(base+'?order='+orderId)),'quartermaster');
assert.deepEqual(adminRoutes.filter(r=>r.id==='quartermaster').map(r=>[r.label,r.href]),[['QUARTERMASTER','/admin/quartermaster/']]);
assert.deepEqual(['1.23','0.01','100000','100000.01','-1','1.999','1e2',''].map(poundsToMinor),[123,1,10000000,null,null,null,null,null]);
const capabilities={pack:true,receive:true,postage:true,finance:true};
const packaging={sku:'MAILER',title:'Component mailer',inner_mm:[30,20,9],outer_mm:[34,24,13],
  tare_grams:10,available:1,reserved:1,reorder_at:2,low:true,description:'Letterbox packaging',
  latest_batch_minor:1230,latest_batch_qty:3};
const received={sku:'MAILER',title:packaging.title,supplier:'Supplier',reference:'REF-01',quantity:3,remaining:2,
  total_minor:1230,received_at:'2026-11-25T11:11:00Z'};
const job={id:orderId,reference:'AI-FIXTURE',sales_channel:'EBAY',order_day:'2026-11-25',stage:'packing',
  pack_state:'reserved',sku:'MAILER',postage_recorded:false,picked:0,required:2,finance:null};
const rows={overview:[],packaging:[packaging],purchasing:[received],choices:[packaging],queue:[job],
  suppliers:[{id:supplier,name:'Supplier',active:true,purchases:1,currency:'GBP'}],
  activity:[{kind:'reservation',happened:'2026-11-25T11:11:00Z',order_ref:'AI-FIXTURE',sku:null,quantity:null,amount:null}]};
const request=async (name,body)=>{
  if(name==='suppliers') return [{id:supplier,name:'Supplier'}];
  assert.equal(name,'hq');
  return {schema:1,mode:'workshop',capabilities,rows:rows[body.p_section],has_more:false,
    totals:{awaiting:1,packing:1,packed:0,available:1,reserved:1,low:1,purchases:[received]}};
};
function documentAt(url){
  const {document}=parseHTML('<html><body><main></main></body></html>');
  Object.defineProperty(document,'location',{value:new URL(url)});
  return document;
}
const checks={overview:'Recent packaging purchases',packaging:'Create packaging SKU',
  purchasing:'Actual total batch cost (GBP)',queue:'AI-FIXTURE',suppliers:'Manage suppliers in IRONCLAD',activity:'Packaging reserved'};
for(const [section,marker] of Object.entries(checks)){
  const document=documentAt(base+'?section='+section+'&fromOrder='+orderId);
  const root=document.querySelector('main');
  const mounted=mountHQ({document,root,request});
  for(let i=0;i<12&&!root.textContent.includes(marker);i++) await new Promise(r=>setTimeout(r,5));
  assert.ok(root.textContent.includes(marker),section+': '+root.textContent);
  assert.equal(root.querySelector('[aria-current=page]').textContent,
    ({overview:'Overview',packaging:'Packaging',purchasing:'Purchasing',queue:'Packing queue',suppliers:'Suppliers',activity:'Activity'})[section]);
  assert.ok([...root.querySelectorAll('a')].some(a=>a.textContent==='Back to this packing record'&&a.getAttribute('href').endsWith(orderId)));
  if(section==='purchasing') assert.ok(root.textContent.includes('£4.10'));
  if(section==='queue') assert.ok([...root.querySelectorAll('a')].some(a=>a.textContent==='Open packing for AI-FIXTURE'&&a.getAttribute('href').endsWith(orderId)));
  mounted.lock();
  assert.equal(root.textContent,'');
}
const document=documentAt(base+'?order='+orderId);
const root=document.querySelector('main');
const mounted=mountWorkshop({document,root,orderId,request:async()=>({schema:1,mode:'workshop',order:{
  reference:'AI-FIXTURE',generation:0,revision:0,state:'none',canReserve:true,canReceive:true,canRelease:false,canPick:false,
  canRecordPostage:false,picks:[{id:'part',title:'Component',quantity:1,picked:0}],
  materials:[{sku:'MAILER',title:'Component mailer',available:1}],batches:[],cost:{material:null,estimate:null,actual:null},parcel:null
}})});
await new Promise(r=>setTimeout(r,10));
assert.ok(root.textContent.includes('Reserve packaging'));
assert.ok(root.textContent.includes('Back to this order'));
assert.doesNotMatch(root.textContent,/Create packaging SKU|Record packaging receipt/);
assert.ok([...root.querySelectorAll('a')].some(a=>a.textContent==='Manage packaging'&&a.getAttribute('href').includes('fromOrder='+orderId)));
mounted.lock();
console.log('PASS exact built Admin navigation, six workroom panels, GBP, order context, and session cleanup');
const inspectDocument=documentAt(base+'?section=purchasing&manage=1&sku=MAILER&batch='+orderId);
const inspectRoot=inspectDocument.querySelector('main');
const record={mode:'workshop',revision:'a'.repeat(32),hasMore:false,history:[
  {action:'batch-cost',reason:'Invoice correction',at:'2026-11-25T11:11:00Z',
    after:{displaySku:'MAILER-NEW',physical:2,replacement:{reference:'CORRECTION-01'}}}
],state:{sku:'MAILER',displaySku:'MAILER-NEW',archived:false,title:'Component mailer',description:'',
 physical:2,reserved:0,batch:{id:orderId,supplier,supplierName:'Supplier',reference:'Invoice 01',received:3,remaining:2,
 totalMinor:810,usedMinor:270,usedUnits:1,receivedAt:'2026-11-25T11:11:00Z'}}};
const controls=mountHQ({document:inspectDocument,root:inspectRoot,request:async(name,args)=>{
 if(name==='detail')return record;
 return request(name,args);
}});
for(let i=0;i<12&&!inspectRoot.textContent.includes('Invoice correction');i++)await new Promise(r=>setTimeout(r,5));
assert.match(inspectRoot.textContent,/MAILER-NEW/);
assert.match(inspectRoot.textContent,/Invoice correction/);
assert.match(inspectRoot.textContent,/Correct batch cost/);
assert.match(inspectRoot.textContent,/Return to supplier/);
const select=inspectRoot.querySelector('select');
for(const option of select.querySelectorAll('option'))option.toggleAttribute('selected',option.value==='batch-cost');
select.dispatchEvent(new inspectDocument.defaultView.Event('change'));
assert.match(inspectRoot.textContent,/Corrected batch total \(GBP\)/);
assert.match(inspectRoot.textContent,/New reference for the remaining units/);
assert.match(inspectRoot.textContent,/Reason for this change/);
controls.lock();
console.log('PASS individual batch inspection, audited correction controls and conditional cost fields');
