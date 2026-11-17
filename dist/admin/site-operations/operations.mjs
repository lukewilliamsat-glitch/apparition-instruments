import {setAdminFeedback} from '../interaction.mjs';
import {statusBadge} from '../application.mjs';
import {operationPresets,readPreset,writePreset} from '../../operations/presets.mjs';
import {currentOperationsRepository} from '../../backend/operations-admin.mjs';
import {effectiveStore,activeAnnouncement,ukDate,toUKInput,ukInputToISO,safeHref} from '../../operations/model.mjs';
import {renderNewsBody} from '../../operations/news-render.mjs';
export function bootOperationsAdmin({document=globalThis.document,repo=currentOperationsRepository(),confirm=message=>document.defaultView.confirm(message)}={}){
 const d=document,storeForm=d.querySelector('#store-form'),newsForm=d.querySelector('#news-form'),status=d.querySelector('#operations-status');let store=null,posts=[],selected=null,busy=false,referenceClock=0,clockRead=0,formBaseline="",auditCursor=null,auditEpoch=0,auditPending=false,transitionTimer;
 const field=(form,name)=>form.elements.namedItem(name),say=(text,state='neutral')=>setAdminFeedback(status,text,state);
 const newsStatus=d.querySelector('#news-action-status')||status,newsSay=(text,state='neutral')=>setAdminFeedback(newsStatus,text,state);
 const invalidNews=()=>{const input=[...newsForm.elements].find(n=>n.willValidate&&!n.validity.valid);if(!input)return false;const label=input.closest('label')?.firstChild?.textContent?.trim()||input.name||'Field';newsSay(label+': '+(input.validationMessage||'Enter a valid value.'),'error');input.setAttribute('aria-invalid','true');return true;};
 newsForm.addEventListener('invalid',invalidNews,true);
 newsForm.addEventListener('input',event=>{if(event.target.validity?.valid)event.target.removeAttribute('aria-invalid');});
 const node=(tag,text)=>{const n=d.createElement(tag);n.textContent=text;return n;};
 const selection=post=>{selected=post||null;newsForm.reset();for(const name of ['title','slug','excerpt','body','category','publication_at','expires_at','cta_label','cta_url','priority','announcement','dismissible']){const input=field(newsForm,name);if(post){if(input.type==='checkbox')input.checked=post[name];else input.value=name.endsWith('_at')?toUKInput(post[name]):post[name]??'';}}field(newsForm,'slug').readOnly=!!post;d.querySelector('#news-edit-title').textContent=post?'Edit: '+post.title+' · '+post.status:'New draft';d.querySelector('#news-preview').hidden=true;};
 const by=id=>d.getElementById(id),activeClock=()=>referenceClock?referenceClock+Date.now()-clockRead:Date.now();
 const categories={STORE_STATUS:'Ordering status changed',NEWS_DRAFT:'News draft saved',NEWS_PUBLISHED:'News published',NEWS_SCHEDULED:'News publication scheduled',NEWS_ARCHIVED:'News archived'};
 const configured=()=>{const now=activeClock();return !!store&&store.desired_state==='ORDERS_PAUSED'&&(!store.resume_at||Date.parse(store.resume_at)>now);};
 const formState=()=>JSON.stringify([...storeForm.elements].filter(n=>n.name&&n.tagName!=='BUTTON').map(n=>[n.name,n.value]));
 function preview(){
  const f=name=>field(storeForm,name).value;
  if(by('ops-dirty'))by('ops-dirty').textContent=formBaseline!==formState()?'Unsaved draft changes.':'No unsaved changes.';
  if(!by('ops-notice-title'))return;
  by('ops-notice-title').textContent=f('customer_title').trim()||'Notice title';
  by('ops-notice-body').textContent=f('customer_message').trim()||'The customer notice appears here.';
  try{const end=f('resume_mode')==='scheduled'&&ukInputToISO(f('resume_at'));
   by('ops-notice-time').textContent=end?'Ordering is due to reopen '+ukDate(end)+' (UK).':'Ordering resumes manually unless you set a date.';
  }catch{by('ops-notice-time').textContent='Check the reopening time.';}
 }
 function renderState(){
  const now=activeClock(),effective=effectiveStore(store,now),scheduled=configured()&&Date.parse(store.pause_from)>now,paused=effective.state==='ORDERS_PAUSED';
  const start=scheduled?' · Closure starts '+ukDate(store.pause_from):'',end=configured()?(store.resume_at?' · Reopens '+ukDate(store.resume_at):' · Manual reopening'):'';
  by('store-current').dataset.state=scheduled?'scheduled':paused?'paused':'open';
  by('store-current').textContent=(paused?'Orders paused':scheduled?'Open for business · Closure scheduled':'Open for business')+start+end+' (UK time).';
  if(by('ops-historical')){by('ops-historical').hidden=store.desired_state!=='ORDERS_PAUSED'||configured();by('ops-historical').textContent='The previous closure expired. Its dates and notice have not been copied into this draft.';}
  if(by('ops-capabilities')){
   by('ops-capabilities').replaceChildren(...[['Storefront','Browsing allowed'],['New orders',paused?'Paused':'Allowed'],['New checkout',paused?'Blocked by policy':'Allowed by policy'],['Existing orders','Continue processing'],['Specialist tools','Policy unchanged']].map(([title,label])=>{
    const item=node('div','');item.append(node('dt',title),node('dd',label));return item;}));
   const edit=storeForm.querySelector('[data-ops-action="edit"]');edit.hidden=!configured();
   field(storeForm,'mode').querySelector('option[value="edit"]').disabled=!configured();
   const resume=field(storeForm,'resume');resume.hidden=!configured();resume.textContent=scheduled?'Cancel scheduled closure':'Resume orders now';
  }
  clearTimeout(transitionTimer);
  const next=[store.pause_from,store.resume_at].map(Date.parse).filter(t=>t>now).sort((a,b)=>a-b)[0];
  if(next&&next-now<2147483647)transitionTimer=setTimeout(()=>{if(d.isConnected&&!busy)renderState();},Math.max(250,next-now+150));
 }
 function render(){
  renderState();
  const preset=configured()?readPreset(store.internal_reason):{preset:'STANDARD',reason:''},defaults=operationPresets[preset.preset];
  field(storeForm,'preset').value=preset.preset;field(storeForm,'internal_reason').value=preset.reason;
  field(storeForm,'customer_title').value=configured()?store.customer_title:defaults.title;
  field(storeForm,'customer_message').value=configured()?store.customer_message:defaults.message;
  field(storeForm,'pause_from').value=configured()?toUKInput(store.pause_from):'';
  field(storeForm,'resume_at').value=configured()?toUKInput(store.resume_at):'';
  field(storeForm,'mode').value=configured()?'edit':'now';
  field(storeForm,'resume_mode').value=configured()&&store.resume_at?'scheduled':'manual';
  updateSchedule();formBaseline=formState();preview();
  const list=d.querySelector('#news-list');list.replaceChildren();if(!posts.length)list.append(node('p','No posts yet.'));for(const p of posts){const button=node('button',p.title+' · '+(p.status==='SCHEDULED'&&Date.parse(p.publication_at)<=Date.now()?'PUBLISHED (effective)':p.status));button.type='button';button.textContent='';button.append(node('span',p.title),statusBadge(d,p.status==='SCHEDULED'&&Date.parse(p.publication_at)<=Date.now()?'PUBLISHED (effective)':p.status,['DRAFT','SCHEDULED'].includes(p.status)?'warning':'neutral'));button.addEventListener('click',()=>selection(p));list.append(button);}
  const active=activeAnnouncement(store,posts.filter(p=>['PUBLISHED','SCHEDULED'].includes(p.status)));d.querySelector('#announcement-current').textContent=active?'Active: '+active.title+(active.dismissible?' · Dismissible':' · Not dismissible'):'No active announcement.';
 }
 function timelineRow(event){
  const item=node('li',''),title=node('strong',(event.action==='STORE_STATUS'?'◷ ':event.action?.startsWith('NEWS_')?'□ ':'• ')+(categories[event.action]||event.action||'Recorded event'));
  const time=node('time',ukDate(event.created_at)+' UK');time.dateTime=event.created_at;
  const details=node('details','');details.append(node('summary','Before and after'),node('pre',JSON.stringify({reference:event.entity_id,actor:event.actor,before:event.before_state,after:event.after_state},null,2)));
  item.append(title,node('span',' · '+(event.actor?'Admin actor recorded':'Actor not recorded')+' · '),time,details);return item;
 }
 async function loadAudit(reset=true){
  const trail=by('operations-audit'),more=by('ops-audit-more'),category=by('ops-audit-filter')?.value||'all';
  if(auditPending&&!reset)return;
  if(reset){auditCursor=null;trail.replaceChildren();}
  const epoch=++auditEpoch;auditPending=true;
  if(more)more.disabled=true;
  try{const events=await repo.audit({category,before:auditCursor});if(epoch!==auditEpoch)return;const shown=events.slice(0,15);
   trail.append(...shown.map(timelineRow));if(reset&&!shown.length)trail.append(node('li','No operations changes in this view.'));
   auditCursor=shown.at(-1)?.id??null;if(more)more.hidden=!(events.length>15&&auditCursor);
  }catch(error){if(epoch===auditEpoch){trail.append(node('li','Activity could not be loaded. '+error.message));if(more)more.hidden=true;}}
  finally{if(epoch===auditEpoch){auditPending=false;if(more)more.disabled=false;}}
 }
 const refresh=async()=>{const [next, nextPosts, authority]=await Promise.all([repo.store(),repo.posts(),repo.effective?.()]);
  if(!next||authority?.store?.updated_at&&String(authority.store.updated_at)!==String(next.updated_at))throw Error('Store settings changed during refresh. Try again.');
  if(authority&&(!['OPEN','ORDERS_PAUSED'].includes(authority.store?.state)||!Number.isFinite(Date.parse(authority.server_time))))throw Error('Current checkout policy is unavailable.');
  referenceClock=authority?Date.parse(authority.server_time):0;clockRead=Date.now();
  if(authority&&effectiveStore(next,referenceClock).state!==authority.store.state)throw Error('Current checkout policy does not match the configuration.');
  store=next;posts=nextPosts;render();await loadAudit();
 };
 by('ops-audit-filter')?.addEventListener('change',()=>loadAudit());
 by('ops-audit-more')?.addEventListener('click',()=>loadAudit(false));
 async function act(action,message,feedback=say){if(busy)return;busy=true;const disabled=[...d.querySelectorAll('#store-form button,#news-form button')].filter(b=>!b.disabled);disabled.forEach(b=>b.disabled=true);feedback('Saving…','loading');try{const result=await action();await refresh();feedback(message,'success');return result;}catch(error){feedback(error.message+' Reload current state before retrying if another Admin changed it.','error');}finally{busy=false;disabled.forEach(b=>b.disabled=false);}}
 function updateSchedule(){const mode=field(storeForm,'mode').value;field(storeForm,'pause_from').disabled=mode!=='schedule';field(storeForm,'pause_from').required=!field(storeForm,'pause_from').disabled;field(storeForm,'resume_at').disabled=field(storeForm,'resume_mode').value!=='scheduled';field(storeForm,'resume_at').required=!field(storeForm,'resume_at').disabled;
 for(const b of storeForm.querySelectorAll('[data-ops-action]'))b.setAttribute('aria-pressed',String(b.dataset.opsAction===mode));
 field(storeForm,'pause').textContent=mode==='schedule'?'Review scheduled closure':mode==='edit'?'Review changes':'Review pause';
 }
 storeForm.addEventListener('change',event=>{if(event.target===field(storeForm,'preset')){const preset=operationPresets[event.target.value];field(storeForm,'customer_title').value=preset.title;field(storeForm,'customer_message').value=preset.message;}updateSchedule();preview();});
 storeForm.addEventListener('input',preview);
 for(const b of storeForm.querySelectorAll('[data-ops-action]'))b.addEventListener('click',()=>{field(storeForm,'mode').value=b.dataset.opsAction;updateSchedule();preview();});
 storeForm.addEventListener('submit',event=>{event.preventDefault();if(!store||busy||!storeForm.checkValidity())return;try{const mode=field(storeForm,'mode').value,pause=mode==='schedule'?ukInputToISO(field(storeForm,'pause_from').value):null,resume=field(storeForm,'resume_mode').value==='scheduled'?ukInputToISO(field(storeForm,'resume_at').value):null;
  const start=mode==='schedule'?Date.parse(pause):mode==='edit'?Date.parse(store.pause_from):activeClock();if(mode==='edit'&&!configured())throw Error('No existing pause to keep.');if(mode==='schedule'&&start<=activeClock())throw Error('Scheduled pause must be in the future.');if(resume&&Date.parse(resume)<=Math.max(start,activeClock()))throw Error('Resume must be after the pause starts.');
  if(!confirm('Confirm '+(mode==='schedule'?'scheduled pause at '+ukDate(pause):mode==='edit'?'changes to the existing pause':'pause now')+(resume?' until '+ukDate(resume):' until manual resume')+' (UK time)? New checkout will be blocked; existing orders continue.'))return;
  act(()=>repo.saveStore({desired_state:'ORDERS_PAUSED',mode,pause_from:pause,resume_at:resume,expected_updated_at:store.updated_at,...Object.fromEntries(['customer_title','customer_message'].map(k=>[k,field(storeForm,k).value.trim()])),internal_reason:writePreset(field(storeForm,'preset').value,field(storeForm,'internal_reason').value.trim())}),'Store configuration saved.');
 }catch(error){say(error.message,'error');}});
 field(storeForm,'resume').addEventListener('click',()=>{if(configured()&&!busy&&confirm(Date.parse(store.pause_from)>activeClock()?'Cancel the scheduled closure? Ordering will remain open.':'Resume new orders now and clear the reopening schedule?'))act(()=>repo.saveStore({desired_state:'OPEN',expected_updated_at:store.updated_at,internal_reason:readPreset(store.internal_reason).reason}),'Orders are open. Schedule cleared.');});
 field(storeForm,'reload').addEventListener('click',()=>{if(!busy&&(formBaseline===formState()||confirm('Discard unsaved store changes and refresh?')))refresh().then(()=>say('Current state reloaded.')).catch(e=>say(e.message,'error'));});
 d.querySelector('#new-post').addEventListener('click',()=>selection());
 d.querySelector('#preview-post').addEventListener('click',()=>{const preview=d.querySelector('#news-preview');preview.innerHTML=renderNewsBody(field(newsForm,'body').value);preview.hidden=false;});
 newsForm.addEventListener('submit',async event=>{event.preventDefault();if(busy){newsSay('Saving… Wait for the current action to finish.','loading');return;}if(!newsForm.checkValidity()){invalidNews();return;}try{const state=event.submitter?.value||'DRAFT',post=Object.fromEntries(['slug','title','excerpt','body','category','cta_label','cta_url'].map(k=>[k,field(newsForm,k).value.trim()]));if(post.cta_url&&!safeHref(post.cta_url))throw Error('CTA must use a safe /site/path or https:// URL.');if(!!post.cta_url!==!!post.cta_label)throw Error('Provide both CTA label and URL, or leave both blank.');
  post.publication_at=state==='PUBLISHED'?selected?.publication_at||null:ukInputToISO(field(newsForm,'publication_at').value);post.expires_at=ukInputToISO(field(newsForm,'expires_at').value);if(state==='SCHEDULED'&&(!post.publication_at||Date.parse(post.publication_at)<=Date.now()))throw Error('Choose a future UK publication time.');const publication=state==='PUBLISHED'?Math.min(Date.parse(selected?.publication_at)||Date.now(),Date.now()):Date.parse(post.publication_at);if(post.expires_at&&(!Number.isFinite(publication)||Date.parse(post.expires_at)<=publication))throw Error('Expiry must be after publication.');
  Object.assign(post,{status:state,announcement:field(newsForm,'announcement').checked,dismissible:field(newsForm,'dismissible').checked,priority:Number(field(newsForm,'priority').value),...selected?{id:selected.id,expected_updated_at:selected.updated_at}:{}});
  if(!Number.isInteger(post.priority)||post.priority<0||post.priority>100)throw Error('Announcement priority must be a whole number from 0 to 100.');
  if(!confirm('Confirm '+state.toLowerCase()+' for “'+post.title+'”?'+(['PUBLISHED','SCHEDULED'].includes(state)?' Effective posts are public; Pages refresh may take several minutes.':''))){newsSay('News action cancelled. Nothing was saved.');return;}
  const result=await act(()=>repo.savePost(post),'News saved: '+state+'.',newsSay);if(result)selection(result);
 }catch(error){newsSay(error.message,'error');}});
 selection();say('Loading current Operations and notices…','loading');const ready=refresh().then(()=>say('Operations ready.','success')).catch(e=>say(e.message,'error'));return {ready,refresh};
}
if(typeof document!=='undefined'&&!document.body.hasAttribute('data-overseer-fixture')&&document.querySelector('#store-form'))bootOperationsAdmin();
