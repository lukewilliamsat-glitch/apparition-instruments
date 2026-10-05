// Constrained content, never arbitrary executable HTML. Source references are
// immutable presentation capsules supplied by the accepted renderer, not authors.
export const escapeHTML=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function contentURL(value){if(typeof value!=='string'||value.length>2000||/[\x00-\x20\\]/.test(value))return null;if(/^\/(?!\/)/.test(value)||/^#[a-zA-Z0-9_-]+$/.test(value))return value;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function canonicalNode(node){const n=JSON.parse(JSON.stringify(node));function clean(x){if(x.attrs){for(const k of Object.keys(x.attrs))if(x.attrs[k]===null||(k==='order'&&x.attrs[k]===1)||(k==='kind'&&x.attrs[k]==='note'))delete x.attrs[k];if(!Object.keys(x.attrs).length)delete x.attrs;}if(x.marks){x.marks.forEach(clean);if(!x.marks.length)delete x.marks;}if(x.content){x.content.forEach(clean);if(!x.content.length)delete x.content;}}clean(n);return n;}
const types=new Set(['doc','text','paragraph','heading','container','protected','protected_inline','bullet_list','ordered_list','list_item','callout','table','table_row','table_cell','table_header','hard_break']);
export function validateBody(doc,refs={}){
 let count=0;const protectedUsed=new Set();
 function walk(node,depth=0){if(++count>10000||depth>40||!node||!types.has(node.type))throw Error('Unsupported or oversized article body.');for(const key of Object.keys(node))if(!['type','attrs','text','content','marks'].includes(key))throw Error('Unexpected content property.');
  const attrs=node.attrs||{};for(const key of Object.keys(attrs))if(!['ref','level','order','kind','colspan','rowspan','colwidth'].includes(key))throw Error('Unsupported content attribute.');
  if(attrs.ref&&!refs[attrs.ref])throw Error('Unknown preserved source reference.');
  if(node.type.startsWith('protected')){if(!attrs.ref||refs[attrs.ref]?.kind!=='protected'||protectedUsed.has(attrs.ref))throw Error('Invalid or repeated protected source block.');protectedUsed.add(attrs.ref);}
  if(node.type==='heading'&&![2,3].includes(attrs.level))throw Error('Only H2 and H3 are supported.');if(attrs.kind&&!['note','warning'].includes(attrs.kind))throw Error('Invalid callout.');if(attrs.order!==undefined&&(!Number.isInteger(attrs.order)||attrs.order<1||attrs.order>1000))throw Error('Invalid ordered list.');
  if(node.type==='text'&&(typeof node.text!=='string'||!node.text.length))throw Error('Invalid text.');if(node.text!==undefined&&node.type!=='text')throw Error('Unexpected text.');
  if(node.content!==undefined&&!Array.isArray(node.content))throw Error('Invalid body children.');
  for(const mark of node.marks||[]){if(!['strong','em','code','link'].includes(mark.type))throw Error('Unsupported formatting.');for(const key of Object.keys(mark))if(!['type','attrs'].includes(key))throw Error('Unexpected formatting property.');const a=mark.attrs||{};for(const key of Object.keys(a))if(!['href','ref'].includes(key))throw Error('Unsupported formatting attribute.');if(a.ref&&!refs[a.ref])throw Error('Unknown mark reference.');if(mark.type==='link'&&!contentURL(a.href))throw Error('Unsafe article link.');}
  for(const child of node.content||[])walk(child,depth+1);
 }
 if(doc?.type!=='doc'||!doc.content?.length)throw Error('An article body is required.');walk(doc);return doc;
}
export function renderBody(doc,presentation,slot='main'){
 const refs=presentation.refs||{};validateBody(doc,refs);const baseline=presentation.slots?.find(s=>s.key===slot);
 if(baseline&&stable(canonicalNode(doc))===stable(canonicalNode(baseline.doc)))return baseline.raw;
 let heading=0;
 function render(node){const ref=refs[node.attrs?.ref],a=node.attrs||{};if(ref?.initial&&stable(canonicalNode(node))===stable(canonicalNode(ref.initial)))return (ref.before||'')+ref.raw;
  if(node.type.startsWith('protected'))return (ref.before||'')+ref.raw;
  if(node.type==='text'){let text=escapeHTML(node.text);for(const mark of [...(node.marks||[])].reverse()){const tag={strong:'strong',em:'em',code:'code',link:'a'}[mark.type];text='<'+tag+(mark.type==='link'?' href="'+escapeHTML(contentURL(mark.attrs.href))+'"':'')+'>'+text+'</'+tag+'>';}return text;}
  if(node.type==='hard_break')return '<br>';
  const tag={paragraph:'p',heading:'h'+a.level,container:'section',bullet_list:'ul',ordered_list:'ol',list_item:'li',table:'table',table_row:'tr',table_cell:'td',table_header:'th',callout:'aside',doc:''}[node.type],content=(node.content||[]).map(render).join('');if(!tag)return content;
  let open=ref?.open??('<'+tag+(node.type==='heading'?' id="cms-heading-'+(++heading)+'"':node.type==='ordered_list'&&a.order?' start="'+a.order+'"':node.type==='callout'?' class="hub-note"':node.type==='table_header'?' scope="col"':'')+'>'),close=ref?.close??'</'+tag+'>';
  const inner=node.type==='callout'&&!ref?'<p><strong>'+(a.kind==='warning'?'Caution':'Technical note')+'</strong></p>'+content:content;
  let result=(ref?.before||'')+open+inner+(ref?.suffix||'')+close;
  if(node.type==='table'&&!ref)result='<div class="'+(presentation.style==='legacy'?'knowledge-table':'hub-table-scroll')+'" role="region" tabindex="0" aria-label="Article table">'+result+'</div>';
  return result;
 }
 return render(doc);
}
