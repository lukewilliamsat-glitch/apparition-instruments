import {commerce67Activation} from './commerce67-activation.mjs';
import {commerce67Client,suggestMatchedSet} from './commerce67-client.mjs';
import {moneyInput} from './offers.mjs';
import {categories} from '../admin/data.mjs';

export function mountCommerce67({document:d,client,root=d.querySelector('[data-commerce67]')}){
 if(!root)return null;
 let disposed=false,busy=false,editing=null,workspace={rules:[],units:[],sets:[]};
 const el=(tag,text)=>{const n=d.createElement(tag);if(text!=null)n.textContent=text;return n;};
 const label=(form,text,name,tag='input',type='text')=>{const l=el('label',text+' '),n=el(tag);n.name=name;if(tag==='input')n.type=type;l.append(n);form.append(l);return n;};
 const select=(parent,text,name,options,multiple=false)=>{const field=label(parent,text,name,'select');field.multiple=multiple;for(const [v,t] of options){const o=el('option',t);o.value=v;field.append(o);}return field;};
 const btn=(p,text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);p.append(b);return b;};
 const submit=(form,text)=>{const b=el('button',text);b.type='submit';form.append(b);return b;};
 const row=(title,note)=>{const section=el('section');section.className='offer-panel';section.append(el('h3',title),el('p',note));root.append(section);return section;};
 const grid=()=>{const form=el('form');form.className='offer-grid';return form;};
 const status=el('p');status.setAttribute('role','status');
 root.hidden=false;root.replaceChildren(el('h2','Commerce configuration'),status);
 btn(root,'Load saved commerce configuration',()=>run(refresh,'Saved configuration loaded.'));
 const config=row('Saved rules','Use exact component or variant IDs from catalogue references. Start a draft before scheduling or activating it.');
 const saved=el('div');config.append(saved);
 const form=grid();config.append(form);
 const kind=select(form,'Definition type','kind',[['offer','Offer'],['bundle','Bundle'],['addon','Add-on']]);
 const name=label(form,'Name','name');name.required=true;name.maxLength=120;
 const desc=label(form,'Customer description','description','textarea');desc.maxLength=600;
 const state=select(form,'Lifecycle','state',['draft','scheduled','active','paused','archived'].map(s=>[s,s]));
 const start=label(form,'Start UTC (optional)','start','input','datetime-local'),end=label(form,'End UTC (optional)','end','input','datetime-local');
 const code=label(form,'Promotional code','code');code.maxLength=32;
 const priority=label(form,'Priority','priority','input','number');priority.value='0';priority.min='0';priority.max='999';
 const all=label(form,'All eligible components','all','input','checkbox');
 const products=label(form,'Eligible product or variant IDs (comma-separated)','products');
 const cats=select(form,'Eligible categories','categories',Object.entries(categories),true);
 const exclude=label(form,'Excluded component IDs (comma-separated)','exclude');
 const tiers=label(form,'Quantity lines: minimum, percent / fixed / package, amount','tiers','textarea');
 tiers.placeholder='2,percent,10\n4,package,12.00';
 const stacking=select(form,'Combination','stacking',[['exclusive','Exclusive'],['stackable','Stackable']]);
 const parts=label(form,'Constituent lines: component ID, quantity','parts','textarea');parts.placeholder='component-id,2';
 const pricing=select(form,'Bundle price basis','pricing',[['fixed','Fixed price'],['discount','Saving from component prices']]);
 const price=label(form,'Bundle or add-on price (GBP)','price');
 const instructions=label(form,'Add-on fulfilment instructions','instructions','textarea');instructions.maxLength=500;
 submit(form,'Save configuration');btn(form,'Clear editor',()=>edit(null));
 const pricingNote=el('p','The existing draft studio below can still compare offers without saving. Authoritative totals are calculated when the basket is quoted.');
 config.append(pricingNote);
 const measurement=row('Measured CTS units','Record one physical unit at a time. Use the generated identity to label the part. Recording a measurement allocates that unit outside ordinary unmeasured stock.');
 const m=grid(),component=label(m,'Exact CTS component ID','component'),resistance=label(m,'Measured resistance (kΩ)','resistance');resistance.inputMode='decimal';
 submit(m,'Record measurement');measurement.append(m);
 const matching=row('Precision-matched sets','Select two or four unallocated units from one exact component variant. Tolerance is the full spread relative to the lowest measurement.');
 const f=grid(),variant=label(f,'Exact component ID for assisted matching','variant');
 const size=select(f,'Set size for assisted matching','size',[['2','Pair'],['4','Set of four']]);
 const tolerance=label(f,'Maximum full spread (%)','tolerance');tolerance.value='1.00';
 const setPrice=label(f,'Set price (GBP)','price');
 const selection=select(f,'Unallocated measured units','units',[],true);
 const setList=el('div');btn(f,'Suggest closest set',()=>{
  try{const proposed=suggestMatchedSet(freeUnits(),variant.value.trim(),Number(size.value),moneyInput(tolerance.value));
   for(const o of selection.options)o.selected=proposed.includes(o.value);
   status.textContent=proposed.length?'Matching units selected. Review before saving.':'No available set meets that tolerance.';
  }catch(error){status.textContent=error.message;}
 });
 submit(f,'Create measured set');matching.append(f,setList);
 const split=text=>[...new Set(text.split(',').map(s=>s.trim()).filter(Boolean))];
 const integer=(text,min,max)=>{const n=Number(text);if(!/^\d+$/.test(text)||!Number.isSafeInteger(n)||n<min||n>max)throw Error('Enter a whole number between '+min+' and '+max+'.');return n;};
 const lines=text=>text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(s=>s.split(',').map(p=>p.trim()));
 const freeUnits=()=>{const used=new Set(workspace.sets.flatMap(s=>s.members??[]));return workspace.units.filter(u=>!used.has(u.id));};
 const updateFields=()=>{const offer=kind.value==='offer';for(const n of [code,all,cats,tiers,stacking])n.closest('label').hidden=!offer;
  for(const n of [parts,price])n.closest('label').hidden=offer;
  pricing.closest('label').hidden=kind.value!=='bundle';instructions.closest('label').hidden=kind.value!=='addon';
 };
 kind.addEventListener('change',updateFields);
 function edit(rule){
  editing=rule;form.reset();kind.disabled=!!rule;
  if(rule){const r=rule.data;kind.value=rule.kind;name.value=rule.name;desc.value=rule.description;state.value=rule.state;
   start.value=(rule.starts_at||'').slice(0,16);end.value=(rule.ends_at||'').slice(0,16);code.value=rule.code||'';
   priority.value=String(rule.priority);products.value=(r.products??[]).join(',');exclude.value=(r.exclude??[]).join(',');all.checked=!!r.all;
   for(const o of cats.options)o.selected=(r.categories??[]).includes(o.value);
   tiers.value=(r.tiers??[]).map(t=>[t.minimum,t.type,(t.value/100).toFixed(2)].join(',')).join('\n');
   stacking.value=r.stacking??'exclusive';parts.value=(r.parts??[]).map(p=>p.componentId+','+p.quantity).join('\n');
   pricing.value=r.pricing??'fixed';price.value=r.priceMinor==null?'':(r.priceMinor/100).toFixed(2);instructions.value=r.instructions??'';
  }updateFields();
 }
 async function refresh(){
  const data=await client.list();
  if(disposed)return;
  if(!Array.isArray(data?.rules)||!Array.isArray(data?.units)||!Array.isArray(data?.sets))throw Error('Saved Commerce configuration could not be read.');
  workspace=data;saved.replaceChildren();setList.replaceChildren();selection.replaceChildren();
  for(const r of data.rules){const p=el('p',r.name+' · '+r.state+' · v'+r.revision+' ');btn(p,'Edit '+r.name,()=>edit(r));saved.append(p);}
  for(const u of freeUnits()){const o=el('option',u.component_id+' · '+(u.resistance_ohms/1000).toFixed(3)+' kΩ · '+u.id);o.value=u.id;selection.append(o);}
  for(const s of data.sets){const p=el('p',s.component_id+' · '+s.size+' units · '+s.state);setList.append(p);if(s.state==='available')btn(p,'Retire '+s.id,()=>run(async()=>{await client.retire(s.id);await refresh();},'Set retired. Its measurements remain recorded.'));}
 }
 async function run(action,message){
  if(disposed||busy)return;
  busy=true;root.setAttribute('aria-busy','true');status.textContent='Working…';
  try{await action();if(!disposed)status.textContent=message;}catch(error){if(!disposed)status.textContent=error.message;}
  finally{busy=false;root.setAttribute('aria-busy','false');}
 }
 form.addEventListener('submit',e=>{e.preventDefault();void run(async()=>{
  const data={products:split(products.value),categories:kind.value==='offer'?[...cats.selectedOptions].map(o=>o.value):[],exclude:split(exclude.value)};
  if(kind.value==='offer'){data.all=all.checked;data.stacking=stacking.value;data.tiers=lines(tiers.value).map(t=>({minimum:integer(t[0],1,99),type:t[1],value:moneyInput(t[2]??'')}));}
  else{data.parts=lines(parts.value).map(t=>({componentId:t[0],quantity:integer(t[1],1,99)}));data.priceMinor=moneyInput(price.value);
   if(kind.value==='bundle')data.pricing=pricing.value;else data.instructions=instructions.value.trim();}
  const rule={kind:kind.value,state:state.value,name:name.value.trim(),description:desc.value.trim(),priority:integer(priority.value,0,999),
   code:kind.value==='offer'?code.value.trim():null,startsAt:start.value?start.value+'Z':null,endsAt:end.value?end.value+'Z':null,data};
  await client.save(editing?.id??null,editing?.revision??0,rule);edit(null);await refresh();
 },'Configuration saved.');});
 m.addEventListener('submit',e=>{e.preventDefault();void run(async()=>{const id=await client.record(component.value.trim(),moneyInput(resistance.value,3));await refresh();if(!disposed)measurement.append(el('p','Label this physical unit: '+id));m.reset();},'Measurement recorded.');});
 f.addEventListener('submit',e=>{e.preventDefault();void run(async()=>{await client.make([...selection.selectedOptions].map(o=>o.value),moneyInput(tolerance.value),moneyInput(setPrice.value));await refresh();},'Matched set created.');});
 const destroy=()=>{disposed=true;root.replaceChildren();root.hidden=true;d.removeEventListener('admin:conceal',destroy);};
 d.addEventListener('admin:conceal',destroy);edit(null);return {destroy};
}
export function mountAdminWorkspace({document,auth}){
 if(commerce67Activation.admin)return mountCommerce67({document,client:commerce67Client({auth})});
 return null;
}
