import {productContent} from './product-content.mjs';
import {kitBindings} from './kit-bindings.mjs';
import {validateImage} from './images.mjs';
// Development persistence adapter. Existing catalogue IDs/specs are reused, not recreated.
// Replace this storage boundary with server persistence later; shared by Admin, storefront and existing kit adapters.
import {catalogue} from '../components/catalogue-seed.mjs';
import {lesPaul} from '../wiring-kits/kit-seed.mjs';
export const storageKey='apparition.admin.components.v1';
export const categories={'potentiometers':'Potentiometers',capacitors:'Capacitors','treble-bleeds':'Treble Bleeds',switches:'Switches',jacks:'Output Jacks',other:'Other'};
export const specificationFields={
 potentiometers:['Resistance','Taper','Shaft','Type','Series','Tolerance','Reference'],
 capacitors:['Value','Voltage','Series','Tolerance','Construction','Reference'],
 'treble-bleeds':['Capacitor','Topology','Resistor','Series','Tolerance','Reference'],
 switches:['Switch type','Positions','Series','Reference'],
 jacks:['Jack type','Contacts','Series','Reference'],
 other:['Specification','Series','Reference']
};
export const fieldLabels={Shaft:'Shaft type / length',Value:'Capacitance',Capacitor:'Capacitance',Resistor:'Resistor value',Topology:'Treble bleed topology',Reference:'Part reference'};
const quantities={'bleed-prs':42,'bleed-cap':200,'bleed-duncan':81,'bleed-premium':0,'bleed-overkill':0,'pot-short-cts-a':5,'pot-short-alpha-a':10,'cde-022':20,'nissei-033':100,'cde-715p-600':2,'sbe-200':10,'sbe-600':100,'switch-epiphone':3};
const metadata={
 'sbe-200':{manufacturer:'Sprague / SBE',specs:{Voltage:'200V',Series:'715P'}},
 'sbe-600':{manufacturer:'Sprague / SBE',specs:{Voltage:'600V',Series:'715P'}},
 'cde-022':{manufacturer:'CDE',specs:{Voltage:'200V',Series:'225P',Reference:'CDE 225P 200V 223J'}},
 'cde-047':{manufacturer:'CDE',specs:{Voltage:'200V',Series:'225P'}},
 'nissei-033':{manufacturer:'NISSEI',specs:{Reference:'332J 1600 NISA22'}},
 'bleed-prs':{manufacturer:'Apparition',specs:{Topology:'Capacitor only'}},
 'bleed-cap':{manufacturer:'Apparition',specs:{Topology:'Capacitor only'}},
 'bleed-duncan':{manufacturer:'Apparition',specs:{Topology:'Capacitor + resistor in parallel'}}
};
export function initialComponents(){
 const existing=catalogue.map(p=>({...structuredClone(p),sku:p.id,manufacturer:metadata[p.id]?.manufacturer||(p.id.includes('-cts-')?'CTS':p.id.includes('-alpha-')?'Alpha':''),description:'',stock:quantities[p.id]??0,active:true,individually:true,inKits:['bleed-prs','bleed-cap','bleed-duncan','sbe-200','sbe-600','cde-022','cde-047','nissei-033','pot-short-cts-a','pot-long-cts-a'].includes(p.id),specs:{...p.specs,...metadata[p.id]?.specs}}));
 const extra=[
  {id:'bleed-premium',name:'Sprague Duncan Style',manufacturer:'Apparition',category:'treble-bleeds',description:lesPaul.bleed.premium.description,specs:{Topology:'Capacitor + resistor in parallel'}},
  {id:'bleed-overkill',name:'Overkill-Pasitor',manufacturer:'Apparition',category:'treble-bleeds',description:lesPaul.bleed.overkill.description,specs:{Topology:'Capacitor + resistor in parallel'}},
  {id:'cde-715p-600',name:'CDE 715P 600V 223J',manufacturer:'CDE',category:'capacitors',specs:{Value:'0.022µF',Voltage:'600V',Series:'715P',Reference:'CDE 715P 600V 223J'}},
  ...['epiphone','switchcraft'].map(k=>({id:'switch-'+k,name:k==='epiphone'?'Epiphone 3-Way Toggle Switch':lesPaul.selector[k].label,manufacturer:k==='epiphone'?'Epiphone':'Switchcraft',category:'switches',description:lesPaul.selector[k].description,specs:{'Switch type':'3-Way Toggle',Positions:'3'}})),
  ...['epiphone','pureTone','switchcraft'].map(k=>({id:'jack-'+k,name:lesPaul.jack[k].label,manufacturer:k==='pureTone'?'Pure Tone':k==='epiphone'?'Epiphone':'Switchcraft',category:'jacks',description:lesPaul.jack[k].description,specs:{'Jack type':'Mono'}}))
 ].map(p=>({description:'',...p,sku:p.id,stock:quantities[p.id]??0,active:true,individually:false,inKits:p.id!=='cde-715p-600'}));
 return [...existing,...extra].map(upgradeRecord);
}
const integer=(value,label)=>{if(value===''||value===null||typeof value==='boolean')throw new Error(label+' must be a whole number.');const n=Number(value);if(!Number.isSafeInteger(n))throw new Error(label+' must be a whole number.');return n;};
const clean=(v,max=300)=>String(v??'').trim().slice(0,max);
export function parseGBP(value){const s=String(value??'').trim();if(!s)return null;if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw new Error('Enter a non-negative GBP amount with at most two decimal places.');const [a,b='']=s.split('.'),pence=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(pence))throw new Error('Price is too large.');return pence;}
export const priceInput=value=>Number.isSafeInteger(value)?(value/100).toFixed(2):'';
function upgradeRecord(p){return {...p,salePrice:Object.hasOwn(p,'salePrice')?p.salePrice:(p.price??null),kitPrice:Object.hasOwn(p,'kitPrice')?p.kitPrice:(kitBindings[p.id]?.price??null),image:p.image??null};}
function validate(item,items,originalId){
 const stock=integer(item.stock,'Stock');if(stock<0)throw new Error('Stock cannot be below zero.');
 const sku=clean(item.sku,80),name=clean(item.name);
 if(!sku||!name)throw new Error('Enter a SKU and component name.');
 if(items.some(x=>x.id!==originalId&&x.sku.toLowerCase()===sku.toLowerCase()))throw new Error('That SKU already exists. Choose a unique SKU.');
 if(!categories[item.category])throw new Error('Choose a component category.');
 const specs=Object.fromEntries(Object.entries(item.specs||{}).map(([k,v])=>[clean(k,60),clean(v)]).filter(([k,v])=>k&&v));
 for(const key of ['salePrice','kitPrice','internalUnitCost'])if(item[key]!=null&&(!Number.isSafeInteger(item[key])||item[key]<0))throw new Error('Prices must be non-negative GBP amounts.');
 if(item.stockUnit!=null&&!['item','m','g'].includes(item.stockUnit))throw new Error('Choose a valid stock unit.');
 if(item.kitPriceQuantity!=null&&(!Number.isSafeInteger(item.kitPriceQuantity)||item.kitPriceQuantity<1))throw new Error('Kit price quantity must be a positive whole number.');
 return {...item,...productContent(item),salePrice:item.salePrice??null,kitPrice:item.kitPrice??null,image:validateImage(item.image),sku,name,stock,manufacturer:clean(item.manufacturer),description:clean(item.description,5000),active:!!item.active,individually:!!item.individually,inKits:!!item.inKits,specs};
}
// Share the existing validation/normalisation with the network repository.
export function normaliseComponentInput(input,items,originalId=null){
 const previous=items.find(item=>item.id===originalId);
 if(originalId&&!previous)throw new Error('Component no longer exists. Refresh the list.');
 const record=validate({...previous,...input},items,originalId);
 record.id=originalId||record.sku;
 if(!originalId&&items.some(item=>item.id===record.id))throw new Error('That identifier is already in use.');
 return record;
}
export function createComponentStore(storage){
 function write(items){try{storage.setItem(storageKey,JSON.stringify({version:1,items}));}catch{throw new Error('Changes could not be saved. Browser storage may be full or disabled.');}return items;}
 function list(){let raw;try{raw=storage.getItem(storageKey);}catch{throw new Error('Browser storage is unavailable. Enable it to manage components.');}
  if(raw===null)return structuredClone(write(initialComponents()));
  try{const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.items))throw new Error();const ids=new Set(),skus=new Set();for(const x of data.items){if(!x.id||ids.has(x.id)||!x.sku||skus.has(x.sku.toLowerCase())||!categories[x.category]||!Number.isSafeInteger(x.stock)||x.stock<0||!x.name||!x.specs)throw new Error();ids.add(x.id);skus.add(x.sku.toLowerCase());}const upgraded=data.items.map(upgradeRecord);if(JSON.stringify(upgraded)!==JSON.stringify(data.items))write(upgraded);return upgraded;}catch{throw new Error('Saved component data could not be read. It has been preserved; no data was reset.');}
 }
 function save(input,originalId=null){const items=list(),index=items.findIndex(x=>x.id===originalId);if(originalId&&index<0)throw new Error('Component no longer exists. Refresh the list.');const base=index<0?{}:items[index],record=validate({...base,...input},items,originalId);record.id=index<0?record.sku:originalId;if(index<0&&items.some(x=>x.id===record.id))throw new Error('That identifier is already in use.');if(index<0)items.push(record);else items[index]=record;write(items);return structuredClone(record);}
 function changeStock(id,value,mode='set'){if(!['set','adjust'].includes(mode))throw new Error('Invalid stock action.');const items=list(),item=items.find(x=>x.id===id);if(!item)throw new Error('Component not found.');const amount=integer(value,'Quantity'),next=mode==='adjust'?item.stock+amount:amount;if(!Number.isSafeInteger(next)||next<0)throw new Error('Stock cannot be below zero or exceed the supported whole-number range.');item.stock=next;write(items);return item;}
 return {list,save,changeStock};
}

export function currentComponents(){if(typeof window==='undefined')return initialComponents();return createComponentStore(window.localStorage).list();}
