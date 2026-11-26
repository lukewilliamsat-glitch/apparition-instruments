import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve, extname, sep} from 'node:path';
const root=resolve(process.argv[2]);
const browser=process.env.QUARTERMASTER_CHROMIUM??'chromium';
const page=await readFile(new URL('browser-page.html',import.meta.url),'utf8');
const app=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/')return res.writeHead(200,{'content-type':'text/html'}).end(page);
  const file=resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+sep))return res.writeHead(404).end();
  try{
    const type={'.mjs':'text/javascript','.css':'text/css'}[extname(file)]??'application/octet-stream';
    const bytes=await readFile(file);
    res.writeHead(200,{'content-type':type}).end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>app.listen(0,'127.0.0.1',r));
try{
 for(const width of [1360,390]){
  const url='http://127.0.0.1:'+app.address().port+'/';
  let output='',errors='';
  const runner=spawn(browser,['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-proxy-server',
     '--enable-logging=stderr','--virtual-time-budget=16000','--window-size='+width+',844','--dump-dom',url],{stdio:['ignore','pipe','pipe']});
  runner.stdout.on('data',b=>{output+=b;});
  runner.stderr.on('data',b=>{errors+=b;});
  assert.equal(await new Promise((r,j)=>{runner.on('error',j);runner.on('close',r);}),0);
  const result=output.match(/<output id="result">([^<]*)<\/output>/)?.[1];
  assert.equal(result,'PASS 91 orders',errors.split('\n').filter(line=>line.includes('CONSOLE')).join('\n'));
  console.log('PASS Orders browser '+width+' px');
 }
}finally{app.close();}
