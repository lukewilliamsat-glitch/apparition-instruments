import {publicBackendConfig} from '../backend/public-config.mjs';
import {customerAuth} from '../account/client.mjs';

export function createContactController({form,notice,success,request=globalThis.fetch,config=publicBackendConfig,id=()=>crypto.randomUUID(),auth=customerAuth,location=globalThis.location}={}){
 let submissionId=id(),sending=false,settled=false;
 let contextReference='';
 const button=form.querySelector('button[type="submit"]');
 function status(message,state){notice.textContent=message;notice.dataset.state=state;}
 async function initialiseContext(){
  const reference=location?new URL(location.href).searchParams.get('reference'):null;
  if(!/^AI-\d{6}$/.test(reference||''))return;
  const {data}=await auth.getSession();if(!data?.session?.access_token)return;
  const {data:user}=await auth.getUser();if(!user?.user?.email_confirmed_at)return;
  contextReference=reference;form.elements.orderReference.value=reference;
  form.elements.category.value='order';form.elements.email.value=user.user.email||'';
  const panel=form.querySelector('#order-context');if(panel){panel.hidden=false;panel.querySelector('strong').textContent=reference;}
 }
 const remove=form.querySelector('#remove-order-context');if(remove)remove.addEventListener('click',()=>{
  contextReference='';form.elements.orderReference.value='';form.querySelector('#order-context').hidden=true;
 });
 form.elements.orderReference?.addEventListener('input',()=>{if(contextReference&&form.elements.orderReference.value.toUpperCase()!==contextReference){contextReference='';const panel=form.querySelector('#order-context');if(panel)panel.hidden=true;}});
 async function submit(event){
  event.preventDefault();if(sending||settled||!form.reportValidity())return;
  sending=true;button.disabled=true;button.textContent='Sending enquiry…';status('Sending your enquiry…','sending');
  const fields=new FormData(form);
  const body={submissionId,name:String(fields.get('name')||''),email:String(fields.get('email')||''),category:String(fields.get('category')||''),orderReference:String(fields.get('orderReference')||''),message:String(fields.get('message')||''),website:String(fields.get('website')||'')};
  const linked=contextReference&&body.orderReference.toUpperCase()===contextReference;
  try{
   let accessToken=null;if(linked){const session=await auth.getSession();accessToken=session.data?.session?.access_token||null;body.orderContext=true;}
   const reply=await request(config.url+'/functions/v1/contact-enquiry',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',Accept:'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{})},body:JSON.stringify(body)});
   const result=await reply.json();
   if(reply.ok&&result.state==='sent'){
    settled=true;form.hidden=true;success.hidden=false;success.focus();return;
   }
   if(reply.status===404&&linked){status('This Order could not be verified for your account. Remove the Order context to send a general enquiry.','error');submissionId=id();}
   else if(reply.status===400||result.state==='invalid'){status('Please check the form fields and try again. Your message is still here.','error');submissionId=id();}
   else if(reply.status===429||result.state==='rate_limited'){status('Too many enquiries were sent recently. Please wait at least 15 minutes before trying again.','error');submissionId=id();}
   else if(result.state==='failed'){status('Your enquiry could not be sent. Your message is still here so you can try again.','error');submissionId=id();}
   else{status('We could not confirm whether your enquiry arrived. Please avoid sending it again straight away.','uncertain');settled=true;}
  }catch{status('We could not confirm whether your enquiry arrived. Please avoid sending it again straight away.','uncertain');settled=true;}
  finally{sending=false;if(!settled){button.disabled=false;button.textContent='Send enquiry';}}
 }
 form.addEventListener('submit',submit);
 return {submit,initialiseContext};
}
if(typeof document!=='undefined'){
 const form=document.querySelector('#enquiry-form');if(form)createContactController({form,notice:document.querySelector('#enquiry-status'),success:document.querySelector('#enquiry-success')}).initialiseContext().catch(()=>{});
}
