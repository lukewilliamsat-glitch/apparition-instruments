// Isolated server contract. Not a Supabase RPC or production migration.
import {validatePatch} from '../command02/schema.mjs';
import {BridgeError,idOf} from '../command03/contracts.mjs';
export const protocol='command04-v1',maxStock=Number.MAX_SAFE_INTEGER,maxMoney=2147483647;
export const deny=(code,message,options)=>{throw new BridgeError(code,message,options);};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
export const canonical=v=>JSON.stringify(sort(v));
function sort(v){return Array.isArray(v)?v.map(sort):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;}
function jsonSafe(v,depth=0){if(depth>8)return false;if(v===null||typeof v==='string'||typeof v==='boolean')return true;if(typeof v==='number')return Number.isFinite(v);return plain(v)&&Object.values(v).every(x=>jsonSafe(x,depth+1));}
export function envelope(raw){
 if(!jsonSafe(raw))deny('VALIDATION','Only bounded JSON values are accepted.');
 if(!plain(raw)||Object.keys(raw).some(k=>!['protocol','operationId','id','expectedRevision','patch','inventory','internalCost'].includes(k)))deny('VALIDATION','Unsupported command envelope.');
 if(raw.protocol!==protocol||typeof raw.operationId!=='string'||! /^(?:command02-op-[1-9][0-9]{0,15}|ironclad-op-[a-zA-Z0-9-]{1,80})$/.test(raw.operationId))deny('VALIDATION','Invalid protocol or operation identity.');
 idOf(raw.id);if(typeof raw.expectedRevision!=='string'||!/^sim-[1-9][0-9]{0,9}$/.test(raw.expectedRevision)||Number(raw.expectedRevision.slice(4))>=maxMoney)deny('VALIDATION','Invalid product revision.');
 if(raw.patch!==undefined&&(!plain(raw.patch)||!Object.keys(raw.patch).length))deny('VALIDATION','Use a nonempty product patch.');
 if(raw.inventory!==undefined){const i=raw.inventory;if(!plain(i)||Object.keys(i).sort().join(',')!=='expectedQuantity,mode,value'||!['set','adjust'].includes(i.mode)||![i.expectedQuantity,i.value].every(Number.isSafeInteger)||i.expectedQuantity<0||i.expectedQuantity>maxStock||i.mode==='set'&&i.value<0)deny('VALIDATION','Invalid explicit inventory command.');}
 if(raw.internalCost!==undefined&&raw.internalCost!==null&&(!Number.isInteger(raw.internalCost)||raw.internalCost<0||raw.internalCost>maxMoney))deny('VALIDATION','Invalid private integer-pence cost.');
 if(raw.patch===undefined&&raw.inventory===undefined&&!Object.hasOwn(raw,'internalCost'))deny('VALIDATION','Empty mutation.');
 const json=canonical(raw);if(json.length>12000)deny('VALIDATION','Command exceeds the bounded payload.');return JSON.parse(json);
}
export function productValues(command,current,records){try{return command.patch?validatePatch(command.patch,current,records):{};}catch(error){deny('VALIDATION',error.message);}}
export function nextStock(command,current){
 if(!command.inventory)return current.stock;
 const i=command.inventory;if(i.expectedQuantity!==current.stock)deny('CONFLICT','Inventory changed. Refresh before applying stock changes.');
 const next=i.mode==='set'?i.value:current.stock+i.value;
 if(!Number.isSafeInteger(next)||next<0||next>maxStock)deny('VALIDATION','Stock must remain a non-negative safe integer.');return next;
}
