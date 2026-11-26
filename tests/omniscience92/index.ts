import {aggregatePeriod} from './aggregate.mjs';
const origins=new Set(['https://apparitioninstruments.co.uk','https://www.apparitioninstruments.co.uk']);
Deno.serve(async request=>{
 const origin=request.headers.get('origin');
 const cors={'Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:'https://apparitioninstruments.co.uk',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 if(origin&&!origins.has(origin))return new Response('Origin denied',{status:403});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
 const authorization=request.headers.get('authorization'),apikey=request.headers.get('apikey');
 if(!authorization?.startsWith('Bearer ')||!apikey)return new Response('Admin session required',{status:401,headers:cors});
 const backend=Deno.env.get('SUPABASE_URL');
 if(!['https://acdxpxvksvdwfajntzfx.supabase.co','https://prwmowexhonguvtiywsy.supabase.co'].includes(backend||''))
  return new Response('Approved database required',{status:503,headers:cors});
 const signal=AbortSignal.timeout(45000);
 const endpoints={orders:'omniscience92_orders',outlays:'omniscience92_outlays',scope:'omniscience92_scope'};
 let bytes=0;
 try{
  const text=await request.text();
  if(text.length>300)return new Response('Invalid reporting period',{status:400,headers:cors});
  const period=JSON.parse(text);
  if(Object.keys(period).some(key=>!['from','to'].includes(key)))throw Error('Invalid reporting period.');
  const result=await aggregatePeriod(period,async(kind,body)=>{
   const response=await fetch(backend+'/rest/v1/rpc/'+endpoints[kind],{
    method:'POST',signal,redirect:'error',headers:{authorization,apikey,'Content-Type':'application/json'},
    body:JSON.stringify(body)
   });
   if(!response.ok)throw Error(response.status===401||response.status===403?'Admin permission is required.':'Report unavailable. Refresh or choose a shorter period.');
   const reader=response.body?.getReader();
   if(!reader)throw Error('Report unavailable.');
   const chunks:Uint8Array[]=[];let size=0;
   try{
    while(true){
     const {done,value}=await reader.read();if(done)break;
     size+=value.byteLength;bytes+=value.byteLength;
     if(size>4194304||bytes>67108864){await reader.cancel();throw Error('Choose a shorter reporting period.');}
     chunks.push(value);
    }
   }finally{reader.releaseLock();}
   const raw=new Uint8Array(size);let offset=0;
   for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.byteLength;}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  },signal);
  const encoded=JSON.stringify(result);
  if(encoded.length>524288)throw Error('Choose a shorter reporting period.');
  return new Response(encoded,{headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch(error){
  return Response.json({message:error instanceof Error?error.message:'Report unavailable.'},{status:422,headers:{...cors,'Cache-Control':'no-store'}});
 }
});
