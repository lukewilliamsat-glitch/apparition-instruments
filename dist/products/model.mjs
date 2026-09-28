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
  Number.isSafeInteger(product.price)&&product.price>=0&&Number.isSafeInteger(product.stock)&&product.stock>=0;
}
export function productURL(id){return deploymentPath('/products/?id='+encodeURIComponent(id));}
export function resolveProduct(records,id){
 if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id))return null;
 const product=records.find(item=>item.id===id);
 return eligibleProduct(product)?product:null;
}
export const categoryPath=category=>deploymentPath('/components/'+category+'/');
export const categoryName=category=>categories[category]||'Components';
export function productDetails(product,options=[]){
 const raw=product.productSpecifications?.length?product.productSpecifications:product.displaySpecifications?.length?product.displaySpecifications:Object.entries(product.specs||{}).map(([label,value])=>({label,value}));
 const rows=[...product.manufacturer?[{label:'Manufacturer',value:displayOption(options,'manufacturer',product.manufacturerKey,product.manufacturer)}]:[],...raw.map(row=>({...row}))];
 if(product.category==='potentiometers'){
  const values=potValues(product);
  for(const key of ['Resistance','Type','Shaft','Taper']){
   const stored=product.technicalSpecs?.potentiometer||{};
   const setName={Type:'pot_type',Shaft:'pot_shaft',Taper:'pot_taper'}[key];
   const identity={Type:stored.typeKey,Shaft:stored.shaftKey,Taper:stored.taperKey}[key];
   const value=key==='Resistance'&&values.Resistance!=null?String(values.Resistance)+'kΩ':setName?displayOption(options,setName,identity,values[key]):values[key];
   if(value){const existing=rows.find(row=>String(row.label).toLowerCase()===key.toLowerCase());if(existing)existing.value=value;else rows.push({label:key,value});}
  }
 }
 const set=(key,value)=>{if(!value)return;const existing=rows.find(row=>String(row.label).toLowerCase()===key.toLowerCase());if(existing)existing.value=value;else rows.push({label:key,value});};
 if(product.category==='capacitors'){
  const {capacitance,voltageV}=capacitorValues(product);
  set('Value',formatCapacitance(capacitance));set('Voltage',voltageV!=null?String(voltageV)+'V':null);
 }
 if(product.category==='treble-bleeds'){
  const {topology,capacitor,resistorKohms}=bleedValues(product);
  if(topology)set('Topology',displayOption(options,'bleed_topology',topology,bleedTopologies[topology]));
  set('Capacitor',formatCapacitance(capacitor));
  if(topology==='capacitor'){
   for(let i=rows.length-1;i>=0;i--)if(String(rows[i].label).toLowerCase()==='resistor')rows.splice(i,1);
  }else set('Resistor',resistorKohms!=null?String(resistorKohms)+'kΩ':null);
 }
 if(product.sku)rows.push({label:'SKU',value:product.sku});
 const structuredPhysical=new Set(physicalRows(product).map(row=>row.label.toLowerCase()));
 for(let index=rows.length-1;index>=0;index--)if(structuredPhysical.has(String(rows[index].label).trim().toLowerCase()))rows.splice(index,1);
 const seen=new Set();return rows.filter(({label,value})=>{const key=String(label||'').trim(),val=String(value??'').trim();if(!key||!val||seen.has(key.toLowerCase()))return false;seen.add(key.toLowerCase());return true;}).map(({label,value})=>({label:product.category==='treble-bleeds'?({Topology:'Configuration',Capacitor:'Capacitor',Resistor:'Resistor'}[label]||fieldLabels[label]||label):product.category==='capacitors'&&label==='Voltage'?'Voltage rating':fieldLabels[label]||label,value:String(value).trim()}));
}
export const productContext={
 potentiometers:{fitment:'Check mounting depth, hole diameter, knob fit and cavity clearance against your guitar before choosing a potentiometer. Model and year alone do not confirm fit.',links:[['Understand potentiometers','/luthier-hub/potentiometers-explained/']]},
 capacitors:{fitment:'Check the specified capacitance and the space available in your control cavity. Component brand or construction alone does not guarantee a particular audible result.',links:[['Understand tone capacitors','/luthier-hub/capacitors-treble-bleeds/']]},
 'treble-bleeds':{fitment:'A treble bleed connects across a volume control’s input and output. Its effect depends on your pickups, controls and cable; no one network suits every guitar.',links:[['Understand treble bleeds','/luthier-hub/capacitors-treble-bleeds/'],['Explore the Treble Bleed Designer','/treble-bleed-designer/']]}
};
