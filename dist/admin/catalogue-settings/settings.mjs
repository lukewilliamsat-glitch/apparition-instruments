import {actionMenu,confirmPermanentDelete} from '../actions.mjs';
import {setAdminFeedback} from '../interaction.mjs';
import {currentAdminOptionRepository} from '../../backend/catalogue-options.mjs';
import {componentRepository} from '../component-repository.mjs';
import {optionSets,manufacturerKey,matchOption} from '../catalogue-options.mjs';
import {bleedValues} from '../electrical-specs.mjs';
import {potValues} from '../pot-specs.mjs';

export function bootCatalogueSettings({document:doc=globalThis.document,repo=currentAdminOptionRepository(),componentRepo=componentRepository()}={}){
const root=doc.getElementById('option-groups'),status=doc.getElementById('option-status');let busy=false;
const node=(tag,text)=>{const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
let options=[],components=[];
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
async function refresh(){[options,components]=await Promise.all([repo.list(),componentRepo.list()]);render();}
function render(){root.replaceChildren();for(const [set,title] of Object.entries(optionSets)){
 const section=node('section');section.className='catalogue-option-section';section.append(node('h2',title));
 if(['pot_taper','bleed_topology'].includes(set))section.append(node('p','Electrical meanings are fixed. Existing labels can be renamed.'));
 if(set==='manufacturer')section.append(node('p','Component counts below do not include Kit Definitions. Deletion checks both before removing an unused manufacturer.'));
 const table=node('table'),head=node('tr');for(const text of ['Display label','Stable key','Components using','Status','Actions'])head.append(node('th',text));const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');
 for(const option of options.filter(row=>row.option_set===set)){
  const count=components.filter(item=>selected(item,set)===option.option_key).length,row=node('tr'),label=node('td'),input=node('input');input.value=option.label;input.maxLength=120;input.setAttribute('aria-label','Display label for '+option.option_key);label.append(input);
  row.append(label,node('td',option.option_key),node('td',String(count)),node('td',option.active?'Active':'Disabled'));
  const actions=node('td'),rename=node('button','Save label'),toggle=node('button',option.active?'Disable':'Re-enable');rename.type=toggle.type='button';
  rename.addEventListener('click',()=>act(()=>repo.rename(set,option.option_key,input.value),'Label saved.'));
  toggle.addEventListener('click',()=>act(()=>repo.setActive(set,option.option_key,!option.active),option.active?'Option disabled; existing products keep it.':'Option re-enabled.'));
  const menu=actionMenu(doc,'More');menu.body.append(toggle);actions.append(rename,menu.element);
  if(set==='manufacturer'){
   const remove=node('button','Delete permanently');remove.type='button';remove.className='destructive';
   remove.addEventListener('click',async()=>{if(busy)return;busy=true;try{const confirmed=await confirmPermanentDelete(doc,option.label);if(!confirmed){setAdminFeedback(status,'Deletion cancelled.');return;}await act(()=>repo.remove(set,option.option_key),'Unused manufacturer option deleted permanently.',true);}finally{busy=false;}});menu.body.append(remove);
  }
  row.append(actions);body.append(row);
 }table.append(body);section.append(table);
 if(!['pot_taper','bleed_topology'].includes(set)){
  const form=node('form'),label=node('label','New '+title.toLowerCase()+' label'),input=node('input'),submit=node('button','Add option');input.required=true;input.maxLength=120;submit.type='submit';label.append(input);form.append(label,submit);
  form.addEventListener('submit',event=>{event.preventDefault();act(()=>repo.add(set,manufacturerKey(input.value),input.value),'Option added.');});section.append(form);
 }
 root.append(section);
}}
async function act(action,success,confirmed=false){if(busy&&!confirmed)return;if(!confirmed)busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);setAdminFeedback(status,'Saving…','loading');try{await action();await refresh();setAdminFeedback(status,success,'success');}catch(error){setAdminFeedback(status,error.message,'error');status.setAttribute('tabindex','-1');status.focus();status.scrollIntoView?.({block:'nearest'});}finally{if(!confirmed)busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
const ready=refresh().catch(error=>setAdminFeedback(status,error.message,'error'));return {ready};
}
if(globalThis.document?.getElementById('option-groups'))bootCatalogueSettings();
