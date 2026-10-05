import {parse} from 'parse5';import {canonicalNode} from '../../dist/hub-cms/body.mjs';
export const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
export const hasClass=(n,c)=>(attr(n,'class')||'').split(/\s+/).includes(c);
export function walkTree(node,fn){fn(node);for(const child of node.childNodes||[])walkTree(child,fn);}
export const textOf=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(textOf).join('');
export function capturePresentation(html){
 const root=parse(html,{sourceCodeLocationInfo:true}),nodes=[];walkTree(root,n=>nodes.push(n));const refs={},slots=[];let serial=0;
 const refFor=(n,kind='node')=>{const key='r'+(++serial),l=n.sourceCodeLocation;if(!l)throw Error('Source location missing '+n.nodeName);refs[key]={kind,raw:html.slice(l.startOffset,l.endOffset),open:l.startTag?html.slice(l.startOffset,l.startTag.endOffset):'',close:l.endTag?html.slice(l.endTag.startOffset,l.endOffset):'',suffix:''};return key;};
 const inline=(children,marks=[])=>children.flatMap(n=>{if(n.nodeName==='#text')return n.value?[{type:'text',text:n.value,...marks.length?{marks}:{}}]:[];if(n.tagName==='br')return[{type:'hard_break'}];const type={strong:'strong',b:'strong',em:'em',i:'em',code:'code',a:'link'}[n.tagName];if(type)return inline(n.childNodes,[...marks,{type,...type==='link'?{attrs:{href:attr(n,'href')}}:{}}]);const ref=refFor(n,'protected');return[{type:'protected_inline',attrs:{ref}}];});
 function blocks(children,parentStart){const result=[];let pending=[],last=parentStart;function flush(){if(!pending.some(n=>n.nodeName!=='#text'||n.value.trim())){pending=[];return;}const from=pending[0].sourceCodeLocation.startOffset,to=pending.at(-1).sourceCodeLocation.endOffset,ref='r'+(++serial),content=inline(pending);refs[ref]={kind:'node',raw:html.slice(from,to),open:'',close:'',suffix:'',before:html.slice(last,from)};const node={type:'paragraph',attrs:{ref},content};refs[ref].initial=canonicalNode(node);result.push(node);last=to;pending=[];}
  for(const n of children){if(!n.sourceCodeLocation)continue;const tag=n.tagName;if(n.nodeName==='#text'||['a','strong','em','b','i','span','code','br'].includes(tag)){pending.push(n);continue;}flush();const ref=refFor(n),l=n.sourceCodeLocation;refs[ref].before=html.slice(last,l.startOffset);let node;
   if(['p','h2','h3'].includes(tag))node={type:tag==='p'?'paragraph':'heading',attrs:{ref,...tag!=='p'?{level:Number(tag[1])}:{}},content:inline(n.childNodes)};
   else if(['ul','ol','li'].includes(tag))node={type:{ul:'bullet_list',ol:'ordered_list',li:'list_item'}[tag],attrs:{ref,...tag==='ol'?{order:Number(attr(n,'start')||1)}:{}},content:blocks(n.childNodes,l.startTag.endOffset)};
   else if(['section','div','aside'].includes(tag)&&!attr(n,'data-knowledge-context')&&!hasClass(n,'article-actions')&&!hasClass(n,'technical-figure')&&!hasClass(n,'knowledge-next'))node={type:'container',attrs:{ref},content:blocks(n.childNodes,l.startTag.endOffset)};
   else {refs[ref].kind='protected';node={type:'protected',attrs:{ref}};}
   if(node.content&&!node.content.length){refs[ref].kind='protected';node={type:'protected',attrs:{ref}};}
   if(node.content){const lastChild=n.childNodes.filter(c=>c.sourceCodeLocation).at(-1);refs[ref].suffix=lastChild&&l.endTag?html.slice(lastChild.sourceCodeLocation.endOffset,l.endTag.startOffset):'';}
   refs[ref].initial=canonicalNode(node);result.push(node);last=l.endOffset;
  }flush();return result;
 }
 const containers=nodes.filter(n=>(n.tagName==='article'&&hasClass(n,'article-copy'))||(hasClass(n,'hub-article-body')&&(hasClass(n,'article-copy')||hasClass(n.parentNode,'hub-reference-supplement')&&attr(n.parentNode,'data-hub-addition')==='content')));
 for(const n of containers){const children=n.childNodes.filter(c=>c.sourceCodeLocation&&!(c.nodeName==='#text'&&!c.value.trim()));const editable=children.filter(c=>attr(c,'id')!=='next-steps'&&!hasClass(c,'hub-further'));if(!editable.length)continue;const start=editable[0].sourceCodeLocation.startOffset,end=editable.at(-1).sourceCodeLocation.endOffset,key=slots.length?'further':'main';const doc=canonicalNode({type:'doc',content:blocks(n.childNodes.filter(c=>c.sourceCodeLocation&&c.sourceCodeLocation.startOffset>=start&&c.sourceCodeLocation.endOffset<=end),start)});slots.push({key,start,end,raw:html.slice(start,end),doc});}
 if(!slots.length)throw Error('No article body source slots');
 const h1=nodes.find(n=>n.tagName==='h1'),deck=nodes.find(n=>hasClass(n,'hub-deck'))||nodes.find(n=>n.tagName==='p'&&hasClass(n.parentNode,'page-intro')&&!hasClass(n,'eyebrow'));
 const field=n=>n?{start:n.sourceCodeLocation.startTag.endOffset,end:n.sourceCodeLocation.endTag.startOffset,text:textOf(n)}:null;
 const relation=nodes.find(n=>['next-steps','hub-v1-next-steps'].includes(attr(n,'id')));
 return {version:1,style:containers[0].tagName==='article'?'legacy':'shared',html,refs,slots,fields:{title:field(h1),intro:field(deck)},relation:relation?{start:relation.sourceCodeLocation.startOffset,end:relation.sourceCodeLocation.endOffset,id:attr(relation,'id')}:null};
}
