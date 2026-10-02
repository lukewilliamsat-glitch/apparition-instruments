// Offline presentation migration of committed public snapshots, never a catalogue refresh.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {Window} from 'happy-dom';
import {refineProductPresentation,refineCatalogueCard} from '../dist/products/presentation.mjs';
const root=new URL('../dist/',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),write=(path,html)=>writeFileSync(new URL(path,root),html);
const commercialPaths=['index.html','components/index.html',...['potentiometers','capacitors','treble-bleeds'].map(k=>'components/'+k+'/index.html'),'products/index.html','wiring-kits/index.html','wiring-kits/help-me-choose/index.html','les-paul-kits/index.html','basket/index.html'];
for(const entry of readdirSync(new URL('wiring-kits/',root),{withFileTypes:true}).filter(e=>e.isDirectory())){const path='wiring-kits/'+entry.name+'/index.html';if(!commercialPaths.includes(path))commercialPaths.push(path);}
const products=[];
for(const dir of readdirSync(new URL('products/',root),{withFileTypes:true}).filter(e=>e.isDirectory())){
 const path='products/'+dir.name+'/index.html',source=read(path),w=new Window();w.document.write(source);const d=w.document;
 const schema=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)).find(x=>x['@type']==='Product');if(!schema)throw Error('Missing public snapshot authority '+path);
 const category=d.querySelector('.product-breadcrumb a[href^="/components/"][href$="/"]:not([href="/components/"])')?.getAttribute('href').split('/')[2];
 const properties=(schema.additionalProperty||[]).map(({name,value})=>({label:name,value}));
 const product={id:d.querySelector('main').dataset.componentId||dir.name,name:schema.name,category,price:Math.round(Number(schema.offers.price)*100),stock:schema.offers.availability.endsWith('/InStock')?1:0,productSpecifications:properties,displaySpecifications:properties};
 // Availability is a boolean projection of the existing Offer, never an invented stock quantity.
 products.push(product);const target=d.getElementById('product-detail');refineProductPresentation(target,product);
 const next=source.replace(/<section[^>]*id="product-detail"[^>]*>[\s\S]*?<\/section>\s*<\/main>/,target.outerHTML+'</main>');
 // The detail root is a div on current snapshots; preserve everything outside that root.
 if(next===source){const begin=source.indexOf('<div id="product-detail"'),end=source.lastIndexOf('</main>');if(begin<0||end<0)throw Error('Missing product snapshot boundary '+path);write(path,source.slice(0,begin)+target.outerHTML+source.slice(end));}else write(path,next);
 w.close();commercialPaths.push(path);
}
for(const path of ['components/index.html',...['potentiometers','capacitors','treble-bleeds'].map(k=>'components/'+k+'/index.html')]){
 let source=read(path),w=new Window();w.document.write(source);const d=w.document;
 for(const card of d.querySelectorAll('.component-card')){const id=card.dataset.product||card.querySelector('a[href^="/products/"]')?.getAttribute('href').split('/')[2],product=products.find(p=>p.id.toLowerCase()===id?.toLowerCase());if(!product)continue;const old=card.outerHTML;refineCatalogueCard(card,product);source=source.replace(old,card.outerHTML);}
 if(path==='components/index.html'){
  source=source.replace(/<div class="page-intro">[\s\S]*?<\/div>/,'<div class="page-intro"><p class="eyebrow">APPARITION / GUITAR ELECTRONICS</p><h1>Small components.<br><em>Considered choices.</em></h1><p>Treble bleeds, tone capacitors and potentiometers for your next build. Choose by electrical value, control behaviour and the fit of your guitar.</p></div>');
  const intents='<section class="catalogue-intents" aria-label="Choose a component category">'+[['01','Treble Bleeds','treble-bleeds','Keep high-frequency detail in view as you roll back the volume.'],['02','Capacitors','capacitors','Choose the value that shapes your passive tone control.'],['03','Potentiometers','potentiometers','Match resistance, taper and shaft fit to your instrument.']].map(([n,title,slug,copy])=>`<article class="catalogue-intent"><span class="eyebrow">${n} / COMPONENTS</span><h2>${title}</h2><p>${copy}</p><a href="/components/${slug}/">Explore ${title.toLowerCase()} →</a></article>`).join('')+'</section>';
  if(!source.includes('class="catalogue-intents"'))source=source.replace('<nav class="component-filters"',intents+'<nav class="component-filters"');
 }
 const philosophy='<section class="catalogue-philosophy"><div><p class="eyebrow">THE APPARITION APPROACH</p><h2>Specifications first.<br>Claims second.</h2></div><div><p>Electrical values, physical fit and the surrounding circuit matter. We describe components in those terms, without promising a particular sound from a brand name alone.</p><p>Assembly and testing information is stated on the individual product page, where applicable.</p><a href="/luthier-hub/">Understand the components in Luthier Hub →</a></div></section>';
 if(!source.includes('class="catalogue-philosophy"'))source=source.replace('<a class="component-kit-link',philosophy+'<a class="component-kit-link');write(path,source);w.close();
}
for(const path of commercialPaths){let source=read(path);source=source.replace(/<body(?: class="([^"]*)")?>/,(_,cls)=>'<body class="'+[...(cls||'').split(' ').filter(Boolean).filter(v=>v!=='commercial-page'),'commercial-page'].join(' ')+'">');write(path,source);}
console.log('Refined '+products.length+' existing product snapshots and four catalogue routes without backend access.');
