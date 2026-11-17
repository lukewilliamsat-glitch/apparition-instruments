import {mountArmoury} from '/admin/ironclad/app.mjs';
import {allocateShared} from '/admin/ironclad/model.mjs';
const root=document.querySelector('#armoury');
const key='apparition-ironclad69-fixture-v1',id=()=>crypto.randomUUID();
const pot='fixture-cts-500k',cap='fixture-orange-drop',batch='batch-cts-500k',supplier='supplier-workshop';
const timestamp=()=>new Date().toISOString();
function seed(){
 const items=[
  {component_id:pot,sku:'IC-CTS-500K',name:'Fictional CTS 500k audio · short split shaft',category:'potentiometers',stock_unit:'item',physical:8,low:4,target:20,revision:0},
  {component_id:cap,sku:'IC-715P-22N',name:'Fictional Orange Drop 22nF',category:'capacitors',stock_unit:'item',physical:3,low:4,target:25,revision:0},
  {component_id:'fixture-jack',sku:'IC-JACK-MONO',name:'Fictional mono output jack',category:'jacks',stock_unit:'item',physical:0,low:2,target:10,revision:0}
 ];
 return {items,suppliers:[{id:supplier,name:'Fixture Components Ltd',reference:'FCL',site:'',contact:'Fictional purchasing contact',location:'UK',currency:'GBP',notes:'Synthetic supplier',active:true}],
 purchases:[{id:'po-fixture-sample',reference:'IC-PO-SAMPLE',supplierId:supplier,supplier:'Fixture Components Ltd',state:'ordered',currency:'GBP',method:'quantity',evidence:'',charges:{freight:520},total_minor:4200,
  lines:[{id:'line-fixture-a',component_id:pot,name:items[0].name,part_no:'FIX-500-A',quantity:8,received:0,supplier_unit_minor:460,merchandise_minor:3680,allocation_minor:520}]}],
 batches:[{id:batch,component_id:pot,quantity:8,remaining:8,cost_minor:3880,purchase_ref:'FIXTURE-OPEN-01',lot:'FICT-2338',origin:'receipt',supplier:'Fixture Components Ltd'}],
 measurements:[491400,491890,492030,492180,504200,504510,505100,505270].map((ohm,i)=>({id:'fixture-unit-'+String(i+1).padStart(3,'0'),batch_id:batch,component_id:pot,slot:i+1,nominal_ohm:500000,resistance_ohm:ohm,quality:'accepted',taper:'A',shaft:'Short split',cost_minor:3880,batch_quantity:8,allocated:false})),
 sets:[],stocktakes:[],movements:[],requests:{},receipts:[],costs:[{orderId:'fixture-order-001',line_index:0,component_id:pot,batch_id:batch,quantity:2,line_cost_minor:970,basis:'allocated_batch'}]};
}
let s;try{s=JSON.parse(sessionStorage.getItem(key)||'null')||seed();}catch{s=seed();}
const persist=()=>sessionStorage.setItem(key,JSON.stringify(s)),cl=structuredClone;
const fail=(condition,msg)=>{if(!condition)throw Error(msg);};
const stock=c=>s.items.find(x=>x.component_id===c);
const ordered=o=>['ordered','partial'].includes(o.state);
function summary(r){
 const related=s.batches.filter(b=>b.component_id===r.component_id),measured=s.measurements.filter(m=>m.component_id===r.component_id&&m.quality!=='retired'),allocated=measured.filter(m=>m.allocated).length,quality_held=measured.filter(m=>m.quality!=='accepted').length;
 const available=r.physical-allocated-quality_held,incoming=s.purchases.filter(ordered).flatMap(p=>p.lines).filter(l=>l.component_id===r.component_id).reduce((n,l)=>n+l.quantity-l.received,0);
 return {...r,available,allocated,quality_held,incoming,measured:measured.length,reserved:0,reconciliation:false,
  suggested:available<=r.low?Math.max(0,r.target-available-incoming):null,
  known_units:related.filter(b=>b.cost_minor!=null).reduce((n,b)=>n+b.remaining,0),known_value_minor:related.some(b=>b.cost_minor!=null)?Math.round(related.reduce((n,b)=>n+(b.cost_minor??0)*b.remaining/b.quantity,0)):null};
}
const repo={
 async readCosts(order){return cl(s.costs.filter(x=>x.orderId===order));},
 async read(v,p={}){
  let rows=[];
  if(v==='inventory')rows=s.items.map(summary).filter(r=>(!p.q||(r.name+' '+r.sku).toLowerCase().includes(p.q.toLowerCase()))&&(!p.category||r.category===p.category)&&(!p.componentId||r.component_id===p.componentId)
  &&(!p.measured||r.measured)&&(!p.batchId||s.batches.some(b=>b.id===p.batchId&&b.component_id===r.component_id))
  &&(!p.supplierId||s.purchases.some(o=>o.supplierId===p.supplierId&&o.lines.some(l=>l.component_id===r.component_id)))
  &&(!p.status||({low:r.available>0&&r.available<=r.low,out:r.available===0,incoming:r.incoming>0,reconciliation:r.reconciliation})[p.status]));
  else if(v==='suppliers')rows=s.suppliers.map(x=>({...x,purchase_count:s.purchases.filter(r=>r.supplierId===x.id).length})).filter(r=>!p.q||r.name.toLowerCase().includes(p.q.toLowerCase()));
  else if(v==='purchases')rows=s.purchases.filter(r=>(!p.supplierId||r.supplierId===p.supplierId)&&(!p.status||r.state===p.status));
  else if(v==='purchaseLines')rows=s.purchases.find(r=>r.id===p.id)?.lines||[];
  else if(v==='batches')rows=s.batches.filter(r=>!p.componentId||r.component_id===p.componentId);
  else if(v==='measurements')rows=s.measurements.filter(r=>(!p.batchId||r.batch_id===p.batchId)&&(!p.componentId||r.component_id===p.componentId));
  else if(v==='sets')rows=s.sets.filter(r=>!p.componentId||r.component_id===p.componentId);
  else if(v==='stocktakes')rows=s.stocktakes;
  else if(v==='stocktakeLines')rows=(s.stocktakes.find(r=>r.id===p.id)?.lines||[]).map(r=>({...r,stale:r.revision!==stock(r.component_id).revision}));
  else if(v==='movements')rows=s.movements.filter(r=>r.component_id===p.componentId);
  return cl(rows.slice(p.offset||0,(p.offset||0)+(p.limit||25)));
 },
 async write(k,v,p){
  if(s.requests[k])return {...s.requests[k],replayed:true};
  const prior=cl(s);let out={};
  const movement=(c,n,kind,reason,source)=>{
   const r=stock(c),prev=r.physical;fail(n>=summary(r).allocated+summary(r).quality_held,'Count would consume protected stock.');
   if(prev!==n){r.physical=n;r.revision++;s.movements.unshift({id:id(),component_id:c,kind,previous:prev,delta:n-prev,resulting:n,reason,source,created_at:timestamp()});}
  };
  try{
   if(v==='supplier'){fail(p.name.trim(),'Enter a supplier name.');out={id:id()};s.suppliers.unshift({...p,id:out.id,active:true});}
   else if(v==='supplierArchive'){const r=s.suppliers.find(x=>x.id===p.id);fail(r,'Supplier unknown.');r.active=false;}
   else if(v==='purchase'){
    const sup=s.suppliers.find(r=>r.id===p.supplierId&&r.active);fail(sup,'Choose an active supplier.');
    fail(!s.purchases.some(x=>x.reference===p.reference&&x.supplierId===p.supplierId),'Purchase reference already exists.');
    fail(p.currency==='GBP'||p.evidence.length>=5,'Foreign conversion evidence required.');
    const extras=Object.entries(p.charges).reduce((n,[k,v])=>n+(k==='credit'?-v:v),0),vals=p.lines.map(r=>p.currency==='GBP'?r.quantity*r.unitMinor:r.gbpMinor);
    const shares=p.method==='manual'?p.lines.map(r=>r.allocationMinor):allocateShared(extras,p.method==='quantity'?p.lines.map(r=>r.quantity):vals);
    fail(shares.reduce((a,b)=>a+b,0)===extras,'Manual allocation does not reconcile.');
    out={id:id(),state:'draft'};s.purchases.unshift({...p,...out,supplier:sup.name,total_minor:vals.reduce((a,b)=>a+b,extras),lines:p.lines.map((r,i)=>{
     const x=stock(r.componentId);fail(x,'Unknown component.');return {id:id(),component_id:r.componentId,name:x.name,part_no:r.partNo,quantity:r.quantity,received:0,supplier_unit_minor:r.unitMinor,merchandise_minor:vals[i],allocation_minor:shares[i]};
    })});
   }else if(v==='purchaseState'){
    const r=s.purchases.find(x=>x.id===p.id);fail(r&&(r.state==='draft'||r.state==='ordered'&&p.state==='cancelled'),'Invalid purchase state.');r.state=p.state;
   }else if(v==='receive'){
    const r=s.purchases.find(x=>x.id===p.id);fail(r&&ordered(r),'Select an outstanding purchase.');
    fail(p.lines.length&&!s.receipts.some(x=>x.po===r.id&&x.ref===p.reference),'Delivery was already recorded or quantities are missing.');
    out={id:id(),batches:[]};s.receipts.push({po:r.id,ref:p.reference});
    for(const h of p.lines){const l=r.lines.find(x=>x.id===h.lineId);fail(l&&h.quantity>0&&l.received+h.quantity<=l.quantity,'Quantity exceeds the outstanding purchase.');
     const total=l.merchandise_minor+l.allocation_minor,cost=Math.trunc(total*(l.received+h.quantity)/l.quantity)-Math.trunc(total*l.received/l.quantity);
     l.received+=h.quantity;const b={id:id(),component_id:l.component_id,quantity:h.quantity,remaining:h.quantity,cost_minor:cost,lot:h.lot,purchase_ref:r.reference,receipt_ref:p.reference,supplier:r.supplier,origin:'receipt'};
     s.batches.unshift(b);out.batches.push({batchId:b.id});movement(l.component_id,stock(l.component_id).physical+h.quantity,'receipt','Purchase receipt',out.id);
    }
    r.state=r.lines.every(l=>l.received===l.quantity)?'received':'partial';out.state=r.state;
   }else if(v==='measure'){
    const b=s.batches.find(x=>x.id===p.batchId);fail(b&&b.component_id===pot,'Select a potentiometer batch.');
    for(const x of p.units){
     const old=s.measurements.find(m=>m.batch_id===b.id&&m.slot===x.slot);fail(!old?.allocated,'Allocated measurement cannot be edited.');
     const next={id:old?.id||id(),batch_id:b.id,component_id:b.component_id,slot:x.slot,nominal_ohm:p.nominalOhm,resistance_ohm:x.ohm,taper:p.taper,shaft:p.shaft,quality:x.quality,cost_minor:b.cost_minor,batch_quantity:b.quantity,allocated:false};
     if(old)Object.assign(old,next);else s.measurements.push(next);
    }
    fail(s.measurements.filter(m=>m.batch_id===b.id).length<=b.remaining,'Readings exceed available batch units.');stock(b.component_id).revision++;
   }else if(v==='allocate'){
    const members=p.unitIds.map(u=>s.measurements.find(m=>m.id===u));fail(members.every(m=>m&&!m.allocated&&m.quality==='accepted'),'Units already committed or unavailable.');
    const min=Math.min(...members.map(m=>m.resistance_ohm)),max=Math.max(...members.map(m=>m.resistance_ohm));fail((max-min)*10000<=min*p.toleranceBp,'Set spread outside tolerance.');
    out={id:id(),state:'allocated'};for(const m of members)m.allocated=true;s.sets.unshift({...out,component_id:p.componentId,tolerance_bp:p.toleranceBp,units:members.map(m=>({id:m.id,ohm:m.resistance_ohm}))});
    const current=stock(p.componentId);current.revision++;s.movements.unshift({component_id:p.componentId,kind:'set_allocation',previous:current.physical,delta:0,resulting:current.physical,reason:'Bench commitment only',source:out.id,created_at:timestamp()});
   }else if(v==='release'){
    const r=s.sets.find(x=>x.id===p.id);fail(r?.state==='allocated'&&p.reason.length>=5,'Confirm the release and reason.');r.state='released';r.units.forEach(x=>s.measurements.find(m=>m.id===x.id).allocated=false);stock(r.component_id).revision++;
   }else if(v==='threshold'){
    const r=stock(p.componentId);fail(r&&p.target>=p.low,'Target cannot be below threshold.');r.low=p.low;r.target=p.target;
   }else if(v==='adjust'){
    const r=stock(p.componentId);fail(r?.physical===p.expected&&r?.revision===p.expectedRevision,'Stock has changed since review.');fail(p.reason.length>=5,'Enter a useful adjustment reason.');
    movement(r.component_id,p.quantity,p.kind,p.reason,k);
   }else if(v==='stocktakeOpen'){
    fail(p.reason.length>=5&&p.componentIds.length,'Enter a scope and reason.');out={id:id(),state:'open'};
    s.stocktakes.unshift({...out,reason:p.reason,lines:p.componentIds.map(c=>{const r=stock(c);fail(r,'Unknown component.');return {component_id:c,name:r.name,expected:r.physical,revision:r.revision,counted:null};})});
   }else if(v==='stocktakeApply'){
    const r=s.stocktakes.find(x=>x.id===p.id);fail(r?.state==='open'&&p.confirmed&&p.reason.length>=5,'Review and confirm all counts.');
    fail(r.lines.every(x=>stock(x.component_id).revision===x.revision),'Stock changed during the count. Open a new stocktake.');
    for(const x of r.lines){movement(x.component_id,p.counts[x.component_id],'stocktake',p.reason,r.id);x.counted=p.counts[x.component_id];}r.state='applied';
   }else if(v==='recordCost'){fail(p.evidence.length>=8,'Enter specific order-to-batch evidence.');out={id:id(),basis:p.basis};s.costs.push({...p,...out});}
   else throw Error('Unsupported fixture operation.');
   s.requests[k]=out;persist();return cl(out);
  }catch(e){s=prior;throw e;}
 }
};
mountArmoury(root,repo,{fixture:true});
