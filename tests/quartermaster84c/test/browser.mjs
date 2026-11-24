import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,sep,extname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.QUARTERMASTER_PLAYWRIGHT??'playwright');
const site=resolve(process.argv[2]);
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  const file=resolve(site,'.'+path+(path.endsWith('/')?'index.html':''));
  assert(file.startsWith(site+sep));
  const type={'.html':'text/html','.css':'text/css','.mjs':'text/javascript'}[extname(file)];
  res.writeHead(200,{'Content-Type':type??'text/plain'}).end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const stage='https://prwmowexhonguvtiywsy.supabase.co';
const subject='a0000000-0000-4000-8000-000000000001';
const order='84000000-0000-4000-8000-000000000011';
const token='fixture.'+Buffer.from(JSON.stringify({iss:stage+'/auth/v1',sub:subject})).toString('base64url')+'.fixture';
const browser=await chromium.launch({headless:true,executablePath:process.env.QUARTERMASTER_CHROMIUM,args:['--no-sandbox']});
try{
 for(const width of [1360,390]){
  const context=await browser.newContext({viewport:{width,height:850}});
  let role='operator',expired=false,pick=0,revision=0,reserved=false;
  const calls=[];
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url()),name=url.pathname.split('/').at(-1);
   if(url.origin===origin)return route.continue();
   assert.equal(url.origin,stage);
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type','access-control-allow-methods':'GET,POST'};
   const reply=(json,status=200)=>route.fulfill({json,status,headers});
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   calls.push(name);
   if(name==='token')return expired?reply({},401):reply({access_token:token,refresh_token:'fixture-only',expires_in:3600});
   if(name==='user')return reply({id:subject},expired?401:200);
   if(name==='logout')return route.fulfill({status:204,headers});
   if(name==='quartermaster84c_orders')return reply({subject,orders:[{id:order,reference:'84C-FIXTURE-1'}],writer:role==='operator',finance:true,financeApprove:role==='finance'});
   if(name==='quartermaster84c_suppliers')return reply([{id:order,name:'84C Fixture Packaging Supplier'}]);
   if(name==='quartermaster84w_workspace')return reply({schema:1,mode:'workshop',order:{reference:'84C-FIXTURE-1',
    state:reserved?'reserved':'none',generation:reserved?1:0,revision,canReserve:!reserved,canPick:reserved,canRelease:reserved,canReceive:true,canRecordPostage:false,
    picks:[{id:'fixture-staging-pot',title:'Fixture potentiometer',quantity:2,picked:pick}],
    materials:[{sku:'84C-MAILER',title:'84C Fixture mailer',available:1}],batches:[],cost:{material:null,estimate:null,actual:null},parcel:null}});
   if(name==='quartermaster84w_pack'){
    const command=route.request().postDataJSON();assert.equal(command.p_revision,revision);
    if(command.p_action.kind==='reserve')reserved=true;
    if(command.p_action.kind==='pick'){pick=command.p_action.quantity;revision++;}
    return reply({revision});
   }
   if(name==='quartermaster84c_finance_proposal')return reply({state:'unsaved',evidence:{packaging:40,estimate:130,actual:115},revision:0,
    canApprove:role==='finance',evidenceHash:'a'.repeat(64),orderBasisHash:'b'.repeat(64)});
   if(name==='quartermaster84c_finance_save'){assert.equal(role,'finance');return reply({outcome:'committed',revision:1});}
   throw Error('Unexpected fixture request '+name);
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/admin/orders/');
  const login=async()=>{
   await page.getByLabel('Staging email').fill('operator@fixtures.example');
   await page.getByLabel('Password').fill('isolated-fixture-only');
   await page.getByRole('button',{name:'Sign in',exact:true}).click();
  };
  await login();
  await page.getByRole('link',{name:'84C-FIXTURE-1'}).click();
  await page.getByRole('link',{name:'Open packing workshop'}).click();
  await page.getByRole('button',{name:'Reserve packaging'}).click();
  await page.getByLabel('Fixture potentiometer · 2 required').fill('1');
  await page.getByRole('button',{name:'Save picked count'}).click();
  await page.getByRole('button',{name:'Save picked count'}).waitFor();
  assert.equal(await page.getByLabel('Packaging supplier').textContent(),'84C Fixture Packaging Supplier');
  await page.getByRole('link',{name:'Back to this order'}).click();
  await page.getByRole('link',{name:'Review ECLIPSE costs'}).click();
  await page.getByText('Postage actual £1.15').waitFor();
  assert.equal(await page.getByRole('button',{name:'Approve and save revision'}).count(),0);
  await page.getByRole('button',{name:'Sign out'}).click();
  await page.getByText('Signed out of staging.').waitFor();
  role='finance';await login();
  await page.getByRole('button',{name:'Approve and save revision'}).click();
  await page.getByText('Saved revision 1').waitFor();
  expired=true;await page.reload();
  await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  assert.equal(await page.getByText('Postage actual £1.15').count(),0);
  assert.ok(calls.includes('logout')&&calls.includes('quartermaster84c_finance_save'));
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('PASS packaged desktop/mobile browser fixtures, staging-only paths, finance role, session expiry and sign-out');
}finally{await browser.close();server.close();}
