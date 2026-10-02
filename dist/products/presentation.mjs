// Commercial structure only. Catalogue eligibility, prices, stock and basket behaviour remain local authorities.
import {categoryName,productDetails,productContext,productURL} from './model.mjs?v=p11ef';
export const componentPurpose={
 'treble-bleeds':'Shape how your volume control retains high frequencies as you turn it down.',
 capacitors:'Choose the capacitance that shapes the range of your passive tone control.',
 potentiometers:'Choose the resistance, taper and physical fit for your volume or tone control.'
};
export const componentSummary=product=>productDetails(product).find(row=>['Resistance','Capacitance','Capacitor'].includes(row.label))?.value||categoryName(product.category);
const node=(doc,tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
export function refineProductPresentation(root,product){
 if(root.dataset.commercialSystem==='v1'&&root.querySelector('.product-identity'))return;
 const doc=root.ownerDocument,e=(tag,cls,text)=>node(doc,tag,cls,text),info=root.querySelector('.product-info'),layout=root.querySelector('.product-layout');if(!info||!layout)return;
 const identity=e('header','product-identity'),purchase=e('div','product-purchase');
 for(const el of [...info.children])if(el.matches('.eyebrow,h1'))identity.append(el);
 identity.append(e('p','product-purpose',product.shortDescription?.trim()||componentPurpose[product.category]));
 for(const el of [...info.children])if(el.matches('.product-stock,.product-price,button,.product-feedback'))purchase.append(el);
 const stock=purchase.querySelector('.product-stock'),button=purchase.querySelector('button');if(stock&&button){stock.id='product-stock';button.setAttribute('aria-describedby',stock.id);}
 const details=e('div','product-details'),about=e('section','product-about');about.append(e('h2','','About this component'));
 const description=info.querySelector('.product-description');if(description)about.append(description);else about.append(e('p','',componentPurpose[product.category]));details.append(about);
 for(const el of [...info.children])if(el.matches('section'))details.append(el);
 const help=e('section','product-support');help.append(e('h2','','Check before you order'),e('p','','Compare the specification and physical fit with your existing parts. If you are unsure, share the details of your guitar and current wiring.'));
 const contact=e('a','','Ask about compatibility →');contact.href='/contact/';const delivery=e('a','','Delivery and ordering questions →');delivery.href='/faq/';help.append(contact,delivery);details.append(help);
 info.replaceChildren(identity,purchase);layout.after(details);root.dataset.commercialSystem='v1';
 const fallback=root.querySelector('.product-image-fallback');if(fallback){fallback.replaceChildren(e('span','eyebrow',categoryName(product.category)),e('strong','',componentSummary(product)),e('span','product-visual-note','Specification-led selection'));}
}
export function refineCatalogueCard(card,product){
 if(card.dataset.commercialSystem==='v1')return;const doc=card.ownerDocument,e=(tag,cls,text)=>node(doc,tag,cls,text),body=card.querySelector('.component-card-body');if(!body)return;
 card.dataset.commercialSystem='v1';
 if(!card.querySelector('.component-image,.component-mark')){const mark=e('div','component-mark');mark.append(e('span','',componentSummary(product)));card.prepend(mark);}
 if(!body.querySelector('.component-stock'))body.prepend(e('p','component-stock'+(product.stock===0?' stock-empty':''),product.stock===0?'Out of stock':'In stock'));
 const existingCopy=body.querySelector('p:not(.component-stock)');if(existingCopy&&!existingCopy.className){existingCopy.className='component-description';if(existingCopy.textContent.startsWith('Explore the specification'))existingCopy.textContent=componentPurpose[product.category];}
 if(!body.querySelector('.component-description'))body.querySelector('h3')?.after(e('p','component-description',product.cardDescription||componentPurpose[product.category]));
 if(!body.querySelector('dl')){const dl=e('dl');for(const {label,value} of productDetails(product).filter(row=>row.label!=='SKU').slice(0,3)){const row=e('div');row.append(e('dt','',label),e('dd','',value));dl.append(row);}if(dl.children.length)body.querySelector('.component-description')?.after(dl);}
 if(!body.querySelector('.component-purchase')){const purchase=e('div','component-purchase'),price=e('strong','',Number.isSafeInteger(product.price)?'£'+(product.price/100).toFixed(2):'');purchase.append(price);body.append(purchase);}
 const link=body.querySelector('.component-details-action');if(link){link.textContent='Explore '+categoryName(product.category).toLowerCase()+' →';link.href=productURL(product.id);}
}
