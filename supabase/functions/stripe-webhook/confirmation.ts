// Inactive transactional-email foundation. Never call this from the browser or
// the payment webhook until a provider and durable delivery ledger are added.
// A later sender must atomically claim an order/reference before sending and
// persist provider delivery results to prevent duplicate webhook emails.
export function buildPaidOrderConfirmation(order:any){
 if(order?.payment_status!=='paid'||!order.paid_at||!order.fulfillment_applied_at||!/^AI-\d+$/.test(order.reference||''))throw new Error('Confirmed paid Order required');
 if(!order.customer?.email||!order.customer?.name||!order.delivery?.line1||!Array.isArray(order.items)||!order.items.length)throw new Error('Paid Order contact or items unavailable');
 const lines=order.items.map((item:any)=>{
  if(!Number.isSafeInteger(item.quantity)||item.quantity<1||!Number.isSafeInteger(item.unitPrice)||item.quantity*item.unitPrice!==item.lineTotal)throw new Error('Invalid persisted item');
  return `${item.quantity} × ${item.name} — £${(item.lineTotal/100).toFixed(2)} (£${(item.unitPrice/100).toFixed(2)} each)`;
 });
 const subtotal=lines.length&&order.subtotal_pence,delivery=order.delivery_pence,total=order.total_pence;
 if(![subtotal,delivery,total].every(Number.isSafeInteger)||subtotal<0||delivery<0||subtotal+delivery!==total||order.items.reduce((n:number,item:any)=>n+item.lineTotal,0)!==subtotal)throw new Error('Invalid persisted total');
 const address=[order.delivery.recipient,order.delivery.line1,order.delivery.line2,order.delivery.city,order.delivery.region,order.delivery.postcode,order.delivery.country==='GB'?'United Kingdom':order.delivery.country].filter(Boolean).join('\n');
 return {to:order.customer.email,subject:`Apparition Instruments order ${order.reference} confirmed`,text:[
  'APPARITION INSTRUMENTS',`Payment confirmed for order ${order.reference}.`,`Thank you, ${order.customer.name}.`,'',
  'YOUR ORDER',...lines,'',`Subtotal: £${(subtotal/100).toFixed(2)}`,`Delivery: £${(delivery/100).toFixed(2)}`,`Total paid: £${(total/100).toFixed(2)}`,'',
  'DELIVERY ADDRESS',address,'','Fulfilment: Awaiting Fulfilment','',
  'Apparition Instruments Limited','Contact: https://apparitioninstruments.co.uk/contact/'
 ].join('\n')};
}
