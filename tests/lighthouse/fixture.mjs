// Native application modules are served unchanged except the public URL/key.
// Every backend route below is fictional and terminates at this loopback server.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {initialComponents} from '../../dist/admin/data.mjs';
import {lesPaulKitAssembly} from '../../dist/admin/assemblies.mjs';
const root=resolve('dist'),mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon'};
export const basketKey='apparition.basket.v1';
export const savedBasket=JSON.stringify({version:1,items:[{id:'fictional-intent',product:'component',sku:'cde-022',quantity:1}]});
export const components=initialComponents().map((p,i)=>({id:p.id,sku:'FICTIONAL-'+i,name:'Fictional workshop component '+i,category:p.category,manufacturer:'Fictional workshop',description:'Fictional fixture, no production product claim.',specs:p.specs,product_content:{},individually:p.individually,in_kits:p.inKits,sale_price:599,kit_price:100,kit_price_quantity:1,stock:20,image:null}));
const k=lesPaulKitAssembly.kitDefinition;
export const kits=[{id:lesPaulKitAssembly.id,sku:'FICTIONAL-KIT',name:'Fictional wiring kit',category:'kits',slug:'les-paul',base_price:1000,show_on_wiring_kits:true,builder_enabled:true,default_wiring_style:'modern',defaults:k.defaults,builder_options:k.builderOptions,component_resolvers:k.componentResolvers}];
export async function createFixture(){
 let mode={},origin;const requests=[],errors=[],timers=new Set();
 const pause=ms=>new Promise(r=>{const timer=setTimeout(()=>{timers.delete(timer);r();},ms);timers.add(timer);});
 const server=createServer(async(req,res)=>{
  const state={...mode};try{
   const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname;const requestRow={path:url.pathname,query:url.search,method:req.method};requests.push(requestRow);
   const json=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
   if(path.startsWith('/__fixture/backend/')){
    const resource=path.slice('/__fixture/backend/'.length);
    if(resource==='rest/v1/rpc/get_site_operations')return json({server_time:new Date().toISOString(),store:{state:state.store||'OPEN',desired_state:state.store||'OPEN',customer_message:state.store==='ORDERS_PAUSED'?'Fictional workshop pause.':''}});
    if(resource.startsWith('rest/v1/rpc/public_news'))return json([]);
    if(resource==='rest/v1/rpc/public_commercial_destinations'){
     if(state.commercial)await pause(300);
     return json(state.commercial?[{scope:'PRODUCT',scope_key:'cde-022',destination_type:'EBAY',url:'https://www.ebay.co.uk/itm/FICTIONAL',label:'Fictional listing',paused_only:false}]:[]);
    }
    if(resource==='rest/v1/commerce_shipping')return json([{standard_delivery_pence:399,free_delivery_threshold_pence:5000}]);
    if(resource==='rest/v1/catalogue_wiring_kits')return state.kitReject?json({},500):json(kits);
    if(resource==='rest/v1/kit_permitted_components')return json(components.map(p=>({assembly_id:lesPaulKitAssembly.id,component_id:p.id})));
    if(resource==='rest/v1/catalogue_options')return json([]);
    if(resource==='rest/v1/catalogue_components'){
     if(state.catalogue==='late'||state.catalogue==='timeout')await pause(state.catalogue==='late'?18000:22000);
     if(/^http\d+$/.test(state.catalogue||''))return json({},Number(state.catalogue.slice(4)));
     if(state.catalogue==='malformed'){res.writeHead(200,{'content-type':'application/json'});return res.end('not JSON');}
     if(state.catalogue==='invalid')return json({rows:[]});
     let rows=state.catalogue==='empty'?[]:components;
     if(state.unsupportedCategory)rows=rows.map(p=>({...p,individually:true}));
     if(state.longText)rows=rows.map(p=>({...p,name:'Fictional long component name — '+('carefully described workshop part '.repeat(9)),sku:'FICTIONAL-'+('LONG-'.repeat(12)),description:'Fictional long description. '.repeat(50)}));
     if(url.searchParams.has('id'))rows=rows.filter(p=>p.id===url.searchParams.get('id').replace(/^eq\./,''));
     return json(rows);
    }
    if(resource==='functions/v1/create-checkout'){
     let body='';for await(const chunk of req)body+=chunk;
     const input=JSON.parse(body);requestRow.input=input;
     if(state.checkoutDelay)await pause(state.checkoutDelay);
     if(state.checkoutLost){req.socket.destroy();return;}
     return json({message:'Fictional checkout definitively declined; no payment session exists.'},409);
    }
    if(resource==='functions/v1/contact-enquiry'){
     let body='';for await(const chunk of req)body+=chunk;requestRow.input=JSON.parse(body);
     if(state.contactDelay)await pause(state.contactDelay);
     if(state.contact==='lost'||state.contact==='timeout'){req.socket.destroy();return;}
     const cases={sent:[200,'sent'],failed:[502,'failed'],invalid:[400,'invalid'],rate:[429,'rate_limited'],ambiguous:[202,'unknown']};const [status,result]=cases[state.contact||'sent'];return json({state:result},status);
    }
    throw Error('Unapproved fictional resource '+resource);
   }
   if(req.method!=='GET')throw Error('Unsupported method');
   let body,filePath=path.endsWith('/')?path+'index.html':path;
   if(path==='/backend/public-config.mjs')body=Buffer.from(`export const publicBackendConfig=Object.freeze({url:${JSON.stringify(origin+'/__fixture/backend')},publishableKey:'sb_publishable_fictional_only'});`);
   else if(path==='/operations/snapshot.json')return json({store:{state:'OPEN',desired_state:'OPEN'},news:[]});
   else if(path==='/commercial/destinations.json')return json({version:2,destinations:[]});
   else{
    const file=resolve(root,'.'+decodeURIComponent(filePath));assert(file.startsWith(root+'/'));
    body=await readFile(file);
    if(extname(file)==='.css')body=Buffer.from(body.toString().replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^'"]+['"]\)\s*;/g,''));
    if(path==='/storefront/entry.mjs'&&state.entryDelay)await pause(state.entryDelay);
   }
   res.writeHead(200,{'content-type':mime[extname(filePath)]||'application/octet-stream','cache-control':'no-store','content-security-policy':"default-src 'self' data: blob:; connect-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-src 'none'"});res.end(body);
  }catch(error){errors.push({path:req.url,error:String(error)});if(!res.headersSent)res.writeHead(404);res.end('Fictional fixture unavailable');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 return{origin,requests,errors,configure:value=>{mode={...value};},close:async()=>{for(const timer of timers)clearTimeout(timer);server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
