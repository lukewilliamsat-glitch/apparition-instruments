import {buildPaidOrderConfirmation} from './confirmation.ts';
import {sendOrderMail} from './smtp.ts';
type Environment={get:(name:string)=>string|undefined};
export async function sendConfirmedOrderOnce(orderId:string,env:Environment,request:typeof fetch=fetch,send=sendOrderMail){
 const url=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!service)return false;
 const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
 const claimResponse=await request(url+'/rest/v1/rpc/claim_paid_order_confirmation',{method:'POST',headers,body:JSON.stringify({p_order_id:orderId})});
 if(!claimResponse.ok)return false;
 const claim=await claimResponse.json();if(!claim)return true; // Sent, sending, legacy or unpaid: never send again.
 if(!claim.claim||!claim.order)return false;
 let state:'sent'|'failed'|'unknown'='sent',reason:string|null=null;
 try{const message=buildPaidOrderConfirmation(claim.order);await send(env,message);}
 catch(error){state=(error as {outcome?:string})?.outcome==='unknown'?'unknown':'failed';
  const detail=error instanceof Error?error.message:'';
  reason=/^SMTP (?:rejected command \(\d{3}\)|connection failed|configuration or recipient invalid|response invalid|response exceeded limit|write incomplete|connection closed)$/.test(detail)?detail:'SMTP delivery could not be confirmed';}
 const result=await request(url+'/rest/v1/rpc/finish_paid_order_confirmation',{method:'POST',headers,
  body:JSON.stringify({p_order_id:orderId,p_claim:claim.claim,p_state:state,p_reason:reason})});
 return result.ok&&(await result.json())===true;
}
