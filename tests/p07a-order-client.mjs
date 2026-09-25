import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuestOrderRepository,createAdminOrderRepository} from '../dist/backend/order-data.mjs';
import {createAuthenticatedRepositoryTransport} from '../dist/backend/providers.mjs';

const config={url:'https://sample.supabase.co',publishableKey:'sb_publishable_test'},payload={requestId:crypto.randomUUID(),items:[{product:'les-paul',quantity:1,record:{schemaVersion:3}}]},response={id:crypto.randomUUID(),reference:'AI-010001',totalPence:3999,paymentStatus:'unpaid'};
let calls=0;const guest=createGuestOrderRepository({config,request:async(url,options)=>{calls++;assert(url.endsWith('/rest/v1/rpc/create_guest_kit_order'));assert.equal(options.headers.apikey,config.publishableKey);assert.equal(options.headers.Authorization,undefined);assert.deepEqual(JSON.parse(options.body),{p_request:payload});return {ok:true,json:async()=>response};}});
assert.deepEqual(await guest.create(payload),response);assert.equal(calls,1);
await assert.rejects(createGuestOrderRepository({config,request:async()=>({ok:false,status:400,json:async()=>({message:'Kit price breakdown differs from current prices'})})}).create(payload),/Kit price breakdown/);
let tokenCalls=0;const transport=createAuthenticatedRepositoryTransport({accessToken:async()=>{tokenCalls++;return 'admin-session-token';}},{config,request:async(url,options)=>{assert(url.includes('/rest/v1/orders?select='));assert.equal(options.headers.Authorization,'Bearer admin-session-token');return {ok:true,json:async()=>[{id:response.id,reference:response.reference,customer:{name:'Test Customer'},delivery:{line1:'Test Road'},items:[],status:'pending',payment_status:'unpaid',subtotal_pence:3999,delivery_pence:0,total_pence:3999,created_at:'2026-09-25T08:00:00Z'}]};}});
const rows=await createAdminOrderRepository(transport).list();assert.equal(rows[0].reference,response.reference);assert.equal(rows[0].paymentStatus,'unpaid');assert.equal(rows[0].pricing.total,3999);assert.equal(tokenCalls,1);
const migration=readFileSync(new URL('../supabase/migrations/20260925083000_p07a_guest_orders.sql',import.meta.url),'utf8');
assert.match(migration,/orders_admin_read/);assert.match(migration,/enable row level security/);assert.match(migration,/revoke all on public\.orders from public, anon, authenticated/);assert.match(migration,/security definer set search_path = ''/);assert.match(migration,/component\.kit_price/);assert.match(migration,/stockRequirements/);assert.doesNotMatch(migration,/update public\.inventory|delete from public\.inventory/i);
const admin=readFileSync(new URL('../dist/admin/orders/index.html',import.meta.url),'utf8');assert(!admin.includes('./create.mjs"'),'browser-local order creation is not loaded as canonical Admin');
console.log('P07A customer RPC, secure Admin Orders transport, canonical price/quantity checks and no Inventory mutation passed.');
