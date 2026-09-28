import {catalogue,refreshCatalogue,money} from '../components/catalogue.mjs';
import {imageSource} from '../admin/images.mjs';
import {addComponent} from '../commerce.mjs';
import {createPublicComponentRepository} from '../backend/component-data.mjs?v=p10hi';
import {createPublicOptionRepository} from '../backend/catalogue-options.mjs';
import {categoryName,categoryPath,productContext,productDetails,productURL,resolveProduct,physicalRows} from './model.mjs?v=p10hi';

const element=(doc,tag,cls,text)=>{const node=doc.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
export function renderProductDetail(root,product,{document:doc=root.ownerDocument,add=addComponent,options=[]}={}){
 const category=categoryName(product.category),context=productContext[product.category],e=(tag,cls,text)=>element(doc,tag,cls,text);
 const back=e('a','product-back','← '+category);back.href=categoryPath(product.category);
 const layout=e('div','product-layout'),visual=e('div','product-visual'),source=imageSource(product.image),fallback=e('div','product-image-fallback',category);
 if(source){const img=e('img','product-image');img.src=source;img.alt=product.name;img.addEventListener('error',()=>img.replaceWith(fallback),{once:true});visual.append(img);}else visual.append(fallback);
 const info=e('div','product-info');info.append(e('p','eyebrow',category),e('h1','',product.productTitle?.trim()||product.name));
 const description=product.fullDescription?.trim()||product.shortDescription?.trim()||product.description?.trim();if(description)info.append(e('p','product-description',description));
 const stock=e('p','product-stock',product.stock===0?'Out of stock':'In stock'),price=e('p','product-price',money(product.price));
 const button=e('button','button','Add to basket');button.type='button';button.disabled=product.stock===0;button.setAttribute('aria-describedby','product-stock');stock.id='product-stock';
 const feedback=e('p','product-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 button.addEventListener('click',()=>{try{add(product.id);feedback.replaceChildren(doc.createTextNode('Added to your basket. '));const basket=e('a','','View basket →');basket.href='/basket/';feedback.append(basket);}catch(error){feedback.textContent=error.message;}});
 info.append(stock,price,button,feedback);
 const details=productDetails(product,options);if(details.length){const section=e('section','product-specifications'),dl=e('dl');section.append(e('h2','','Product specification'));for(const {label,value} of details){const row=e('div');row.append(e('dt','',label),e('dd','',value));dl.append(row);}section.append(dl);info.append(section);}
 const physical=physicalRows(product);if(physical.length){const section=e('section','product-specifications'),dl=e('dl');section.append(e('h2','','Physical / fitment specifications'));for(const {label,value} of physical){const row=e('div');row.append(e('dt','',label),e('dd','',value));dl.append(row);}section.append(dl);info.append(section);}
 const fitment=e('section','product-fitment');fitment.append(e('h2','','Before you choose'),e('p','',product.fitmentGuidance?.trim()||context.fitment));info.append(fitment);
 for(const [key,title] of [['installationGuidance','Installation guidance'],['included','What is included'],['technicalNotes','Technical notes']]){const value=product[key]?.trim();if(value){const section=e('section','product-fitment');section.append(e('h2','',title),e('p','',value));info.append(section);}}
 const links=e('section','product-learning');links.append(e('h2','','Explore the circuit'));for(const [label,url] of context.links){const a=e('a','',label+' →');a.href=url;links.append(a);}info.append(links);
 layout.append(visual,info);root.replaceChildren(back,layout);root.hidden=false;
 return {button,feedback};
}
export async function startProductDetail({document:doc=document,location:loc=location,load=()=>refreshCatalogue(createPublicComponentRepository()),loadOptions=()=>createPublicOptionRepository().list()}={}){
 const status=doc.getElementById('product-status'),root=doc.getElementById('product-detail');
 try{await load();const id=new URLSearchParams(loc.search).get('id'),product=resolveProduct(catalogue,id);
  if(!product){status.textContent='This component is not currently available. Browse the component collection for current products.';root.hidden=true;return null;}
  const title=(product.productTitle?.trim()||product.name)+' | Apparition Instruments',description=(product.shortDescription||product.cardDescription||product.description||'Explore the specification and current availability of '+product.name+'.').trim();
  doc.title=title;doc.querySelector('meta[name="description"]').content=description.slice(0,160);
  doc.querySelector('link[rel="canonical"]').href='https://apparitioninstruments.co.uk/products/?id='+encodeURIComponent(product.id);
  let options=[];try{options=await loadOptions();}catch{}renderProductDetail(root,product,{document:doc,options});status.textContent='';return product;
 }catch(error){root.hidden=true;status.textContent='Component details are temporarily unavailable. Please try again later.';return null;}
}
if(typeof document!=='undefined'&&document.getElementById('product-detail'))await startProductDetail();
