import {calculateEconomicsV2} from './economics-v2.mjs?v=overseer68a';
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,29}$/.test(v);

export const defaultConsumables=[
 ['small-bag','Small postage bag'],['large-bag','Large postage bag'],['qc-card','Apparition QC card'],
 ['sticker','Sticker'],['component-bag','Protective component bag'],['bubble-wrap','Bubble wrap'],
 ['box','Cardboard box'],['guitar-pick','Complimentary guitar pick']
].map(([id,name])=>({id,name,unitMinor:null,quantity:1,active:true}));

export function packagingKind(order){
 const items=order.items||[];
 if(items.some(i=>i.type==='kit'||/wiring kit/i.test(i.name||'')))return 'kit';
 if(items.some(i=>/\b(?:potentiometer|[ab][0-9]{3}[kK]|cts|alpha)\b/i.test(i.name||'')))return 'potentiometer';
 return items.length&&items.every(i=>i.type==='component')?'component':'other';
}

export function suggestedPreset(library,order){
 return library.presets?.find(p=>p.active&&p.kind===packagingKind(order))?.id||'';
}

export function applyPreset(draft,library,presetId){
 const p=library.presets?.find(x=>x.id===presetId&&x.active);
 if(!p||!integer(library.revision,0,99999999))throw Error('Select a saved active preset.');
 const items=p.items.map(ref=>{
  const row=library.items.find(i=>i.id===ref.itemId&&i.active);
  if(!row||!integer(row.unitMinor,0,99999)||!integer(ref.quantity,1,99))throw Error('A preset item has an unknown cost or invalid quantity.');
  return {id:row.id,name:row.name,unitMinor:row.unitMinor,quantity:ref.quantity};
 });
 return withSnapshot(draft,{presetId:p.id,presetName:p.name,libraryRevision:library.revision,items},'estimated');
}
export function withSnapshot(draft,snapshot,state='estimated',source=''){
 if(!id(snapshot?.presetId)||!integer(snapshot.libraryRevision,0,99999999)||!Array.isArray(snapshot.items)||!snapshot.items.length||snapshot.items.length>20||new Set(snapshot.items.map(x=>x.id)).size!==snapshot.items.length||!snapshot.items.every(x=>id(x.id)&&integer(x.quantity,1,99)&&integer(x.unitMinor,0,99999))||!['estimated','confirmed'].includes(state))throw Error('Review the packaging items and costs.');
 if(state==='confirmed'&&!source.trim())throw Error('Enter the evidence for actual packaging expenditure.');
 const copy=structuredClone(draft);copy.fulfilmentSnapshot=structuredClone(snapshot);
 copy.costs.packaging={minor:snapshot.items.reduce((n,i)=>n+i.unitMinor*i.quantity,0),state,source:source.trim()||'Saved fulfilment preset · library revision '+snapshot.libraryRevision};
 return copy;
}

export function updateFee(draft,category,minor,state,source){
 const copy=structuredClone(draft),matched=copy.fees.filter(f=>f.category===category);
 if(matched.length>1||matched.some(f=>f.direction!=='charge'||f.includes?.length)||copy.fees.some(f=>f.includes?.includes(category)))
  throw Error('This fee has credits, combined charges or several entries. Use advanced reconciliation.');
 if(minor!==null&&(!integer(minor,0,1000000000000)||!['estimated','confirmed'].includes(state)))throw Error('Enter a valid fee amount and evidence status.');
 if(minor!==null&&state==='confirmed'&&!source?.trim())throw Error('Enter a statement or receipt reference for confirmed fees.');
 if(minor===null){if(matched.length){copy.fees=copy.fees.filter(f=>f!==matched[0]);copy.feesComplete=false;}return copy;}
 const rule={id:matched[0]?.id||'eclipse-'+category,category,direction:'charge',method:'fixed',actualMinor:state==='confirmed'?minor:null,amountMinor:state==='estimated'?minor:null,
  state,source:source.trim(),base:'seller_gross',percentage:'',baseMinor:null,chargeReference:matched[0]?.chargeReference||'',includes:[]};
 copy.fees=copy.fees.filter(f=>f!==matched[0]).concat(rule);
 return copy;
}
export function financeSummary(document,matching=true){
 if(!document)return {status:'Not recorded',contribution:null,margin:null};
 try{
  const c=calculateEconomicsV2(document);
  return {status:!matching||c.status==='incomplete'||c.status==='unreconciled'?'Needs review':c.status==='estimated'?'Estimated':'Complete',
   contribution:matching?c.contributionMinor:null,margin:matching?c.marginPercent:null,calculation:c};
 }catch(error){return {status:'Needs review',contribution:null,margin:null,error:error.message};}
}
export function safePart(draft){const gross=draft.actualPaidMinor;return integer(gross,0,1e12)&&integer(draft.postageMinor,0,gross)?gross-draft.postageMinor:null;}
export function withTrustedFacts(initial,order){
 const draft=structuredClone(initial);
 // Order-time figures are already adjusted. Do not apply discounts again, do
 // not infer seller VAT, and never treat an unknown supplier quote as a snapshot.
 if(order.channel==='WEBSITE'&&order.providerBacked&&order.paidAt){
  draft.marketplaceTaxMinor=0;draft.marketplaceTaxState='confirmed';draft.marketplaceTaxSource='Direct website transaction; no marketplace pass-through.';
 }
 return draft;
}
