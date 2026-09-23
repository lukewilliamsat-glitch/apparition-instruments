import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {adminIsAuthorized,authorizeAdmin,lockAdmin,sha256Hex} from '../dist/admin/admin-gate.mjs';
import {adminSessionKey,adminSessionValue,temporaryPasswordDigest} from '../dist/admin/admin-gate-config.mjs';

const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
const wrong=async()=>`wrong-${temporaryPasswordDigest}`,correct=async()=>temporaryPasswordDigest;
assert.equal(await sha256Hex('abc',webcrypto),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal(adminIsAuthorized(storage),false);assert.equal(await authorizeAdmin('incorrect',storage,wrong),false);assert.equal(adminIsAuthorized(storage),false);
assert.equal(await authorizeAdmin('configured password',storage,correct),true);assert.equal(memory.get(adminSessionKey),adminSessionValue);assert.equal(adminIsAuthorized(storage),true,'authorization must persist for the session across Admin views');
assert.equal(lockAdmin(storage),true);assert.equal(adminIsAuthorized(storage),false);

const pages=new Map([['../dist/admin/index.html','./admin.mjs'],['../dist/admin/orders/index.html','./app.mjs,./create.mjs'],['../dist/admin/orders/build-sheet/index.html','./app.mjs'],['../dist/admin/wiring-kit-master/index.html','./app.mjs']]);
for(const [page,entry] of pages){const html=await readFile(new URL(page,import.meta.url),'utf8');assert(html.includes('admin-gate.mjs'),page+' must load the gate');assert(html.includes(`data-admin-entry="${entry}"`),page+' must defer its original Admin entry module');}
const css=await readFile(new URL('../dist/admin/admin.css',import.meta.url),'utf8');assert(css.includes('.admin-page:not(.admin-authorized)>:not(.admin-access-gate)'),'Admin content must fail closed');
const gateSource=await readFile(new URL('../dist/admin/admin-gate.mjs',import.meta.url),'utf8');for(const expected of ['type=\'password\'','Enter Admin','Incorrect password. Please try again.','Lock Admin','sessionStorage','renderAccessGate','revealAdmin'])assert(gateSource.includes(expected),expected+' gate behaviour missing');assert(gateSource.lastIndexOf('await revealAdmin')>gateSource.indexOf('authorizeAdmin(input.value'),'Admin modules must initialise only after authorization');
for(const route of ['../dist/index.html','../dist/components/index.html','../dist/wiring-kits/index.html','../dist/les-paul-kits/index.html','../dist/basket/index.html','../dist/checkout/index.html']){const customer=await readFile(new URL(route,import.meta.url),'utf8');assert(!customer.includes('admin-gate.mjs'),route+' must remain public');}
console.log('Temporary Admin gate: denied/accepted access, session persistence, direct Admin entries, lock and unaffected customer entry passed.');
