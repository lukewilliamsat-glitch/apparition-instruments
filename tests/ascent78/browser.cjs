const {chromium}=require('playwright');
const {assess,extraAdmin,publicRoutes}=require('./depth.cjs');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),{pathToFileURL}=require('node:url');
const stableId='b1d8a9b5-a055-414e-a8dd-d1a2356b4100';
const base=process.env.SENTINEL_ROOT||'/tmp/sentinel77';
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2'};
const workspaces=['/admin/','/admin/?view=inventory','/admin/?view=assemblies','/admin/?view=maintenance','/admin/overview/','/admin/orders/','/admin/orders/?view=aftercare','/admin/orders/?view=attempts','/admin/orders/?new=external','/admin/orders/build-sheet/','/admin/orders/invoice/','/admin/site-operations/','/admin/site-operations/#commercial-destinations','/admin/delivery/','/admin/catalogue-settings/','/admin/command/','/admin/conjure/','/admin/hub-cms/','/admin/hub-media/','/admin/email-preview/','/admin/email-templates/','/admin/wiring-kit-master/','/admin/ironclad/','/circuit-forge/','/checkout/','/','/components/','/products/bleed-cap/'];
const now='2026-11-19T13:00:00.000Z';
const orderId='4588857f-340e-4bca-92b1-62268b470631';
const reference='AI-099901';
const sampleOrder={id:orderId,reference,sales_channel:'EBAY',external_reference:'SENTINEL-FIXTURE-ONLY',created_at:now,updated_at:now,order_date:'2026-11-18',paid_at:now,subtotal_pence:749,delivery_pence:399,total_pence:1148,status:'dispatched',payment_status:'paid',customer:{name:'Fictional workshop'},delivery:{},items:[{type:'component',name:'Synthetic tone capacitor',productId:'synthetic-capacitor',quantity:1,unitPrice:749,lineTotal:749,snapshot:{manufacturer:'Fixture',productSpecifications:[{label:'Capacitance',value:'1 nF'}],description:'Fictional component'}}],status_history:[]};
const attempt={...sampleOrder,id:'4588857f-340e-4bca-92b1-62268b470632',reference:'AI-099902',sales_channel:'WEBSITE',external_reference:null,paid_at:null,status:'pending',payment_status:'unpaid'};
const followup={orderId,reference,customerName:'Fictional workshop',channel:'EBAY',dispatchAt:now,defaultDue:'2026-11-19',dueDate:'2026-11-19',eligible:true,state:'due',suppressed:false,history:[]};
const readPosts=new Set(['ironclad69_read','ironclad69_cost_read','omniscience74_orders','omniscience74_outlays','public_news','public_commercial_destinations','get_site_operations','get_customer_aftercare','get_admin_email_templates','overseer_delivery_admin_read','overseer_delivery_admin_preview','overseer_delivery_options','overseer_order_date_history','overseer_aftercare_history','eclipse_fulfilment_library','command63_financial_read','command63_financial_status','command63_financial_batch']);
workspaces[workspaces.indexOf('/admin/orders/invoice/')]+='?id='+orderId;
workspaces[workspaces.indexOf('/admin/orders/build-sheet/')]+='?order='+orderId;
workspaces.push('/admin/orders/?id='+orderId,'/checkout/?fixture=free-delivery',...extraAdmin,...publicRoutes);

const ship={methods:[{id:'standard',name:'UK Delivery',price:399,minOrder:0,minUnits:0,description:'Standard UK delivery',dispatchDays:null,deliveryDays:null}],freeEnabled:true,freeThreshold:5000,overrides:[],promo:null};
const ops={server_time:now,store:{state:'OPEN',desired_state:'OPEN',pause_from:null,resume_at:null,revision:1,updated_at:now,customer_title:'',customer_message:'',internal_reason:''},announcement:null,announcements:[],news:[],revision:1};
const mock=(u,role,kitTables,data,fixture)=>{
 let r=u.pathname.replace('/rest/v1/',''), v;
 if(u.pathname==='/auth/v1/user')return fixture.customer?{id:stableId,email:'fictional@example.invalid',email_confirmed_at:now,aud:'authenticated',role:'authenticated',created_at:now,user_metadata:{},app_metadata:{}}:{id:stableId};
 if(u.pathname==='/functions/v1/transactional-email/preview')return {html:'<p>Fictional preview</p>',text:'Fictional preview',subject:'Fictional preview',label:'PREVIEW — NOT A REAL ORDER'};
 if(u.pathname==='/functions/v1/transactional-email/template-preview')return {html:'<p>Fictional preview</p>',text:'Fictional preview',subject:'Fictional preview',label:'SAMPLE ONLY',key:'aftercare:WEBSITE',orderReference:reference};
 if(r==='admin_members')return ['authorized','renewed'].includes(role)?[{user_id:stableId}]:[];
 if(u.pathname==='/functions/v1/my-orders'&&fixture.customer){const row={reference,createdAt:now,totalPence:1148,pricing:{subtotal:749,delivery:399,total:1148},status:'dispatched',paymentStatus:'paid',items:sampleOrder.items,dispatch:{},address:[]};return u.searchParams.has('reference')?{order:row}:{orders:[row]};}
 if(u.pathname==='/functions/v1/checkout-status')return {reference:'AI-099901',paymentStatus:'paid'};
 switch(r){
 case 'rpc/ironclad69_read':
  if(data.p_view==='inventory')return [{component_id:'synthetic-capacitor',name:'Synthetic tone capacitor',sku:'CAP-SYNTHETIC',stock_unit:'each',physical:12,available:12,reserved:0,allocated:0,quality_held:0,incoming:0,low:2,target:4,suggested:0,revision:0}];
  return [];
 case 'rpc/ironclad69_cost_read':return [];
 case 'rpc/omniscience74_orders':case 'rpc/omniscience74_outlays':return {rows:[],next:null};
 case 'rpc/get_site_operations':return ops;
 case 'site_operations':return [ops.store];
 case 'orders':return fixture.empty?[]:[attempt,sampleOrder];
 case 'rpc/public_news':case 'rpc/public_commercial_destinations':return [];
 case 'rpc/get_customer_aftercare':return [followup];
 case 'rpc/overseer_order_date_history':return [];
 case 'commerce_shipping':return [{country:'GB',standard_delivery_pence:399,free_delivery_threshold_pence:5000}];
 case 'rpc/overseer_delivery_admin_read':return {revision:fixture.draft?1:0,active:null,draft:fixture.draft||null,legacy:ship,history:[]};
 case 'rpc/overseer_delivery_admin_write':fixture.draft=data.p_config;return {revision:1,active:null,draft:fixture.draft,legacy:ship,history:[{action:'draft',changed_at:now}]};
 case 'rpc/overseer_delivery_options':return [{id:'standard',name:'UK Delivery',description:'Standard UK delivery',price:data.p_subtotal>=5000?0:399}];
 case 'rpc/eclipse_fulfilment_library':return {revision:0,items:[],presets:[]};
 case 'rpc/get_admin_email_templates':return ['aftercare:WEBSITE','aftercare:EBAY','dispatched:WEBSITE','dispatched:EBAY'].map(template_key=>({template_key,revision:0,draft:null,history:[],published:{version:1,content:{subject:'Fictional preview',heading:'Synthetic template',body:'Test copy'}}}));
 case 'rpc/command63_financial_status':return {enabled:true};
 case 'rpc/command63_financial_read':return {version:1,orderId,orderBasisHash:'a'.repeat(64),orderBasisMatches:true,revision:1,document:kitTables.financeDocument,history:[{revision:1,recorded_at:now,actor_id:stableId}]};
 default:return kitTables[r]||[];
 }
};
async function server(root){
 const imp=rel=>import(pathToFileURL(path.join(root,rel)));
 const {lesPaulKitAssembly:k}=await imp('admin/assemblies.mjs');
 const def=k.kitDefinition;
 const assembly={id:k.id,sku:k.sku,name:k.name,category:k.category,kind:'wiring-kit',active:true};
 const defRow={assembly_id:k.id,family:def.family,base_price:def.basePrice,show_on_wiring_kits:def.showOnWiringKits,builder_enabled:def.builderEnabled,defaults:def.defaults,builder_options:def.builderOptions,component_resolvers:def.componentResolvers};
 const cap={id:'synthetic-capacitor',sku:'synthetic-capacitor',name:'Synthetic tone capacitor',category:'capacitors',manufacturer:'Fixture',description:'Only present in the offline fixture',specs:{Capacitance:'1 nF'},individual:true,individually:true,active:true,in_kits:false,sale_price:749,kit_price:500,stock:100,image:null,product_content:{}};
 const img={...cap,id:'bleed-cap',sku:'fixture-public-bleed',name:'Synthetic Capacitor-only treble bleed',category:'treble-bleeds',image:{kind:'object',url:'/products/bleed-cap/image.png'},product_content:{productTitle:'Fixture capacitor-only treble bleed'}};
 const kitTables={catalogue_options:[{option_set:'manufacturer',option_key:'fixture',label:'Fixture',active:true}],catalogue_components:[cap,img],components:[cap],inventory:[{component_id:cap.id,quantity:100,stock_unit:'item'}],catalogue_wiring_kits:[{...defRow,...assembly,slug:def.family}],assemblies:[assembly],assembly_bom:k.bom.map((r,position)=>({assembly_id:k.id,position,component_id:r.componentId,quantity:r.quantity})),kit_definitions:[defRow],kit_definition_internal:[{assembly_id:k.id,metadata:def.metadata}],kit_permitted_components:def.permittedComponentIds.map(component_id=>({assembly_id:k.id,component_id}))};
 const {financeDraft}=await imp('admin/orders/finance-ui.mjs');
 kitTables.financeDocument=financeDraft({items:sampleOrder.items,pricing:{delivery:399,total:1148}});
 const {createKitSnapshot}=await imp('les-paul-kits/snapshot.mjs'),{lesPaul}=await imp('les-paul-kits/config.mjs');
 for(const options of [lesPaul.capacitors,lesPaul.bleed,lesPaul.jack,lesPaul.selector])for(const option of Object.values(options))if(option.component)option.component.stock=100;
 const snap=createKitSnapshot({wiring:'modern',matching:'precision'});
 const {createOrderStore,kitOrderItem,orderStorageKey}=await imp('admin/orders/model.mjs');
 const sessionData=new Map(),storage={getItem:key=>sessionData.get(key)??null,setItem:(key,value)=>sessionData.set(key,value)};
 await createOrderStore(storage,{lock:(_key,fn)=>fn(),uuid:()=>orderId,now:()=>now}).create({channel:'MANUAL',status:'PAID',customer:{name:'Synthetic workshop'},items:[kitOrderItem(snap)],deliveryPrice:399},'sentinel77-browser-build-sheet');
 const legacyOrders=sessionData.get(orderStorageKey);
 const s=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  let file=path.join(root,decodeURIComponent(u.pathname));
  if(u.pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{const b=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(b);}
  catch{res.writeHead(404).end('fixture path unavailable');}
 });
 await new Promise(r=>s.listen(0,'127.0.0.1',r));
 return [s,'http://127.0.0.1:'+s.address().port,kitTables,legacyOrders,root];
}
async function exercise(b,origin,pathname,role,debug,name,kitTables,legacyOrders,root){
 const pathnameURL=new URL(pathname,origin),probe=pathnameURL.searchParams.get('probe');
 const fixture={empty:probe==='empty',error:probe==='backend-error',draft:null,customer:pathnameURL.searchParams.get('fixture')==='customer'};
 const ctx=await b.newContext(probe==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
 const result={pathname,role,entries:[],browserExceptions:[],pageErrors:[],consoleErrors:[],bad:[],external:[],requests:[],modules:[],catch:[],blockedWrites:[],features:{},parseErrors:[],depth:{},depthErrors:[],unexpected:[]};
 if(role!=='anonymous')await ctx.addInitScript(({legacyOrders,role})=>{
     if(window.top!==window)return;
     if(!sessionStorage.getItem('fixture-admin-initialised')){sessionStorage.setItem('fixture-admin-initialised','true');localStorage.setItem('apparition.admin.supabase-session.v1',JSON.stringify({access_token:'synthetic-only',refresh_token:'synthetic-only',expires_at:Math.floor(Date.now()/1000)+(['expired','renewed'].includes(role)?-60:7200)}));}
     localStorage.setItem('apparition.admin.orders.v1',legacyOrders);
     if(new URLSearchParams(location.search).get('fixture')==='customer'){const expires_at=Math.floor(Date.now()/1000)+7200,user={id:'b1d8a9b5-a055-414e-a8dd-d1a2356b4100',email:'fictional@example.invalid',email_confirmed_at:'2026-11-19T13:00:00.000Z',aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{}};localStorage.setItem('apparition.customer.auth.v1',JSON.stringify({access_token:'fixture-customer-session',refresh_token:'fixture-customer-refresh',expires_at,expires_in:7200,token_type:'bearer',user}));}
     if([' /checkout/',' /basket/'].includes(' '+location.pathname)){
      const quantity=new URLSearchParams(location.search).has('fixture')?7:1;
      localStorage.setItem('apparition.basket.v1',JSON.stringify({version:1,items:[{id:'fixture-basket-only',product:'component',sku:'synthetic-capacitor',quantity}]}));
     }
   },{legacyOrders,role});
 await ctx.route('**/*',async x=>{
  const u=new URL(x.request().url());
  if(u.origin===origin){if(u.pathname.endsWith('.mjs'))result.modules.push(u.pathname+u.search);return x.continue();}
  if(u.hostname==='apparitioninstruments.co.uk'&&['image','stylesheet','font'].includes(x.request().resourceType())){
   const local=path.resolve(root,'.'+u.pathname);
   if(local.startsWith(root+'/'))try{return await x.fulfill({body:await fs.readFile(local),contentType:mime[path.extname(local)]||'application/octet-stream'});}catch{}
  }
  if(u.hostname.endsWith('.supabase.co')){
   const method=x.request().method(),data=x.request().postDataJSON?.()??{};
   result.requests.push({method,path:u.pathname,authenticated:x.request().headers().authorization==='Bearer synthetic-only'});
   const reply=(json,status=200)=>x.fulfill({json,status,headers:{'access-control-allow-origin':origin}});
   if(u.pathname==='/auth/v1/token'&&method==='POST'){
    const refresh=u.searchParams.get('grant_type')==='refresh_token';
    if(refresh&&role==='expired')return reply({message:'Expired fixture token'},401);
    if(refresh&&role==='renewed'||probe==='session'&&!refresh&&data.email==='fixture-admin@example.invalid')return reply({access_token:'synthetic-only',refresh_token:'synthetic-only',expires_in:7200});
   }
   if(u.pathname==='/auth/v1/logout'&&method==='POST'&&probe==='session')return reply({});
   if(u.pathname==='/rest/v1/orders'&&fixture.error)return reply({message:'Synthetic Orders unavailable'},503);
   const draft=pathnameURL.pathname==='/admin/delivery/'&&probe==='non-live-draft'&&u.pathname.endsWith('/rpc/overseer_delivery_admin_write')&&data.p_action==='draft'&&method==='POST';
   const contact=pathnameURL.pathname==='/contact/'&&u.pathname==='/functions/v1/contact-enquiry'&&data.email==='synthetic@example.invalid'&&method==='POST';
   if(contact)return reply({state:'sent'});
   if(!draft&&method!=='GET'&&method!=='HEAD'&&!(method==='POST'&&(u.pathname.startsWith('/rest/v1/rpc/')&&readPosts.has(u.pathname.split('/').at(-1))||u.pathname==='/functions/v1/transactional-email/template-preview'))){
    result.blockedWrites.push(method+' '+u.pathname);
    return x.fulfill({status:403,json:{message:'fixture only: unexpected mutation'},headers:{'access-control-allow-origin':origin}});
   }
   const value=mock(u,role,kitTables,data,fixture);
   if(u.pathname.endsWith('/catalogue_components')&&u.searchParams.get('id')?.startsWith('eq.'))return reply(value.filter(row=>row.id===u.searchParams.get('id').slice(3)));
   return reply(value);
  }
  result.external.push(u.hostname+u.pathname);
  return x.abort();
 });
 const page=await ctx.newPage();
 page.on('response',x=>{if(x.status()>=400&&x.url().startsWith(origin))result.bad.push(x.status()+' '+x.url().slice(origin.length));});
 page.on('pageerror',x=>result.pageErrors.push(String(x)));
 page.on('console',x=>{if(x.type()==='error')result.consoleErrors.push(x.text());});
 if(debug){
  const c=await ctx.newCDPSession(page);const scripts=new Map();
  c.on('Debugger.scriptFailedToParse',s=>{if(s.url.startsWith(origin))result.parseErrors.push(s.url.slice(origin.length));});
  c.on('Debugger.scriptParsed',s=>scripts.set(s.scriptId,s.url));
  c.on('Debugger.paused',async e=>{
   try{
    const frames=e.callFrames.slice(0,7).map(f=>[f.functionName,(scripts.get(f.location.scriptId)||f.url||'').replace(origin,''),f.location.lineNumber+1]);
    if(result.browserExceptions.length<28)result.browserExceptions.push({reason:e.reason,description:e.data?.description?.slice(0,1200),frames});
   }finally{await c.send('Debugger.resume').catch(()=>{});}
  });
  await c.send('Debugger.enable');await c.send('Debugger.setPauseOnExceptions',{state:'all'});
 }
 try{
  await page.goto(origin+pathname,{waitUntil:'load',timeout:9000});
  await page.waitForFunction(()=>document.body.classList.contains('admin-authorized')||!!document.querySelector('.admin-access-panel [role=alert]')?.textContent?.trim()||!!document.querySelector('.admin-access-panel form')||document.querySelector('.admin-access-note')?.textContent?.includes('not authorised'),{},{timeout:pathname.startsWith('/admin/')?2800:180}).catch(()=>{});
  await page.waitForLoadState('networkidle',{timeout:2800}).catch(()=>{});
  result.depth=await assess(page,pathname,role,result,name);
 if(['fixed','deep','release-b','release-c'].includes(name)&&role==='authorized'&&Object.values(result.depth).includes('passed')){
   const readMode=pathname==='/admin/orders/';
   if(pathname==='/admin/'){
    result.features.navigation=await page.locator('a[data-workspace=orders][href="/admin/orders/"]').count()===1&&await page.locator('a[data-workspace=delivery][href="/admin/delivery/"]').count()===1;
   }
   if(pathnameURL.pathname==='/checkout/'){
    await page.waitForFunction(()=>!!document.querySelector('#checkout-submit')&&!document.querySelector('#checkout-submit').disabled,{},{timeout:5000});
    result.features.quote=await page.locator('.checkout-order-form select option:checked').textContent();
   }
   if(pathname==='/admin/conjure/'){
    await page.locator('iframe').contentFrame().locator('[data-conjure-native]').first().waitFor({state:'attached',timeout:4500});
    result.features.conjureFrame=await page.locator('iframe').contentFrame().locator('.manifest-block').count()>0;
   }
   if(pathname==='/admin/email-preview/')result.features.emailPreview=(await page.locator('#preview-status').innerText())==='PREVIEW — NOT A REAL ORDER';
   if(pathname==='/admin/email-templates/')result.features.emailTemplateCount=await page.locator('#template-list button').count();
   const orderMode=pathname==='/admin/orders/?id='+orderId;
   if(readMode){
    const title=page.getByText('Fulfilment Cost Library',{exact:true});
    await title.waitFor({timeout:2800});await title.click();
    await page.getByRole('button',{name:'Add consumable',exact:true}).waitFor({timeout:2800});
    result.features.library=true;
   }
   if(orderMode){
    const date=page.getByRole('button',{name:'Correct order date',exact:true});
    await date.waitFor({timeout:2800});await date.click();
    await page.getByRole('dialog').waitFor({timeout:2800});
    await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByText('Order date correction history',{exact:true}).click();
    await page.getByText('No corrections recorded.',{exact:true}).waitFor({timeout:2800});
    result.features.dateHistory=true;
    result.features.aftercareOff=await page.getByText('Aftercare Direct sending is off.',{exact:false}).isVisible()&&await page.getByRole('button',{name:'Preview Thank-You',exact:true}).isVisible()&&await page.getByRole('button',{name:'Aftercare Direct',exact:true}).count()===0;
    const advance=page.locator('[data-eclipse-advanced]');await advance.waitFor({timeout:2800});await advance.click();await page.locator('[data-eclipse-back]').waitFor({timeout:2800});result.features.eclipse=true;
   }
  }
  Object.assign(result,await page.evaluate(()=>({url:location.pathname+location.search+location.hash,authorized:document.body.classList.contains('admin-authorized'),gate:document.querySelector('.admin-access-panel')?.innerText,entries:[...document.querySelectorAll('[data-admin-entry]')].map(o=>o.dataset.adminEntry),headings:[...document.querySelectorAll('h1,h2,[role=alert],#operation-status')].filter(e=>e.offsetParent).map(o=>o.innerText).filter(Boolean).slice(0,19),text:document.body.innerText.slice(0,1500)})));
 }catch(e){result.catch.push(String(e));}
 await ctx.close();
 return result;
}
(async()=>{
 const args=process.argv.slice(2);
 const names=args[0].split(',');
 const routes=args[1]==='all'?workspaces:args[1].split(',');
 if(args[1]==='all'){
  routes.push('/admin/ironclad/calculator/');
  if(names.includes('release-c'))routes.push('/admin/omniscience/');
 }
 const b=await chromium.launch({executablePath:process.env.SENTINEL_BROWSER||undefined,headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync']});
 for(const name of names){
  const [s,origin,kitTables,legacyOrders,root]=await server(path.join(base,name));
  const results=[];
  for(let i=0;i<routes.length;i+=3)results.push(...await Promise.all(routes.slice(i,i+3).map(p=>exercise(b,origin,p,args[2]||'authorized',args[3]!=='quiet',name,kitTables,legacyOrders,root))));
  await fs.writeFile(path.join(base,name+'-'+(args[2]||'authorized')+'-'+(args[1]==='all'?'all':'smoke')+'.json'),JSON.stringify(results,null,2));
  for(const r of results) console.log(name,JSON.stringify([r.pathname,r.authorized,r.gate?.split('\n').filter(Boolean).slice(-2),r.bad,r.browserExceptions.map(e=>[e.description?.split('\n')[0],e.frames.slice(0,2)]).slice(0,5),r.pageErrors,r.parseErrors,r.catch,r.depth,r.depthErrors]));
  await new Promise(r=>s.close(r));
 }
 await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
