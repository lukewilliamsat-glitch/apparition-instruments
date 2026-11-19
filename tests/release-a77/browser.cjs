const {chromium}=require('playwright');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const stableId='b1d8a9b5-a055-414e-a8dd-d1a2356b4100';
const base=process.env.SENTINEL_ROOT||'/tmp/sentinel77';
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2'};
const workspaces=['/admin/','/admin/?view=inventory','/admin/?view=assemblies','/admin/?view=maintenance','/admin/overview/','/admin/orders/','/admin/orders/?view=aftercare','/admin/orders/?view=attempts','/admin/orders/?new=external','/admin/orders/build-sheet/','/admin/orders/invoice/','/admin/site-operations/','/admin/site-operations/#commercial-destinations','/admin/delivery/','/admin/catalogue-settings/','/admin/command/','/admin/conjure/','/admin/hub-cms/','/admin/hub-media/','/admin/email-preview/','/admin/email-templates/','/admin/wiring-kit-master/','/admin/ironclad/','/circuit-forge/','/checkout/','/','/components/','/products/bleed-cap/'];
const now='2026-11-19T13:00:00.000Z';
const orderId='4588857f-340e-4bca-92b1-62268b470631';
const reference='AI-099901';
const sampleOrder={id:orderId,reference,sales_channel:'EBAY',external_reference:'SENTINEL-FIXTURE-ONLY',created_at:now,updated_at:now,order_date:'2026-11-18',paid_at:now,subtotal_pence:749,delivery_pence:399,total_pence:1148,status:'dispatched',payment_status:'paid',customer:{name:'Fictional workshop'},delivery:{},items:[{type:'component',name:'Synthetic tone capacitor',productId:'synthetic-capacitor',quantity:1,unitPrice:749}],status_history:[]};
const followup={orderId,reference,customerName:'Fictional workshop',channel:'EBAY',dispatchAt:now,defaultDue:'2026-11-19',dueDate:'2026-11-19',eligible:true,state:'due',suppressed:false,history:[]};
const readPosts=new Set(['get_site_operations','get_customer_aftercare','get_admin_email_templates','overseer_delivery_admin_read','overseer_delivery_admin_preview','overseer_delivery_options','overseer_order_date_history','overseer_aftercare_history','eclipse_fulfilment_library','command63_financial_read','command63_financial_status','command63_financial_batch']);
workspaces.push('/admin/orders/?id='+orderId);

const ship={methods:[{id:'standard',name:'UK Delivery',price:399,minOrder:0,minUnits:0}],freeEnabled:true,freeThreshold:5000,overrides:[],promo:null};
const ops={store:{state:'OPEN',desired_state:'OPEN',pause_from:null,resume_at:null,revision:1,updated_at:now,customer_title:'',customer_message:'',internal_reason:''},announcement:null,announcements:[],news:[],revision:1};
const mock=(u,role)=>{
 let r=u.pathname.replace('/rest/v1/',''), v;
 if(u.pathname==='/auth/v1/user')return {id:stableId};
 if(u.pathname==='/functions/v1/transactional-email/template-preview')return {html:'<p>Fictional preview</p>',text:'Fictional preview',subject:'Fictional preview',label:'SAMPLE ONLY',key:'aftercare:WEBSITE',orderReference:reference};
 if(r==='admin_members')return role==='authorized'?[{user_id:stableId}]:[];
 switch(r){
 case 'rpc/get_site_operations':return ops;
 case 'site_operations':return [ops.store];
 case 'orders':return [sampleOrder];
 case 'rpc/get_customer_aftercare':return [followup];
 case 'rpc/overseer_order_date_history':return [];
 case 'commerce_shipping':return [{country:'GB',standard_delivery_pence:399,free_delivery_threshold_pence:5000}];
 case 'rpc/overseer_delivery_admin_read':return {revision:0,active:null,draft:null,legacy:ship,history:[]};
 case 'rpc/overseer_delivery_options':return [{id:'standard',name:'UK Delivery',price:399}];
 case 'rpc/eclipse_fulfilment_library':return {revision:0,items:[],presets:[]};
 case 'rpc/get_admin_email_templates':return ['aftercare:WEBSITE','aftercare:EBAY','dispatched:WEBSITE','dispatched:EBAY'].map(template_key=>({template_key,revision:0,draft:null,history:[],published:{version:1,content:{subject:'Fictional preview',heading:'Synthetic template',body:'Test copy'}}}));
 case 'rpc/command63_financial_status':return {enabled:true};
 case 'rpc/command63_financial_read':return {version:1,orderId,orderBasisHash:'a'.repeat(64),orderBasisMatches:true,revision:0,document:null,history:[]};
 default:return [];
 }
};
async function server(root){
 const s=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  let file=path.join(root,decodeURIComponent(u.pathname));
  if(u.pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{const b=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(b);}
  catch{res.writeHead(404).end('fixture path unavailable');}
 });
 await new Promise(r=>s.listen(0,'127.0.0.1',r));
 return [s,'http://127.0.0.1:'+s.address().port];
}
async function exercise(b,origin,pathname,role,debug,name){
 const ctx=await b.newContext({serviceWorkers:'block'});
 const result={pathname,role,entries:[],browserExceptions:[],pageErrors:[],consoleErrors:[],bad:[],external:[],requests:[],modules:[],catch:[],blockedWrites:[],features:{}};
 if(role!=='anonymous')await ctx.addInitScript(({id})=>localStorage.setItem('apparition.admin.supabase-session.v1',JSON.stringify({access_token:'synthetic-only',refresh_token:'synthetic-only',expires_at:Math.floor(Date.now()/1000)+7200})),{id:stableId});
 await ctx.route('**/*',async x=>{
  const u=new URL(x.request().url());
  if(u.origin===origin){if(u.pathname.endsWith('.mjs'))result.modules.push(u.pathname+u.search);return x.continue();}
  if(u.hostname.endsWith('.supabase.co')){
   const method=x.request().method(),data=x.request().postDataJSON?.()??{};
   result.requests.push({method,path:u.pathname,authenticated:x.request().headers().authorization==='Bearer synthetic-only'});
   if(method!=='GET'&&method!=='HEAD'&&!(method==='POST'&&(u.pathname.startsWith('/rest/v1/rpc/')&&readPosts.has(u.pathname.split('/').at(-1))||u.pathname==='/functions/v1/transactional-email/template-preview'))){
    result.blockedWrites.push(method+' '+u.pathname);
    return x.fulfill({status:403,json:{message:'fixture only: unexpected mutation'},headers:{'access-control-allow-origin':origin}});
   }
   return x.fulfill({json:mock(u,role),headers:{'access-control-allow-origin':origin}});
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
  if(name==='fixed'&&role==='authorized'){
   const readMode=pathname==='/admin/orders/';
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
 const b=await chromium.launch({executablePath:process.env.SENTINEL_BROWSER||undefined,headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync']});
 for(const name of names){
  const [s,origin]=await server(path.join(base,name));
  const results=[];
  for(let i=0;i<routes.length;i+=3)results.push(...await Promise.all(routes.slice(i,i+3).map(p=>exercise(b,origin,p,args[2]||'authorized',args[3]!=='quiet',name))));
  await fs.writeFile(path.join(base,name+'-'+(args[2]||'authorized')+'-'+(args[1]==='all'?'all':'smoke')+'.json'),JSON.stringify(results,null,2));
  for(const r of results) console.log(name,JSON.stringify([r.pathname,r.authorized,r.gate?.split('\n').filter(Boolean).slice(-2),r.bad,r.browserExceptions.map(e=>[e.description?.split('\n')[0],e.frames.slice(0,2)]).slice(0,5),r.pageErrors]));
  await new Promise(r=>s.close(r));
 }
 await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
