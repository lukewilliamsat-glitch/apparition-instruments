export const fulfilmentLabels=Object.freeze({pending:'Awaiting Fulfilment',in_production:'In Production',ready_to_dispatch:'Ready to Dispatch',dispatched:'Dispatched',completed:'Completed',cancelled:'Cancelled'});
export const paymentLabels=Object.freeze({unpaid:'Unpaid',paid:'Paid',partially_refunded:'Partially Refunded',refunded:'Refunded'});
const next=Object.freeze({pending:'in_production',in_production:'ready_to_dispatch',ready_to_dispatch:'dispatched',dispatched:'completed'});
export const isPaidOrder=order=>['paid','partially_refunded','refunded'].includes(order?.paymentStatus);
export const isCheckoutAttempt=order=>order?.paymentStatus==='unpaid';
export const nextFulfilment=order=>['paid','partially_refunded'].includes(order?.paymentStatus)?next[order.fulfilmentStatus]??null:null;
export function orderHistory(row){
 const events=[];
 if(['paid','partially_refunded','refunded'].includes(row.payment_status)&&row.paid_at)events.push({status:'pending',at:row.paid_at,source:'system'});
 if(row.latest_refund_at&&row.refunded_pence>0)events.push({status:row.payment_status,at:row.latest_refund_at,source:'system'});
 for(const event of row.status_history||[])if(event?.status&&event?.at)events.push({status:event.status,at:event.at,source:event.source==='admin'?'admin':'system'});
 return events.sort((a,b)=>new Date(a.at)-new Date(b.at));
}
