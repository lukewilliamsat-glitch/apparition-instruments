import {financeActivation} from './finance-activation.mjs?build=84079ed8ddb6abc6ed134bc4bc3a163da155cde4';
import {financeDraft,mountFinanceWorkbench} from './finance-ui.mjs?build=b4d7e3708e1cd0153e922122fa2400f0c46d9ce7';
import {createFinancialRepository,createFinancialSession} from './financial-record.mjs?build=b4d7e3708e1cd0153e922122fa2400f0c46d9ce7';
const sessions=new WeakMap();
export function mountFinancialOrder({root,order,document:d=globalThis.document,activation=financeActivation,repository}={}){
 if(!activation.enabled)return mountFinanceWorkbench({root,order,document:d});
 if(!activation.backendEvidenceSHA256||!activation.livePersistenceEvidenceSHA256)throw Error('Financial activation evidence is incomplete.');
 if(order.channel==='WEBSITE')return null;
 const prior=sessions.get(root),items=JSON.stringify(order.items);
 if(prior&&prior.orderId===order.id){if(!prior.host.isConnected)root.append(prior.host);if(prior.sourceItems!==items)prior.markStale();return prior;}
 prior?.dispose();
 const node=(tag,text)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const host=node('section'),message=node('p','Loading financial record…'),actions=node('div'),reload=node('button','Reload saved record'),reconcile=node('button','Check original save receipt'),history=node('details'),historyBody=node('ol'),content=node('div');
 host.className='finance-record';host.dataset.financialRecord='';message.setAttribute('role','status');message.setAttribute('aria-live','polite');history.append(node('summary','Financial revision history'),historyBody);for(const b of [reload,reconcile])b.type='button';actions.append(reload,reconcile);host.append(message,actions,history,content);root.append(host);
 let view=null,disposed=false,valid=false,lastRevision=-1,stale=false,session;
 const beforeUnload=e=>{if(session?.snapshot().dirty||session?.snapshot().status==='uncertain'){e.preventDefault();e.returnValue='';}};
 const update=s=>{
  if(disposed)return;
  message.textContent=s.message;host.dataset.state=s.status;
  reload.disabled=['loading','saving','uncertain'].includes(s.status);reconcile.hidden=s.status!=='uncertain';reconcile.disabled=!s.canReconcile;
  if(s.record&&lastRevision!==s.record.revision&&!['saving','uncertain','conflict'].includes(s.status)){
   view?.dispose();lastRevision=s.record.revision;
   view=mountFinanceWorkbench({root:content,order,document:d,initialDocument:s.draft,persistence:{save:()=>session.save(),update(value,isValid){valid=isValid;session.edit(value);}}});
   view.panel.open=true;
   historyBody.replaceChildren();for(const revision of s.record.history||[]){historyBody.append(node('li','Revision '+revision.revision+' · '+revision.recorded_at+' · '+revision.actor_id));}
  }
  const locked=stale||['loading','saving','uncertain','expired','denied','unavailable'].includes(s.status);
  if(view){for(const c of content.querySelectorAll('input,select,button')){if(c.matches('[data-finance-save]'))c.disabled=!s.canSave||!valid||stale;else if(c.matches('[data-finance-load-costs]')){c.disabled=locked||c.dataset.financeUsed==='true';}else c.disabled=locked;}view.panel.dataset.financialRevision=String(s.record?.revision??0);}
 };
 session=createFinancialSession({orderId:order.id,initialDraft:financeDraft(order),repository:repository||createFinancialRepository(),onChange:update});
 const reloadSaved=async()=>{const s=session.snapshot();if(s.dirty&&!d.defaultView.confirm('Discard local financial inputs and reload the saved record?'))return;lastRevision=-1;await session.load({discard:true});};
 reload.addEventListener('click',reloadSaved);reconcile.addEventListener('click',()=>session.reconcile());
 const dispose=()=>{if(disposed)return;disposed=true;session.dispose();view?.dispose();host.remove();sessions.delete(root);d.removeEventListener('admin:conceal',dispose);d.defaultView.removeEventListener('beforeunload',beforeUnload);};
 d.addEventListener('admin:conceal',dispose,{once:true});d.defaultView.addEventListener('beforeunload',beforeUnload);
 const result={host,orderId:order.id,sourceItems:items,dispose,session,markStale(){stale=true;message.textContent='The original sold items changed. Your local financial draft is retained. Download it, then reopen this order to review the new basis.';for(const b of content.querySelectorAll('button'))if(!b.matches('[data-finance-download]'))b.disabled=true;reload.disabled=true;}};
 sessions.set(root,result);void session.load();return result;
}
