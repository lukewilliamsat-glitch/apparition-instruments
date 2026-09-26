// A print view uses only the freshly fetched, persisted Admin Order record.
export function invoiceFromOrder(order){
 if(!['paid','partially_refunded','refunded'].includes(order?.paymentStatus)||!/^AI-\d+$/.test(order.reference||''))throw new Error('A historically paid Order is required to print an invoice.');
 const p=order.pricing,items=order.items;
 if(!Array.isArray(items)||!items.length||!p||![p.subtotal,p.delivery,p.total].every(Number.isSafeInteger)||p.subtotal<0||p.delivery<0||p.total!==p.subtotal+p.delivery)throw new Error('Saved Order totals cannot be verified.');
 if(items.some(item=>!Number.isSafeInteger(item.quantity)||item.quantity<1||!Number.isSafeInteger(item.unitPrice)||item.unitPrice<0||item.quantity*item.unitPrice!==item.lineTotal)||items.reduce((sum,item)=>sum+item.lineTotal,0)!==p.subtotal)throw new Error('Saved Order items do not match the subtotal.');
 if(!Number.isSafeInteger(order.refundedPence??0)||(order.refundedPence??0)<0||(order.refundedPence??0)>p.total)throw new Error('Saved refund totals cannot be verified.');
 return {reference:order.reference,date:order.createdAt,customer:order.customer||{},delivery:order.delivery||{},items,pricing:p,
  paymentLabel:({paid:'Paid',partially_refunded:'Partially Refunded',refunded:'Refunded'})[order.paymentStatus],
  refundedPence:order.refundedPence??0,latestRefundAt:order.latestRefundAt};
}
export function invoiceAddress(customer={},delivery={}){
 const name=String(customer.name||'').trim(),recipient=String(delivery.recipient||'').trim();
 const lines=[delivery.line1,delivery.line2,delivery.city,delivery.region,delivery.postcode,delivery.country==='GB'?'United Kingdom':delivery.country].filter(Boolean);
 return {customer:name||recipient||'Customer',recipient:recipient&&recipient.toLocaleLowerCase()!==name.toLocaleLowerCase()?recipient:null,lines,email:customer.email||''};
}
