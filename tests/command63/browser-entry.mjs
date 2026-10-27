// Explicit fictional session/records. No real token, service or business write.
import {bootAdminGate} from '/admin/admin-gate.mjs';
import {setComponentRepository} from '/admin/component-repository.mjs';
import {setAssemblyRepository} from '/admin/assembly-repository.mjs';
import {setAdminOrderRepository} from '/backend/order-data.mjs?v=external-v1';
const businessWrites=[],state={businessWrites,serviceRequests:0};const blocked=async()=>{businessWrites.push('BLOCKED');throw Error('Business writes forbidden');};
setComponentRepository({list:async()=>[],save:blocked,changeStock:blocked,remove:blocked});setAssemblyRepository({list:async()=>[],get:async()=>null,save:blocked});
const order={id:'fixture-finance-order',reference:'FX-FIN-63',channel:'EBAY',externalReference:'FX-63',createdAt:'2026-10-27T00:00:00Z',updatedAt:'2026-10-27T00:00:00Z',orderDate:'2026-10-27',paymentStatus:'paid',fulfilmentStatus:'paid',refundedPence:0,customer:{name:'Fictional customer',email:''},delivery:{},items:[{type:'component',productId:'fixture-cap',sku:'FX-CAP',name:'Fictional capacitor',quantity:1,unitPrice:399,lineTotal:399,snapshot:{componentId:'fixture-cap',specification:{}}}],pricing:{subtotal:399,delivery:0,total:399},statusHistory:[],emailDeliveries:[]};
setAdminOrderRepository({list:async()=>[structuredClone(order)],aftercare:async()=>[],externalProducts:async()=>[],createExternal:blocked,editExternal:blocked,advanceFulfilment:blocked,recordDispatchDetails:blocked});
globalThis.fetch=async()=>{state.serviceRequests++;throw Error('No service requests in reconciliation acceptance');};
await bootAdminGate({document,auth:{restore:async()=>({status:'authorized'}),signOut:async()=>({status:'signed-out'})},load:specifier=>import(specifier)});window.blackLedgerFixture=state;
