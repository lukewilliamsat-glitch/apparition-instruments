import {lesPaul,formatKitPrice,upgradeLabel,resolveKitComponent} from '../wiring-kits/kit-data.mjs';
import {deploymentPath} from '../deployment.mjs';
import {resolvePhysicalRequirements} from '../wiring-kits/kit-requirements.mjs';
export {lesPaul,formatKitPrice,upgradeLabel};
export const defaults=Object.freeze(Object.fromEntries(['wiring','pots','shaft','matching','caps','neckCap','bridgeCap','bleed','jack','selector','model'].map(key=>[key,lesPaul.defaults[key]])));
export const options=Object.freeze({...Object.fromEntries(['wiring','pots','shaft','matching','bleed','jack','selector'].map(k=>[k,Object.keys(lesPaul[k])])),caps:[...Object.keys(lesPaul.capacitors),'mixed'],neckCap:Object.keys(lesPaul.capacitors),bridgeCap:Object.keys(lesPaul.capacitors)});
export const bleedNames=Object.freeze(Object.fromEntries(Object.entries(lesPaul.bleed).map(([k,v])=>[k,v.label])));
export const specLabels=Object.freeze({wiring:'Wiring',pots:'Potentiometers',shaft:'Shaft length',matching:'Pot selection',neck:'Neck tone capacitor',bridge:'Bridge tone capacitor',bleed:'Treble bleed',jack:'Output jack',selector:'Selector switch',model:'Guitar model / year'});
const legacyCaps={'0.022':'715p-022','0.033':'nissei-033','0.047':'225p-047'};
const legacyPhysical={caps:'capacitors',bleed:'bleed',jack:'jack',selector:'selector'};
// Legacy basket links keep their old option keys; new customer choices are canonical Component IDs.
const legacyIds={caps:{'715p-022':'sbe-200','225p-022':'cde-022','nissei-033':'nissei-033','225p-047':'cde-047'},bleed:{prs:'bleed-prs',cap:'bleed-cap',duncan:'bleed-duncan',premium:'bleed-premium',overkill:'bleed-overkill'},jack:{epiphone:'jack-epiphone',pureTone:'jack-pureTone',switchcraft:'jack-switchcraft'},selector:{epiphone:'switch-epiphone',switchcraft:'switch-switchcraft'}};
export function normaliseKit(value={}){
 const input=value&&typeof value==='object'?{...value}:{},result={...defaults};
 for(const k of ['caps','neckCap','bridgeCap'])if(legacyCaps[input[k]])input[k]=legacyCaps[input[k]];
 for(const key of ['caps','neckCap','bridgeCap','bleed','jack','selector']){const group=key==='neckCap'||key==='bridgeCap'?'caps':key;const mapped=legacyIds[group]?.[input[key]];if(mapped&&lesPaul[legacyPhysical[group]||'capacitors']?.[mapped])input[key]=mapped;}
 for(const [key,allowed] of Object.entries(options))if(allowed.includes(input[key]))result[key]=input[key];
 result.model=typeof input.model==='string'?input.model.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,120):'';
 if(result.wiring==='50s')result.bleed='none';return result;
}
export function invalidKitChoices(value={}){
 if(!value||typeof value!=='object')return [];
 return Object.entries(options).filter(([key,allowed])=>{
  const supplied=value[key];if(typeof supplied!=='string'||!supplied||key==='bleed'&&value.wiring==='50s')return false;
  const legacy=key==='caps'||key==='neckCap'||key==='bridgeCap'?legacyCaps[supplied]||supplied:supplied;
  const group=key==='neckCap'||key==='bridgeCap'?'caps':key,canonical=legacyIds[group]?.[legacy]||legacy;
  return !allowed.includes(canonical);
 }).map(([key])=>key+': '+value[key]);
}
export function toneCaps(value){const s=normaliseKit(value);return {neck:lesPaul.capacitors[s.caps==='mixed'?s.neckCap:s.caps],bridge:lesPaul.capacitors[s.caps==='mixed'?s.bridgeCap:s.caps]};}
export function generatorCapValue(option){const value=String(parseFloat(option.value));return ['0.022','0.033','0.047'].includes(value)?value:'0.022';}
export function generatorBleedValue(option){if(!option?.componentId)return 'none';if(/parallel|resistor/i.test(option.topology||option.component?.specification?.Topology||''))return 'duncan';return /180p/i.test(option.value)?'prs':'cap';}
export function resolvedPotentiometer(value){const s=normaliseKit(value);return resolveKitComponent(lesPaul,{pots:s.pots,shaft:s.shaft});}
export function resolveLesPaulKit(value){
 const s=normaliseKit(value),caps=toneCaps(s),pot=resolvedPotentiometer(s),effective={...s,neckCap:s.caps==='mixed'?s.neckCap:s.caps,bridgeCap:s.caps==='mixed'?s.bridgeCap:s.caps};
 const physical=resolvePhysicalRequirements(lesPaul.requirements,effective,(requirement,choice)=>{
  if(requirement.source==='potentiometers')return pot?{component:pot.component}:null;
  const key=choice[requirement.selectionKeys[0]],option=lesPaul[requirement.source]?.[key];
  return key==='none'?{none:true}:option||null;
 });
 const baseline=resolveKitComponent(lesPaul,{pots:defaults.pots,shaft:defaults.shaft})?.component;
 for(const role of physical.roles){
  role.priceContribution=role.quantity===0?0:!role.componentId?NaN:role.pricing==='relative-to-default'?
   Number.isSafeInteger(role.unitKitPrice)&&Number.isSafeInteger(baseline?.kitPrice)?role.quantity*(role.unitKitPrice-baseline.kitPrice):NaN:
   Number.isSafeInteger(role.unitKitPrice)?role.quantity*role.unitKitPrice:NaN;
 }
 const parts=physical.roles.map(role=>({...role,supplied:role.quantity>0&&!!role.componentId,name:role.component?.productTitle||role.component?.name||'Unavailable',kitAddOn:role.priceContribution,priceBasis:role.quantity+' physical component'+(role.quantity===1?'':'s'),stockState:role.quantity===0?'not-applicable':!role.componentId?'not-eligible':'available'}));
 const required=new Map(physical.stockRequirements.map(item=>[item.componentId,item.quantity]));
 for(const part of parts)if(part.componentId&&(!Number.isSafeInteger(part.component.stock)||part.component.stock<required.get(part.componentId)))part.stockState='out-of-stock';
 const role=key=>parts.find(part=>part.role===key);
 const optionAvailability={};
 for(const group of ['pots','shaft'])optionAvailability[group]=Object.fromEntries(Object.keys(lesPaul[group]).map(key=>{const result=resolveKitComponent(lesPaul,{pots:s.pots,shaft:s.shaft,[group]:key}),quantity=role('potentiometers').quantity;return [key,result?Number.isSafeInteger(result.component.stock)&&result.component.stock>=quantity?'available':'out-of-stock':'not-eligible'];}));
 for(const [group,source,roleKey] of [['neckCap','capacitors','neckToneCapacitor'],['bridgeCap','capacitors','bridgeToneCapacitor'],['bleed','bleed','trebleBleeds'],['jack','jack','outputJack'],['selector','selector','selector']])optionAvailability[group]=Object.fromEntries(Object.entries(lesPaul[source]).map(([key,option])=>[key,option.enabled===false?'not-eligible':!option.componentId?'available':Number.isSafeInteger(option.component?.stock)&&option.component.stock>=role(roleKey).quantity?'available':'out-of-stock']));
 const capQuantity=role('neckToneCapacitor').quantity+role('bridgeToneCapacitor').quantity;
 optionAvailability.caps=Object.fromEntries(Object.entries(lesPaul.capacitors).map(([key,option])=>[key,option.enabled===false?'not-eligible':Number.isSafeInteger(option.component?.stock)&&option.component.stock>=capQuantity?'available':'out-of-stock']));
 const lines=[{key:'base',label:lesPaul.name,price:lesPaul.basePrice},{key:'wiring',label:lesPaul.wiring[s.wiring].label,price:lesPaul.wiring[s.wiring].price},{key:'pots',label:role('potentiometers').name,price:role('potentiometers').priceContribution},...['shaft','matching'].map(key=>({key,label:lesPaul[key][s[key]].label,price:lesPaul[key][s[key]].price})),{key:'capacitors',label:caps.neck===caps.bridge?capQuantity+' × '+caps.neck.label:'Neck: '+caps.neck.label+' / Bridge: '+caps.bridge.label,price:role('neckToneCapacitor').priceContribution+role('bridgeToneCapacitor').priceContribution},...['bleed','jack','selector'].map((key,index)=>({key,label:lesPaul[key][s[key]].label,price:role(['trebleBleeds','outputJack','selector'][index]).priceContribution}))];
 const pricing={currency:'GBP',pricingVersion:lesPaul.pricingVersion,lines,total:lines.reduce((sum,line)=>sum+line.price,0)};
 const specification={wiring:lesPaul.wiring[s.wiring].label,pots:role('potentiometers').quantity+' × '+role('potentiometers').name,shaft:lesPaul.shaft[s.shaft].label,matching:lesPaul.matching[s.matching].label,neck:role('neckToneCapacitor').name,bridge:role('bridgeToneCapacitor').name,bleed:lesPaul.bleed[s.bleed].label+(s.bleed==='none'?'':' · both volume controls'),jack:s.jack==='none'?'Existing output jack · not supplied':role('outputJack').name,selector:s.selector==='none'?'Existing 3-way toggle · not supplied':role('selector').name,model:s.model||'Not specified'};
 const included='Base kit includes: '+parts.filter(part=>part.quantity>0&&part.componentId).map(part=>part.quantity+' × '+part.name).join(', ')+', internal wiring and consumables, hand assembly and electrical testing / QC.';
 const unavailable=parts.filter(part=>part.quantity&&(!part.componentId||part.stockState==='out-of-stock'));for(const choice of invalidKitChoices(value))unavailable.push({role:'selection',name:'Unavailable selection '+choice,stockState:'not-eligible'});
 return {assemblyId:lesPaul.id,family:lesPaul.family,title:lesPaul.name,basePrice:lesPaul.basePrice,configuration:s,components:parts,stockRequirements:physical.stockRequirements,optionAvailability,availability:{status:unavailable.length?'unavailable':'available',unavailable},pricing,specification,included,defaultWarnings:lesPaul.defaultWarnings};
}
export function describeKit(value){return resolveLesPaulKit(value).specification;}
export function priceKit(value){return resolveLesPaulKit(value).pricing;}
export const kitTemplate=Object.freeze({id:'les-paul',version:1,name:lesPaul.name,pickups:2,volumeControls:2,toneControls:2,toneCapacitors:2,selector:'3-way-toggle',output:'mono-jack'});
export function kitRecord(value){
 const resolved=resolveLesPaulKit(value),s=resolved.configuration,c=toneCaps(s);
 return {schemaVersion:3,kitType:kitTemplate.id,kitDefinitionId:resolved.assemblyId,family:resolved.family,kitName:resolved.title,template:structuredClone(kitTemplate),configuration:s,specification:resolved.specification,included:resolved.included,components:structuredClone(resolved.components),stockRequirements:structuredClone(resolved.stockRequirements),resolvedComponents:Object.fromEntries(resolved.components.filter(part=>part.componentId).map(part=>[part.role,{componentId:part.componentId,quantity:part.quantity,component:structuredClone(part.component),selection:structuredClone(part.selection),unitKitPrice:part.unitKitPrice,priceContribution:part.priceContribution}])),potSpecification:{manufacturer:lesPaul.pots[s.pots].label,resistanceOhms:500000,taper:'audio',shaft:lesPaul.shaft[s.shaft].label},toneCapacitors:{neck:{optionId:s.caps==='mixed'?s.neckCap:s.caps,valueMicrofarads:parseFloat(c.neck.value)},bridge:{optionId:s.caps==='mixed'?s.bridgeCap:s.caps,valueMicrofarads:parseFloat(c.bridge.value)}},trebleBleed:{optionId:s.bleed,topology:lesPaul.bleed[s.bleed].topology||'none',quantity:resolved.components.find(part=>part.role==='trebleBleeds').quantity},precisionMatching:{optionId:s.matching,name:lesPaul.matching[s.matching].label,kitAddOn:lesPaul.matching[s.matching].price},pricing:{...resolved.pricing,basePrice:resolved.basePrice}};
}
export function specification(value){const resolved=resolveLesPaulKit(value),s=resolved.specification,p=resolved.pricing;return [resolved.title,...Object.entries(s).map(([k,v])=>`${specLabels[k]}: ${v}`),resolved.included,'',...p.lines.map(l=>`${l.label}: ${l.key==='base'?formatKitPrice(l.price):upgradeLabel(l.price)}`),`KIT TOTAL: ${formatKitPrice(p.total)}`,'Delivery additional, to be confirmed. Online ordering coming soon.'].join('\n');}
export function builderURL(value){return deploymentPath(lesPaul.builder+'?'+new URLSearchParams({kit:'les-paul',config:JSON.stringify(normaliseKit(value))}).toString());}
export function configurationFromURL(search){const params=new URLSearchParams(search);if(!params.has('config'))return null;if(params.get('kit')!=='les-paul')throw new Error('This kit type is not available in this builder.');const raw=params.get('config');if(raw.length>3000)throw new Error('That configuration link could not be read.');let value;try{value=JSON.parse(raw);}catch{throw new Error('That configuration link could not be read.');}if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('That configuration link could not be read.');const invalid=invalidKitChoices(value);if(invalid.length)throw new Error('Previously selected kit options are no longer eligible: '+invalid.join(', ')+'.');return normaliseKit(value);}

export function specificationURL(value){const url=builderURL(value);return deploymentPath('/wiring-kits/specification/'+url.slice(url.indexOf('?')));}
