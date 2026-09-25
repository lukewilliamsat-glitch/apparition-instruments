import {generatorURL,installationGuideURL} from './wiring-generator/session.mjs';
import {productById,money} from './components/catalogue.mjs';
import {specLabels} from './les-paul-kits/config.mjs';
import {basketCount} from './commerce.mjs';
import {deploymentPath} from './deployment.mjs';
export function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
export function link(text,href,cls='text-link'){const a=el('a',cls,text);a.href=deploymentPath(href);return a;}
export function emptyBasket(){const box=el('section','empty-basket');box.append(el('p','eyebrow','YOUR NEXT UPGRADE STARTS HERE'),el('h2','','Your basket is waiting.'),el('p','','Explore components and wiring kits to plan your next upgrade.'),link('Explore components ↗','/components/','button'),link('Explore wiring kits','/wiring-kits/'));return box;}
export function itemCard(item,{editable=false,onQuantity,onRemove}={}){
 const product=item.product==='component'?productById(item.sku):null;
 const article=el('article','basket-item');article.dataset.itemId=item.id;
 const header=el('div','basket-item-header');header.append(el('h2','',product?product.name:(item.record.kitName||'Les Paul Style Wiring Kit')),el('span','item-price',money((product?product.price:item.record.pricing.total)*item.quantity)));article.append(header);
 const dl=el('dl','basket-specs');
 for(const [key,value] of Object.entries(product?{...product.specs,'Unit price':money(product.price)}:item.record.specification)){const row=el('div');row.append(el('dt','',product?key:specLabels[key]),el('dd','',value));dl.append(row);}
 article.append(dl);if(item.record?.legacyReconstructed)article.append(el('p','','This older basket entry had no saved specification. It was reconstructed using current options; review it before ordering.'));if(!product)article.append(el('p','checkout-quantity',money(item.record.pricing.total)+' per configured kit'));
 if(editable){
  const actions=el('div','basket-actions'),label=el('label','','Quantity'),input=el('input');input.type='number';input.min='1';input.max=String(product?.stock===null||!product?99:Math.max(1,product.stock));input.step='1';input.value=item.quantity;input.id=`quantity-${item.id}`;input.setAttribute('aria-label','Quantity for '+(product?product.name:'Les Paul kit'));input.addEventListener('change',()=>onQuantity(item.id,Number(input.value),input));label.append(input);
  const edit=link(product?'View component':'Edit configuration',product?'/components/#'+product.id:'/les-paul-kits/?edit='+encodeURIComponent(item.id)),remove=el('button','','Remove item');remove.type='button';remove.setAttribute('aria-label','Remove '+(product?product.name:'this Les Paul kit'));remove.addEventListener('click',()=>onRemove(item.id));actions.append(label,edit);if(!product)actions.append(link('Print specification','/wiring-kits/specification/?basket='+encodeURIComponent(item.id)),link('Installation diagram',generatorURL(item.record.diagram?.configuration||{},item.configuration)),link('Installation guide',installationGuideURL(item.record.diagram?.configuration||{},item.configuration)));actions.append(remove);article.append(actions);
 }else article.append(el('p','checkout-quantity',`Quantity: ${item.quantity}`));
 return article;
}
export function totalCard(items,checkout=false,shipping=null){
 const box=el('aside',`basket-total${checkout?' checkout-total':''}`);box.setAttribute('aria-label','Basket summary');box.append(el('p','eyebrow','THE COMPLETE PICTURE'),el('h2','','Your basket summary'));
 const count=basketCount(items),parts=items.filter(x=>x.product==='component'),kits=items.filter(x=>x.product==='les-paul'),partTotal=parts.reduce((sum,x)=>sum+productById(x.sku).price*x.quantity,0),kitTotal=kits.reduce((sum,x)=>sum+x.record.pricing.total*x.quantity,0),subtotal=partTotal+kitTotal,delivery=checkout&&shipping?(subtotal>=shipping.free_delivery_threshold_pence?0:shipping.standard_delivery_pence):null,lines=[['Items',String(count)],...(parts.length?[['Components',money(partTotal)]]:[]),...(kits.length?[['Configured wiring kits',money(kitTotal)]]:[]),['Basket subtotal',money(subtotal)],['Delivery',delivery===null?'Calculated at checkout':delivery===0?'FREE':money(delivery)],...(delivery!==null?[['Estimated payable total',money(subtotal+delivery)]]:[])];
 lines.forEach(([label,value])=>{const row=el('div','total-line');row.append(el('span','',label),el('span','',value));box.append(row);});
 box.append(el('p','',checkout?'The final amount is verified on the server before Stripe checkout. Your order remains Pending and Unpaid until payment is independently confirmed.':'Your selections are saved locally for planning; no order has been placed. Delivery is calculated at checkout. Editing a kit applies current options and prices.'));
 if(checkout)box.append(link('Return to your basket','/basket/'));else box.append(link('Review checkout →','/checkout/','button'),link('Continue exploring','/wiring-kits/'));
 return box;
}
export function errorBasket(message,onReset){const box=el('section','empty-basket');box.append(el('h2','','Your basket needs attention.'),el('p','',message));const button=el('button','button secondary','Reset saved basket');button.type='button';button.addEventListener('click',onReset);box.append(button);return box;}
