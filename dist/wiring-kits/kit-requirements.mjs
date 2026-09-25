// Physical roles live in Kit Definition defaults.requirements, separate from fixed Assembly BOM IDs.
export const lesPaulRequirements=Object.freeze([
 {role:'potentiometers',quantity:4,source:'potentiometers',selectionKeys:['pots','shaft'],pricing:'relative-to-default'},
 {role:'neckToneCapacitor',quantity:1,source:'capacitors',selectionKeys:['neckCap'],pricing:'unit'},
 {role:'bridgeToneCapacitor',quantity:1,source:'capacitors',selectionKeys:['bridgeCap'],pricing:'unit'},
 {role:'trebleBleeds',quantity:2,source:'bleed',selectionKeys:['bleed'],pricing:'unit'},
 {role:'outputJack',quantity:1,source:'jack',selectionKeys:['jack'],pricing:'unit'},
 {role:'selector',quantity:1,source:'selector',selectionKeys:['selector'],pricing:'unit'}
]);
export function normaliseKitRequirements(value){
 if(!Array.isArray(value)||!value.length)throw new Error('Kit Definition needs physical Component requirements.');
 const seen=new Set();return value.map(row=>{
  const role=String(row?.role||''),source=String(row?.source||''),selectionKeys=row?.selectionKeys;
  if(!/^[a-z][a-zA-Z]*$/.test(role)||seen.has(role)||!['potentiometers','capacitors','bleed','jack','selector'].includes(source)||!Array.isArray(selectionKeys)||!selectionKeys.length||selectionKeys.some(key=>!['pots','shaft','neckCap','bridgeCap','bleed','jack','selector'].includes(key))||!Number.isSafeInteger(row.quantity)||row.quantity<1||!['unit','relative-to-default'].includes(row.pricing))throw new Error('Invalid physical kit requirement: '+role);
  seen.add(role);return {role,source,selectionKeys:[...selectionKeys],quantity:row.quantity,pricing:row.pricing};
 });
}
export function resolvePhysicalRequirements(requirements,selection,resolve){
 const roles=normaliseKitRequirements(requirements).map(requirement=>{
  const choice=Object.fromEntries(requirement.selectionKeys.map(key=>[key,selection[key]])),option=resolve(requirement,choice),component=option?.component||null;
  const quantity=component?requirement.quantity:option?.none?0:requirement.quantity;
  const unitKitPrice=component?.kitPrice??null;
  return {...requirement,selection:choice,componentId:component?.id||null,component:component?structuredClone(component):null,quantity,unitKitPrice,priceContribution:0};
 });
 const totals=new Map();for(const role of roles)if(role.componentId)totals.set(role.componentId,(totals.get(role.componentId)||0)+role.quantity);
 const stockRequirements=[...totals].map(([componentId,quantity])=>({componentId,quantity}));
 return {roles,stockRequirements};
}
