// Category-specific facts stored within the existing Component product_content JSON.
export const capacitanceUnits=Object.freeze(['pF','nF','µF']);
export const bleedTopologies=Object.freeze({capacitor:'Capacitor only',parallel:'Parallel RC',series:'Series RC'});
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=1000000&&Number(String(value).split('.')[1]?.length||0)<=6?value:null;
export function parseCapacitance(value){
 const match=typeof value==='string'?value.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(pF|nF|µF|μF|uF)$/i):null;
 const amount=match?number(Number(match[1])):null;
 if(amount===null)return null;
 const unit=match[2].toLowerCase()==='pf'?'pF':match[2].toLowerCase()==='nf'?'nF':'µF';
 return {value:amount,unit};
}
export function parseVoltage(value){
 const match=typeof value==='string'?value.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*V$/i):null;
 return match?number(Number(match[1])):null;
}
export function parseBleedResistor(value){
 const match=typeof value==='string'?value.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*kΩ(?:,\s*(?:parallel|series))?$/i):null;
 return match?number(Number(match[1])):null;
}
export function parseTopology(value){
 const source=String(value??'').trim().toLowerCase();
 if(source==='capacitor only')return 'capacitor';
 if(source==='parallel rc'||source==='capacitor + resistor in parallel')return 'parallel';
 if(source==='series rc'||source==='capacitor + resistor in series')return 'series';
 return '';
}
export const formatCapacitance=data=>data?.value!=null&&capacitanceUnits.includes(data.unit)?String(data.value)+data.unit:null;
export function validateElectricalStructure(technicalSpecs){
 if(!technicalSpecs||typeof technicalSpecs!=='object'||Array.isArray(technicalSpecs))throw Error('Invalid structured technical specifications.');
 for(const key of ['capacitor','trebleBleed']){
  const data=technicalSpecs[key];if(data===undefined)continue;
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid structured '+key+' specifications.');
  const cap=key==='capacitor'?data.capacitance:data.capacitor;
  if(cap!==undefined&&(!cap||number(cap.value)===null||!capacitanceUnits.includes(cap.unit)))throw Error('Invalid structured capacitance.');
  const resistance=key==='capacitor'?data.voltageV:data.resistorKohms;
  if(resistance!==undefined&&number(resistance)===null)throw Error('Invalid structured electrical value.');
  if(key==='trebleBleed'&&data.topology!==undefined&&!Object.hasOwn(bleedTopologies,data.topology))throw Error('Invalid structured topology.');
  if(key==='trebleBleed'&&data.topology==='capacitor'&&data.resistorKohms!==undefined)throw Error('Capacitor-only network cannot have a resistor.');
 }
 return technicalSpecs;
}
export function capacitorValues(item={}){
 const saved=item.technicalSpecs?.capacitor||{},specs=item.specs||{},legacy=parseCapacitance(specs.Value);
 return {capacitance:saved.capacitance??legacy,voltageV:saved.voltageV??parseVoltage(specs.Voltage)};
}
export function bleedValues(item={}){
 const saved=item.technicalSpecs?.trebleBleed||{},specs=item.specs||{};
 const topology=saved.topology??parseTopology(specs.Topology);
 return {topology,capacitor:saved.capacitor??parseCapacitance(specs.Capacitor),resistorKohms:topology==='capacitor'?null:saved.resistorKohms??parseBleedResistor(specs.Resistor)};
}
function positiveInput(value,label){
 if(value===''||value==null)return null;
 if(!/^\d+(?:\.\d{1,6})?$/.test(String(value))||number(Number(value))===null)throw Error('Enter a valid numeric '+label+'.');
 return Number(value);
}
function capacitance(value,unit,label){
 const amount=positiveInput(value,label);
 if(amount===null)return null;
 if(!capacitanceUnits.includes(unit))throw Error('Choose a valid '+label+' unit.');
 return {value:amount,unit};
}
export function applyCapacitorValues(specs,values){
 const next={...specs},data={},cap=capacitance(values.value,values.unit,'capacitance'),voltage=positiveInput(values.voltage,'voltage rating');
 if(cap){data.capacitance=cap;next.Value=formatCapacitance(cap);}
 if(voltage!==null){data.voltageV=voltage;next.Voltage=String(voltage)+'V';}
 return {specs:next,technicalSpecs:{capacitor:data}};
}
export function applyBleedValues(specs,values){
 const next={...specs},data={},cap=capacitance(values.value,values.unit,'treble bleed capacitor'),resistor=positiveInput(values.resistor,'treble bleed resistor');
 if(values.topology){if(!Object.hasOwn(bleedTopologies,values.topology))throw Error('Choose a valid treble bleed configuration.');data.topology=values.topology;next.Topology=values.topology==='parallel'?'Capacitor + resistor in parallel':values.topology==='series'?'Capacitor + resistor in series':'Capacitor only';}
 if(cap){data.capacitor=cap;next.Capacitor=formatCapacitance(cap);}
 if(data.topology==='capacitor'){delete next.Resistor;}
 else if(resistor!==null){data.resistorKohms=resistor;next.Resistor=String(resistor)+'kΩ';}
 return {specs:next,technicalSpecs:{trebleBleed:data}};
}
