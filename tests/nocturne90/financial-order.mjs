import {createAdminAuth} from '../admin-auth.mjs?build=sentinel77a-c1';
import {boundedJSON} from '../command/bounded-json.mjs?build=sentinel77a-c1';
import {productionTransport} from '../quartermaster/workshop.mjs?build=nocturne89-nexus';
import {publicBackendConfig} from '../../backend/public-config.mjs?build=sentinel77a-c1';
import {mountProfitability} from './profitability.mjs?build=nocturne90';
import {createArmouryRepository} from '../ironclad/repository.mjs?build=ascent78b-v1';
import {financeActivation} from './finance-activation.mjs?build=sentinel77a-c1';
import {financeDraft,mountFinanceWorkbench} from './finance-ui.mjs?build=sentinel77a-c1';
import {createFinancialRepository,createFinancialSession} from './financial-record.mjs?build=sentinel77a-c1';
import {mountEclipse} from './eclipse-ui.mjs?build=ascent78b-v1';
import {withTrustedFacts} from './eclipse-model.mjs?build=sentinel77a-c1';
import {createEclipseLibraryRepository} from './eclipse-repository.mjs?build=sentinel77a-c1';
const sessions=new WeakMap();
const evidenceHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function financialPersistenceAccess(activation,order){
 if(activation?.enabled!==true&&activation?.controlledOrderId!==order?.id)return false;
 const controlled=activation.enabled!==true;
 if(controlled&&(order.id!=='3db324c2-4f60-45b6-b78c-29a3eceeb826'||order.reference!=='AI-010019'||order.channel!=='DIRECT'||order.externalReference!=='Test Order Reference'))throw Error('Controlled financial test order identity does not match.');
 if(!evidenceHash(activation.backendEvidenceSHA256)||(!controlled&&!evidenceHash(activation.livePersistenceEvidenceSHA256))||(controlled&&activation.livePersistenceEvidenceSHA256!==null))throw Error('Financial activation evidence is incomplete.');
 return controlled?'controlled':'active';
}
export function mountFinancialOrder({root,order,document:d=globalThis.document,activation=financeActivation,repository,historicalCosts,workshop}={}){
 const access=financialPersistenceAccess(activation,order);
 if(!access)return mountFinanceWorkbench({root,order,document:d});
 if(order.channel==='WEBSITE'&&(!order.paidAt||!order.providerBacked||!['paid','partially_refunded','refunded'].includes(order.paymentStatus)))return null;
 const prior=sessions.get(root),items=JSON.stringify(order.items);
 const basis=JSON.stringify([order.items,order.pricing,order.refundedPence,order.paidAt,order.paymentStatus]);
 if(prior&&prior.orderId===order.id){if(!prior.host.isConnected)root.append(prior.host);if(prior.sourceBasis!==basis)prior.markStale();return prior;}
 prior?.dispose();
 const readAcquisition=historicalCosts|| (signal=>createArmouryRepository().readCosts(order.id,signal));
 const readWorkshop=workshop || productionTransport({backend:publicBackendConfig,auth:createAdminAuth(),boundedJSON});

 const node=(tag,text)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const host=node('section'),message=node('p','Loading financial record…'),actions=node('div'),reload=node('button','Reload saved record'),reconcile=node('button','Check original save receipt'),history=node('details'),historyBody=node('ol'),content=node('div');
 host.className='finance-record';host.dataset.financialRecord='';if(access==='controlled')host.append(node('p','Controlled acceptance: AI-010019 only. All entered financial values are internal test evidence. General financial saving remains disabled.'));message.setAttribute('role','status');message.setAttribute('aria-live','polite');history.append(node('summary','Financial revision history'),historyBody);for(const b of [reload,reconcile])b.type='button';actions.append(reload,reconcile);host.append(message,actions,history,content);root.append(host);
 let view=null,disposed=false,valid=false,lastRevision=-1,stale=false,session,mounting=false;
 const beforeUnload=e=>{if(session?.snapshot().dirty||session?.snapshot().status==='uncertain'||view?.hasUnresolvedApproval?.()){e.preventDefault();e.returnValue='';}};
 const update=s=>{
  if(disposed||mounting)return;
  message.textContent=s.message;host.dataset.state=s.status;
  reload.disabled=!!view?.working||['loading','saving','uncertain'].includes(s.status);reconcile.hidden=s.status!=='uncertain';reconcile.disabled=!s.canReconcile;
  if(s.record&&lastRevision!==s.record.revision&&!['saving','uncertain'].includes(s.status)){
   view?.dispose();lastRevision=s.record.revision;
   showView('summary',s.draft);
   historyBody.replaceChildren();for(const revision of s.record.history||[]){historyBody.append(node('li','Revision '+revision.revision+' · '+revision.recorded_at+' · '+revision.actor_id));}
  }
  s=session.snapshot();
  const locked=stale||['loading','saving','uncertain','expired','denied','unavailable'].includes(s.status);
  if(view?.setSession){view.setSession(s,locked||s.status==='conflict');view.panel.dataset.financialRevision=String(s.record?.revision??0);return;}
  if(view){for(const c of content.querySelectorAll('input,select,button')){if(c.matches('[data-finance-save]'))c.disabled=!s.canSave||!valid||stale;else if(c.matches('[data-eclipse-advanced],[data-eclipse-back]'))c.disabled=locked||!valid;else if(c.matches('[data-finance-load-costs]')){c.disabled=locked||c.dataset.financeUsed==='true';}else c.disabled=locked;}view.panel.dataset.financialRevision=String(s.record?.revision??0);}
 };
 function showView(kind,initialDocument,focus=false){
  view?.dispose();mounting=true;
  const persistence={
   save:()=>session.save(),
   reload:()=>session.load(),
   update(value,isValid){valid=isValid;session.edit(value);},
   onWork(working){reload.disabled=working||['loading','saving','uncertain'].includes(session.snapshot().status);}
  };
  try{
   if(kind==='summary'){
    view=mountProfitability({root:content,order,document:d,initialDocument,persistence,
     historicalCosts:readAcquisition,workshop:readWorkshop,
     details(){if(!view.working)showView('details',view.draft(),true);}});
    if(focus)view.panel.querySelector('button')?.focus();
   }else{
    const back=node('button',kind==='advanced'?'Back to Financial details':'Back to order profitability');back.type='button';back.dataset.eclipseBack='';
    back.addEventListener('click',()=>{if(valid)showView(kind==='advanced'?'details':'summary',session.snapshot().draft,true);});
    content.append(back);
    if(kind==='advanced'){
     const w=mountFinanceWorkbench({root:content,order,document:d,initialDocument,persistence,allowWebsite:true,eclipse:true});
     w.panel.open=true;view={panel:w.panel,dispose(){w.dispose();back.remove();}};
    }else{
     const w=mountEclipse({root:content,order,document:d,initialDocument,persistence,libraryRepository:createEclipseLibraryRepository(),
      historicalCosts:readAcquisition,
      advanced(){if(valid)showView('advanced',session.snapshot().draft,true);}});
     view={panel:w.panel,dispose(){w.dispose();back.remove();}};
    }
    if(focus)back.focus();
   }
  }finally{mounting=false;}
  if(focus)update(session.snapshot());
 }
 session=createFinancialSession({orderId:order.id,initialDraft:withTrustedFacts(financeDraft(order),order),repository:repository||createFinancialRepository(),onChange:update});
 const reloadSaved=async()=>{if(view?.working)return;const s=session.snapshot();if(s.dirty&&!d.defaultView.confirm('Discard local financial inputs and reload the saved record?'))return;lastRevision=-1;await session.load({discard:true});};
 reload.addEventListener('click',reloadSaved);reconcile.addEventListener('click',()=>session.reconcile());
 const dispose=()=>{if(disposed)return;disposed=true;session.dispose();view?.dispose();host.remove();sessions.delete(root);d.removeEventListener('admin:conceal',dispose);d.defaultView.removeEventListener('beforeunload',beforeUnload);};
 d.addEventListener('admin:conceal',dispose,{once:true});d.defaultView.addEventListener('beforeunload',beforeUnload);
 const result={host,orderId:order.id,sourceItems:items,dispose,session,markStale(){stale=true;message.textContent='The original sold items changed. Your local financial draft is retained. Download it, then reopen this order to review the new basis.';for(const b of content.querySelectorAll('button'))if(!b.matches('[data-finance-download]'))b.disabled=true;reload.disabled=true;}};
 sessions.set(root,result);void session.load();return result;
}
