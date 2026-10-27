import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,extname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [out,chrome,controller,commit]=process.argv.slice(2),stage=JSON.parse(await readFile(join(out,'STAGE_A_RESULTS.json'),'utf8'));
assert.equal(stage.status,'PASS');assert.equal(stage.sourceCommit,commit);assert.equal(stage.negativeControls.length,10);
const phase=JSON.parse(await readFile('tests/command63/phase.json','utf8')).phase,rows=[],errors=[],external=[],captures=[];let browser,context;
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://fixture.invalid').pathname;let file=path.startsWith('/tests/')?path.slice(1):'dist'+path;if(file.endsWith('/'))file+='index.html';
 if(file.includes('..')||!(/^(dist\/|tests\/command63\/)/.test(file)&&['.html','.mjs','.js','.css','.json'].includes(extname(file)))){res.writeHead(404);res.end();return;}
 if(path==='/favicon.ico'||path.startsWith('/assets/')){res.writeHead(204);res.end();return;}
 try{let b=await readFile(resolve(file));if(extname(file)==='.html'){let html=b.toString(),entry=html.match(/data-admin-entry="([^"]+)"/)?.[1]||'';html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<img\b[^>]*>/gi,tag=>tag.replace(/\s(?:src|srcset)=["'][^"']*["']/gi,'')).replace(/<link\b[^>]*href="(?:\.\.\/|\/)*(?:style|brand|knowledge|customer-ui)\.css[^>]*>/gi,'');b=Buffer.from(html.replace('</head>','<script data-admin-entry="'+entry+'"></script><script type="module" src="/tests/command63/browser-entry.mjs"></script></head>'));}
 res.writeHead(200,{'content-type':({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'text/plain','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'none'; font-src 'none'; frame-src 'self' about:; object-src 'none'; base-uri 'none'"});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const noOverflow=async p=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal document overflow');
const maker=(p,key='fixture_unused')=>p.locator('[data-option-key="'+key+'"]');
const deletions=p=>p.evaluate(()=>window.blackLedgerFixture.calls.filter(x=>x.path==='rpc/delete_unused_catalogue_option').length);
async function check(name,path,width,fn){let p;try{p=await context.newPage();await p.setViewportSize({width,height:1000});await p.goto(origin+path);await p.waitForFunction(()=>window.blackLedgerFixture);await p.locator('link[data-admin-styles]').waitFor({state:'attached'});await fn(p);assert.equal(await p.evaluate(()=>window.blackLedgerFixture.businessWrites.length),0);rows.push({name,width,result:'PASS'});}catch(e){rows.push({name,width,result:'FAIL',error:String(e),stack:e.stack});}finally{await p?.close();}}
try{
 const {chromium}=await import(pathToFileURL(controller));browser=await chromium.launch({executablePath:chrome,headless:true,chromiumSandbox:true,args:['--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server']});context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});context.setDefaultTimeout(7000);
 await context.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){external.push(route.request().url());return route.abort();}return route.continue();});context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
 if(phase!=='RECON')throw Error('Unsupported Black Ledger acceptance phase');
 for(const width of [390,1440])await check('Gross payment, pass-through, seller revenue and genuine discrepancies','/admin/orders/?id=fixture-finance-order',width,async p=>{
  const panel=p.locator('[data-finance-workbench]');await panel.locator(':scope > summary').click();await p.getByLabel('Marketplace-collected tax / pass-through',{exact:true}).fill('0.24');
  assert.match(await panel.locator('.finance-totals').textContent(),/£3.75/);assert.doesNotMatch(await panel.locator('.finance-qualifiers').textContent(),/Gross payment difference/);assert.equal(await p.getByLabel('Marketplace pass-through evidence',{exact:true}).inputValue(),'estimated');
  await p.getByLabel('Product/postage payment basis',{exact:true}).selectOption('seller_net');assert.match(await panel.locator('.finance-qualifiers').textContent(),/Gross payment difference: -£0.24/);await p.getByLabel('Product/postage payment basis',{exact:true}).selectOption('customer_gross');assert.doesNotMatch(await panel.locator('.finance-qualifiers').textContent(),/Gross payment difference/);
  await p.getByLabel('Marketplace pass-through evidence',{exact:true}).selectOption('confirmed');assert.match(await panel.locator('.finance-error').textContent(),/evidence\/source/);await p.getByLabel('Marketplace pass-through source',{exact:true}).fill('Fictional marketplace statement');assert.equal(await panel.locator('.finance-error').textContent(),'');assert.match(await panel.locator('.finance-totals').textContent(),/£3.75/);
  assert.equal(await panel.getByRole('button',{name:'Financial saving unavailable',exact:true}).isEnabled(),false);assert.equal(await p.evaluate(()=>window.blackLedgerFixture.serviceRequests),0);await noOverflow(p);
  if(width===390){await p.addStyleTag({content:'html{font-size:200%}'});await noOverflow(p);await p.locator('.admin-lock').click();await p.locator('input[type=password]').waitFor({state:'visible'});assert.equal(await p.locator('[data-finance-workbench]').count(),0);}
 });
 assert.equal(external.length,0);assert.equal(errors.length,0,JSON.stringify(errors));
}finally{await browser?.close();await new Promise(r=>server.close(r));const result={source:commit,phase,browser:stage.browser,node:process.version,isolation:10,passed:rows.filter(r=>r.result==='PASS').length,total:rows.length,results:rows,errors,externalRequests:external.length,captures,limit:'Fictional repositories; real product, stock and customer records never mutated. Promotion activation and checkout remain unchanged.'};await writeFile(join(out,'BROWSER_RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(rows.some(r=>r.result!=='PASS')||errors.length||external.length)process.exitCode=1;}
