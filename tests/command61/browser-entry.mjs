const phase=(await (await fetch('/tests/command61/phase.json')).json()).phase;
if(phase==='C'){
 const {bootAdminGate}=await import('/admin/admin-gate.mjs');
 const {setComponentRepository}=await import('/admin/component-repository.mjs');
 const {setAssemblyRepository}=await import('/admin/assembly-repository.mjs');
 const {lesPaulKitAssembly}=await import('/admin/assemblies.mjs');
 const {setAdminOrderRepository}=await import('/backend/order-data.mjs?v=external-v1');
 const {adminAuthSessionKey}=await import('/admin/admin-auth.mjs');
 const params=new URLSearchParams(location.search),state=params.get('fixture-auth')||'authorized',writes=[],calls=[],diagnostic={componentLists:0,orderLists:0};
 const blocked=async()=>{writes.push('BLOCKED_BUSINESS_WRITE');throw Error('Business writes forbidden in acceptance');};
 const component={id:'fixture-cap',name:'Fictional Workshop Capacitor',sku:'FX-CAP-001',category:'capacitors',manufacturer:'Fixture Works',specs:{Value:'0.022 µF',Voltage:'200V'},stock:24,stockUnit:'item',active:true,individually:true,inKits:true,salePrice:1000,kitPrice:500,kitPriceQuantity:1,internalUnitCost:100,image:null};
 const items=[{type:'component',productId:'fixture-cap',name:component.name,sku:component.sku,quantity:2,unitPrice:1000,lineTotal:2000,snapshot:{componentId:'fixture-cap',specification:{Value:'0.022 µF'}}},{type:'component',productId:'fixture-switch',name:'Fictional Switch',sku:'FX-SW',quantity:1,unitPrice:500,lineTotal:500,snapshot:{componentId:'fixture-switch',specification:{}}}];
 const order={id:'fictional-order',reference:'FX-000001',createdAt:'2026-10-27T00:00:00Z',updatedAt:'2026-10-27T00:00:00Z',orderDate:'2026-10-27',paymentStatus:'paid',refundedPence:0,fulfilmentStatus:'paid',channel:'EBAY',externalReference:'FX-EBAY',customer:{name:'Fictional customer',email:''},delivery:{},items,pricing:{subtotal:2500,delivery:300,total:2800},statusHistory:[],emailDeliveries:[]};
 setComponentRepository({list:async()=>{diagnostic.componentLists++;return [structuredClone(component)];},save:blocked,changeStock:blocked,remove:blocked});
 setAssemblyRepository({list:async()=>[structuredClone(lesPaulKitAssembly)],save:blocked});
 setAdminOrderRepository({list:async()=>{diagnostic.orderLists++;return [structuredClone(order)];},aftercare:async()=>[],externalProducts:async()=>items.map(item=>({id:item.productId,type:'component',name:item.name,sku:item.sku,price:item.unitPrice,available:20})),createExternal:blocked,editExternal:blocked,advanceFulfilment:blocked,recordDispatchDetails:blocked});
 if(state==='authorized')localStorage.setItem(adminAuthSessionKey,JSON.stringify({access_token:'fictional-ordinary-session',refresh_token:'fictional-refresh',expires_at:Math.floor(Date.now()/1000)+3600}));
 globalThis.fetch=async(url,options={})=>{const u=new URL(url,location.href),path=u.pathname;if(path==='/rest/v1/component_internal'){calls.push({path,method:options.method,query:u.search,bytes:0});if(options.headers.Authorization!=='Bearer fictional-ordinary-session'||params.has('fixture-cost-denied'))return Response.json({message:'Fictional permission denial'},{status:403});const rows=[{component_id:'fixture-cap',internal_unit_cost:100,updated_at:'2026-10-27T00:00:00Z'},{component_id:'fixture-switch',internal_unit_cost:params.has('fixture-missing-cost')?null:200,updated_at:'2026-10-27T00:00:00Z'}];return Response.json(rows);}if((options.method||'GET')==='GET'&&['/rest/v1/catalogue_options','/rest/v1/catalogue_components','/rest/v1/catalogue_wiring_kits'].includes(path))return Response.json([]);throw Error('Unexpected service request in fictional acceptance');};
 await bootAdminGate({document,auth:{restore:async()=>({status:state==='authorized'?'authorized':'signed-out'}),signOut:async()=>{localStorage.removeItem(adminAuthSessionKey);return {status:'signed-out'};}},load:specifier=>import(specifier)});
 window.rebirthFixture={writes,diagnostic};window.ascendanceFixture={phase,calls};
}else{
// Reuse the accepted fictional Auth and existing controller fixture, never production data.
await import('/tests/command60/browser-entry.mjs');
const calls={};
if(location.pathname==='/admin/overview/'&&document.body.classList.contains('admin-authorized')){
 const root=document.getElementById('overview-content');root.id='fixture-overview';
 const {bootOverview}=await import('/admin/overview.mjs');root.id='overview-content';
 const data={inventory:[{name:'Fictional capacitor',stock:0,active:true},{name:'Fictional switch',stock:12,active:true}],catalogue:[{active:true,kind:'assembly'},{active:true,kind:'wiring-kit'}],orders:[{paymentStatus:'paid',fulfilmentStatus:'paid'},{paymentStatus:'paid',fulfilmentStatus:'ready_to_dispatch'}],articles:[],website:{store:{desired_state:'OPEN'},posts:[]}};
 const sources=Object.fromEntries(Object.keys(data).map(id=>[id,async()=>{calls[id]=(calls[id]||0)+1;if(id==='website'&&new URLSearchParams(location.search).has('fixture-failure')&&calls[id]===1)throw Error('Fictional unavailable source');return structuredClone(data[id]);}]));
 await bootOverview({document,sources});
}
window.ascendanceFixture={phase:'A',calls};

}
