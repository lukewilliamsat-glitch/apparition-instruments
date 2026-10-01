import {publicInstrument} from '../instrument/configuration.mjs';
// A project composes the existing circuit authority. It is not a topology or solver.
import {normaliseCircuitState,captureCircuitState,readCircuitState,circuitStateURL} from './circuit-state.mjs';
import {lesPaul} from '../../les-paul-kits/config.mjs';
export const projectVersion=1,projectStorageKey='apparition.projects.v1';
export const projectCapabilities=Object.freeze({forge:['configuration','controlPositions','responseAssumptions'],generator:['configuration','physicalValues'],designer:['supportedResponse','sourceSnapshot'],builder:['kitDefinition','sourceSnapshot']});
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
function safeExtension(value,depth=0){
 if(depth>5)throw Error('Project extension nesting is too deep.');
 if(value===null||typeof value==='boolean'||typeof value==='string'&&value.length<=500||typeof value==='number'&&Number.isFinite(value))return value;
 if(Array.isArray(value)&&value.length<=30)return value.map(v=>safeExtension(v,depth+1));
 if(object(value)&&Object.keys(value).length<=30){const out={};for(const key of Object.keys(value).sort()){if(!/^[a-zA-Z][\w-]{0,50}$/.test(key)||['constructor','prototype','__proto__'].includes(key))throw Error('Invalid extension key.');out[key]=safeExtension(value[key],depth+1);}return out;}
 throw Error('Invalid project extension.');
}
export function normaliseProject(input){
 if(!object(input)||input.version!==projectVersion)throw Error('Unsupported project version.');
 if(input.name!==undefined&&(typeof input.name!=='string'||input.name.length>80))throw Error('Project names must be at most 80 characters.');
 if(!object(input.electronics))throw Error('Missing project electronics.');
 if(input.kitReference!==undefined&&(!object(input.kitReference)||input.kitReference.id!==lesPaul.id||input.kitReference.family!==lesPaul.family))throw Error('Unsupported Kit Definition reference.');
 const extensions=safeExtension(input.extensions??{});if(!object(extensions)||JSON.stringify(extensions).length>4000)throw Error('Project extensions are too large.');
 return {version:projectVersion,...input.kitReference?{kitReference:{id:lesPaul.id,family:lesPaul.family}}:{},name:(input.name||'').trim(),...typeof input.contextId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(input.contextId)?{contextId:input.contextId}:{},electronics:normaliseCircuitState(input.electronics),extensions};
}
export function projectFromCircuit(circuit,previous={}){return normaliseProject({version:projectVersion,name:previous.name||'',contextId:previous.contextId||globalThis.crypto.randomUUID(),kitReference:previous.kitReference,electronics:captureCircuitState(circuit),extensions:previous.extensions||{}});}
// An adapter derives instrument details from authoritative components, rather than
// maintaining a second pickup-count/control-layout representation in stored state.
export function instrumentDescription(circuit){if(circuit.state.instrument)return structuredClone(circuit.state.instrument);return {template:circuit.state.guitar,pickups:circuit.components.filter(c=>['pickup','humbucker','single-coil'].includes(c.type)).map(c=>({id:c.id,channel:c.channel})),controls:circuit.components.filter(c=>c.type==='pot').map(c=>({id:c.id,channel:c.channel,role:c.role,value:c.value}))};}
export function readProject(search){
 const q=new URLSearchParams(search);if(!q.has('ap')){const legacy=readCircuitState(search);return {project:legacy.state?normaliseProject({version:1,electronics:legacy.state}):null,notice:legacy.notice};}
 try{const raw=q.get('ap');if(raw.length>16000)throw Error();let project=normaliseProject(JSON.parse(raw));const contextId=q.get('wp');try{if(/^[a-zA-Z0-9-]{1,80}$/.test(contextId||'')){const local=normaliseProject(JSON.parse(globalThis.sessionStorage.getItem('apparition.workbench.'+contextId)));project=normaliseProject({...local,electronics:project.electronics.version===2?normaliseCircuitState({version:2,instrument:{...project.electronics.instrument,label:local.electronics.instrument?.label||'',extensions:local.electronics.instrument?.extensions||{}}}):project.electronics,contextId});}}catch{}return {project,notice:'Project circuit imported. Names and local extensions are not included in shared links.'};}
 catch{return {project:null,notice:'The project link could not be read. Normal defaults are shown.'};}
}
export function projectURL(path,project,{share=false}={}){
 const p=normaliseProject(project),url=new URL(path,'https://example.org');
 // URL sharing has a strict allowlist: no name, extensions, customer or account data.
 const publicProject={version:projectVersion,electronics:p.electronics.version===2?normaliseCircuitState({version:2,instrument:publicInstrument(p.electronics.instrument)}):p.electronics};
 url.searchParams.delete('wp');if(!share){try{const id=p.contextId||globalThis.crypto.randomUUID();globalThis.sessionStorage.setItem('apparition.workbench.'+id,JSON.stringify({...p,contextId:id}));url.searchParams.set('wp',id);}catch{}}
 url.searchParams.set('ap',JSON.stringify(publicProject));url.searchParams.set('sf',JSON.stringify(publicProject.electronics));
 if(url.search.length>16000)throw Error('Project link is too long.');
 return url.pathname+url.search+url.hash;
}
export function shareProjectURL(project){return projectURL('/circuit-forge/',project,{share:true});}
export function createProjectStore(storage){
 function list(){try{const raw=storage.getItem(projectStorageKey);if(!raw)return {entries:[],notice:''};if(raw.length>250000)throw Error();const parsed=JSON.parse(raw);if(parsed.version!==1||!Array.isArray(parsed.entries)||parsed.entries.length>25)throw Error();const entries=[];let skipped=0;const ids=new Set();for(const row of parsed.entries){try{if(!/^[\w-]{1,80}$/.test(row.id)||ids.has(row.id))throw Error();entries.push({id:row.id,project:normaliseProject(row.project)});ids.add(row.id);}catch{skipped++;}}return {entries,notice:skipped?'Some saved projects could not be restored.':''};}catch{return {entries:[],notice:'Saved projects could not be read. They have not been overwritten.'};}}
 function write(entries){storage.setItem(projectStorageKey,JSON.stringify({version:1,entries}));}
 function save(project,id=globalThis.crypto.randomUUID()){if(typeof id!=='string'||!/^[\w-]{1,80}$/.test(id))throw Error('Invalid project identifier.');const loaded=list();if(loaded.notice&&loaded.entries.length===0)throw Error(loaded.notice+' Clear invalid saved data explicitly before saving.');const entries=loaded.entries,next={id,project:normaliseProject(project)},index=entries.findIndex(e=>e.id===id);if(index<0){if(entries.length>=25)throw Error('Up to 25 local projects can be saved.');entries.push(next);}else entries[index]=next;write(entries);return id;}
 function requireEntry(id){const entry=list().entries.find(e=>e.id===id);if(!entry)throw Error('Saved project is unavailable.');return entry;}
 return {list,save,restore:id=>structuredClone(requireEntry(id).project),rename(id,name){const row=requireEntry(id);save({...row.project,name},id);},duplicate(id){const p=requireEntry(id).project;return save({...p,contextId:globalThis.crypto.randomUUID(),name:(p.name||'Untitled').slice(0,75)+' copy'});},delete(id){requireEntry(id);write(list().entries.filter(e=>e.id!==id));},clearInvalid(){const loaded=list();if(!loaded.notice)return;if(loaded.entries.length)write(loaded.entries);else storage.removeItem(projectStorageKey);}};
}
