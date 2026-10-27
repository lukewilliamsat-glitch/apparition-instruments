import assert from 'node:assert/strict';
import {createOfferReferenceReader} from '../../dist/commercial/offer-reference.mjs';
let count=0;
async function scenario({componentRows=[{id:'fixture-a',name:'Fictional part',sku:'FX',category:'capacitors',sale_price:199}],inventoryRows=[{component_id:'fixture-a',quantity:4}],status=200}={}){const calls=[];const reader=createOfferReferenceReader({auth:{accessToken:async()=> 'fictional-session'},request:async(url,options)=>{calls.push({url,options});assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer fictional-session');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return Response.json(url.includes('/inventory?')?inventoryRows:componentRows,{status});}});return {calls,reader};}
{
 const x=await scenario(),r=await x.reader.read('capacitors');assert.equal(r.requests,2);assert.equal(r.products[0].unitPriceMinor,199);assert.equal(r.products[0].stock,4);assert.match(x.calls[0].url,/select=id,sku,name,category,sale_price/);assert.match(x.calls[0].url,/limit=201/);assert.match(x.calls[1].url,/select=component_id,quantity/);assert(!x.calls.some(c=>/image|internal_unit_cost|supplier|private_notes/.test(c.url)));await assert.rejects(()=>x.reader.read(),/already/);count++;
}
{
 const x=await scenario({inventoryRows:[]});assert.equal((await x.reader.read()).products[0].stock,null);count++;
}
{
 const x=await scenario({status:403});await assert.rejects(()=>x.reader.read(),/authorised read/);assert.equal(x.calls.length,1);count++;
}
for(const config of [{componentRows:Array(201).fill({})},{componentRows:[{id:'fixture-a',name:'Part',sale_price:199,image:'forbidden'}]},{inventoryRows:[{component_id:'other',quantity:1}]},{inventoryRows:[{component_id:'fixture-a',quantity:-1}]}]){const x=await scenario(config);await assert.rejects(()=>x.reader.read());count++;}
{
 let calls=0;const x=createOfferReferenceReader({auth:{accessToken:async()=> 'fictional-session'},request:async()=>{calls++;return new Response('x'.repeat(98305),{headers:{'Content-Type':'application/json'}});}});await assert.rejects(()=>x.read(),/byte limit/);assert.equal(calls,1);count++;
}
{
 let calls=0;const x=createOfferReferenceReader({auth:{accessToken:async()=> 'fictional-session'},request:async(url,options)=>{calls++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('cancelled'))));}});const pending=x.read();await new Promise(r=>setTimeout(r,0));x.dispose();await assert.rejects(()=>pending,/cancelled/);assert.equal(calls,1);count++;
}
console.log(JSON.stringify({offerReferenceGroups:count,result:'PASS',realRequests:0}));
