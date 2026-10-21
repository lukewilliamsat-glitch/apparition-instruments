import {isDemandImage,acquireDemandImage,disposeDemandImageCache} from './catalogue-image-delivery.mjs';
const cleanups=new WeakMap(),documents=new WeakMap();
export {isDemandImage};
export function disposeDemandImages(root){for(const node of [root,...root.querySelectorAll('*')])cleanups.get(node)?.();}
export function mountDemandImage(host,handle,{alt,className,fallback,immediate=false}){
 if(!isDemandImage(handle))throw Error('Verified image handle required');
 const doc=host.ownerDocument,view=doc.defaultView;let observer,controller,lease,epoch=0,stopped=false,failed=false,paused=false;
 host.append(fallback);host.dataset.imageState='pending';
 function leave(){epoch++;controller?.abort();controller=null;lease?.release();lease=null;host.replaceChildren(fallback);}
 async function enter(){
  if(stopped||paused||controller||failed)return;controller=new AbortController();host.dataset.imageState='loading';const current=++epoch;
  try{const next=await acquireDemandImage(handle,{signal:controller.signal});
   if(stopped||current!==epoch||!host.isConnected){next.release();return;}
   lease=next;const img=doc.createElement('img');img.className=className;img.alt=alt;img.loading='lazy';img.dataset.verifiedSource=next.sourceURL;img.src=next.url;
   img.addEventListener('error',()=>{failed=true;host.dataset.imageState='unavailable';leave();},{once:true});host.replaceChildren(img);host.dataset.imageState='verified';
  }catch{if(current===epoch&&!stopped){failed=true;host.dataset.imageState='unavailable';leave();}}
 }
 let set=documents.get(doc);if(!set){set=new Set();documents.set(doc,set);view?.addEventListener('pagehide',()=>{for(const cleanup of [...set])cleanup.suspend();disposeDemandImageCache();});view?.addEventListener('pageshow',event=>{if(event.persisted)for(const cleanup of [...set])cleanup.resume();});}
 const cleanup=()=>{if(stopped)return;stopped=true;observer?.disconnect();leave();set.delete(cleanup);cleanups.delete(host);};set.add(cleanup);cleanups.set(host,cleanup);
 cleanup.suspend=()=>{paused=true;observer?.disconnect();leave();};cleanup.resume=()=>{if(stopped||!host.isConnected)return;paused=false;failed=false;if(immediate)void enter();else observer?.observe(host);};
 if(immediate)queueMicrotask(enter);
 else if(view?.IntersectionObserver){observer=new view.IntersectionObserver(entries=>{for(const entry of entries)if(entry.target===host){if(entry.isIntersecting){failed=false;void enter();}else leave();}},{rootMargin:'0px'});observer.observe(host);}
 // No observer means placeholders, not a silent eager full-catalogue download.
 return cleanup;
}
