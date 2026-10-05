// Public static delivery uses only curated RPCs. Never fetch private authoring rows.
import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';
import {publicBackendConfig} from '../dist/backend/public-config.mjs';
import {esc,safeHref,newsCategories,ukDate,effectiveStore} from '../dist/operations/model.mjs';
import {renderNewsBody,newsCards,articleURL} from '../dist/operations/news-render.mjs';
const origin='https://apparitioninstruments.co.uk',dist=fileURLToPath(new URL('../dist/',import.meta.url));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
export function publicPosts(posts,now=Date.now()){
 const slugs=new Set();return posts.filter(p=>Date.parse(p.publication_at)<=now&&(p.status===undefined||['PUBLISHED','SCHEDULED'].includes(p.status))).map(p=>{if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)||p.slug.length>100||slugs.has(p.slug)||!newsCategories[p.category])throw Error('Invalid public News projection');slugs.add(p.slug);
 // Allowlist is a second boundary: no audit, private reason or author identities.
 return Object.fromEntries(['id','slug','title','excerpt','body','category','publication_at','expires_at','cta_label','cta_url','announcement','priority','dismissible','updated_at'].map(k=>[k,p[k]??null]));}).sort((a,b)=>Date.parse(b.publication_at)-Date.parse(a.publication_at)||a.slug.localeCompare(b.slug));
}
export function newsPage(shell,post=null,posts=[]){
 const win=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});win.document.write(shell);const d=win.document,title=post?post.title+' | Apparition News':'News | Apparition Instruments',description=post?post.excerpt.slice(0,160):'News and updates from Apparition Instruments: products, practical guitar electronics tools and workshop information.',url=origin+(post?articleURL(post):'/news/');
 d.title=title;d.querySelector('meta[name=description]').content=description;d.querySelector('link[rel=canonical]').href=url;d.querySelectorAll('script[type="application/ld+json"],meta[property^="og:"],meta[name^="twitter:"]').forEach(n=>n.remove());
 for(const [property,content] of Object.entries({'og:type':post?'article':'website','og:site_name':'Apparition Instruments','og:title':title,'og:description':description,'og:url':url,...post?{'article:published_time':post.publication_at,'article:modified_time':post.updated_at}:{}})){const m=d.createElement('meta');m.setAttribute('property',property);m.content=content;d.head.append(m);}const twitter=d.createElement('meta');twitter.name='twitter:card';twitter.content='summary';d.head.append(twitter);
 for(const n of d.querySelectorAll('[href],[src]'))for(const attribute of ['href','src']){const value=n.getAttribute(attribute);if(value?.startsWith('../')||value?.startsWith('./'))n.setAttribute(attribute,new URL(value,origin+'/news/').pathname);}
 d.body.className='editorial-page site-ui ui-editorial';
 const main=d.querySelector('main');main.id='main';main.className='news-main';
 if(post){const cta=safeHref(post.cta_url);main.innerHTML=`<article class="news-article"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/news/">News</a></nav><header><p class="eyebrow">${esc(newsCategories[post.category])}</p><h1>${esc(post.title)}</h1><p>${esc(post.excerpt)}</p><p><time datetime="${esc(post.publication_at)}">${esc(ukDate(post.publication_at))} UK</time></p></header><div class="news-body">${renderNewsBody(post.body)}</div>${cta?`<p><a class="text-link" href="${esc(cta)}">${esc(post.cta_label)}</a></p>`:''}<p><a href="/news/">All News →</a></p></article>`;
  const structured=d.createElement('script');structured.type='application/ld+json';structured.textContent=json({'@context':'https://schema.org','@type':'NewsArticle',isPartOf:{'@id':origin+'/news/#webpage'},headline:post.title,description:post.excerpt,datePublished:post.publication_at,dateModified:post.updated_at,mainEntityOfPage:url,url,publisher:{'@type':'Organization',name:'Apparition Instruments',url:origin}});d.head.append(structured);
 }else{const structured=d.createElement('script');structured.type='application/ld+json';structured.textContent=json({'@context':'https://schema.org','@graph':[{'@type':'CollectionPage','@id':origin+'/news/#webpage',url,name:title,description,hasPart:posts.map(p=>({'@type':'NewsArticle',headline:p.title,url:origin+articleURL(p),datePublished:p.publication_at}))}]});d.head.append(structured);main.innerHTML=`<p class="eyebrow">APPARITION / NEWS</p><h1>News &amp; updates</h1><p>Product, tool and workshop updates from Apparition Instruments.</p>${posts.length?'<div class="news-grid">'+newsCards(posts)+'</div>':'<p>No published updates yet.</p>'}`;}
 const shared=d.querySelector('link[href="/customer-ui.css"]');if(shared)d.head.append(shared);
 const result='<!doctype html>\n'+d.documentElement.outerHTML;win.close();return result;
}
export async function generateOperations({store,posts,root=dist,now=Date.now()}){
 effectiveStore(store,now);const news=publicPosts(posts,now),shell=await readFile(join(root,'news/index.html'),'utf8'),folder=join(root,'news');
 for(const e of await readdir(folder,{withFileTypes:true}))if(e.isDirectory())await rm(join(folder,e.name),{recursive:true,force:true});
 await writeFile(join(folder,'index.html'),newsPage(shell,null,news));for(const p of news){const dir=join(folder,p.slug);await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),newsPage(shell,p));}
 const publicStore=Object.fromEntries(['desired_state','state','customer_title','customer_message','pause_from','resume_at','updated_at'].map(k=>[k,store[k]??null]));await mkdir(join(root,'operations'),{recursive:true});await writeFile(join(root,'operations/snapshot.json'),JSON.stringify({store:publicStore,news},null,2)+'\n');
 let map=await readFile(join(root,'sitemap.xml'),'utf8');map=map.replace(/<url>\s*<loc>https:\/\/apparitioninstruments\.co\.uk\/news\/[^<]*<\/loc>[\s\S]*?<\/url>/g,'');await writeFile(join(root,'sitemap.xml'),map.replace('</urlset>',['/news/',...news.map(articleURL)].map(path=>'<url><loc>'+esc(origin+path)+'</loc></url>').join('')+'</urlset>'));return news;
}
async function rpc(name){const r=await fetch(publicBackendConfig.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:publicBackendConfig.publishableKey,'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('Public Operations generation unavailable ('+name+')');return r.json();}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const [config,posts]=await Promise.all([rpc('get_site_operations'),rpc('public_news')]);const news=await generateOperations({store:config?.store,posts});console.log('Generated '+news.length+' effective public News articles.');}catch(error){console.error(error);process.exitCode=1;}}
