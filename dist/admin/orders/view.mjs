import {channels} from './model.mjs';
import {fulfilmentLabels,paymentLabels,isPaidOrder} from './lifecycle.mjs';
import {specLabels} from '../../les-paul-kits/config.mjs';
export const money=p=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
export const date=v=>new Date(v).toLocaleString('en-GB');
export function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
export function definition(entries){const dl=el('dl');for(const [key,value] of entries){if(value===undefined||value===null||value==='')continue;const row=el('div');row.append(el('dt',key),el('dd',String(value)));dl.append(row);}return dl;}
export function postalAddress(delivery={},customerName=''){return [delivery.recipient&&delivery.recipient.toLocaleLowerCase()!==customerName.toLocaleLowerCase()?delivery.recipient:null,delivery.line1,delivery.line2,delivery.city,delivery.region,delivery.postcode,delivery.country==='GB'?'United Kingdom':delivery.country].filter(Boolean);}
export function showItem(item){const box=el('article',undefined,'order-item');box.append(el('h3',item.quantity+' × '+item.name),el('p',money(item.unitPrice)+' each · '+money(item.lineTotal)));
 if(item.type==='kit'){
  box.append(el('h4','Configured kit specification'),definition(Object.entries(item.snapshot.specification).map(([k,v])=>[specLabels[k]||k,v])));
  const parts=el('details');parts.append(el('summary','Resolved physical Components and quantities'),definition((item.snapshot.components||[]).filter(part=>part.quantity>0).map(part=>[part.role,part.quantity+' × '+(part.component?.name||part.name)+' · '+part.componentId+' · '+money(part.priceContribution||0)])));box.append(parts);
  const details=el('details');details.append(el('summary','Configured price breakdown'),definition(item.snapshot.pricing.lines.map(l=>[l.label,l.price?money(l.price):'Included'])));box.append(details);
 }else{
  const s=item.snapshot,entries=s.productSpecifications?.length?s.productSpecifications.map(p=>[p.label,p.value]):Object.entries(s.specification||{});
  box.append(definition([['Manufacturer',s.manufacturer],...entries]));
  if(s.description){const d=el('details');d.append(el('summary','Saved product description'),el('p',s.description,'saved-description'));box.append(d);}
 }return box;
}
export function showOrder(record,root){root.replaceChildren();const top=el('div',undefined,'order-columns'),customer=el('section'),meta=el('section');
 customer.append(el('h3','Customer'),definition([['Name',record.customer.name],['Email',record.customer.email]]),el('h3','Delivery address'));
 const address=postalAddress(record.delivery,record.customer.name||'');if(address.length){const block=el('address');for(const line of address)block.append(el('div',line));customer.append(block);}else customer.append(el('p','No delivery address recorded.'));
 if(record.paymentStatus==='paid'&&(!record.customer.name||!record.delivery.line1))customer.append(el('p','Customer or shipping details need to be retrieved from Stripe.','status-message'));
 const emailState=record.confirmationEmailStatus==='sent'?'Sent — '+date(record.confirmationEmailSentAt):({pending:'Pending',sending:'Sending — review before retry',failed:'Failed — manual review required',unknown:'Delivery uncertain — manual review required',legacy:'Not sent (before email activation)'})[record.confirmationEmailStatus]||'Pending';
 meta.append(el('h3','Order details'),definition([['Reference',record.reference],['Created',date(record.createdAt)],['Sales channel',channels[record.channel]],['Payment',paymentLabels[record.paymentStatus]||record.paymentStatus],['Refunded',record.refundedPence?money(record.refundedPence)+' of '+money(record.pricing.total):null],['Latest refund',record.latestRefundAt?date(record.latestRefundAt):null],['Fulfilment',isPaidOrder(record)?fulfilmentLabels[record.fulfilmentStatus]||record.fulfilmentStatus:'Checkout attempt'],['Confirmation email',emailState],['Total originally paid',money(record.pricing.total)],['External reference',record.externalReference]]));
 if(record.notes)meta.append(el('p',record.notes,'saved-description'));top.append(customer,meta);root.append(top,el('h3','Items'));for(const item of record.items)root.append(showItem(item));root.append(el('h3','Pricing'),definition([['Subtotal',money(record.pricing.subtotal)],['Delivery / postage',money(record.pricing.delivery)],['Order total',money(record.pricing.total)]]));const history=el('details');history.append(el('summary','Order history'));for(const event of record.statusHistory)history.append(el('p',date(event.at)+' · '+(fulfilmentLabels[event.status]||event.status)+' · '+(event.source==='admin'?'Admin':'System')));root.append(history);}
