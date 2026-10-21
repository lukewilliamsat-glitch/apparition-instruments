// Fictional examples only. No current prices, inventory, customer data or real image bytes.
import {summary} from './model.mjs';
const specs=(resistance,taper)=>({resistance,taper});
export const fixtureRecords=[
  {id:'fx-pot-01',sku:'DEMO-POT-500A',name:'A500K audio taper potentiometer',category:'potentiometers',manufacturer:'Workshop Components',salePrice:695,kitPrice:540,kitPriceQuantity:1,stock:24,individually:true,inKits:true,technicalSpecs:specs('500 kΩ','Audio / A'),description:'A synthetic catalogue example for comparing component identity, stock and kit eligibility.',imageInfo:{kind:'available',mime:'image/png',bytes:24576,width:640,height:640,sha256:'a'.repeat(64)}},
  {id:'fx-cap-01',sku:'DEMO-CAP-022',name:'0.022 µF film tone capacitor',category:'capacitors',manufacturer:'Northline Parts',salePrice:325,kitPrice:260,kitPriceQuantity:1,stock:2,individually:true,inKits:true,technicalSpecs:{capacitance:'0.022 µF',tolerance:'±5%',voltage:'100 V'},imageInfo:{kind:'unloaded'}},
  {id:'fx-cap-02',sku:'DEMO-CAP-047',name:'0.047 µF film tone capacitor',category:'capacitors',manufacturer:'Northline Parts',salePrice:350,kitPrice:280,kitPriceQuantity:1,stock:0,individually:true,inKits:true,technicalSpecs:{capacitance:'0.047 µF',tolerance:'±5%'},imageInfo:{kind:'absent'}},
  {id:'fx-bleed-01',sku:'DEMO-TB-PAR',name:'Parallel treble-bleed circuit',category:'treble-bleeds',manufacturer:'Workshop Components',salePrice:575,kitPrice:460,kitPriceQuantity:1,stock:18,individually:true,inKits:true,technicalSpecs:{connection:'Parallel RC',capacitance:'1 nF',resistance:'150 kΩ'},imageInfo:{kind:'unavailable'}},
  {id:'fx-switch-01',sku:'DEMO-SW-3',name:'Three-way toggle switch',category:'switches',manufacturer:'Harbour Electrical',salePrice:1295,kitPrice:1095,kitPriceQuantity:1,stock:8,individually:true,inKits:true,technicalSpecs:{mounting:'Panel mount',connection:'Three-way'},imageInfo:{kind:'unloaded'}},
  {id:'fx-jack-01',sku:'DEMO-JACK-M',name:'Mono output jack',category:'jacks',manufacturer:'Harbour Electrical',salePrice:495,kitPrice:385,kitPriceQuantity:1,stock:32,individually:true,inKits:true,technicalSpecs:{connection:'6.35 mm mono'},imageInfo:{kind:'unloaded'}},
  {id:'fx-wire-01',sku:'DEMO-WIRE-BK',name:'Vintage-style cloth wire · black',category:'other',manufacturer:'Northline Parts',salePrice:225,kitPrice:165,kitPriceQuantity:1,stock:40,stockUnit:'metre',individually:true,inKits:true,technicalSpecs:{material:'Cloth insulation'},imageInfo:{kind:'absent'}},
  {id:'fx-pot-02',sku:'DEMO-POT-250A',name:'A250K audio taper potentiometer',category:'potentiometers',manufacturer:'Workshop Components',salePrice:650,kitPrice:500,kitPriceQuantity:1,stock:3,individually:true,inKits:true,technicalSpecs:specs('250 kΩ','Audio / A'),imageInfo:{kind:'unloaded'}},
  {id:'fx-bleed-02',sku:'DEMO-TB-SER',name:'Series treble-bleed circuit',category:'treble-bleeds',manufacturer:'Workshop Components',salePrice:null,kitPrice:425,kitPriceQuantity:1,stock:12,individually:false,inKits:true,technicalSpecs:{connection:'Series RC'},imageInfo:{kind:'unloaded'}},
  {id:'fx-switch-02',sku:'DEMO-SW-5',name:'Five-way selector switch',category:'switches',manufacturer:'Harbour Electrical',salePrice:1495,stock:0,individually:true,inKits:false,imageInfo:{kind:'removed',provenance:'explicit-synthetic-removal'}},
  {id:'fx-cap-03',sku:'DEMO-CAP-TEST',name:'0.022 µF film tone capacitor',category:'capacitors',manufacturer:'Workshop Components',salePrice:295,stock:9,individually:true,inKits:false,imageInfo:{kind:'unloaded'}},
  {id:'fx-wire-02',sku:'DEMO-WIRE-WH',name:'Vintage-style cloth wire · white / extended lead length for rear-routed control cavities',category:'other',manufacturer:'Northline Parts',salePrice:275,kitPrice:195,kitPriceQuantity:2,stock:15,stockUnit:'metre',individually:true,inKits:true,imageInfo:{kind:'unloaded'}},
  {id:'fx-jack-02',sku:'DEMO-JACK-ST',name:'Stereo output jack',category:'jacks',manufacturer:'Harbour Electrical',salePrice:625,stock:5,individually:true,inKits:false,active:false,imageInfo:{kind:'unloaded'}},
  {id:'fx-other-01',sku:'DEMO-GROUND',name:'Ground connection washer',category:'other',manufacturer:'Workshop Components',salePrice:125,kitPrice:75,kitPriceQuantity:1,individually:true,inKits:true,imageInfo:{kind:'unloaded'}}
].map(record=>({...record,revision:'fixture-1',active:record.active??true,description:record.description??'',specs:'',productSpecifications:''}));
const clone=value=>structuredClone(value);
export function createFixtureTransport({delay=100}={}) {
  const calls=[],queue={list:[],detail:[]};let records=clone(fixtureRecords);
  async function request(kind,id,signal) {
    calls.push({kind,id:id??null});
    const custom=queue[kind].shift();
    if(custom)return custom({id,signal,records:clone(records)});
    await new Promise(resolve=>setTimeout(resolve,delay));
    if(signal?.aborted)throw new DOMException('Request cancelled.','AbortError');
    if(kind==='list')return records.map(summary);
    const found=records.find(record=>record.id===id);
    if(!found)throw new Error('Product no longer exists.');
    return clone(found);
  }
  return {kind:'command01-synthetic',calls,list:({signal}={})=>request('list',null,signal),detail:(id,{signal}={})=>request('detail',id,signal),
    enqueue:(kind,handler)=>{if(!queue[kind])throw new Error('Unknown fixture operation.');queue[kind].push(handler);},
    replace:next=>{records=clone(next);},reset:()=>{records=clone(fixtureRecords);queue.list=[];queue.detail=[];}
  };
}
