import {actionMenu,confirmPermanentDelete} from '../actions.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {setAdminFeedback} from '../interaction.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {currentAdminOptionRepository} from '../../backend/catalogue-options.mjs?build=d2c652e6a46e602b3505602e923066b2e0e682c4';
import {componentRepository} from '../component-repository.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {optionSets,manufacturerKey,matchOption} from '../catalogue-options.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {bleedValues} from '../electrical-specs.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {potValues} from '../pot-specs.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {deploymentPath} from '../../deployment.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';

export function bootCatalogueSettings({document:doc=globalThis.document,repo=currentAdminOptionRepository(),componentRepo=componentRepository()}={}){
const root=doc.getElementById('option-groups'),status=doc.getElementById('option-status');let busy=false;
const node=(tag,text)=>{const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
let options=[],components=[];
const references=node('section');references.className='catalogue-dependency-notice';references.hidden=true;references.setAttribute('aria-label','Manufacturer references');
const refreshButton=node('button','Refresh references');refreshButton.type='button';root.before(refreshButton,references);
refreshButton.addEventListener('click',()=>act(async()=>{},'Catalogue references refreshed.'));
function showReferences(option,items){
 references.replaceChildren(node('h2','Manufacturer is still in use'),node('p','“'+option.label+'” cannot be deleted while these references remain. Reassign them through their existing editors, save each change, then return here and refresh references. Disabling a manufacturer preserves existing references.'));
 const list=node('ul');for(const item of items){const li=node('li');li.append(node('span',(item.name||item.id)+' · '+item.kind));if(item.kind==='Component'&&item.id){const link=node('a','Edit component');link.href=deploymentPath('/admin/?view=inventory&edit=component&component='+encodeURIComponent(item.id));li.append(link);}else li.append(node('p','Review this Kit Definition in its existing management workflow. No automatic reassignment or deletion is performed.'));list.append(li);}references.append(list);references.hidden=false;
 references.tabIndex=-1;references.focus();references.scrollIntoView?.({block:'nearest'});
}
function selected(item,set){
 if(set==='manufacturer')return item.manufacturerKey||matchOption(options,set,item.manufacturer)?.option_key;
 if(set==='pot_type'||set==='pot_shaft'||set==='pot_taper'){
  if(item.category!=='potentiometers')return null;
  const field={pot_type:'Type',pot_shaft:'Shaft',pot_taper:'Taper'}[set],property={pot_type:'typeKey',pot_shaft:'shaftKey',pot_taper:'taperKey'}[set];
  return item.technicalSpecs?.potentiometer?.[property]||matchOption(options,set,potValues(item)[field])?.option_key;
 }
 if(set==='bleed_topology'&&item.category==='treble-bleeds')return bleedValues(item).topology;
 return null;
}
async function refresh(){[options,components]=await Promise.all([repo.list(),componentRepo.list()]);references.hidden=true;render();}
function render(){root.replaceChildren();for(const [set,title] of Object.entries(optionSets)){
 const section=node('section');section.className='catalogue-option-section';section.append(node('h2',title));
 if(['pot_taper','bleed_topology'].includes(set))section.append(node('p','Electrical meanings are fixed. Existing labels can be renamed.'));
 if(set==='manufacturer')section.append(node('p','Component counts below do not include Kit Definitions. Deletion checks both before removing an unused manufacturer.'));
 const table=node('table'),head=node('tr');for(const text of ['Display label','Stable key','Components using','Status','Actions']){const th=node('th',text);th.scope='col';head.append(th);}const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');
 for(const option of options.filter(row=>row.option_set===set)){
  const using=components.filter(item=>selected(item,set)===option.option_key),count=using.length,row=node('tr'),label=node('td'),input=node('input');row.dataset.optionKey=option.option_key;input.value=option.label;input.maxLength=120;input.setAttribute('aria-label','Display label for '+option.option_key);label.append(input);
  const countCell=node('td',String(count));if(set==='manufacturer'&&count){const inspect=node('button','View references');inspect.type='button';inspect.addEventListener('click',()=>showReferences(option,using.map(item=>({kind:'Component',id:item.id,name:item.name}))));countCell.append(inspect);}
  row.append(label,node('td',option.option_key),countCell,node('td',option.active?'Active':'Disabled'));
  const actions=node('td'),rename=node('button','Save label'),toggle=node('button',option.active?'Disable':'Re-enable');rename.type=toggle.type='button';
  rename.addEventListener('click',()=>act(()=>repo.rename(set,option.option_key,input.value),'Label saved.'));
  toggle.addEventListener('click',()=>act(()=>repo.setActive(set,option.option_key,!option.active),option.active?'Option disabled; existing products keep it.':'Option re-enabled.'));
  const menu=actionMenu(doc,'More');menu.body.append(toggle);actions.append(rename,menu.element);
  if(set==='manufacturer'){
   const remove=node('button','Delete permanently');remove.type='button';remove.className='destructive';
   remove.addEventListener('click',async()=>{if(busy)return;if(using.length){showReferences(option,using.map(item=>({kind:'Component',id:item.id,name:item.name})));setAdminFeedback(status,'Deletion blocked: reassign the listed references first.','error');return;}busy=true;try{const confirmed=await confirmPermanentDelete(doc,option.label);if(!confirmed){setAdminFeedback(status,'Deletion cancelled.');return;}await act(()=>repo.remove(set,option.option_key),'Unused manufacturer option deleted permanently.',true,option);}catch(error){setAdminFeedback(status,error.message||'Deletion could not be confirmed. No deletion was requested.','error');}finally{busy=false;}});actions.append(remove);
  }
  row.append(actions);body.append(row);
 }table.append(body);const scroll=node('div');scroll.className='admin-table-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',title+' settings table');scroll.append(table);section.append(scroll);
 if(!['pot_taper','bleed_topology'].includes(set)){
  const form=node('form'),label=node('label','New '+title.toLowerCase()+' label'),input=node('input'),submit=node('button','Add option');input.required=true;input.maxLength=120;submit.type='submit';label.append(input);form.append(label,submit);
  form.addEventListener('submit',event=>{event.preventDefault();act(()=>repo.add(set,manufacturerKey(input.value),input.value),'Option added.');});section.append(form);
 }
 root.append(section);
}}
async function act(action,success,confirmed=false,option=null){if(busy&&!confirmed)return;if(!confirmed)busy=true;refreshButton.disabled=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);setAdminFeedback(status,'Saving…','loading');let applied=false;try{await action();applied=true;await refresh();setAdminFeedback(status,success,'success');}catch(error){setAdminFeedback(status,applied?success+' The catalogue could not refresh. Refresh references before another action.':error.message,'error');if(option&&Array.isArray(error.dependencies)&&error.dependencies.length)showReferences(option,error.dependencies);else{status.setAttribute('tabindex','-1');status.focus();status.scrollIntoView?.({block:'nearest'});}}finally{if(!confirmed)busy=false;refreshButton.disabled=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
const ready=refresh().catch(error=>setAdminFeedback(status,error.message,'error'));return {ready};
}
if(globalThis.document?.getElementById('option-groups'))bootCatalogueSettings();
