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
  const overlay=resolve('release-overlays/ironclad69a-frontend');
  if(p==='safe-estimate.html'){
   const markup=(await readFile(resolve(overlay,'admin/ironclad/index.html'),'utf8')).replace('<body class="admin-page">','<body class="admin-page admin-authorized">')
    .replace('<script type="module" src="/admin/admin-gate.mjs" data-admin-entry="./estimator.mjs"></script>','<script type="module" src="/admin/ironclad/estimator.mjs"></script>');
   res.writeHead(200,{'Content-Type':'text/html'});res.end(markup);return;
  }
  if(!f.startsWith(root+'/')||!mime[extname(f)])throw Error('Unavailable');
  const bytes=await readFile(p==='admin/ironclad/estimator.mjs'?resolve(overlay,p):f);res.writeHead(200,{'Content-Type':mime[extname(f)],'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; form-action 'none'"});res.end(bytes);
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
  await inside('Procurement').click();await by('New purchase order').click();await at('Supplier').selectOption({label:'Test bench supplier'});
  await at('Purchase reference').fill('WEB-69A');await at('Search components').fill('IC-CTS-500K');await by('Find components').click();
  await at('Quantity').fill('4');await at('Unit price').fill('2.50');
  assert.equal(await at('Actual converted line total (GBP)').isVisible(),false);
  assert.equal(await at('Import duty (GBP)').isVisible(),false);
  await at('Supplier postage (GBP)').fill('1.00');await page.getByText('Landed total: £11.00 · Shared costs: £1.00',{exact:true}).waitFor();
  if(width===1440)await page.screenshot({path:evidence+'/Forge-Procurement-Desktop.png',fullPage:true});
  await by('Save purchase draft').click();await page.getByText('Purchase draft created.',{exact:true}).waitFor();
  let row=page.getByRole('row').filter({hasText:'WEB-69A'});await row.getByRole('button',{name:'Edit draft'}).click();
  await at('Quantity').fill('5');await at('Purchase currency').fill('USD');
  await at('Actual converted line total (GBP)').fill('11.23');await at('Actual GBP conversion evidence').fill('Fictional bank conversion');
  await page.getByText('Landed total: £12.23 · Shared costs: £1.00',{exact:true}).waitFor();
  if(width===768)await page.screenshot({path:evidence+'/Forge-Foreign-Currency-Tablet.png',fullPage:true});
  await by('Save draft changes').click();await page.getByText('Purchase draft updated.',{exact:true}).waitFor();
  await row.getByRole('cell',{name:'£12.23',exact:true}).waitFor();
  assert(await fit(),'Procurement overflow at '+width);passed++;
  await by('Quick stock purchase').click();await at('Supplier').selectOption({label:'Fixture Components Ltd'});
  await at('Reference (optional)').fill('QUICK-WEB-69A');await at('Search components').fill('IC-715P');await by('Find components').click();
  await at('Received quantity').fill('3');await at('Unit price').fill('0.45');await at('Supplier postage (GBP)').fill('0.90');
  await page.getByText('Landed total: £2.25 · Shared costs: £0.90',{exact:true}).waitFor();
  if(width===390)await page.screenshot({path:evidence+'/Forge-Quick-Purchase-Mobile.png',fullPage:true});
  await by('Record purchase and receive stock').click();await page.getByText('Purchase recorded and stock received.',{exact:true}).waitFor();
  await page.getByRole('row').filter({hasText:'QUICK-WEB-69A'}).getByRole('cell',{name:'received',exact:true}).waitFor();
  await at('Search purchases').fill('QUICK-WEB-69A');await by('Filter').click();await page.getByRole('cell',{name:'QUICK-WEB-69A',exact:true}).waitFor();
  assert.equal(await page.getByRole('cell',{name:'WEB-69A',exact:true}).count(),0);
  await inside('Movements').click();await at('Component ID').fill('fixture-orange-drop');await by('Load movements').click();await page.getByRole('cell',{name:'receipt',exact:true}).waitFor();passed++;
  await page.goto(origin+'/safe-estimate.html');await at('Quantity').fill('5');await at('Unit cost (£)').fill('1.20');await at('Supplier postage (£)').fill('1.30');
  await page.getByText('Estimated landed total: £7.30. Per unit: £1.4600. Nothing saved.',{exact:true}).waitFor();
  assert(await fit(),'Calculator overflow at '+width);  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);assert(await fit(),'Workspace overflow at '+width);
  passed++;await page.close();
 }
}finally{await browser.close();server.close();}
console.log(JSON.stringify({groups:passed,browser:browser.version(),fixtureOnly:true,externalRequests:0}));
