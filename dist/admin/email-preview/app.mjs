import {createAdminAuth} from '../admin-auth.mjs';
import {publicBackendConfig} from '../../backend/public-config.mjs';
let kind='order_confirmed';
const $=s=>document.querySelector(s);
async function showPreview(){
 $('#preview-status').textContent='Loading fixture preview…';
 try{
  const token=await createAdminAuth().accessToken();
  const params=new URLSearchParams({kind,tracking:$('#preview-tracking').checked?'1':'0'});
  const response=await fetch(publicBackendConfig.url+'/functions/v1/transactional-email/preview?'+params,{headers:{apikey:publicBackendConfig.publishableKey,Authorization:'Bearer '+token}});
  if(!response.ok)throw Error('Authorised preview is unavailable.');
  const result=await response.json();
  if(result.label!=='PREVIEW — NOT A REAL ORDER')throw Error('Unexpected preview response.');
  $('#preview-frame').srcdoc=result.html;$('#preview-text').textContent=result.text;$('#preview-subject').textContent='Subject: '+result.subject;
  $('#preview-status').textContent='PREVIEW — NOT A REAL ORDER';
 }catch(error){$('#preview-frame').srcdoc='';$('#preview-text').textContent='';$('#preview-subject').textContent='';$('#preview-status').textContent=error.message;}
}
for(const button of document.querySelectorAll('[data-kind]'))button.addEventListener('click',()=>{kind=button.dataset.kind;for(const other of document.querySelectorAll('[data-kind]'))other.setAttribute('aria-current',String(other===button));$('#preview-tracking-control').hidden=kind!=='dispatched';showPreview();});
$('#preview-tracking').addEventListener('change',showPreview);
document.querySelector('[data-kind="order_confirmed"]').click();
