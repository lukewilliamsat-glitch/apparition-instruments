import {report,validateRange} from './admin/omniscience/model.mjs';
import {recordedSpend} from './admin/omniscience/dashboard.mjs';
import {roundRatio} from './admin/orders/economics.mjs';

const groupMaps=()=>({totals:new Map(),channels:new Map(),products:new Map()});
const integer=n=>Number.isSafeInteger(n);
export async function aggregatePeriod({from,to},read,signal) {
 validateRange(from,to);
 const start=await read('scope',{p_from:from,p_to:to},signal);
 if(!/^[a-f0-9]{32}$/.test(start.revision)||!integer(start.orders)||!integer(start.outlays)||
   start.orders<0||start.outlays<0||start.orders>10000||start.outlays>10000)throw Error('Invalid reporting scope.');
 const maps=groupMaps(),spend={overhead:0,business:0,director:0},trends=new Map();
 let orders=0,outlays=0;
 async function collect(kind,consume) {
  let cursor=null,count=0;
  do {
   signal.throwIfAborted();
   const page=await read(kind,{p_from:from,p_to:to,p_cursor_day:cursor?.day??null,p_cursor_id:cursor?.id??null},signal);
   if(!Array.isArray(page.rows)||page.rows.length>100)throw Error('Invalid report page.');
   const expected=start[kind];
   if(count+page.rows.length>expected||page.next&&(!page.rows.length||page.next.id!==page.rows.at(-1).id||
      page.next.day!==page.rows.at(-1).day))throw Error('Reporting scope changed. Load the period again.');
   if(cursor&&page.rows.some(row=>row.day>cursor.day||row.day===cursor.day&&row.id>=cursor.id))
    throw Error('Reporting cursor changed.');
   consume(page.rows);
   count+=page.rows.length;
   cursor=page.next;
   if(cursor&&count>=expected)throw Error('Reporting count changed.');
  }while(cursor);
  if(count!==start[kind])throw Error('Reporting scope changed. Load the period again.');
  return count;
 }
 function mergeGroups(target,groups) {
  for(const group of groups){
   const prior=target.get(group.key);
   if(!prior){target.set(group.key,{...group});continue;}
   for(const [key,value]of Object.entries(group)){
    if(typeof value==='number'&&key!=='margin')prior[key]+=value;
   }
  }
 }
 orders=await collect('orders',rows=>{
  for(const row of rows)if(row.day<from||row.day>to)throw Error('Report row is outside its period.');
  const page=report(rows);
  mergeGroups(maps.totals,page.totals);mergeGroups(maps.channels,page.channels);
  for(const product of page.products){
   const key=product.key;
   const prior=maps.products.get(key);
   if(!prior){maps.products.set(key,{...product});continue;}
   for(const field of ['units','sales','covered','cost','attributedOrders','contribution'])prior[field]+=product[field];
  }
  const monthly=(Date.parse(to)-Date.parse(from))/86400000>75;
  for(const row of rows){
   const date=monthly?row.day.slice(0,7):new Date(Date.parse(from)+
    Math.floor((Date.parse(row.day)-Date.parse(from))/(7*86400000))*7*86400000).toISOString().slice(0,10);
   const key=row.currency+':'+date;
   const prior=trends.get(key);
   if(prior)prior.total+=row.total;else trends.set(key,{code:row.currency,date,total:row.total});
  }
 });
 outlays=await collect('outlays',rows=>{
  const values=recordedSpend(rows);
  for(const key of Object.keys(spend))spend[key]+=values[key];
 });
 const finish=await read('scope',{p_from:from,p_to:to},signal);
 if(finish.revision!==start.revision)throw Error('Financial data changed while calculating. Load the period again.');
 for(const map of [maps.totals,maps.channels,maps.products])for(const row of map.values()){
  for(const [field,value]of Object.entries(row))if(typeof value==='number'&&field!=='margin'&&field!=='average'&&!integer(value))
   throw Error('Financial totals exceed the supported range.');
 }
 const groups=map=>[...map.values()].map(group=>({...group,
  margin:group.recorded&&group.contributionRevenue>0?
   Number(roundRatio(BigInt(group.contribution)*10000n,BigInt(group.contributionRevenue)))/100:null}));
 const products=[...maps.products.values()].sort((a,b)=>b.sales-a.sales||a.name.localeCompare(b.name));
 const monthly=(Date.parse(to)-Date.parse(from))/86400000>75;
 const label=new Intl.DateTimeFormat('en-GB',monthly?{timeZone:'UTC',month:'short',year:'numeric'}:
  {timeZone:'UTC',day:'numeric',month:'short'});
 const trend=[...trends.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.code.localeCompare(b.code)).map(row=>({
  ...row,name:(monthly?'':'Week from ')+label.format(new Date(row.date+(monthly?'-01':'')+'T00:00:00Z'))
 }));
 return {version:1,complete:true,range:{from,to},revision:start.revision,orderCount:orders,outlayCount:outlays,
  report:{totals:groups(maps.totals),channels:groups(maps.channels),
   products:products.slice(0,100).map(product=>({...product,
    average:product.units?Number(roundRatio(BigInt(product.sales),BigInt(product.units))):null})),
   orderCount:orders,productsTruncated:products.length>100,trend},
  spend};
}
