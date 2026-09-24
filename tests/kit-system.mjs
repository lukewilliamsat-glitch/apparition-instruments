import assert from 'node:assert/strict';
import {normaliseKit,priceKit,describeKit,builderURL,specificationURL,configurationFromURL,kitRecord,lesPaul} from '../dist/les-paul-kits/config.mjs';
import {recommend} from '../dist/wiring-kits/help-me-choose/recommend.mjs';
import {diagramMarkup} from '../dist/les-paul-kits/diagram.mjs';
import {addKit,addComponent,readBasket,changeQuantity,resetBasket} from '../dist/commerce.mjs';
assert.equal(priceKit({}).total,5999);
assert.equal(priceKit({wiring:'modern',matching:'precision',bleed:'premium',jack:'pureTone',selector:'switchcraft'}).total,10898);
assert.equal(priceKit({jack:'epiphone'}).total,6499);
assert.equal(normaliseKit({pots:'Alpha'}).pots,'Alpha');assert(Number.isNaN(priceKit({pots:'Alpha'}).total),'An ineligible mapped variant must not silently fall back to CTS');
assert.equal(normaliseKit({caps:'0.033'}).caps,'nissei-033');
for(const wiring of ['50s','60s','modern'])for(const bleed of Object.keys(lesPaul.bleed)){
 const s=normaliseKit({wiring,bleed}),svg=diagramMarkup(s);
 assert.equal(s.bleed,wiring==='50s'?'none':bleed);
 assert.equal(priceKit(s).total,5999+(wiring==='50s'?0:lesPaul.bleed[bleed].price));
 assert.equal(/data-component="neckBleed(?:Cap|Network)"/.test(svg),s.bleed!=='none');assert(!svg.includes('undefined'));assert(!svg.includes('NaN'));
}
// Independent per-pot, per-shaft and per-capacitor adjustments, without component retail data.
lesPaul.shaft.long.price=123;assert.equal(priceKit({shaft:'long'}).total,6122);lesPaul.shaft.long.price=0;
lesPaul.capacitors['sbe-200'].price=25;assert.equal(priceKit({}).total,6024);assert.equal(priceKit({caps:'sbe-200'}).total,6049);lesPaul.capacitors['sbe-200'].price=0;
const answers={guitar:'les-paul',pickups:'humbuckers',scope:'full',volume:'often',clarity:'yes',feel:'independent',hardware:'replace',shaft:'unsure',matching:'yes'};
const result=recommend(answers);assert(result.supported);assert.equal(result.configuration.bleed,'bleed-prs');assert(result.checks[0].includes('provisional'));assert.deepEqual(configurationFromURL(new URL(result.url,'https://example.org').search),normaliseKit(result.configuration));
assert.equal(recommend({...answers,feel:'interactive'}).configuration.bleed,'none');
for(const change of [{guitar:'sg'},{pickups:'active'},{scope:'partial'},{pickups:'unsure'}])assert.equal(recommend({...answers,...change}).supported,false);
assert.throws(()=>configurationFromURL('?kit=les-paul&config=%7B'),/could not/);
assert.throws(()=>configurationFromURL('?kit=sg&config={}'),/not available/);
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};globalThis.window=new EventTarget();
for(const options of [lesPaul.capacitors,lesPaul.bleed,lesPaul.jack,lesPaul.selector])for(const option of Object.values(options))if(option.component)option.component.stock=100;
const id=addKit(result.configuration);addComponent('bleed-prs');changeQuantity(id,2);assert.equal(readBasket().length,2);assert.equal(readBasket()[0].quantity,2);assert.equal(readBasket()[0].record.schemaVersion,3);assert.equal(readBasket()[0].record.pricing.total,priceKit(result.configuration).total);addKit({wiring:'50s',bleed:'premium'},id);assert.equal(readBasket()[0].record.specification.bleed,'No Treble Bleed');assert.equal(readBasket()[1].sku,'bleed-prs');
assert.deepEqual(kitRecord(result.configuration).configuration,normaliseKit(result.configuration));
resetBasket();
console.log('Passed pricing example £108.98, all wiring/bleed combinations, cap-pair adjustments, guided handoff, unsupported layouts, legacy migration, configured-product basket and export markup.');

const shared={...result.configuration,model:'Les Paul & custom #1 / 2008'};assert.deepEqual(configurationFromURL(new URL(specificationURL(shared),'https://example.org').search),normaliseKit(shared));
assert.equal(new URL(specificationURL(shared),'https://example.org').pathname,'/wiring-kits/specification/');
console.log('Printable specification links preserve the complete configuration, including special characters.');
