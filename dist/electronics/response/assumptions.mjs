// Explicit illustrative lumped electrical assumptions, not measured products.
import {defaults,validateState} from './circuits.mjs';
export const pickupPresets=Object.freeze({
 generic:Object.freeze({label:'Generic humbucker',pickupR:8.2,pickupL:4.5,pickupC:120}),
 low:Object.freeze({label:'Lower-inductance humbucker',pickupR:7,pickupL:2.5,pickupC:100}),
 high:Object.freeze({label:'Higher-inductance humbucker',pickupR:12,pickupL:7,pickupC:150}),
 single:Object.freeze({label:'Generic single coil',pickupR:6,pickupL:2.2,pickupC:100})
});
export const componentPresets=Object.freeze({volumePot:[250,300,500,1000],tonePot:[250,300,500,1000],cableC:[200,500,800,1200],loadR:[.5,1,2]});
export function defaultResponseAssumptions(){return {channels:{neck:{pickup:'generic',volumePot:500,tonePot:500},bridge:{pickup:'generic',volumePot:500,tonePot:500}},cableC:500,loadR:1};}
export function resolveResponseAssumptions(assumptions,channel){
 const a=assumptions||defaultResponseAssumptions(),c=a.channels[channel],preset=pickupPresets[c?.pickup];
 if(!preset)throw Error('Unsupported pickup electrical assumption.');
 for(const key of ['volumePot','tonePot'])if(!componentPresets[key].includes(c[key]))throw Error('Unsupported pot assumption.');
 for(const key of ['cableC','loadR'])if(!componentPresets[key].includes(a[key]))throw Error('Unsupported load assumption.');
 const state={...defaults,...preset,volumePot:c.volumePot,tonePot:c.tonePot,cableC:a.cableC,loadR:a.loadR};delete state.label;validateState(state);
 return state;
}
