import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initialComponents} from '../dist/admin/data.mjs';
import {storefrontProduct,catalogue} from '../dist/components/catalogue.mjs';
import {eligibleProduct,productDetails,productURL,resolveProduct} from '../dist/products/model.mjs';
import {renderProductDetail,startProductDetail} from '../dist/products/app.mjs';
import {renderComponentCards} from '../dist/components/cards.mjs';
import {addComponent,readBasket} from '../dist/commerce.mjs';

const fixtures=initialComponents().filter(p=>['pot-short-cts-a','sbe-200','bleed-prs'].includes(p.id)).map(storefrontProduct);
const [pot,cap,bleed]=['pot-short-cts-a','sbe-200','bleed-prs'].map(id=>fixtures.find(p=>p.id===id));
catalogue.splice(0,catalogue.length,...fixtures);
for(const item of fixtures){assert(eligibleProduct(item));assert.equal(resolveProduct(fixtures,item.id),item);assert.match(productURL(item.id),new RegExp('id='+item.id+'$'));}
for(const changed of [{...pot,active:false},{...pot,individually:false},{...pot,price:NaN},{...pot,price:0},{...pot,category:'jacks'}])assert.equal(resolveProduct([changed],changed.id),null);
assert.equal(resolveProduct(fixtures,'no-such-product'),null);assert.equal(resolveProduct(fixtures,'../admin'),null);
const doc=()=>{const w=new Window({url:'https://apparitioninstruments.co.uk/products/?id=pot-short-cts-a'});w.document.write(readFileSync('dist/products/index.html','utf8'));return w;};
for(const [item,fields,reading] of [[pot,['Resistance','Taper','Shaft','Reference'],'potentiometers-explained'],[cap,['Value','Voltage','Series','Tolerance'],'capacitors-treble-bleeds'],[bleed,['Capacitor','Topology'],'treble-bleed-designer']]){
 const w=doc(),root=w.document.getElementById('product-detail');renderProductDetail(root,item,{document:w.document,add:()=>{}});
 const rows=[...root.querySelectorAll('.product-specifications dt')].map(node=>node.textContent);
 for(const field of fields)assert(rows.some(label=>label.toLowerCase()===(field==='Value'?'Capacitance':field==='Voltage'?'Voltage rating':field==='Capacitor'?'Capacitor':field==='Shaft'?'Shaft type / length':field==='Reference'?'Part reference':field==='Topology'?'Configuration':field).toLowerCase()),item.id+': '+field);
 assert(![...root.querySelectorAll('.product-specifications dd')].some(node=>!node.textContent.trim()));
 assert(root.querySelector('a.product-back').href.includes('/components/'+item.category+'/'));
 assert(root.textContent.includes((item.price/100).toFixed(2)));
 assert(root.querySelector('.product-learning').innerHTML.includes(reading));
 assert(root.querySelector('.product-image')||root.querySelector('.product-image-fallback'));
 w.close();
}
const w=doc();globalThis.document=w.document;globalThis.window=w;globalThis.location=new URL('https://apparitioninstruments.co.uk/components/');globalThis.localStorage=w.localStorage;globalThis.CustomEvent=w.CustomEvent;
const section=w.document.createElement('section');section.className='component-section';section.id='potentiometers';const grid=w.document.createElement('div');grid.className='component-grid';section.append(grid);w.document.body.append(section);
renderComponentCards(fixtures);const card=grid.querySelector('article');assert.equal(card.querySelector('.component-detail-link').getAttribute('href'),productURL(pot.id));
assert(card.querySelector('button[data-add]'));assert.equal(card.querySelector('.component-details-action').getAttribute('href'),productURL(pot.id));
const categoryId=addComponent(pot.id),categoryBasket=readBasket();assert.equal(categoryBasket.length,1);
w.localStorage.clear();const detail=w.document.getElementById('product-detail');renderProductDetail(detail,pot,{document:w.document,add:addComponent});detail.querySelector('button').click();
const detailBasket=readBasket();assert.equal(detailBasket.length,1);assert.equal(detailBasket[0].product,categoryBasket[0].product);assert.equal(detailBasket[0].sku,categoryBasket[0].sku);assert.equal(detailBasket[0].quantity,categoryBasket[0].quantity);assert(categoryId);assert(detail.querySelector('[role="status"]').textContent.includes('Added'));
const out={...pot,stock:0};renderProductDetail(detail,out,{document:w.document,add:()=>assert.fail('Out of stock was added')});assert.equal(detail.querySelector('button').disabled,true);
const photo={...pot,image:{kind:'object',key:'example',url:'https://example.org/image.png'}};renderProductDetail(detail,photo,{document:w.document,add:()=>{}});detail.querySelector('img.product-image').dispatchEvent(new w.Event('error'));assert(detail.querySelector('.product-image-fallback'));
await startProductDetail({document:w.document,location:new URL('https://apparitioninstruments.co.uk/products/?id=pot-short-cts-a'),load:async()=>{}});assert.equal(w.document.title,pot.name+' | Apparition Instruments');assert(w.document.querySelector('link[rel="canonical"]').href.endsWith('?id=pot-short-cts-a'));assert.equal(w.document.querySelector('meta[name="robots"]').content,'noindex,follow');
await startProductDetail({document:w.document,location:new URL('https://apparitioninstruments.co.uk/products/?id=missing'),load:async()=>{}});assert.equal(detail.hidden,true);assert.match(w.document.getElementById('product-status').textContent,/not currently available/);
assert(!readFileSync('dist/sitemap.xml','utf8').includes('/products/'));
console.log('P10D: stable identity, category fields, stock, images, card links, shared basket, safe unknown route and honest noindex metadata PASS');
