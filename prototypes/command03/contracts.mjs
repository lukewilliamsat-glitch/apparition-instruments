// Source-derived table/field vocabulary; proposed least-data queries, never live URLs.
import {summary,detail,categories} from '../command01/model.mjs';
import {readRecord} from '../command02/schema.mjs';
export class BridgeError extends Error {
 constructor(code,message,{outcome='not-applied',retryable=false,current}={}){super(message);this.name='BridgeError';Object.assign(this,{code,outcome,retryable,current});}
}
export const fail=(code,message,options)=>{throw new BridgeError(code,message,options);};
export const idOf=id=>{if(typeof id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(id))fail('IDENTITY','Invalid canonical product identity.');return id;};
export const hints=Object.freeze({resistance:'Resistance',taper:'Taper',tolerance:'Tolerance',capacitance:'Value',voltage:'Voltage',shaft:'Shaft',connection:'Topology',bleedCap:'Capacitor',resistor:'Resistor'});
export const summaryColumns='id,sku,name,category,manufacturer,active,individually,in_kits,sale_price,kit_price,kit_price_quantity,updated_at,'+Object.entries(hints).map(([alias,key])=>alias+':specs->>'+key).join(',');
export const detailColumns='id,sku,name,category,manufacturer,active,individually,in_kits,sale_price,kit_price,kit_price_quantity,updated_at,description,specs';
export const inventoryColumns='component_id,quantity,stock_unit';
export const capabilityNames=Object.freeze(['catalogueRead','productRead','productWrite']);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
export function sessionGrant(raw,session,now){
 if(!object(raw)||raw.subject!==session.subject||typeof raw.sessionId!=='string'||!raw.sessionId.startsWith('fixture-session-')||!Number.isFinite(raw.expiresAt)||raw.expiresAt<=now||raw.expiresAt>session.expiresAt||!object(raw.capabilities)||capabilityNames.some(k=>typeof raw.capabilities[k]!=='boolean'))fail('PERMISSION','The authority returned invalid session permissions.');
 return Object.freeze({subject:raw.subject,sessionId:raw.sessionId,expiresAt:raw.expiresAt,capabilities:Object.freeze(Object.fromEntries(capabilityNames.map(k=>[k,raw.capabilities[k]])))});
}
export function rowsOf(value,max=100){if(!Array.isArray(value)||value.length>max||value.some(r=>!object(r)))fail('MALFORMED','Invalid bounded table response.');return value;}
const text=(value,label,max,empty=true)=>{if(typeof value!=='string'||value.length>max||!empty&&!value.trim())fail('MALFORMED','Invalid '+label+'.');return value;};
const money=value=>{if(value!==null&&(!Number.isInteger(value)||value<0||value>2147483647))fail('MALFORMED','Invalid integer-pence price.');return value;};
export function mapRecord(row,stock,revision,full=false){
 const allowed=new Set(['id','sku','name','category','manufacturer','active','individually','in_kits','sale_price','kit_price','kit_price_quantity','updated_at',...Object.keys(hints),...full?['description','specs']:[]]);
 if(Object.keys(row).some(k=>!allowed.has(k)))fail('MALFORMED','The response contains fields outside its approved projection.');
 idOf(row.id);text(row.sku,'SKU',80,false);text(row.name,'product name',300,false);text(row.manufacturer,'manufacturer',300);
 text(row.updated_at,'source timestamp',40,false);if(!Number.isFinite(Date.parse(row.updated_at)))fail('MALFORMED','Invalid source timestamp.');
 if(!Object.hasOwn(categories,row.category)||['active','individually','in_kits'].some(k=>typeof row[k]!=='boolean'))fail('MALFORMED','Invalid catalogue category or eligibility.');
 for(const k of ['sale_price','kit_price'])money(row[k]);
 if(row.kit_price_quantity!==null&&(!Number.isInteger(row.kit_price_quantity)||row.kit_price_quantity<1||row.kit_price_quantity>2147483647))fail('MALFORMED','Invalid kit price quantity.');
 if(!stock||Object.keys(stock).some(k=>!inventoryColumns.split(',').includes(k))||stock.component_id!==row.id||!Number.isSafeInteger(stock.quantity)||stock.quantity<0||!['item','m','g'].includes(stock.stock_unit))fail('MALFORMED','Missing or invalid inventory; no quantity was substituted.');
 if(typeof revision!=='string'||!revision)fail('MALFORMED','Missing read identity.');
 const technicalSpecs={};for(const k of Object.keys(hints)){const v=full?row.specs?.[hints[k]]:row[k];if(v!=null){text(v,'search hint',300);if(!['bleedCap','resistor'].includes(k))technicalSpecs[k]=v;}}
 if(!technicalSpecs.capacitance&&row.bleedCap)technicalSpecs.capacitance=row.bleedCap;
 if(!technicalSpecs.resistance&&row.resistor)technicalSpecs.resistance=row.resistor;
 const mapped={id:row.id,sku:row.sku,name:row.name,category:row.category,manufacturer:row.manufacturer,active:row.active,individually:row.individually,inKits:row.in_kits,salePrice:row.sale_price,kitPrice:row.kit_price,kitPriceQuantity:row.kit_price_quantity,stock:stock.quantity,stockUnit:stock.stock_unit,technicalSpecs,revision,imageInfo:{kind:'unloaded'}};
 if(!full)return summary(mapped);
 text(row.description,'description',5000);if(!object(row.specs)||Object.keys(row.specs).length>100)fail('MALFORMED','Invalid specification object.');
 for(const [k,v]of Object.entries(row.specs)){text(k,'specification key',60,false);text(v,'specification',300);}
 return {...mapped,description:row.description,specs:structuredClone(row.specs)};
}
export const inspectorRecord=record=>detail({...record,specs:Object.entries(record.specs).map(([k,v])=>k+': '+v).join(' · ')},record.id);
export const editorRecord=(record,id)=>readRecord(record,id);
export function normaliseError(error,{write=false}={}){
 if(error instanceof BridgeError)return error;
 if(error?.name==='AbortError')return new BridgeError('CANCELLED','Request cancelled.',{outcome:write?'unknown':'not-applied'});
 const known={PERMISSION:'The fixture authority denied this operation.',VALIDATION:'The authority rejected the product changes.',CONFLICT:'Another actor changed this product. Review and reload the current values.',MISSING:'The product is no longer available.',CONNECTION:'Submission interrupted. Check the operation outcome.',TIMEOUT:'The operation timed out. Check its outcome.'};
 if(Object.hasOwn(known,error?.code??''))return new BridgeError(error.code,known[error.code],{outcome:error.outcome==='not-applied'?'not-applied':write?'unknown':'not-applied',current:error.current??undefined});
 // Never display arbitrary transport bodies or tokens in the interface.
 return new BridgeError('NETWORK',write?'Submission interrupted; its outcome must be checked.':'Read unavailable. Retry when the connection recovers.',{outcome:write?'unknown':'not-applied',retryable:!write});
}
