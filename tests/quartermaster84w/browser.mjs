import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {stageTransport} from './workspace.mjs';

const backend = {url:'https://prwmowexhonguvtiywsy.supabase.co',publishableKey:'fixture-only'};
const jwt = issuer => 'fixture.'+Buffer.from(JSON.stringify({iss:issuer})).toString('base64url')+'.fixture';
let outgoing=0;
const fetcher = async (url,options) => {
  outgoing++;
  assert.equal(url.href,backend.url+'/rest/v1/rpc/quartermaster84w_workspace?p_order=fixture');
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  return new Response('{"schema":1}');
};
const boundedJSON = async (response,max) => {
  assert.equal(max,96000);
  return response.json();
};
assert.throws(()=>stageTransport({backend:{url:'https://acdxpxvksvdwfajntzfx.supabase.co'}}),/isolated staging host/);
const foreign = stageTransport({backend,auth:{accessToken:async()=>jwt('https://acdxpxvksvdwfajntzfx.supabase.co/auth/v1')},boundedJSON,fetcher});
await assert.rejects(foreign('view',{p_order:'fixture'},AbortSignal.timeout(200)),/staging Admin session/);
assert.equal(outgoing,0);
const stage = stageTransport({backend,auth:{accessToken:async()=>jwt(backend.url+'/auth/v1')},boundedJSON,fetcher});
assert.deepEqual(await stage('view',{p_order:'fixture'},AbortSignal.timeout(1000)),{schema:1});
assert.equal(outgoing,1);
console.log('PASS staging host and JWT issuer separation with no provider traffic');

const entry = await readFile(new URL('./workspace.mjs',import.meta.url));
const server = createServer((req,res)=>{
  if(req.url==='/workspace.mjs') return res.writeHead(200,{'Content-Type':'text/javascript'}).end(entry);
  if(req.url!=='/') return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':'text/html'}).end(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
    <main id="fixture"></main><script type="module">
      import {mountWorkshop} from './workspace.mjs';
      window.commands=[];
      window.fixtureMode='workshop';
      let picked=0, revision=0, state='none';
      const p_order='00000000-0000-4000-8000-000000000010';
      const batch='00000000-0000-4000-8000-000000000021';
      const wire=async(name,p)=>{
        if(name==='view'){
          if(window.fixtureMode==='disabled') return {schema:1,mode:'disabled',order:null};
          return {schema:1,mode:window.fixtureMode,order:{reference:'FIXTURE-WORKSHOP',generation:state==='none'?0:1,
            revision,state,canReserve:state==='none',canPick:state==='reserved',canRelease:state==='reserved',
            canReceive:false,canRecordPostage:false,picks:[{id:'pot',title:'Fixture potentiometer',quantity:1,picked}],
            materials:[{sku:'F-ONE',title:'Fixture box',available:1}],batches:[{id:batch,remaining:1}],
            cost:{material:null,estimate:null,actual:null},parcel:null}};
        }
        if(name==='receipt') return null;
        if(name==='command'){
          window.commands.push(p);
          if(p.p_order!==p_order || p.p_revision!==revision) throw Error('fixture stale');
          if(window.failNext) throw Error('fixture uncertain');
          if(p.p_action.kind==='reserve') state='reserved';
          if(p.p_action.kind==='pick'){picked=p.p_action.quantity;revision++;}
          if(p.p_action.kind==='release'){state='released';revision++;}
          return {state,revision};
        }
        throw Error('Unexpected fixture route');
      };
      window.mount = () => {window.workshop?.lock();window.workshop=mountWorkshop({document,root:document.querySelector('main'),orderId:p_order,request:wire});};
      window.mount();
    </script>`);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:process.env.QUARTERMASTER_CHROMIUM,headless:true,args:['--no-sandbox']});
try {
  for(const [width,height] of [[1360,850],[390,844]]) {
    const page=await browser.newPage({viewport:{width,height}});
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    const reservation=page.getByRole('button',{name:'Reserve packaging'});
    await reservation.click();
    await page.getByLabel('Fixture potentiometer · 1 required').fill('1');
    await page.getByRole('button',{name:'Save picked count'}).click();
    await page.getByRole('button',{name:'Record completed pack'}).waitFor();
    const sent=await page.evaluate(()=>window.commands.map(x=>[x.p_generation,x.p_revision,x.p_action.kind]));
    assert.deepEqual(sent,[[0,0,'reserve'],[1,0,'pick']]);
    await page.evaluate(()=>{window.failNext=true;});
    await page.getByRole('button',{name:'Release reserved packaging'}).click();
    await page.getByText('The outcome could not be confirmed.',{exact:false}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Release reserved packaging'}).isEnabled(),false);
    await page.evaluate(()=>{window.fixtureMode='disabled';window.mount();});
    await page.getByText('Packing is disabled.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button').count(),0);
    assert.match(await page.getByRole('link',{name:'Back to this order'}).getAttribute('href'),/^\/admin\/orders\/\?id=/);
    await page.evaluate(()=>window.workshop.lock());
    assert.equal(await page.locator('main').innerText(),'');
    await page.close();
  }
  console.log('PASS Chromium desktop and mobile fixture: Orders link, provenance, uncertain request lock and disabled state');
} finally {
  await browser.close();
  server.close();
}
