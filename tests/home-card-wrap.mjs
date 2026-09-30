import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {join,extname} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const server=createServer((req,res)=>{
 let path=new URL(req.url,'http://local').pathname;if(path.endsWith('/'))path+='index.html';
 try{const data=readFileSync(join(process.cwd(),'dist',path));res.setHeader('Content-Type',({'.css':'text/css','.html':'text/html','.mjs':'text/javascript','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.FORGE_CHROME||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:320,height:844},reducedMotion:'reduce'});
 await page.route('**/*',route=>route.request().url().startsWith(origin)&&route.request().resourceType()!=='script'?route.continue():route.abort());
 await page.goto(origin+'/');await page.locator('#luthier-hub').scrollIntoViewIfNeeded();
 const headings=await page.locator('.hub-preview-grid .editorial-card h3').evaluateAll(nodes=>nodes.map(node=>{
  const a=node.getBoundingClientRect(),card=node.closest('.editorial-card'),b=card.getBoundingClientRect();
  const range=document.createRange();range.selectNodeContents(node);
  return {text:node.textContent,wrap:getComputedStyle(node).overflowWrap,inside:[...range.getClientRects()].every(r=>r.left>=b.left&&r.right<=b.right),width:node.scrollWidth,available:node.clientWidth};
 }));
 assert.equal(headings.length,2);for(const heading of headings){assert.equal(heading.wrap,'anywhere');assert(heading.inside,heading.text);assert(heading.width<=heading.available,heading.text);}
 await page.screenshot({path:'/tmp/home-card-wrap-320.png'});
 console.log('PASS: both article headings fit their cards at 320px without text overflow; copy unchanged.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
