import {relationshipLinks} from '../knowledge/registry.mjs';
import {categories,fieldLabels} from '../admin/data.mjs';
import {deploymentPath} from '../deployment.mjs';
import {potValues} from '../admin/pot-specs.mjs';
import {bleedTopologies,bleedValues,capacitorValues,formatCapacitance} from '../admin/electrical-specs.mjs';
import {displayOption} from '../admin/catalogue-options.mjs';
import {physicalRows} from '../admin/physical-specs.mjs';
export {physicalRows};

const supported=new Set(['potentiometers','capacitors','treble-bleeds']);
export function eligibleProduct(product){
 return !!product&&product.active===true&&product.individually===true&&supported.has(product.category)&&
  typeof product.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(product.id)&&
  Number.isSafeInteger(product.price)&&product.price>0&&Number.isSafeInteger(product.stock)&&product.stock>=0;
}
export function productSlug(id){return String(id).toLowerCase();}
export function productURL(id){return deploymentPath('/products/'+encodeURIComponent(productSlug(id))+'/');}
export function resolveProduct(records,id){
 if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id))return null;
 const product=records.find(item=>item.id===id);
 return eligibleProduct(product)?product:null;
}
export const categoryPath=category=>deploymentPath('/components/'+category+'/');
export const categoryName=category=>categories[category]||'Components';
export function relatedProducts(product,records,limit=3){
 return records.filter(item=>item.id!==product.id&&item.category===product.category&&eligibleProduct(item))
  .sort((a,b)=>a.name.localeCompare(b.name,'en-GB')||a.id.localeCompare(b.id,'en-GB')).slice(0,limit);
}
export function productDetails(product,options=[]){
 const raw=product.productSpecifications?.length?product.productSpecifications:product.displaySpecifications?.length?product.displaySpecifications:Object.entries(product.specs||{}).map(([label,value])=>({label,value}));
 const rows=[...product.manufacturer?[{label:'Manufacturer',value:displayOption(options,'manufacturer',product.manufacturerKey,product.manufacturer)}]:[],...raw.map(row=>({...row}))];
 const displayLabel=label=>product.category==='treble-bleeds'?({Topology:'Configuration',Capacitor:'Capacitor',Resistor:'Resistor'}[label]||fieldLabels[label]||label):product.category==='capacitors'&&label==='Voltage'?'Voltage rating':fieldLabels[label]||label;
 const identity=label=>{const value=String(displayLabel(label)).trim().toLocaleLowerCase('en-GB');return product.category==='treble-bleeds'?({capacitance:'capacitor','resistor value':'resistor'}[value]||value):value;};
 const set=(key,value)=>{if(!value)return;const existing=rows.find(row=>identity(row.label)===identity(key));if(existing){existing.label=key;existing.value=value;}else rows.push({label:key,value});};
 if(product.category==='potentiometers'){
  const values=potValues(product);
  for(const key of ['Resistance','Type','Shaft','Taper']){
   const stored=product.technicalSpecs?.potentiometer||{};
   const setName={Type:'pot_type',Shaft:'pot_shaft',Taper:'pot_taper'}[key];
   const identity={Type:stored.typeKey,Shaft:stored.shaftKey,Taper:stored.taperKey}[key];
   const value=key==='Resistance'&&values.Resistance!=null?String(values.Resistance)+'kΩ':setName?displayOption(options,setName,identity,values[key]):values[key];
   set(key,value);
  }
 }
 if(product.category==='capacitors'){
  const {capacitance,voltageV}=capacitorValues(product);
  set('Value',formatCapacitance(capacitance));set('Voltage',voltageV!=null?String(voltageV)+'V':null);
 }
 if(product.category==='treble-bleeds'){
  const {topology,capacitor,resistorKohms}=bleedValues(product);
  if(topology)set('Topology',displayOption(options,'bleed_topology',topology,bleedTopologies[topology]));
  set('Capacitor',formatCapacitance(capacitor));
  if(topology==='capacitor'){
   for(let i=rows.length-1;i>=0;i--)if(identity(rows[i].label)===identity('Resistor'))rows.splice(i,1);
  }else set('Resistor',resistorKohms!=null?String(resistorKohms)+'kΩ':null);
 }
 if(product.sku)set('SKU',product.sku);
 const structuredPhysical=new Set(physicalRows(product).map(row=>row.label.toLowerCase()));
 for(let index=rows.length-1;index>=0;index--)if(structuredPhysical.has(String(rows[index].label).trim().toLowerCase()))rows.splice(index,1);
 const seen=new Set();return rows.filter(({label,value})=>{const key=identity(label),val=String(value??'').trim();if(!key||!val||seen.has(key))return false;seen.add(key);return true;}).map(({label,value})=>({label:displayLabel(label),value:String(value).trim()}));
}
export const productContext={
 potentiometers:{fitment:'Check mounting depth, hole diameter, knob fit and cavity clearance against your guitar before choosing a potentiometer. Model and year alone do not confirm fit.',links:relationshipLinks('potentiometers')},
 capacitors:{fitment:'Check the specified capacitance and the space available in your control cavity. Component brand or construction alone does not guarantee a particular audible result.',links:relationshipLinks('capacitors')},
 'treble-bleeds':{fitment:'A treble bleed connects across a volume control’s input and output. Its effect depends on your pickups, controls and cable; no one network suits every guitar.',links:relationshipLinks('treble-bleeds')}
};
