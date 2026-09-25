// A print view uses only the freshly fetched, persisted Admin Order record.
export function invoiceFromOrder(order){
 if(order?.paymentStatus!=='paid'||!/^AI-\d+$/.test(order.reference||''))throw new Error('A paid Order is required to print an invoice.');
 const p=order.pricing,items=order.items;
 if(!Array.isArray(items)||!items.length||!p||![p.subtotal,p.delivery,p.total].every(Number.isSafeInteger)||p.subtotal<0||p.delivery<0||p.total!==p.subtotal+p.delivery)throw new Error('Saved Order totals cannot be verified.');
 if(items.some(item=>!Number.isSafeInteger(item.quantity)||item.quantity<1||!Number.isSafeInteger(item.unitPrice)||item.unitPrice<0||item.quantity*item.unitPrice!==item.lineTotal)||items.reduce((sum,item)=>sum+item.lineTotal,0)!==p.subtotal)throw new Error('Saved Order items do not match the subtotal.');
 return {reference:order.reference,date:order.createdAt,customer:order.customer||{},delivery:order.delivery||{},items,pricing:p};
}
