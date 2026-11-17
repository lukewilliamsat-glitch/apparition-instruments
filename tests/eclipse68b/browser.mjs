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
try{
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:width===768?1024:1080}});
  const blocked=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{if(!route.request().url().startsWith(origin+'/')){blocked.push(route.request().url());return route.abort();}return route.continue();});
  const metric=key=>page.locator('[data-eclipse-metric='+key+']');
  const button=name=>page.getByRole('button',{name,exact:true});
  const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow at '+width);
  await page.goto(origin+'/admin/orders/financials/');
  await page.getByRole('heading',{name:'Order Financials',exact:true}).waitFor();
  await fit();assert.equal(await metric('contribution').textContent(),'Unknown');
  assert.equal(await metric('sale').textContent(),'£11.49');
  await button('Load sample evidence').click();
  assert.equal(await metric('contribution').textContent(),'£6.22');
  assert.equal(await metric('margin').textContent(),'54.13%');
  await button('Load cost library').click();
  assert.equal(await page.getByLabel('Packaging preset',{exact:true}).inputValue(),'small-component');
  await button('Apply preset estimate').click();
  if(width===1440)await page.screenshot({path:evidence+'/Eclipse-Desktop-eBay.png',fullPage:true});
  await button('Save financial record').click();
  await page.getByText(/Saved fictional revision 1\./).waitFor();
  await page.reload();
  await page.getByText('Saved fictional revision 1 loaded.').waitFor();
  assert.equal(await metric('contribution').textContent(),'£6.22');
  groups++;
  await page.getByText('Fulfilment Cost Library',{exact:true}).click();
  await page.getByLabel('Unit cost (£)',{exact:true}).first().fill('0.27');
  await button('Save fulfilment library').click();
  await page.getByText('Saved library revision 2.',{exact:true}).waitFor();
  assert.equal(await metric('contribution').textContent(),'£6.22');
  await button('Load cost library').click();
  await button('Apply preset estimate').click();
  assert.equal(await metric('contribution').textContent(),'£6.10');
  await button('Reload saved example').click();
  assert.equal(await metric('contribution').textContent(),'£6.22');
  groups++;
  await page.getByLabel('Example order').selectOption('1');
  assert.equal(await metric('contribution').textContent(),'Unknown');
  assert.equal(await page.getByLabel('Payment processing fee',{exact:true}).inputValue(),'');
  await button('Load sample evidence').click();
  assert.equal(await metric('contribution').textContent(),'£7.17');
  await fit();
  if(width!==1440)await page.screenshot({path:evidence+'/Eclipse-'+(width===390?'Mobile':'Tablet')+'-Website.png',fullPage:true});
  await button('Advanced reconciliation').focus();await page.keyboard.press('Enter');
  await page.getByText('Advanced financial reconciliation',{exact:true}).waitFor();
  assert(await button('Back to Order Financials').evaluate(b=>b===document.activeElement));
  await button('Back to Order Financials').click();
  assert.equal(await metric('contribution').textContent(),'£7.17');
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);groups++;await page.close();
 }
}finally{await browser.close();srv.close();}
console.log(JSON.stringify({groups,blockedExternalRequests:0,chrome:browser.version(),fixtureOnly:true}));
