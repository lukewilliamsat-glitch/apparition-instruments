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
 const url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!service)return respond(503,{message:'Orders are unavailable.'});
 try{
  // The email comes from the freshly verified Supabase Auth user, never request data.
  // Only unowned guest Orders can be claimed; the database RPC never replaces an owner.
  const claim=await request(url+'/rest/v1/rpc/claim_verified_email_guest_orders',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({p_owner:owner.id,p_email:owner.email}),cache:'no-store'});
  if(!claim.ok)return respond(503,{message:'Orders are temporarily unavailable.'});
  const query=new URLSearchParams({owner_user_id:'eq.'+owner.id,select:'reference,created_at,total_pence,status',order:'created_at.desc',limit:'100'});
  const result=await request(url+'/rest/v1/orders?'+query,{headers:{apikey:service,Authorization:'Bearer '+service},cache:'no-store'});
  if(!result.ok)return respond(503,{message:'Orders are temporarily unavailable.'});
  const rows=await result.json();
  if(!Array.isArray(rows))return respond(503,{message:'Orders are temporarily unavailable.'});
  return respond(200,{orders:rows.map(row=>({reference:row.reference,createdAt:row.created_at,totalPence:row.total_pence,status:row.status}))});
 }catch{return respond(503,{message:'Orders are temporarily unavailable.'});}
}
if(import.meta.main)Deno.serve(req=>listMyOrders(req));
