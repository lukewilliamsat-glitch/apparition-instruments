const check=(condition,message)=>{if(!condition)throw new Error(message);};
const values=(n)=>Number.isInteger(n)&&n>=100&&n<=10_000_000;
const compare=(a,b)=>a<b?-1:a>b?1:0;
export function toOhms(value){
 const text=String(value).trim();
 check(/^\d{1,5}(\.\d{1,3})?$/.test(text),'Enter kΩ to at most three decimal places.');
 const [whole,frac='']=text.split('.');
 const n=Number(whole)*1000+Number(frac.padEnd(3,'0'));
 check(values(n),'Enter 0.100 to 10,000.000 kΩ.');
 return n;
}
export function pence(value,{signed=false}={}){
 const s=String(value).trim()||'0';
 check((signed?/^-?\d{1,10}(\.\d{1,2})?$/:/^\d{1,10}(\.\d{1,2})?$/).test(s),'Enter a monetary amount to two decimals.');
 const [whole,part='']=s.replace(/^-/,'').split('.');
 const n=Number(whole)*100+Number(part.padEnd(2,'0'));
 return s.startsWith('-')?-n:n;
}
export const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
export const money=n=>n==null?'Unknown':gbp.format(Number(n)/100);
export const resistance=n=>(n/1000).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:3})+' kΩ';
export function statistics(units){
 const a=units.filter(u=>u.quality!=='retired').map(u=>u.resistance_ohm).filter(values).sort((x,y)=>x-y);
 if(!a.length)return null;
 const min=a[0],max=a.at(-1),width=(max-min+1)/5,cells=Array(5).fill(0);
 for(const value of a)cells[Math.min(4,Math.floor((value-min)/width))]++;
 return {count:a.length,min,max,mean:a.reduce((s,x)=>s+x,0)/a.length,distribution:cells};
}
function compatibility(u){
 return [u.component_id,u.nominal_ohm,String(u.taper).trim().toLowerCase(),String(u.shaft).trim().toLowerCase()].join('\u001f');
}
const ordered=(a,b)=>a.resistance_ohm-b.resistance_ohm||compare(a.id,b.id);
function roundedCost(units){
 let amount=0n,den=1n;
 for(const u of units){
  const q=BigInt(u.batch_quantity);
  amount=amount*q+BigInt(u.cost_minor)*den;den*=q;
 }
 return Number((2n*amount+den)/(2n*den));
}
function summarize(units){
 const min=units[0].resistance_ohm,max=units.at(-1).resistance_ohm,abs=max-min;
 const avg=units.reduce((s,u)=>s+u.resistance_ohm,0)/units.length;
 const basis=units.every(u=>Number.isSafeInteger(u.cost_minor)&&Number.isSafeInteger(u.batch_quantity)&&u.batch_quantity>0)
  ?roundedCost(units):null;
 return {units,min,max,abs,spread:100*abs/min,avg,nominalDeviation:100*(avg-units[0].nominal_ohm)/units[0].nominal_ohm,costMinor:basis};
}
export function measuredToleranceBp(match){
 // Round up to the smallest whole basis point that still covers the measured spread.
 return Math.floor((match.abs*10000+match.min-1)/match.min);
}
export function matchUnits(pool,{size=2,toleranceBp=100,objective='best'}={}){
 check([2,4].includes(size)&&Number.isInteger(toleranceBp)&&toleranceBp>=0&&toleranceBp<=2000&&['best','maximum'].includes(objective),
  'Select pairs or quartets and a tolerance from 0% to 20%.');
 check(pool.length<=100,'Narrow the measurement window to at most 100 units.');
 const groups=new Map(),seen=new Set();
 for(const u of pool){
  if(u.quality!=='accepted'||u.allocated||!values(u.resistance_ohm)||seen.has(u.id))continue;
  if(!values(u.nominal_ohm)||!u.component_id||!u.taper||!u.shaft)continue;
  seen.add(u.id);
  const k=compatibility(u); if(!groups.has(k))groups.set(k,[]);groups.get(k).push(u);
 }
 const sets=[];
 for(const key of [...groups.keys()].sort()){
  const g=groups.get(key).sort(ordered);
  // If a consecutive window fails, its lowest unit cannot match any later
  // window. If it passes, using the first k preserves maximum cardinality.
  for(let start=0;start+size<=g.length;){
   const a=g[start].resistance_ohm,b=g[start+size-1].resistance_ohm;
   if((b-a)*10000<=a*toleranceBp){sets.push(summarize(g.slice(start,start+size)));start+=objective==='maximum'?size:1;}
   else start++;
  }
 }
 if(objective==='maximum')return sets;
 sets.sort((a,b)=>a.abs*b.min-b.abs*a.min||a.abs-b.abs||compare(a.units.map(u=>u.id).join(':'),b.units.map(u=>u.id).join(':')));
 return sets.slice(0,1);
}
const unitGbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:6});
export function purchaseLineCosts(merchandise,allocation,quantity){
 check(Number.isSafeInteger(merchandise)&&merchandise>=0&&Number.isSafeInteger(allocation)
  &&Number.isSafeInteger(quantity)&&quantity>0,'Invalid purchase line costs.');
 const landed=merchandise+allocation;
 check(Number.isSafeInteger(landed)&&landed>=0,'Landed line cost cannot be negative.');
 return {
  merchandise,allocation,landed,
  merchandiseUnit:unitGbp.format(merchandise/(quantity*100)),
  landedUnit:unitGbp.format(landed/(quantity*100)),
 };
}
export function allocateShared(total,weights){
 check(Number.isSafeInteger(total)&&weights.length&&weights.every(w=>Number.isSafeInteger(w)&&w>=0),'Invalid allocation inputs.');
 const sum=weights.reduce((s,w)=>s+BigInt(w),0n);
 if(!sum){check(!total,'Positive weights required for shared costs.');return weights.map(()=>0);}
 let used=0n,progress=0n;
 return weights.map(w=>{progress+=BigInt(w);const next=BigInt(total)*progress/sum,share=next-used;used=next;return Number(share);});
}

export function draftAcquisition(line,evidence){
 if(!line||line.costState!=='unknown'||line.productId!==evidence.component_id||line.quantity!==evidence.quantity
  ||!Number.isSafeInteger(evidence.batch_total_minor)||evidence.batch_total_minor<0
  ||!Number.isSafeInteger(evidence.batch_quantity)||evidence.batch_quantity<1
  ||!['allocated_batch','verified_physical_trace'].includes(evidence.basis))return null;
 const q=BigInt(evidence.batch_quantity);
 const unit=Number((BigInt(evidence.batch_total_minor)*10000n+q/2n)/q);
 if(!Number.isSafeInteger(unit)||unit>1000000000000)return null;
 const confirmed=evidence.basis==='verified_physical_trace';
 return {...line,unitCostMicro:unit,costState:confirmed?'confirmed':'estimated',
  costProvenance:{basis:confirmed?'historical_snapshot':'current_estimate'},
  costSource:(confirmed?'Verified batch trace ':'Allocated historical batch basis (estimate) ')+evidence.batch_id+' · '+String(evidence.evidence||'').slice(0,130)};
}
