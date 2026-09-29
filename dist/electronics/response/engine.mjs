import {validateState,topologyOf} from './circuits.mjs';
// Complex numbers [real, imaginary]; impedances in ohms, capacitances in farads.
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const inv=a=>{const d=a[0]*a[0]+a[1]*a[1];return [a[0]/d,-a[1]/d];};
export function audioTaper(knob){if(!Number.isFinite(knob)||knob<0||knob>10)throw new Error('Volume must be between 0 and 10.');return Math.expm1(Math.log(81)*knob/10)/80;}
export function bleedAdmittance(topology,frequency,capacitance,resistance){const w=2*Math.PI*frequency;if(topology==='none')return [0,0];const yc=[0,w*capacitance];if(topology==='capacitor')return yc;if(topology==='parallel')return add(yc,[1/resistance,0]);if(topology==='series')return inv([resistance,-1/(w*capacitance)]);throw new Error('Unsupported topology.');}
// Nodes: A = pickup / volume input / modern tone branch; B = wiper / cable / amp.
// Source is an ideal induced voltage followed by pickup R + jωL; Cp shunts A.
// Tone pot acts as a variable series resistance from input to the tone capacitor.
function transfer(state,frequency){
 const x=audioTaper(state.volume);if(x===0)return [0,0];
 const w=2*Math.PI*frequency,rv=state.volumePot*1000,zPickup=[state.pickupR*1000,w*state.pickupL],yPickupC=[0,w*state.pickupC*1e-12],yLoad=[1/(state.loadR*1e6),w*state.cableC*1e-12];
 const yTone=state.toneCap===0?[0,0]:inv([state.tonePot*1000*audioTaper(state.tonePosition??10),-1/(w*state.toneCap*1e-9)]);
 if(state.volume===10){const y=add(add(yPickupC,yTone),add([1/rv,0],yLoad));return inv(add([1,0],mul(zPickup,y)));}
 const zLower=inv(add([1/(rv*x),0],yLoad));
 const yBleed=bleedAdmittance(topologyOf(state),frequency,state.bleedC*1e-9,state.bleedR*1000);
 const zUpper=inv(add([1/(rv*(1-x)),0],yBleed)),zBranch=add(zUpper,zLower),yA=add(add(yPickupC,yTone),inv(zBranch));
 return mul(inv(add([1,0],mul(zPickup,yA))),mul(zLower,inv(zBranch)));
}
export function responseAt(state,frequency){validateState(state);if(!Number.isFinite(frequency)||frequency<=0)throw new Error('Frequency must be positive.');return transfer(state,frequency);}
// Fixed source-voltage reference, not per-curve normalisation. Zero output is plotted at the -100 dB floor.
export const dbFloor=-100;
export function magnitudeDB(value){const magnitude=Math.hypot(...value);if(!Number.isFinite(magnitude))throw new Error('The model could not calculate these values.');return magnitude===0?dbFloor:Math.max(dbFloor,20*Math.log10(magnitude));}
export function frequencyResponse(state,count=301){validateState(state);if(!Number.isInteger(count)||count<2||count>5000)throw new Error('Invalid sample count.');const full={...state,volume:10};return Array.from({length:count},(_,i)=>{const frequency=20*Math.pow(1000,i/(count-1));return {frequency,current:magnitudeDB(transfer(state,frequency)),reference:magnitudeDB(transfer(full,frequency))};});}
