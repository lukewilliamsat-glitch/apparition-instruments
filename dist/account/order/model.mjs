export const steps=Object.freeze([
 {status:'pending',label:'Order Confirmed'},
 {status:'in_production',label:'In Production'},
 {status:'ready_to_dispatch',label:'Ready to Dispatch'},
 {status:'dispatched',label:'Dispatched'}
]);
export const money=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
export const date=value=>{const parsed=new Date(value);return value&&!Number.isNaN(parsed.getTime())?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(parsed):'';};
export function progress(order){
 const history=Array.isArray(order.history)?order.history:[];
 const current=steps.findIndex(step=>step.status===order.status);
 const last=current<0&&order.status==='completed'?steps.length:current;
 return steps.map((step,index)=>({label:step.label,state:index<last?'done':index===last?'current':'future',
  at:step.status==='pending'?order.confirmedAt:history.find(event=>event.status===step.status)?.at||null}));
}
export function customerStatus(order){
 if(order.paymentStatus==='refunded')return 'Refunded';
 if(order.status==='cancelled')return 'Cancelled';
 if(order.status==='completed')return 'Fulfilment complete';
 return steps.find(step=>step.status===order.status)?.label||'Order status unavailable';
}
