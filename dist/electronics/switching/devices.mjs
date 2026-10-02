// Device contact truth is independent of wiring function and physical actuator.
export const dpdtTerminals=Object.freeze(Object.fromEntries(['A','B'].flatMap((pole,column)=>[['1',0],['C',28],['2',56]].map(([pin,y])=>[pole+pin,{x:column===0?-24:24,y,label:`Pole ${pole} ${pin==='C'?'common':'throw '+pin}`}]))));
export function dpdtContacts(id,position){
 if(!/^[a-zA-Z][\w-]*$/.test(id)||!['down','up'].includes(position))throw Error('Unsupported DPDT identity or state.');
 const throwId=position==='down'?'1':'2';
 return ['A','B'].map(pole=>[id+'.'+pole+'C',id+'.'+pole+throwId]);
}
export function bridgeSplitModifier(position='down'){
 return {id:'bridgeSplit',device:'dpdt',actuator:'push-pull',host:'masterVolume',pickup:'bridge',function:'coil-split',position,coilTopology:'series-ab',activeCoil:'A'};
}
export function toneSplitModifier(pickup,position='down'){
 if(!['neck','bridge'].includes(pickup))throw Error('Unsupported tone split target.');
 return {...bridgeSplitModifier(position),id:pickup+'Split',host:pickup+'Tone',pickup};
}
export function prsSplitModifier(position='down'){return {...bridgeSplitModifier(position),id:'prsSplit',host:'masterTone',pickup:'both'};}
export function normaliseSwitching(value,{layout,controlLayout,selector,bridgeAccess='four-conductor',coilAccess={},family='les-paul'}={}){
 if(value===undefined)return undefined;
 const hss=layout==='HSS'&&['1V1T','1V2T'].includes(controlLayout)&&selector==='5-way-blade';
 const lp=layout==='HH'&&controlLayout==='2V2T'&&selector==='3-way-toggle'&&['les-paul','sg'].includes(family);
 const prs=layout==='HH'&&controlLayout==='1V1T'&&selector==='3-way-blade'&&['prs','prs-se'].includes(family);
 if(!hss&&!lp&&!prs)throw Error('Manual split requires validated HSS or Les Paul / SG wiring.');
 if(!Array.isArray(value)||!value.length||value.length>(lp?2:1))throw Error('Unsupported number of manual coil-split modifiers.');
 const used=new Set();
 return value.map(item=>{
  const expected=prs?prsSplitModifier(item?.position):hss?bridgeSplitModifier(item?.position):toneSplitModifier(item?.pickup,item?.position);
  if(!item||Object.keys(item).length!==Object.keys(expected).length||Object.keys(expected).some(key=>item[key]!==expected[key])||used.has(item.id))throw Error('Unsupported switching device, host, function or coil topology.');
  if(prs&&['neck','bridge'].some(p=>(coilAccess[p]||'four-conductor')!=='four-conductor'))throw Error('Shared PRS split requires four-conductor access on both pickups.');
  if((coilAccess[item.pickup]||(item.pickup==='bridge'?bridgeAccess:'four-conductor'))!=='four-conductor')throw Error('Manual split requires four-conductor coil access.');
  dpdtContacts(item.id,item.position);used.add(item.id);return expected;
 }).sort((a,b)=>a.id.localeCompare(b.id));
}
