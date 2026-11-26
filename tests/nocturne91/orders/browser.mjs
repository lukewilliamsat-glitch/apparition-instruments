import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ORDERS_PLAYWRIGHT_MODULE || 'playwright-core');
const root=resolve(process.argv[2]);
const fixture=await readFile(new URL('browser-page.html',import.meta.url),'utf8');
const origin='https://orders.fixture.test';
const browser=await chromium.launch({executablePath:process.env.QUARTERMASTER_CHROMIUM,args:['--no-sandbox']});
try {
  for (const width of [1360,390]) {
    const view=await browser.newPage({viewport:{width,height:844}});
    await view.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin)throw new Error('Unexpected fixture request '+url.origin);
      if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fixture});
      const path=resolve(root,'.'+url.pathname);
      assert.ok(path.startsWith(root+sep));
      const contentType={'.mjs':'text/javascript','.css':'text/css'}[extname(path)]??'application/octet-stream';
      try{await route.fulfill({contentType,body:await readFile(path)});}
      catch(error){console.error('Fixture route',url.pathname,error.message);await route.fulfill({status:404,body:''});}
    });
    view.on('pageerror',error=>console.error(error.stack));
    view.on('requestfailed',request=>console.error(request.url(),request.failure()?.errorText));
    await view.goto(origin+'/');
    await view.waitForFunction(()=>document.querySelector('#result').textContent.length>0,{},{timeout:10000});
    assert.equal(await view.locator('#result').textContent(),'PASS 91 orders');
    await view.close();
    console.log('PASS Orders browser '+width+' px');
  }
} finally {
  await browser.close();
}
