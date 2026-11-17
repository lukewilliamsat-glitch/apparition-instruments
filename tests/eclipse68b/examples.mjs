import {financeDraft} from '../../dist/admin/orders/finance-ui.mjs';
import {applyPreset,withTrustedFacts,updateFee} from '../../dist/admin/orders/eclipse-model.mjs';
const item={type:'component',name:'Workshop capacitor',productId:'fixture-staging-cap',sku:'STAGING-CAP',quantity:1,unitPrice:750,lineTotal:750};
export const exampleOrders=[
 {id:'68a00000-0000-4000-8000-000000000003',reference:'AI-068201',channel:'EBAY',orderDate:'2026-10-31',createdAt:'2026-11-02T09:00:00Z',paidAt:'2026-11-02T09:30:00Z',paymentStatus:'paid',refundedPence:0,items:[item],pricing:{subtotal:750,delivery:399,total:1149}},
 {id:'68b00000-0000-4000-8000-000000000001',reference:'AI-068202',channel:'WEBSITE',providerBacked:true,createdAt:'2026-11-03T13:00:00Z',paidAt:'2026-11-03T13:15:00Z',paymentStatus:'paid',refundedPence:0,items:[item],pricing:{subtotal:750,delivery:399,total:1149}}
];
export const exampleLibrary={revision:1,items:[
 {id:'small-bag',name:'Small postage bag',unitMinor:15,quantity:1,active:true},
 {id:'qc-card',name:'Apparition QC card',unitMinor:10,quantity:1,active:true}
],presets:[{id:'small-component',name:'Small component order',kind:'component',active:true,items:[{itemId:'small-bag',quantity:1},{itemId:'qc-card',quantity:1}]}]};
export function exampleDocument(order=exampleOrders[0],library=exampleLibrary){
 let d=withTrustedFacts(financeDraft(order),order);
 d.marketplaceTaxMinor=0;d.marketplaceTaxState='confirmed';d.marketplaceTaxSource='Synthetic checkout statement';
 d.tax={state:'not_applicable',minor:null,source:''};
 d.lines[0].unitCostMicro=1250000;d.lines[0].costState='confirmed';d.lines[0].costSource='Synthetic historical invoice';d.lines[0].costProvenance={basis:'manual_evidenced'};
 d.costs.shipping={minor:235,state:'confirmed',source:'Synthetic postage receipt'};
 d.costs.other={minor:0,state:'confirmed',source:'Synthetic receipt, no additional costs'};
 d=updateFee(d,order.channel==='WEBSITE'?'payment':'marketplace',order.channel==='WEBSITE'?47:112,'confirmed','Synthetic fee statement');
 if(order.channel!=='WEBSITE')d=updateFee(d,'advertising',30,'confirmed','Synthetic advertising statement');
 d.feesComplete=true;
 return applyPreset(d,library,'small-component');
}
