// Server-only template from the paid, persisted Order claimed in the delivery ledger.
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
 const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
 const htmlLines=order.items.map((item:any)=>`<tr><td>${escape(item.name)}</td><td>${item.quantity}</td><td>£${(item.lineTotal/100).toFixed(2)}</td></tr>`).join('');
 return {to:order.customer.email,subject:`Apparition Instruments order ${order.reference} confirmed`,text:[
  'APPARITION INSTRUMENTS',`Payment confirmed for order ${order.reference}.`,`Thank you, ${order.customer.name}.`,'',
  'YOUR ORDER',...lines,'',`Subtotal: £${(subtotal/100).toFixed(2)}`,`Delivery: £${(delivery/100).toFixed(2)}`,`Total paid: £${(total/100).toFixed(2)}`,'',
  'DELIVERY ADDRESS',address,'','Fulfilment: Awaiting Fulfilment','',
  'Apparition Instruments Limited','Contact: https://apparitioninstruments.co.uk/contact/'
 ].join('\n'),html:`<!doctype html><html><body style="margin:0;background:#15191e;color:#f2eee6;font-family:Arial,sans-serif"><main style="max-width:640px;margin:auto;padding:34px;background:#22272e"><p style="letter-spacing:.18em;color:#c69d5b">APPARITION INSTRUMENTS</p><h1 style="color:#f2eee6">Thank you, ${escape(order.customer.name)}</h1><p>Your payment is confirmed for order <strong>${escape(order.reference)}</strong>.</p><table style="width:100%;border-collapse:collapse;color:#f2eee6"><thead><tr style="color:#d9a765"><th align="left">Your order</th><th>Qty</th><th align="right">Price</th></tr></thead><tbody>${htmlLines}</tbody></table><p>Subtotal: £${(subtotal/100).toFixed(2)}<br>Delivery: £${(delivery/100).toFixed(2)}<br><strong>Total paid: £${(total/100).toFixed(2)}</strong></p><h2 style="color:#d9a765">Delivery address</h2><p>${address.split('\n').map(escape).join('<br>')}</p><p>Fulfilment: Awaiting Fulfilment</p><hr style="border:0;border-top:1px solid #987647"><p>Apparition Instruments Limited<br><a style="color:#d9a765" href="https://apparitioninstruments.co.uk/contact/">apparitioninstruments.co.uk/contact/</a></p></main></body></html>`};
}
