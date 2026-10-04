import {readOperationsPresentation,readCurrentStore} from '../backend/site-operations.mjs';
import {activeAnnouncement,effectiveStore,safeHref,ukDate} from './model.mjs';
import {newsCards} from './news-render.mjs';
export function mountAnnouncement(document,item,storage=globalThis.localStorage){
 document.querySelector('[data-site-announcement]')?.remove();if(!item)return;
 let dismissed=false;try{dismissed=item.dismissible&&storage?.getItem('apparition.notice.'+item.id)==='dismissed';}catch{}if(dismissed)return;
 const bar=document.createElement('aside');bar.className='site-announcement';bar.dataset.siteAnnouncement='';bar.setAttribute('aria-label','Site update');const copy=document.createElement('div'),title=document.createElement('strong'),message=document.createElement('span');title.textContent=item.title;message.textContent=item.message;copy.append(title,message);if(item.resume_at){const time=document.createElement('span');time.textContent='Orders reopen '+ukDate(item.resume_at)+' (UK time).';copy.append(time);}bar.append(copy);
 const href=safeHref(item.cta_url);if(href){const a=document.createElement('a');a.href=href;a.textContent=item.cta_label||'Read update';bar.append(a);}if(item.dismissible){const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.setAttribute('aria-label','Dismiss site update');close.addEventListener('click',()=>{try{storage?.setItem('apparition.notice.'+item.id,'dismissed');}catch{}bar.remove();});bar.append(close);}
 document.querySelector('.site-header')?.after(bar);
}
export async function bootOperations(document=globalThis.document){
 if(!document?.querySelector('.site-header')||document.location?.pathname.includes('/admin/'))return;
 const view=document.defaultView,purchasing=/\/(basket|checkout)\/$/.test(document.location?.pathname||'');let snapshot=null,store=null,offset=0,timer=null,inflight=null;
 const dispatch=state=>{view.apparitionStoreState=state;view.dispatchEvent(new view.CustomEvent('apparition:store-status',{detail:state}));};
 function paint(){if(!store)return;const now=Date.now()+offset;mountAnnouncement(document,activeAnnouncement(store,snapshot?.news||[],now));arm(now);}
 function arm(now){view.clearTimeout(timer);const boundaries=[store?.pause_from,store?.resume_at,...(snapshot?.news||[]).filter(p=>p.announcement).map(p=>p.expires_at)].map(Date.parse).filter(t=>Number.isFinite(t)&&t>now);if(!boundaries.length)return;const delay=Math.min(...boundaries)-now+25;if(delay<=2147483647)timer=view.setTimeout(()=>purchasing?refresh():paint(),delay);}
 function refresh(){if(inflight)return inflight;inflight=readCurrentStore().then(current=>{store=current;offset=Date.parse(current.observed_at)-Date.now();dispatch(current);paint();}).catch(error=>{dispatch({state:'UNAVAILABLE',customer_message:error.message});}).finally(()=>{inflight=null;});return inflight;}
 try{snapshot=await readOperationsPresentation();store=snapshot?.store;if(store)paint();const latest=document.querySelector('[data-latest-news]');if(latest&&snapshot.news?.length){latest.hidden=false;latest.querySelector('[data-news-cards]').innerHTML=newsCards(snapshot.news.slice(0,3));}}
 catch{/* Public tools/information remain available if a static notice is absent. */}
 // No polling. Recheck checkout UI when returning from bfcache/another tab and
 // at configured schedule boundaries; the server always enforces current state.
 if(purchasing){await refresh();view.addEventListener('pageshow',event=>{if(event.persisted)refresh();});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});}
}
