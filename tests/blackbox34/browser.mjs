// Reuse the executed B33 acceptance source; narrow asserted fixture transforms.
// The original harness remains unchanged. This generated file is disposable.
import {readFile,writeFile,rm} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const [output,browser,controller,commit]=process.argv.slice(2),source=new URL('../blackbox33/acceptance.mjs',import.meta.url),temporary=new URL('../blackbox33/.nightfall-acceptance.fixture.mjs',import.meta.url);
let text=await readFile(source,'utf8');
function replace(before,after){if(!text.includes(before))throw Error('Acceptance source contract changed: '+before);text=text.replace(before,after);}
replace('const [output,executablePath,controller]=','const [output,executablePath,controller,candidateCommit]=');
replace("sourceCommit:'870a99c8ed99f981728f26b1eedb415af218b424'",'sourceCommit:candidateCommit');
replace("{enabled:true,assetOrigin:origin,manifestPath:","{enabled:true,verificationMode:'demand',assetOrigin:origin,manifestPath:");
replace("assert((await img.getAttribute('src')).endsWith(expected.path));","assert((await img.getAttribute('data-verified-source')).endsWith(expected.path));assert((await img.getAttribute('src')).startsWith('blob:'));");
replace('url:r.image?.url','url:r.image?.key');
replace('async function placeholder(page){await page.waitForFunction',"async function placeholder(page){await page.locator('#'+target.id).scrollIntoViewIfNeeded();await page.waitForFunction");
replace("c?.querySelector('.component-mark')&&!c.querySelector('img.component-image')","c?.querySelector('.component-mark')&&!c.querySelector('img.component-image')&&!c.querySelector('[data-image-state=\"pending\"],[data-image-state=\"loading\"]')");
replace("'NETWORK_CACHE_RESULTS.json'","'DEMAND_BROWSER_RESULTS.json'");
replace(" await context.close();\n for(const fault",` await test('page suspension releases images and BFCache-style resume restores them',async()=>{
  await page.goto(origin+'/components/');await waitCards(page);await photo(page);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  assert.equal(await page.locator('#'+target.id+' img').count(),0);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await photo(page);
 });
 await test('actual history navigation returns to correct verified images',async()=>{
  await page.goto(origin+'/components/');await waitCards(page);await photo(page);
  await page.goto(origin+'/products/'+target.id.toLowerCase()+'/');await page.waitForSelector('#product-detail img');
  await page.goBack();await waitCards(page);await photo(page);await page.goForward();await page.waitForSelector('#product-detail img');
 });
 await context.close();
 for(const fault`);
await writeFile(temporary,text);
try{execFileSync(process.execPath,[temporary.pathname,output,browser,controller,commit],{stdio:'inherit'});}finally{await rm(temporary,{force:true});}
