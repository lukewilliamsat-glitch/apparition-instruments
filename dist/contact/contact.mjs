import {publicBackendConfig} from '../backend/public-config.mjs';

export function createContactController({form,notice,success,request=globalThis.fetch,config=publicBackendConfig,id=()=>crypto.randomUUID()}={}){
 let submissionId=id(),sending=false,settled=false;
 const button=form.querySelector('button[type="submit"]');
 function status(message,state){notice.textContent=message;notice.dataset.state=state;}
 async function submit(event){
  event.preventDefault();if(sending||settled||!form.reportValidity())return;
  sending=true;button.disabled=true;button.textContent='Sending enquiry…';status('Sending your enquiry…','sending');
  const fields=new FormData(form);
  const body={submissionId,name:String(fields.get('name')||''),email:String(fields.get('email')||''),category:String(fields.get('category')||''),orderReference:String(fields.get('orderReference')||''),message:String(fields.get('message')||''),website:String(fields.get('website')||'')};
  try{
   const reply=await request(config.url+'/functions/v1/contact-enquiry',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
   const result=await reply.json();
   if(reply.ok&&result.state==='sent'){
    settled=true;form.hidden=true;success.hidden=false;success.focus();return;
   }
   if(reply.status===400||result.state==='invalid'){status('Please check the form fields and try again. Your message is still here.','error');submissionId=id();}
   else if(reply.status===429||result.state==='rate_limited'){status('Too many enquiries were sent recently. Please wait at least 15 minutes before trying again.','error');submissionId=id();}
   else if(result.state==='failed'){status('Your enquiry could not be sent. Your message is still here so you can try again.','error');submissionId=id();}
   else{status('We could not confirm whether your enquiry arrived. Please avoid sending it again straight away.','uncertain');settled=true;}
  }catch{status('We could not confirm whether your enquiry arrived. Please avoid sending it again straight away.','uncertain');settled=true;}
  finally{sending=false;if(!settled){button.disabled=false;button.textContent='Send enquiry';}}
 }
 form.addEventListener('submit',submit);
 return {submit};
}
if(typeof document!=='undefined'){
 const form=document.querySelector('#enquiry-form');if(form)createContactController({form,notice:document.querySelector('#enquiry-status'),success:document.querySelector('#enquiry-success')});
}
