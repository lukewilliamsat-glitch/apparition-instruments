import {createClient} from './supabase-client.mjs';
import {publicBackendConfig} from '../backend/public-config.mjs';

// Shared customer session across Account and Checkout, separate from Admin Auth.
export const customerAuth=createClient(publicBackendConfig.url,publicBackendConfig.publishableKey,{
 auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true,
  storageKey:'apparition.customer.auth.v1'}
}).auth;
