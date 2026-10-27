// Private Admin calculation model. Integer minor units; micro-units retain unit-cost precision.
// Nothing here reads a service, persists a draft, issues a refund or moves inventory.
export const FINANCE_POLICY='marketplace-contribution-v1';
export const CURRENCIES=['GBP','EUR','USD']; // Explicit two-decimal currencies; never an FX conversion.
const MAX=1000000000000,MAX_MICRO=100000000000000;
const need=(test,message)=>{if(!test)throw Error(message);};
const whole=(v,label,min=0,max=MAX)=>{need(Number.isSafeInteger(v)&&v>=min&&v<=max,label+' is outside the supported integer range.');return BigInt(v);};
const number=(v,label='Total')=>{need(v>=-BigInt(MAX)&&v<=BigInt(MAX),label+' exceeds the supported range.');return Number(v);};
export function roundRatio(n,d){need(typeof n==='bigint'&&typeof d==='bigint'&&d>0n,'Invalid exact ratio.');const sign=n<0n?-1n:1n,a=n<0n?-n:n;return sign*((a+d/2n)/d);}
export function decimal(value,scale=2,{signed=false}={}){
 need(Number.isInteger(scale)&&scale>=0&&scale<=6,'Unsupported decimal precision.');const text=String(value).trim();need(text.length<=24&&new RegExp('^'+(signed?'-?':'')+'[0-9]+'+(scale?'(?:\\.[0-9]{1,'+scale+'})?':'')+'$').test(text),'Enter a decimal amount with at most '+scale+' places.');
 const negative=text.startsWith('-'),[a,b='']=(negative?text.slice(1):text).split('.'),n=BigInt(a)*10n**BigInt(scale)+BigInt(b.padEnd(scale,'0'));
 need(n<=BigInt(scale===6?MAX_MICRO:MAX),'Amount exceeds the supported range.');return Number(negative?-n:n);
}
export function decimalText(value,scale=2){whole(Math.abs(value),'Amount',0,scale===6?MAX_MICRO:MAX);const n=BigInt(Math.abs(value)),base=10n**BigInt(scale);return (value<0?'-':'')+(n/base)+'.'+String(n%base).padStart(scale,'0');}
const percent=(base,value)=>{const p=whole(decimal(value,4),'Percentage',0,10000000);return roundRatio(base*p,1000000n);};
const states=new Set(['confirmed','estimated','unknown']);
function classification(state,source,label){need(states.has(state),label+': choose confirmed, estimated or unknown.');if(state==='confirmed')need(typeof source==='string'&&source.trim().length>0&&source.length<=300,label+': add the evidence/source reference.');return state;}
function unique(rows,label){need(Array.isArray(rows)&&rows.length<=50,'Too many '+label+'.');const ids=new Set();for(const row of rows){need(typeof row.id==='string'&&row.id.length>0&&row.id.length<=120&&!ids.has(row.id),'Duplicate or missing '+label+' identity.');ids.add(row.id);}}
const feeCategories=new Set(['marketplace','payment','advertising','conversion','regulatory','other']);
export function calculateEconomics(input){
 need(input&&input.policyVersion===FINANCE_POLICY,'Unsupported financial calculation version.');need(CURRENCIES.includes(input.currency),'Unsupported calculation currency. No conversion was performed.');
 const unknown=[],provisional=[],warnings=[],lines=input.lines;unique(lines,'line');need(lines.length>=1&&lines.length<=10,'Use 1–10 existing order lines.');
 let products=0n,cogs=0n;
 const perLine=lines.map(line=>{
  const qty=whole(line.quantity,'Quantity',1,99),gross=whole(line.unitPriceMinor,'Unit selling price')*qty,discount=whole(line.discountMinor??0,'Line discount');
  need(['net','before_discount'].includes(line.priceBasis),'Choose whether the unit price already includes discounts.');
  if(line.priceBasis==='before_discount')need(discount<=gross,'Line discount exceeds the line subtotal.');
  const net=gross-(line.priceBasis==='before_discount'?discount:0n);products+=net;
  if(line.priceBasis==='net'&&discount)warnings.push('A recorded line discount is already included in its unit price.');
  const state=classification(line.costState??'unknown',line.costSource,'Stock cost');let cost=null;
  if(line.unitCostMicro===null||line.unitCostMicro===undefined||state==='unknown')unknown.push('Cost unknown: '+(line.label||line.productId||line.id));
  else{cost=roundRatio(whole(line.unitCostMicro,'Unit acquisition cost',0,MAX_MICRO)*qty,10000n);cogs+=cost;if(state==='estimated')provisional.push('Current or estimated cost: '+line.id);}
  return {id:line.id,quantity:line.quantity,subtotalMinor:number(gross),netProductMinor:number(net),cogsMinor:cost===null?null:number(cost)};
 });
 const promotion=input.discount||{kind:'none'};need(['none','manual','percent','included'].includes(promotion.kind),'Choose a supported order discount.');
 let orderDiscount=0n;
 if(promotion.kind==='manual')orderDiscount=whole(promotion.minor,'Order discount');
 if(promotion.kind==='percent'){need(decimal(promotion.percentage,4)<=1000000,'A discount cannot exceed 100%.');orderDiscount=percent(products,promotion.percentage);}
 if(promotion.kind==='included'){whole(promotion.minor??0,'Included discount');warnings.push('Order discount is already included in unit prices; it is not subtracted again.');}
 need(orderDiscount<=products,'Order discount exceeds product revenue.');products-=orderDiscount;
 const postage=whole(input.postageMinor,'Customer postage'),marketplaceTax=input.marketplaceTaxMinor===null||input.marketplaceTaxMinor===undefined?null:whole(input.marketplaceTaxMinor,'Marketplace-collected tax'),expected=products+postage;
 const actual=input.actualPaidMinor===null||input.actualPaidMinor===undefined?null:whole(input.actualPaidMinor,'Actual customer payment');
 if(actual===null)provisional.push('Actual customer payment not confirmed.');
 if(actual!==null&&marketplaceTax===null)unknown.push('Marketplace-collected tax/pass-through amount not confirmed.');
 const sellerGross=actual===null?expected:actual-(marketplaceTax??0n);need(sellerGross>=0n,'Marketplace tax exceeds customer payment.');
 const reconciliation=actual===null||marketplaceTax===null?null:actual-(expected+marketplaceTax);
 if(reconciliation)warnings.push('Actual customer payment differs from the line and postage breakdown. The actual payment remains authoritative.');
 const adjustments=input.adjustments||[];unique(adjustments,'adjustment');let refunds=0n,revenueAdjustments=0n;
 for(const row of adjustments){need(['refund','revenue'].includes(row.kind),'Unsupported adjustment kind.');const state=classification(row.state,row.source,'Adjustment');if(state==='unknown'){unknown.push('Unknown adjustment: '+row.id);continue;}if(state==='estimated')provisional.push('Estimated adjustment: '+row.id);if(row.kind==='refund')refunds+=whole(row.minor,'Refund');else revenueAdjustments+=whole(row.minor,'Revenue adjustment',-MAX);}
 const tax=input.tax||{state:'unreviewed'};need(['unreviewed','not_applicable','confirmed'].includes(tax.state),'Review the tax treatment.');let sellerTax=0n;
 if(tax.state==='confirmed'){sellerTax=whole(tax.minor,'Seller tax adjustment');need(typeof tax.source==='string'&&tax.source.trim(),'Add the tax adjustment source.');}
 if(tax.state==='unreviewed')provisional.push('VAT/tax treatment has not been reviewed; revenue and contribution are before any unrecorded tax adjustment.');
 const revenue=sellerGross-refunds+revenueAdjustments-sellerTax;
 const fees=input.fees||[];unique(fees,'fee');const feeRefs=new Set(),amounts=[],categories={};let feeTotal=0n;
 if(input.feesComplete!==true)unknown.push('Fee breakdown is not confirmed complete (including any zero fees).');
 for(const fee of fees){need(feeCategories.has(fee.category),'Unknown fee category.');need(['charge','credit'].includes(fee.direction),'Choose charge or fee credit.');need(['fixed','percentage'].includes(fee.method),'Choose an actual amount or explicit percentage.');const state=classification(fee.state,fee.source,'Fee');
  if(fee.chargeReference){need(typeof fee.chargeReference==='string'&&fee.chargeReference.length<=150,'Invalid fee reference.');const ref=fee.chargeReference.trim().toLowerCase();need(!feeRefs.has(ref),'The same marketplace charge reference has been entered twice.');feeRefs.add(ref);}
  const covers=fee.includes||[];need(Array.isArray(covers)&&new Set(covers).size===covers.length&&covers.every(x=>feeCategories.has(x)&&x!==fee.category),'Invalid combined-fee inclusions.');
  for(const covered of covers)need(!fees.some(other=>other.id!==fee.id&&other.category===covered&&other.direction==='charge'),'A combined fee already includes '+covered+'; remove the duplicated charge.');
  if(fee.reverses)need(fee.direction==='credit'&&fees.some(x=>x.id===fee.reverses&&x.direction==='charge'),'Link a fee reversal to its original charge.');
  let amount=null;
  // Preserve the estimate in inputs; an entered actual settlement amount always wins.
  if(fee.actualMinor!==null&&fee.actualMinor!==undefined)amount=whole(fee.actualMinor,'Actual fee');
  else if(fee.method==='fixed'&&fee.amountMinor!==null&&fee.amountMinor!==undefined)amount=whole(fee.amountMinor,'Fee amount');
  else if(fee.method==='percentage'&&fee.percentage!==''&&fee.percentage!==undefined){need(['products','seller_gross','custom'].includes(fee.base),'Choose the explicit percentage base.');const base=fee.base==='products'?products:fee.base==='seller_gross'?sellerGross:whole(fee.baseMinor,'Custom fee base');amount=percent(base,fee.percentage);}
  if(state==='unknown'||amount===null){unknown.push('Fee unknown: '+fee.id);amounts.push({id:fee.id,minor:null});continue;}
  if(state!=='confirmed')provisional.push('Estimated fee: '+fee.id);
  if(fee.actualMinor===null||fee.actualMinor===undefined)if(fee.method==='percentage')provisional.push('Percentage fee is an estimate until the settlement charge is recorded.');
  amount*=fee.direction==='credit'?-1n:1n;feeTotal+=amount;categories[fee.category]=(categories[fee.category]||0n)+amount;amounts.push({id:fee.id,minor:number(amount)});
 }
 let fulfilment=0n;const costs=input.costs||{},costTotals={};
 for(const key of ['shipping','packaging','other','labour']){const row=costs[key];if(key==='labour'&&(!row||row.state==='excluded')){costTotals.labour=null;warnings.push('Unallocated labour, overheads and accounting adjustments are excluded.');continue;}
  if(!row||row.minor===null||row.minor===undefined||row.state==='unknown'){unknown.push('Cost unknown: '+key);costTotals[key]=null;continue;}
  const state=classification(row.state,row.source,key);if(state==='estimated')provisional.push('Estimated '+key+' cost.');const n=whole(row.minor,key+' cost');fulfilment+=n;costTotals[key]=number(n);
 }
 let returnedCost=0n;if(input.returnCostCredit){const row=input.returnCostCredit;classification(row.state,row.source,'Accepted return cost credit');if(row.state==='unknown'||row.minor===null)unknown.push('Return cost credit unresolved.');else{returnedCost=whole(row.minor,'Return cost credit');if(row.state==='estimated')provisional.push('Estimated return cost credit.');if(perLine.every(x=>x.cogsMinor!==null))need(returnedCost<=cogs,'Return cost credit exceeds original recorded COGS.');}}
 // A financial refund never creates stock or a COGS credit automatically.
 const totalCosts=cogs-returnedCost+feeTotal+fulfilment,contribution=unknown.length?null:revenue-totalCosts;
 const status=unknown.length?'incomplete':reconciliation?'unreconciled':provisional.length?'estimated':'recorded';
 const marginValue=contribution!==null&&revenue>0n?roundRatio(contribution*10000n,revenue):null;
 const margin=marginValue===null?null:(marginValue<0n?'-':'')+String((marginValue<0n?-marginValue:marginValue)/100n)+'.'+String((marginValue<0n?-marginValue:marginValue)%100n).padStart(2,'0');
 return {policyVersion:FINANCE_POLICY,currency:input.currency,status,productRevenueMinor:number(products),orderDiscountMinor:number(orderDiscount),postageMinor:number(postage),expectedSellerGrossMinor:number(expected),actualPaidMinor:actual===null?null:number(actual),reconciliationDifferenceMinor:reconciliation===null?null:number(reconciliation),refundMinor:number(refunds),revenueAdjustmentMinor:number(revenueAdjustments),netRevenueMinor:number(revenue),taxReviewed:tax.state!=='unreviewed',cogsMinor:perLine.some(x=>x.cogsMinor===null)?null:number(cogs-returnedCost),feesMinor:input.feesComplete===true&&!amounts.some(x=>x.minor===null)?number(feeTotal):null,knownFeesMinor:number(feeTotal),feesByCategory:Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,number(v)])),fulfilmentCosts:costTotals,directCostsMinor:unknown.length?null:number(totalCosts),contributionMinor:contribution===null?null:number(contribution),marginPercent:margin,lines:perLine,fees:amounts,unknown:[...new Set(unknown)],provisional:[...new Set(provisional)],warnings:[...new Set(warnings)],inputs:structuredClone(input)};
}

export function landedAcquisition(input){
 const quantity=whole(input.quantity,'Acquisition quantity',1,1000000000),original=whole(input.originalMinor,'Original purchase price');need(CURRENCIES.includes(input.originalCurrency),'Unsupported acquisition currency.');
 let gbp=input.actualGBPMinor===null?null:whole(input.actualGBPMinor,'Actual GBP purchase cost');
 if(gbp===null&&input.originalCurrency==='GBP')gbp=original;
 if(gbp===null&&input.gbpPerOriginal!==null&&input.gbpPerOriginal!==''){const rate=whole(decimal(input.gbpPerOriginal,6),'Historical exchange rate',1,MAX_MICRO);gbp=roundRatio(original*rate,1000000n);}
 const extras=['freightGBPMinor','importGBPMinor','otherGBPMinor'];if(gbp===null||extras.some(k=>input[k]===null))return {state:'unknown',quantity:Number(quantity),landedGBPMinor:null,unitCostMicro:null,original:structuredClone(input)};
 const landed=gbp+extras.reduce((sum,k)=>sum+whole(input[k],k),0n);
 return {state:'recorded-inputs',quantity:Number(quantity),landedGBPMinor:number(landed),unitCostMicro:Number(roundRatio(landed*10000n,quantity)),unitCostRatio:{numerator:String(landed*10000n),denominator:String(quantity)},original:structuredClone(input)};
}
export function weightedPool(batches){need(Array.isArray(batches)&&batches.length>0&&batches.length<=100,'Use 1–100 remaining acquisition records.');let quantity=0n,value=0n,unknown=false;for(const b of batches){const q=whole(b.remainingQuantity,'Remaining quantity',0,1000000000);quantity+=q;if(b.remainingValueMinor===null){if(q)unknown=true;}else{const v=whole(b.remainingValueMinor,'Remaining acquisition value');need(q>0n||v===0n,'A depleted acquisition cannot retain inventory value.');value+=v;}}need(quantity>0n,'No remaining stock in this illustration.');return {remainingQuantity:Number(quantity),remainingValueMinor:unknown?null:number(value),unitCostRatio:unknown?null:{numerator:String(value*10000n),denominator:String(quantity)}};}
export function issueWeighted(pool,quantity){const q=whole(quantity,'Issue quantity',1,1000000000),remaining=whole(pool.remainingQuantity,'Pool quantity',1,1000000000);need(q<=remaining,'Issue exceeds the illustrated remaining stock.');if(pool.remainingValueMinor===null)return {issueCostMinor:null,pool:{remainingQuantity:Number(remaining-q),remainingValueMinor:null}};const value=whole(pool.remainingValueMinor,'Pool value'),cost=q===remaining?value:roundRatio(value*q,remaining);return {issueCostMinor:number(cost),pool:{remainingQuantity:Number(remaining-q),remainingValueMinor:number(value-cost)}};}
export function assemblyMaterialCost(requirements,costs){need(Array.isArray(requirements)&&requirements.length>0&&requirements.length<=100,'A recorded BOM is required.');let micro=0n;const missing=[];for(const p of requirements){const qty=whole(p.quantity,'BOM quantity',1,1000000),unit=costs[p.componentId];if(unit===null||unit===undefined)missing.push(p.componentId);else micro+=whole(unit,'Component unit cost',0,MAX_MICRO)*qty;}need(micro<=BigInt(MAX_MICRO),'Assembly materials exceed the supported range.');return {state:missing.length?'unknown':'estimated',unitCostMicro:missing.length?null:Number(micro),missing,labourIncluded:false,basis:'Recorded component/BOM reference; not a historical sale-cost snapshot.'};}
export function allocateMinor(total,weights){need(Array.isArray(weights)&&weights.length>0&&weights.length<=100,'Use a bounded allocation basis.');const amount=whole(Math.abs(total),'Allocation'),negative=total<0,values=weights.map(w=>whole(w,'Allocation weight')),denominator=values.reduce((a,b)=>a+b,0n);need(denominator>0n,'Choose an explicit allocation basis for zero-revenue lines.');const parts=values.map((v,index)=>({index,value:amount*v/denominator,remainder:amount*v%denominator}));let residue=amount-parts.reduce((s,x)=>s+x.value,0n);for(const p of [...parts].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1)){if(!residue)break;p.value++;residue--;}return parts.map(x=>number(negative?-x.value:x.value));}
export function profitabilityReport(records,{from='',to='',channel=''}={}){
 need(Array.isArray(records)&&records.length<=5000,'Reporting is limited to 5,000 already loaded orders. Narrow the source before reporting.');
 const groups=new Map(),products=new Map();let count=0,complete=0,estimated=0;
 for(const record of records){if(record.channel==='WEBSITE'||!['paid','partially_refunded','refunded'].includes(record.paymentStatus)||channel&&record.channel!==channel)continue;const date=String(record.orderDate||record.createdAt||'').slice(0,10);if(from&&date<from||to&&date>to)continue;count++;
  const calc=record.finance?calculateEconomics(record.finance):null,currency=calc?.currency||'GBP';let group=groups.get(currency);if(!group){group={currency,orders:0,covered:0,revenueMinor:0n,feesMinor:0n,advertisingMinor:0n,cogsMinor:0n,shippingMinor:0n,packagingMinor:0n,contributionMinor:0n};groups.set(currency,group);}group.orders++;
  // Original recorded revenue is labelled separately; no historic costs or fees are invented.
  group.revenueMinor+=calc?BigInt(calc.netRevenueMinor):whole(record.pricing?.total,'Recorded order total')-whole(record.refundedPence??0,'Recorded refund');
  for(const item of record.items||[]){const key=currency+':'+(item.productId||item.sku||item.name);const row=products.get(key)||{currency,product:item.name||item.sku||item.productId,quantity:0,recordedLineRevenueMinor:0};row.quantity+=item.quantity;row.recordedLineRevenueMinor=number(BigInt(row.recordedLineRevenueMinor)+whole(item.lineTotal,'Recorded line total'));products.set(key,row);}
  if(calc?.status!=='recorded'){if(calc&&calc.status!=='incomplete')estimated++;continue;}complete++;group.covered++;for(const [key,value] of Object.entries({feesMinor:calc.feesMinor,advertisingMinor:calc.feesByCategory.advertising||0,cogsMinor:calc.cogsMinor,shippingMinor:calc.fulfilmentCosts.shipping,packagingMinor:calc.fulfilmentCosts.packaging,contributionMinor:calc.contributionMinor}))group[key]+=BigInt(value);
 }
 return {orders:count,complete,estimated,incomplete:count-complete,groups:[...groups.values()].map(g=>Object.fromEntries(Object.entries(g).map(([k,v])=>[k,typeof v==='bigint'?number(v):v]))),products:[...products.values()],scope:'Already loaded external orders only. Costs/contribution cover recorded complete records; incomplete records are excluded from those totals. Product sales are original line revenue before order-level allocations, not product profit.'};
}
