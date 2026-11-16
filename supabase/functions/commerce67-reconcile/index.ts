import {orderId,reconcilePayment} from '../_shared/commerce67-payments.ts';
type Environment={get:(key:string)=>string|undefined};
async function valid(received:string,expected:string){
 const enc=new TextEncoder();
 const [a,b]=await Promise.all([received,expected].map(x=>crypto.subtle.digest('SHA-256',enc.encode(x))));
 const left=new Uint8Array(a),right=new Uint8Array(b);
 let diff=0;for(let i=0;i<left.length;i++)diff|=left[i]^right[i];
 return diff===0;
}
export async function reconcileCheckout(req:Request,env:Environment=Deno.env,request:typeof fetch=fetch){
 const respond=(status:number,result:string)=>Response.json({status:result},{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return respond(405,'method_not_allowed');
 const secret=env.get('COMMERCE67_RECONCILE_SECRET'),authorization=req.headers.get('Authorization')??'';
 if(!secret||secret.length<32||authorization.length>512||!await valid(authorization,'Bearer '+secret))return respond(403,'forbidden');
 let body:any;
 try{const raw=await req.text();if(raw.length>1024)return respond(400,'invalid_order');body=JSON.parse(raw);}catch{return respond(400,'invalid_order');}
 if(!orderId(body?.orderId)||(body.sessionId!==undefined&&(typeof body.sessionId!=='string'||!/^cs_live_[A-Za-z0-9]{8,}$/.test(body.sessionId))))
  return respond(400,'invalid_order');
 try{return respond(200,await reconcilePayment(env,request,body.orderId,body.sessionId,body.releaseNeverSent===true));}
 catch{return respond(503,'unconfirmed_reservation_retained');}
}
// Deploy only as a server-to-server endpoint. The separate reconciliation
// bearer is checked even if JWT verification is disabled for this function.
if(import.meta.main)Deno.serve(req=>reconcileCheckout(req));
