import {money} from './catalogue.mjs';
import {categories} from '../admin/data.mjs';
import {imageSource} from '../admin/images.mjs';
import {deploymentPath} from '../deployment.mjs';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function renderComponentCards(catalogue){
 const all=location.pathname.replace(/\/$/,'')===deploymentPath('/components'),fallbacks=new Map();
 for(const section of document.querySelectorAll('.component-section')){const mark=section.querySelector('.component-mark');if(mark)fallbacks.set(section.id,mark.cloneNode(true));}
 if(all)for(const category of [...new Set(catalogue.map(p=>p.category))])if(!document.getElementById(category)){
  const section=el('section','component-section');section.id=category;const heading=el('div','component-section-heading');heading.append(el('p','eyebrow','COMPONENTS'),el('h2','',categories[category]));section.append(heading,el('div','component-grid'));document.querySelector('.component-section:last-of-type').after(section);
  const filters=document.querySelector('.component-filters');if(filters){const link=el('a','',categories[category]);link.href=deploymentPath('/components/?category='+category);link.dataset.categoryFilter=category;filters.append(link);}
 }
 for(const section of document.querySelectorAll('.component-section')){
  const grid=section.querySelector('.component-grid');grid.replaceChildren();
  for(const p of catalogue.filter(p=>p.category===section.id)){
   const card=el('article','component-card');card.id=p.id;card.dataset.product=p.id;
   const fallback=fallbacks.get(p.category)?.cloneNode(true)||el('div','component-mark');if(!fallback.firstChild)fallback.append(el('span','',categories[p.category]));
   const markValue=fallback.querySelector('span');if(markValue)markValue.textContent=p.specs.Resistance||p.specs.Value||p.specs.Capacitor||categories[p.category];
   const source=imageSource(p.image);if(source){const image=el('img','component-image');image.src=source;image.alt=p.name;image.loading='lazy';image.addEventListener('error',()=>image.replaceWith(fallback),{once:true});card.append(image);}else card.append(fallback);
   const body=el('div','component-card-body');body.append(el('p','component-stock'+(p.stock===0?' stock-empty':''),p.stock===0?'Out of stock':'In stock'),el('h3','',p.name));
   if(p.cardDescription)body.append(el('p','component-description',p.cardDescription));
   const dl=el('dl');for(const {label:key,value} of p.displaySpecifications){const row=el('div');row.append(el('dt','',key),el('dd','',value));dl.append(row);}body.append(dl);
   const purchase=el('div','component-purchase'),button=el('button','button secondary',p.stock===0?'Out of stock':Number.isFinite(p.price)?'Add to basket +':'Price not set');button.type='button';button.dataset.add=p.id;button.disabled=true;purchase.append(el('strong','',money(p.price)),button);const feedback=el('p','product-feedback');feedback.setAttribute('role','status');body.append(purchase,feedback);card.append(body);grid.append(card);
  }
  if(!grid.children.length)grid.append(el('p','', 'No individual components are currently available in this category.'));
 }
}
