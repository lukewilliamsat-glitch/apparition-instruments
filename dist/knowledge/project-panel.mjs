import {instrumentSummary} from '../electronics/instrument/configuration.mjs';
import {createProjectStore,projectFromCircuit,shareProjectURL,projectURL} from '../electronics/state/project.mjs';
export function mountProjectPanel(root,{getCircuit,getProject=()=>null,setProject=()=>{},reset=()=>{},navigate=url=>location.assign(url),storage=globalThis.localStorage}={}){
 const doc=root.ownerDocument,e=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;},store=createProjectStore(storage);
 const disclosure=e('details'),heading=e('summary','Local workbench / save & share'),copy=e('p','Save a named circuit on this browser only. Saving is explicit; shared links contain the supported electronics, without your project name or local notes.');
 const label=e('label','Project name'),name=e('input');name.maxLength=80;name.value=getProject()?.name||'';label.append(name);
 const savedLabel=e('label','Saved projects'),list=e('select');savedLabel.append(list);const status=e('p');status.setAttribute('role','status');
 const actions=e('div');actions.className='project-actions';const links=e('div');links.className='project-actions';
 function refresh(){list.replaceChildren();const option=e('option','Choose a saved project');option.value='';list.append(option);const loaded=store.list();for(const row of loaded.entries){const option=e('option',(row.project.name||row.project.electronics.instrument?.label||'Untitled circuit')+(row.project.electronics.instrument?' · '+instrumentSummary(row.project.electronics.instrument):''));option.value=row.id;list.append(option);}if(loaded.notice)status.textContent=loaded.notice;}
 function button(text,run){const b=e('button',text);b.type='button';b.addEventListener('click',async()=>{try{await run();}catch(error){status.textContent=error.message;}});actions.append(b);return b;}
 function current(){const c=getCircuit();if(c.state.guitar!=='les-paul'&&!c.state.instrument)throw Error('Local project saving currently supports the shared Les Paul configuration only.');return {...projectFromCircuit(c,getProject()||{}),name:name.value};}
 button('Save current',()=>{const p=current();store.save(p);setProject(p);refresh();status.textContent='Project saved on this browser.';});
 button('Open',()=>{const p=store.restore(list.value);setProject(p);navigate(projectURL('/circuit-forge/',p));});
 button('Rename',()=>{store.rename(list.value,name.value);refresh();status.textContent='Saved project renamed.';});
 button('Duplicate',()=>{store.duplicate(list.value);refresh();status.textContent='Saved project duplicated.';});
 button('Delete',()=>{store.delete(list.value);refresh();status.textContent='Saved project deleted.';});
 button('New / reset',()=>{setProject(null);name.value='';reset();status.textContent='New unsaved circuit. Saved projects remain available.';});
 const fallback=e('input');fallback.readOnly=true;fallback.hidden=true;fallback.setAttribute('aria-label','Shareable circuit link');
 button('Copy circuit link',async()=>{const url=new URL(shareProjectURL(current()),location.origin).href;try{await navigator.clipboard.writeText(url);status.textContent='Circuit link copied without the project name or notes.';}catch{fallback.value=url;fallback.hidden=false;fallback.focus();fallback.select();status.textContent='Copy the circuit link from the field below.';}});
 button('Clear invalid saved data',()=>{if(!store.list().notice)throw Error('Saved data is valid; use Delete for individual projects.');store.clearInvalid();refresh();status.textContent='Invalid saved project data cleared.';});
 disclosure.append(heading,copy,label,savedLabel,actions,status,fallback,links);root.replaceChildren(disclosure);refresh();
 return {refresh,link:path=>projectURL(path,current())};
}
