import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {productPage} from '../scripts/generate-product-pages.mjs';
const base='0a50dedbd2a70a7d5773576c76caef77d298af98',read=p=>readFileSync(p,'utf8');
const settings={disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true};
const paths=[];function collect(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(e.isDirectory())collect(dir+'/'+e.name);else if(e.name==='index.html')paths.push(dir+'/'+e.name);}}collect('dist');
const w=new Window({settings}),parse=s=>new w.DOMParser().parseFromString(s,'text/html');
const unproject=s=>s.replace('<link rel="stylesheet" href="/customer-ui.css">','').replace(/<body class="([^"]*)">/,(_,classes)=>{const c=classes.split(' ').filter(x=>x!=='site-ui'&&!x.startsWith('ui-')).join(' ');return c?`<body class="${c}">`:'<body>';}).replace('id="account-signout" class="button secondary"','id="account-signout" class="button"').replace('id="export-svg" type="button" class="button utility"','id="export-svg" type="button" class="button"');
let shells=0,controlCount=0;
for(const p of paths){const source=read(p),d=parse(source);if(!d.querySelector('header.site-header nav[aria-label="Main navigation"]'))continue;
 const previous=execFileSync('git',['show',base+':'+p],{encoding:'utf8'});
 if(p.startsWith('dist/admin/')){assert.equal(source,previous,'Admin excluded');assert(!d.body.classList.contains('site-ui'));continue;}
 assert.equal(unproject(source),previous,'Only shared shell projection and two action classes may change '+p);
 assert(d.body.classList.contains('site-ui'),p);assert.equal(d.querySelectorAll('link[href="/customer-ui.css"]').length,1);assert.equal([...d.querySelectorAll('link[rel=stylesheet]')].at(-1).getAttribute('href'),'/customer-ui.css');assert.equal(d.querySelectorAll('h1').length,parse(previous).querySelectorAll('h1').length,'Existing title contract '+p);
 assert(!d.querySelector('header.site-header a[href="/admin/"]'));assert(!d.querySelector('#mobile-nav a[href="/admin/"]'));assert.equal(d.querySelectorAll('.footer-links a[href="/admin/"]').length,1);
 const old=parse(previous);const contract=doc=>[...doc.querySelectorAll('input,select,textarea,button')].map(e=>[e.tagName,...['id','name','type','value','min','max','step','autocomplete','required','disabled','hidden','aria-label','aria-controls','aria-expanded','aria-pressed'].map(a=>e.getAttribute(a))]);assert.deepEqual(contract(d),contract(old),'Native control contract '+p);controlCount+=contract(d).length;shells++;
}
assert.equal(shells,50);
const css=read('dist/customer-ui.css');assert(!/\.wire-line|\.terminal\b|\.pickup-conductor|stroke:|fill:/.test(css),'UI layer must not style electrical SVG primitives');
for(const variable of ['ui-bg','ui-panel','ui-ink','ui-muted','ui-gold','ui-rule','ui-width','ui-reading','ui-workspace','ui-gutter','ui-display','ui-title','ui-body','ui-metadata'])assert(css.includes('--'+variable+':'));
const luminance=hex=>{const v=hex.match(/[a-f\d]{2}/g).map(x=>{const n=parseInt(x,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];};const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const pairs=[['e8e2d4','171a17'],['b4b3a6','171a17'],['b4b3a6','20241f'],['171a17','c4a66a'],['f1b5aa','352523'],['55584d','f3f1eb'],['715722','f3f1eb']];for(const [a,b] of pairs)assert(ratio(a,b)>=4.5,`${a}/${b}`);
assert(css.includes('@media (prefers-reduced-motion:reduce)'));assert(css.includes('animation:none!important'));assert(css.includes('outline:2px solid var(--ui-focus)'));assert(css.includes('[aria-invalid=true]'));
const representatives=[['dist/index.html','commercial'],['dist/components/index.html','commercial'],['dist/products/bleed-duncan/index.html','commercial'],['dist/wiring-kits/help-me-choose/index.html','commercial'],['dist/interactive-tools/index.html','editorial'],['dist/luthier-hub/potentiometers-explained/index.html','editorial'],['dist/account/index.html','service'],['dist/contact/index.html','service'],['dist/basket/index.html','service'],['dist/circuit-forge/index.html','technical'],['dist/wiring-generator/index.html','technical'],['dist/treble-bleed-designer/index.html','technical']];
let responsive=0;
for(const width of [320,390,768,1024,1400,1920])for(const [p,mode] of representatives){
 const v=new Window({width,height:900,settings});v.document.write(read(p));const d=v.document;assert(d.body.classList.contains('ui-'+mode),p);
 // The emulator needs whitespace before media parentheses; this preserves CSS semantics.
 // External styles, scripts, Google fonts, business endpoints and browser infrastructure are never loaded.
 for(const link of d.querySelectorAll('link[rel=stylesheet]')){const href=link.getAttribute('href').split('?')[0],file=href.startsWith('/')?'dist'+href:new URL(href,'file://'+process.cwd()+'/'+p).pathname;const style=d.createElement('style');style.textContent=read(file).replace(/@media\(/g,'@media (').replace(/@import[^;]+;/g,'');d.head.append(style);}
 const get=e=>v.getComputedStyle(e);assert.equal(get(d.body).backgroundColor,'#171a17',p+' colour authority');assert.equal(get(d.querySelector('.site-header>nav')).display,width<=1180?'none':'flex');assert.equal(get(d.querySelector('.menu-button')).minHeight,'44px');if(width===320)assert.equal(get(d.querySelector('.site-header .brand-logo')).width,'128px');
 const field=d.querySelector('main input:not([type=radio]):not([type=checkbox]):not([type=hidden]):not([type=range]),main select');if(field)assert.equal(get(field).minHeight,mode==='technical'?'44px':'48px',p+' field');
 const primary=d.querySelector('main .button:not(.secondary):not(.utility)');if(primary){assert.equal(get(primary).minHeight,'48px');assert.equal(get(primary).backgroundColor,'#c4a66a');assert.equal(get(primary).color,'#171a17');}
 if(p.includes('contact/'))assert.equal(get(d.querySelector('.contact-fields')).gridTemplateColumns,width<=560?'minmax(0,1fr)':'repeat(2,minmax(0,1fr))');
 if(p.includes('basket/')){const box=d.createElement('div');box.className='basket-layout';d.querySelector('main').append(box);assert.equal(get(box).gridTemplateColumns,width<=900?'minmax(0,1fr)':'minmax(0,1.6fr) minmax(280px,1fr)');}
 if(p.includes('account/')){const signout=d.querySelector('#account-signout');assert(signout.classList.contains('secondary'));assert.equal(get(signout).backgroundColor,'transparent');assert.equal(get(d.querySelector('#google-signin')).minHeight,'48px');}
 if(p.includes('wiring-generator/'))assert.equal(get(d.querySelector('#export-svg')).backgroundColor,'transparent');
 if(p.includes('potentiometers-explained/'))assert.equal(get(d.querySelector('.article-layout')).display,width<=800?'block':'grid');
 assert.equal(get(d.querySelector('.footer-links a')).minHeight,'44px');responsive++;await v.happyDOM.close();
}
// Idempotent projection and future static product generation retain the last shared layer.
const sync=execFileSync('python',['scripts/sync-customer-ui.py'],{encoding:'utf8'});assert(sync.includes('0 public shells'));
const product=parse(productPage({id:'fixture',name:'Fixture pot',category:'potentiometers',price:500,stock:2,active:true,individually:true,productSpecifications:[{label:'Resistance',value:'500kΩ'}]},read('dist/products/index.html')));assert(product.body.classList.contains('site-ui'));assert.equal([...product.querySelectorAll('link[rel=stylesheet]')].at(-1).getAttribute('href'),'/customer-ui.css');
const changed=execFileSync('git',['diff','--name-only',base],{encoding:'utf8'}).trim().split('\n');for(const p of changed)assert(!p.startsWith('supabase/')&&!p.startsWith('dist/admin/')&&(!p.endsWith('.mjs')||p==='scripts/generate-knowledge-pages.mjs'||p.startsWith('tests/')),'Presentation-only scope '+p);
await w.happyDOM.close();console.log(JSON.stringify({publicShells:shells,nativeControlContracts:controlCount,responsiveComputedContracts:responsive,contrastPairs:pairs.length,sourceBoundaries:'PASS',businessAndElectricalSources:'UNCHANGED',status:'PASS'}));
