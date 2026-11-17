import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const [root,evidence]=process.argv.slice(2).map(x=>resolve(x));
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
await mkdir(evidence,{recursive:true});
const srv=createServer(async(req,res)=>{
 try{
   const path=new URL(req.url,'http://localhost').pathname.replace(/^\/+/,''),file=resolve(root,path+(path===''||path.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+'/')||!mime[extname(file)])throw Error('Asset unavailable');
   const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)],'Content-Security-Policy':"default-src 'self'; connect-src 'none'; img-src 'self' data:; frame-src 'self' about:; style-src 'self'; form-action 'none'"});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+srv.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-background-networking']});
let groups=0;
try {
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:width===768?1024:1080}});
  const outbound=[],errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('Browser exception: '+e.message);});
  await page.route('**/*',async route=>{const url=route.request().url();if(!url.startsWith(origin+'/')&&!url.startsWith('data:')){outbound.push(url);return route.abort();}return route.continue();});
  page.on('dialog',dialog=>dialog.accept());
  const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document horizontal overflow at '+width);
  await page.goto(origin+'/admin/delivery/');
  await page.getByText('Delivery settings current.').waitFor();await fit();
  await page.getByRole('button',{name:'£50 basket'}).click();
  await page.getByText('UK Standard · £0.00',{exact:true}).waitFor();
  if(width===1440)await page.screenshot({path:evidence+'/Overseer-Delivery-Command.png',fullPage:true});
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Draft saved. Checkout has not changed.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Review activation'}).click();await page.getByText('Delivery settings activated.',{exact:true}).waitFor();groups++;
  await page.goto(origin+'/admin/site-operations/');
  await page.getByText('Operations ready.',{exact:true}).waitFor();await fit();
  await page.getByRole('heading',{name:'Store status',exact:true}).waitFor();
  await page.getByText(/Open for business · Closure scheduled/).waitFor();
  if(width===1440)await page.screenshot({path:evidence+'/Overseer-Operations-Ascendant.png',fullPage:true});
  await page.locator('#ops-audit-filter').selectOption('store');await page.locator('#operations-audit li').first().waitFor();
  assert.equal(await page.locator('#operations-audit li').count(),1);
  await page.getByRole('button',{name:'Cancel scheduled closure'}).click();await page.getByText('Orders are open. Schedule cleared.').waitFor();groups++;
  await page.goto(origin+'/admin/aftercare-direct/');
  const trigger=page.getByRole('button',{name:'Review order-linked message'});
  await trigger.click();await page.getByText('Staging sink only. No email will be sent.').waitFor();
  await page.getByRole('button',{name:'Render preview'}).click();
  const confirm=page.getByRole('button',{name:'Record internal test'});assert(await confirm.isDisabled());
  const frame=page.frameLocator('iframe[title="Rendered order email"]');
  await frame.getByText(/Support for eBay order AI-068001/).waitFor();
  if(width===1440)await page.screenshot({path:evidence+'/Overseer-Aftercare-Direct.png',fullPage:true});
  await page.getByRole('checkbox',{name:/I reviewed the saved recipient/}).check();
  assert.equal(await confirm.isEnabled(),true,'Acknowledged synthetic recipient did not enable submission');
  await confirm.click();
  try { await page.locator('dialog [role=status]').filter({hasText:'Fixture message recorded. No email sent.'}).waitFor({timeout:7000}); }
  catch (error) {
   const status=await page.locator('dialog [role=status]').textContent().catch(()=>'(no status)');
   assert.equal(status,'Fixture message recorded. No email sent.',width+'px: '+error.message);
  }
  await page.getByText(/Internal test recorded · No email sent/).waitFor({timeout:7000});
  await page.keyboard.press('Escape');assert(await trigger.evaluate(x=>x===document.activeElement));
  await fit();groups++;assert.deepEqual(errors,[]);assert.deepEqual(outbound,[]);
  await page.close();
 }
 console.log(groups+' Chrome workspace/viewport groups passed; no outbound requests; screenshots from desktop fixtures');
}finally{await browser.close();srv.close();}
