const id='68a00000-0000-4000-8000-000000000005';
const s={state:'confirmed',source:'Synthetic evidence'};
export const finance={
 policyVersion:'marketplace-contribution-v2',currency:'GBP',lines:[{id:'line-0',label:'Workshop capacitor',productId:'fixture-cap',quantity:1,unitPriceMinor:750,
  priceBasis:'net',discountMinor:0,unitCostMicro:1000000,costState:'confirmed',costSource:'Synthetic procurement'}],
 discount:{kind:'none',minor:0},postageMinor:399,actualPaidMinor:1149,marketplaceTaxMinor:0,paymentBreakdownBasis:'customer_gross',
 marketplaceTaxState:'confirmed',marketplaceTaxSource:'Synthetic checkout',fees:[{id:'fee',category:'marketplace',direction:'charge',method:'fixed',state:'confirmed',source:'Synthetic settlement',actualMinor:150,includes:['advertising']}],
 feesComplete:true,settlement:{minor:999,state:'confirmed',source:'Synthetic settlement',adjustmentMinor:0},
 costs:{shipping:{...s,minor:399},packaging:{...s,minor:50},other:{...s,minor:0},labour:{state:'excluded'}},
 tax:{state:'not_applicable',minor:null},adjustments:[]
};
export const row={id,day:'2026-06-13',channel:'EBAY',reference:'AI-SYNTHETIC',currency:'GBP',total:1149,refund:0,current:true,finance,
 items:[{productId:'fixture-cap',sku:'CAP',name:'Workshop capacitor',lineTotal:750,quantity:1}]};
