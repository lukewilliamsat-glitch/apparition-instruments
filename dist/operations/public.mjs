import {readCommercialDestinations} from '../commercial/destinations.mjs';
import {createPublicComponentRepository} from '../backend/component-data.mjs';
import {commercialSurface,mountCommercialHandoff} from '../commercial/handoff.mjs';
import {readOperationsPresentation,readCurrentStore,readPublicAnnouncements} from '../backend/site-operations.mjs';
import {activeAnnouncement,effectiveStore,safeHref,ukDate} from './model.mjs';
import {newsCards} from './news-render.mjs';
export const purchasingSurface=path=>/\/(basket|checkout|components|products|les-paul-kits|wiring-kits|treble-bleed-designer)(\/|$)/.test(path);
const announcementLayouts=new WeakMap();
export function mountAnnouncement(document,item,storage=globalThis.localStorage){
 announcementLayouts.get(document)?.();document.querySelector('[data-site-announcement]')?.remove();if(!item)return;
 let dismissed=false;try{dismissed=item.dismissible&&storage?.getItem('apparition.notice.'+item.id)==='dismissed';}catch{}if(dismissed)return;
 const header=document.querySelector('.site-header');if(!header)return;
 const bar=document.createElement('aside');bar.className='site-announcement';bar.dataset.siteAnnouncement='';bar.setAttribute('aria-label','Site update');const copy=document.createElement('div'),title=document.createElement('strong'),message=document.createElement('span');title.textContent=item.title;message.textContent=item.message??item.excerpt??'';copy.append(title,message);if(item.resume_at){const time=document.createElement('span');time.textContent='Orders reopen '+ukDate(item.resume_at)+' (UK time).';copy.append(time);}bar.append(copy);
 const view=document.defaultView,body=document.body;let observer;
 const measure=()=>{body.style.setProperty('--site-announcement-height',bar.getBoundingClientRect().height+'px');body.style.setProperty('--site-announcement-header-height',header.getBoundingClientRect().height+'px');};
 const clear=()=>{observer?.disconnect();view?.removeEventListener('resize',measure);bar.remove();body.classList.remove('has-site-announcement');body.style.removeProperty('--site-announcement-height');body.style.removeProperty('--site-announcement-header-height');announcementLayouts.delete(document);};
 const href=safeHref(item.cta_url);if(href){const a=document.createElement('a');a.href=href;a.textContent=item.cta_label||'Read update';bar.append(a);}if(item.dismissible){const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.setAttribute('aria-label','Dismiss site update');close.addEventListener('click',()=>{try{storage?.setItem('apparition.notice.'+item.id,'dismissed');}catch{}clear();});bar.append(close);}
 header.before(bar);body.classList.add('has-site-announcement');measure();if(view?.ResizeObserver){observer=new view.ResizeObserver(measure);observer.observe(bar);observer.observe(header);}view?.addEventListener('resize',measure);announcementLayouts.set(document,clear);
}
export async function bootOperations(document=globalThis.document,{readPresentation=readOperationsPresentation,readStore=readCurrentStore,readAnnouncements=readPublicAnnouncements}={}){
 if(!document?.querySelector('.site-header')||document.location?.pathname.includes('/admin/'))return;
 const view=document.defaultView;let snapshot=null,store=null,offset=0,timer=null,refreshTimer=null,inflight=null,stopped=false,commercial=undefined,product=null;
 const commercialReady=commercialSurface(document.location?.pathname||'')?readCommercialDestinations().then(async value=>{commercial=value;if(value.destinations.length&&document.location.pathname.startsWith('/products/')){const id=document.querySelector('[data-component-id]')?.dataset.componentId;const products=await createPublicComponentRepository().list();product=products.find(p=>p.id===id||('/products/'+p.id.toLowerCase()+'/')===document.location.pathname)||null;}paint();}).catch(()=>{commercial={version:2,destinations:[]};}):Promise.resolve();
 const dispatch=state=>{view.apparitionStoreState=state;view.dispatchEvent(new view.CustomEvent('apparition:store-status',{detail:state}));};
 function paint(){if(stopped)return;const now=Date.now()+offset;mountAnnouncement(document,activeAnnouncement(store||{desired_state:'OPEN'},snapshot?.news||[],now));mountCommercialHandoff(document,store?effectiveStore(store,now):null,commercial,product);arm(now);}
 function arm(now){view.clearTimeout(timer);const boundaries=[store?.pause_from,store?.resume_at,...(snapshot?.news||[]).filter(p=>p.announcement).flatMap(p=>[p.publication_at,p.expires_at])].map(Date.parse).filter(t=>Number.isFinite(t)&&t>now);if(!boundaries.length)return;const delay=Math.min(...boundaries)-now+25;if(delay<=2147483647)timer=view.setTimeout(refresh,delay);}
 function schedule(){view.clearTimeout(refreshTimer);if(!stopped)refreshTimer=view.setTimeout(()=>{if(document.visibilityState!=='hidden')refresh();else schedule();},60000);}
 function refresh(){if(stopped)return Promise.resolve();if(inflight)return inflight;inflight=Promise.allSettled([readStore(),readAnnouncements()]).then(([current,posts])=>{if(stopped)return;if(current.status==='fulfilled'){store=current.value;offset=Date.parse(store.observed_at)-Date.now();dispatch(store);}else{store=null;dispatch({state:'UNAVAILABLE',customer_message:current.reason?.message});}snapshot={...snapshot,news:posts.status==='fulfilled'?posts.value:[]};paint();}).finally(()=>{inflight=null;schedule();});return inflight;}
 try{snapshot=await readPresentation();store=snapshot?.store;if(store)paint();const latest=document.querySelector('[data-latest-news]');if(latest&&snapshot.news?.length){latest.hidden=false;latest.querySelector('[data-news-cards]').innerHTML=newsCards(snapshot.news.slice(0,3));}}
 catch{/* Public tools/information remain available if a static notice is absent. */}
 // Public announcements newly becoming effective need no deployment. Poll only
 // visible pages, at most once per minute; known time boundaries refresh sooner.
 await refresh();const visible=()=>{if(document.visibilityState==='visible')refresh();},pageshow=event=>{if(event.persisted)refresh();};view.addEventListener('pageshow',pageshow);document.addEventListener('visibilitychange',visible);
 return {refresh,stop(){stopped=true;view.clearTimeout(timer);view.clearTimeout(refreshTimer);view.removeEventListener('pageshow',pageshow);document.removeEventListener('visibilitychange',visible);}};
}
