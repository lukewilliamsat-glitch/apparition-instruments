// Reusable response analysis. All curves use the existing fixed-source engine;
// inspection interpolates sampled dB on the logarithmic frequency axis.
import {frequencyResponse,dbFloor} from './engine.mjs';
import {bleedSummary,topologyOf,fields} from './circuits.mjs';

export const comparisonModes=Object.freeze({live:'Live only',ab:'Same-volume A/B',frozen:'Frozen reference'});
export const responseRange=Object.freeze({min:20,max:20000});
// Describes electrical magnitude, never a hearing threshold or a tone judgement.
export const magnitudeThresholds=Object.freeze({negligible:.1,subtle:1,moderate:6});
export function magnitudeInterpretation(delta){
 const value=Math.abs(delta);if(!Number.isFinite(value))throw Error('Invalid response difference.');
 return value<magnitudeThresholds.negligible?'Negligible':value<magnitudeThresholds.subtle?'Subtle':value<magnitudeThresholds.moderate?'Moderate':'Strong';
}
export function frequencyFromFraction(fraction){
 if(!Number.isFinite(fraction))throw Error('Invalid inspection position.');
 return responseRange.min*Math.pow(responseRange.max/responseRange.min,Math.max(0,Math.min(1,fraction)));
}
export function fractionFromFrequency(frequency){
 if(!Number.isFinite(frequency)||frequency<=0)throw Error('Invalid inspection frequency.');
 return Math.max(0,Math.min(1,Math.log(frequency/responseRange.min)/Math.log(responseRange.max/responseRange.min)));
}
export function interpolateResponse(points,frequency){
 if(!points?.length||!Number.isFinite(frequency)||frequency<=0)throw Error('Invalid sampled response.');
 if(frequency<=points[0].frequency)return points[0].current;
 if(frequency>=points.at(-1).frequency)return points.at(-1).current;
 let low=0,high=points.length-1;while(high-low>1){const mid=(low+high)>>1;if(points[mid].frequency<=frequency)low=mid;else high=mid;}
 const a=points[low],b=points[high],t=Math.log(frequency/a.frequency)/Math.log(b.frequency/a.frequency);
 return a.current+t*(b.current-a.current);
}
export function inspectResponse(report,frequency){
 const f=Math.max(responseRange.min,Math.min(responseRange.max,frequency));
 const current=interpolateResponse(report.points,f),reference=report.reference?interpolateResponse(report.reference,f):null;
 return {frequency:f,current,reference,delta:reference===null?null:current-reference,clipped:current<=dbFloor||reference!==null&&reference<=dbFloor};
}
export function strongestDifference(points,reference){
 if(!reference)return null;let strongest=null;
 for(const point of points){const other=interpolateResponse(reference,point.frequency),delta=point.current-other;
  if(!strongest||Math.abs(delta)>Math.abs(strongest.delta))strongest={frequency:point.frequency,current:point.current,reference:other,delta,clipped:point.current<=dbFloor||other<=dbFloor};
 }return strongest;
}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function captureResponse(report){
 if(!report?.supported)throw Error('Select a supported single pickup before freezing.');
 return freeze(structuredClone({channel:report.channel,state:report.state,points:report.points,bleed:report.bleed}));
}
export function referenceDescription(snapshot){
 return `${snapshot.channel==='neck'?'Neck':'Bridge'} · Volume ${snapshot.state.volume.toFixed(1)} · Tone ${snapshot.state.tonePosition.toFixed(1)} · ${bleedSummary(snapshot.state)} · ${snapshot.state.toneCap/1000} µF · Pots ${snapshot.state.volumePot}/${snapshot.state.tonePot} kΩ · Cable ${snapshot.state.cableC} pF · Input ${snapshot.state.loadR} MΩ · Pickup ${snapshot.state.pickupR} kΩ / ${snapshot.state.pickupL} H / ${snapshot.state.pickupC} pF`;
}
const bleedIdentity=state=>JSON.stringify([topologyOf(state),topologyOf(state)==='none'?null:state.bleedC,['parallel','series'].includes(topologyOf(state))?state.bleedR:null]);
export function responseChanges(previous,current){
 if(!previous)return [];
 const changes=[];
 if(previous.channel!==current.channel)changes.push({key:'channel',label:'Pickup analysis changed',why:'Each channel uses its own Volume, Tone and tone capacitor. Pickup electrical assumptions are explicit; conductor colours do not select a measured pickup model.'});
 const reasons={volume:'Volume changes the resistive divider and its interaction with cable and input loading.',tonePosition:'Tone changes the resistance in series with the tone capacitor, altering the frequency-dependent load on the pickup.',cableC:'Cable capacitance changes the frequency-dependent output load and pickup/cable resonant behaviour.',loadR:'Input resistance changes resistive loading at the output.',pickupR:'Pickup resistance changes source impedance and damping.',pickupL:'Pickup inductance changes frequency-dependent source impedance and the resonant behaviour with capacitance.',pickupC:'Pickup capacitance changes the frequency-dependent load at the pickup input.',toneCap:'The tone capacitor changes the impedance of the tone branch; its effect depends on frequency and the Tone position.'};
 for(const key of ['volume','tonePosition','toneCap','volumePot','tonePot','cableC','loadR','pickupR','pickupL','pickupC'])if(previous.state[key]!==current.state[key])changes.push({key,label:(key==='toneCap'?'Tone capacitor':key==='tonePosition'?'Tone':fields[key].label)+' changed',why:reasons[key]||'Pot resistance changes loading and the control network.'});
 if(bleedIdentity(previous.state)!==bleedIdentity(current.state))changes.push({key:'bleed',label:'Treble bleed changed',why:bleedCause(current.state)});
 return changes;
}
function bleedCause(state){
 const topology=topologyOf(state);
 if(topology==='none')return 'With no treble bleed, there is no additional path around the upper portion of the Volume control.';
 const base='The capacitor provides a frequency-dependent path around the upper portion of the Volume control.';
 return base+(topology==='parallel'?' The parallel resistor also changes that path at lower frequencies.':topology==='series'?' The series resistor limits the capacitor path.':'')+' The resulting change depends on pickup loading, cable capacitance and control positions.';
}
const formatFrequency=f=>f>=1000?(f/1000).toFixed(2)+' kHz':f.toFixed(0)+' Hz';
export function composeResponse(report,{mode='ab',frozen=null,previous=null}={}){
 if(!Object.hasOwn(comparisonModes,mode))throw Error('Unsupported response comparison mode.');
 if(!report.supported)return {...report,mode,reference:null,difference:null,changes:[],explanation:null};
 const reference=mode==='live'?null:mode==='frozen'?frozen?.points||null:report.reference||frequencyResponse({...report.state,type:'none'},report.points.length);
 const baseline=mode==='frozen'?frozen:mode==='ab'?{channel:report.channel,state:{...report.state,type:'none'}}:null;
 const difference=strongestDifference(report.points,reference),changes=responseChanges(previous,report),comparedChanges=baseline?responseChanges(baseline,report):[];
 const currentLabel='Current circuit'+(report.state.type!=='none'?' · with treble bleed':' · no treble bleed');
 const referenceLabel=mode==='frozen'&&frozen?'Frozen reference · '+referenceDescription(frozen):mode==='ab'?'Reference · no treble bleed · same Volume '+report.state.volume.toFixed(1)+' / 10':'';
 let what,why;
 if(!difference){what=mode==='frozen'?'No frozen reference captured. Freeze the current response, then change the circuit to compare.':`Live response for ${report.channel} at Volume ${report.state.volume.toFixed(1)} / 10 and Tone ${report.state.tonePosition.toFixed(1)} / 10. No comparison curve is displayed.`;why=changes.length?[...new Set(changes.map(change=>change.why))].join(' '):bleedCause(report.state);}
 else if(difference.clipped){what='A response reaches the −100 dB display floor. The plotted difference is clipped and is not an exact output ratio.';why=report.state.volume===0?'Volume 0 mutes the modelled current output.':baseline?.state.volume===0?'The frozen reference has Volume 0 and is muted.':'Very low modelled output is limited by the display floor.';}
 else if(Math.abs(difference.delta)<.1){what=`Negligible electrical difference: the largest sampled separation is ${Math.abs(difference.delta).toFixed(2)} dB across 20 Hz–20 kHz.`;if(mode==='ab'&&report.state.volume===10&&report.state.type!=='none')what='Treble bleed effectively inactive at full volume. '+what;why=mode==='ab'&&report.state.volume===10&&report.state.type!=='none'?'Treble bleed effectively inactive at full volume: the upper Volume segment is bypassed by the wiper, so the fitted network makes no difference in this model.':mode==='ab'&&report.state.type==='none'?'Both curves represent the same circuit without a treble bleed.':'The current and reference curves agree within the stated 0.1 dB threshold.';}
 else{const label=magnitudeInterpretation(difference.delta);what=`${label} electrical difference: at ${formatFrequency(difference.frequency)}, the current circuit has ${Math.abs(difference.delta).toFixed(2)} dB ${difference.delta>0?'more':'less'} output than ${mode==='ab'?'the no-bleed reference at the same Volume':'the frozen reference'}. This is the largest absolute separation among the plotted samples.`;
  why=mode==='ab'?bleedCause(report.state):comparedChanges.length?[...new Set(comparedChanges.map(change=>change.why))].join(' '):'The saved and current model states are electrically equivalent.';
 }
 const caveat='Electrical voltage transfer at the guitar output relative to the same ideal source. Amplifier/loudspeaker response and acoustic perception are not modelled; these magnitude categories do not predict audibility.';
 return {...report,mode,reference,baseline,difference,changes,comparedChanges,legend:{current:currentLabel,reference:referenceLabel},explanation:{what,why,caveat,magnitude:difference&&!difference.clipped?magnitudeInterpretation(difference.delta):null},summary:what};
}
