// Effective-time presentation mirrors the database; checkout never trusts this.
export const newsCategories=Object.freeze({NEWS:'News',PRODUCT:'Product',TOOL_UPDATE:'Tool update',MAINTENANCE:'Maintenance',STORE_UPDATE:'Store update'});
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeHref(value){
 if(typeof value!=='string'||/[\u0000-\u0020\\]/.test(value))return null;
 if(value.startsWith('/')&&!value.startsWith('//'))return value;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function effectiveStore(config,now=Date.now()){
 if(!config||!['OPEN','ORDERS_PAUSED'].includes(config.desired_state))throw Error('Store availability could not be checked. Please retry shortly.');
 const start=config.pause_from?Date.parse(config.pause_from):null,end=config.resume_at?Date.parse(config.resume_at):null;
 if(config.desired_state==='ORDERS_PAUSED'&&(!Number.isFinite(start)||(end!==null&&(!Number.isFinite(end)||end<=start))))throw Error('Store availability could not be checked. Please retry shortly.');
 return {...config,state:config.desired_state==='ORDERS_PAUSED'&&now>=start&&(end===null||now<end)?'ORDERS_PAUSED':'OPEN'};
}
export const ukDate=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export function activeAnnouncement(store,posts=[],now=Date.now()){
 const effective=effectiveStore(store,now);
 if(effective.state==='ORDERS_PAUSED')return {id:'store-'+store.updated_at,title:store.customer_title,message:store.customer_message,category:'STORE_UPDATE',dismissible:false,cta_url:'/basket/',cta_label:'View saved basket',resume_at:store.resume_at};
 return posts.filter(p=>p.announcement&&(!p.status||['SCHEDULED','PUBLISHED'].includes(p.status))&&Date.parse(p.publication_at)<=now&&(!p.expires_at||now<Date.parse(p.expires_at))).sort((a,b)=>b.priority-a.priority||Date.parse(b.publication_at)-Date.parse(a.publication_at)||a.slug.localeCompare(b.slug)).map(p=>({...p,message:p.excerpt,cta_url:p.cta_url||null,cta_label:p.cta_label||'Read update'}))[0]||null;
}
export function toUKInput(value){if(!value)return '';const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)),get=k=>parts.find(p=>p.type===k).value;return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;}
export function ukInputToISO(value){
 if(!value)return null;if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Enter a valid UK date and time.');
 const target=Date.parse(value+'Z'),matches=[target-3600000,target,target+3600000].filter(t=>toUKInput(t)===value);
 if(matches.length!==1)throw Error('That UK time is missing or ambiguous at the daylight-saving transition. Choose another time.');return new Date(matches[0]).toISOString();
}
