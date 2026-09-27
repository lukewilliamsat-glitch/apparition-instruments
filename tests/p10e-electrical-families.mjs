import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {applyCapacitorValues,applyBleedValues,bleedTopologies,bleedValues,capacitanceUnits,capacitorValues,formatCapacitance,parseCapacitance,parseTopology,parseVoltage,validateElectricalStructure} from '../dist/admin/electrical-specs.mjs';
import {normaliseManufacturer} from '../dist/admin/pot-specs.mjs';
import {componentFromRow} from '../dist/backend/component-data.mjs';
import {normaliseComponentInput} from '../dist/admin/data.mjs';
import {storefrontProduct} from '../dist/components/catalogue.mjs';
import {productDetails} from '../dist/products/model.mjs';
import {renderProductDetail} from '../dist/products/app.mjs';

assert.deepEqual(capacitanceUnits,['pF','nF','µF']);
for(const [source,value,unit] of [['180pF',180,'pF'],['1nF',1,'nF'],['0.022µF',0.022,'µF']]){
 assert.deepEqual(parseCapacitance(source),{value,unit});assert.equal(formatCapacitance(parseCapacitance(source)),source);
 const applied=applyCapacitorValues({Value:source,Tolerance:'5%',Series:'225P',Reference:'A1'}, {value:String(value),unit,voltage:'200'});
 assert.equal(applied.specs.Value,source);assert.equal(applied.specs.Voltage,'200V');assert.deepEqual(applied.technicalSpecs.capacitor.capacitance,{value,unit});
 for(const key of ['Tolerance','Series','Reference'])assert.equal(applied.specs[key],key==='Tolerance'?'5%':key==='Series'?'225P':'A1');
}
assert.equal(parseVoltage('200V'),200);assert.equal(parseVoltage('unspecified'),null);assert.equal(parseCapacitance('22'),null);
assert.throws(()=>applyCapacitorValues({}, {value:'abc',unit:'µF',voltage:''}),/numeric/);
assert.throws(()=>applyCapacitorValues({}, {value:'1',unit:'invented',voltage:''}),/unit/);
assert.deepEqual(bleedTopologies,{capacitor:'Capacitor only',parallel:'Parallel RC',series:'Series RC'});
for(const [label,code] of [['Capacitor only','capacitor'],['Capacitor + resistor in parallel','parallel'],['Capacitor + resistor in series','series']])assert.equal(parseTopology(label),code);
for(const topology of ['capacitor','parallel','series']){
 const result=applyBleedValues({Series:'Handmade'}, {topology,value:'1',unit:'nF',resistor:topology==='capacitor'?'':'150'});
 assert.equal(result.specs.Capacitor,'1nF');assert.equal(result.specs.Series,'Handmade');
 assert.equal(result.technicalSpecs.trebleBleed.topology,topology);
 assert.equal(result.technicalSpecs.trebleBleed.capacitor.unit,'nF');
 const presented=bleedValues({specs:result.specs,technicalSpecs:result.technicalSpecs});
 assert.equal(presented.resistorKohms,topology==='capacitor'?null:150);
 if(topology==='capacitor'){assert(!('Resistor' in result.specs));assert(!('resistorKohms' in result.technicalSpecs.trebleBleed));}
 else assert.equal(result.specs.Topology,topology==='parallel'?'Capacitor + resistor in parallel':'Capacitor + resistor in series');
}
assert.throws(()=>validateElectricalStructure({trebleBleed:{topology:'capacitor',resistorKohms:150}}),/cannot have a resistor/);
assert.equal(normaliseManufacturer('C.T.S.',['CTS']),'CTS');

const row=(id,category,specs)=>({id,sku:id,name:id,category,manufacturer:'CDE',description:'',specs,product_content:{},active:true,individually:true,in_kits:true,sale_price:429,kit_price:199,kit_price_quantity:1,image:null});
const original=row('cde-022','capacitors',{Value:'0.022µF',Voltage:'200V',Tolerance:'5%',Series:'225P',Reference:'CDE 225P'});
const initial=componentFromRow(original,{quantity:17});
const applied=applyCapacitorValues(initial.specs,{value:'0.022',unit:'µF',voltage:'200'});
const edited=normaliseComponentInput({...initial,specs:applied.specs,technicalSpecs:applied.technicalSpecs},[initial],initial.id);
assert.equal(edited.id,initial.id);assert.equal(edited.stock,17);assert.equal(edited.salePrice,429);assert.equal(edited.kitPrice,199);
const product=storefrontProduct(componentFromRow({...original,specs:edited.specs,product_content:{technicalSpecs:edited.technicalSpecs}},{quantity:17}));
assert.deepEqual(capacitorValues(product).capacitance,{value:0.022,unit:'µF'});
const specs=productDetails(product);for(const [label,value] of [['Capacitance','0.022µF'],['Voltage rating','200V'],['Tolerance','5%'],['Series','225P'],['Part reference','CDE 225P']])assert.equal(specs.find(row=>row.label===label)?.value,value);
const other=productDetails({...product,specs:{...product.specs,Value:'1nF',Voltage:'100V'},technicalSpecs:{capacitor:{capacitance:{value:180,unit:'pF'},voltageV:400}}});
assert.equal(other.find(row=>row.label==='Capacitance')?.value,'180pF');assert.equal(other.find(row=>row.label==='Voltage rating')?.value,'400V');
const legacyBleed=storefrontProduct(componentFromRow(row('bleed-duncan','treble-bleeds',{Topology:'Capacitor + resistor in parallel',Capacitor:'1nF',Resistor:'150kΩ, parallel'}),{quantity:20}));
const bleedRows=productDetails(legacyBleed);assert.equal(bleedRows.find(row=>row.label==='Configuration')?.value,'Parallel RC');assert.equal(bleedRows.find(row=>row.label==='Capacitor')?.value,'1nF');assert.equal(bleedRows.find(row=>row.label==='Resistor')?.value,'150kΩ');
const only=storefrontProduct(componentFromRow(row('bleed-prs','treble-bleeds',{Topology:'Capacitor only',Capacitor:'180pF'}),{quantity:20}));
assert.equal(productDetails(only).find(row=>row.label==='Configuration')?.value,'Capacitor only');assert(!productDetails(only).some(row=>row.label==='Resistor'));
const w=new Window({url:'https://apparitioninstruments.co.uk/products/?id=bleed-prs'});w.document.write(readFileSync('dist/products/index.html','utf8'));
const root=w.document.getElementById('product-detail');renderProductDetail(root,only,{document:w.document,add:()=>{}});
assert(root.textContent.includes('180pF'));assert(!root.textContent.includes('150kΩ'));assert([...root.querySelectorAll('.product-specifications dd')].every(node=>node.textContent.trim()));
renderProductDetail(root,product,{document:w.document,add:()=>{}});assert(root.textContent.includes('0.022µF'));
w.close();
const admin=readFileSync('dist/admin/admin.mjs','utf8');for(const category of ['capacitors','treble-bleeds','potentiometers'])assert(admin.includes("category==='"+category+"'"));
console.log('P10E electrical families: numeric pF/nF/µF and V, controlled topology, optional resistor, legacy compatibility, content roundtrip, identity, price, inventory and Product Detail PASS');
