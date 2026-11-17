import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const [root,evidence]=process.argv.slice(2).map(x=>resolve(x));
await mkdir(evidence,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  const p=new URL(req.url,'http://localhost').pathname.replace(/^\/+/,''),f=resolve(root,p||'index.html');
  if(!f.startsWith(root+'/')||!mime[extname(f)])throw Error('Unavailable');
  const bytes=await readFile(f);res.writeHead(200,{'Content-Type':mime[extname(f)],'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; form-action 'none'"});res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox','--disable-background-networking']});
let passed=0;
try{
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:1024}});
  const errors=[],outside=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){outside.push(route.request().url());return route.abort();}return route.continue();});
  const by=(text)=>page.getByRole('button',{name:text,exact:true});
  const inside=(text)=>page.getByRole('navigation',{name:'Armoury workspaces'}).getByRole('button',{name:text,exact:true});
  const at=(value)=>page.getByLabel(value,{exact:true});
  const fit=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  await page.goto(origin);
  await page.getByRole('heading',{name:'Inventory overview'}).waitFor();
  assert(await fit(),'Inventory overflow at '+width);
  if(width===1440)await page.screenshot({path:evidence+'/Ironclad-Inventory-Desktop.png',fullPage:true});
  await inside('Suppliers').click();await at('Supplier name').fill('Test bench supplier');await by('Create supplier').click();
  await page.getByText('Supplier created.',{exact:true}).waitFor();await page.getByText(/^Test bench supplier ·/).waitFor();
  await inside('Procurement').click();await at('Supplier').selectOption({label:'Test bench supplier'});await at('Purchase reference').fill('WEB-69');
  await at('Component ID').fill('fixture-cts-500k');await at('Purchased quantity').fill('4');await at('Supplier unit price').fill('2.50');
  await at('Freight GBP').fill('1.00');await by('Review landed total').click();await page.getByText('Landed total: £11.00 · Shared amounts: £1.00',{exact:true}).waitFor();
  await by('Save purchase draft').click();await page.getByText('Purchase draft created.',{exact:true}).waitFor();
  let row=page.getByRole('row').filter({hasText:'WEB-69'});await row.getByRole('button',{name:'Mark ordered'}).click();
  await row.getByRole('cell',{name:'ordered',exact:true}).waitFor();
  await row.getByRole('button',{name:'Review purchase'}).click();
  await at('Delivery receipt reference').fill('WEB-69-A');await at('Receive quantity for fixture-cts-500k').fill('2');
  await by('Receive selected quantities').click();await row.getByRole('cell',{name:'partial',exact:true}).waitFor();
  if(width===768){await row.getByRole('button',{name:'Review purchase'}).click();await page.getByRole('heading',{name:'Purchase WEB-69'}).waitFor();await page.screenshot({path:evidence+'/Ironclad-Procurement-Tablet.png',fullPage:true});}
  assert(await fit(),'Procurement overflow at '+width);passed++;
  await inside('Acquisition batches').click();
  const acquired=page.getByRole('row').filter({hasText:'WEB-69-A'});
  await acquired.getByRole('button',{name:'Measure this batch'}).click();
  await at('Measured kΩ').fill('497.90');await at('Measured kΩ').press('Enter');
  await at('Measured kΩ').fill('498.25');await at('Measured kΩ').press('Enter');
  await by('Save verified readings').click();await page.getByText('Measurements saved.',{exact:true}).waitFor();
  await by('Find matched sets').click();await by('Generate matches').click();await by('Commit set').waitFor();
  if(width===390)await page.screenshot({path:evidence+'/Ironclad-Matching-Mobile.png',fullPage:true});
  await by('Commit set').click();await page.getByRole('cell',{name:'allocated',exact:true}).waitFor();
  await by('Generate matches').click();await page.getByText('No compatible set at this tolerance.').waitFor();
  assert(await fit(),'Matching overflow at '+width);passed++;
  await inside('Stocktake').click();await at('Component IDs (comma separated)').fill('fixture-orange-drop');await at('Stocktake reason').fill('Fictional count acceptance');
  await by('Capture expected quantities').click();await at('Count for fixture-orange-drop').fill('5');await at('Correction reason').fill('Fictional found stock');
  await at('I reviewed and confirm these counts').check();await by('Apply stocktake').click();await page.getByText('Stocktake applied.',{exact:true}).waitFor();
  await inside('Movements').click();await at('Component ID').fill('fixture-orange-drop');await by('Load movements').click();await page.getByText(/Fictional found stock/).waitFor();
  await inside('Order cost evidence').click();await at('Order ID').fill('fixture-order-001');await by('Load order cost evidence').click();
  await page.getByRole('cell',{name:'£9.70',exact:true}).waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);assert(await fit(),'Cost evidence overflow at '+width);
  passed++;await page.close();
 }
}finally{await browser.close();server.close();}
console.log(JSON.stringify({groups:passed,browser:browser.version(),fixtureOnly:true,externalRequests:0}));
