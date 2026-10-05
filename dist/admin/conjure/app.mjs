import {createCMSRepository} from '../hub-cms/repository.mjs';
import {pageLibrary,pageRoute,renderPage} from './pages.mjs';

// Authentication is owned by admin-gate; importing this entry does not bypass it.
export async function bootConjure({document=globalThis.document,repository=createCMSRepository(),request=globalThis.fetch,adapter=null}={}){
 const q=s=>document.querySelector(s),frame=q('iframe'),status=q('[data-status]'),picker=q('[data-page]');
 const articles=await repository.list(),pages=pageLibrary(articles),sessions=new Map();let current=null,active=null,serial=0;
 const message=value=>{status.textContent=value;};
 for(const page of pages){const option=document.createElement('option');option.value=page.path;option.textContent=page.title;picker.append(option);}
 const guard=()=>{if(!active?.pending)return true;message('Apply or cancel the text edit before navigating.');return false;};
 async function navigate(value){if(!guard())return false;const path=pageRoute(value),page=pages.find(p=>p.path===path)||{path,title:path,authority:'static',editable:false};const ticket=++serial;message('Opening page…');
  const result=await renderPage(page,{request,document,articles});if(ticket!==serial)return false;
  active?.detach?.();current=page;picker.value=path;q('[data-page-title]').textContent=page.title;q('[data-support]').textContent=page.editable?'Select supported content on the page. Changes save as a private draft.':'Website preview · this page is read only. Interactive tools and commerce actions are disabled.';
  q('[data-actions]').hidden=true;q('[data-section-fields]').hidden=true;
  await new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});frame.srcdoc=result.html;});if(ticket!==serial)return false;
  const canvas=frame.contentDocument;canvas.addEventListener('submit',e=>e.preventDefault(),true);
  canvas.addEventListener('click',event=>{const a=event.target.closest?.('a');if(!a||a.closest('[data-block]'))return;event.preventDefault();try{navigate(new URL(a.getAttribute('href'),canvas.baseURI).href).catch(e=>message(e.message));}catch(e){message(e.message);}},true);
  active=null;if(page.editable&&adapter){active=sessions.get(page.article.id)||await adapter.create(page,result.presentation,{document,repository,message,refresh});sessions.set(page.article.id,active);await active.attach(canvas);}
  refresh();return true;
 }
 function refresh(){const enabled=!!active&&q('[data-edit]').checked;active?.setEditing?.(enabled);frame.style.width=q('[data-view]').value==='mobile'?'390px':'100%';frame.style.maxWidth='100%';active?.setBreakpoint?.(q('[data-view]').value);q('[data-undo]').disabled=!enabled||!active.past;q('[data-redo]').disabled=!enabled||!active.future;q('[data-save]').disabled=!active||!active.dirty||active.saving||active.pending;message(active?.status||'Website preview · no editable changes.');}
 picker.addEventListener('change',()=>navigate(picker.value).catch(e=>message(e.message)));
 q('[data-edit]').addEventListener('change',refresh);q('[data-view]').addEventListener('change',refresh);
 q('[data-undo]').addEventListener('click',()=>{active?.undo();refresh();});q('[data-redo]').addEventListener('click',()=>{active?.redo();refresh();});
 q('[data-save]').addEventListener('click',async()=>{try{await active?.save();}catch(e){message(e.message);}refresh();});
 const dirty=()=>[...sessions.values()].some(s=>s.dirty||s.pending);
 document.defaultView.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
 q('[data-conjure-exit]').addEventListener('click',event=>{if(dirty()&&!document.defaultView.confirm('Leave Conjure with unsaved drafts?'))event.preventDefault();});
 await navigate(new URL(document.defaultView.location.href).searchParams.get('page')||'/');
 return {navigate,refresh,get current(){return current;},get active(){return active;},sessions};
}
if(globalThis.document?.querySelector('[data-conjure-app]'))bootConjure().catch(error=>{document.querySelector('[data-status]').textContent=error.message;});
