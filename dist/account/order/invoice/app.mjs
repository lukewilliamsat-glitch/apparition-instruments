import {loadOrder} from '../bootstrap.mjs';
import {invoiceFromOrder,invoiceAddress} from '../../../admin/orders/invoice/model.mjs';
import {money,date} from '../model.mjs';

export function invoiceModel(detail){
 const invoice=invoiceFromOrder({reference:detail.reference,createdAt:detail.createdAt,paymentStatus:detail.paymentStatus,
  customer:{name:detail.customerName,email:detail.customerEmail},
  delivery:{recipient:detail.recipient,line1:detail.address?.[0],line2:detail.address?.[1]},
  items:detail.items,pricing:detail.pricing,refundedPence:detail.refundedPence,latestRefundAt:detail.latestRefundAt});
 if((detail.paymentStatus==='paid'&&invoice.refundedPence!==0)||
  (detail.paymentStatus==='refunded'&&invoice.refundedPence!==invoice.pricing.total)||
  (detail.paymentStatus==='partially_refunded'&&(invoice.refundedPence<=0||invoice.refundedPence>=invoice.pricing.total)))
  throw Error('Saved refund status cannot be verified.');
 return invoice;
}
export function renderInvoice(root,detail,document){
 const invoice=invoiceModel(detail),id=selector=>root.querySelector('#'+selector);
 const put=(selector,value)=>{id(selector).textContent=value;};
 put('reference',invoice.reference);put('order-date',date(invoice.date));put('payment-state',invoice.paymentLabel);
 const contact=invoiceAddress(invoice.customer,{recipient:detail.recipient});
 put('customer-name',contact.customer);put('customer-email',contact.email);
 const recipient=id('recipient');recipient.hidden=!contact.recipient;id('recipient-label').hidden=!contact.recipient;
 if(contact.recipient)recipient.textContent=contact.recipient;
 const address=id('address');address.replaceChildren();for(const line of detail.address||[]){const node=document.createElement('div');node.textContent=line==='GB'?'United Kingdom':line;address.append(node);}
 const body=id('invoice-items');body.replaceChildren();
 for(const item of invoice.items){const row=document.createElement('tr');const description=document.createElement('td');description.textContent=item.name;
  if(item.options?.length){const options=document.createElement('small');options.textContent=item.options.map(option=>option.name+': '+option.value).join(' · ');options.style.display='block';description.append(options);}
  row.append(description);for(const value of [item.quantity,money(item.unitPrice),money(item.lineTotal)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}
 for(const [key,value] of Object.entries(invoice.pricing))put(key,money(value));
 id('refund-details')?.remove();id('refund-total')?.remove();id('net-paid')?.remove();
 if(invoice.refundedPence>0){
  const refund=document.createElement('p');refund.id='refund-details';refund.textContent='Refunded '+money(invoice.refundedPence)+' of '+money(invoice.pricing.total)+(date(invoice.latestRefundAt)?' · '+date(invoice.latestRefundAt):'');id('payment-state').parentElement.after(refund);
  const totals=root.querySelector('.totals');
  const addRow=(id,label,value,cls='')=>{const row=document.createElement('div');row.id=id;if(cls)row.className=cls;const left=document.createElement('strong'),right=document.createElement('strong');left.textContent=label;right.textContent=value;row.append(left,right);totals.append(row);};
  addRow('refund-total','Refund','−'+money(invoice.refundedPence));
  addRow('net-paid','Net paid',money(invoice.pricing.total-invoice.refundedPence),'total');
 }
 root.hidden=false;
}
export async function startInvoice({document,location,load=loadOrder}={}){
 const root=document.getElementById('invoice'),message=document.getElementById('invoice-message');
 const reference=new URL(location.href).searchParams.get('reference');
 if(!/^AI-\d{6}$/.test(reference||'')){message.textContent='Order not found in your account.';return;}
 try{const detail=await load(reference);renderInvoice(root,detail,document);document.title='Invoice '+detail.reference+' | Apparition Instruments';document.getElementById('back-order').href='/account/order/?reference='+encodeURIComponent(detail.reference);message.textContent='';}
 catch(error){message.textContent=error.message;root.hidden=true;}
}
if(typeof document!=='undefined')startInvoice({document,location});
