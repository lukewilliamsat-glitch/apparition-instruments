import {customerAuth} from './client.mjs';
import {publicBackendConfig} from '../backend/public-config.mjs';
import {createAccountApp} from './app.mjs';

async function loadOrders(){
 const {data,error}=await customerAuth.getSession();
 if(error||!data?.session?.access_token)throw Error('Account session unavailable');
 const response=await fetch(publicBackendConfig.url+'/functions/v1/my-orders',{
  headers:{apikey:publicBackendConfig.publishableKey,Authorization:'Bearer '+data.session.access_token},cache:'no-store'});
 if(!response.ok)throw Error('Order history unavailable');
 const result=await response.json();
 if(!Array.isArray(result?.orders))throw Error('Order history unavailable');
 return result.orders;
}
createAccountApp({auth:customerAuth,document,location,history,loadOrders}).start();
