import {categories,summary} from '../command01/model.mjs?build=df78c5bf5144b012a7d96c628186180fa6432df3';
export const fields=Object.freeze({
 name:{label:'Product name',section:'general',max:300,required:true},
 sku:{label:'SKU',section:'general',max:80,required:true},
 description:{label:'Description',section:'general',max:5000},
 series:{label:'Series',section:'specifications',max:300},
 reference:{label:'Part reference',section:'specifications',max:300},
 salePrice:{label:'Selling price',section:'pricing',money:true},
 kitPrice:{label:'Kit price',section:'pricing',money:true},
 kitPriceQuantity:{label:'Kit price quantity',section:'pricing',integer:true},
 active:{label:'Active component',section:'availability',boolean:true},
 individually:{label:'Individual sale eligible',section:'availability',boolean:true},
 inKits:{label:'Kit eligible',section:'availability',boolean:true}
});
const intMax=2147483647;
export function parseMoney(value){
 if(typeof value!=='string')throw Error('Enter a GBP amount as text.');
 const s=value.trim();if(!s)return null;
 if(s.length>64)throw Error('Enter a shorter GBP amount.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Use a non-negative GBP amount with at most two decimals.');
 const [whole,fraction='']=s.split('.'),pence=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(pence>BigInt(intMax))throw Error('Price exceeds the existing integer-pence range.');
 return Number(pence);
}
export const moneyInput=v=>v===null||v===undefined?'':(v/100).toFixed(2);
export function editable(record){
 const result={};
 for(const [key,field]of Object.entries(fields)){
  const value=key==='series'?record.specs?.Series:key==='reference'?record.specs?.Reference:record[key];
  result[key]=field.money?moneyInput(value):field.boolean?value===true:value==null?'':String(value);
 }
 return result;
}
function parse(key,value){
 const field=fields[key];
 if(field.boolean){if(typeof value!=='boolean')throw Error('Choose a boolean eligibility value.');return value;}
 if(field.money)return parseMoney(value);
 if(field.integer){
  if(typeof value!=='string')throw Error('Use a positive whole quantity.');
  if(!value.trim())return null;
  if(!/^\d+$/.test(value.trim())||BigInt(value.trim())<1n||BigInt(value.trim())>BigInt(intMax))throw Error('Use a positive whole quantity within the supported range.');
  return Number(value.trim());
 }
 if(typeof value!=='string')throw Error('Use a text value.');
 const text=value.trim();
 if(field.required&&!text)throw Error(field.label+' is required.');
 if(text.length>field.max)throw Error(field.label+' must be '+field.max+' characters or fewer.');
 return text;
}
export function validateDraft(draft){
 const values={},errors={};
 for(const key of Object.keys(fields))try{values[key]=parse(key,draft[key]);}catch(error){errors[key]=error.message;}
 return {values,errors,valid:!Object.keys(errors).length};
}
export function changes(original,draft){
 const before=validateDraft(editable(original)).values,after=validateDraft(draft),result=[];
 for(const [key,field]of Object.entries(fields)){
  const value=Object.hasOwn(after.errors,key)?draft[key]:after.values[key];
  if(value!==before[key])result.push({key,label:field.label,before:before[key],after:value,error:after.errors[key]??null});
 }
 return result;
}
export const patchFor=(original,draft)=>Object.fromEntries(changes(original,draft).filter(c=>!c.error).map(c=>[c.key,c.after]));
export const fingerprint=patch=>JSON.stringify(Object.fromEntries(Object.entries(patch).sort(([a],[b])=>a.localeCompare(b))));
export function validatePatch(patch,current,records){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Invalid change payload.');
 if(![Object.prototype,null].includes(Object.getPrototypeOf(patch))||!Object.keys(patch).length)throw Error('A plain nonempty change payload is required.');
 for(const key of Object.keys(patch))if(!Object.hasOwn(fields,key))throw Error('Unsupported mutation: '+key+'.');
 const draft=editable(current);
 for(const [key,value]of Object.entries(patch)){
  const field=fields[key];
  if(field.money){
   if(value!==null&&(!Number.isInteger(value)||value<0||value>intMax))throw Error('Invalid monetary value.');
   draft[key]=moneyInput(value);
  }else if(field.integer){
   if(value!==null&&(!Number.isInteger(value)||value<1||value>intMax))throw Error('Invalid kit price quantity.');
   draft[key]=value===null?'':String(value);
  }else draft[key]=value;
 }
 const result=validateDraft(draft);if(!result.valid)throw Error(Object.values(result.errors)[0]);
 if(records.some(r=>r.id!==current.id&&r.sku.toLowerCase()===result.values.sku.toLowerCase()))throw Error('That SKU already exists. Choose a unique SKU.');
 return Object.fromEntries(Object.keys(patch).map(key=>[key,result.values[key]]));
}
export function applyValues(current,values){
 const next=structuredClone(current);next.specs={...current.specs};
 for(const [key,value]of Object.entries(values)){
  if(key==='series'||key==='reference'){const name=key==='series'?'Series':'Reference';if(value)next.specs[name]=value;else delete next.specs[name];}
  else next[key]=value;
 }
 return next;
}
export function readRecord(record,expectedId){
 if(!record||record.id!==expectedId||!/^(sim-[1-9]\d*|read-[a-f0-9]{64})$/.test(record.revision??''))throw Error('Unexpected product read identity.');
 summary(record);
 if(!record.specs||typeof record.specs!=='object'||Array.isArray(record.specs))throw Error('Invalid specification object.');
 for(const key of ['Series','Reference'])if(record.specs[key]!=null&&typeof record.specs[key]!=='string')throw Error('Invalid specification text.');
 const result=validateDraft(editable(record));if(!result.valid)throw Error('Invalid authorised product fields.');
 return structuredClone(record);
}
export const displayValue=(key,value)=>value===null?'Not supplied':fields[key]?.money?'£'+moneyInput(value):typeof value==='boolean'?(value?'Yes':'No'):String(value||'Not supplied');
export {categories};
