// Functional, server-side templates; P08B.4 will approve final presentation.
export const deliveryKinds=['in_production','ready_to_dispatch','dispatched','full_refund'] as const;
export type DeliveryKind=typeof deliveryKinds[number];
const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money=(p:number)=>'£'+(p/100).toFixed(2);
const labels:Record<DeliveryKind,{subject:string;heading:string;body:string}>={
 in_production:{subject:'in production',heading:'Your order is in production',body:'We are preparing your order.'},
 ready_to_dispatch:{subject:'ready to dispatch',heading:'Your order is ready to dispatch',body:'Your order is ready to dispatch.'},
 dispatched:{subject:'dispatched',heading:'Your order has been dispatched',body:'Your order has been dispatched. No tracking details are available yet.'},
 full_refund:{subject:'refunded',heading:'Your order has been refunded',body:'Your full refund has been processed. The time it takes to appear with your bank or card provider may vary.'}
};
export function renderTransactionalMail(kind:DeliveryKind,order:any){
 if(!deliveryKinds.includes(kind)||!/^AI-\d+$/.test(order?.reference||'')||!/^\S+@\S+\.\S+$/.test(order?.customer?.email||''))throw Error('Persisted Order contact unavailable');
 const name=String(order.customer.name||'').trim().split(/\s+/)[0]||'there';
 const total=order.total_pence,refunded=order.refunded_pence;
 if(!Number.isSafeInteger(total)||total<0)throw Error('Persisted Order total invalid');
 if(kind==='full_refund'&&(!Number.isSafeInteger(refunded)||refunded!==total||order.payment_status!=='refunded'))throw Error('Verified full refund required');
 const itemLines=Array.isArray(order.items)?order.items.map((item:any)=>`${Number(item.quantity)||0} × ${String(item.name||'Item')} — ${money(Number(item.lineTotal)||0)}`):[];
 const title=labels[kind],details=kind==='full_refund'?`Refund processed: ${money(refunded)} (original order ${money(total)}).`:`Original order total: ${money(total)}.`;
 const text=['APPARITION INSTRUMENTS','',`Hi ${name},`,title.body,`Order ${order.reference}`,details,...itemLines,'','Questions? https://apparitioninstruments.co.uk/contact/'].join('\n');
 const html=`<!doctype html><html lang="en"><body style="margin:0;background:#14181d;color:#f4f0e8;font-family:Arial,sans-serif"><main style="max-width:600px;margin:auto;padding:28px"><strong style="color:#d5aa69">APPARITION INSTRUMENTS</strong><h1>${escape(title.heading)}</h1><p>Hi ${escape(name)},</p><p>${escape(title.body)}</p><p>Order ${escape(order.reference)}<br>${escape(details)}</p><ul>${itemLines.map((line:string)=>`<li>${escape(line)}</li>`).join('')}</ul><p><a style="color:#d5aa69" href="https://apparitioninstruments.co.uk/contact/">Contact Apparition Instruments</a></p></main></body></html>`;
 return {to:order.customer.email,subject:`Apparition Instruments order ${order.reference} ${title.subject}`,text,html};
}
