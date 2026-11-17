import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {sep,resolve} from 'node:path';
import {row} from './fixture.mjs';

const {chromium}=await import(pathToFileURL(process.env.LEVIATHAN74_PLAYWRIGHT));
const dist=fileURLToPath(new URL('../../dist/',import.meta.url));
const styles=await readFile(resolve(dist,'admin/omniscience/workspace.css'),'utf8');
const fixture=JSON.stringify(row);
const html=`<!doctype html><title>Isolated Apparition Admin acceptance</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${styles}</style><body class="admin-page"><main class="admin-main omniscience" id="main"></main>
<script type="module">
import {bootAdminGate} from '/admin/admin-gate.mjs';
import {mountAdminWorkspace} from '/admin/omniscience/entry.mjs';
const root=document.querySelector('main');
const marker=document.createElement('script');marker.dataset.adminEntry='./workspace.mjs';document.head.append(marker);
const row=${fixture}, history=[];
const record={id:'68a00000-0000-4000-8000-000000000003',day:'2026-11-01',vendor:'Synthetic postage supplier',category:'Packaging',purpose:'Synthetic',currency:'GBP',original_minor:800,sterling_minor:800,funding:'director',treatment:'overhead',reimbursed:0};
let reads=0;
const repository={
 async orders(range,cursor,signal){if(signal.aborted)throw Error('aborted');window.fixtureReads=++reads;return {rows:[row],next:null};},
 async outlays(){return {rows:[record],next:null};},
 async outlay(id){history.push(['outlay',id]);return {duplicate:false,id};},
 async reimburse(id,{p_gbp}){record.reimbursed+=p_gbp;return {duplicate:false,id};}
};
await bootAdminGate({document,
 auth:{async restore(){return {status:location.search.includes('denied')?'denied':'authorized'};}, async signOut(){}},
 load:async()=>({mountAdminWorkspace:params=>mountAdminWorkspace({...params,repository})})});
window.ready=true;
</script></body>`;
const server=createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://127.0.0.1').pathname;
  if(name==='/fixture/'){res.setHeader('content-type','text/html');res.end(html);return;}
  const file=resolve(dist,'.'+name);
  if(!file.startsWith(resolve(dist)+sep)||!(name.endsWith('.css')||name.endsWith('.mjs'))){res.writeHead(404).end();return;}
  res.setHeader('content-type',name.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.LEVIATHAN74_CHROME,args:['--no-sandbox','--disable-background-networking']});
 for(const [width,height] of [[1366,900],[820,920],[375,780]]){
  const tab=await browser.newPage({viewport:{width,height}});
  const external=[],errors=[];tab.on('pageerror',err=>errors.push(err.message));
  await tab.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});
  await tab.goto(origin+'/fixture/');await tab.waitForFunction(()=>window.ready);
  await tab.getByRole('heading',{name:'Business financials'}).waitFor();
  await tab.getByRole('button',{name:'Load report'}).click();
  await tab.getByRole('table',{name:'Sales channels'}).waitFor();
  assert.equal(await tab.evaluate(()=>window.fixtureReads),1);
  await tab.getByText('Pricing and break-even calculator').click();
  await tab.getByLabel('Acquisition £',{exact:true}).fill('12.00');
  await tab.getByRole('button',{name:'Calculate prices'}).click();
  await tab.getByText(/Break-even product price £12.00/).waitFor();
  await tab.getByText('Record an expense or director purchase',{exact:true}).click();
  await tab.getByLabel('Currency',{exact:true}).selectOption('USD');
  assert(await tab.getByLabel('Actual GBP amount (foreign purchases only)').isVisible());
  await tab.getByRole('button',{name:'Record reimbursement',exact:true}).click();
  await tab.getByLabel('Paid in GBP',{exact:true}).fill('3.00');
  await tab.getByLabel('Payment evidence reference').fill('Synthetic payment evidence');
  await tab.getByRole('button',{name:'Record completed reimbursement'}).click();
  await tab.getByText(/Recorded. No external payment was made/).waitFor();
  assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await tab.getByRole('button',{name:'Sign Out'}).click();
  await tab.getByRole('button',{name:'Sign In'}).waitFor();
  assert.equal(await tab.getByRole('heading',{name:'Business financials'}).count(),0);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  await tab.close();console.log('PASS Chromium fixture '+width+'px: report, calculator, reimbursement, stored amount stub, sign-out, overflow and zero external calls');
 }
 const denied=await browser.newPage();
 await denied.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await denied.goto(origin+'/fixture/?denied');await denied.waitForFunction(()=>window.ready);
 await denied.getByText('This account is not authorised for Admin access.').waitFor();
 assert.equal(await denied.getByRole('heading',{name:'Business financials'}).count(),0);
 console.log('PASS gate denies non-Admin before rendering or requests (browser fixture)');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
