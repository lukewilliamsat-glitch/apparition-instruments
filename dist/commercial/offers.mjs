// Deterministic draft pricing only. Never imported by basket, checkout or stock writers.
const require=(ok,message)=>{if(!ok)throw Error(message);};
const integer=(n,min,max,label)=>{require(Number.isSafeInteger(n)&&n>=min&&n<=max,'Invalid '+label+'.');return n;};
const identity=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(s);
const half=(n,d)=>Number((BigInt(n)+BigInt(d)/2n)/BigInt(d));
const sum=a=>a.reduce((n,x)=>n+x,0);
export function moneyInput(text,scale=2){
 require(typeof text==='string'&&/^\d+(?:\.\d+)?$/.test(text.trim()),'Enter a non-negative decimal amount.');
 const [whole,fraction='']=text.trim().split('.');require(fraction.length<=scale,'Too many decimal places.');
 const n=BigInt(whole)*10n**BigInt(scale)+BigInt(fraction.padEnd(scale,'0')||'0');require(n<=1000000000n,'Amount is too large.');return Number(n);
}
export function normaliseOffer(input){
 require(input&&identity(input.id),'A stable draft identity is required.');
 require(input.active!==true,'Live promotion activation is unavailable.');
 require(typeof input.name==='string'&&input.name.trim().length>0&&input.name.trim().length<=120,'Enter an offer name of 1–120 characters.');
 require(input.currency==='GBP','Only GBP previews match the current checkout currency.');
 require(['percent','fixed','package','bundle'].includes(input.type),'Unknown discount type.');
 const threshold=integer(input.threshold??1,1,99,'quantity threshold'),value=integer(input.value,0,input.type==='percent'?10000:1000000000,'discount value');
 require(['exclusive','stackable'].includes(input.stacking),'Choose an explicit stacking rule.');
 const priority=integer(input.priority??0,0,999,'priority');
 const ids=[...new Set(input.productIds||[])],categories=[...new Set(input.categories||[])];
 require(ids.length<=200&&ids.every(identity)&&categories.length<=30&&categories.every(s=>typeof s==='string'&&/^[a-z0-9-]{1,60}$/.test(s)),'Invalid product eligibility.');
 const bundle=input.type==='bundle'?(input.bundle||[]).map(r=>({productId:r.productId,quantity:integer(r.quantity,1,99,'bundle quantity')})):[];
 require(input.type!=='bundle'||bundle.length>=2&&bundle.length<=10&&new Set(bundle.map(r=>r.productId)).size===bundle.length&&bundle.every(r=>identity(r.productId)),'A bundle needs 2–10 distinct component products.');
 require(input.type==='bundle'||input.allProducts===true||ids.length||categories.length,'Select eligible products/categories or explicitly include all products.');
 const time=value=>{if(!value)return null;require(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{3})?)?Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,16)===value.slice(0,16),'Use a valid UTC start/end time.');return new Date(value).toISOString();};
 const startsAt=time(input.startsAt),endsAt=time(input.endsAt);require(!startsAt||!endsAt||Date.parse(endsAt)>Date.parse(startsAt),'End must follow start.');
 return {id:input.id,name:input.name.trim(),currency:'GBP',type:input.type,threshold,value,stacking:input.stacking,priority,productIds:ids,categories,allProducts:input.allProducts===true,bundle,startsAt,endsAt,included:input.included===true,active:false};
}
const eligible=(offer,unit)=>offer.type==='bundle'?offer.bundle.some(r=>r.productId===unit.productId):offer.allProducts||offer.productIds.includes(unit.productId)||offer.categories.includes(unit.category);
function allocate(units,discount){
 const total=sum(units.map(u=>u.remaining));if(!discount||!total)return;
 const denominator=BigInt(total),rows=units.map(u=>{const n=BigInt(discount)*BigInt(u.remaining);return {u,amount:Number(n/denominator),remainder:n%denominator};});
 let extra=discount-sum(rows.map(r=>r.amount));rows.sort((a,b)=>a.remainder===b.remainder?a.u.key.localeCompare(b.u.key):a.remainder>b.remainder?-1:1);
 for(const row of rows){if(extra>0){row.amount++;extra--;}require(row.amount<=row.u.remaining,'Discount allocation exceeded a line value.');row.u.remaining-=row.amount;}
}
function apply(offer,units){
 let selection=units.filter(u=>eligible(offer,u)),groups=0,discount=0;
 if(offer.type==='bundle'){
  const available=selection.filter(u=>!u.allocated);groups=Math.min(...offer.bundle.map(r=>Math.floor(available.filter(u=>u.productId===r.productId).length/r.quantity)));
  if(!groups)return null;
  selection=offer.bundle.flatMap(r=>available.filter(u=>u.productId===r.productId).slice(0,r.quantity*groups));
  discount=Math.max(0,sum(selection.map(u=>u.remaining))-offer.value*groups);
 }else if(offer.type==='package'){
  selection=selection.filter(u=>!u.allocated).sort((a,b)=>b.remaining-a.remaining||a.key.localeCompare(b.key));groups=Math.floor(selection.length/offer.threshold);if(!groups)return null;
  selection=selection.slice(0,groups*offer.threshold);discount=Math.max(0,sum(selection.map(u=>u.remaining))-offer.value*groups);
 }else{
  groups=Math.floor(selection.length/offer.threshold);if(!groups)return null;const gross=sum(selection.map(u=>u.remaining));
  discount=offer.type==='percent'?half(BigInt(gross)*BigInt(offer.value),10000):Math.min(gross,offer.value*groups);
 }
 discount=Math.min(sum(selection.map(u=>u.remaining)),discount);if(!discount)return null;
 allocate(selection,discount);if(['package','bundle'].includes(offer.type))selection.forEach(u=>u.allocated=true);
 return {id:offer.id,name:offer.name,type:offer.type,discountMinor:discount,groups,active:false};
}
export function previewOfferBasket({catalogue,items,offers=[],now=Date.now()}={}){
 require(Array.isArray(catalogue)&&catalogue.length<=200,'Use a bounded catalogue reference.');
 require(Array.isArray(items)&&items.length>0&&items.length<=10,'Use 1–10 basket lines.');
 require(Array.isArray(offers)&&offers.length<=50,'Use no more than 50 draft offers.');
 require(Number.isFinite(now),'A valid preview time is required.');
 const products=new Map();for(const p of catalogue){require(identity(p.id)&&!products.has(p.id),'Invalid or duplicate product identity.');integer(p.unitPriceMinor,1,1000000000,'reference unit price');require(p.currency==='GBP','Catalogue currency mismatch.');require(p.stock===null||Number.isSafeInteger(p.stock)&&p.stock>=0,'Invalid stock reference.');products.set(p.id,p);}
 const quantities=new Map();for(const row of items){require(identity(row.productId)&&products.has(row.productId),'Basket product is unavailable in this catalogue reference.');const q=(quantities.get(row.productId)||0)+integer(row.quantity,1,99,'basket quantity');integer(q,1,99,'combined quantity');quantities.set(row.productId,q);}
 const units=[],availability=[];for(const [id,quantity]of quantities){const p=products.get(id);if(p.stock===null)availability.push({productId:id,state:'unknown'});else if(quantity>p.stock)availability.push({productId:id,state:'insufficient',requested:quantity,available:p.stock});for(let n=0;n<quantity;n++)units.push({key:id+':'+String(n).padStart(2,'0'),productId:id,category:p.category,remaining:p.unitPriceMinor,allocated:false});}
 const drafts=offers.map(normaliseOffer);require(new Set(drafts.map(o=>o.id)).size===drafts.length,'Duplicate draft offer identity.');
 const skipped=[],included=drafts.filter(o=>{const reason=!o.included?'Excluded draft':o.startsAt&&now<Date.parse(o.startsAt)?'Not started':o.endsAt&&now>=Date.parse(o.endsAt)?'Expired':null;if(reason)skipped.push({id:o.id,name:o.name,reason});return !reason;});
 const copy=()=>units.map(u=>({...u}));const stackUnits=copy(),stackApplied=[];
 for(const o of included.filter(o=>o.stacking==='stackable').sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id))){const result=apply(o,stackUnits);if(result)stackApplied.push(result);else skipped.push({id:o.id,name:o.name,reason:'Threshold, bundle or saving not available'});}
 let chosen={units:stackUnits,applied:stackApplied,discount:sum(stackApplied.map(r=>r.discountMinor)),mode:'stackable'};
 for(const o of included.filter(o=>o.stacking==='exclusive').sort((a,b)=>a.id.localeCompare(b.id))){const candidate=copy(),result=apply(o,candidate);if(!result){skipped.push({id:o.id,name:o.name,reason:'Threshold, bundle or saving not available'});continue;}if(result.discountMinor>chosen.discount)chosen={units:candidate,applied:[result],discount:result.discountMinor,mode:'exclusive'};}
 const conflicts=[];for(let a=0;a<included.length;a++)for(let b=a+1;b<included.length;b++){const ids=[...quantities.keys()].filter(id=>eligible(included[a],{productId:id,category:products.get(id).category})&&eligible(included[b],{productId:id,category:products.get(id).category}));if(ids.length)conflicts.push({offers:[included[a].id,included[b].id],products:ids});}
 const lines=[...quantities].map(([id,quantity])=>{const p=products.get(id),gross=quantity*p.unitPriceMinor,net=sum(chosen.units.filter(u=>u.productId===id).map(u=>u.remaining));return {productId:id,name:p.name,quantity,unitPriceMinor:p.unitPriceMinor,grossMinor:gross,discountMinor:gross-net,netMinor:net};});
 const subtotalMinor=sum(lines.map(r=>r.grossMinor)),payableMinor=sum(lines.map(r=>r.netMinor));integer(subtotalMinor,0,Number.MAX_SAFE_INTEGER,'subtotal');require(subtotalMinor-payableMinor===chosen.discount&&payableMinor>=0,'Draft totals did not reconcile.');
 return {state:'PREVIEW_ONLY',active:false,currency:'GBP',subtotalMinor,discountMinor:chosen.discount,payableMinor,lines,applied:chosen.applied,stackingMode:chosen.mode,skipped,conflicts,availability,checkoutActive:false,stockReserved:false,excludes:'Delivery, tax adjustments and existing checkout charges are outside this merchandise preview.'};
}
