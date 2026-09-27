import {invoiceFromOrder,invoiceAddress} from '../admin/orders/invoice/model.mjs';

// One commercial invoice document for Admin and customers. Each route fetches
// an Order through its existing authorization boundary before calling this.
export const invoiceTemplate=`<header><img src="/assets/apparition-logo.png" alt="Apparition Instruments" width="170" height="130"><div><p class="document-type">INVOICE</p><p class="reference" id="reference"></p></div></header><div class="details"><section><h2>Order details</h2><p>Order date: <span id="order-date"></span></p><p>Payment: <span id="payment-state"></span></p></section><section><h2>Customer / Deliver to</h2><p id="customer-name" class="person"></p><p id="recipient-label" hidden>Deliver to</p><p id="recipient" class="person" hidden></p><address id="address"></address><p id="customer-email" class="email"></p></section></div><table><colgroup><col class="description"><col class="quantity"><col class="unit-price"><col class="line-total"></colgroup><thead><tr><th scope="col">Description / configuration</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Line total</th></tr></thead><tbody id="invoice-items"></tbody></table><div class="totals"><div><span>Subtotal</span><span id="subtotal"></span></div><div><span>Delivery</span><span id="delivery"></span></div><div class="total"><strong id="total-label">Total paid</strong><strong id="total"></strong></div></div><footer><p>Thank you for choosing Apparition Instruments.</p><p>Apparition Instruments Limited · Registered in England &amp; Wales · Company No. 17454761<br>Registered office: 46 Sherwood Road, Rainworth, Mansfield, England, NG21 0LJ</p></footer>`;
const currency=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);
const date=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
const allowedOption=([key,value])=>typeof key==='string'&&typeof value==='string'&&key.trim()&&value.trim()&&
 !/(?:cost|margin|profit|supplier|stock|inventory|bom|sku|internal|admin|secret)/i.test(key);
export function itemOptions(item){
 if(Array.isArray(item.options))return item.options.filter(option=>allowedOption([option?.name,option?.value])).slice(0,12).map(option=>({name:option.name.trim().slice(0,50),value:option.value.trim().slice(0,100)}));
 const spec=item.snapshot?.specification;
 return spec&&typeof spec==='object'&&!Array.isArray(spec)?Object.entries(spec).filter(allowedOption).slice(0,12).map(([name,value])=>({name:name.trim().slice(0,50),value:value.trim().slice(0,100)})):[];
}
export function renderInvoiceDocument(root,record,document,{addressLines=null}={}){
 const invoice=invoiceFromOrder(record),sheet=root.querySelector('.sheet');
 sheet.innerHTML=invoiceTemplate;
 const field=id=>sheet.querySelector('#'+id);
 field('reference').textContent=invoice.reference;
 field('order-date').textContent=date(invoice.date);
 field('payment-state').textContent=invoice.paymentLabel;
 const contact=invoiceAddress(invoice.customer,invoice.delivery);
 field('customer-name').textContent=contact.customer;
 field('customer-email').textContent=contact.email;
 field('recipient').hidden=field('recipient-label').hidden=!contact.recipient;
 if(contact.recipient)field('recipient').textContent=contact.recipient;
 for(const line of addressLines??contact.lines){const element=document.createElement('div');element.textContent=line==='GB'?'United Kingdom':line;field('address').append(element);}
 for(const item of invoice.items){const row=document.createElement('tr'),description=document.createElement('td');description.textContent=item.name;
  const options=itemOptions(item);if(options.length){const note=document.createElement('small');note.className='invoice-options';note.textContent=options.map(o=>o.name+': '+o.value).join(' · ');description.append(note);}
  row.append(description);for(const value of [item.quantity,currency(item.unitPrice),currency(item.lineTotal)]){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);}field('invoice-items').append(row);}
 for(const key of ['subtotal','delivery','total'])field(key).textContent=currency(invoice.pricing[key]);
 if(invoice.refundedPence>0){
  field('total-label').textContent='Original Order total';
  const paragraph=document.createElement('p');paragraph.id='refund-details';paragraph.textContent='Refunded '+currency(invoice.refundedPence)+' of '+currency(invoice.pricing.total)+(invoice.latestRefundAt?' · '+date(invoice.latestRefundAt):'');field('payment-state').parentElement.after(paragraph);
  const add=(id,label,value,cls='')=>{const row=document.createElement('div');row.id=id;if(cls)row.className=cls;const left=document.createElement('strong'),right=document.createElement('strong');left.textContent=label;right.textContent=value;row.append(left,right);sheet.querySelector('.totals').append(row);};
  add('refund-total','Refunded','−'+currency(invoice.refundedPence));
  add('net-paid','Net paid',currency(invoice.pricing.total-invoice.refundedPence),'total');
 }
 root.hidden=false;
 return invoice;
}
