// Stable dictionary keys are separate from mutable display labels.
export const optionSets=Object.freeze({manufacturer:'Manufacturers',pot_type:'Potentiometer types',pot_shaft:'Potentiometer shaft types',pot_taper:'Potentiometer tapers',bleed_topology:'Treble bleed topologies'});
export const electricalKeys=Object.freeze({pot_taper:['audio','linear','reverse_audio'],bleed_topology:['capacitor','parallel','series']});
export const normaliseLabel=value=>String(value??'').trim().toLocaleLowerCase('en-GB').replace(/[.\s]+/g,'');
export const manufacturerKey=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,80);
export function matchOption(rows,set,value){
 const needle=normaliseLabel(value);if(!needle)return null;
 return rows.find(row=>row.option_set===set&&(normaliseLabel(row.label)===needle||(row.aliases||[]).some(alias=>normaliseLabel(alias)===needle)))||null;
}
export const findOption=(rows,set,key)=>rows.find(row=>row.option_set===set&&row.option_key===key)||null;
export function selectOptions(rows,set,currentKey='',legacy=''){
 const selected=findOption(rows,set,currentKey)||matchOption(rows,set,legacy);
 return rows.filter(row=>row.option_set===set&&(row.active||row.option_key===selected?.option_key)).sort((a,b)=>a.sort_order-b.sort_order||a.label.localeCompare(b.label));
}
export function displayOption(rows,set,key,legacy=''){
 const resolved=findOption(rows,set,key)||matchOption(rows,set,legacy);
 return resolved?.label||legacy||'';
}
export function validateOptionInput(rows,set,key,label){
 if(!Object.hasOwn(optionSets,set))throw Error('Unknown catalogue option set.');
 if(typeof label!=='string'||!label.trim()||label.trim().length>120)throw Error('Enter a catalogue label of 1–120 characters.');
 if(typeof key!=='string'||!/^[a-z][a-z0-9_]{0,79}$/.test(key))throw Error('Enter a stable key with lowercase letters, numbers or underscores.');
 if(electricalKeys[set]&&!electricalKeys[set].includes(key))throw Error('Electrical semantic keys are fixed.');
 if(rows.some(row=>row.option_set===set&&(row.option_key===key||[row.label,...row.aliases||[]].some(value=>normaliseLabel(value)===normaliseLabel(label)))))throw Error('An option with that key or label already exists.');
 return {option_set:set,option_key:key,label:label.trim(),active:true};
}
