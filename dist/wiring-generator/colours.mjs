// Coil functions stay independent of manufacturer lead colours. Model-specific entries may override a verified convention.
export const conductorRoles={hot:'northStart',linkA:'northFinish',linkB:'southFinish',ground:'southStart',shield:'shield'};
const generic={northStart:['#303b43','NORTH START / HOT'],northFinish:['#926f31','NORTH FINISH'],southFinish:['#926f31','SOUTH FINISH'],southStart:['#7a8187','SOUTH START / GROUND'],shield:['#999999','BARE SHIELD']};
export const pickupConventions={
 generic:{label:'Generic / Unspecified',verified:true,functions:generic,models:{}},
 duncan:{label:'Seymour Duncan · standard 4-conductor',verified:true,functions:{northStart:['#202020','BLACK'],northFinish:['#d7d7d7','WHITE'],southFinish:['#b91c1c','RED'],southStart:['#426d48','GREEN'],shield:['#999999','BARE']},source:'https://www.seymourduncan.com/blog/latest-updates/guitar-wiring-explored-humbucker-internals',models:{}},
 ...Object.fromEntries([['dimarzio','DiMarzio'],['gibson','Gibson'],['fender','Fender'],['warman','Warman'],['tonerider','Tonerider'],['prs','PRS'],['bareknuckle','Bare Knuckle']].map(([id,label])=>[id,{label,verified:false,functions:null,models:{}}]))
};
export function resolveConvention(id,model){const base=pickupConventions[id]||pickupConventions.generic,entry=base.models?.[model]||base,functions=entry.verified?entry.functions:generic;return {...entry,label:entry.label+(entry.verified?'':' · Colour code not yet verified; generic conductors shown'),wires:Object.fromEntries(Object.entries(conductorRoles).map(([role,fn])=>[role,functions[fn]]))};}
export const colourCodes=Object.fromEntries(Object.keys(pickupConventions).map(id=>[id,resolveConvention(id)]));
