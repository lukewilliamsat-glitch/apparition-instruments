import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {startStorefront} from '../../dist/storefront/startup.mjs';
import {createPublicComponentRepository} from '../../dist/backend/component-data.mjs';

// Behavioural DOM double, not a browser/layout/accessibility engine.
class Element{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.handlers={};this.hidden=false;this.id='';this.className='';this.value='';this.parentNode=null;}
 set textContent(value){this.value=String(value);this.children=[];}
 get textContent(){return this.value+this.children.map(n=>n.textContent).join(' ');}
 append(...nodes){for(const n of nodes){n.remove();n.parentNode=this;this.children.push(n);}}
 before(node){const p=this.parentNode;node.parentNode=p;p.children.splice(p.children.indexOf(this),0,node);}
 remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;}}
 replaceWith(node){const p=this.parentNode;node.parentNode=p;p.children.splice(p.children.indexOf(this),1,node);this.parentNode=null;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return Object.hasOwn(this.attributes,k)?this.attributes[k]:null;}
 removeAttribute(k){delete this.attributes[k];}
 contains(node){return this===node||this.children.some(c=>c.contains(node));}
 addEventListener(k,fn){this.handlers[k]=fn;}
 click(){if(!this.disabled)this.handlers.click?.();}
 focus(){this.ownerDocument.activeElement=this;}
 querySelectorAll(selector){return this.children.flatMap(n=>[...(selector.startsWith('#')?n.id===selector.slice(1):n.tagName===selector)?[n]:[],...n.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function documentFixture(route){
 const doc={createElement:t=>new Element(t,doc),createTextNode:s=>{const n=new Element('#text',doc);n.textContent=s;return n;}};
 doc.body=new Element('body',doc);doc.querySelector=s=>doc.body.querySelector(s);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);doc.getElementById=id=>doc.querySelector('#'+id);
 const nav=doc.createElement('a');nav.textContent='Navigation';const main=doc.createElement('main');main.id='main';main.className='page-main';
 if(route==='product')main.setAttribute('data-component-id','fictional-product');
 const status=doc.createElement('p');status.id=route==='components'?'component-status':'product-status';
 const snapshot=doc.createElement('button');snapshot.textContent='Unverified snapshot £99 / in stock';
 main.append(status,snapshot);doc.body.append(nav,main);doc.activeElement=nav;
 return {doc,nav,main,status,snapshot};
}
const valid={id:'fixture',sku:'FIXTURE',name:'Fictional capacitor',category:'capacitors',manufacturer:'Fictional',description:'Synthetic only',specs:{Value:'0.022µF'},product_content:{},individually:true,in_kits:false,sale_price:599,kit_price:100,kit_price_quantity:1,stock:2,image:null};
const fixtures={
 success:()=>Response.json([valid]),empty:()=>Response.json([]),
 http401:()=>Response.json({}, {status:401}),http402:()=>Response.json({}, {status:402}),http500:()=>Response.json({}, {status:500}),
 timeout:()=>{throw new DOMException('Private fixture timeout','TimeoutError');},
 malformed:()=>new Response('not JSON'),invalidSchema:()=>Response.json({rows:[]}),invalidStock:()=>Response.json([{...valid,stock:'2'}])
};
const catalogueSource=readFileSync('dist/components/catalogue.mjs','utf8'),componentSource=readFileSync('dist/components/components.mjs','utf8');
async function graph(response,doc){
 let requests=0,renders=0;
 const repository=createPublicComponentRepository({config:{url:'https://lantern.invalid',publishableKey:'fixture'},request:async()=>{requests++;return response();}});
 const context=vm.createContext({document:doc,location:{hash:'',pathname:'/components/'},window:{addEventListener(){}},URLSearchParams,URL,console});
 const synthetic=(values)=>new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);},{context});
 const catalogue=new vm.SourceTextModule(catalogueSource,{context,identifier:'catalogue'});
 await catalogue.link(()=>synthetic({componentRepository:()=>repository}));
 const component=new vm.SourceTextModule(componentSource,{context,identifier:'components'});
 await component.link(spec=>{
  if(spec==='./catalogue.mjs')return catalogue;
  if(spec.includes('cards.mjs'))return synthetic({renderComponentCards:()=>{renders++;}});
  if(spec.includes('admin/data'))return synthetic({categories:{capacitors:'Capacitors'}});
  if(spec.includes('commerce'))return synthetic({addComponent:()=>assert.fail('No purchase during startup')});
  if(spec.includes('deployment'))return synthetic({deploymentPath:p=>p});
  return synthetic({bindPurchaseControl(){},assertPurchaseAllowed(){}});
 });
 return {catalogue,component,requests:()=>requests,renders:()=>renders};
}
let passed=0;const cases=[];
const check=(name,fn)=>{fn();passed++;cases.push(name);};

// Reproduce the actual unchanged entry source: its try/catch is never reached.
for(const name of ['http401','http402','http500','malformed','invalidSchema']){
 const f=documentFixture('components'),g=await graph(fixtures[name],f.doc);
 await assert.rejects(g.component.evaluate());
 check('baseline-import-rejection-'+name,()=>{assert.equal(f.status.textContent,'');assert.equal(g.renders(),0);assert.equal(g.requests(),1);});
}

for(const route of ['components','product','basket','checkout']){
 for(const [name,response] of Object.entries(fixtures)){
  const f=documentFixture(route),g=await graph(response,f.doc),saved='{"version":1,"items":[{"id":"intent","product":"component","sku":"fixture","quantity":2}]}';
  const storage=new Map([['apparition.basket.v1',saved]]);let loads=0,reloads=0,writes=0;
  globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{writes++;storage.set(k,v);},removeItem:k=>{writes++;storage.delete(k);},clear:()=>{writes++;storage.clear();}};
  f.doc.defaultView={localStorage:globalThis.localStorage};
  let initialisationError;
  const result=await startStorefront({document:f.doc,route,load:()=>{loads++;return (route==='components'?g.component:g.catalogue).evaluate().catch(error=>{initialisationError=error;throw error;});},reload:()=>{reloads++;}});
  const success=['success','empty'].includes(name);
  check(route+'-'+name,()=>{
   assert.equal(result.status,success?'ready':'unavailable',route+' '+name+' '+initialisationError);assert.equal(loads,1);assert.equal(g.requests(),1);assert.equal(reloads,0);assert.equal(storage.get('apparition.basket.v1'),saved);assert.equal(writes,0);
   assert.equal(f.doc.activeElement,f.nav,'Do not steal header focus');
   if(success){assert.equal(f.main.hidden,false);assert(f.doc.body.contains(f.main));}
   else{
    assert(!f.doc.body.contains(f.main));assert(!f.doc.body.textContent.includes('£99'));assert(!f.doc.body.textContent.includes('Private fixture'));
    const current=f.doc.querySelector('main'),notice=current.children[0].children[1];assert.equal(notice.attributes.role,'alert');
    assert.equal(current.getAttribute('data-component-id'),route==='product'?'fictional-product':null,'Retain scoped product handoff identity');
    assert(current.textContent.includes('not a confirmed order'));assert(current.textContent.includes('has not changed it'));assert(current.querySelector('a').href.endsWith('/faq/'));
    const retry=current.querySelector('button');retry.click();retry.click();assert.equal(reloads,1);assert.equal(g.requests(),1,'Manual reload callback is not another import/read');
   }
  });
  if(success){await g.catalogue.namespace.refreshCatalogue();await g.catalogue.namespace.refreshCatalogue();check(route+'-'+name+'-dedup',()=>assert.equal(g.requests(),1));}
 }
 const f=documentFixture(route);let release,expire,loads=0;
 const pending=new Promise(resolve=>release=resolve);
 const running=startStorefront({document:f.doc,route,load:()=>{loads++;return pending;},setTimer:fn=>{expire=fn;return 1;},clearTimer(){}});
 await Promise.resolve();check(route+'-loading-hidden',()=>assert.equal(f.main.hidden,true));expire();
 const result=await running;release();await Promise.resolve();f.main.hidden=false;
 check(route+'-deadline-and-late-settlement',()=>{assert.equal(result.reason,'timeout');assert.equal(loads,1);assert(!f.doc.body.contains(f.main));assert(f.doc.querySelector('main').textContent.includes('temporarily unavailable'));});
 const unexpected=documentFixture(route);unexpected.doc.activeElement=unexpected.snapshot;
 await startStorefront({document:unexpected.doc,route,load:()=>{throw Error('Internal stack / secret fixture marker');}});
 check(route+'-unexpected-initialisation',()=>{assert.equal(unexpected.doc.activeElement.tagName,'h1');assert(!unexpected.doc.body.textContent.includes('secret'));});
}

// Static copy/entry coverage, including generated product shell and snapshots.
const {readdirSync}=await import('node:fs');
const html=['dist/components/index.html',...['capacitors','potentiometers','treble-bleeds'].map(p=>'dist/components/'+p+'/index.html'),'dist/products/index.html',...readdirSync('dist/products',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>'dist/products/'+e.name+'/index.html'),'dist/basket/index.html','dist/checkout/index.html'];
for(const path of html){const s=readFileSync(path,'utf8');check('entry-'+path,()=>{assert.equal((s.match(/storefront\/entry\.mjs/g)||[]).length,1);assert(!s.includes('src="/products/app.mjs'));});}
const entry=readFileSync('dist/storefront/entry.mjs','utf8');
check('closed-route-imports',()=>{for(const path of ['../components/components.mjs?v=p11','../products/app.mjs?v=p11ef','../basket/basket.mjs','../checkout/checkout.mjs'])assert(entry.includes("import('"+path+"')"));});
const faq=readFileSync('dist/faq/index.html','utf8');
check('copy-faq',()=>{assert(!/Checkout and payment are not enabled|Online ordering is not enabled yet/.test(faq));for(const fragment of ['not a confirmed order','stock reservation','Checkout may be temporarily unavailable','independently confirmed','current prices, stock and delivery charges'])assert(faq.includes(fragment));});
check('copy-components',()=>{for(const path of html.filter(p=>p.includes('/components/')))assert(readFileSync(path,'utf8').includes('Checkout is available only when current prices, stock and delivery charges can be confirmed'));});
check('copy-basket-checkout',()=>{assert(readFileSync('dist/basket/index.html','utf8').includes('When checkout is available'));assert(readFileSync('dist/checkout/index.html','utf8').includes('Checkout is available only when'));assert(readFileSync('dist/basket-ui.mjs','utf8').includes('not an order or a stock reservation'));});
// Existing real commerce functions with fictional local records/storage only.
const commerce=await import('../../dist/commerce.mjs'),nativeCatalogue=await import('../../dist/components/catalogue.mjs');
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};globalThis.window=new EventTarget();
nativeCatalogue.catalogue.splice(0,nativeCatalogue.catalogue.length,{id:'fictional',price:599,stock:2});
const id=commerce.addComponent('fictional');commerce.addComponent('fictional');
check('commerce-stock-quantity-authority',()=>{assert.throws(()=>commerce.addComponent('fictional'),/Only 2/);assert.throws(()=>commerce.changeQuantity(id,0),/whole quantity/);assert.throws(()=>commerce.changeQuantity(id,100),/whole quantity/);assert.throws(()=>commerce.addComponent('missing'),/no longer listed/);});
const {purchasePermission}=await import('../../dist/operations/purchase-controls.mjs');
check('operations-authority',()=>{assert.equal(purchasePermission({apparitionStoreState:{state:'OPEN'}}).allowed,true);for(const state of ['ORDERS_PAUSED','UNAVAILABLE'])assert.equal(purchasePermission({apparitionStoreState:{state}}).allowed,false);});
console.log(JSON.stringify({status:'PASS',checks:passed,cases,scope:'Node VM, real catalogue/transport, stubbed renderer/DOM; NOT Chrome',productionRequests:0}));
