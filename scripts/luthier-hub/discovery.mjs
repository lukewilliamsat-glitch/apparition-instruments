// Intent families select one human-useful canonical guide, never duplicate keyword pages.
const primaryIntents=[
 {guide:'pots',queries:['guitar potentiometers explained']},
 {guide:'values',queries:['250k vs 500k pots']},
 {guide:'taper',queries:['audio vs linear taper guitar pots']},
 {guide:'lugs',queries:['guitar pot lug numbering','guitar volume pot wiring']},
 {guide:'tone',queries:['how guitar tone controls work','guitar tone pot wiring']},
 {guide:'capacitor-values',queries:['0.022 vs 0.047 guitar capacitor','guitar tone capacitor values']},
 {guide:'bleeds',queries:['guitar treble bleed','treble bleed explained','treble bleed capacitor resistor','treble bleed values','cap only vs resistor treble bleed']},
 {guide:'circuits',queries:['guitar wiring explained']},
 {guide:'lp-controls',queries:['Les Paul wiring','how Les Paul controls work']},
 {guide:'modern-50s',queries:['modern vs 50s wiring']},
 {guide:'toggle-guide',queries:['guitar selector wiring']},
 {guide:'grounding-guide',queries:['guitar grounding']},
 {guide:'coil-split-guide',queries:['coil split wiring'],limits:'Supported configurations only; no universal physical pinout.'},
 {guide:'series-parallel-guide',queries:['series parallel guitar wiring'],limits:'Conceptual comparison; alternate parallel connection recipes are not added.'}
];
const supporting={pots:['values','taper','lugs','lp-controls'],values:['pots','taper','tone'],taper:['pots','values','bleeds'],lugs:['pots','toggle-guide','grounding-guide'],tone:['capacitor-values','caps','modern-50s'], 'capacitor-values':['tone','caps'],bleeds:['caps','tone','modern-50s'],circuits:['lugs','install','lp-controls','modern-50s'],'lp-controls':['circuits','modern-50s','tone'],'modern-50s':['lp-controls','tone','caps'],'toggle-guide':['switches','lugs'],'grounding-guide':['ground','troubleshoot','lugs'],'coil-split-guide':['pickups','lugs','switches'],'series-parallel-guide':['pickups','coil-split-guide']};
export const searchIntents=primaryIntents.map(item=>({...item,id:item.guide,primary:item.guide,supporting:supporting[item.guide]}));
// Supporting pages retain their own canonical; these are intent nominations, not redirects.
export const metadataRoles={
 caps:{title:'Guitar Capacitors: Units, Types & Specifications',description:'Read capacitor units, tolerance, construction and physical specifications. For choosing 0.022 versus 0.047 µF, continue to the dedicated value comparison.'},
 switches:{title:'Guitar Switches: Contact & Selector Reference',description:'Identify switch contacts and selector concepts before transferring a circuit to a physical part. Use the dedicated toggle guide for the supported three-way wiring route.'},
 ground:{title:'Guitar Ground, Shield & Output Jack Reference',description:'Identify signal return, shield and jack TIP/sleeve functions. For a fault-finding sequence, continue to the guitar grounding problems guide.'}
};
export const categoryConnections={
 potentiometers:{tools:['signal','wiring'],component:'potentiometers'},'tone-controls':{tools:['signal'],component:'capacitors'},'treble-bleeds':{tools:['bleed'],component:'treble-bleeds'},wiring:{tools:['wiring'],component:'potentiometers'},pickups:{tools:['wiring'],component:null},troubleshooting:{tools:['wiring'],component:null}
};
export function discoveryAuthority(library,categories,tools,components,base){
 const byId=new Map(library.map(a=>[a.id,a])),guide=id=>{const a=byId.get(id);if(!a)throw Error('Unknown discovery guide '+id);return {id,canonical:base+'/luthier-hub/'+a.slug+'/'};};
 return {version:2,intents:searchIntents.map(item=>{const a=byId.get(item.primary),category=categories.find(c=>c.id===a.category);return {...item,canonical:guide(item.primary).canonical,primary:guide(item.primary),supporting:item.supporting.map(guide),category:{id:category.id,canonical:base+'/luthier-hub/categories/'+category.id+'/'},tools:a.tools.map(id=>({id,...tools[id]})),component:components[a.component]?{id:a.component,...components[a.component]}:null};})};
}
export const relationAdditions={pots:['lp-controls'],values:['lugs'], 'modern-50s':['lp-controls','tone','caps'],'coil-split-guide':['lugs','switches'],lugs:['toggle-guide','grounding-guide'],tone:['modern-50s'],bleeds:['modern-50s'],circuits:['modern-50s','lp-controls'],pickups:['coil-split-guide','series-parallel-guide'],switches:['toggle-guide'],ground:['grounding-guide'],troubleshoot:['grounding-guide']};
