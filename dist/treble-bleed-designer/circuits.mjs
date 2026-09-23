// Electrical topologies only. No product, price, inventory or commercial preset data.
export const types={none:{label:'None',topology:'none'},capacitor:{label:'Capacitor Only',topology:'capacitor'},duncan:{label:'Duncan Style',topology:'parallel'},kinman:{label:'Kinman Style',topology:'series'},custom:{label:'Custom',topology:null}};
export const topologies={capacitor:'Capacitor only',parallel:'Parallel RC',series:'Series RC'};
export function topologyOf(state){return types[state.type]?.topology??(state.type==='custom'&&Object.hasOwn(topologies,state.topology)?state.topology:null);}
export const defaults=Object.freeze({pickupR:8.2,pickupL:4.5,pickupC:120,volumePot:500,tonePot:500,toneCap:22,loadR:1,cableC:500,type:'none',topology:'parallel',bleedC:1,bleedR:150,volume:7});
export const fields={
 pickupR:{label:'Pickup resistance',unit:'kΩ',min:.01,max:1000},pickupL:{label:'Pickup inductance',unit:'H',min:0,max:100},pickupC:{label:'Pickup capacitance',unit:'pF',min:0,max:100000},
 volumePot:{label:'Volume pot',unit:'kΩ',min:1,max:10000},tonePot:{label:'Tone pot',unit:'kΩ',min:1,max:10000},toneCap:{label:'Tone capacitor',unit:'nF',min:0,max:1000},
 loadR:{label:'Amplifier / input load',unit:'MΩ',min:.001,max:100},cableC:{label:'Cable capacitance',unit:'pF',min:0,max:100000},
 bleedC:{label:'Bleed capacitance',unit:'nF',min:.001,max:1000},bleedR:{label:'Bleed resistance',unit:'kΩ',min:.001,max:10000},volume:{label:'Volume',unit:'',min:0,max:10}
};
export function validateState(state){
 const topology=topologyOf(state);if(!topology)throw new Error('Choose a supported treble bleed type and topology.');
 for(const [key,field] of Object.entries(fields)){if(key==='bleedC'&&topology==='none'||key==='bleedR'&&['none','capacitor'].includes(topology))continue;const value=state[key];if(typeof value!=='number'||!Number.isFinite(value)||value<field.min||value>field.max)throw new Error(`${field.label}: enter ${field.min}–${field.max} ${field.unit}.`);}
 return state;
}
export function bleedSummary(state){const topology=topologyOf(state);return topology==='none'?'None':topology==='capacitor'?`${state.bleedC}nF capacitor`:`${state.bleedC}nF + ${state.bleedR}kΩ ${topology==='parallel'?'parallel':'series'}`;}
