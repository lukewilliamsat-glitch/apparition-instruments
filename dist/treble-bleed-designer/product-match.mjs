import {topologyOf} from './circuits.mjs';
import {eligibleProduct} from '../products/model.mjs?v=p11';

const multipliers={pF:1,nF:1000,'µF':1000000};
const scaled=value=>Number.isFinite(value)&&value>0?BigInt(Math.round(value*1000000)):null;
export function capacitanceIdentity(value){
 if(!value||!Object.hasOwn(multipliers,value.unit))return null;
 const amount=scaled(value.value);return amount===null?null:amount*BigInt(multipliers[value.unit]);
}
export function exactBleedMatches(state,products){
 const topology=topologyOf(state),cap=capacitanceIdentity({value:state.bleedC,unit:'nF'});
 if(!topology||topology==='none'||cap===null||topology!=='capacitor'&&scaled(state.bleedR)===null)return [];
 return products.filter(p=>{
  if(!eligibleProduct(p)||p.category!=='treble-bleeds')return false;
  const saved=p.technicalSpecs?.trebleBleed;
  if(!saved||saved.topology!==topology||capacitanceIdentity(saved.capacitor)!==cap)return false;
  return topology==='capacitor'?saved.resistorKohms===undefined||saved.resistorKohms===null:scaled(saved.resistorKohms)===scaled(state.bleedR);
 }).sort((a,b)=>a.name.localeCompare(b.name,'en-GB')||a.id.localeCompare(b.id,'en-GB'));
}
