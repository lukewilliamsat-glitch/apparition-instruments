// Server transport for fixed provider routes only. Error payloads, credentials and redirects
// are never returned to the application. The timeout spans headers and the full body.
export function providerJSON(allow, fetcher=globalThis.fetch){
 if(typeof allow!=='function'||typeof fetcher!=='function')throw Error('Provider transport unavailable');
 return async ({url,method,headers,body,timeoutMs,maxBytes})=>{
  const target=new URL(url);
  if(target.protocol!=='https:'||target.username||target.password||target.hash||!allow(target,method)
   ||!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>12000||
   !Number.isSafeInteger(maxBytes)||maxBytes<128||maxBytes>1_000_000)throw Error('Provider request outside contract');
  let res;
  try{
   res=await fetcher(target,{method,headers,body,redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
   if(res.status===204)return {status:204,body:null};
   if(!res.ok){
    await res.body?.cancel();
    const hint=res.headers.get('retry-after');
    const retryAfterSeconds=hint===null?undefined:/^\d+$/.test(hint)?Math.min(Number(hint),30):30;
    return {status:res.status,body:null,retryAfterSeconds};
   }
   if(!/^application\/(?:[\w.+-]+\+)?json\b/i.test(res.headers.get('content-type')??'')
    ||Number(res.headers.get('content-length'))>maxBytes||!res.body)throw Error();
   const read=res.body.getReader(), chunks=[];
   let size=0;
   try{
    while(true){
     const {done,value}=await read.read();if(done)break;
     size+=value.byteLength;if(size>maxBytes)throw Error();
     chunks.push(value);
    }
   }catch{await read.cancel().catch(()=>{});throw Error();}
   const joined=new Uint8Array(size);let offset=0;
   for(const part of chunks){joined.set(part,offset);offset+=part.length;}
   return {status:res.status,body:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined))};
  }catch{throw Error('Provider transport did not return a bounded JSON response');}
 };
}
