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
 // The Builder groups physical parts by their structured value. The separate
 // Generator retains its own supported-value boundary.
 return Number.isFinite(microfarads)&&microfarads>0&&microfarads<=1?String(Number(microfarads.toFixed(9))):null;
}
// Existing Les Paul circuit: 500k audio standard pots, passive tone caps,
// supported treble-bleed networks, 3-way toggles and mono output jacks.
// Stock is intentionally absent: availability is checked after configuration.
export function kitComponentCompatibility(component){
 return kitComponentIneligibility(component)===null;
}
export function kitComponentIneligibility(component){
 const specs=component?.specs||{};
 switch(component?.category){
  case 'potentiometers':{
   if(!text(component.manufacturer))return 'Manufacturer is required for a customer-facing choice.';
   if(!/^(?:500\s*k(?:ω|ohms?)?|500000\s*(?:ω|ohms?)?)$/i.test(text(specs.Resistance)))return 'Nominal resistance must be explicitly 500kΩ; '+(text(specs.Resistance)?'"'+text(specs.Resistance)+'" does not establish that value.':'enter a value with units.');
   if(!(/audio/i.test(text(specs.Taper))||/^a(?:\b|\s|\/)/i.test(text(specs.Taper))))return 'Audio taper is required.';
   if(!/^(?:short|long)(?:\s*shaft)?$/i.test(text(specs.Shaft)))return 'Shaft must be Short or Long.';
   if(!/^standard$/i.test(text(specs.Type)))return 'Type must be Standard.';
   return null;
  }
  case 'capacitors':return toneCapacitance(component)?null:'Enter a positive structured capacitance in µF or nF.';
  case 'treble-bleeds':return /^(?:capacitor only|capacitor \+ resistor in parallel)$/i.test(text(specs.Topology))?null:'Topology must be Capacitor only or Capacitor + resistor in parallel.';
  case 'switches':return /^3\s*[- ]?way toggle$/i.test(text(specs['Switch type']))&&text(specs.Positions)==='3'?null:'Switch type must be 3-Way Toggle with 3 positions.';
  case 'jacks':return /^mono$/i.test(text(specs['Jack type']))?null:'Jack type must be Mono.';
  default:return 'Category is not supported by this kit.';
 }
}
// This is also the Admin editor's candidate source. Unsupported specifications stay visible.
export function kitAdminCandidates(records,permittedComponentIds=[]){
 const permitted=new Set(permittedComponentIds),output=Object.fromEntries(kitCandidateCategories.map(category=>[category.key,[]]));
 for(const component of records){
  if(!Object.hasOwn(output,component?.category)||!(component.active&&component.inKits||permitted.has(component.id)))continue;
  const reason=!component.active?'Component is inactive.':!component.inKits?'Not marked Available in wiring kits.':kitComponentIneligibility(component);
  output[component.category].push({component,permitted:permitted.has(component.id),eligible:reason===null,reason});
 }
 for(const items of Object.values(output))items.sort((a,b)=>(a.component.manufacturer||'').localeCompare(b.component.manufacturer||'')||a.component.name.localeCompare(b.component.name));
 return output;
}
export function discoverKitCandidates(records){
 const output=Object.fromEntries(kitCandidateCategories.map(category=>[category.key,[]]));
 for(const component of records)if(component?.active&&component.inKits&&output[component.category]&&kitComponentCompatibility(component))output[component.category].push(component);
 for(const items of Object.values(output))items.sort((a,b)=>(a.manufacturer||'').localeCompare(b.manufacturer||'')||a.name.localeCompare(b.name));
 return output;
}
export function potentiometerVariant(component){
 if(component?.category!=='potentiometers')return null;
 if(kitComponentIneligibility(component))return null;
 const brand=text(component.manufacturer),shaft=/^short/i.test(text(component.specs.Shaft))?'short':'long';
 return {brand,shaft,resistanceOhms:500000,taper:'audio'};
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
  // Only create mappings for physical variants. No speculative Long Shaft row.
  if(matches.length)resolver.mappings.push({selection,componentId:matches.length===1?matches[0].component.id:null});
 }
 return next;
}
