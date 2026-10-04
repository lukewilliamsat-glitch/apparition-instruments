import {esc,safeHref,newsCategories,ukDate} from './model.mjs';
// Constrained Markdown-like text, never arbitrary author HTML. No inline styles,
// images, code execution, embeds or untrusted HTML nodes are accepted.
function inline(text){
 const pattern=/\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;let html='',end=0;
 for(const m of text.matchAll(pattern)){html+=esc(text.slice(end,m.index));if(m[1]!==undefined){const href=safeHref(m[2]);html+=href?`<a href="${esc(href)}" rel="noopener noreferrer">${esc(m[1])}</a>`:esc(m[1]);}else html+=m[3]!==undefined?'<strong>'+esc(m[3])+'</strong>':'<em>'+esc(m[4])+'</em>';end=m.index+m[0].length;}return html+esc(text.slice(end));
}
export function renderNewsBody(source){
 const result=[];let paragraph=[],list=null;const flush=()=>{if(paragraph.length){result.push('<p>'+inline(paragraph.join(' '))+'</p>');paragraph=[];}if(list){result.push(`<${list.kind}>${list.lines.map(s=>'<li>'+inline(s)+'</li>').join('')}</${list.kind}>`);list=null;}};
 for(const line of String(source??'').split(/\r?\n/)){const heading=/^(#{1,3})\s+(.+)$/.exec(line),item=/^\s*(?:([-*])|\d+\.)\s+(.+)$/.exec(line);if(!line.trim()){flush();continue;}if(heading){flush();result.push(`<h${heading[1].length+1}>${inline(heading[2])}</h${heading[1].length+1}>`);}else if(item){const kind=item[1]?'ul':'ol';if(paragraph.length||list&&list.kind!==kind)flush();list||={kind,lines:[]};list.lines.push(item[2]);}else{if(list)flush();paragraph.push(line);}}flush();return result.join('');
}
export const articleURL=post=>'/news/'+post.slug+'/';
export function newsCards(posts){return posts.map(p=>`<article class="news-card"><p class="eyebrow">${esc(newsCategories[p.category]||'News')} · <time datetime="${esc(p.publication_at)}">${esc(ukDate(p.publication_at))}</time></p><h2><a href="${articleURL(p)}">${esc(p.title)}</a></h2><p>${esc(p.excerpt)}</p><a class="text-link" href="${articleURL(p)}">Read update →</a></article>`).join('');}
