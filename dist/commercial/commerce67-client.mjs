import {publicBackendConfig} from '../backend/public-config.mjs';
const adminRPCs=new Set(['commerce67_save_rule','commerce67_admin_workspace','commerce67_record_measurement','commerce67_make_set','commerce67_retire_set']);
const publicRPCs=new Set(['commerce67_quote','commerce67_product_terms','commerce67_product_configurations']);
export const pounds=minor=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(minor/100);
export function commerce67Client({config=publicBackendConfig,request=globalThis.fetch,auth}={}){
 async function rpc(name,body,signal=AbortSignal.timeout(12000)){
  if(!adminRPCs.has(name)&&!publicRPCs.has(name))throw Error('Unsupported Commerce request.');
  const token=adminRPCs.has(name)?await auth?.accessToken():null;
  if(adminRPCs.has(name)&&!token)throw Error('Sign in as an authorised Admin to continue.');
  const r=await request(config.url+'/rest/v1/rpc/'+name,{method:'POST',cache:'no-store',signal,redirect:'error',
   headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
   body:JSON.stringify(body)});
  if(!r.ok){
   const e=await r.json().catch(()=>null);
   if(r.status===401||r.status===403||e?.code==='42501')throw Error('This account is not authorised for Commerce.');
   if(e?.code==='40001')throw Error('Another Admin changed that rule. Reload before saving.');
   if(publicRPCs.has(name))throw Error('Current offer, code or stock could not be verified. Review your basket.');
   throw Error('The change could not be confirmed. Reload before retrying.');
  }
  return r.json();
 }
 return {
  list:()=>rpc('commerce67_admin_workspace',{}),save:(id,revision,rule)=>rpc('commerce67_save_rule',{p_id:id,p_expected:revision,p_rule:rule}),
  record:(component,ohms)=>rpc('commerce67_record_measurement',{p_component:component,p_ohms:ohms}),
  make:(units,tolerance,price)=>rpc('commerce67_make_set',{p_units:units,p_tolerance_bp:tolerance,p_price_minor:price}),
  retire:id=>rpc('commerce67_retire_set',{p_id:id}),quote:(items,code,signal)=>rpc('commerce67_quote',{p_items:items,p_code:code??null},signal),
  terms:(id,signal)=>rpc('commerce67_product_terms',{p_component:id},signal),
  configurations:(id,signal)=>rpc('commerce67_product_configurations',{p_component:id},signal),
 };
}
export function basketIntents(items){
 if(!Array.isArray(items)||!items.length||items.length>10||items.some(i=>!['component','commercial'].includes(i.product)))return null;
 const intents=items.map(i=>i.product==='commercial'?{...i.choice,quantity:i.quantity}:{kind:'component',id:i.sku,quantity:i.quantity});
 return intents.reduce((n,i)=>n+i.quantity,0)<=60?intents:null;
}
export function assertQuote(value,units=null){
 const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
 if(!value||value.currency!=='GBP'||!/^[a-f0-9]{32}$/.test(value.quoteId)||!Array.isArray(value.lines)||
  !value.lines.length||value.lines.length>60||!Array.isArray(value.offers)||value.offers.length>100||
  ![value.subtotalMinor,value.originalMinor,value.discountMinor,value.deliveryMinor,value.totalMinor].every(money)||
  value.totalMinor!==value.subtotalMinor+value.deliveryMinor||value.originalMinor!==value.subtotalMinor+value.discountMinor||
  !value.lines.every(i=>Number.isSafeInteger(i.quantity)&&i.quantity>0&&money(i.unitPrice)&&i.unitPrice>0&&
    i.lineTotal===i.quantity*i.unitPrice&&typeof i.name==='string')||
  value.lines.reduce((n,i)=>n+i.lineTotal,0)!==value.subtotalMinor||
  (units!==null&&value.lines.reduce((n,i)=>n+i.quantity,0)!==units))
  throw Error('Current Commerce quote could not be verified.');
 return value;
}
export function createQuoteReader(client=commerce67Client()){
 let active=null;
 return {cancel(){active?.abort();active=null;},async load(items,code){
  active?.abort();const controller=new AbortController();active=controller;
  try{const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(12000)]);
   const result=await client.quote(items,code,signal);
   if(active!==controller||signal.aborted)throw new DOMException('Quote superseded','AbortError');
   return assertQuote(result,items.reduce((n,i)=>n+i.quantity,0));
  }finally{if(active===controller)active=null;}
 }};
}
export function describeTier(t){
 if(!t||!Number.isInteger(t.minimum)||t.minimum<1||!Number.isSafeInteger(t.value)||t.value<1)return null;
 if(t.type==='percent')return 'Buy '+t.minimum+' or more for '+(t.value/100)+'% off eligible items';
 if(t.type==='fixed')return 'Save '+pounds(t.value)+' per group of '+t.minimum;
 if(t.type==='package')return 'Groups of '+t.minimum+' for '+pounds(t.value);
 return null;
}
export function paintProductTerms(node,terms,{document:doc=node.ownerDocument}={}){
 if(!Array.isArray(terms)||!terms.length||terms.length>8)return;
 const section=doc.createElement('section'),h=doc.createElement('h2'),list=doc.createElement('ul');
 h.textContent='Quantity offers';section.append(h,list);
 for(const offer of terms){
  if(typeof offer?.name!=='string'||!Array.isArray(offer.tiers))continue;
  const tiers=offer.tiers.map(describeTier).filter(Boolean);if(!tiers.length)continue;
  const li=doc.createElement('li');li.textContent=offer.name+' · '+tiers.join('; ')+(offer.description?' · '+offer.description:'');list.append(li);
 }
 if(list.children.length){const note=doc.createElement('p');note.textContent='Eligible savings are confirmed before you pay.';section.append(note);node.append(section);}
}
// Slide a sorted window within one exact variant. A valid minimum-span set
// always has a representative consecutive window; ties are settled by unit ID.
export function suggestMatchedSet(units,variant,size,toleranceBp){
 if(![2,4].includes(size)||!Number.isInteger(toleranceBp)||toleranceBp<1||toleranceBp>2000)return [];
 const options=units.filter(u=>u.component_id===variant&&Number.isInteger(u.resistance_ohms)&&u.resistance_ohms>0)
  .sort((a,b)=>a.resistance_ohms-b.resistance_ohms||a.id.localeCompare(b.id));
 let best=[],spread=Infinity;
 for(let i=0;i+size<=options.length;i++){
  const first=options[i].resistance_ohms,delta=options[i+size-1].resistance_ohms-first;
  if(delta*10000<=first*toleranceBp&&delta<spread){best=options.slice(i,i+size).map(u=>u.id);spread=delta;}
 }
 return best;
}

export function paintConfigurations(parent,rows,componentId,add){
 if(!Array.isArray(rows)||!rows.length||rows.length>20)return;
 const d=parent.ownerDocument,section=d.createElement('section'),h=d.createElement('h2'),status=d.createElement('p');
 h.textContent='Bundles, matched sets and upgrades';status.setAttribute('role','status');section.append(h,status);
 for(const row of rows){
  if(!['set','bundle','addon'].includes(row?.kind)||typeof row.name!=='string'||!/^[0-9a-f-]{36}$/i.test(row.id)||!Number.isSafeInteger(row.price_minor))continue;
  const article=d.createElement('article'),title=d.createElement('h3'),note=d.createElement('p'),button=d.createElement('button');
  title.textContent=row.name;note.textContent=[row.description,
   row.kind==='addon'?'Add '+pounds(row.price_minor):row.pricing==='discount'?'Save '+pounds(row.price_minor):pounds(row.price_minor),
   Array.isArray(row.contents)?row.contents.map(p=>p.quantity+' × '+p.name).join(', '):null].filter(Boolean).join(' · ');
  button.type='button';button.textContent='Add '+row.name+' to basket';
  button.addEventListener('click',()=>{try{add(row.kind==='addon'?{kind:'component',id:componentId,addon:row.id}:{kind:row.kind,id:row.id},row.name);status.textContent='Added to your basket.';}catch(e){status.textContent=e.message;}});
  article.append(title,note,button);section.append(article);
 }
 if(section.querySelector('article'))parent.append(section);
}
export function paintQuote(root,q){
 const d=root.ownerDocument;
 root.replaceChildren();
 const h=d.createElement('h3');h.textContent='Current offer quote';root.append(h);
 const list=d.createElement('ul');
 for(const line of q.lines){const li=d.createElement('li');li.textContent=line.quantity+' × '+line.name+' · '+pounds(line.lineTotal);list.append(li);}
 root.append(list);
 for(const [key,value] of [['Applied savings',q.discountMinor],['Delivery',q.deliveryMinor],['Payable total',q.totalMinor]]){
  const p=d.createElement('p');p.textContent=key+': '+pounds(value);root.append(p);
 }
 for(const offer of q.offers){const p=d.createElement('p');p.textContent='Applied: '+String(offer.name);root.append(p);}
}
