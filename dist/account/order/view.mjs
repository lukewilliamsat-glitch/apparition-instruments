import {progress,customerStatus,money,date} from './model.mjs';

export function renderOrder(root,order,document){
 const make=(tag,value,cls)=>{const node=document.createElement(tag);if(value!=null)node.textContent=String(value);if(cls)node.className=cls;return node;};
 const section=(title)=>{const node=make('section',null,'order-section');node.append(make('h2',title));root.append(node);return node;};
 root.replaceChildren();
 const summary=section('Order summary');summary.append(make('p','Placed '+(date(order.createdAt)||'date unavailable')+' · '+customerStatus(order),'order-lead'));
 const track=section('Order progress'),list=make('ol',null,'order-progress');track.append(list);
 for(const stage of progress(order)){
  const item=make('li',null,'stage '+stage.state);item.append(make('strong',stage.label));
  if(stage.at)item.append(make('span',date(stage.at)));
  if(stage.state==='current')item.setAttribute('aria-current','step');list.append(item);
 }
 if(order.paymentStatus==='refunded')track.append(make('p','This Order has been fully refunded. Fulfilment is paused.','order-alert'));
 else if(order.paymentStatus==='partially_refunded')track.append(make('p','This Order has been partially refunded. Its fulfilment status is shown above.','order-alert'));
 else if(order.status==='cancelled')track.append(make('p','This Order has been cancelled.','order-alert'));
 if(order.status==='completed')track.append(make('p','Fulfilment is complete.','order-note'));
 const items=section('Your items'),itemList=make('ul',null,'order-items');items.append(itemList);
 for(const item of order.items||[]){
  const li=make('li');li.append(make('strong',item.name||'Item'),make('span',item.quantity+' × '+money(item.unitPrice)+' · '+money(item.lineTotal)));
  if(item.options?.length)li.append(make('small',item.options.map(option=>option.name+': '+option.value).join(' · ')));
  itemList.append(li);
 }
 const totals=make('dl',null,'order-totals');summary.append(totals);
 for(const [label,value] of [['Subtotal',order.pricing.subtotal],['Delivery',order.pricing.delivery],['Total',order.pricing.total]])totals.append(make('dt',label),make('dd',money(value)));
 if(order.refundedPence>0)totals.append(make('dt','Refunded'+(date(order.latestRefundAt)?' · '+date(order.latestRefundAt):'')),make('dd',money(order.refundedPence)));
 const delivery=section('Delivery');if(order.recipient)delivery.append(make('p',order.recipient));
 if(order.address?.length){const address=make('address');for(const line of order.address)address.append(make('span',line));delivery.append(address);}
 const dispatch=order.dispatch||{};
 if(['dispatched','completed'].includes(order.status)&& (dispatch.carrier||dispatch.trackingReference||dispatch.trackingUrl)){
  const shipping=section('Dispatch & tracking');
  if(dispatch.carrier)shipping.append(make('p','Carrier: '+dispatch.carrier));
  if(dispatch.trackingReference)shipping.append(make('p','Tracking reference: '+dispatch.trackingReference));
  if(dispatch.trackingUrl){const link=make('a','Track your Order');link.href=dispatch.trackingUrl;link.rel='noopener noreferrer';link.target='_blank';shipping.append(link);}
 }
 const actions=make('nav',null,'order-actions');actions.setAttribute('aria-label','Order actions');
 const invoice=make('a','View Invoice');invoice.href='/account/order/invoice/?reference='+encodeURIComponent(order.reference);
 const support=make('a','Contact us about this Order');support.href='/contact/?reference='+encodeURIComponent(order.reference);
 actions.append(invoice,support);root.append(actions);
}
