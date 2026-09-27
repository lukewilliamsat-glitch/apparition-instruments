import {createClient} from './supabase-client.mjs';
import {publicBackendConfig} from '../backend/public-config.mjs';
import {createAccountApp} from './app.mjs';

const client=createClient(publicBackendConfig.url,publicBackendConfig.publishableKey,{
 auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true,
  storageKey:'apparition.customer.auth.v1'}
});
createAccountApp({auth:client.auth,document,location,history}).start();
