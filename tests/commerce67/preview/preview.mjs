import {mountCommerce67} from '/commercial/commerce67-admin.mjs';
import {paintConfigurations,paintProductTerms,paintQuote} from '/commercial/commerce67-client.mjs';
import {previewOfferBasket} from '/commercial/offers.mjs';
const cap={id:'fixture-cap',name:'Orange Drop 0.022 µF (fixture)',category:'capacitors',unitPriceMinor:525,currency:'GBP',stock:8};
const pot={id:'fixture-cts-a',name:'CTS A500K Audio (fixture)',category:'potentiometers',unitPriceMinor:699,currency:'GBP',stock:4};
const cfgs=[
 {id:'00000000-0000-4000-8000-000000000001',kind:'bundle',name:'Electronics pair (fixture)',description:'One capacitor and one CTS Audio pot.',pricing:'fixed',price_minor:1099,contents:[{name:cap.name,quantity:1},{name:pot.name,quantity:1}]},
 {id:'00000000-0000-4000-8000-000000000002',kind:'addon',name:'Preinstalled Duncan (fixture)',price_minor:250,contents:[{name:'Duncan-style treble bleed',quantity:1}]},
 {id:'00000000-0000-4000-8000-000000000003',kind:'set',name:'Precision-matched pair (fixture)',description:'Fictional 498 kΩ and 501 kΩ readings.',price_minor:1599}
];
const starting={rules:[],units:[498000,501000,502000,544000].map((resistance_ohms,i)=>({id:'fixture-unit-'+i,component_id:pot.id,resistance_ohms})),sets:[]};
const key='app-commerce67-fictional-preview-v1';
let store;try{store=JSON.parse(localStorage.getItem(key))||structuredClone(starting);}catch{store=structuredClone(starting);}
const persist=()=>{try{localStorage.setItem(key,JSON.stringify(store));}catch{}};
const api={async list(){return structuredClone(store);},async save(id,revision,r){
 const existing=store.rules.find(x=>x.id===id);
 if((existing?.revision??0)!==revision||(!existing&&r.state!=='draft'))throw Error('Start with a draft and use the current revision.');
 const row={...r,id:id??crypto.randomUUID(),revision:revision+1,starts_at:r.startsAt,ends_at:r.endsAt};
 store.rules=store.rules.filter(x=>x.id!==row.id);if(row.state!=='archived')store.rules.push(row);persist();return row;
},async record(component_id,resistance_ohms){if(component_id!==pot.id||resistance_ohms<100000||resistance_ohms>900000)throw Error('Use fixture-cts-a and a valid resistance.');
 const id=crypto.randomUUID();store.units.push({id,component_id,resistance_ohms});persist();return id;
},async make(members,tolerance,price){const selected=store.units.filter(x=>members.includes(x.id));
 if(![2,4].includes(selected.length)||!price||tolerance<1||selected.some(u=>store.sets.some(s=>s.members.includes(u.id))))throw Error('Select unused measured units, a price and a tolerance.');
 const values=selected.map(u=>u.resistance_ohms),lo=Math.min(...values),hi=Math.max(...values);
 if((hi-lo)*10000>lo*tolerance)throw Error('The measurements exceed the selected tolerance.');
 store.sets.push({id:crypto.randomUUID(),component_id:pot.id,size:selected.length,state:'available',members});persist();
},async retire(id){store.sets=store.sets.filter(s=>s.id!==id);persist();}};
mountCommerce67({document,client:api});
const tier={minimum:2,type:'percent',value:1000};
paintProductTerms(document.querySelector('#terms'),[{name:'Two capacitor offer (fixture)',tiers:[tier]}]);
const target=document.querySelector('#quote');
const quote=previewOfferBasket({catalogue:[cap,pot],items:[{productId:cap.id,quantity:2}],offers:[
 {id:'fixture-offer',name:'Two capacitor offer',type:'percent',currency:'GBP',threshold:2,value:1000,stacking:'exclusive',productIds:[cap.id],included:true}
]});
paintQuote(target,{lines:quote.lines.map(l=>({name:l.name,quantity:l.quantity,lineTotal:l.netMinor})),offers:quote.applied,
 discountMinor:quote.discountMinor,totalMinor:quote.payableMinor+399,deliveryMinor:399});
paintConfigurations(document.querySelector('#configurations'),cfgs,pot.id,(choice)=>{const v=cfgs.find(r=>r.id===(choice.addon??choice.id));
 const charge=v.price_minor+(v.kind==='addon'?pot.unitPriceMinor:0);
 paintQuote(target,{lines:[{name:v.name,quantity:1,lineTotal:charge}],offers:[],discountMinor:0,totalMinor:charge+399,deliveryMinor:399});});
