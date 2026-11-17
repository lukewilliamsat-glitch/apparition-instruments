import assert from 'node:assert/strict';
import {allocateShared,matchUnits,statistics,toOhms,pence,draftAcquisition} from '../../dist/admin/ironclad/model.mjs';
const unit=(ohm,id,extra={})=>({id,component_id:'pot-500',nominal_ohm:500000,resistance_ohm:ohm,taper:'A',shaft:'split short',quality:'accepted',allocated:false,...extra});
assert.equal(toOhms('497.900'),497900);assert.throws(()=>toOhms('497.9001'));assert.throws(()=>toOhms('-2'));
assert.equal(pence('0.01'),1);assert.equal(pence('-1.22',{signed:true}),-122);
assert.deepEqual(allocateShared(370,[8,2]),[296,74]);assert.deepEqual(allocateShared(-5,[1,1,1]),[-1,-2,-2]);
assert.deepEqual(allocateShared(11,[10,20,100]),[0,2,9]);assert.throws(()=>allocateShared(11,[0,0]));
const four=[unit(497900,'a'),unit(498200,'b'),unit(498500,'c'),unit(498700,'d')];
assert.equal(statistics(four).mean,498325);
assert.equal(matchUnits([...four,unit(498700,'e',{shaft:'long'})],{size:4,toleranceBp:100})[0].abs,800);
assert.equal(matchUnits(four,{size:2,toleranceBp:100})[0].units.map(u=>u.id).join(''),'cd');
assert.equal(matchUnits(four,{size:4,toleranceBp:10}).length,0);
assert.equal(matchUnits([unit(500000,'d'),unit(500000,'c'),unit(500000,'b'),unit(500000,'a')],{size:2,toleranceBp:0})[0].units.map(u=>u.id).join(''),'ab');
assert.equal(matchUnits([...four,unit(498700,'e',{quality:'rejected'}),unit(498699,'f',{allocated:true})],{size:2,toleranceBp:100,objective:'maximum'}).length,2);
let seed=69;const rng=()=>((seed=seed*16807%2147483647)%8000);
function optimum(raw,k,t){
 if(raw.length<k)return 0;
 let best=optimum(raw.slice(1),k,t);
 const all=2**raw.length;for(let mask=1;mask<all;mask+=2){
  const picked=raw.filter((_,i)=>mask&(2**i));if(picked.length!==k)continue;
  if((Math.max(...picked)-Math.min(...picked))*10000>Math.min(...picked)*t)continue;
  best=Math.max(best,1+optimum(raw.filter((_,i)=>!(mask&(2**i))),k,t));
 }return best;
}
for(let i=0;i<120;i++){
 const k=i%2?2:4,t=i%3===0?50:100,raw=Array.from({length:8},()=>490000+rng()),units=raw.map((n,j)=>unit(n,String(j)));
 const sets=matchUnits(units,{size:k,toleranceBp:t,objective:'maximum'});
 assert.equal(sets.length,optimum(raw,k,t));
 assert.equal(new Set(sets.flatMap(s=>s.units.map(u=>u.id))).size,k*sets.length);
}
const l={productId:'pot-500',quantity:2,costState:'unknown'};
const s={component_id:'pot-500',quantity:2,batch_id:'b1',batch_total_minor:1398,batch_quantity:4,basis:'allocated_batch',evidence:'Synthetic invoice'};
assert.equal(draftAcquisition(l,s).unitCostMicro,3495000);
assert.equal(draftAcquisition(l,s).costState,'estimated');
assert.equal(draftAcquisition(l,{...s,basis:'verified_physical_trace'}).costState,'confirmed');
assert.equal(draftAcquisition({...l,costState:'confirmed'},s),null);
assert.equal(draftAcquisition(l,{...s,quantity:3}),null);
assert.equal(l.costState,'unknown');
console.log('IRONCLAD model passed money, allocation, units, 120 exhaustive matching comparisons, and acquisition provenance.');
