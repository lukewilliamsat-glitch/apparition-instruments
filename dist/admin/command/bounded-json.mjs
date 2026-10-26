// A decoded-byte ceiling applies even when Content-Length describes compressed bytes.
export const readError=(code,message)=>Object.assign(new Error(message),{code,outcome:'not-applied'});
export async function boundedJSON(response,maxBytes,{signal,onBytes=()=>{}}={}){
 if(!response?.ok){
  const code=response?.status===401?'EXPIRED':response?.status===403?'DENIED':response?.status===429?'QUOTA':'READ';
  await response?.body?.cancel?.().catch(()=>{});
  throw readError(code,'The authorised read is unavailable. No fallback data was used.');
 }
 const length=response.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){await response.body?.cancel?.().catch(()=>{});throw readError('BOUNDS','Read response exceeds its byte limit.');}
 if(!/^application\/json\b/i.test(response.headers.get('content-type')||'')||!response.body?.getReader)throw readError('PROJECTION','A bounded JSON response is required.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 const abort=()=>{void reader.cancel().catch(()=>{});};
 signal?.addEventListener('abort',abort,{once:true});
 try{
  if(signal?.aborted)throw readError('STALE','Read cancelled.');
  while(true){
   const {done,value}=await reader.read();
   if(signal?.aborted)throw readError('STALE','Read cancelled.');
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();throw readError('BOUNDS','Read response exceeds its byte limit.');}
   chunks.push(value);
  }
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
  onBytes(size);
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw readError('MALFORMED','The authorised read returned invalid JSON.');}
 }finally{signal?.removeEventListener('abort',abort);reader.releaseLock();}
}
