import {renderAssemblies} from './assembly-ui.mjs';
import {moveSpecification} from './product-content.mjs';
import {categories,specificationFields,fieldLabels,parseGBP,priceInput} from './data.mjs';
import {componentRepository} from './component-repository.mjs';
import {prepareComponentExport} from './component-export.mjs';
import {prepareAssemblyExport} from './assembly-export.mjs';
import {readImage,imageSource} from './images.mjs';
import {kitBindings} from './kit-bindings.mjs';
const $=s=>document.querySelector(s),el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;return n;};
let repository,records=[],view=new URLSearchParams(location.search).get('view')==='assemblies'?'assemblies':'components',editing=null,stockId=null,draftSpecs={},draftProductSpecs=[],draftImage=null,imageVersion=0;
const form=$('#component-form'),field=n=>form.elements.namedItem(n),stockForm=$('#stock-form');
for(const [id,label] of Object.entries(categories))for(const target of [$('#category-filter'),field('category')]){const o=el('option',label);o.value=id;target.append(o);}
function message(text){$('#status').textContent=text;}
async function run(action){try{return await action();}catch(e){message(e.message);return null;}}
async function loadComponents(){records=await repository.list();return records;}
function render(){
 const assemblies=view==='assemblies';document.querySelector('h1').textContent=assemblies?'Products / Assemblies':'Inventory';document.title=(assemblies?'Products / Assemblies':'Inventory')+' | Apparition Admin';for(const link of document.querySelectorAll('[data-admin-destination]')){if(link.dataset.adminDestination===(assemblies?'assemblies':'inventory'))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}$('#add-component').hidden=assemblies;$('#add-assembly').hidden=true;$('#category-filter').closest('label').hidden=assemblies;
 if(assemblies){return renderAssemblies($('#search').value.toLowerCase().trim(),records);}$('#empty').textContent='No components match your search.';

 const items=records,q=$('#search').value.toLowerCase().trim(),category=$('#category-filter').value;
 const visible=items.filter(p=>(!category||p.category===category)&&(!q||[p.name,p.sku,p.manufacturer,...Object.values(p.specs)].join(' ').toLowerCase().includes(q)));
 $('#count').textContent=visible.length+' components';$('#table-caption').textContent='Inventory';
 const row=el('tr');for(const heading of view==='stock'?['Component','Category','Current stock','Update']:['Component','Category','Specification','Stock','Retail / Wiring Kit add-on','Active','Actions'])row.append(el('th',heading));$('#table-head').replaceChildren(row);$('#table-body').replaceChildren();$('#empty').hidden=visible.length!==0;
 for(const p of visible){const tr=el('tr'),name=el('td',p.name);name.append(el('small',p.sku));tr.append(name);
  if(view==='components'){name.append(el('small',p.manufacturer||''));tr.append(el('td',categories[p.category]),el('td',Object.entries(p.specs).map(([k,v])=>(fieldLabels[k]||k)+': '+v).join(' · ')||'Not specified'),el('td',String(p.stock)));const prices=el('td');prices.className='numeric';prices.append(el('span',p.salePrice==null?'Retail: Not set':'Retail: £'+priceInput(p.salePrice)),el('small',p.kitPrice==null?'Kit add-on: Not set':'Kit add-on: +£'+priceInput(p.kitPrice)));tr.append(prices);const active=el('td'),input=el('input');input.type='checkbox';input.checked=p.active;input.setAttribute('aria-label','Active: '+p.name);input.addEventListener('change',async()=>{input.disabled=true;const wanted=input.checked,ok=await run(async()=>{const fresh=records.find(x=>x.id===p.id);await repository.save({...fresh,active:wanted},p.id);await loadComponents();render();message('Active status saved.');return true;});if(!ok)input.checked=!wanted;input.disabled=false;});active.append(input);tr.append(active);}
  else tr.append(el('td',categories[p.category]),el('td',String(p.stock)));
  const actions=el('td'),button=el('button',view==='stock'?'Update stock':'Edit');button.type='button';button.setAttribute('aria-label',(view==='stock'?'Update stock for ':'Edit ')+p.name);button.addEventListener('click',()=>run(()=>view==='stock'?openStock(p.id):openEditor(p.id)));actions.append(button);if(view!=='stock'){const stock=el('button','Update stock');stock.type='button';stock.setAttribute('aria-label','Update stock for '+p.name);stock.addEventListener('click',()=>run(()=>openStock(p.id)));actions.append(stock);const remove=el('button','Delete permanently');remove.type='button';remove.className='destructive';remove.setAttribute('aria-label','Delete permanently '+p.name);remove.addEventListener('click',()=>run(async()=>{if(!window.confirm('Permanently delete '+p.name+' ('+p.sku+') and its Inventory? This cannot be undone. To archive it instead, turn Active off.'))return;remove.disabled=true;try{await repository.remove(p.id);await loadComponents();await render();message('Component and Inventory deleted permanently.');}finally{remove.disabled=false;}}));actions.append(remove);}tr.append(actions);$('#table-body').append(tr);
 }
}
function collectSpecs(){for(const input of $('#spec-fields').querySelectorAll('input'))draftSpecs[input.dataset.spec]=input.value;}
function renderSpecs(){const root=$('#spec-fields');root.replaceChildren();for(const key of specificationFields[field('category').value]||[]){const label=el('label',fieldLabels[key]||key),input=el('input');input.dataset.spec=key;input.value=draftSpecs[key]||'';input.maxLength=300;label.append(input);if(key==='Resistance'&&field('category').value==='potentiometers')label.append(el('small','Enter nominal resistance with units (for example 500kΩ). The current Les Paul kit requires nominal 500kΩ; a unitless measurement such as 511 cannot establish that value.'));root.append(label);}}
function openEditor(id=null){editing=id;const item=id?records.find(x=>x.id===id):{sku:'',name:'',manufacturer:'',category:'potentiometers',description:'',stock:0,active:true,individually:false,inKits:false,specs:{}};if(!item)throw new Error('Component not found.');form.reset();form.querySelector('[type=submit]').disabled=false;for(const key of ['sku','name','manufacturer','category','description','stock','productTitle','shortDescription','fullDescription'])field(key).value=item[key]??'';for(const key of ['active','individually','inKits'])field(key).checked=!!item[key];draftSpecs={...item.specs};draftProductSpecs=structuredClone(item.productSpecifications??[]);renderProductSpecs();$('#product-spec-status').textContent='';draftImage=item.image??null;imageVersion++;$('#image-file').value='';$('#image-error').textContent='';field('internalUnitCost').value=priceInput(item.internalUnitCost);field('stockUnit').value=item.stockUnit||'item';field('kitPriceQuantity').value=item.kitPriceQuantity||1;$('#master-price-quantity').hidden=!!kitBindings[id];field('stockUnit').disabled=item.category!=='other';field('salePrice').value=priceInput(item.salePrice);field('kitPrice').value=priceInput(item.kitPrice);priceVisibility();imagePreview();renderSpecs();$('#editor-title').textContent=id?'Edit component':'Add component';$('#editor-error').textContent='';$('#component-dialog').showModal();}
field('category').addEventListener('change',()=>{collectSpecs();field('stockUnit').disabled=field('category').value!=='other';renderSpecs();});
form.addEventListener('submit',async e=>{e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;try{collectSpecs();const data={internalUnitCost:parseGBP(field('internalUnitCost').value),stockUnit:field('stockUnit').value,kitPriceQuantity:Number(field('kitPriceQuantity').value),productSpecifications:draftProductSpecs,specs:draftSpecs,image:draftImage,salePrice:parseGBP(field('salePrice').value),kitPrice:parseGBP(field('kitPrice').value)};for(const k of ['sku','name','manufacturer','category','description','stock','productTitle','shortDescription','fullDescription'])data[k]=field(k).value;for(const k of ['active','individually','inKits'])data[k]=field(k).checked;await repository.save(data,editing);await loadComponents();render();$('#component-dialog').close();message('Component saved to shared inventory.');}catch(error){$('#editor-error').textContent=error.message;}finally{submit.disabled=false;}});
function stockMode(){const adjust=stockForm.elements.mode.value==='adjust';stockForm.elements.quantity.min=adjust?'':0;$('#stock-help').textContent=adjust?'Enter a positive quantity to add stock, or a negative quantity to remove it.':'Enter the total quantity on hand.';}
function openStock(id){const item=records.find(x=>x.id===id);if(!item)throw new Error('Component not found.');stockId=id;stockForm.reset();stockForm.elements.mode.value='set';stockForm.elements.quantity.value=item.stock;$('#stock-item').textContent=item.name+' · Current stock: '+item.stock;$('#stock-error').textContent='';stockMode();$('#stock-dialog').showModal();}
stockForm.elements.mode.addEventListener('change',()=>{stockMode();stockForm.elements.quantity.value=stockForm.elements.mode.value==='adjust'?0:records.find(x=>x.id===stockId).stock;});
stockForm.addEventListener('submit',async e=>{e.preventDefault();const submit=stockForm.querySelector('[type=submit]');submit.disabled=true;try{await repository.changeStock(stockId,stockForm.elements.quantity.value,stockForm.elements.mode.value);await loadComponents();render();$('#stock-dialog').close();message('Stock saved to shared inventory.');}catch(error){$('#stock-error').textContent=error.message;}finally{submit.disabled=false;}});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>$('#'+b.dataset.close).close());
$('#add-component').addEventListener('click',()=>run(()=>openEditor()));
let pendingExport=null;
$('#preview-component-export').addEventListener('click',()=>{
 pendingExport=null;$('#download-component-export').hidden=true;
 try{
  const snapshot=prepareComponentExport(window.localStorage);
  pendingExport=snapshot;
  const {componentCount,inventoryCount,embeddedImages,objectImages}=snapshot.summary;
  $('#component-export-summary').textContent=`Ready: ${componentCount} Components, ${inventoryCount} stock quantities; ${embeddedImages.length} embedded images and ${objectImages.length} object references. Review this browser's data before downloading.`;
  $('#download-component-export').hidden=false;
 }catch(error){$('#component-export-summary').textContent=error.message;}
});
$('#download-component-export').addEventListener('click',()=>{
 try{
  if(!pendingExport)throw new Error('Preview the export first.');
  const latest=prepareComponentExport(window.localStorage);
  if(latest.payload.raw!==pendingExport.payload.raw){pendingExport=null;$('#download-component-export').hidden=true;throw new Error('Component data changed since preview. Preview again to export the latest values.');}
  const blob=new Blob([JSON.stringify(pendingExport.payload)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='apparition-components-inventory-'+pendingExport.payload.exportedAt.slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('#component-export-summary').textContent='Private export downloaded. Keep the JSON file intact for migration review.';
 }catch(error){$('#component-export-summary').textContent=error.message;}
});
let pendingAssemblyExport=null;
$('#preview-assembly-export').addEventListener('click',()=>{
 pendingAssemblyExport=null;$('#download-assembly-export').hidden=true;
 try{
  const snapshot=prepareAssemblyExport(window.localStorage);
  pendingAssemblyExport=snapshot;
  const {assemblyCount,kitDefinitionCount,bomRows,storedVersion,kitDefinitions,lesPaulFound}=snapshot.summary;
  $('#assembly-export-summary').textContent=`Saved v${storedVersion}: ${assemblyCount} Assemblies, ${kitDefinitionCount} Kit Definitions, ${bomRows} BOM rows. Les Paul: ${lesPaulFound?'present':'not found'}. ${kitDefinitions.map(kit=>kit.name+' ('+kit.family+')').join('; ')||'No wiring kits'}. No data changed.`;
  $('#download-assembly-export').hidden=false;
 }catch(error){$('#assembly-export-summary').textContent=error.message;}
});
$('#download-assembly-export').addEventListener('click',()=>{
 try{
  if(!pendingAssemblyExport)throw new Error('Preview the Assembly export first.');
  const latest=prepareAssemblyExport(window.localStorage);
  if(latest.payload.raw!==pendingAssemblyExport.payload.raw){pendingAssemblyExport=null;$('#download-assembly-export').hidden=true;throw new Error('Assembly data changed since preview. Preview again to export current values.');}
  const blob=new Blob([JSON.stringify(pendingAssemblyExport.payload)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='apparition-assemblies-kit-definitions-'+pendingAssemblyExport.payload.exportedAt.slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('#assembly-export-summary').textContent='Private Assembly export downloaded. Keep the JSON intact for migration validation.';
 }catch(error){$('#assembly-export-summary').textContent=error.message;}
});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{view=b.dataset.view;for(const x of document.querySelectorAll('[data-view]'))x.setAttribute('aria-pressed',String(x===b));run(render);});
$('#search').addEventListener('input',()=>run(render));$('#category-filter').addEventListener('change',()=>run(render));
message('Loading components…');run(async()=>{repository=componentRepository();await loadComponents();await render();$('#add-component').disabled=false;message('');});

function priceVisibility(){
 $('#sale-price-field').hidden=!field('individually').checked;$('#kit-price-field').hidden=!field('inKits').checked;
 const binding=kitBindings[editing];$('#kit-price-basis').textContent=binding?'Charge covers '+binding.basis+'. Independent of retail price.':'Not linked to an existing kit option. Price is saved for later compatibility assignment.';
}
function imagePreview(){const image=$('#image-preview'),source=imageSource(draftImage);image.hidden=!source;if(source)image.src=source;else image.removeAttribute('src');$('#no-image').hidden=!!source;$('#remove-image').hidden=!draftImage;$('#image-upload-label').textContent=draftImage?'Replace image':'Upload image';}
for(const key of ['individually','inKits'])field(key).addEventListener('change',priceVisibility);
$('#image-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const request=++imageVersion;form.querySelector('[type=submit]').disabled=true;$('#image-error').textContent='';try{const image=await readImage(file);if(request!==imageVersion)return;draftImage=image;imagePreview();}catch(error){if(request===imageVersion)$('#image-error').textContent=error.message;}finally{if(request===imageVersion)form.querySelector('[type=submit]').disabled=false;}});
$('#remove-image').addEventListener('click',()=>{imageVersion++;draftImage=null;$('#image-file').value='';$('#image-error').textContent='';form.querySelector('[type=submit]').disabled=false;imagePreview();});

function renderProductSpecs(focusIndex=null,action=null){
 const root=$('#product-specifications');root.replaceChildren();
 draftProductSpecs.forEach((row,index)=>{
  const group=el('div');group.className='product-spec-row';group.setAttribute('role','group');group.setAttribute('aria-label','Specification '+(index+1));
  for(const key of ['label','value']){const label=el('label',key==='label'?'Label':'Value'),input=el('input');input.value=row[key];input.maxLength=key==='label'?300:1000;input.setAttribute('aria-label','Specification '+(index+1)+' '+key);input.addEventListener('input',()=>{row[key]=input.value;});label.append(input);group.append(label);}
  const actions=el('div');actions.className='product-spec-actions';
  for(const [name,direction] of [['Move up',-1],['Move down',1],['Remove',0]]){const button=el('button',name);button.type='button';button.dataset.action=name;button.setAttribute('aria-label',name+' specification '+(index+1));button.disabled=direction===-1&&index===0||direction===1&&index===draftProductSpecs.length-1;button.addEventListener('click',()=>{
   if(direction)draftProductSpecs=moveSpecification(draftProductSpecs,index,direction);else draftProductSpecs.splice(index,1);
   renderProductSpecs(Math.min(Math.max(0,index+direction),draftProductSpecs.length-1),name);$('#product-spec-status').textContent=direction?'Specification moved. Save component to keep this order.':'Specification removed. Save component to keep this change.';
  });actions.append(button);}group.append(actions);root.append(group);
 });
 $('#add-product-specification').disabled=draftProductSpecs.length>=100;
 if(focusIndex!==null){const group=root.children[focusIndex],target=group?.querySelector(`[data-action="${action}"]:not(:disabled)`);(target||group?.querySelector('input')||$('#add-product-specification')).focus();}
}
$('#add-product-specification').addEventListener('click',()=>{if(draftProductSpecs.length>=100)return;draftProductSpecs.push({label:'',value:''});renderProductSpecs(draftProductSpecs.length-1);});

document.addEventListener('assemblies-changed',()=>{if(view==='assemblies')run(render);});
