import {lesPaul,formatKitPrice,upgradeLabel} from '../wiring-kits/kit-data.mjs';
export {lesPaul,formatKitPrice,upgradeLabel};
export const defaults=Object.freeze({...lesPaul.defaults});
export const options=Object.freeze({...Object.fromEntries(['wiring','pots','shaft','matching','bleed','jack','selector'].map(k=>[k,Object.keys(lesPaul[k])])),caps:[...Object.keys(lesPaul.capacitors),'mixed'],neckCap:Object.keys(lesPaul.capacitors),bridgeCap:Object.keys(lesPaul.capacitors)});
export const bleedNames=Object.freeze(Object.fromEntries(Object.entries(lesPaul.bleed).map(([k,v])=>[k,v.label])));
export const specLabels=Object.freeze({wiring:'Wiring',pots:'Potentiometers',shaft:'Shaft length',matching:'Pot selection',neck:'Neck tone capacitor',bridge:'Bridge tone capacitor',bleed:'Treble bleed',jack:'Output jack',selector:'Selector switch',model:'Guitar model / year'});
const legacyCaps={'0.022':'715p-022','0.033':'nissei-033','0.047':'225p-047'};
export function normaliseKit(value={}){
 const input=value&&typeof value==='object'?{...value}:{},result={...defaults};
 for(const k of ['caps','neckCap','bridgeCap'])if(legacyCaps[input[k]])input[k]=legacyCaps[input[k]];
 for(const [key,allowed] of Object.entries(options))if(allowed.includes(input[key]))result[key]=input[key];
 result.model=typeof input.model==='string'?input.model.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,120):'';
 if(result.wiring==='50s')result.bleed='none';return result;
}
export function toneCaps(value){const s=normaliseKit(value);return {neck:lesPaul.capacitors[s.caps==='mixed'?s.neckCap:s.caps],bridge:lesPaul.capacitors[s.caps==='mixed'?s.bridgeCap:s.caps]};}
export function describeKit(value){const s=normaliseKit(value),c=toneCaps(s);return {wiring:lesPaul.wiring[s.wiring].label,pots:'4 × '+lesPaul.pots[s.pots].label,shaft:lesPaul.shaft[s.shaft].label,matching:lesPaul.matching[s.matching].label,neck:c.neck.label,bridge:c.bridge.label,bleed:lesPaul.bleed[s.bleed].label+(s.bleed==='none'?'':' · both volume controls'),jack:s.jack==='none'?'Existing output jack · not supplied':lesPaul.jack[s.jack].label,selector:s.selector==='none'?'Existing 3-way toggle · not supplied':lesPaul.selector[s.selector].label,model:s.model||'Not specified'};}
export function priceKit(value){
 const s=normaliseKit(value),c=toneCaps(s),lines=[{key:'base',label:lesPaul.name,price:lesPaul.basePrice}];
 for(const key of ['wiring','pots','shaft','matching'])lines.push({key,label:lesPaul[key][s[key]].label,price:lesPaul[key][s[key]].price});
 lines.push({key:'capacitors',label:c.neck===c.bridge?'2 × '+c.neck.label:'Neck: '+c.neck.label+' / Bridge: '+c.bridge.label,price:c.neck.price+c.bridge.price});
 for(const key of ['bleed','jack','selector'])lines.push({key,label:lesPaul[key][s[key]].label+(key==='bleed'&&s.bleed!=='none'?' · pair':''),price:lesPaul[key][s[key]].price});
 return {currency:'GBP',pricingVersion:lesPaul.pricingVersion,lines,total:lines.reduce((sum,line)=>sum+line.price,0)};
}
export const kitTemplate=Object.freeze({id:'les-paul',version:1,name:lesPaul.name,pickups:2,volumeControls:2,toneControls:2,toneCapacitors:2,selector:'3-way-toggle',output:'mono-jack'});
export function kitRecord(value){
 const configuration=normaliseKit(value),s=configuration,c=toneCaps(s);
 const part=(role,option,quantity,supplied=true)=>({role,quantity,supplied,componentId:option.componentId||null,name:option.component?.productTitle||option.label,...(option.component?{component:structuredClone(option.component)}:{}),kitAddOn:option.price,priceBasis:role==='potentiometers'?'four-pot set':role==='trebleBleeds'?'pair of volume controls':'one component'});
 const components=[part('potentiometers',lesPaul.shaft[s.shaft],4),part('neckToneCapacitor',c.neck,1),part('bridgeToneCapacitor',c.bridge,1),part('trebleBleeds',lesPaul.bleed[s.bleed],s.bleed==='none'?0:2,s.bleed!=='none'),part('outputJack',lesPaul.jack[s.jack],1,s.jack!=='none'),part('selector',lesPaul.selector[s.selector],1,s.selector!=='none')];
 return {schemaVersion:3,kitType:kitTemplate.id,kitName:lesPaul.name,template:structuredClone(kitTemplate),configuration,specification:describeKit(s),components,potSpecification:{manufacturer:lesPaul.pots[s.pots].label,resistanceOhms:500000,taper:'audio',shaft:lesPaul.shaft[s.shaft].label},toneCapacitors:{neck:{optionId:s.caps==='mixed'?s.neckCap:s.caps,valueMicrofarads:Number(c.neck.value)},bridge:{optionId:s.caps==='mixed'?s.bridgeCap:s.caps,valueMicrofarads:Number(c.bridge.value)}},trebleBleed:{optionId:s.bleed,topology:lesPaul.bleed[s.bleed].topology||lesPaul.bleed[s.bleed].circuit||'none',quantity:s.bleed==='none'?0:2},precisionMatching:{optionId:s.matching,name:lesPaul.matching[s.matching].label,kitAddOn:lesPaul.matching[s.matching].price},pricing:{...priceKit(s),basePrice:lesPaul.basePrice}};
}
export function specification(value){const s=describeKit(value),p=priceKit(value);return [lesPaul.name,...Object.entries(s).map(([k,v])=>`${specLabels[k]}: ${v}`),'',...p.lines.map(l=>`${l.label}: ${l.key==='base'?formatKitPrice(l.price):upgradeLabel(l.price)}`),`KIT TOTAL: ${formatKitPrice(p.total)}`,'Delivery additional, to be confirmed. Online ordering coming soon.'].join('\n');}
export function builderURL(value){return lesPaul.builder+'?'+new URLSearchParams({kit:'les-paul',config:JSON.stringify(normaliseKit(value))}).toString();}
export function configurationFromURL(search){const params=new URLSearchParams(search);if(!params.has('config'))return null;if(params.get('kit')!=='les-paul')throw new Error('This kit type is not available in this builder.');const raw=params.get('config');if(raw.length>3000)throw new Error('That configuration link could not be read.');let value;try{value=JSON.parse(raw);}catch{throw new Error('That configuration link could not be read.');}if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('That configuration link could not be read.');return normaliseKit(value);}

export function specificationURL(value){const url=builderURL(value);return '/wiring-kits/specification/'+url.slice(url.indexOf('?'));}
