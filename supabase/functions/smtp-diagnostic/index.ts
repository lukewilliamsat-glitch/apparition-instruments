// P07B.7: temporary SMTP diagnostic retired after Luke confirmed delivery.
// Retained as a non-sending endpoint because this connection cannot delete
// deployed Supabase Edge Functions. Customer confirmations use stripe-webhook.
export function retiredSmtpDiagnostic(){return Response.json({message:'SMTP diagnostic retired'},{status:410});}
if(import.meta.main)Deno.serve(retiredSmtpDiagnostic);
