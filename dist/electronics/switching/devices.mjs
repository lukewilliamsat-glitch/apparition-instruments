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
export function normaliseSwitching(value,{layout,controlLayout,selector,bridgeAccess='four-conductor'}={}){
 if(value===undefined)return undefined;
 if(!Array.isArray(value)||value.length!==1)throw Error('Exactly one optional manual coil-split modifier is supported.');
 if(layout!=='HSS'||!['1V1T','1V2T'].includes(controlLayout)||selector!=='5-way-blade'||bridgeAccess!=='four-conductor')throw Error('Manual split requires validated HSS, a five-way blade and four-conductor bridge coil access.');
 const item=value[0],expected=bridgeSplitModifier(item?.position);
 if(!item||Object.keys(item).length!==Object.keys(expected).length||Object.keys(expected).some(key=>item[key]!==expected[key]))throw Error('Unsupported switching device, host, function or coil topology.');
 dpdtContacts(item.id,item.position);
 return [expected];
}
