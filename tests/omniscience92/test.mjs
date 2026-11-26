import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {aggregatePeriod} from './aggregate.mjs';

const line={id:'line-0',productId:'fixture',label:'Same display name',quantity:1,unitPriceMinor:1000,
 priceBasis:'net',discountMinor:0,unitCostMicro:2000000,costState:'confirmed',costSource:'Historical batch'};
const finance={
 policyVersion:'marketplace-contribution-v2',currency:'GBP',lines:[line],
 discount:{kind:'none',minor:0,percentage:''},postageMinor:0,actualPaidMinor:1000,
 marketplaceTaxMinor:0,marketplaceTaxState:'confirmed',marketplaceTaxSource:'Recorded direct sale',
 paymentBreakdownBasis:'customer_gross',settlement:{minor:null,state:'unknown',source:'',adjustmentMinor:0,adjustmentSource:''},
 fees:[{id:'payment-fee',category:'payment',direction:'charge',method:'fixed',actualMinor:50,state:'confirmed',source:'Provider statement',includes:[]}],
 feesComplete:true,costs:{shipping:{minor:100,state:'confirmed',source:'Postage'},
 packaging:{minor:50,state:'confirmed',source:'Packaging'},other:{minor:0,state:'confirmed',source:'Reviewed'},
 labour:{state:'excluded'}},tax:{state:'not_applicable',minor:null,source:''},adjustments:[]
};
const orders=Array.from({length:301},(_,index)=>{
 const itemId=index%2?'fixture':'other-fixture';
 const document=structuredClone(finance);
 document.lines[0].productId=itemId;
 if(index>=250&&index<275)document.lines[0].costState='estimated';
 return {id:'00000000-0000-4000-8000-'+String(9999-index).padStart(12,'0'),
 day:'2026-11-26',reference:'FIXTURE-'+index,channel:'DIRECT',currency:'GBP',total:1000,refund:0,
 current:true,finance:index>=275?null:document,
 items:[{productId:itemId,name:line.label,quantity:1,lineTotal:1000}]};
});
const outlays=Array.from({length:301},(_,i)=>({id:'00000000-0000-4000-8000-'+String(9999-i).padStart(12,'0'),
 day:'2026-11-26',sterling_minor:100,funding:i%2?'business':'director',
 treatment:i<100?'overhead':i<200?'stock':'recorded-elsewhere'}));
let fence='a'.repeat(32),reads=0;
const read=async(kind,values)=>{
 reads++;
 if(kind==='scope')return {orders:orders.length,outlays:outlays.length,revision:fence};
 const rows=kind==='orders'?orders:outlays;
 const cursor=values.p_cursor_id;
 const start=cursor?rows.findIndex(r=>r.id===cursor)+1:0;
 const page=rows.slice(start,start+100),last=page.at(-1);
 return {rows:page,next:start+100<rows.length?{id:last.id,day:last.day}:null};
};
const signal=new AbortController().signal;
const result=await aggregatePeriod({from:'2026-11-01',to:'2026-11-30'},read,signal);
assert.equal(result.orderCount,301);assert.equal(result.outlayCount,301);
assert.equal(reads,10);
const total=result.report.totals[0];
assert.equal(total.orders,301);assert.equal(total.recorded,250);assert.equal(total.estimated,25);assert.equal(total.needsReview,26);
assert.equal(total.buyerPaid,301000);assert.equal(total.cogs,50000);assert.equal(total.shipping,25000);
assert.equal(total.packaging,12500);assert.equal(total.fees,12500);assert.equal(total.contribution,150000);
assert.equal(result.report.products.length,2);assert.equal(result.report.trend[0].total,301000);
assert.deepEqual(result.spend,{overhead:10000,business:15000,director:15100});
assert.ok(!JSON.stringify(result).includes('Historical batch'));
assert.ok(!JSON.stringify(result).includes('FIXTURE-'));
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result));
let probes=0;
await assert.rejects(aggregatePeriod({from:'2026-11-01',to:'2026-11-30'},async(...params)=>{
 const result=await read(...params);
 if(params[0]==='scope'&&++probes===2)return {...result,revision:'b'.repeat(32)};
 return result;
},signal),/changed/);
console.log('PASS complete 301-order and 301-outlay aggregation, exact financial coverage, distinct product identities, costs, spend and drift rejection');
