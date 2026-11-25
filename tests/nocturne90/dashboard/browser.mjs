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
 for(const [mode,width] of [['finance',1360],['finance',390],['command',1360],['command',390]]){
  const url='http://127.0.0.1:'+app.address().port+'/?mode='+mode+'&order=00000000-0000-4000-8000-000000000013';
  let output='';
  const runner=spawn(browser,['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-proxy-server',
     '--virtual-time-budget=3500','--window-size='+width+',844','--dump-dom',url],{stdio:['ignore','pipe','ignore']});
  runner.stdout.on('data',b=>{output+=b;});
  assert.equal(await new Promise((r,j)=>{runner.on('error',j);runner.on('close',r);}),0);
  assert.match(output,new RegExp('<output id="result">PASS 90 '+mode+'</output>'),output.match(/<output[^>]*>[^<]*/)?.[0]);
  console.log('PASS browser '+mode+' '+width+' px');
 }
}finally{app.close();}
