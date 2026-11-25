import {money,pence,statistics,toOhms,resistance,matchUnits,measuredToleranceBp,allocateShared,purchaseLineCosts} from './model.mjs';
const names={inventory:'Inventory Command',suppliers:'Suppliers',purchases:'Procurement',batches:'Acquisition batches',measurements:'Measurements',sets:'Matched sets',stocktakes:'Stocktake',movements:'Movements',costs:'Order cost evidence'};
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const group=(...children)=>{const d=el('div',null,'form-grid');d.append(...children);return d;};
const field=(label,{type='text',value='',required=false,options,inputMode,max=300}={})=>{
 const wrap=el('label',label),i=el(options?'select':'input');i.setAttribute('aria-label',label);
 if(options)for(const [k,t] of options){const o=el('option',t);o.value=k;i.append(o);}
 else{i.type=type;i.maxLength=max;if(inputMode)i.inputMode=inputMode;}
 if(type==='checkbox')i.checked=Boolean(value);else i.value=value??'';
 i.required=required;wrap.append(i);return {wrap,i,value:()=>type==='checkbox'?i.checked:i.value};
};
const button=(text,fn,primary=false)=>{const b=el('button',text,primary?'primary':'');b.type='button';b.addEventListener('click',fn);return b;};
const section=(title,text)=>{const s=el('section');s.append(el('h2',title));if(text)s.append(el('p',text));return s;};
const actions=(...children)=>{const x=el('div',null,'actions');x.append(...children);return x;};
function table(headers,rows,empty='No matching records.'){
 const w=el('div',null,'table-wrap');if(!rows.length){w.append(el('p',empty));return w;}
 w.tabIndex=0;w.setAttribute('role','region');w.setAttribute('aria-label','Scrollable records');
 const t=el('table'),thead=el('thead'),head=el('tr'),body=el('tbody');for(const h of headers){const th=el('th',h);th.scope='col';head.append(th);}
 thead.append(head);t.append(thead,body);
 for(const values of rows){const tr=el('tr');for(const v of values){const td=el('td');if(v instanceof Node)td.append(v);else td.textContent=v??'Unknown';tr.append(td);}body.append(tr);}
 w.append(t);return w;
}
const int=(n,lo=0,hi=9007199254740991)=>{if(!/^\d+$/.test(String(n))||!Number.isSafeInteger(+n)||+n<lo||+n>hi)throw Error('Enter a valid whole quantity.');return +n;};
const qtyText=n=>Number(n||0).toLocaleString('en-GB');
export function mountArmoury(root,repository,{fixture=false}={}){
 let view='inventory',offset=0,filter={},request,epoch=0,ended=false,pendingId=null,mutation=false;
 const head=el('header',null,'top'),identity=el('div'),nav=el('nav'),note=el('p',null,'badge'),status=el('p'),area=el('div');
 const title=el('h1','IRONCLAD: The Armoury');identity.append(el('p','COMMAND / NOCTURNE','kicker'),title,el('p','Procurement, precision matching and acquisition evidence.'));
 head.append(identity);
 if(fixture){note.textContent='Protected preview · fictional records · browser-local changes only';head.append(note);}
 else{const a=el('a','Return to Inventory');a.href='/admin/';head.append(a);}
 nav.setAttribute('aria-label','Armoury workspaces');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 root.replaceChildren(head,nav,status,area);
 const buttons={};for(const [key,label] of Object.entries(names)){const b=button(label,()=>go(key));buttons[key]=b;nav.append(b);}
 const message=(value,error=false)=>{status.textContent=value;status.classList.toggle('error',error);};
 const report=e=>message(e instanceof Error?e.message:String(e),true);
 async function write(op,body,label,follow){
  if(mutation||ended)return;mutation=true;
  const stable=JSON.stringify([op,body]);
  if(!pendingId||pendingId.stable!==stable)pendingId={stable,id:crypto.randomUUID()};
  for(const b of area.querySelectorAll('button'))b.disabled=true;
  try{
   const result=await repository.write(pendingId.id,op,body);
   if(ended)return;
   pendingId=null;
   if(follow)await follow(result);else await refresh(true);
   if(!ended)message(label+(result.replayed?' Existing receipt returned.':''));
  }catch(e){if(!ended)report(e);}
  finally{mutation=false;for(const b of area.querySelectorAll('button'))b.disabled=false;}
 }
 function form(title,description,fields,submit,callback){
  const f=el('form');f.append(el('h2',title));if(description)f.append(el('p',description));
  f.append(group(...fields.map(x=>x.wrap)));
  const save=el('button',submit,'primary');save.type='submit';f.append(actions(save));
  f.addEventListener('submit',event=>{event.preventDefault();if(mutation)return;try{Promise.resolve(callback()).catch(report);}catch(e){report(e);}});
  return f;
 }
 function go(name,params={}){view=name;filter=params;offset=0;return refresh();}
 const read=(name,p,signal=request.signal)=>repository.read(name,p,signal);
 async function refresh(quiet=false){
  if(ended)return;request?.abort();request=new AbortController();const ticket=++epoch,signal=request.signal;
  for(const [k,b] of Object.entries(buttons))k===view?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
  area.replaceChildren(el('p','Loading '+names[view]+'…'));if(!quiet)message('');
  try{
   const render=renderers[view],result=await render(signal,filter);
   if(ticket!==epoch||ended)return;
   area.replaceChildren(...result);
  }catch(e){if(!signal.aborted&&ticket===epoch){area.replaceChildren(el('p','This workspace is unavailable.'));report(e);area.append(button('Try again',()=>refresh()));}}
 }
 const pager=rows=>actions(...(offset>0?[button('Previous page',()=>{offset=Math.max(0,offset-25);refresh();})]:[]),
 ...(rows.length===25?[button('Next page',()=>{offset+=25;refresh();})]:[]),el('small','Page '+(offset/25+1)));
 const defaultPage=p=>({...p,limit:25,offset});
 const supplierOptions=async signal=>[['','Select a supplier'],...(await read('suppliers',{limit:100},signal)).filter(s=>s.active).map(s=>[s.id,s.name])];
 const renderers={
 async inventory(signal,p){
  const rows=await read('inventory',defaultPage(p),signal),box=section('Inventory overview','Physical is the existing stock count. Available is physical less holds, committed sets and quality exclusions. Incoming stock has not arrived.');
  const totals=el('div',null,'metrics');for(const [label,x] of [['Available',rows.reduce((n,r)=>n+Number(r.available),0)],['Physical',rows.reduce((n,r)=>n+Number(r.physical),0)],['Incoming',rows.reduce((n,r)=>n+Number(r.incoming),0)],['Reconcile',rows.filter(r=>r.reconciliation).length]]){
   const b=el('div');b.append(el('span',label+' (page)'),el('b',qtyText(x)));totals.append(b);
  }
  const q=field('Search components',{value:p.q}),cat=field('Category',{value:p.category}),stock=field('Stock status',{value:p.status,options:[['','All stock'],['low','Low stock'],['out','Out of stock'],['incoming','Incoming'],['reconciliation','Needs reconciliation']]}),supplier=field('Supplier ID',{value:p.supplierId}),batch=field('Batch ID',{value:p.batchId}),measured=field('Measured only',{type:'checkbox',value:p.measured});
  box.append(form('Find stock','',[q,cat,stock,supplier,batch,measured],'Apply filters',()=>go('inventory',Object.fromEntries(Object.entries({q:q.value(),category:cat.value(),status:stock.value(),supplierId:supplier.value(),batchId:batch.value(),measured:measured.value()}).filter(([,v])=>v)))),totals);
  box.append(table(['Component','Physical','Available','Reserved / allocated / held','Incoming','Reorder','Known value','Inspect'],rows.map(r=>[
   r.name+' · '+r.sku+' · '+r.stock_unit,qtyText(r.physical),qtyText(r.available),[r.reserved,r.allocated,r.quality_held].map(qtyText).join(' / '),qtyText(r.incoming),r.suggested??'Not set',
   r.known_value_minor==null?'Unknown':money(r.known_value_minor)+' · '+qtyText(r.known_units)+' covered',
   actions(button('Batches',()=>go('batches',{componentId:r.component_id})),button('Movements',()=>go('movements',{componentId:r.component_id})),
   button('Count and stock rules',()=>inventoryDetail(box,r)))])),pager(rows));return [box];
 },
 async suppliers(signal,p){
  const rows=await read('suppliers',defaultPage(p),signal),box=section('Supplier register','Keep supplier references and contacts separate from catalogue identities. Archived suppliers retain their purchasing history.');
  const name=field('Supplier name',{required:true}),ref=field('Supplier reference'),site=field('Website',{type:'url'}),contact=field('Contact'),location=field('Location'),currency=field('Default currency',{value:'GBP',required:true,max:3}),notes=field('Supplier notes'),q=field('Find supplier',{value:p.q});
  box.append(form('Add supplier','',[name,ref,site,contact,location,currency,notes],'Create supplier',()=>write('supplier',{name:name.value(),reference:ref.value(),site:site.value(),contact:contact.value(),location:location.value(),currency:currency.value().toUpperCase(),notes:notes.value()},'Supplier created.')),
   form('Search suppliers','',[q],'Search',()=>go('suppliers',{q:q.value()})),
   table(['Name / ID','Reference / website','Contact / region','Currency','Purchases','Status','Actions'],rows.map(r=>[
    r.name+' · '+r.id,r.reference+' '+r.site,r.contact+' '+r.location,r.currency,r.purchase_count,r.active?'Active':'Archived',
    actions(button('Purchase history',()=>go('purchases',{supplierId:r.id})),...(r.active?[button('Archive',()=>write('supplierArchive',{id:r.id},'Supplier archived. Purchase history kept.'))]:[]))])),pager(rows));return [box];
 },
 async purchases(signal,p){
  const [rows,suppliers,allSuppliers]=await Promise.all([read('purchases',defaultPage(Object.fromEntries(Object.entries(p).filter(([k])=>!['editor','draftId'].includes(k)))),signal),supplierOptions(signal),read('suppliers',{limit:100},signal)]);
  const box=section('Purchase orders',p.editor?'Review the cost before saving.':'Keep track of what was ordered, what has arrived and what it cost.');
  if(p.editor){
   const draft=p.draftId?rows.find(x=>x.id===p.draftId)||(await read('purchases',{id:p.draftId,limit:1},signal))[0]:null;
   if(p.draftId&&(!draft||draft.state!=='draft'))throw Error('This purchase is no longer an editable draft.');
   const [lines,choices]=await Promise.all([draft?read('purchaseLines',{id:draft.id},signal):[],read('purchaseChoices',{limit:25,supplierId:draft?.supplier_id},signal)]);
   box.append(actions(button('Back to purchases',()=>go('purchases'))),purchaseForm(suppliers,choices,allSuppliers,{draft,lines,quick:p.editor==='quick'}));
   return [box];
  }
  const q=field('Search purchases',{type:'search',value:p.q,inputMode:'search'}),supplier=field('Filter by supplier',{value:p.supplierId,options:[['','All suppliers'],...allSuppliers.map(s=>[s.id,s.name+(s.active?'':' (archived)')])]}),
    state=field('Purchase status',{value:p.status,options:[['','All statuses'],['draft','Draft'],['ordered','Ordered'],['partial','Partially received'],['received','Received'],['cancelled','Cancelled']]});
  const toolbar=el('form',null,'purchase-toolbar'),submit=el('button','Filter');submit.type='submit';
  toolbar.append(q.wrap,supplier.wrap,state.wrap,submit);
  toolbar.addEventListener('submit',e=>{e.preventDefault();go('purchases',Object.fromEntries(Object.entries({q:q.value(),supplierId:supplier.value(),status:state.value()}).filter(([,v])=>v)));});
  box.append(actions(button('New purchase order',()=>go('purchases',{editor:'new'}),true),button('Quick stock purchase',()=>go('purchases',{editor:'quick'}))),toolbar);
  box.append(table(['Purchase reference','Date','Supplier','Status','Ordered / received','Landed total','Actions'],rows.map(r=>[r.reference,r.purchase_date||'Date not recorded',r.supplier,r.state,
   qtyText(r.ordered_qty)+' / '+qtyText(r.received_qty),money(r.total_minor),actions(
   r.state==='draft'?button('Edit draft',()=>go('purchases',{editor:'edit',draftId:r.id})):button('Review purchase',()=>purchaseDetail(box,r)),
   ...(r.state==='draft'?[button('Mark ordered',()=>write('purchaseState',{id:r.id,state:'ordered'},'Purchase marked as ordered.'))]:[]),
   ...(['draft','ordered'].includes(r.state)?[button('Cancel purchase',()=>{if(confirm('Cancel this unreceived purchase? Physical stock will not change.'))write('purchaseState',{id:r.id,state:'cancelled'},'Unreceived purchase cancelled.');})]:[]))])),pager(rows));return [box];
 },
 async batches(signal,p){
  const rows=await read('batches',defaultPage(p),signal),box=section('Acquisition batches','Opening stock and external increases retain an unknown cost unless separately evidenced. Receipt costs are fixed at acquisition.');
  const c=field('Component ID',{value:p.componentId});
  box.append(form('Find a batch','',[c],'Find batches',()=>go('batches',c.value()?{componentId:c.value()}:{})),
   table(['Batch / lot','Component / supplier part','Received / on hand','Landed unit cost','References','Next step'],rows.map(r=>[
   r.id+(r.lot?' · '+r.lot:''),r.component_id+(r.part_no?' · '+r.part_no:''),qtyText(r.quantity)+' / '+qtyText(r.remaining),
   r.cost_minor==null?'Unknown':'£'+(r.cost_minor/r.quantity/100).toFixed(4),
   [r.origin,r.purchase_ref,r.receipt_ref,r.supplier].filter(Boolean).join(' · '),
   actions(button('Measure this batch',()=>go('measurements',{batchId:r.id,componentId:r.component_id})),button('Print batch label',()=>printLabel(box,[r.component_id,r.id,r.lot||'No manufacturer lot'])),
    ...(r.origin==='opening'&&r.cost_minor==null?[button('Record opening cost',()=>openingCost(box,r))]:[]))
   ])),pager(rows));return [box];
 },
 async measurements(signal,p){
  const box=section('Precision measurements','Enter sequential kΩ readings. Outliers are flagged for review only; the measurement does not reject stock.');
  const batch=field('Batch ID',{value:p.batchId,required:true});
  box.append(form('Open a batch','',[batch],'Open measurements',()=>go('measurements',{batchId:batch.value(),componentId:p.componentId})));
  if(!p.batchId)return [box];
  const rows=await read('measurements',{batchId:p.batchId,limit:100},signal),stats=statistics(rows);
  const nominal=field('Nominal kΩ',{value:rows[0]?.nominal_ohm/1000||'500',required:true}),taper=field('Taper',{value:rows[0]?.taper||'A',required:true}),shaft=field('Shaft / specification',{value:rows[0]?.shaft||'Short split',required:true}),start=field('Starting slot',{value:String(Math.max(0,...rows.map(x=>x.slot))+1),required:true,inputMode:'numeric'}),tol=field('Nominal tolerance (%)',{value:'10',inputMode:'decimal'}),reading=field('Measured kΩ',{inputMode:'decimal'}),quality=field('Quality decision',{value:'accepted',options:[['accepted','Accepted'],['quarantine','Quarantine'],['rejected','Rejected']]});
  let staged=[];const preview=el('ol');
  function queue(){const ohm=toOhms(reading.value()),slot=int(start.value(),1,1000000)+staged.length;staged.push({slot,ohm,quality:quality.value()});preview.append(el('li','Slot '+slot+' · '+resistance(ohm)+' · '+quality.value()));reading.i.value='';reading.i.focus();}
  reading.i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();try{queue();}catch(error){report(error);}}});
  const f=form('Measurement bench','Each Enter queues one reading and keeps the cursor in the input.',[nominal,taper,shaft,start,reading,quality],'Save verified readings',
   ()=>{if(reading.value().trim())queue();if(!staged.length)throw Error('Add at least one reading.');return write('measure',{batchId:p.batchId,nominalOhm:toOhms(nominal.value()),taper:taper.value(),shaft:shaft.value(),units:staged},'Measurements saved.');});
  f.append(actions(button('Queue reading',()=>{try{queue();}catch(e){report(e);}}),button('Clear queued readings',()=>{staged=[];preview.replaceChildren();})),preview);
  if(stats)box.append(el('p',stats.count+' readings in this window · Min '+resistance(stats.min)+' · Max '+resistance(stats.max)+' · Average '+resistance(stats.mean)+' · Distribution: '+stats.distribution.join(' / ')));
  const readings=el('div');
  function paint(){const threshold=Number(tol.value());readings.replaceChildren(table(['Unit / slot','Resistance','Nominal deviation','Quality / allocation','Label'],rows.map(r=>{
   const pct=100*(r.resistance_ohm-r.nominal_ohm)/r.nominal_ohm;
   return [r.id+' · '+r.slot,resistance(r.resistance_ohm),pct.toFixed(2)+'%'+(Math.abs(pct)>threshold?' · Review outlier':''),r.quality+(r.allocated?' · Allocated':''),button('Print unit label',()=>printLabel(box,[r.component_id,r.id,resistance(r.resistance_ohm),r.batch_id]))];
  })));}tol.i.addEventListener('input',paint);paint();
  box.append(f,group(tol.wrap),readings,actions(button('Find matched sets',()=>go('sets',{batchId:p.batchId,componentId:p.componentId||rows[0]?.component_id}))));return [box];
 },
 async sets(signal,p){
  const box=section('Matched sets','Recommendations are proposals. Commit a set only after checking the physical labels. Commitments are limited to isolated bench stock.');
  const batch=field('Batch for matching',{value:p.batchId}),component=field('Component ID',{value:p.componentId}),size=field('Set size',{value:'2',options:[['2','Pairs'],['4','Quartets']]}),objective=field('Matching objective',{value:'maximum',options:[['best','Smallest full spread'],['maximum','Most non-overlapping sets']]}),tolerance=field('Maximum full spread (%) (optional)',{inputMode:'decimal'}),result=el('div');
  box.append(form('Matching bench','Uses up to 100 readings. Full spread is the difference between the highest and lowest readings divided by the lowest. Leave the maximum blank to see recommendations within the 20% bench limit.',[batch,component,size,objective,tolerance],'Generate matches',async()=>{
   if(!batch.value()&&!component.value())throw Error('Choose a batch or component.');
   const x=await read('measurements',{...(batch.value()?{batchId:batch.value()}:{componentId:component.value()}),limit:100});
   const bp=tolerance.value().trim()?pence(tolerance.value()):2000;
   const matches=matchUnits(x,{size:+size.value(),toleranceBp:bp,objective:objective.value()});
   result.replaceChildren(table(['Members','Absolute spread','Full spread','Average / deviation','Allocated cost basis','Commit'],matches.map(m=>[
    m.units.map(u=>resistance(u.resistance_ohm)+' (slot '+u.slot+')').join(', '),m.abs+' Ω',m.spread.toFixed(3)+'%',resistance(m.avg)+' / '+m.nominalDeviation.toFixed(2)+'%',money(m.costMinor),
    button('Commit set',()=>write('allocate',{componentId:m.units[0].component_id,toleranceBp:measuredToleranceBp(m),unitIds:m.units.map(u=>u.id)},'Bench set allocated. Physical stock unchanged.',()=>go('sets',{componentId:m.units[0].component_id,batchId:batch.value()})))
   ]),'No compatible set found. Check the selected readings and any maximum spread.'));
  }),result);
  const rows=await read('sets',defaultPage(p.componentId?{componentId:p.componentId}:{}),signal);
  box.append(table(['Set','Component','Units','State','Release'],rows.map(r=>[r.id,r.component_id,r.units?.map(u=>resistance(u.ohm)).join(' · '),r.state,
   r.state==='allocated'?button('Review release',()=>{const reason=field('Release reason',{required:true});box.append(form('Release committed set','Only an unreserved bench set can be released.',[reason],'Release set',()=>write('release',{id:r.id,reason:reason.value()},'Set released.')));}):'Released'])),pager(rows));return [box];
 },
 async stocktakes(signal,p){
  const box=section('Stocktakes','Choose specific IDs, or load up to 50 components from a category. A later movement invalidates the affected stocktake rather than overwriting new stock.');
  const c=field('Component IDs (comma separated)',{value:p.componentIds}),category=field('Or category'),reason=field('Stocktake reason',{required:true});
  box.append(form('Open a stocktake','',[c,category,reason],'Capture expected quantities',async()=>{
   const ids=c.value().split(',').map(x=>x.trim()).filter(Boolean);
   if(!ids.length&&category.value()){const x=await read('inventory',{category:category.value(),limit:51});if(x.length>50)throw Error('Narrow scope to 50 components.');ids.push(...x.map(v=>v.component_id));}
   if(!ids.length)throw Error('Choose components or a category.');
   return write('stocktakeOpen',{componentIds:ids,reason:reason.value()},'Stocktake opened.',r=>go('stocktakes',{id:r.id}));
  }));
  const rows=await read('stocktakes',defaultPage({}),signal);box.append(table(['Record','Reason','State','Inspect'],rows.map(r=>[r.id,r.reason,r.state,button('Review count',()=>go('stocktakes',{id:r.id}))])),pager(rows));
  if(p.id){
   const lines=await read('stocktakeLines',{id:p.id},signal);
   if(lines.length){const fields=lines.map(l=>field('Count for '+l.component_id,{required:true,value:l.counted??l.expected,inputMode:'numeric'})),why=field('Correction reason',{required:true}),confirm=field('I reviewed and confirm these counts',{type:'checkbox'});
    box.append(table(['Component','Expected','Counted','Count validity'],lines.map(l=>[l.name,l.expected,l.counted??'Pending',l.stale?'New movement since capture':'Current'])));
    if(lines.every(l=>l.counted==null))box.append(form('Apply reviewed corrections','Saving applies only explicitly confirmed counts. The record is retained.',[...fields,why,confirm],'Apply stocktake',()=>write('stocktakeApply',{id:p.id,counts:Object.fromEntries(lines.map((l,i)=>[l.component_id,int(fields[i].value())])),reason:why.value(),confirmed:confirm.value()},'Stocktake applied.')));
   }
  }return [box];
 },
 async costs(signal,p){
  const box=section('BLACK LEDGER ECLIPSE · Cost evidence','A batch link is not a sale or a stock adjustment. Cost evidence does not change an existing financial record; review it in the financial draft.');
  const order=field('Order ID',{value:p.orderId||'',required:true}),line=field('Order line index (starts at 0)',{value:'0',required:true,inputMode:'numeric'}),
   batch=field('Acquisition batch ID',{required:true}),basis=field('Attribution basis',{value:'allocated_batch',options:[['allocated_batch','Allocated accounting basis, not physical proof'],['verified_physical_trace','Verified physical batch trace']]}),
   proof=field('Evidence reference',{required:true}),result=el('div');
  box.append(form('Find recorded acquisition costs','',[order],'Load order cost evidence',async()=>{
   try{
    const rows=await repository.readCosts(order.value(),signal);
    result.replaceChildren(table(['Line','Batch','Quantity','Landed cost','Attribution'],rows.map(r=>[r.line_index,r.batch_id,r.quantity,money(r.line_cost_minor),r.basis==='verified_physical_trace'?'Verified physical batch trace':'Allocated batch estimate']),'No acquisition evidence recorded.'));
   }catch(e){report(e);}
  }),result,form('Record one fulfilled component line','Provide the order-to-batch evidence. Unsupported assemblies and unpaid orders are rejected.',
   [line,batch,basis,proof],'Record verified evidence',()=>write('recordCost',{orderId:order.value(),lineIndex:int(line.value(),0,249),batchId:batch.value(),basis:basis.value(),evidence:proof.value()},'Acquisition evidence recorded. BLACK LEDGER was not changed.')));
  if(fixture)box.append(el('p','Example: enter fixture-order-001 above and load the fictional 2-unit batch cost. Real finance documents are not accessed.'));
  return [box];
 },
 async movements(signal,p){
  const box=section('Stock movement history','Existing stock changes are recorded without claiming order or physical batch attribution. Reservations and set commitments do not deduct physical quantity.');
  const c=field('Component ID',{value:p.componentId,required:true});
  box.append(form('Find movements','',[c],'Load movements',()=>go('movements',{componentId:c.value()})));
  if(p.componentId){const rows=await read('movements',defaultPage({componentId:p.componentId}),signal);box.append(table(['Kind','Previous','Delta','Result','Reason / source','Time'],rows.map(r=>[r.kind,r.previous,r.delta,r.resulting,r.reason+(r.source?' · '+r.source:''),new Date(r.created_at).toLocaleString('en-GB')])),pager(rows));}return [box];
 }
 };
 function inventoryDetail(box,r){
  box.querySelector('[data-inventory-detail]')?.remove();const s=section('Stock settings · '+r.sku,'Whole-item counts only. For discrepancies use a stocktake and keep the reason.');
  s.dataset.inventoryDetail='true';const low=field('Low-stock threshold',{value:r.low??0}),target=field('Target stock',{value:r.target??0}),count=field('New physical quantity',{value:r.physical}),reason=field('Adjustment reason',{required:true}),kind=field('Adjustment type',{value:'adjustment',options:[['adjustment','Manual adjustment'],['damage','Damage or loss'],['return','Authorised return']]});
  s.append(form('Reorder thresholds','',[low,target],'Save thresholds',()=>write('threshold',{componentId:r.component_id,low:int(low.value()),target:int(target.value())},'Thresholds saved.')),
   form('Correct physical count','',[count,kind,reason],'Save adjustment',()=>write('adjust',{componentId:r.component_id,expected:r.physical,expectedRevision:r.revision,quantity:int(count.value()),reason:reason.value(),kind:kind.value()},'Audited stock adjustment saved.')),
   actions(button('Open stocktake',()=>go('stocktakes',{componentIds:r.component_id}))));
  box.append(s);s.scrollIntoView({block:'nearest'});
 }
 function purchaseForm(suppliers,initialChoices,allSuppliers,{draft,lines,quick}){
  const formatInput=n=>n==null?'':(n/100).toFixed(2),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const supplier=field('Supplier',{required:true,options:suppliers,value:draft?.supplier_id||''}),reference=field(quick?'Reference (optional)':'Purchase reference',{required:!quick,value:draft?.reference}),
   date=field(quick?'Purchase or receipt date':'Purchase date',{type:'date',value:draft?.purchase_date||today,required:true}),currency=field('Purchase currency',{value:draft?.currency||'GBP',max:3,required:true}),
   evidence=field('Actual GBP conversion evidence',{value:draft?.evidence}),method=field('Shared cost allocation',{value:draft?.method||'quantity',options:[['quantity','By quantity (default)'],['value','By GBP line value'],['manual','Enter amounts manually']]}),
   notes=field('Purchase notes (optional)',{value:draft?.notes,max:300}),
   charges=Object.entries({freight:'Supplier postage (GBP)',duty:'Import duty (GBP)',nonRecoverableTax:'Non-recoverable taxes (GBP)',extra:'Existing other acquisition costs (GBP)',credit:'Supplier credits (GBP)'}).map(([k,t])=>[k,field(t,{inputMode:'decimal',value:formatInput(draft?.charges?.[k])})]);
  const standardCharges=charges.slice(0,3).map(([,input])=>input);
  const legacyCharge=charges.find(([key])=>key==='extra')[1];
  legacyCharge.i.readOnly=true;
  const supplierCredit=charges.find(([key])=>key==='credit')[1];
  const staged=[],lineContainer=el('div',null,'purchase-lines'),basis=el('p',null,'cost-summary');basis.setAttribute('role','status');
  const hidden=(f,hide)=>{f.wrap.hidden=hide;f.i.disabled=hide;};
  const code=()=>currency.value().trim().toUpperCase();
  const currencyFormat=n=>code()==='GBP'?money(n):String((n/100).toFixed(2))+' '+code();
  const defaultChoice=({component_id,name,sku})=>[component_id,(sku?sku+' · ':'')+name];
  function addLine(l={}){
   if(staged.length>=30)return;
   const row=el('fieldset'),legend=el('legend','Component'),search=field('Search components',{type:'search',max:100}),choice=field('Purchased component',{required:true,options:[['','Choose a component']]}),
    part=field('Supplier part number',{value:l.part_no,max:100}),quantity=field(quick?'Received quantity':'Quantity',{required:true,value:String(l.quantity||1),inputMode:'numeric'}),
    unit=field('Supplier unit price (purchase currency)',{required:true,inputMode:'decimal',value:formatInput(l.supplier_unit_minor)}),
    gbp=field('Actual component line total (GBP, excluding shared costs)',{inputMode:'decimal',value:formatInput(l.merchandise_minor)}),
    manual=field('Manual shared allocation (GBP)',{inputMode:'decimal',value:formatInput(l.allocation_minor)}),lineTotal=el('p',null,'line-total');
   let optionRows=initialChoices;
   function setChoices(values,choose=l.component_id){
    const current=values.find(x=>x.component_id===choose)||optionRows.find(x=>x.component_id===choose)||(choose&&l.name?{component_id:choose,name:l.name}:null);
    const rows=current&&!values.some(x=>x.component_id===choose)?[current,...values]:values;
    optionRows=rows;choice.i.replaceChildren();
    for(const [id,text] of [['','Choose a component'],...rows.map(defaultChoice)]){const o=el('option',text);o.value=id;choice.i.append(o);}
    if(choose&&rows.some(x=>x.component_id===choose))choice.i.value=choose;
   }
   async function searchChoices(){
    const term=search.value().trim();
    const next=await read('purchaseChoices',{q:term,limit:25,supplierId:supplier.value()||undefined});
    setChoices(next,choice.value());if(!choice.value()&&next.length===1){choice.i.value=next[0].component_id;setPart();}
    if(next.length===0)lineTotal.textContent='No components match that search.';
   }
   async function setPart(){
    const value=choice.value(),supplierId=supplier.value(),chosen=optionRows.find(x=>x.component_id===value);
    part.i.value=chosen?.part_no||'';paint();
    if(chosen&&supplierId&&!part.value())try{
     const choices=await read('purchaseChoices',{q:chosen.sku||chosen.name,limit:10,supplierId});
     if(choice.value()===value&&supplier.value()===supplierId&&!part.value())part.i.value=choices.find(x=>x.component_id===value)?.part_no||'';
    }catch(e){if(e.name!=='AbortError')report(e);}
   }
   choice.i.addEventListener('change',setPart);
   search.i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchChoices().catch(report);}});
   setChoices(initialChoices,l.component_id);
   const item={choice,part,quantity,unit,gbp,manual,lineTotal};staged.push(item);
   const info=el('details');info.append(el('summary','Supplier part and line overrides'),group(part.wrap,manual.wrap));
   row.append(legend,group(search.wrap,choice.wrap,quantity.wrap,unit.wrap,gbp.wrap),actions(button('Find components',()=>searchChoices().catch(report)),button('Remove line',()=>{if(staged.length>1){staged.splice(staged.indexOf(item),1);row.remove();paint();}})),info,lineTotal);
   lineContainer.append(row);paint();
  }
  function values(requireSelected=false){
   const cur=code(),charge=Object.fromEntries(charges.map(([k,f])=>[k,pence(f.value())])),foreign=cur!=='GBP';
   if(requireSelected&&(!/^[A-Z]{3}$/.test(cur)||foreign&&evidence.value().trim().length<5))throw Error('Record the actual GBP conversion and evidence for this purchase.');
   const d=staged.map(l=>({componentId:l.choice.value(),partNo:l.part.value(),quantity:int(l.quantity.value(),1,100000),unitMinor:pence(l.unit.value()),
    ...(foreign?{gbpMinor:l.gbp.value().trim()?pence(l.gbp.value()):null}:{}),
    ...(method.value()==='manual'?{allocationMinor:pence(l.manual.value(),{signed:true})}:{})}));
   if(requireSelected&&d.some(l=>!l.componentId||l.gbpMinor===null))throw Error('Choose each component and enter each converted total.');
   return {supplierId:supplier.value(),reference:reference.value(),date:date.value(),notes:notes.value(),currency:cur,evidence:foreign?evidence.value():'',method:method.value(),charges:charge,lines:d};
  }
  function paint(){
   const foreign=code()!=='GBP';hidden(evidence,!foreign);
   for(const l of staged){hidden(l.gbp,!foreign);hidden(l.manual,method.value()!=='manual');}
   try{
    const d=values(),value=d.lines.map(l=>foreign?l.gbpMinor:l.quantity*l.unitMinor);
    const extras=Object.entries(d.charges).reduce((n,[k,v])=>n+(k==='credit'?-v:v),0);
    for(const [i,l] of staged.entries()){
     l.lineTotal.textContent='Supplier component subtotal: '+currencyFormat(d.lines[i].quantity*d.lines[i].unitMinor);
    }
    if(value.some(v=>v==null)){basis.textContent='Enter the actual GBP amounts to see the landed total.';return;}
    const shares=d.method==='manual'?d.lines.map(l=>l.allocationMinor):allocateShared(extras,d.method==='value'?value:d.lines.map(l=>l.quantity));
    if(shares.reduce((a,b)=>a+b,0)!==extras||shares.some((n,i)=>n+value[i]<0))throw Error('Review the allocation. Shared costs must reconcile and no line can be negative.');
    for(const [i,l] of staged.entries()){
     const c=purchaseLineCosts(value[i],shares[i],d.lines[i].quantity);
     l.lineTotal.textContent+=' · GBP component total: '+money(c.merchandise)
      +' ('+c.merchandiseUnit+' each) · Shared allocation: '+money(c.allocation)
      +' · Landed total: '+money(c.landed)+' ('+c.landedUnit+' each)';
    }
    basis.textContent='Total purchase expenditure: '+money(value.reduce((a,b)=>a+b,extras))
     +(extras?' · Total shared costs after credits: '+money(extras):'');
   }catch(e){basis.textContent=e.message;}
  }
  const f=form(draft?'Edit purchase draft':quick?'Quick stock purchase':'New purchase order',
   quick?'Record stock that has already arrived. This saves the purchase, receipt and stock movement together.':'Create a draft. Saving it does not add stock.',
   [supplier,reference,date,currency,...standardCharges,notes,evidence],draft?'Save draft changes':quick?'Record purchase and receive stock':'Save purchase draft',()=>{
    const payload=values(true);
    return write(draft?'purchaseEdit':quick?'quickPurchase':'purchase',draft?{...payload,id:draft.id,revision:draft.revision}:payload,
     draft?'Purchase draft updated.':quick?'Purchase recorded and stock received.':'Purchase draft created.',()=>go('purchases'));
  });
  const footer=f.querySelector('.actions'),advanced=el('details',null,'purchase-advanced');
  advanced.append(el('summary','Advanced allocation and corrections'),
   group(method.wrap,supplierCredit.wrap,...(draft?.charges?.extra?[legacyCharge.wrap]:[])));
  if(draft?.method==='manual'||draft?.charges?.credit||draft?.charges?.extra)advanced.open=true;
  f.insertBefore(lineContainer,footer);f.insertBefore(actions(button('Add purchase line',()=>addLine())),footer);f.insertBefore(advanced,footer);f.insertBefore(basis,footer);
  supplier.i.addEventListener('change',()=>{const entry=allSuppliers.find(x=>x.id===supplier.value());if(entry)currency.i.value=entry.currency;paint();});
  f.addEventListener('input',paint);f.addEventListener('change',paint);
  for(const line of lines.length?lines:[{}])addLine(line);
  return f;
 }
 async function purchaseDetail(box,r){
  try{
   const items=await read('purchaseLines',{id:r.id});box.querySelector('[data-purchase-detail]')?.remove();
   const s=section('Purchase '+r.reference,'Landed total '+money(r.total_minor)+' · '+r.method+' allocation · '+(r.evidence||'GBP purchase'));
   s.dataset.purchaseDetail='true';
   s.append(table(['Component / supplier part','Ordered','Received','Merchandise GBP','Shared GBP'],items.map(l=>[l.name+' · '+l.part_no,l.quantity,l.received,money(l.merchandise_minor),money(l.allocation_minor)])));
   if(['ordered','partial'].includes(r.state)){
    const ref=field('Delivery receipt reference',{required:true}),notes=field('Receipt notes'),lineFields=items.filter(l=>l.quantity>l.received).map(l=>({l,q:field('Receive quantity for '+l.component_id,{value:'0',required:true}),lot:field('Manufacturer lot for '+l.component_id)}));
    s.append(form('Receive delivery','Repeat receipt references are rejected. Partial receipts create separate acquisition batches.',[ref,notes,...lineFields.flatMap(l=>[l.q,l.lot])],'Receive selected quantities',
    ()=>write('receive',{id:r.id,reference:ref.value(),notes:notes.value(),lines:lineFields.map(x=>({lineId:x.l.id,quantity:int(x.q.value(),0,x.l.quantity-x.l.received),lot:x.lot.value()})).filter(x=>x.quantity)},'Receipt saved and physical stock updated.')));
   }
   box.append(s);s.scrollIntoView({block:'nearest'});
  }catch(e){report(e);}
 }
 function openingCost(box,r){
  box.querySelector('[data-opening-cost]')?.remove();
  const date=field('Historical acquisition date',{type:'date',required:true}),cost=field('Acquisition total for the original batch (£)',{required:true,inputMode:'decimal'}),evidence=field('Acquisition evidence reference',{required:true});
  const f=form('Record opening-stock evidence','Use a verified invoice for the original '+r.quantity+' units. Evidence is recorded once and does not restate saved financial records.',
   [date,cost,evidence],'Save opening cost evidence',()=>write('openingEvidence',{batchId:r.id,date:date.value(),totalMinor:pence(cost.value()),evidence:evidence.value()},'Opening cost evidence recorded.'));
  f.dataset.openingCost='true';box.append(f);f.scrollIntoView({block:'nearest'});
 }
 function printLabel(box,lines){box.querySelector('.stock-label')?.remove();const label=el('section',null,'stock-label');label.append(el('h3','Apparition internal stock label'),...lines.map(l=>el('p',l)),button('Print label',()=>window.print()));box.append(label);label.scrollIntoView({block:'nearest'});}
 refresh();
 return {dispose(){ended=true;request?.abort();}};
}
