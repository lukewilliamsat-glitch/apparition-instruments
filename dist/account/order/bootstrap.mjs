import {customerAuth} from '../client.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
import {renderOrder} from './view.mjs';

export async function loadOrder(reference,{auth=customerAuth,request=fetch,config=publicBackendConfig}={}){
 const {data,error}=await auth.getSession();
 if(error||!data?.session?.access_token)throw Error('Sign in to view your Order.');
 const query=new URLSearchParams({reference});
 const response=await request(config.url+'/functions/v1/my-orders?'+query,{headers:{apikey:config.publishableKey,Authorization:'Bearer '+data.session.access_token},cache:'no-store'});
 if(response.status===404)throw Error('Order not found in your account.');
 if(!response.ok)throw Error(response.status===401?'Sign in to view your Order.':'Order details are temporarily unavailable.');
 const payload=await response.json();if(!payload?.order)throw Error('Order details are temporarily unavailable.');
 return payload.order;
}
export async function startOrder({document,location,load=loadOrder}={}){
 const status=document.getElementById('order-status'),root=document.getElementById('order-detail');
 const reference=new URL(location.href).searchParams.get('reference');
 if(!reference||!/^AI-\d{6}$/.test(reference)){status.textContent='Order not found in your account.';return;}
 try{const order=await load(reference);renderOrder(root,order,document);status.textContent='';root.hidden=false;document.getElementById('order-title').textContent='Order '+order.reference+'.';}
 catch(error){status.textContent=error.message;}
}
if(typeof document!=='undefined'&&document.getElementById('order-detail'))startOrder({document,location});
