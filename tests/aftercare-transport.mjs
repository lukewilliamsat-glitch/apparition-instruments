import assert from 'node:assert/strict';
import {createAuthenticatedRepositoryTransport} from '../dist/backend/providers.mjs';
import {createAdminOrderRepository} from '../dist/backend/order-data.mjs';
import {Window} from 'happy-dom';
import {renderAftercareQueue} from '../dist/admin/orders/customer-aftercare.mjs';
import {aftercareDatabase} from './fixtures/aftercare-database.mjs';

// Exercise the shared production transport, rather than mocking repository.send.
const config={url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'};
const row={orderId:'10000000-0000-4000-8000-000000000001',reference:'AI-100001',customerName:'Fixture',channel:'EBAY',state:'due',dueDate:'2026-03-08',route:'manual',eligible:true,history:[]};
let calls=[],tokens=0,status=200,payload=[row];
const transport=createAuthenticatedRepositoryTransport({accessToken:async()=>{tokens++;return 'isolated-admin-token';}},{config,request:async(url,options)=>{calls.push({url,options});return Response.json(payload,{status});}});
const repository=createAdminOrderRepository(transport);
assert.deepEqual(await repository.aftercare(),[row]);
assert.equal(calls[0].url,config.url+'/rest/v1/rpc/get_customer_aftercare');
assert.equal(calls[0].options.method,'POST');
assert.equal(calls[0].options.headers.Authorization,'Bearer isolated-admin-token');
assert.equal(calls[0].options.headers.apikey,config.publishableKey);
assert.deepEqual(JSON.parse(calls[0].options.body),{});
payload=true;await repository.updateAftercare(row.orderId,row,'skip',{reason:'Isolated owner decision'});
assert.equal(calls[1].url,config.url+'/rest/v1/rpc/update_customer_aftercare');
assert.deepEqual(JSON.parse(calls[1].options.body),{p_order_id:row.orderId,p_expected:row,p_action:'skip',p_due_date:null,p_reason:'Isolated owner decision'});
const before=calls.length,authBefore=tokens;
for(const resource of ['rpc/confirm_aftercare_preview','rpc/finish_aftercare_delivery','rpc/aftercare_state','unknown'])await assert.rejects(transport.send(resource),/Unsupported Admin repository resource/);
assert.equal(calls.length,before);assert.equal(tokens,authBefore);
payload=[];assert.deepEqual(await repository.aftercare(),[]);
const w=new Window(),root=w.document.createElement('section');renderAftercareQueue([],{document:w.document,root});assert.match(root.textContent,/No .*aftercare|No .*follow-up/i);
payload={unexpected:true};await assert.rejects(repository.aftercare(),/Invalid aftercare response/);
status=503;payload={message:'Backend temporarily unavailable'};await assert.rejects(repository.aftercare(),/Backend temporarily unavailable/);
for(const denied of [401,403]){status=denied;payload={message:'Admin membership required'};await assert.rejects(repository.aftercare(),/Admin membership required/);}
await w.happyDOM.close();
// Verify the same queue chain against isolated real SQL, including role gates.
const {db,actor}=await aftercareDatabase();let role='authenticated';
const sqlRepository=createAdminOrderRepository(createAuthenticatedRepositoryTransport({accessToken:async()=>actor},{config,request:async(url,options)=>{
 assert.equal(url,config.url+'/rest/v1/rpc/get_customer_aftercare');assert.deepEqual(JSON.parse(options.body),{});
 try{await db.exec('set role '+role);return Response.json((await db.query('select public.get_customer_aftercare() result')).rows[0].result);}catch(error){return Response.json({message:error.message},{status:403});}finally{await db.exec('reset role');}
}}));
assert(Array.isArray(await sqlRepository.aftercare()),'Authenticated Admin SQL response is accepted by the real repository');
role='anon';await assert.rejects(sqlRepository.aftercare(),/permission denied/);
role='authenticated';await db.query("select set_config('request.jwt.claim.sub',$1,false)",['10000000-0000-4000-8000-000000000099']);await assert.rejects(sqlRepository.aftercare(),/Admin membership required/);
await db.close();
console.log('Aftercare shared transport PASS: real repository chain, refreshed bearer token, queue/action payloads, empty/schema/failure/denial handling and internal RPCs blocked before Auth/network.');
