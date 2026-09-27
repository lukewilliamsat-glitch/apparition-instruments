import {verifiedCustomer} from '../_shared/customer-auth.ts';
type Env={get:(name:string)=>string|undefined};
const origin='https://apparitioninstruments.co.uk';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'GET,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
const respond=(status:number,payload:object)=>new Response(JSON.stringify(payload),{status,headers});
export async function listMyOrders(req:Request,env:Env=Deno.env,request:typeof fetch=fetch):Promise<Response>{
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==origin)return respond(403,{message:'Unavailable'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='GET')return respond(405,{message:'Method not allowed'});
 const owner=await verifiedCustomer(req,env,request);
 if(!owner)return respond(401,{message:'Sign in to view your Orders.'});
 const reference=new URL(req.url).searchParams.get('reference');
 if(reference!==null&&!/^AI-\d{6}$/.test(reference))return respond(404,{message:'Order not found.'});
 const url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!service)return respond(503,{message:'Orders are unavailable.'});
 try{
  // The email comes from the freshly verified Supabase Auth user, never request data.
  // Only unowned guest Orders can be claimed; the database RPC never replaces an owner.
  const claim=await request(url+'/rest/v1/rpc/claim_verified_email_guest_orders',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({p_owner:owner.id,p_email:owner.email}),cache:'no-store'});
  if(!claim.ok)return respond(503,{message:'Orders are temporarily unavailable.'});
  const query=new URLSearchParams({owner_user_id:'eq.'+owner.id,select:reference===null?'reference,created_at,total_pence,status,payment_status':'reference,created_at,paid_at,status,payment_status,status_history,items,customer,delivery,dispatch_details,subtotal_pence,delivery_pence,total_pence,refunded_pence,latest_refund_at',order:'created_at.desc',limit:reference===null?'100':'1'});
  if(reference!==null)query.set('reference','eq.'+reference);
  const result=await request(url+'/rest/v1/orders?'+query,{headers:{apikey:service,Authorization:'Bearer '+service},cache:'no-store'});
  if(!result.ok)return respond(503,{message:'Orders are temporarily unavailable.'});
  const rows=await result.json();
  if(!Array.isArray(rows))return respond(503,{message:'Orders are temporarily unavailable.'});
  if(reference!==null){
   if(!rows.length)return respond(404,{message:'Order not found.'});
   return respond(200,{order:customerOrderDetail(rows[0])});
  }
  return respond(200,{orders:rows.map(row=>({reference:row.reference,createdAt:row.created_at,totalPence:row.total_pence,status:row.status,paymentStatus:row.payment_status}))});
 }catch{return respond(503,{message:'Orders are temporarily unavailable.'});}
}
const safeText=(value:unknown,max=180)=>typeof value==='string'?value.trim().slice(0,max):'';
export function customerOrderDetail(row:any){
 const history=Array.isArray(row.status_history)?row.status_history.filter((entry:any)=>
  ['in_production','ready_to_dispatch','dispatched','completed'].includes(entry?.status)&&typeof entry.at==='string')
  .map((entry:any)=>({status:entry.status,at:entry.at})):[];
 const items=Array.isArray(row.items)?row.items.map((item:any)=>({
  name:safeText(item.name),quantity:item.quantity,unitPrice:item.unitPrice,lineTotal:item.lineTotal,
  options:item.snapshot?.specification&&typeof item.snapshot.specification==='object'&&!Array.isArray(item.snapshot.specification)?
   Object.entries(item.snapshot.specification).filter(([key,value])=>typeof value==='string'&&safeText(key,50)&&safeText(value,100)&&
    !/(?:cost|margin|profit|supplier|stock|inventory|bom|sku|internal|admin|secret)/i.test(key)).slice(0,12)
    .map(([key,value])=>({name:safeText(key,50),value:safeText(value,100)})):[]
 })):[];
 const delivery=row.delivery||{},dispatch=row.dispatch_details||{},url=safeText(dispatch.tracking_url,500);
 return {reference:row.reference,createdAt:row.created_at,confirmedAt:row.paid_at,status:row.status,paymentStatus:row.payment_status,
  history,items,pricing:{subtotal:row.subtotal_pence,delivery:row.delivery_pence,total:row.total_pence},
  refundedPence:row.refunded_pence??0,latestRefundAt:row.latest_refund_at,
  recipient:safeText(delivery.recipient)||safeText(row.customer?.name),address:['line1','line2','city','region','postcode','country'].map(key=>safeText(delivery[key])).filter(Boolean),
  dispatch:{carrier:safeText(dispatch.carrier),trackingReference:safeText(dispatch.tracking_reference),trackingUrl:/^https:\/\/[^\s/]+(?:\/|$)/i.test(url)?url:''}};
}
if(import.meta.main)Deno.serve(req=>listMyOrders(req));
