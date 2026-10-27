// V2 clarifies gross payment, seller revenue and settlement. The accepted V1
// arithmetic remains unchanged and is reused for fees, costs and allocations.
import {calculateEconomics as calculateV1,FINANCE_POLICY,roundRatio,profitabilityReport as reportV1} from './economics.mjs';
export const FINANCE_POLICY_V2='marketplace-contribution-v2';
const need=(ok,message)=>{if(!ok)throw Error(message);};
const amount=(v,label,signed=false)=>{need(Number.isSafeInteger(v)&&v>=(signed?-1000000000000:0)&&v<=1000000000000,'Invalid '+label+'.');return v;};
const classification=(state,source,label)=>{need(['unknown','estimated','confirmed'].includes(state),'Review '+label+' evidence.');if(state==='confirmed')need(typeof source==='string'&&source.trim().length>0&&source.length<=300,'Add '+label+' evidence/source.');};
const paymentWarning='Actual customer payment differs from the line and postage breakdown. The actual payment remains authoritative.';
export function calculateEconomicsV2(input){
 if(input?.policyVersion===FINANCE_POLICY)return calculateV1(input);
 need(input?.policyVersion===FINANCE_POLICY_V2,'Unsupported financial calculation version.');
 need(['customer_gross','seller_net','unreviewed'].includes(input.paymentBreakdownBasis),'Choose the payment breakdown basis.');
 const actual=input.actualPaidMinor??null,pass=input.marketplaceTaxMinor??null,passState=input.marketplaceTaxState||'unknown';classification(passState,input.marketplaceTaxSource,'marketplace pass-through');if(pass!==null)amount(pass,'marketplace pass-through');
 let result=calculateV1({...input,policyVersion:FINANCE_POLICY});const linesAndPostage=result.expectedSellerGrossMinor;
 const expectedGross=input.paymentBreakdownBasis==='unreviewed'?null:input.paymentBreakdownBasis==='customer_gross'?linesAndPostage:pass===null?null:amount(linesAndPostage+pass,'gross payment breakdown');
 if(input.paymentBreakdownBasis==='customer_gross'&&pass!==null)need(pass<=linesAndPostage,'Pass-through exceeds the gross product/postage breakdown. Check the amount and basis.');
 // An absent payment stays absent. Reuse projected gross only as the percentage-fee
 // basis when calculating a clearly labelled estimate, then restore the null field.
 if(actual===null&&expectedGross!==null&&pass!==null)result=calculateV1({...input,policyVersion:FINANCE_POLICY,actualPaidMinor:expectedGross});
 const unknown=result.unknown.filter(x=>x!=='Marketplace-collected tax/pass-through amount not confirmed.'),provisional=[...result.provisional],warnings=result.warnings.filter(x=>x!==paymentWarning);
 if(actual===null&&!provisional.includes('Actual customer payment not confirmed.'))provisional.push('Actual customer payment not confirmed.');
 if(input.paymentBreakdownBasis==='unreviewed')provisional.push('Product/postage amounts have not been classified as gross customer amounts or tax-exclusive seller amounts.');
 if(pass===null||passState==='unknown')unknown.push('Marketplace-collected tax/pass-through amount not confirmed.');else if(passState==='estimated')provisional.push('Marketplace pass-through is an estimate, not a verified tax deduction.');
 const grossDifference=actual===null||expectedGross===null?null:actual-expectedGross;
 if(grossDifference)warnings.push(paymentWarning);
 const sellerTax=input.tax?.state==='confirmed'?amount(input.tax.minor,'seller tax adjustment'):0;
 const netRevenue=pass===null||passState==='unknown'?null:result.netRevenueMinor;
 const sellerRevenue=netRevenue===null?null:amount(netRevenue+sellerTax,'seller revenue',true);
 let settlementExpected=null,settlementActual=null,settlementDifference=null;
 const settlement=input.settlement;
 if(settlement?.minor!==null&&settlement?.minor!==undefined){
  settlementActual=amount(settlement.minor,'actual seller settlement');classification(settlement.state,settlement.source,'seller settlement');
  const adjustment=amount(settlement.adjustmentMinor??0,'settlement-only adjustment',true);
  if(adjustment)need(typeof settlement.adjustmentSource==='string'&&settlement.adjustmentSource.trim(),'Add the settlement-only adjustment source.');
  if(settlement.state!=='confirmed')provisional.push('Seller settlement is not confirmed from an order-associated statement.');
  if(sellerRevenue!==null&&result.feesMinor!==null){settlementExpected=amount(sellerRevenue-result.feesMinor+adjustment,'expected seller settlement',true);settlementDifference=settlementActual-settlementExpected;if(settlementDifference)warnings.push('Actual seller settlement differs from seller revenue less recorded marketplace fees and settlement-only adjustments.');}
  else provisional.push('Seller settlement cannot be reconciled until seller revenue and marketplace fees are known.');
 }
 const contribution=unknown.length||netRevenue===null?null:result.contributionMinor;
 const margin=contribution!==null&&netRevenue>0?roundRatio(BigInt(contribution)*10000n,BigInt(netRevenue)):null;
 const marginText=margin===null?null:(margin<0n?'-':'')+String((margin<0n?-margin:margin)/100n)+'.'+String((margin<0n?-margin:margin)%100n).padStart(2,'0');
 const status=unknown.length?'incomplete':grossDifference||settlementDifference?'unreconciled':provisional.length?'estimated':'recorded';
 return {...result,policyVersion:FINANCE_POLICY_V2,status,actualPaidMinor:actual,grossCustomerPaymentMinor:actual,paymentBreakdownBasis:input.paymentBreakdownBasis,expectedCustomerGrossMinor:expectedGross,expectedSellerGrossMinor:expectedGross===null||pass===null?null:expectedGross-pass,marketplacePassThroughMinor:pass,sellerRevenueMinor:sellerRevenue,netRevenueMinor:netRevenue,reconciliationDifferenceMinor:grossDifference,actualSellerSettlementMinor:settlementActual,expectedSellerSettlementMinor:settlementExpected,settlementDifferenceMinor:settlementDifference,contributionMinor:contribution,marginPercent:marginText,unknown:[...new Set(unknown)],provisional:[...new Set(provisional)],warnings:[...new Set(warnings)],inputs:structuredClone(input)};
}
export function profitabilityReportV2(records,filters={}){
 need(Array.isArray(records)&&records.length<=5000,'Reporting is limited to 5,000 loaded orders.');
 if(!records.some(r=>r.finance?.policyVersion===FINANCE_POLICY_V2))return reportV1(records,filters);
 const groups=new Map(),products=new Map();let orders=0,complete=0,estimated=0,unreconciled=0;
 for(const record of records){if(record.channel==='WEBSITE'||!['paid','partially_refunded','refunded'].includes(record.paymentStatus)||filters.channel&&record.channel!==filters.channel)continue;const date=String(record.orderDate||record.createdAt||'').slice(0,10);if(filters.from&&date<filters.from||filters.to&&date>filters.to)continue;orders++;
  const calc=record.finance?calculateEconomicsV2(record.finance):null,currency=calc?.currency||'GBP';let g=groups.get(currency);if(!g){g={currency,orders:0,covered:0,revenueCovered:0,grossRecordedRevenueMinor:0,revenueMinor:0,feesMinor:0,advertisingMinor:0,cogsMinor:0,shippingMinor:0,packagingMinor:0,contributionMinor:0};groups.set(currency,g);}g.orders++;g.grossRecordedRevenueMinor+=amount(record.pricing.total,'recorded order total')-amount(record.refundedPence??0,'recorded refund');if(calc?.netRevenueMinor!==null&&calc?.netRevenueMinor!==undefined){g.revenueMinor+=calc.netRevenueMinor;g.revenueCovered++;}
  for(const item of record.items||[]){const key=currency+':'+(item.productId||item.sku||item.name),p=products.get(key)||{currency,product:item.name||item.sku||item.productId,quantity:0,recordedLineRevenueMinor:0};p.quantity+=item.quantity;p.recordedLineRevenueMinor+=amount(item.lineTotal,'recorded line total');products.set(key,p);}
  if(calc?.status==='unreconciled')unreconciled++;if(calc?.status!=='recorded'){if(calc&&calc.status!=='incomplete')estimated++;continue;}complete++;g.covered++;for(const [key,value]of Object.entries({feesMinor:calc.feesMinor,advertisingMinor:calc.feesByCategory.advertising||0,cogsMinor:calc.cogsMinor,shippingMinor:calc.fulfilmentCosts.shipping,packagingMinor:calc.fulfilmentCosts.packaging,contributionMinor:calc.contributionMinor}))g[key]+=value;
 }
 for(const g of groups.values())for(const [key,value]of Object.entries(g))if(key.endsWith('Minor'))amount(value,key,true);
 return {orders,complete,estimated,unreconciled,incomplete:orders-complete,groups:[...groups.values()],products:[...products.values()],scope:'Loaded external orders only. Gross recorded revenue is separate from known net seller revenue. Financial cost/contribution totals include complete recorded inputs only.'};
}
