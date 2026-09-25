import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {setComponentRepository} from '../dist/admin/component-repository.mjs';

const browser=new Window({url:'https://example.test/admin/'});
browser.happyDOM.settings.disableJavaScriptEvaluation=true;
browser.happyDOM.settings.disableCSSFileLoading=true;
browser.happyDOM.settings.disableJavaScriptFileLoading=true;
for(const key of ['window','document','localStorage','location','history','navigator','CSS','RadioNodeList','Event'])Object.defineProperty(globalThis,key,{value:key==='window'?browser:browser[key],configurable:true,writable:true});
document.write(readFileSync(new URL('../dist/admin/index.html',import.meta.url),'utf8'));
let records=[{id:'test-unused',sku:'TEST',name:'Test unused capacitor',category:'capacitors',manufacturer:'Test',specs:{Value:'0.015µF'},stock:2,active:true,inKits:true,salePrice:199,kitPrice:100}],confirm=false,mode='blocked',calls=0;
browser.confirm=()=>confirm;
setComponentRepository({
 async list(){return records.map(record=>({...record}));},async save(){},async changeStock(){},
 async remove(id){calls++;assert.equal(id,'test-unused');if(mode==='blocked')throw new Error('Cannot delete this Component. Used by: Les Paul Style Wiring Kit — Potentiometer resolver. Remove or change those dependencies first.');records=[];return {deleted:true};}
});
await import('../dist/admin/admin.mjs');
for(let n=0;n<10&&!document.querySelector('[aria-label="Delete permanently Test unused capacitor"]');n++)await new Promise(resolve=>setTimeout(resolve,0));
const button=()=>document.querySelector('[aria-label="Delete permanently Test unused capacitor"]');assert(button());
button().click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,0,'confirmation is mandatory');
confirm=true;button().click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,1);assert.match(document.querySelector('#status').textContent,/Potentiometer resolver/);assert(button(),'referenced record remains');
records=[];browser.dispatchEvent(new Event('pageshow'));await new Promise(resolve=>setTimeout(resolve,0));assert.equal(button(),null,'external authoritative deletion reconciles when the Admin page returns');
records=[{id:'test-unused',sku:'TEST',name:'Test unused capacitor',category:'capacitors',manufacturer:'Test',specs:{Value:'0.015µF'},stock:2,active:true,inKits:true,salePrice:199,kitPrice:100}];browser.dispatchEvent(new Event('pageshow'));await new Promise(resolve=>setTimeout(resolve,0));assert(button());
mode='deleted';button().click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,2);assert.equal(records.length,0);assert.match(document.querySelector('#status').textContent,/Component and Inventory deleted permanently/);
await browser.happyDOM.abort();console.log('Admin delete confirmation, dependency feedback, success and refreshed list passed.');
