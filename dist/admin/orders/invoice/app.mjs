import {currentAdminOrderRepository} from '../../../backend/order-data.mjs?v=p07b5';
import {invoiceFromOrder,invoiceAddress} from './model.mjs';
import {money} from '../view.mjs?v=p07b7';
const root=document.querySelector('#invoice'),message=document.querySelector('#invoice-message');
const make=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;};
async function loadInvoice(){
 try{
  const id=new URLSearchParams(location.search).get('id');if(!/^[a-f\d-]{36}$/i.test(id||''))throw new Error('Choose a paid Order in Admin first.');
  const record=(await currentAdminOrderRepository().list()).find(order=>order.id===id);
  const order=invoiceFromOrder(record);
  document.title=`Invoice ${order.reference} | Apparition Instruments`;
  root.querySelector('#reference').textContent=order.reference;
  root.querySelector('#order-date').textContent=new Date(order.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const contact=invoiceAddress(order.customer,order.delivery);
  root.querySelector('#customer-name').textContent=contact.customer;
  const recipient=root.querySelector('#recipient'),recipientLabel=root.querySelector('#recipient-label');
  recipient.hidden=!contact.recipient;recipientLabel.hidden=!contact.recipient;
  if(contact.recipient)recipient.textContent=contact.recipient;
  const address=root.querySelector('#address');for(const line of contact.lines)address.append(make('div',line));
  root.querySelector('#customer-email').textContent=contact.email;
  const rows=root.querySelector('#invoice-items');for(const item of order.items){const row=make('tr');for(const value of [item.name,item.quantity,money(item.unitPrice),money(item.lineTotal)])row.append(make('td',value));rows.append(row);}
  for(const [key,value] of Object.entries({subtotal:order.pricing.subtotal,delivery:order.pricing.delivery,total:order.pricing.total}))root.querySelector('#'+key).textContent=money(value);
  root.hidden=false;message.textContent='';
 }catch(error){message.textContent=error.message;root.hidden=true;}
}
loadInvoice();
