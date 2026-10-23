import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalogue} from '../../dist/components/catalogue.mjs';
import {readBasket,changeQuantity,addComponent,removeKit,hasUnavailableItems} from '../../dist/commerce.mjs';
import {itemCard,totalCard} from '../../dist/basket-ui.mjs';
import {createKitSnapshot} from '../../dist/les-paul-kits/snapshot.mjs';
import {lesPaul} from '../../dist/les-paul-kits/config.mjs';
const w=new Window();Object.assign(globalThis,{window:w,document:w.document,localStorage:w.localStorage,CustomEvent:w.CustomEvent});
catalogue.splice(0,catalogue.length,{id:'fictional-part',name:'Fictional part',category:'capacitors',price:599,stock:4,specs:{Value:'0.022µF'}});
const key='apparition.basket.v1',valid={id:'valid-intent',product:'component',sku:'fictional-part',quantity:1},missing={id:'missing-intent',product:'component',sku:'Retired & Ω / part',quantity:3};
const put=items=>localStorage.setItem(key,JSON.stringify({version:1,items}));let checks=0;const check=(name,fn)=>{fn();checks++;};
put([valid,{...missing,price:999999,stock:999999,unavailable:false}]);
check('missing intent is explicit and canonical',()=>{const [a,b]=readBasket();assert.equal(a.sku,valid.sku);assert.deepEqual(b,{...missing,unavailable:true});assert(hasUnavailableItems([a,b]));});
changeQuantity(valid.id,2);
check('unrelated save retains reference and quantity, not claimed values',()=>{const raw=JSON.parse(localStorage.getItem(key));assert.deepEqual(raw.items[1],missing);assert.equal(raw.version,1);assert.equal(raw.items[0].quantity,2);assert(!JSON.stringify(raw).includes('999999'));});
addComponent(valid.sku);check('unrelated add retains missing entry',()=>assert.deepEqual(readBasket()[1],{...missing,unavailable:true}));
const before=localStorage.getItem(key);assert.throws(()=>addComponent(missing.sku),/no longer listed/);assert.throws(()=>changeQuantity(valid.id,5),/Only 4/);assert.throws(()=>changeQuantity(valid.id,0),/whole quantity/);assert.throws(()=>changeQuantity(valid.id,100),/whole quantity/);
check('unknown add and invalid quantities make no save',()=>assert.equal(localStorage.getItem(key),before));
let removed=null;const card=itemCard(readBasket()[1],{editable:true,onRemove:id=>{removed=id;}});w.document.body.append(card);
check('unavailable row is safe, descriptive and deliberately removable',()=>{assert(card.textContent.includes(missing.sku));assert(card.innerHTML.includes('&amp;'));assert(!card.querySelector('img,script,input,a'));assert(!card.textContent.includes('£'));card.querySelector('button').click();assert.equal(removed,missing.id);});
check('incomplete basket has no total or checkout link',()=>{const box=totalCard(readBasket(),false,null,{state:'OPEN'});assert(!box.querySelector('a[href="/checkout/"]'));assert(!box.textContent.includes('£'));assert.match(box.textContent,/cannot be confirmed/);});
removeKit(missing.id);check('explicit removal only removes chosen intent',()=>{assert.equal(readBasket().length,1);assert.equal(readBasket()[0].quantity,3);});
put([missing]);catalogue.push({id:missing.sku,name:'Current fictional replacement',price:699,stock:1,specs:{}});
check('resolution uses current authority without stale availability flag',()=>{assert.deepEqual(readBasket(),[missing]);assert(!hasUnavailableItems(readBasket()));});
catalogue.pop();
for(const bad of [null,{}, {...missing,sku:{}},{...missing,sku:'<img src=x onerror=alert(1)>'},{...missing,sku:'javascript:alert(1)'},{...missing,sku:'__proto__'},{...missing,quantity:0},{...missing,quantity:100},{...missing,id:'bad<script>'}]){put([bad]);const raw=localStorage.getItem(key);check('malformed entry rejected safely',()=>{assert.deepEqual(readBasket(),[]);assert.equal(localStorage.getItem(key),raw);assert.equal({}.polluted,undefined);});}
for(const raw of ['{',JSON.stringify({version:2,items:[]})]){localStorage.setItem(key,raw);check('invalid envelope retained for explicit recovery',()=>{assert.throws(()=>readBasket(),/saved basket could not be read/);assert.equal(localStorage.getItem(key),raw);});}
// Fictional availability fixture, following the inherited kit-snapshot suite.
for(const options of [lesPaul.capacitors,lesPaul.bleed,lesPaul.jack,lesPaul.selector])for(const option of Object.values(options))if(option.component)option.component.stock=100;
for(const component of lesPaul.builderModel.components)component.stock=100;
const record=createKitSnapshot({wiring:'modern',bleed:'none',matching:'standard',jack:'none',selector:'none'}),kit={id:'fictional-kit',product:'les-paul',quantity:1,configuration:record.configuration,record};
put([valid,missing,kit]);changeQuantity(valid.id,2);check('mixed component, missing and kit version-one basket',()=>{const items=readBasket();assert.equal(items.length,3);assert.deepEqual(items[2].record,record);assert.deepEqual(items[1],{...missing,unavailable:true});assert.equal(JSON.parse(localStorage.getItem(key)).version,1);});
await w.happyDOM.close();console.log(JSON.stringify({status:'PASS',checks,scope:'RAV03 real commerce/UI functions with fictional storage; not Chrome'}));
