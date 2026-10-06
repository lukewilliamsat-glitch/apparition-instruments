import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {Window} from 'happy-dom';
import {bootConjure} from '../dist/admin/conjure/app.mjs';
import {preparePreview,pageRoute,pageLibrary} from '../dist/admin/conjure/pages.mjs';
const w=new Window({url:'https://apparitioninstruments.co.uk/admin/conjure/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true,disableIframePageLoading:true}});
w.document.write(read('dist/admin/conjure/index.html','utf8'));
const html='<html><head><script>bad()</script></head><body><h1>Actual page</h1><a href="/luthier-hub/">Hub</a><form action="/checkout/"><button>Pay</button></form><p onclick="bad()">Text</p></body></html>';
const preview=preparePreview(html,'/',w.document);assert(!preview.includes('<script'));assert(!preview.includes('onclick'));assert(!preview.includes('action='));assert(preview.includes('disabled'));assert(preview.includes('Actual page'));
assert.throws(()=>pageRoute('/checkout/'));assert.throws(()=>pageRoute('https://example.org/'));assert.equal(pageRoute('/news/?test=1'),'/news/');assert(pageLibrary([]).some(p=>p.path==='/'));
const frame=w.document.querySelector('iframe');let last='';const timer=setInterval(()=>{if(frame.srcdoc&&frame.srcdoc!==last){last=frame.srcdoc;frame.contentDocument.write(last);frame.dispatchEvent(new w.Event('load'));}},1);
try{const app=await bootConjure({documentRepository:null,document:w.document,repository:{list:async()=>[]},request:async path=>({ok:true,text:async()=>html.replace('Actual page','Actual page '+path)})});assert.equal(app.current.path,'/');assert(frame.contentDocument.querySelector('h1').textContent.includes('Actual page'));await app.navigate('/news/');assert.equal(app.current.path,'/news/');assert(w.document.querySelector('[data-support]').textContent.includes('read only'));assert(w.document.querySelector('[data-save]').disabled);assert.equal(frame.getAttribute('sandbox'),'allow-same-origin');console.log('Conjure V2 shell PASS: independent gated route, real source preview, persistent navigation, read-only boundaries and inert commerce/scripts.');}finally{clearInterval(timer);await w.happyDOM.close();}
