import {publicBackendConfig} from './public-config.mjs';
import {validateOptionInput,normaliseLabel} from '../admin/catalogue-options.mjs';
import {readPublicRows,optionColumns} from './public-read.mjs';
const path='/rest/v1/catalogue_options';
const decode=async response=>{if(!response.ok)throw Error('Catalogue options are unavailable ('+response.status+').');const value=await response.json();if(!Array.isArray(value))throw Error('Invalid catalogue options response.');return value;};
export function createPublicOptionRepository({config=publicBackendConfig,request=globalThis.fetch}={}){
 return Object.freeze({list:()=>readPublicRows({config,request},'catalogue_options','?select='+optionColumns+'&order=option_set,sort_order,label','Catalogue options')});
}
export function createAdminOptionRepository(transport){
 if(typeof transport?.send!=='function')throw Error('Authenticated Admin transport required.');
 const list=async()=>decode(await transport.send('catalogue_options',{query:'?select=option_set,option_key,label,aliases,active,sort_order&order=option_set,sort_order,label'}));
 const save=async(method,query,body)=>{
  const response=await transport.send('catalogue_options',{method,query,body,prefer:'return=representation'});
  if(!response.ok){let detail;try{detail=await response.json();}catch{}throw Error(detail?.code==='23505'?'That option key or label is already in use.':detail?.message||'Catalogue option could not be saved.');}
  const rows=await response.json();if(!Array.isArray(rows)||rows.length!==1)throw Error('Catalogue option save did not affect exactly one row.');return rows[0];
 };
 const query=(set,key)=>'?option_set=eq.'+encodeURIComponent(set)+'&option_key=eq.'+encodeURIComponent(key);
 return Object.freeze({list,async add(set,key,label){return save('POST','',validateOptionInput(await list(),set,key,label));},
  async rename(set,key,label){const rows=await list(),existing=rows.find(row=>row.option_set===set&&row.option_key===key);if(!existing)throw Error('Option no longer exists.');if(!label.trim()||label.trim().length>120)throw Error('Enter a label of 1–120 characters.');if(rows.some(row=>row.option_set===set&&row.option_key!==key&&[row.label,...row.aliases||[]].some(value=>normaliseLabel(value)===normaliseLabel(label))))throw Error('An option with that label already exists.');return save('PATCH',query(set,key),{label:label.trim()});},
  async setActive(set,key,active){return save('PATCH',query(set,key),{active:!!active});},
  async remove(set,key){
   const response=await transport.send('rpc/delete_unused_catalogue_option',{method:'POST',body:{p_set:set,p_key:key}});
   if(!response.ok){let detail;try{detail=await response.json();}catch{}throw Error(detail?.message||'Catalogue option could not be deleted.');}
   const result=await response.json();
   if(result?.deleted===true)return result;
   if(Array.isArray(result?.dependencies)&&result.dependencies.length){
    const dependencies=result.dependencies.map(item=>item.kind+' '+item.id+(item.name?' ('+item.name+')':''));
    throw Error('Cannot delete this manufacturer. It is used by '+dependencies.join('; ')+'. Reassign or remove these dependencies first.');
   }
   throw Error('Catalogue option deletion was refused. Refresh before retrying.');
  }});
}
let adminRepository=null;
export const setAdminOptionRepository=value=>{adminRepository=value;};
export const currentAdminOptionRepository=()=>{if(!adminRepository)throw Error('Admin catalogue access is unavailable.');return adminRepository;};
