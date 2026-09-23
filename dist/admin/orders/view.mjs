import {channels,statuses} from './model.mjs';
import {specLabels} from '../../les-paul-kits/config.mjs';
export const money=p=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
export const date=v=>new Date(v).toLocaleString('en-GB');
export function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
export function definition(entries){const dl=el('dl');for(const [key,value] of entries){if(value===undefined||value===null||value==='')continue;const row=el('div');row.append(el('dt',key),el('dd',String(value)));dl.append(row);}return dl;}
export function showItem(item){const box=el('article',undefined,'order-item');box.append(el('h3',item.quantity+' × '+item.name),el('p',money(item.unitPrice)+' each · '+money(item.lineTotal)));
 if(item.type==='kit'){
  box.append(el('h4','Configured kit specification'),definition(Object.entries(item.snapshot.specification).map(([k,v])=>[specLabels[k]||k,v])));
  const details=el('details');details.append(el('summary','Configured price breakdown'),definition(item.snapshot.pricing.lines.map(l=>[l.label,l.price?money(l.price):'Included'])));box.append(details);
 }else{
  const s=item.snapshot,entries=s.productSpecifications?.length?s.productSpecifications.map(p=>[p.label,p.value]):Object.entries(s.specification||{});
  box.append(definition([['Manufacturer',s.manufacturer],...entries]));
  if(s.description){const d=el('details');d.append(el('summary','Saved product description'),el('p',s.description,'saved-description'));box.append(d);}
 }return box;
}
export function showOrder(record,root){root.replaceChildren();const top=el('div',undefined,'order-columns'),customer=el('section'),meta=el('section');customer.append(el('h3','Customer'),definition(Object.entries(record.customer)),el('h3','Delivery'),definition(Object.entries(record.delivery)));meta.append(el('h3','Order details'),definition([['Created',date(record.createdAt)],['Sales channel',channels[record.channel]],['Status',statuses[record.status]],['External reference',record.externalReference]]));if(record.notes)meta.append(el('p',record.notes,'saved-description'));top.append(customer,meta);root.append(top,el('h3','Items'));for(const item of record.items)root.append(showItem(item));root.append(el('h3','Pricing'),definition([['Subtotal',money(record.pricing.subtotal)],['Delivery / postage',money(record.pricing.delivery)],['Order total',money(record.pricing.total)]]));const history=el('details');history.append(el('summary','Status history'));for(const event of record.statusHistory)history.append(el('p',date(event.at)+' · '+statuses[event.status]));root.append(history);}
