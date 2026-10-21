import assert from 'node:assert/strict';import {Window} from 'happy-dom';
import {workload,fixtureTransport,config,delivery} from './fixtures.mjs';
import {readCatalogueComponents,disposeDemandImageCache} from '../../dist/backend/catalogue-image-delivery.mjs';
import {mountDemandImage,disposeDemandImages} from '../../dist/backend/demand-image-presentation.mjs';
globalThis.fetch=()=>{throw Error('Uninjected network prohibited');};
const w=new Window({url:'https://presentation.fixture.invalid',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}}),d=w.document,cases=[];
let observer;
w.IntersectionObserver=class{constructor(fn){this.fn=fn;observer=this;}observe(host){this.host=host;}disconnect(){}trigger(visible){this.fn([{target:this.host,isIntersecting:visible}]);}};
const test=async(name,fn)=>{await fn();cases.push(name);},wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Fixture DOM operation timed out');};
try{
 const f=workload(),t=fixtureTransport(f,{delay:5}),rows=await readCatalogueComponents({config,delivery,request:t.request});
 const host=d.createElement('a'),fallback=d.createElement('div');fallback.className='component-mark';d.body.append(host);mountDemandImage(host,rows[0].image,{alt:'Fixture photo',className:'component-image',fallback});
 await test('pending presentation has stable geometry and no image fetch',async()=>{assert.equal(host.style.display,'block');assert.equal(host.style.minHeight,'220px');assert.equal(t.metrics.bodyBytes,0);assert.equal(host.querySelector('img'),null);});
 await test('intersection displays only fully verified Blob URL with accessible name',async()=>{observer.trigger(true);await wait(()=>host.querySelector('img'));const img=host.querySelector('img');assert(img.src.startsWith('blob:'));assert.equal(img.alt,'Fixture photo');assert(img.dataset.verifiedSource.endsWith(f.manifest.entries[rows[0].id].path));assert.equal(t.metrics.bodyBytes,102400);});
 await test('offscreen release and return reuse bounded verified lease',async()=>{observer.trigger(false);assert.equal(host.querySelector('img'),null);observer.trigger(true);await wait(()=>host.querySelector('img'));assert.equal(t.metrics.bodyBytes,102400);});
 await test('suspend and persisted resume restore the same correct image',async()=>{w.dispatchEvent(new w.Event('pagehide'));assert.equal(host.querySelector('img'),null);const e=new w.Event('pageshow');Object.defineProperty(e,'persisted',{value:true});w.dispatchEvent(e);observer.trigger(true);await wait(()=>host.querySelector('img'));assert.equal(host.querySelector('img').alt,'Fixture photo');});
 await test('teardown during pending load cannot insert detached content',async()=>{const other=d.createElement('div'),mark=d.createElement('div');d.body.append(other);mountDemandImage(other,rows[1].image,{alt:'Never inserted',className:'component-image',fallback:mark});observer.trigger(true);disposeDemandImages(other);other.remove();await new Promise(r=>setTimeout(r,30));assert.equal(other.querySelector('img'),null);disposeDemandImages(host);disposeDemandImageCache(t.request);});
 console.log(JSON.stringify({suite:'demand-presentation-fixtures',passed:cases.length,cases,browserAcceptance:false,productionRequests:0}));
}finally{await w.happyDOM.abort();}
