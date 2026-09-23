import assert from 'node:assert/strict';
import {createComponentStore,storageKey} from '../dist/admin/data.mjs';
import {roles,defaultDraft,createDraftStore,calculateMaster,eligible,unitKitPrice} from '../dist/admin/wiring-kit-master/model.mjs';
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},components=createComponentStore(storage),store=createDraftStore(storage);
const initial=components.list();assert.equal(defaultDraft().basePrice,'59.99');
for(const [role,meta] of Object.entries(roles)){if(meta.category!=='other')assert(initial.some(p=>eligible(p,role)),role);}
function edit(id,patch){const old=components.list().find(p=>p.id===id);components.save({...old,...patch},id);}
edit('pot-short-cts-a',{stock:20,internalUnitCost:400,kitPrice:800});edit('sbe-200',{stock:40,internalUnitCost:100,kitPrice:100});edit('bleed-duncan',{internalUnitCost:50,kitPrice:500});
const wire=components.save({sku:'test-cloth',name:'Test cloth wire',category:'other',stock:1,stockUnit:'m',active:true,inKits:true,individually:false,internalUnitCost:200,kitPrice:null,specs:{}});
assert.equal(unitKitPrice(components.list().find(p=>p.id==='pot-short-cts-a')).price,200);assert.equal(unitKitPrice(components.list().find(p=>p.id==='bleed-duncan')).price,250);
let draft=defaultDraft();const select=(role,id,qty)=>Object.assign(draft.rows.find(r=>r.role===role),{include:true,componentId:id,quantity:String(qty)});
select('bridgePot','pot-short-cts-a',2);select('neckPot','pot-short-cts-a',2);select('bridgeCap','sbe-200',1);select('neckCap','sbe-200',1);select('bridgeBleed','bleed-duncan',1);select('neckBleed','bleed-duncan',1);select('cloth',wire.id,.5);
Object.assign(draft,{reference:'AI-TEST',channel:'EBAY',packaging:'2.00',labourRate:'20.00',labourMinutes:'30',feePercent:'10',feeFixed:'0.30'});
const before=memory.get(storageKey);let result=calculateMaster(draft,components.list());assert.equal(result.costing.partsCost,2000);assert.equal(result.costing.customerAddons,1500);assert.equal(result.costing.salePrice,7499);assert.equal(result.costing.marketplaceFee,780);assert.equal(result.costing.labourCost,1000);assert.equal(result.costing.grossProfit,4519);assert.equal(result.costing.netProfit,3519);assert.equal(result.costing.grossMargin,4519/7499*100);assert.equal(result.stock.find(p=>p.id==='pot-short-cts-a').required,4);assert.equal(result.stock.find(p=>p.id===wire.id).after,.5);assert.equal(result.kitType,'4 Pots + 2 Tone Caps + 2 Treble Bleeds');assert.equal(memory.get(storageKey),before);
store.save(draft);assert.deepEqual(createDraftStore(storage).load(),draft);
edit('pot-short-cts-a',{salePrice:99999});assert.equal(calculateMaster(draft,components.list()).costing.salePrice,7499);
edit('pot-short-cts-a',{stock:3});result=calculateMaster(draft,components.list());assert.equal(result.stock.find(p=>p.id==='pot-short-cts-a').shortfall,1);assert(result.warnings.some(w=>w.includes('insufficient')));assert.equal(components.list().find(p=>p.id==='pot-short-cts-a').stock,3);
edit('pot-short-cts-a',{internalUnitCost:null});result=calculateMaster(draft,components.list());assert.equal(result.costing.partsCost,null);assert.equal(result.costing.netProfit,null);assert.equal(result.costing.salePrice,7499);
edit('sbe-200',{kitPrice:null});assert.equal(calculateMaster(draft,components.list()).costing.salePrice,null);
edit('sbe-200',{kitPrice:100});edit('pot-short-cts-a',{internalUnitCost:400});
const push=components.save({sku:'test-push',name:'Independent push/pull',category:'potentiometers',stock:2,active:true,inKits:true,individually:false,internalUnitCost:500,kitPrice:0,specs:{Type:'Push/Pull'}});select('neckPot',push.id,2);result=calculateMaster(draft,components.list());assert.equal(result.kitType,'2 Pots + 2 Push/Pull + 2 Tone Caps + 2 Treble Bleeds');assert.equal(result.lines.find(l=>l.role==='bridgePot').componentId,'pot-short-cts-a');assert.equal(result.lines.find(l=>l.role==='neckPot').componentId,push.id);
edit(push.id,{active:false});assert(calculateMaster(draft,components.list()).warnings.some(w=>w.includes('not eligible')));
const zero=defaultDraft();zero.basePrice='0';const c=calculateMaster(zero,components.list()).costing;assert.equal(c.grossMargin,null);assert.equal(c.netMargin,null);assert.equal(c.marketplaceFee,0);
assert.throws(()=>calculateMaster({...draft,labourMinutes:'-1'},components.list()));assert.throws(()=>calculateMaster({...draft,feePercent:'101'},components.list()));
const corrupt={getItem:()=>'{broken',setItem:()=>assert.fail()};assert.throws(()=>createDraftStore(corrupt).load(),/not been reset/);
console.log('Master: dynamic roles, independent neck/bridge, typed kit summary, quantities, cost/add-on separation, central base, fees, packaging, labour, profit/margins, shared stock aggregation, shortfalls without deductions, decimal metres and draft persistence passed.');
