import {currentOperationsRepository} from '../../backend/operations-admin.mjs';
import {toUKInput,ukInputToISO,ukDate} from '../../operations/model.mjs';
const money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
export function bootDelivery({document:d=globalThis.document,repo=currentOperationsRepository(),confirm=message=>d.defaultView.confirm(message)}={}){
 const by=id=>d.getElementById(id), form=by('delivery-form'), calc=by('delivery-calc');
 const el=(tag,value)=>{const n=d.createElement(tag);if(value!==undefined)n.textContent=value;return n;};
 let state,baseline,busy=false;
 const say=(text,error=false)=>{by('delivery-status').textContent=text;by('delivery-status').dataset.state=error?'error':'ready';};
 const values=(parent,key)=>[...parent.querySelectorAll('.delivery-entry')].map(row=>Object.fromEntries([...row.querySelectorAll('input')].map(n=>[n.name,n.type==='number'?(n.name==='price'||n.name==='minOrder'?pence(n.value):Number(n.value)):n.value.trim()])));
 const pence=v=>Math.round(Number(v)*100);
 const input=(name,label,val,type='text',limits={})=>{const wrap=el('label',label),n=el('input');n.name=name;n.type=type;n.value=val??'';n.required=true;Object.assign(n,limits);wrap.append(n);return wrap;};
 const add=(kind,data={},first=false)=>{
  const method=kind==='methods',target=by('delivery-'+kind),row=el('div'),n=target.children.length+1;row.className='delivery-entry';
  const title=el('strong',first?'Standard / default method':method?'Additional method':'Product rule');title.className='entry-title';row.append(title);
  const amount=(key,title,v,max)=>input(key,title,v===undefined?'':(v/100).toFixed(2),'number',{min:0,max,step:'.01'});
  const count=(key,title,v,max,min=0)=>input(key,title,v,'number',{min,max,step:1});
  if(method){row.append(input('id','Method key',data.id??'method-'+n,'text',{pattern:'[a-z][a-z0-9\\-]{1,20}',maxLength:21}),input('name','Customer-facing method name',data.name,'text',{maxLength:60}),input('description','Delivery description',data.description,'text',{maxLength:180}),amount('price','Charge (£)',data.price??0,999.99),count('dispatchDays','Dispatch estimate (days)',data.dispatchDays??1,60),count('deliveryDays','Delivery estimate (days)',data.deliveryDays??3,60),amount('minOrder','Minimum merchandise (£)',data.minOrder??0,10000),count('minUnits','Minimum basket units',data.minUnits??0,600));}
  else row.append(input('productId','Catalogue product or kit ID',data.productId,'text',{maxLength:120}),count('minUnits','Minimum units of this product',data.minUnits??1,600,1),amount('price','Minimum postage charge (£)',data.price??0,999.99));
  if(!first){const remove=el('button','Remove '+(method?'method':'rule'));remove.type='button';remove.addEventListener('click',()=>{row.remove();changed();by('delivery-add-'+(method?'method':'override')).focus();});row.append(remove);}
  target.append(row);
 };
 function config(){
  const {free,threshold,promoStart,promoEnd}=form.elements;
  if(!!promoStart.value!==!!promoEnd.value)throw Error('Set both times for a free delivery promotion.');
  const promo=promoStart.value?{start:ukInputToISO(promoStart.value),end:ukInputToISO(promoEnd.value)}:null;
  return {methods:values(by('delivery-methods')),freeEnabled:free.checked,freeThreshold:pence(threshold.value),promo,overrides:values(by('delivery-overrides'))};
 }
 function changed(){
  let dirty;try{dirty=JSON.stringify(config())!==baseline;}catch{dirty=true;}
  by('delivery-dirty').textContent=dirty?'Unsaved changes. Checkout still uses active rates.':state.draft?'Draft saved. Activation is separate.':'No delivery draft saved.';
  by('delivery-activate').disabled=busy||dirty||!state.draft;
  by('delivery-legacy').disabled=busy||!state.active;
  by('delivery-add-method').disabled=by('delivery-methods').children.length>=5;
  by('delivery-add-override').disabled=by('delivery-overrides').children.length>=30;
 }
 function paint(){
  const active=state.active||state.legacy,c=state.draft||active;
  if(!active?.methods?.length)throw Error('No valid UK delivery configuration is available.');
  const metrics=[['Checkout source',state.active?'Active configuration':'Legacy postage'],['Standard charge',money.format(active.methods[0].price/100)],['Free delivery',active.freeEnabled?'From '+money.format(active.freeThreshold/100):'Off'],['Methods',String(active.methods.length)]];
  by('delivery-active').replaceChildren(...metrics.map(([title,value])=>{const group=el('div');group.append(el('dt',title),el('dd',value));return group;}));
  by('delivery-methods').replaceChildren();by('delivery-overrides').replaceChildren();
  c.methods.forEach((row,i)=>add('methods',row,i===0));c.overrides.forEach(row=>add('overrides',row));
  form.elements.free.checked=c.freeEnabled;form.elements.threshold.value=(c.freeThreshold/100).toFixed(2);
  form.elements.promoStart.value=toUKInput(c.promo?.start);form.elements.promoEnd.value=toUKInput(c.promo?.end);
  const history=state.history.map(row=>el('li',({draft:'Draft saved',activate:'Configuration activated',legacy:'Legacy rates restored'}[row.action]||row.action)+' · '+ukDate(row.changed_at)+' UK'));
  by('delivery-history').replaceChildren(...history.length?history:[el('li','No delivery changes recorded.')]);
  baseline=JSON.stringify(config());form.hidden=false;changed();
 }
 async function run(fn){if(busy)return;busy=true;if(state)changed();try{await fn();}catch(e){say(e.message,true);}finally{busy=false;if(state)changed();}}
 const refresh=()=>run(async()=>{say('Checking delivery settings…');state=await repo.deliveryRead();paint();say('Delivery settings current.');});
 const save=(action,message)=>run(async()=>{state=await repo.deliveryWrite(state.revision,action,action==='draft'?config():null);paint();say(message);});
 by('delivery-refresh').addEventListener('click',()=>{if(!state||by('delivery-dirty').textContent.startsWith('Unsaved')===false||confirm('Discard unsaved delivery edits?'))refresh();});
 by('delivery-add-method').addEventListener('click',()=>{add('methods');changed();by('delivery-methods').lastElementChild.querySelector('input').focus();});
 by('delivery-add-override').addEventListener('click',()=>{add('overrides');changed();by('delivery-overrides').lastElementChild.querySelector('input').focus();});
 form.addEventListener('input',changed);form.addEventListener('submit',event=>{event.preventDefault();save('draft','Draft saved. Checkout has not changed.');});
 by('delivery-activate').addEventListener('click',()=>{if(confirm('Activate the saved delivery draft for new checkouts? Existing order amounts stay unchanged.'))save('activate','Delivery settings activated.');});
 by('delivery-legacy').addEventListener('click',()=>{if(confirm('Switch new checkouts back to legacy UK postage? Keep the saved draft and history.'))save('legacy','Legacy rates restored.');});
 for(const b of d.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{calc.elements.subtotal.value=b.dataset.example;calc.requestSubmit();});
 calc.addEventListener('submit',event=>{event.preventDefault();run(async()=>{if(!state||!form.reportValidity())return;const c=calc.elements,id=c.product.value.trim();
  const options=await repo.deliveryPreview(config(),pence(c.subtotal.value),id?[{productId:id,quantity:Number(c.quantity.value)}]:[]);
  by('delivery-quote').replaceChildren(...options.map(m=>{const row=el('div');row.className='delivery-quote-row';row.append(el('strong',m.name+' · '+money.format(m.price/100)),el('p',m.description+(m.deliveryDays===null?'':' · Dispatch '+m.dispatchDays+' days; delivery '+m.deliveryDays+' days')));return row;}));
  say('Draft estimate only. No settings changed.');
 });});
 return {ready:refresh(),refresh};
}
if(typeof document!=='undefined'&&!document.body.hasAttribute('data-overseer-fixture')&&document.querySelector('#delivery-workbench'))bootDelivery();
