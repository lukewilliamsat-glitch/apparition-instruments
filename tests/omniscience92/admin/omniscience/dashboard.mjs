import {action, breakdown, element, heading, metrics} from '../nocturne-ui.mjs?build=nocturne90';
import {channels, maximumOrders, rowsPerPage, validateRange} from './model.mjs';

const day = 86400000;
const asISO = ms => new Date(ms).toISOString().slice(0,10);
const currency = (value, code='GBP') => value == null ? 'Unknown'
 : new Intl.NumberFormat('en-GB',{style:'currency',currency:code}).format(value/100);

export function previousPeriod({from,to}) {
 validateRange(from,to);
 const start=Date.parse(from), end=Date.parse(to);
 return {from:asISO(start-(end-start+day)),to:asISO(start-day)};
}

export async function collectPeriod(fetchPage, range, signal, limit=maximumOrders) {
 const rows=[], seen=new Set();
 let cursor=null;
 do {
  const page=await fetchPage(range,cursor,signal);
  signal.throwIfAborted();
  if(!Array.isArray(page?.rows)||page.rows.length>rowsPerPage||rows.length+page.rows.length>limit)
   throw Error('The reporting page exceeds the permitted limit.');
  if(page.next && (!page.rows.length || page.next.id===cursor?.id || page.next.id!==page.rows.at(-1).id))
   throw Error('The reporting cursor changed. Load the period again.');
  for(const row of page.rows) {
   if(seen.has(row.id))throw Error('Records changed while loading. Load the period again.');
   seen.add(row.id);
   rows.push(row);
  }
  cursor=page.next || null;
 } while(cursor && rows.length<limit);
 return {rows,complete:cursor===null};
}

export function recordedSpend(outlays) {
 const totals={overhead:0,business:0,director:0};
 for(const row of outlays) {
  if(!Number.isSafeInteger(row.sterling_minor)||row.sterling_minor<0||!['business','director'].includes(row.funding))
   throw Error('An expense contains an invalid recorded amount or funding source.');
  if(row.treatment==='overhead') totals.overhead+=row.sterling_minor;
  totals[row.funding]+=row.sterling_minor;
 }
 return totals;
}

export function revenueTrend(rows, {from,to}) {
 const months=(Date.parse(to)-Date.parse(from))/day>75;
 const groups=new Map();
 for(const row of rows) {
  const date=months?row.day.slice(0,7):asISO(Date.parse(from)+Math.floor((Date.parse(row.day)-Date.parse(from))/(7*day))*7*day);
  const key=row.currency+':'+date;
  const group=groups.get(key)??{code:row.currency,date,total:0};
  group.total+=row.total;
  groups.set(key,group);
 }
 const label=new Intl.DateTimeFormat('en-GB',months?{timeZone:'UTC',month:'short',year:'numeric'}:{timeZone:'UTC',day:'numeric',month:'short'});
 return [...groups.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(row=>({
  code:row.code, total:row.total, name:(months?'':'Week from ')+label.format(new Date(row.date+(months?'-01':'')+'T00:00:00Z'))
 }));
}

function chart(document,title,rows,code) {
 const section=element(document,'section',null,'nocturne-breakdown');
 const list=element(document,'ul',null,'nocturne-chart');
 const max=Math.max(1,...rows.map(r=>r.total));
 section.append(element(document,'h3',title),list);
 for(const row of rows) {
  const li=element(document,'li');
  const values=element(document,'div');
  values.append(element(document,'span',row.name),element(document,'strong',currency(row.total,code)));
  const bar=element(document,'meter');
  bar.min=0;bar.max=max;bar.value=row.total;bar.setAttribute('aria-hidden','true');
  li.append(values,bar);list.append(li);
 }
 return section;
}

export function financialDashboard(document,{report, range, outlays, compare, previous, compareText}) {
 const panel=element(document,'section',null,'nocturne-panel');
 const {header,actions}=heading(document,'OMNISCIENCE','Period overview',range.from+' to '+range.to+' · UK reporting dates');
 if(compare)actions.append(action(document,'Compare previous period',compare));
 panel.append(header);
 if(compareText)panel.append(element(document,'p',compareText,'nocturne-status'));
 const spend=recordedSpend(outlays);
 const sales=report.detail.length, verified=report.totals.reduce((n,g)=>n+g.recorded,0);
 panel.append(metrics(document,'Period scope',[
  ['Paid orders',String(sales),'Includes recorded refunds'],
  ['Financial records to review',String(sales-verified),'Missing, estimated or unresolved evidence'],
  ['Recorded overheads',currency(spend.overhead),'Excludes stock and linked expenses'],
  ['Business-paid spend',currency(spend.business),'Registered business-paid purchases and expenses'],
  ['Director-paid spend',currency(spend.director),'Recorded separately from business expenditure']
 ]));
 const trend=revenueTrend(report.detail,range);
 for(const group of report.totals) {
  const code=group.currency, previousGroup=previous?.totals.find(row=>row.currency===code);
  const measured=group.recorded>0, coverage=group.recorded + ' of '+ group.orders+' orders verified';
  const earlier=previousGroup?currency(previousGroup.buyerPaid,code)+' in the previous period':previous?'No orders in this currency in the previous period':'';
  const account=element(document,'div',null,'nocturne-columns');
  panel.append(metrics(document,'Sales and earnings in '+code,[
    ['Gross buyer payments',currency(group.buyerPaid,code),earlier],
    ['Recorded refunds',currency(group.actualRefund,code)],
    ['Verified contribution',currency(measured?group.contribution:null,code),coverage],
    ['Contribution margin',group.margin==null?'Unknown':group.margin.toFixed(2)+'%',coverage]
  ]),account);
  account.append(
   breakdown(document,'Verified costs · '+code,[
    ['Component acquisition',currency(measured?group.cogs:null,code),coverage],
    ['Fulfilment',currency(measured?group.shipping+group.packaging:null,code),coverage],
    ['Selling and payment fees',currency(measured?group.fees:null,code),coverage],
    ['Net seller revenue',currency(measured?group.sellerRevenue:null,code),coverage]
   ]),
   chart(document,'Sales by channel · '+code,report.channels.filter(row=>row.currency===code).map(row=>({
    name:channels[row.key.split(':')[0]],total:row.buyerPaid
   })),code),
   chart(document,'Gross payment trend · '+code,trend.filter(row=>row.code===code),code)
  );
 }
 if(!sales)panel.append(element(document,'p','No paid orders in this period.','nocturne-status'));
 return panel;
}
