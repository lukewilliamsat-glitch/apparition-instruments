import {currentOperationsRepository} from '../backend/operations-admin.mjs';
import {validateDestination} from './destinations.mjs';
const families=['potentiometers','capacitors','treble-bleeds'];
export async function bootCommercialAdmin(document=globalThis.document,repo=currentOperationsRepository()){
 const root=document.querySelector('[data-commercial-admin]');if(!root)return;
 const form=root.querySelector('form'),status=root.querySelector('[data-commercial-status]'),list=root.querySelector('[data-commercial-list]'),scope=form.elements.namedItem('scope'),key=form.elements.namedItem('scope_key'),field=name=>form.elements.namedItem(name);
 let products=[],rows=[],busy=false;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function options(selected=''){
  const choices=scope.value==='PRODUCT'?products.map(p=>[p.id,p.name+' / '+p.id]):scope.value==='SKU'?products.filter(p=>p.sku).map(p=>[p.sku,p.name+' / '+p.sku]):scope.value==='FAMILY'?families.map(x=>[x,x]):scope.value==='CATEGORY'?['/components/',...families.map(x=>'/components/'+x+'/')].map(x=>[x,x]):[['*','Apparition storefront']];
  const unique=new Map(choices);if(selected&&!unique.has(selected))unique.set(selected,selected+' (saved scope)');key.replaceChildren(...[...unique].map(([value,label])=>{const o=node('option',label);o.value=value;return o;}));key.value=selected||choices[0]?.[0]||'';
 }
 function edit(row){form.reset();scope.value=row?.scope||'PRODUCT';options(row?.scope_key);for(const name of ['url','label'])field(name).value=row?.[name]||'';for(const name of ['enabled','paused_only'])field(name).checked=row?.[name]||false;scope.disabled=!!row;key.disabled=!!row;}
 async function action(fn){if(busy)return;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();rows=await repo.destinations();render();status.textContent='Destination configuration saved.';}catch(e){status.textContent=e.message;}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function render(){list.replaceChildren();if(!rows.length){list.append(node('p','No destinations configured.'));return;}for(const row of rows){const p=node('p',row.scope+' / '+row.scope_key+' — '+(row.enabled?'Enabled':'Disabled')+' '),change=node('button','Edit'),remove=node('button','Remove');change.type=remove.type='button';change.addEventListener('click',()=>edit(row));remove.addEventListener('click',()=>action(async()=>{const result=await repo.removeDestination(row);if(result.length!==1)throw Error('Destination was not removed. Reload before retrying.');edit(null);}));p.append(change,remove);list.append(p);}}
 scope.addEventListener('change',()=>options());root.querySelector('[data-commercial-new]').addEventListener('click',()=>edit(null));
 form.addEventListener('submit',e=>{e.preventDefault();action(async()=>{const row=validateDestination({scope:scope.value,scope_key:key.value,destination_type:field('destination_type').value,url:field('url').value,label:field('label').value,enabled:field('enabled').checked,paused_only:field('paused_only').checked});const result=await repo.saveDestination(row);if(result.length!==1)throw Error('Destination was not saved. Reload before retrying.');edit(result[0]);});});
 try{[products,rows]=await Promise.all([repo.destinationProducts(),repo.destinations()]);edit(null);render();}catch(e){status.textContent=e.message;form.querySelectorAll('input,select,button').forEach(n=>n.disabled=true);}
}
if(typeof document!=='undefined')await bootCommercialAdmin();
