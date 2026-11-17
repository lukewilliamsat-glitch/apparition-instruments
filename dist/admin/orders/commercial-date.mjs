const dateOnly=/^\d{4}-\d{2}-\d{2}$/;
const todayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
export function londonDay(value=new Date()){
 const d=new Date(value);
 if(value==null||!Number.isFinite(d.getTime()))return '';
 const parts=Object.fromEntries(todayFormat.formatToParts(d).map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
export function validBusinessDate(value){
 if(typeof value!=='string'||!dateOnly.test(value)||value<'1900-01-01')return false;
 const n=new Date(value+'T12:00:00Z');
 return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===value;
}
const manualChannels=new Set(['EBAY','DIRECT','OTHER']);
export const manualDateEligible=order=>manualChannels.has(order?.channel)&&!!order.externalReference&&validBusinessDate(order.orderDate)&&!order.providerBacked;
export function commercialOrderDay(order){
 if(order?.channel!=='WEBSITE'&&validBusinessDate(order?.orderDate))return order.orderDate;
 return londonDay(order?.channel==='WEBSITE'&&order?.paidAt||order?.createdAt);
}
export function latestManualDay(order,now=new Date()){
 return [londonDay(now),londonDay(order?.createdAt),londonDay(order?.paidAt),londonDay(order?.fulfilledAt)].filter(Boolean).sort()[0]||'';
}
export function selectOrdersByDay(records,{from='',to='',sort='newest'}={}){
 if((from&&!validBusinessDate(from))||(to&&!validBusinessDate(to)))throw Error('Enter valid UK calendar dates.');
 if(from&&to&&from>to)throw Error('From date must not follow To date.');
 const direction=sort==='oldest'?1:-1;
 return records.map(order=>({order,day:commercialOrderDay(order)})).filter(({day})=>
  (!from||day>=from)&&(!to||(day&&day<=to))).sort((a,b)=>
   (a.day&&b.day?direction*a.day.localeCompare(b.day):a.day?-1:b.day?1:0)||
   String(b.order.createdAt||'').localeCompare(String(a.order.createdAt||''))||
   String(a.order.id||'').localeCompare(String(b.order.id||''))).map(x=>x.order);
}
