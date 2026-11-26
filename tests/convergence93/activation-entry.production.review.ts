// Deploy only at the final authorised cutover, after the paused installation,
// fresh provider reconciliation, receiver acceptance and protected release gate.
import {startCheckout} from './create-checkout/index.ts';
if(Deno.env.get('SUPABASE_URL')!=='https://acdxpxvksvdwfajntzfx.supabase.co')throw Error('Production target mismatch');
Deno.serve(req=>startCheckout(req,{get:name=>name==='UNITY92_CHECKOUT'?'enabled':Deno.env.get(name)}));
