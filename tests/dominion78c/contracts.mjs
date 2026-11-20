// DOMINION adapter contracts. Sandbox only; never used by live checkout.
export const identifier = (value, label = 'ID') => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value) || ['constructor','prototype'].includes(value))
    throw new Error('Invalid '+label);
  return value;
};
export function whole(value, label, min = 0, max = 10000000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error('Invalid '+label);
  return value;
}
export function currency(code) {
  if (typeof code !== 'string' || !/^[A-Z]{3}$/.test(code)) throw new Error('Invalid currency');
  return code;
}
export function minor(value, code) {
  currency(code);
  const digits = {GBP:2,USD:2,EUR:2,JPY:0}[code];
  if (digits === undefined || typeof value !== 'string' || !/^-?(0|[1-9]\d{0,8})(\.\d{1,3})?$/.test(value)) throw new Error('Unsupported money amount');
  const [p,q=''] = value.replace(/^-/,'').split('.');
  if (q.length > digits) throw new Error('Fractional minor unit');
  const n = Number(p)*10**digits + Number(q.padEnd(digits,'0'));
  if (n > 10000000000) throw new Error('Amount out of range');
  return value.startsWith('-') ? -n : n;
}
export function instant(value, label='timestamp') {
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value))) throw new Error('Invalid '+label);
  const day=value.slice(0,10), date=new Date(day+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)throw new Error('Invalid '+label);
  return new Date(value).toISOString();
}
export const unique=(values,key=x=>x)=>new Set(values.map(key)).size===values.length;
export function providerRef({provider,account,reference}) {
  return JSON.stringify([identifier(provider,'provider'),identifier(account,'account alias'),identifier(reference,'provider reference')]);
}
export function requirements(items) {
  if (!Array.isArray(items)||!items.length||items.length>100) throw new Error('Invalid saved order lines');
  const physical = new Map();
  const add=(id,q)=>{
    identifier(id,'component ID');
    whole(q,'expanded requirement',1,1000000);
    physical.set(id,whole((physical.get(id)||0)+q,'total requirement',1,1000000));
  };
  for (const x of items) {
    const n=whole(x.quantity,'order-line quantity',1,10000);
    if(x.type==='component') add(x.productId,n);
    else if(x.type==='assembly'||x.type==='kit'){
      const parts=x.snapshot?.stockRequirements;
      if(!Array.isArray(parts)||!parts.length||parts.length>200)throw new Error('Missing saved physical requirements');
      for(const p of parts)add(p.componentId,whole(p.quantity,'part quantity',1,10000)*n);
    }else throw new Error('Unknown physical order line');
  }
  return [...physical].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([componentId,quantity])=>({componentId,quantity}));
}
export function stockPosition({physical,reserved=0,allocated=0,qualityHeld=0}) {
  [physical,reserved,allocated,qualityHeld].forEach(v=>whole(v,'stock quantity'));
  return {physical,reserved,allocated,qualityHeld,available:Math.max(physical-reserved-allocated-qualityHeld,0),shortfall:Math.max(reserved+allocated+qualityHeld-physical,0)};
}
export function kitAvailability(items, rowFor) {
  const lines=requirements(items).map(part=>{
    const row=rowFor(part.componentId);
    return {...part,known:!!row,available:row ? stockPosition(row).available : 0};
  });
  return {available:Math.min(...lines.map(l=>Math.floor(l.available/l.quantity))),lines};
}
// Work with projections from the existing measurement/set records, not substitute measurements.
export function matchedEligibility({componentId,units,noActiveHold=true,toleranceBasisPoints,nominalOhm}) {
  identifier(componentId);whole(toleranceBasisPoints,'tolerance',0,2000);whole(nominalOhm,'nominal resistance',1,100000000);
  if(!Array.isArray(units)||![2,4].includes(units.length)||!unique(units,x=>identifier(x.id,'unit ID')))return false;
  const key=x=>typeof x.taper==='string'&&x.taper.trim()&&typeof x.shaft==='string'&&x.shaft.trim()?x.taper.trim().toLowerCase()+'|'+x.shaft.trim().toLowerCase():null;
 const physicalProfile=key(units[0]);
 return Boolean(noActiveHold&&physicalProfile)&&units.every(x=>key(x)===physicalProfile)&&units.every(x=>x.componentId===componentId&&x.quality==='accepted'&&!x.quarantined&&!x.retired&&!x.activeSetId&&x.nominalOhm===nominalOhm&&Number.isSafeInteger(x.measuredOhm)&&x.measuredOhm>0&&x.measuredOhm<=100000000&&Math.abs(x.measuredOhm-nominalOhm)*10000<=nominalOhm*toleranceBasisPoints)&&(Math.max(...units.map(x=>x.measuredOhm))-Math.min(...units.map(x=>x.measuredOhm)))*10000<=nominalOhm*toleranceBasisPoints;
}
