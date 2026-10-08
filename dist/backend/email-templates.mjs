let repository=null;
export const setEmailTemplateRepository=value=>{repository=value;};
export function currentEmailTemplateRepository(){if(!repository)throw Error('Admin email template repository unavailable');return repository;}
export function createEmailTemplateRepository(transport){
 const send=async(resource,body)=>{const r=await transport.send(resource,{method:'POST',body}),data=await r.json();if(!r.ok)throw Object.assign(Error(data.message||'Email templates unavailable'),{code:data.code});return data;};
 return Object.freeze({list:()=>send('rpc/get_admin_email_templates',{}),mutate:(key,revision,action,content=null,version=null)=>send('rpc/mutate_email_template',{p_key:key,p_expected_revision:revision,p_action:action,p_content:content,p_version:version})});
}
