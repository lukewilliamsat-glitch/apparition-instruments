import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {displayOption,findOption,manufacturerKey,matchOption,normaliseLabel,selectOptions,validateOptionInput} from '../dist/admin/catalogue-options.mjs';
import {createAdminOptionRepository,createPublicOptionRepository,setAdminOptionRepository} from '../dist/backend/catalogue-options.mjs';
import {productDetails,productURL} from '../dist/products/model.mjs';
import {componentFromRow} from '../dist/backend/component-data.mjs';
import {setComponentRepository} from '../dist/admin/component-repository.mjs';
import {storefrontProduct} from '../dist/components/catalogue.mjs';

let rows=[
 {option_set:'manufacturer',option_key:'cts',label:'CTS',aliases:[],active:true,sort_order:10},
 {option_set:'pot_type',option_key:'standard',label:'Standard',aliases:[],active:true,sort_order:10},
 {option_set:'pot_type',option_key:'push_pull',label:'Push/Pull',aliases:[],active:true,sort_order:20},
 {option_set:'pot_shaft',option_key:'short',label:'Short',aliases:[],active:true,sort_order:10},
 {option_set:'pot_taper',option_key:'audio',label:'A / Audio',aliases:[],active:true,sort_order:10},
 {option_set:'bleed_topology',option_key:'parallel',label:'Parallel RC',aliases:[],active:true,sort_order:10}
];
assert.equal(normaliseLabel(' C.T.S. '),normaliseLabel('cts'));
assert.equal(matchOption(rows,'pot_type','Push/pull')?.option_key,'push_pull');
assert.equal(matchOption(rows,'pot_type','Push/Pull')?.option_key,'push_pull');
assert.equal(manufacturerKey('Bourns'),'bourns');
assert.deepEqual(validateOptionInput(rows,'manufacturer','bourns','Bourns'),{option_set:'manufacturer',option_key:'bourns',label:'Bourns',active:true});
assert.throws(()=>validateOptionInput(rows,'manufacturer','cts_2','C.T.S.'),/already exists/);
assert.throws(()=>validateOptionInput(rows,'pot_taper','funny','Bananas'),/fixed/);
assert.throws(()=>validateOptionInput(rows,'bleed_topology','not_a_real_circuit','Bananas'),/fixed/);
const transport={async send(table,{method='GET',query='',body}={}){
 assert.equal(table,'catalogue_options');
 if(method==='GET')return new Response(JSON.stringify(rows),{status:200});
 if(method==='POST'){rows.push({...body,aliases:[],sort_order:99});return new Response(JSON.stringify([rows.at(-1)]),{status:201});}
 const set=decodeURIComponent(query.match(/option_set=eq\.([^&]+)/)[1]),key=decodeURIComponent(query.match(/option_key=eq\.([^&]+)/)[1]),target=findOption(rows,set,key);
 if(!target)return new Response(JSON.stringify({message:'not found'}),{status:404});
 if(body.label&&body.label!==target.label){target.aliases.push(target.label);target.label=body.label;}
 if(body.active!==undefined)target.active=body.active;
 return new Response(JSON.stringify([target]),{status:200});
}};
const repo=createAdminOptionRepository(transport);assert.equal((await repo.list()).length,6);
await repo.add('manufacturer','bourns','Bourns');assert.equal(findOption(rows,'manufacturer','bourns')?.label,'Bourns');
await assert.rejects(repo.add('manufacturer','cts_2',' cts '),/already exists/);
await repo.rename('pot_type','push_pull','Push / Pull');assert.equal(findOption(rows,'pot_type','push_pull')?.label,'Push / Pull');
assert.equal(matchOption(rows,'pot_type','Push/pull')?.option_key,'push_pull');
await repo.setActive('pot_type','push_pull',false);
assert(!selectOptions(rows,'pot_type').some(option=>option.option_key==='push_pull'));
assert(selectOptions(rows,'pot_type','','Push/pull').some(option=>option.option_key==='push_pull'));
await repo.setActive('pot_type','push_pull',true);assert(selectOptions(rows,'pot_type').some(option=>option.option_key==='push_pull'));
assert.equal(displayOption(rows,'pot_type','push_pull','Push/pull'),'Push / Pull');
const request=async()=>new Response(JSON.stringify(rows),{status:200});assert.equal((await createPublicOptionRepository({config:{url:'https://example.supabase.co',publishableKey:'test'},request}).list()).length,7);

const record={id:'pot-short-cts-a',sku:'pot-short-cts-a',name:'CTS pot',category:'potentiometers',manufacturer:'CTS',specs:{Type:'Push/pull',Taper:'A / Audio',Shaft:'Short',Resistance:'500kΩ'},product_content:{manufacturerKey:'cts',technicalSpecs:{potentiometer:{typeKey:'push_pull',shaftKey:'short',taperKey:'audio',resistanceKohms:500}}},active:true,individually:true,in_kits:true,sale_price:500,kit_price:250,image:null};
const product=storefrontProduct(componentFromRow(record,{quantity:3}));
const details=productDetails(product,rows);assert.equal(details.find(x=>x.label==='Type')?.value,'Push / Pull');assert.equal(details.find(x=>x.label==='Manufacturer')?.value,'CTS');
assert(!JSON.stringify(details).includes('push_pull'));assert.equal(productURL(product.id),'/products/pot-short-cts-a/');assert.equal(product.price,500);assert.equal(product.stock,3);
await repo.rename('pot_taper','audio','A / Audio taper');assert.equal(productDetails(product,rows).find(x=>x.label==='Taper')?.value,'A / Audio taper');
await repo.rename('bleed_topology','parallel','Parallel capacitor/resistor');
const bleed=storefrontProduct(componentFromRow({...record,id:'bleed-duncan',sku:'bleed-duncan',category:'treble-bleeds',specs:{Topology:'Capacitor + resistor in parallel',Capacitor:'1nF',Resistor:'150kΩ'},product_content:{technicalSpecs:{trebleBleed:{topology:'parallel',capacitor:{value:1,unit:'nF'},resistorKohms:150}}}},{quantity:5}));
assert.equal(productDetails(bleed,rows).find(x=>x.label==='Configuration')?.value,'Parallel capacitor/resistor');
const sql=readFileSync('supabase/migrations/20260928081731_p10g_catalogue_options.sql','utf8');for(const text of ['enable row level security','catalogue_options_admin_insert','catalogue_options_admin_update','fixed_electrical_option_keys','option_key<>old.option_key','revoke all'])assert(sql.includes(text));
assert(!sql.includes('update public.components'));for(const unit of ['pF','nF','µF'])assert(!rows.some(row=>row.label===unit));
const browser=new Window({url:'https://apparitioninstruments.co.uk/admin/catalogue-settings/'});browser.happyDOM.settings.disableJavaScriptEvaluation=true;browser.document.write(readFileSync('dist/admin/catalogue-settings/index.html','utf8'));assert(browser.document.querySelector('script[data-admin-entry]'));
for(const key of ['window','document','location','Event'])Object.defineProperty(globalThis,key,{value:key==='window'?browser:browser[key],configurable:true,writable:true});
setAdminOptionRepository(repo);setComponentRepository({async list(){return [componentFromRow(record,{quantity:3})];},async save(){},async changeStock(){}});
await import('../dist/admin/catalogue-settings/settings.mjs');
for(let n=0;n<10&&!document.querySelector('.catalogue-option-section');n++)await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(document.querySelectorAll('.catalogue-option-section').length,5);
assert([...document.querySelectorAll('.catalogue-option-section input')].some(input=>input.value==='Push / Pull'));const used=[...document.querySelectorAll('tbody tr')].find(row=>row.children[1].textContent==='push_pull');assert.equal(used.children[2].textContent,'1','Components using count reflects the assigned option');assert.equal(used.children[3].textContent,'Active');
const form=document.querySelector('.catalogue-option-section form');form.querySelector('input').value='New Maker';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
for(let n=0;n<10&&!findOption(rows,'manufacturer','new_maker');n++)await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(findOption(rows,'manufacturer','new_maker')?.label,'New Maker');browser.close();
console.log('P10G: stable IDs, duplicate checks, Admin add/rename/disable, legacy aliases, fixed electrical semantics, Product Detail and RLS migration PASS');
