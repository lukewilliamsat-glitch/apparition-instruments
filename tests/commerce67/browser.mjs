import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=resolve(process.argv[2]);
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  const name=resolve(root,'.'+(path==='/'?'/index.html':path));
  assert(name.startsWith(root+'/'));
  res.setHeader('Content-Type',path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; form-action 'none'");
  res.end(await readFile(name));
 }catch{if(!res.headersSent)res.statusCode=404;res.end();}
}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const width of [375,1280]){
  const page=await browser.newPage({viewport:{width,height:880}}),outside=[];
  await page.route('**/*',r=>{if(r.request().url().startsWith(url))return r.continue();outside.push(r.request().url());return r.abort();});
  await page.goto(url);
  page.setDefaultTimeout(12000);
  assert(await page.getByText('Applied savings: £1.05').isVisible());
  await page.getByRole('button',{name:'Add Electronics pair (fixture) to basket'}).click();
  assert(await page.getByText('Payable total: £14.98').isVisible());
  await page.getByRole('button',{name:'Load saved commerce configuration'}).click();
  await page.getByLabel('Name',{exact:true}).fill('Fictional promo');
  await page.getByLabel(/Quantity lines/).fill('2,percent,10');
  await page.getByRole('button',{name:'Save configuration',exact:true}).click();
  await page.getByText('Configuration saved.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit Fictional promo',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Load saved commerce configuration'}).click();
  await page.getByRole('button',{name:'Edit Fictional promo',exact:true}).waitFor();
  await page.getByLabel('Exact component ID for assisted matching').fill('fixture-cts-a');
  await page.getByRole('button',{name:'Suggest closest set'}).click();
  assert.equal(await page.getByLabel('Unallocated measured units').locator('option:checked').count(),2);
  await page.getByLabel('Set price (GBP)').fill('15.99');
  await page.getByRole('button',{name:'Create measured set'}).click();
  await page.getByText('fixture-cts-a · 2 units · available').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  assert.deepEqual(outside,[]);
  await page.close();
 }
}finally{await browser.close();server.close();}
console.log('Commerce 67 browser fixture: customer totals, add-on/bundle options, saved configuration, assisted matching, reservation-free local state, 375 px and 1280 px PASS');
