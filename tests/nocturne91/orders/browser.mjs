import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ORDERS_PLAYWRIGHT_MODULE || 'playwright-core');
const root=resolve(process.argv[2]);
const page=await readFile(new URL('browser-page.html',import.meta.url),'utf8');
const app=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/')return res.writeHead(200,{'content-type':'text/html'}).end(page);
  const file=resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+sep))return res.writeHead(404).end();
  try{
    const type={'.mjs':'text/javascript','.css':'text/css'}[extname(file)]??'application/octet-stream';
    res.writeHead(200,{'content-type':type}).end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>app.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+app.address().port;
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.QUARTERMASTER_CHROMIUM,
    args:['--no-sandbox','--disable-background-networking']});
  for(const width of [1360,390]){
    const view=await browser.newPage({viewport:{width,height:844}});
    await view.route('**/*', route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
    view.on('pageerror',error=>console.error(error.message));
    view.on('response',response=>{if(!response.ok())console.error(response.status(),response.url());});
    await view.goto(origin+'/');
    await view.waitForFunction(()=>document.querySelector('#result').textContent.length>0,{},{timeout:8000});
    assert.equal(await view.locator('#result').textContent(),'PASS 91 orders');
    await view.close();
    console.log('PASS Orders browser '+width+' px');
  }
}finally{await browser?.close();app.close();}
