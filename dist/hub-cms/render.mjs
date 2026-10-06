import {cmsConfig} from './config.mjs';import {escapeHTML as esc,stable,canonicalNode,validateBody,renderBody,contentURL} from './body.mjs';
import {appendForgeJourney} from '../knowledge/forge-journey.mjs';
const fields=['version','title','slug','category','intro','seo_title','meta_description','indexable','primary_intent','related','tools','components','published_at','content_updated_at','body'];
export function validateArticle(content,presentation,{publishing=false,knownGuides=cmsConfig.guideKeys}={}){
 if(!content||typeof content!=='object')throw Error('Article content is required.');for(const key of Object.keys(content))if(!fields.includes(key))throw Error('Unsupported article field.');
 for(const name of ['title','slug','intro','seo_title','meta_description'])if(typeof content[name]!=='string'||content[name].length>({slug:100,title:200,seo_title:200,intro:1000,meta_description:600}[name]))throw Error('Invalid '+name+'.');
 if(content.slug&&!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(content.slug)||['categories','index','hub-cms','search','admin','news'].includes(content.slug))throw Error('Invalid or reserved slug.');
 if(!cmsConfig.categories.some(c=>c.id===content.category)||typeof content.indexable!=='boolean')throw Error('Choose a valid category and indexability.');
 if(content.primary_intent!==(presentation.baseline?.primary_intent||null))throw Error('Discovery V2 primary nominations are preserved; supporting articles cannot claim another primary intent.');
 for(const [key,allowed] of [['related',knownGuides],['tools',Object.keys(cmsConfig.tools)],['components',Object.keys(cmsConfig.components)]])if(!Array.isArray(content[key])||content[key].length>30||new Set(content[key]).size!==content[key].length||content[key].some(x=>!allowed.includes(x)))throw Error('Invalid '+key+' relationships.');
 const slots=content.body?.slots;if(content.body?.version!==1||!slots||Object.keys(slots).sort().join()!==presentation.slots.map(s=>s.key).sort().join())throw Error('Article body slots do not match its preserved presentation.');
 for(const doc of Object.values(slots))validateBody(doc,presentation.refs);
 for(const key of ['published_at','content_updated_at'])if(content[key]!==null&&!Number.isFinite(Date.parse(content[key])))throw Error('Invalid article date.');
 if(publishing&&(!content.title.trim()||!content.slug||!content.intro.trim()||!content.seo_title.trim()||!content.meta_description.trim()))throw Error('Complete title, slug, introduction and SEO fields before publishing.');
 return content;
}
const link=(text,url)=>'<a href="'+esc(url)+'">'+esc(text)+'</a>';
export function renderRelationships(a,registry,id='next-steps'){
 const c=cmsConfig.categories.find(c=>c.id===a.category),related=a.related.map(key=>registry.find(r=>r.guide_key===key)).filter(Boolean);
 return `<section id="${id}" class="hub-next"><h2>Understand. Experiment. Build.</h2><div class="hub-next-grid"><div><h3>Continue reading</h3><ul>${related.map(r=>'<li>'+link(r.content.title,'/luthier-hub/'+r.content.slug+'/')+'</li>').join('')}</ul>${link('All '+c.title+' guides','/luthier-hub/categories/'+c.id+'/')}</div><div><h3>Explore with a tool</h3>${a.tools.map(key=>{const t=cmsConfig.tools[key];return '<p>'+link(t.title,t.path)+'<br>'+esc(t.text)+'</p>';}).join('')}</div>${a.components.filter(key=>cmsConfig.components[key]).map(key=>{const c=cmsConfig.components[key];return '<div><h3>When you are ready to build</h3><p>Check measured values, tolerance and physical fit against your intended circuit.</p>'+link('Explore '+c.title,c.path)+'</div>';}).join('')}</div></section>`;
}
export function renderArticle(content,presentation,registry,{preview=false}={}){
 validateArticle(content,presentation,{publishing:!preview,knownGuides:registry.map(r=>r.guide_key)});
 const baseline=presentation.baseline,isGeneric=presentation.template_key==='generic';if(!isGeneric&&stable(content)===stable(baseline)&&!preview)return appendForgeJourney(presentation.html,registry.find(r=>r.content===content||r.content.slug===content.slug)?.guide_key);
 const replacements=[];for(const slot of presentation.slots)replacements.push({...slot,value:renderBody(content.body.slots[slot.key],presentation,slot.key)});
 for(const name of ['title','intro']){const field=presentation.fields[name];if(field&&(isGeneric||content[name]!==baseline[name]))replacements.push({...field,value:esc(content[name])});}
 if(presentation.relation&&(isGeneric||stable([content.related,content.tools,content.components,content.category])!==stable([baseline.related,baseline.tools,baseline.components,baseline.category])))replacements.push({...presentation.relation,value:renderRelationships(content,registry,presentation.relation.id)});
 let html=presentation.html;for(const r of replacements.sort((a,b)=>b.start-a.start))html=html.slice(0,r.start)+r.value+html.slice(r.end);
 const url=cmsConfig.base+'/luthier-hub/'+content.slug+'/',category=cmsConfig.categories.find(c=>c.id===content.category),title=content.seo_title+' | Apparition Instruments';
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+esc(title)+'</title>').replace(/(<meta name="description" content=")[^"]*(">)/,'$1'+esc(content.meta_description)+'$2').replace(/(<link rel="canonical" href=")[^"]*(">)/,'$1'+url+'$2');
 for(const [property,value] of [['og:title',title],['og:description',content.meta_description],['og:url',url]])html=html.replace(new RegExp('(<meta property="'+property+'" content=")[^"]*(">)'),(_,a,b)=>a+esc(value)+b);
 html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,raw)=>{const graph=JSON.parse(raw),article=graph['@graph'].find(n=>n['@type']==='Article');Object.assign(article,{'@id':url+'#article',url,headline:content.title,name:content.title,description:content.meta_description,mainEntityOfPage:url,articleSection:category.title});for(const [field,key] of [['published_at','datePublished'],['content_updated_at','dateModified']]){if(content[field])article[key]=content[field];else delete article[key];}const crumbs=graph['@graph'].find(n=>n['@type']==='BreadcrumbList');crumbs.itemListElement.at(-1).name=content.title;crumbs.itemListElement.at(-1).item=url;crumbs.itemListElement.at(-2).name=category.title;crumbs.itemListElement.at(-2).item=cmsConfig.base+'/luthier-hub/categories/'+category.id+'/';return '<script type="application/ld+json">'+JSON.stringify(graph).replaceAll('<','\\u003c')+'</script>';});
 if(isGeneric){
  const crumb=`<nav class="hub-breadcrumbs" aria-label="Breadcrumb"><ol><li>${link('Home','/')}</li><li>${link('Luthier Hub','/luthier-hub/')}</li><li>${link(category.title,'/luthier-hub/categories/'+category.id+'/')}</li><li><span aria-current="page">${esc(content.title)}</span></li></ol></nav>`;
  html=html.replace(/<nav class="hub-breadcrumbs"[\s\S]*?<\/nav>/,crumb).replace(/<p class="hub-label">[\s\S]*?<\/p>/,'<p class="hub-label">'+link(category.title,'/luthier-hub/categories/'+category.id+'/')+' / Technical reference</p>').replace(/data-hub-article="[^"]*"/,'data-hub-article="cms"').replace(/<p class="hub-date">[\s\S]*?<\/p>/,content.published_at?'<p class="hub-date">Published <time datetime="'+esc(content.published_at)+'">'+esc(content.published_at.slice(0,10))+'</time></p>':'');
  const headings=[];let heading=0;function contents(node){if(node.type==='heading'){heading++;headings.push('<li>'+link((node.content||[]).map(n=>n.text||'').join(''),'#cms-heading-'+heading)+'</li>');}for(const child of node.content||[])contents(child);}contents(content.body.slots.main);
  html=html.replace(/(<aside class="hub-contents">[\s\S]*?<ol>)[\s\S]*?(<\/ol>)/,'$1'+headings.join('')+'<li><a href="#next-steps">Next steps</a></li>$2');
 }
 if(preview){html=html.replace(/<meta name="robots"[^>]*>/g,'').replace(/<link rel="canonical"[^>]*>/g,'').replace('</head>','<meta name="robots" content="noindex,nofollow"><base href="'+url+'"></head>');}
 else if(!content.indexable)html=html.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
 return appendForgeJourney(html,registry.find(r=>r.content===content||r.content.slug===content.slug)?.guide_key);
}
