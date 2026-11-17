import {calculateEconomicsV2} from '../orders/economics-v2.mjs';
import {decimal,roundRatio} from '../orders/economics.mjs';
import {validBusinessDate,londonDay} from '../orders/commercial-date.mjs';

export const rowsPerPage=10, maximumOrders=250;
export const channels={WEBSITE:'Website',EBAY:'eBay',DIRECT:'Direct',OTHER:'Other marketplace'};
const integer=(v,low=0,high=1e12)=>Number.isSafeInteger(v)&&v>=low&&v<=high;
const need=(ok,msg)=>{if(!ok)throw Error(msg);};
const dayMs=86400000;
export function validateRange(from,to){
 need(validBusinessDate(from)&&validBusinessDate(to)&&from<=to,'Use a valid reporting period.');
 need((Date.parse(to)-Date.parse(from))/dayMs<366,'Choose a period of up to 366 days.');
 return {from,to};
}
const dateString=d=>d.toISOString().slice(0,10);
export function reportRange(kind,today=londonDay()){
 need(validBusinessDate(today),'Invalid reporting day.');
 const d=new Date(today+'T12:00:00Z'), year=d.getUTCFullYear(), month=d.getUTCMonth();
 switch(kind){
 case 'day':return {from:today,to:today};
 case 'week':d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);break;
 case 'month':d.setUTCDate(1);break;
 case 'quarter':d.setUTCDate(1);d.setUTCMonth(month-month%3);break;
 case 'year':d.setTime(Date.UTC(year,0,1,12));break;
 default:throw Error('Select a reporting period.');
 }
 return {from:dateString(d),to:today};
}
const stateNames={recorded:'Recorded',estimated:'Estimated',incomplete:'Incomplete',unreconciled:'Unreconciled',stale:'Order changed',missing:'Not recorded',invalid:'Review record'};
export function evaluate(row){
 const result={...row,state:'missing',calculation:null};
 if(row.finance){
   if(row.current!==true)result.state='stale';
   else try{
     const c=calculateEconomicsV2(row.finance);
     need(c.currency===row.currency,'Currency mismatch.');
     result.state=c.status;result.calculation=c;
   }catch{result.state='invalid';}
 }
 result.label=stateNames[result.state];return result;
}
const makeGroup=(key,currency)=>({key,currency,orders:0,recorded:0,estimated:0,needsReview:0,
 buyerPaid:0,actualRefund:0,sellerRevenue:0,revenueCount:0,settlement:0,settlementCount:0,
 contribution:0,contributionRevenue:0,fees:0,marketplace:0,advertising:0,payment:0,
 cogs:0,shipping:0,packaging:0,discount:0,refund:0,marketplaceCount:0,advertisingCount:0,paymentCount:0});
function add(bucket,r){
 bucket.orders++;
 bucket.buyerPaid+=r.total;
 bucket.actualRefund+=r.refund;
 if(r.state==='estimated')bucket.estimated++;
 if(!['recorded','estimated'].includes(r.state))bucket.needsReview++;
 const c=r.calculation;
 if(!c||!['recorded','estimated'].includes(r.state))return;
 // Only confirmed result amounts enter the totals. Do not add up partial estimates.
 if(r.state!=='recorded')return;
 bucket.recorded++;
 bucket.revenueCount++;bucket.sellerRevenue+=c.netRevenueMinor;
 if(c.actualSellerSettlementMinor!==null&&r.finance.settlement?.state==='confirmed'){
  bucket.settlementCount++;bucket.settlement+=c.actualSellerSettlementMinor;
 }
 bucket.contribution+=c.contributionMinor;bucket.contributionRevenue+=c.netRevenueMinor;
 bucket.fees+=c.feesMinor;
 for(const name of ['marketplace','advertising','payment']){
  if(r.finance.fees.some(f=>f.includes?.includes(name)))continue;
  bucket[name+'Count']++;bucket[name]+=c.feesByCategory[name]??0;
 }
 bucket.cogs+=c.cogsMinor;bucket.shipping+=c.fulfilmentCosts.shipping;
 bucket.packaging+=c.fulfilmentCosts.packaging;bucket.discount+=c.orderDiscountMinor+c.lines.reduce((n,l)=>n+l.subtotalMinor-l.netProductMinor,0);
 bucket.refund+=c.refundMinor;
}
export function report(orders){
 need(Array.isArray(orders)&&orders.length<=maximumOrders,'Reporting window is too large.');
 const totals=new Map(),byChannel=new Map(),products=new Map(),seen=new Set(),detail=[];
 for(const order of orders){
  need(typeof order.id==='string'&&!seen.has(order.id)&&Object.hasOwn(channels,order.channel)&&['GBP','USD','EUR'].includes(order.currency)&&integer(order.total)&&integer(order.refund),'Unexpected or duplicate order data.');
  seen.add(order.id);
  const r=evaluate(order);detail.push(r);
  const get=(map,k)=>{if(!map.has(k))map.set(k,makeGroup(k,r.currency));return map.get(k);};
  add(get(totals,r.currency),r);add(get(byChannel,r.channel+':'+r.currency),r);
  for(const [index,item] of order.items.entries()){
   if(!integer(item.quantity,1,99)||!integer(item.lineTotal))continue;
   const key=[r.currency,item.productId||item.sku||item.name,r.channel].join(':');
   let p=products.get(key);if(!p){p={name:item.name||item.sku||'Historical item',channel:r.channel,currency:r.currency,units:0,sales:0,covered:0,cost:0,attributedOrders:0,contribution:0};products.set(key,p);}
   p.units+=item.quantity;p.sales+=item.lineTotal;
   const matched=r.state==='recorded'&&r.finance.lines[index]?.id==='line-'+index&&r.calculation.lines[index]?.quantity===item.quantity
     &&r.finance.lines[index]?.productId===item.productId&&r.finance.lines[index]?.label===item.name
     &&r.finance.lines[index]?.costState==='confirmed'&&!r.finance.returnCostCredit;
   if(matched&&integer(r.calculation.lines[index].cogsMinor)){p.covered+=item.quantity;p.cost+=r.calculation.lines[index].cogsMinor;}
   if(order.items.length===1&&r.state==='recorded'&&r.finance.lines.length===1&&r.finance.lines[0].id==='line-0'
      &&r.finance.lines[0].productId===item.productId&&r.finance.lines[0].label===item.name&&r.finance.lines[0].quantity===item.quantity){
    p.attributedOrders++;p.contribution+=r.calculation.contributionMinor;
   }
  }
 }
 const finish=g=>({...g,margin:g.recorded&&g.contributionRevenue>0?Number(roundRatio(BigInt(g.contribution)*10000n,BigInt(g.contributionRevenue)))/100:null});
 return {detail,totals:[...totals.values()].map(finish),channels:[...byChannel.values()].map(finish),products:[...products.values()].map(p=>({...p,average:p.units?Number(roundRatio(BigInt(p.sales),BigInt(p.units))):null})).sort((a,b)=>b.sales-a.sales||a.name.localeCompare(b.name))};
}
export function csvCell(value){
 if(value==null)return '""';
 if(typeof value==='number'){need(Number.isFinite(value),'Invalid export amount.');return String(value);}
 const text=String(value);
 // Prevent formula evaluation even if leading spaces or control characters would be ignored by Excel.
 return '"'+(/^[\s\p{Cf}\p{Cc}]*[=+\-@]|^[\t\r\n]/u.test(text)?"'":'')+text.replaceAll('"','""')+'"';
}
export const csv=rows=>rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';

const ceil=(n,d)=>n<=0n?0n:(n+d-1n)/d;
export function pricePlan(input){
 const {acquisition,packaging,postage,customerPostage,fixedFee,marketplace,advertising,payment,tax,margin,target}=input;
 for(const n of [acquisition,packaging,postage,customerPostage,fixedFee,target])need(integer(n,0,100000000),'Enter monetary assumptions from £0 to £1,000,000.');
 for(const n of [marketplace,advertising,payment,tax,margin])need(integer(n,0,9999),'Enter percentage assumptions below 100%.');
 const unit=10000n,rates=BigInt(marketplace+advertising+payment+tax),want=BigInt(margin);
 need(rates+want<unit,'The combined rates and target margin must be below 100%.');
 const burden=BigInt(acquisition+packaging+postage+fixedFee),delivery=BigInt(customerPostage);
 // All percentage inputs apply to the same buyer total. Estimate one rounded-up combined deduction.
 // ceil(variable deduction) guarantees the requested minimum at penny precision.
 const minimum=(contribution,marginRate=0n)=>{const gross=ceil((burden+contribution)*unit,unit-rates-marginRate);return gross>delivery?gross-delivery:0n;};
 const breakEven=minimum(0n),byContribution=minimum(BigInt(target)),byMargin=minimum(0n,want);
 // Round margin and variable deductions together, then check that an independently rounded fee
 // still preserves the requested ratio. At most one additional penny is needed per retained-penny step.
 let sale=byContribution>byMargin?byContribution:byMargin;
 const outcome=()=>{const gross=sale+delivery,variable=ceil(gross*rates,unit),contribution=gross-variable-burden;return {gross,variable,contribution};};
 for(let i=0;i<=10000;i++){
  const o=outcome();
  if(o.contribution*unit>=o.gross*want||!o.gross){
   for(const n of [sale,o.contribution,o.gross])need(n<=100000000n,'The target price exceeds the calculator range.');
   return {breakEven:Number(breakEven),targetPrice:Number(sale),gross:Number(o.gross),deductions:Number(o.variable)+fixedFee,
    contribution:Number(o.contribution),margin:o.gross?Number(roundRatio(o.contribution*unit,o.gross))/100:null};
  }
  sale++;
 }
 throw Error('The target does not fit supported penny rounding.');
}
export const parsePounds=value=>decimal(value);
