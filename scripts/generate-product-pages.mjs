// Production SEO is an output of the public Supabase catalogue, never a hand-maintained product database.
import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {Window} from 'happy-dom';
import {publicBackendConfig} from '../dist/backend/public-config.mjs';
import {componentFromRow} from '../dist/backend/component-data.mjs';
import {productDetails,physicalRows,eligibleProduct,productSlug,productURL,categoryName,productContext,relatedProducts} from '../dist/products/model.mjs';

const dist=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const origin='https://apparitioninstruments.co.uk';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const money=pence=>'£'+(pence/100).toFixed(2);
const safeText=value=>String(value??'').trim();
const validImage=value=>{
 const src=typeof value==='string'?value:value?.url;
 return typeof src==='string'&&/^https:\/\//i.test(src)?src:null;
};
export function prepareProducts(rows){
 const slugs=new Set();return rows.filter(row=>row.active!==false).map(row=>{
  const p=componentFromRow({...row,active:true},{quantity:row.stock});
  return {...p,price:p.salePrice,name:safeText(p.productTitle)||p.name};
 }).filter(eligibleProduct).map(p=>{
  const slug=productSlug(p.id);if(slugs.has(slug))throw new Error('Product slug collision: '+slug);
  slugs.add(slug);return p;
 }).sort((a,b)=>a.id.localeCompare(b.id,'en-GB'));
}
export function productDescription(p){
 return (safeText(p.shortDescription)||safeText(p.fullDescription)||safeText(p.description)||`Explore the specification of ${p.name} from Apparition Instruments.`).slice(0,160);
}
export function productSchema(p,options=[]){
 const url=origin+productURL(p.id),image=validImage(p.image);
 const schema={'@context':'https://schema.org','@type':'Product',name:p.name,url,description:productDescription(p),
  ...(p.sku?{sku:p.sku}:{}),...(image?{image}:{}),
  offers:{'@type':'Offer',url,priceCurrency:'GBP',price:(p.price/100).toFixed(2),availability:'https://schema.org/'+(p.stock>0?'InStock':'OutOfStock')},
  additionalProperty:[...productDetails(p,options),...physicalRows(p)].map(row=>({'@type':'PropertyValue',name:row.label,value:row.value}))};
 if(p.manufacturer)schema.manufacturer={'@type':'Organization',name:p.manufacturer};
 return schema;
}
export function productPage(p,shell,options=[],related=[]){
 const w=new Window({url:origin+productURL(p.id)});w.document.write(shell);const d=w.document;
 const title=p.name+' | Apparition Instruments',description=productDescription(p),url=origin+productURL(p.id),category=categoryName(p.category);
 d.title=title;d.querySelector('meta[name="description"]').content=description;
 d.querySelector('meta[name="robots"]').remove();d.querySelector('link[rel="canonical"]').href=url;
 const head=d.head;
 for(const [property,content] of Object.entries({'og:type':'product','og:site_name':'Apparition Instruments','og:title':title,'og:description':description,'og:url':url,...validImage(p.image)?{'og:image':validImage(p.image)}:{}})){
  const meta=d.createElement('meta');meta.setAttribute('property',property);meta.content=content;head.append(meta);
 }
 const card=d.createElement('meta');card.name='twitter:card';card.content='summary';head.append(card);
 const crumbs=[['Home','/'],['Components','/components/'],[category,'/components/'+p.category+'/'],[p.name,productURL(p.id)]];
 const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbs.map(([name,path],i)=>({'@type':'ListItem',position:i+1,name,item:origin+path}))};
 for(const data of [productSchema(p,options),breadcrumb]){const script=d.createElement('script');script.type='application/ld+json';script.textContent=json(data);head.append(script);}
 const main=d.querySelector('#main');main.dataset.componentId=p.id;
 const nav=`<nav class="product-breadcrumb" aria-label="Breadcrumb">${crumbs.map(([name,path],i)=>i===crumbs.length-1?`<span aria-current="page">${esc(name)}</span>`:`<a href="${esc(path)}">${esc(name)}</a><span aria-hidden="true"> › </span>`).join('')}</nav>`;
 const image=validImage(p.image)?`<img class="product-image" src="${esc(validImage(p.image))}" alt="${esc(p.name)}">`:`<div class="product-image-fallback">${esc(category)}</div>`;
 const specs=[...productDetails(p,options),...physicalRows(p)];
 const dl=specs.length?`<section class="product-specifications"><h2>Product specification</h2><dl>${specs.map(row=>`<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`).join('')}</dl></section>`:'';
 const context=productContext[p.category],links=context.links.map(([name,path])=>`<a href="${esc(path)}">${esc(name)} →</a>`).join('');
 const optional=[['included','What is included'],['installationGuidance','Installation guidance'],['technicalNotes','Technical notes'],['qcStatement','Testing and QC']].map(([key,title])=>safeText(p[key])?`<section class="product-fitment"><h2>${title}</h2><p>${esc(p[key])}</p></section>`:'').join('');
 const alternatives=relatedProducts(p,related),relatedHTML=alternatives.length?`<section class="product-related"><h2>Related ${esc(category)}</h2><ul>${alternatives.map(item=>`<li><a href="${esc(productURL(item.id))}">${esc(item.name)}</a><span>${item.stock===0?' · Out of stock':' · '+money(item.price)}</span></li>`).join('')}</ul></section>`:'';
 const staticInfo=`<a class="product-back" href="/components/${esc(p.category)}/">← ${esc(category)}</a><div class="product-layout"><div class="product-visual">${image}</div><div class="product-info"><p class="eyebrow">${esc(category)}</p><h1>${esc(p.name)}</h1><p class="product-description">${esc(safeText(p.fullDescription)||description)}</p><p class="product-stock">${p.stock?'In stock':'Out of stock'}</p><p class="product-price">${money(p.price)}</p><button class="button" type="button" disabled>Loading current availability…</button>${dl}<section class="product-fitment"><h2>Before you choose</h2><p>${esc(safeText(p.fitmentGuidance)||context.fitment)}</p></section>${optional}<section class="product-learning"><h2>Explore the circuit</h2>${links}</section></div></div>${relatedHTML}`;
 main.insertAdjacentHTML('afterbegin',nav);d.querySelector('#product-status').textContent='';const root=d.querySelector('#product-detail');root.innerHTML=staticInfo;root.hidden=false;
 const result='<!doctype html>\n'+d.documentElement.outerHTML;w.close();return result;
}
export function injectCategoryLinks(html,products,category){
 const w=new Window();w.document.write(html);const d=w.document,grid=d.querySelector('.component-section#'+category+' .component-grid');if(!grid)throw new Error('Category grid missing: '+category);
 const intro={potentiometers:'Compare the control value, taper and shaft fit before choosing a potentiometer for your guitar.',capacitors:'Compare capacitance, voltage rating and physical fit when selecting a passive guitar tone capacitor.','treble-bleeds':'Compare capacitor-only and resistor-capacitor treble bleed networks, then explore their response in the Designer.'};
 if(d.querySelector('.page-intro h1')?.textContent.trim()===categoryName(category)){
  const copy=d.querySelector('.page-intro p:last-of-type');if(copy)copy.textContent=intro[category];
 }
 if(category==='treble-bleeds'&&d.querySelector('.page-intro h1')?.textContent.trim()===categoryName(category)){
  const guide=d.querySelector('.category-learning');if(guide&&!guide.querySelector('a[href="/treble-bleed-designer/"]')){
   const a=d.createElement('a');a.href='/treble-bleed-designer/';a.textContent='Explore the Treble Bleed Designer →';guide.append(a);
  }
 }
 grid.replaceChildren();for(const p of products.filter(p=>p.category===category)){
  const card=d.createElement('article');card.className='component-card';card.dataset.product=p.id;
  card.innerHTML=`<div class="component-card-body"><h3><a class="component-detail-link" href="${esc(productURL(p.id))}">${esc(p.name)}</a></h3><p>${esc(productDescription(p))}</p><a class="component-details-action" href="${esc(productURL(p.id))}">View details →</a></div>`;grid.append(card);
 }
 return '<!doctype html>\n'+d.documentElement.outerHTML;
}
export async function generate({rows,options=[],root=dist}){
 const products=prepareProducts(rows),shell=await readFile(join(root,'products/index.html'),'utf8');
 const folder=join(root,'products');for(const entry of await readdir(folder,{withFileTypes:true}))if(entry.isDirectory())await rm(join(folder,entry.name),{recursive:true,force:true});
 for(const p of products){
  const dir=join(folder,productSlug(p.id));await mkdir(dir,{recursive:true});let publish=p;
  if(typeof p.image==='string'){
   const match=p.image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
   if(match){const bytes=Buffer.from(match[2],'base64');if(bytes.length>0&&bytes.length<=8*1024*1024){
    const ext=match[1]==='jpeg'?'jpg':match[1];await writeFile(join(dir,'image.'+ext),bytes);
    publish={...p,image:{kind:'object',url:origin+productURL(p.id)+'image.'+ext}};
   }}
  }
  await writeFile(join(dir,'index.html'),productPage(publish,shell,options,products));
 }
 for(const category of ['potentiometers','capacitors','treble-bleeds']){
  const path=join(root,'components',category,'index.html');await writeFile(path,injectCategoryLinks(await readFile(path,'utf8'),products,category));
 }
 const allPath=join(root,'components/index.html');let all=await readFile(allPath,'utf8');
 for(const category of ['potentiometers','capacitors','treble-bleeds'])all=injectCategoryLinks(all,products,category);
 await writeFile(allPath,all);
 const sitemap=(await readFile(join(root,'sitemap.xml'),'utf8')).replace(/<url><loc>https:\/\/apparitioninstruments\.co\.uk\/products\/[^<]+<\/loc><\/url>/g,'');
 if(!sitemap.includes('</urlset>'))throw new Error('Invalid base sitemap');
 await writeFile(join(root,'sitemap.xml'),sitemap.replace('</urlset>',products.map(p=>`<url><loc>${esc(origin+productURL(p.id))}</loc></url>`).join('')+'</urlset>'));
 return products;
}
async function fetchPublic(table){
 const {url,publishableKey}=publicBackendConfig;
 const response=await fetch(url+'/rest/v1/'+table+'?select=*',{headers:{apikey:publishableKey,Accept:'application/json'}});
 if(!response.ok)throw new Error('Public '+table+' fetch failed: '+response.status);
 const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid '+table+' response');return rows;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [rows,options]=await Promise.all([fetchPublic('catalogue_components'),fetchPublic('catalogue_options')]);const products=await generate({rows,options});console.log('Generated '+products.length+' authoritative public product pages.');}
 catch(error){console.error(error);process.exitCode=1;}
}
