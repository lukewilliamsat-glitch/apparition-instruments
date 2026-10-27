// Local regression for the exact browser fixture/controller bootstrap contract.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const w=new Window({url:'https://fixture.invalid/admin/orders/?id=fixture-finance-order',settings:{disableCSSFileLoading:true,disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}}),d=w.document;
const html=(await readFile('dist/admin/orders/index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</head>','<script data-admin-entry="./app.mjs?v=customer-aftercare-giga-v1"></script></head>');d.write(html);Object.assign(globalThis,{document:d,window:w,location:w.location,history:w.history});
let fixture=await readFile('tests/command63/browser-entry.mjs','utf8');
fixture=fixture.replace(/from '(\/[^']+)'/g,(_,p)=>{const u=new URL(p,'https://fixture.invalid');return 'from '+JSON.stringify(pathToFileURL(resolve('dist'+u.pathname)).href+u.search);});
fixture=fixture.replace('load:specifier=>import(specifier)',"load:async specifier=>{const u=new URL(specifier);try{return await import("+JSON.stringify(pathToFileURL(resolve('dist')).href)+"+u.pathname+u.search);}catch(e){globalThis.fixtureImportError=String(e);throw e;}}");
await import('data:text/javascript;base64,'+Buffer.from(fixture).toString('base64'));await new Promise(r=>setImmediate(r));
assert(d.body.classList.contains('admin-authorized'),globalThis.fixtureImportError||'Ordinary fixture session should authorise the retained controller');assert.equal(d.querySelectorAll('[data-finance-workbench]').length,1);assert.equal(w.blackLedgerFixture.serviceRequests,0);assert.equal(w.blackLedgerFixture.businessWrites.length,0);
await w.happyDOM.close();console.log('Exact Orders browser-fixture bootstrap PASS with the accepted required Kit Definition. No service requests or business writes.');
