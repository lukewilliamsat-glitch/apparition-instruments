import {decimal,decimalText} from './economics.mjs';
import {defaultConsumables} from './eclipse-model.mjs';
const kinds=[['component','Small component order'],['potentiometer','Potentiometer order'],['kit','Wiring kit order'],['other','Other']];
const key=()=> 'item-'+crypto.randomUUID().slice(0,18);
export function mountEclipseSettings({root,repository,document:d=globalThis.document}){
 const make=(tag,t,cls)=>{const n=d.createElement(tag);if(t!=null)n.textContent=t;if(cls)n.className=cls;return n;};
 const panel=make('details',null,'eclipse-finance'),msg=make('p','Open to load the current private library.'),body=make('div');
 panel.append(make('summary','Fulfilment Cost Library'),make('p','Saved costs are defaults for future estimates. They never change a saved order snapshot.'),msg,body);
 msg.setAttribute('role','status');root.append(panel);
 let current=null,draft=null,busy=false,closed=false;
 const button=(parent,label,act)=>{const n=make('button',label,'button');n.type='button';n.addEventListener('click',act);parent.append(n);return n;};
 function field(container,label,v,cb,type='text',options=[]){
  const l=make('label',label,'eclipse-field'),n=make(type==='select'?'select':'input');
  if(type==='select'){for(const [value,text] of options){const o=make('option',text);o.value=value;n.append(o);}n.value=v;}
  else {n.type=type;if(type==='checkbox')n.checked=v;else{n.value=v??'';n.maxLength=60;if(type==='number'){n.min='1';n.max='99';n.step='1';}}}
  n.addEventListener(type==='select'||type==='checkbox'?'change':'input',()=>cb(type==='checkbox'?n.checked:n.value));
  l.append(n);container.append(l);return n;
 }
 function paint(){
  if(closed)return;body.replaceChildren();
  if(!draft){if(!busy)button(body,'Load library',()=>load());return;}
  const items=make('fieldset'),presets=make('fieldset');items.append(make('legend','Cost items'));presets.append(make('legend','Packaging presets'));body.append(items,presets);
  const row=(parent)=>{const a=make('div',null,'eclipse-grid');parent.append(a);return a;};
  for(const i of draft.items){
   const a=row(items);field(a,'Consumable name',i.name,x=>{i.name=x;});
   field(a,'Unit cost (£)',i.amount,x=>{i.amount=x;}).inputMode='decimal';
   field(a,'Default quantity',i.quantity,x=>{i.quantity=x;},'number');
   field(a,'Active',i.active,x=>{i.active=x;},'checkbox');
   button(a,'Remove item',()=>{if(draft.presets.some(p=>p.items.some(x=>x.itemId===i.id))){msg.textContent='Remove this item from its presets first.';return;}draft.items=draft.items.filter(x=>x!==i);paint();});
  }
  button(items,'Add consumable',()=>{if(draft.items.length<32){draft.items.push({id:key(),name:'',amount:'',quantity:1,active:true});paint();}});
  button(items,'Add suggested labels',()=>{for(const i of defaultConsumables)if(draft.items.length<32&&!draft.items.some(x=>x.id===i.id))draft.items.push({...i,amount:''});paint();msg.textContent='Enter your own evidenced unit costs or remove unused labels before saving.';});
  for(const p of draft.presets){
   const a=row(presets);field(a,'Preset name',p.name,x=>{p.name=x;});
   field(a,'Suggest for',p.kind,x=>{p.kind=x;},'select',kinds);
   field(a,'Active preset',p.active,x=>{p.active=x;},'checkbox');
   button(a,'Remove preset',()=>{draft.presets=draft.presets.filter(x=>x!==p);paint();});
   for(const i of p.items){const b=row(presets);field(b,'Consumable',i.itemId,x=>{i.itemId=x;},'select',draft.items.map(x=>[x.id,x.name||'Unnamed consumable']));field(b,'Preset quantity',i.quantity,x=>{i.quantity=x;},'number');button(b,'Remove from preset',()=>{p.items=p.items.filter(x=>x!==i);paint();});}
   if(draft.items.length)button(presets,'Add preset item',()=>{const i=draft.items.find(x=>x.active&&!p.items.some(y=>y.itemId===x.id));if(i&&p.items.length<12){p.items.push({itemId:i.id,quantity:i.quantity});paint();}});
  }
  button(presets,'Add preset',()=>{if(draft.presets.length<12){draft.presets.push({id:key(),name:'',kind:'component',active:true,items:[]});paint();}});
  button(body,'Save fulfilment library',save);
  button(body,'Discard edits and reload',()=>load());
  if(busy)for(const c of body.querySelectorAll('input,select,button'))c.disabled=true;
 }
 function set(value){
  current=value;draft={items:value.items.map(({unitMinor,...i})=>({...i,amount:decimalText(unitMinor,2)})),presets:structuredClone(value.presets)};
  msg.textContent='Saved library revision '+current.revision+'.';
 }
 const qty=v=>{if(!/^\d{1,2}$/.test(String(v))||Number(v)<1)throw Error('Use whole quantities from 1 to 99.');return Number(v);};
 async function load(){
  if(busy||closed)return;busy=true;msg.textContent='Loading private settings…';paint();
  try{const value=await repository.read();if(!closed)set(value);}
  catch(e){if(!closed)msg.textContent=e.message;}finally{busy=false;paint();}
 }
 async function save(){
  if(busy||closed)return;let items,presets;
  try{
   items=draft.items.map(({amount,...i})=>{if(!i.name.trim()||!String(amount).trim())throw Error('Each consumable requires a name and explicit unit cost.');const unitMinor=decimal(amount,2);if(unitMinor>99999)throw Error('A unit cost cannot exceed £999.99.');return {...i,name:i.name.trim(),quantity:qty(i.quantity),unitMinor};});
   presets=draft.presets.map(p=>{if(!p.name.trim()||!p.items.length)throw Error('Each preset requires a name and at least one consumable.');return {...p,name:p.name.trim(),items:p.items.map(i=>({...i,quantity:qty(i.quantity)}))};});
  }catch(e){msg.textContent=e.message;return;}
  busy=true;msg.textContent='Saving fulfilment library…';paint();
  try{const value=await repository.save(current.revision,items,presets);if(!closed)set(value);}
  catch(e){if(!closed)msg.textContent=e.message;}finally{busy=false;paint();}
 }
 panel.addEventListener('toggle',()=>{if(panel.open&&!current&&!busy)void load();});
 return {panel,dispose(){closed=true;panel.remove();}};
}
