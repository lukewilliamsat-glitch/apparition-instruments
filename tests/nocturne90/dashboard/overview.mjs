import {createArmouryRepository} from './ironclad/repository.mjs?build=ascent78b-v1';
import {boundedJSON} from './command/bounded-json.mjs?build=sentinel77a-c1';
import {productionTransport} from './quartermaster/workshop.mjs?build=nocturne89-nexus';
import {publicBackendConfig} from '../backend/public-config.mjs?build=sentinel77a-c1';
import {financeRepository} from './omniscience/repository.mjs';
import {collectPeriod} from './omniscience/dashboard.mjs?build=nocturne90-dashboard';
import {reportRange,report} from './omniscience/model.mjs';
import {breakdown, element, heading, metrics} from './nocturne-ui.mjs?build=nocturne90';

const packing='/admin/quartermaster/?section=queue';
const finance='/admin/omniscience/';
const purchases='/admin/ironclad/?view=purchases';
const stock='/admin/ironclad/?view=inventory&status=low';
const activity='/admin/quartermaster/?section=activity';
const events={receipt:'Packaging received',reservation:'Packaging reserved',release:'Reservation released',
 adjustment:'Inventory corrected',pack:'Pack completed',postage:'Postage recorded',finance:'Workshop costs approved'};
const eventTime=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'});

function value(n) {return Number.isSafeInteger(n)&&n>=0?String(n):'Unavailable';}
function link(document,label,href) {
 const a=element(document,'a',label,'nocturne-quick-link');
 a.href=href;return a;
}

export function purchaseCount(orders,partial) {
 if(![orders,partial].every(a=>Array.isArray(a)&&a.length<=25))throw Error('Purchase results are unavailable.');
 const amount=orders.length+partial.length;
 return amount+(orders.length===25||partial.length===25?'+':'');
}

function sources(auth) {
 const armoury=createArmouryRepository({auth}), financial=financeRepository({auth});
 const workshop=productionTransport({backend:publicBackendConfig,auth,boundedJSON});
 return {
  workshop:signal=>workshop('hq',{p_section:'overview'},signal),
  purchasing:async signal=>purchaseCount(...await Promise.all([
   armoury.read('purchases',{status:'ordered',limit:25},signal),
   armoury.read('purchases',{status:'partial',limit:25},signal)
  ])),
  stock:async signal=>{
   const list=await armoury.read('inventory',{status:'low',limit:25},signal);
   if(!Array.isArray(list)||list.length>25)throw Error('Stock status is unavailable.');
   return list.length+(list.length===25?'+':'');
  },
  sales:signal=>collectPeriod(financial.orders,reportRange('month'),signal)
 };
}

export function mountAdminWorkspace({document:d=globalThis.document,auth,reads}={}) {
 const root=d.getElementById('overview-content'),status=d.getElementById('overview-status');
 if(!root||!status)return null;
 const controller=new AbortController();
 const panel=element(d,'section',null,'nocturne-panel');
 const {header,actions}=heading(d,'COMMAND','Business overview','Month-to-date sales and the current workshop queue');
 actions.append(link(d,'Open Orders','/admin/orders/'),link(d,'Business financials',finance));
 const workspace=element(d,'div');
 const purchasingPanel=element(d,'div');
 const salesPanel=element(d,'div');
 const recent=element(d,'div');
 panel.append(header,workspace,purchasingPanel,salesPanel,recent);
 root.replaceChildren(panel);
 status.textContent='Checking business activity…';
 const load=reads||sources(auth);
 const state={};
 const label=(key)=>Object.hasOwn(state,key)?state[key]??'Unavailable':'Checking…';
 const loadState=(key,onValue,onError)=>{
  Promise.resolve().then(()=>load[key](controller.signal)).then(value=>{
   if(!controller.signal.aborted)onValue(value);
  }).catch(()=>{
   if(!controller.signal.aborted)onError();
  }).finally(()=>{
   if(!controller.signal.aborted&&Object.keys(state).length===4) {
    status.textContent=Object.values(state).some(item=>item===null)?'Some data is unavailable to this session.':'';
   }
  });
 };
 function drawStock(){
  const metricsBox=metrics(d,'Purchasing and stock',[
   ['Purchases awaiting receipt',label('purchasing'),'Ordered and partially received'],
   ['Low-stock components',label('stock'),'At or below the reorder threshold']
  ]);
  const rail=element(d,'div',null,'nocturne-actions');
  rail.append(link(d,'Receive a purchase',purchases),link(d,'Review low stock',stock));
  purchasingPanel.replaceChildren(metricsBox,rail);
 }
 drawStock();
 workspace.append(element(d,'p','Checking the workshop queue…','nocturne-status'));
 salesPanel.append(element(d,'p','Checking sales and financial records…','nocturne-status'));
 loadState('purchasing',data=>{state.purchasing=data;drawStock();},()=>{state.purchasing=null;drawStock();});
 loadState('stock',data=>{state.stock=data;drawStock();},()=>{state.stock=null;drawStock();});
 loadState('workshop',data=>{
  if(data?.schema!==1 || !data.totals || !Array.isArray(data.rows) || data.rows.length>5) throw Error('Unexpected workshop overview.');
  state.workshop=true;
  const {awaiting,packing:inProgress,packed,low}=data.totals;
  const open=[awaiting,inProgress,packed].every(Number.isSafeInteger)?awaiting+inProgress+packed:null;
  const openQueue=element(d,'div',null,'nocturne-actions');
  openQueue.append(link(d,'Open packing queue',packing));
  workspace.replaceChildren(metrics(d,'Workshop',[
   ['Open workshop orders',value(open),'Eligible paid orders'],
   ['Awaiting packing',value(awaiting)],
   ['Packed, awaiting dispatch',value(packed)],
   ['Low packaging stock',value(low),'At or below the reorder threshold']
  ]),openQueue);
  const entries=data.rows.filter(row=>events[row.kind]&&!Number.isNaN(Date.parse(row.happened)))
   .map(row=>[events[row.kind],eventTime.format(new Date(row.happened))]);
  recent.replaceChildren(entries.length?breakdown(d,'Recent workshop activity',entries):element(d,'p','No workshop activity recorded.','nocturne-status'),
   link(d,'All workshop activity',activity));
 },()=>{state.workshop=null;workspace.replaceChildren(element(d,'p','Workshop activity is unavailable to this session.','nocturne-status'));});
 loadState('sales',data=>{
  if(!data.complete){
   state.sales=null;
   salesPanel.replaceChildren(element(d,'p','Month-to-date sales exceed the dashboard limit. Select a shorter period in Business financials.','nocturne-status'));
   return;
  }
  const stats=report(data.rows);
  const verified=stats.totals.reduce((n,g)=>n+g.recorded,0);
  state.sales=true;
  const groups=stats.totals.map(g=>['Gross buyer payments · '+g.currency,
   new Intl.NumberFormat('en-GB',{style:'currency',currency:g.currency}).format(g.buyerPaid/100),'Month to date']);
  salesPanel.replaceChildren(metrics(d,'Sales',[
   ...groups, ['Paid orders',String(stats.detail.length),'Month to date'],
   ['Financial records to review',String(stats.detail.length-verified),'Month-to-date orders with incomplete evidence']
  ]),link(d,'Review financial records',finance));
 },()=>{state.sales=null;salesPanel.replaceChildren(element(d,'p','Sales and financial review data are unavailable.','nocturne-status'));});
 const dispose=()=>{controller.abort();root.replaceChildren();status.textContent='';};
 return {lock:dispose,destroy:dispose};
}
