// Bounded verified Blob leases. Active consumers are never revoked by eviction.
export const verifiedImagePolicy=Object.freeze({maxBytes:24*1024*1024,maxEntries:32,maxConcurrent:4,maxQueued:32,idleMs:30000});
export function createVerifiedImagePool({policy=verifiedImagePolicy,createURL=b=>URL.createObjectURL(b),revokeURL=u=>URL.revokeObjectURL(u)}={}){
 const entries=new Map(),queue=[];let active=0,resident=0,reserved=0,closed=false;
 const remove=item=>{if(entries.get(item.key)===item)entries.delete(item.key);clearTimeout(item.timer);if(item.url){revokeURL(item.url);resident-=item.bytes;item.url=null;}};
 const evict=bytes=>{for(const item of entries.values())if(item.url&&!item.users.size&&(resident+reserved+bytes>policy.maxBytes||entries.size>=policy.maxEntries))remove(item);};
 function pump(){
  while(active<policy.maxConcurrent&&queue.length){const item=queue.shift();if(item.controller.signal.aborted||closed){item.reject(Error('Image request cancelled'));continue;}
   evict(item.bytes);
   if(resident+reserved+item.bytes>policy.maxBytes){item.reject(Error('Verified image memory budget reached'));continue;}
   active++;reserved+=item.bytes;
   Promise.resolve().then(()=>item.load(item.controller.signal)).then(({bytes,mime})=>{
    if(closed||item.controller.signal.aborted)throw Error('Image request cancelled');
    if(bytes.byteLength!==item.bytes)throw Error('Verified image size changed');
    item.url=createURL(new Blob([bytes],{type:mime}));resident+=item.bytes;item.resolve(item);
   }).catch(item.reject).finally(()=>{active--;reserved-=item.bytes;pump();});
  }
 }
 function release(item,token){
  if(!item.users.delete(token))return;
  if(!item.users.size){if(!item.url){item.controller.abort();if(entries.get(item.key)===item)entries.delete(item.key);}else if(closed)remove(item);else{item.timer=setTimeout(()=>{if(!item.users.size)remove(item);},policy.idleMs);item.timer.unref?.();}}
 }
 async function acquire({key,bytes,load,signal}){
  if(closed||signal?.aborted)throw Error('Image request cancelled');
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>policy.maxBytes)throw Error('Invalid verified image budget');
  let item=entries.get(key);
  if(!item){evict(bytes);if(entries.size>=policy.maxEntries||queue.length>=policy.maxQueued)throw Error('Verified image queue budget reached');
   item={key,bytes,load,controller:new AbortController(),users:new Set()};
   item.promise=new Promise((resolve,reject)=>{item.resolve=resolve;item.reject=reject;});
   item.promise.catch(()=>{if(entries.get(key)===item)entries.delete(key);});entries.set(key,item);queue.push(item);
  }
  const token={};item.users.add(token);clearTimeout(item.timer);
  let rejectAbort;const abortPromise=new Promise((_,reject)=>rejectAbort=reject),abort=()=>{release(item,token);rejectAbort(Error('Image request cancelled'));};
  signal?.addEventListener('abort',abort,{once:true});pump();
  try{await Promise.race([item.promise,abortPromise]);if(signal?.aborted||closed)throw Error('Image request cancelled');
   let done=false;return {url:item.url,release(){if(done)return;done=true;signal?.removeEventListener('abort',abort);release(item,token);}};
  }catch(error){signal?.removeEventListener('abort',abort);release(item,token);throw error;}
 }
 return {acquire,stats:()=>({entries:entries.size,active,queued:queue.length,residentBytes:resident,reservedBytes:reserved}),dispose(){closed=true;for(const item of entries.values()){item.controller.abort();if(!item.users.size)remove(item);}pump();}};
}
