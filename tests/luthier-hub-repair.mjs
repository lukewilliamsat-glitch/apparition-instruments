// Current Hub contract; supersedes the former V4 landing composition checks.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {guides,categories,tools,components,legacyCategories} from '../scripts/luthier-hub/content.mjs';
import {wiringGuides} from '../scripts/luthier-hub/wiring-content.mjs';
import {CSSStyleSheet} from 'happy-dom';
const legacy=JSON.parse(readFileSync('scripts/luthier-hub/legacy.json','utf8'));
const library=[...guides,...wiringGuides,...legacy.map(a=>({...a,category:legacyCategories[a.id]}))];
const paths=['/luthier-hub/',...categories.map(c=>`/luthier-hub/categories/${c.id}/`),...library.map(a=>`/luthier-hub/${a.slug}/`)];
const css=readFileSync('dist/luthier-hub/reference.css','utf8');
const docs=new Map(),titles=new Set(),canonicals=new Set();
const winOptions={settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}};
for(const path of paths){const win=new Window({url:'https://apparitioninstruments.co.uk'+path,...winOptions});win.fetch=()=>{throw Error('Network forbidden');};const html=readFileSync('dist'+path+'index.html','utf8');win.document.write(html);const doc=win.document;docs.set(path,{win,doc,html});
 assert.equal(doc.querySelectorAll('main').length,1,path+' main');assert.equal(doc.querySelectorAll('h1').length,1,path+' h1');assert.equal(doc.querySelectorAll('.site-header').length,1);assert.equal(doc.querySelectorAll('#mobile-nav').length,1);assert.equal(doc.querySelectorAll('footer').length,1);assert(doc.querySelector('.skip[href="#main"]'));assert.equal([...doc.querySelectorAll('script[src]')].filter(n=>n.getAttribute('src').endsWith('site.mjs')).length,1);
 const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length,path+' unique IDs');
 const canonical=doc.querySelector('link[rel=canonical]').href;assert.equal(canonical,'https://apparitioninstruments.co.uk'+path);assert(!canonicals.has(canonical));canonicals.add(canonical);assert(!titles.has(doc.title));titles.add(doc.title);assert(doc.querySelector('meta[name=description]').content.length>=30);assert.equal(doc.querySelector('meta[property="og:url"]').content,canonical);assert(doc.querySelector('meta[name=viewport]'));
 const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];const breadcrumb=graph.find(x=>x['@type']==='BreadcrumbList');assert(breadcrumb);assert.equal(breadcrumb.itemListElement.at(-1).item,canonical);
 const article=library.find(a=>path===`/luthier-hub/${a.slug}/`);if(article){const schema=graph.find(x=>x['@type']==='Article');assert(schema,path+' Article');assert.equal(schema.headline,article.title);assert.equal(schema.articleSection,categories.find(c=>c.id===article.category).title);assert(doc.querySelector('[data-hub-article]'));assert(doc.querySelector('#next-steps')||doc.querySelector('#hub-v1-next-steps'));assert(doc.querySelector('main').textContent.trim().length>300);if([...guides,...wiringGuides].includes(article)){const content=doc.querySelector('[data-hub-addition=content] .hub-article-body')||doc.querySelector('.hub-article-body');assert(content.textContent.trim().split(/\s+/).length>=450,path+' cornerstone depth');if(!['pots','bleeds'].includes(article.id))assert(!doc.querySelector('script[src$="articles.mjs"]'),'New guides static without article client');assert.equal(content.querySelectorAll(':scope>section[id]').length,article.sections.length+(['pots','bleeds'].includes(article.id)?0:1));assert(schema.datePublished||schema.dateModified);}}
 for(const table of doc.querySelectorAll('.hub-reference-surface table')){if([...guides,...wiringGuides].includes(article)){assert(table.querySelector('caption'));assert(table.querySelector('th[scope]'));assert(table.closest('[tabindex="0"]'));}}
}
for(const [path,{doc}] of docs){for(const a of doc.querySelectorAll('main a[href]')){const url=new URL(a.href);if(url.origin!=='https://apparitioninstruments.co.uk'){assert(url.protocol==='https:');continue;}const file='dist'+url.pathname+(url.pathname.endsWith('/')?'index.html':'');assert(existsSync(file),'Missing route '+a.href+' on '+path);if(url.hash){const target=docs.get(url.pathname)?.doc; if(target)assert(target.getElementById(decodeURIComponent(url.hash.slice(1))),'Missing anchor '+a.href+' on '+path);}}}
assert.equal(categories.length,6);assert.equal(guides.length,7);assert.equal(library.length,22);assert.equal(new Set(library.map(a=>a.id)).size,22);for(const a of guides){assert(categories.some(c=>c.id===a.category));assert(a.related.length>=2);for(const id of a.related)assert(library.some(x=>x.id===id)&&id!==a.id);for(const tool of a.tools)assert(tools[tool]);assert(components[a.component]);const category=docs.get(`/luthier-hub/categories/${a.category}/`).doc;assert(category.querySelector(`a[href="/luthier-hub/${a.slug}/"]`));}
const landing=docs.get('/luthier-hub/');assert.equal(landing.doc.querySelectorAll('[data-hub-addition=categories] li').length,6);assert.equal(landing.doc.querySelectorAll('#hub-results [data-search]').length,22);assert.equal(landing.doc.querySelectorAll('script[src$="hub.mjs"]').length,1);
// Exact pre-V1 presentation survives after removing only marked additive content.
for(const slug of ['index',...legacy.map(a=>a.slug),'potentiometers-explained','treble-bleeds']){
 const path=slug==='index'?'/luthier-hub/':`/luthier-hub/${slug}/`;
 const original=new Window({url:'https://apparitioninstruments.co.uk'+path,...winOptions});original.document.write(readFileSync('scripts/luthier-hub/baseline/'+slug+'.html','utf8'));
 const current=docs.get(path).doc.querySelector('main').cloneNode(true),baseline=original.document.querySelector('main').cloneNode(true);
 current.querySelectorAll('[data-hub-addition]').forEach(n=>n.remove());current.removeAttribute('data-hub-article');
 for(const node of [current,baseline])if(node.querySelector('#hub-count'))node.querySelector('#hub-count').textContent='';
 assert.equal(current.outerHTML,baseline.outerHTML,'Existing experience changed: '+slug);
 const scripts=doc=>[...doc.querySelectorAll('script[src]')].map(n=>n.getAttribute('src'));
 assert.deepEqual(scripts(docs.get(path).doc),scripts(original.document),'Bindings changed: '+slug);
 await original.happyDOM.close();
}
// Every V1 selector is contained; every painted surface explicitly pairs its foreground.
const styleWin=new Window(),sheet=new styleWin.CSSStyleSheet();sheet.replaceSync(css);
const flatten=rules=>[...rules].flatMap(r=>!r.selectorText&&r.cssRules?flatten(r.cssRules):[r]);
const rules=flatten(sheet.cssRules);assert(rules.length>50);
const splitSelectors=text=>{let depth=0,start=0,out=[];for(let i=0;i<text.length;i++){if('(['.includes(text[i]))depth++;if(')]'.includes(text[i]))depth--;if(text[i]===','&&!depth){out.push(text.slice(start,i));start=i+1;}}out.push(text.slice(start));return out;};
for(const r of rules){assert(splitSelectors(r.selectorText).every(s=>s.trim().startsWith('.hub-reference-surface')),'Unscoped V1 selector: '+r.selectorText);if(r.style.getPropertyValue('background'))assert(r.style.getPropertyValue('color'),'Surface lacks foreground: '+r.selectorText);}
const contract=rules.find(r=>r.selectorText==='.hub-reference-surface').style;
for(const [token,value] of Object.entries({'--hub-surface':'var(--ui-paper)','--hub-foreground':'var(--ui-paper-ink)','--hub-muted':'var(--ui-paper-muted)','--ui-ink':'var(--hub-foreground)','--ui-muted':'var(--hub-muted)','--ui-panel':'var(--hub-surface)','--ui-field-bg':'var(--hub-surface)','--ui-field-ink':'var(--hub-foreground)','--ink':'var(--hub-foreground)','--technical':'var(--hub-muted)'}))assert.equal(contract.getPropertyValue(token).trim(),value,token);
const shell=readFileSync('dist/customer-ui.css','utf8');const tokenHex=name=>shell.match(new RegExp(name+':(#[a-f0-9]{6})'))[1];
const luminance=hex=>{const c=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const foreground of [tokenHex('--ui-paper-ink'),tokenHex('--ui-paper-muted'),'#715722'])assert(contrast(tokenHex('--ui-paper'),foreground)>=4.5,'Editorial contrast pair');
styleWin.document.body.innerHTML='<main class="page-main article-copy"><h1>Protected surface</h1><p><strong>Text</strong><a href="/">Link</a></p><input><table><tr><td>Value</td></tr></table></main>';
for(const r of rules)assert.equal(styleWin.document.querySelector(r.selectorText),null,'V1 selector matches unscoped customer surface');
await styleWin.happyDOM.close();
for(const token of ['max-width:1024px','max-width:768px','max-width:390px','minmax(0,1fr)','calc(100% - 32px)','focus-visible','48px','prefers-reduced-motion','overflow-x','overflow-wrap'])assert(css.replace(/:\s+/g,':').replace(/,\s+/g,',').includes(token),token);
for(const id of ['pots','lugs']){const doc=docs.get('/luthier-hub/'+guides.find(g=>g.id===id).slug+'/').doc;const text=(doc.querySelector('[data-hub-addition=content]')||doc.querySelector('main')).textContent;assert(text.includes('pickup/selector → volume lug 3 → wiper/lug 2 → output jack TIP'));assert(text.includes('sleeve'));assert(text.includes('Lug 1')&&text.includes('Ground'));}
const sitemap=readFileSync('dist/sitemap.xml','utf8');for(const path of paths)assert(sitemap.includes('<loc>https://apparitioninstruments.co.uk'+path+'</loc>'));
// SEO refresh must retain generator-owned Article/Breadcrumb schema, and discover new routes.
const temp=mkdtempSync(join(tmpdir(),'hub-seo-'));try{for(const [path,{html}] of docs){const folder=join(temp,path.slice(1));mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'index.html'),html);}const program=`import importlib.util, pathlib\nspec=importlib.util.spec_from_file_location('seo','scripts/generate-seo.py')\nseo=importlib.util.module_from_spec(spec);spec.loader.exec_module(seo)\nseo.ROOT=pathlib.Path(${JSON.stringify(temp)})\nseo.main()\n`;const result=spawnSync('python',['-c',program],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);for(const [path,{html}] of docs)assert.equal(readFileSync(join(temp,path.slice(1),'index.html'),'utf8'),html,'SEO preserves Hub metadata '+path);const generated=readFileSync(join(temp,'sitemap.xml'),'utf8');for(const path of paths)assert(generated.includes('https://apparitioninstruments.co.uk'+path));}finally{rmSync(temp,{recursive:true,force:true});}
for(const {win} of docs.values())await win.happyDOM.close();
console.log('Hub repair PASS: exact baseline presentation/bindings preserved; scoped paired colour tokens and contrast;  29 routes, 22 shared articles, seven substantial cornerstones, six categories, relations, links/anchors, no-JS reading, search, shell/semantic/responsive contracts, Article/Breadcrumb metadata and shared SEO sitemap preservation.');
