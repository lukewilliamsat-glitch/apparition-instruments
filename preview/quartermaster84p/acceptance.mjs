import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {extname,resolve,sep} from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.QUARTERMASTER_PLAYWRIGHT);
const root=resolve(process.argv[2]);
const headers=(await readFile(resolve(root,'_headers'),'utf8')).split('\n').slice(1)
  .filter(Boolean).map(line=>line.trim().split(/: (.*)/s));
const mime={'.mjs':'text/javascript','.html':'text/html','.css':'text/css'};
const server=createServer(async (req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  const path=resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
  if (req.method!=='GET' || !path.startsWith(root+sep)) return res.writeHead(403).end();
  try {
    const bytes=await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)]??'text/plain',...Object.fromEntries(headers)}).end(bytes);
  } catch {res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.QUARTERMASTER_CHROMIUM,headless:true});
try {
  for (const viewport of [{width:1360,height:850},{width:390,height:844}]) {
    const page=await browser.newPage({viewport});
    const attempts=[];
    const errors=[];
    await page.route('**/*',route=>{
      const req=route.request();
      if(new URL(req.url()).origin!==origin || req.method()!=='GET') {
        attempts.push([req.method(),new URL(req.url()).origin]);
        return route.abort();
      }
      return route.continue();
    });
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/admin/orders/');
    await page.getByRole('link',{name:'FIXTURE-101 · Packed order',exact:true}).click();
    await page.getByRole('link',{name:'Review workshop packing',exact:true}).click();
    await page.getByText('Postage estimate: £1.15',{exact:true}).waitFor();
    assert.ok(await page.getByText('Recorded postage: £1.09',{exact:true}).isVisible());
    assert.ok(await page.getByText('Actually used packaging: £0.48',{exact:true}).isVisible());
    assert.ok(await page.getByText('Tracking evidence: FIXTURE-TRACK',{exact:true}).isVisible());
    assert.ok(await page.getByText('40 × 30 × 20 mm · 121 g · large-letter',{exact:true}).isVisible());
    assert.ok(await page.getByText('Fixture potentiometer: 5 / 5 picked',{exact:true}).isVisible());
    assert.ok(await page.getByText('Fixture packing box: 2 available',{exact:true}).isVisible());
    assert.equal(await page.locator('#quartermaster-workshop form, #quartermaster-workshop button').count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const states=page.getByRole('navigation',{name:'Fixture states'});
    await states.getByRole('link',{name:'Disabled',exact:true}).click();
    await page.getByText('Packing is disabled. Existing Orders and dispatch are unchanged.',{exact:true}).waitFor();
    await states.getByRole('link',{name:'Unavailable response',exact:true}).click();
    await page.getByText('No accessible packing record. Return to Orders or reload to try again.',{exact:true}).waitFor();
    await states.getByRole('link',{name:'Slow response',exact:true}).click();
    await page.getByText('Loading packing record…',{exact:true}).waitFor();
    await page.getByText('Recorded postage: £1.09',{exact:true}).waitFor();
    await page.getByRole('link',{name:'Back to this order',exact:true}).click();
    await page.getByRole('heading',{name:'FIXTURE-101 · Packed order',exact:true}).waitFor();
    await page.getByRole('link',{name:'FIXTURE-100 · Awaiting picks',exact:true}).click();
    await page.getByRole('link',{name:'Review workshop packing',exact:true}).click();
    const input=page.locator('#quartermaster-workshop input[type=number]').first();
    await input.fill('1');
    await page.getByRole('button',{name:'Save picked count',exact:true}).first().click();
    await page.waitForFunction(()=>document.querySelector('#quartermaster-workshop input')?.value==='1');
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#quartermaster-workshop input')?.value==='0');
    assert.deepEqual(attempts,[]);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log('PASS', viewport.width, 'Orders and return, packed evidence, state handling and resettable picking; only local static GETs');
  }
} finally {
  await browser.close();
  await new Promise(done=>server.close(done));
}
