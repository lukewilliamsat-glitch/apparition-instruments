// Wiring-kit discovery is driven by structured catalogue data, never product names.
export const kitCandidateCategories=Object.freeze([
 {key:'potentiometers',label:'Potentiometers'},
 {key:'capacitors',label:'Tone Capacitors'},
 {key:'treble-bleeds',label:'Treble Bleeds'},
 {key:'switches',label:'Selector Switches'},
 {key:'jacks',label:'Output Jacks'}
]);
const text=value=>String(value??'').trim();
const option=(key,label,order)=>({key,label,order,enabled:true});
export function toneCapacitance(component){
 const match=/^((?:\d+(?:\.\d+)?|\.\d+))\s*(µf|μf|uf|nf)$/i.exec(text(component?.specs?.Value));
 if(!match)return null;
 const microfarads=Number(match[1])/(match[2].toLowerCase()==='nf'?1000:1);
 // The existing Generator represents these three electrical values exactly.
 return ['0.022','0.033','0.047'].find(value=>Math.abs(microfarads-Number(value))<1e-9)||null;
}
// Existing Les Paul circuit: 500k audio standard pots, passive tone caps,
// supported treble-bleed networks, 3-way toggles and mono output jacks.
// Stock is intentionally absent: availability is checked after configuration.
export function kitComponentCompatibility(component){
 const specs=component?.specs||{};
 switch(component?.category){
  case 'potentiometers':return !!potentiometerVariant(component);
  case 'capacitors':return !!toneCapacitance(component);
  case 'treble-bleeds':return /^(?:capacitor only|capacitor \+ resistor in parallel)$/i.test(text(specs.Topology));
  case 'switches':return /^3\s*[- ]?way toggle$/i.test(text(specs['Switch type']))&&text(specs.Positions)==='3';
  case 'jacks':return /^mono$/i.test(text(specs['Jack type']));
  default:return false;
 }
}
export function discoverKitCandidates(records){
 const output=Object.fromEntries(kitCandidateCategories.map(category=>[category.key,[]]));
 for(const component of records)if(component?.active&&component.inKits&&output[component.category]&&kitComponentCompatibility(component))output[component.category].push(component);
 for(const items of Object.values(output))items.sort((a,b)=>(a.manufacturer||'').localeCompare(b.manufacturer||'')||a.name.localeCompare(b.name));
 return output;
}
export function potentiometerVariant(component){
 if(component?.category!=='potentiometers')return null;
 const brand=text(component.manufacturer),resistance=text(component.specs?.Resistance).toLowerCase().replace(/\s|ω|ohms?/g,''),taper=text(component.specs?.Taper).toLowerCase(),shaftText=text(component.specs?.Shaft).toLowerCase(),type=text(component.specs?.Type).toLowerCase();
 const resistanceOhms=/^500k/.test(resistance)||/^500000/.test(resistance)?500000:null,taperKey=taper.includes('audio')||/^a(?:\b|\s|\/)/.test(taper)?'audio':null,shaft=shaftText.includes('short')?'short':shaftText.includes('long')?'long':null;
 if(!brand||resistanceOhms!==500000||taperKey!=='audio'||!shaft||type!=='standard')return null;
 return {brand,shaft,resistanceOhms,taper:taperKey};
}
export function extendPotentiometerDefinition(definition,records,{includeUnpermitted=false}={}){
 const next=structuredClone(definition),brandGroup=next.builderOptions.find(group=>group.key==='pots'),shaftGroup=next.builderOptions.find(group=>group.key==='shaft'),resolver=next.componentResolvers.find(item=>item.key==='potentiometers');
 if(!brandGroup||!shaftGroup||!resolver)return next;
 const candidates=discoverKitCandidates(records).potentiometers.filter(component=>includeUnpermitted||next.permittedComponentIds.includes(component.id)).map(component=>({component,variant:potentiometerVariant(component)})),brands=[...new Set(candidates.map(item=>item.variant.brand))];
 for(const brand of brands)if(!brandGroup.values.some(value=>value.key===brand))brandGroup.values.push(option(brand,brand,brandGroup.values.length*10+10));
 for(const shaft of [...new Set(candidates.map(item=>item.variant.shaft))])if(!shaftGroup.values.some(value=>value.key===shaft))shaftGroup.values.push(option(shaft,shaft==='short'?'Short Shaft':'Long Shaft',shaftGroup.values.length*10+10));
 for(const brand of brands)for(const shaft of shaftGroup.values.map(value=>value.key)){
  const selection={pots:brand,shaft},existing=resolver.mappings.find(mapping=>mapping.selection.pots===brand&&mapping.selection.shaft===shaft);
  const matches=candidates.filter(item=>item.variant.brand===brand&&item.variant.shaft===shaft);
  if(existing)continue; // Saved mappings, including unavailable, remain authoritative.
  resolver.mappings.push({selection,componentId:matches.length===1?matches[0].component.id:null});
 }
 return next;
}
