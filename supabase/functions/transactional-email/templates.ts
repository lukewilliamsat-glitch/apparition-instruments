export type TemplateContent={subject:string;heading:string;body:string};
export const templateKeys=['dispatched:WEBSITE','dispatched:EBAY','aftercare:WEBSITE','aftercare:EBAY'];
export const templatePlaceholders=(key:string)=>key.startsWith('dispatched:')?['first_name','order_number','shipping_service','tracking_reference']:['first_name','order_number'];
export const aftercareSubject='Checking in after your Apparition Instruments order';
export const aftercareBody=(ebay=false)=>[
 'Hi {{first_name}},',
 'We just wanted to check in and say thank you for choosing Apparition Instruments!',
 "Hopefully your order has arrived safely and you're getting on well with everything.",
 'As a small independent UK business, every order genuinely means a lot to us, and we really appreciate your support.',
 "If you have any questions about your components, need a hand with installation or wiring, or just want some advice on your guitar's electronics, "+(ebay?"please feel free to get in touch through your eBay order messages. We're always happy to help!":"please don't hesitate to reply. We're always happy to help!"),
 'Thanks again, and we hope everything goes brilliantly with your project!',
 'Apparition Instruments'
].join('\n\n');
export function initialTemplate(key:string):TemplateContent{
 if(!templateKeys.includes(key))throw Error('Unsupported template');
 const ebay=key.endsWith(':EBAY');
 return key.startsWith('aftercare:')?{subject:aftercareSubject,heading:'HERE IF YOU NEED US',body:aftercareBody(ebay)}:{subject:'Apparition Instruments order {{order_number}} dispatched',heading:'YOUR ORDER IS ON ITS WAY',body:'Hi {{first_name}},\n\nYour order has been dispatched.\n\n'+(ebay?'For help with this order, contact Apparition Instruments through your eBay order messages.':'If you need help with delivery, please contact us.')};
}
export function validateTemplate(key:string,content:TemplateContent){
 if(!templateKeys.includes(key)||!content||Object.keys(content).sort().join(',')!=='body,heading,subject')throw Error('Subject, heading and body are required');
 for(const [field,max] of [['subject',200],['heading',120],['body',6000]] as const){const value=content[field];if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`${field} must contain 1–${max} characters`);if(/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)||field!=='body'&&/[\r\n]/.test(value))throw Error('Markup and control characters are unavailable');
  const stripped=value.replace(/\{\{([a-z_]+)\}\}/g,(_,name)=>{if(!templatePlaceholders(key).includes(name))throw Error('Unknown placeholder: '+name);return '';});if(field!=='body'&&!stripped.trim())throw Error('Subject and heading need readable text beyond placeholders');if(/[{}]/.test(stripped))throw Error('Malformed placeholder');
 }
 if(!content.body.includes('{{first_name}}')||key.startsWith('dispatched:')&&!content.subject.includes('{{order_number}}'))throw Error('Preserve the first-name greeting and dispatch order-number subject');
 if(content.body.split(/\n\s*\n/).length<3)throw Error('Use separate greeting, message and support paragraphs');
 if(/https?:|www\.|\b[\w-]+\.(?:com|co\.uk|net|org)\b|\S+@\S+|javascript:|data:/i.test(Object.values(content).join(' ')))throw Error('Links and addresses belong to protected service sections, not editable content');
 if(key.endsWith(':EBAY')&&(!/eBay order messages/i.test(content.body)||/off[ -]platform|buy direct|purchase direct|discount|coupon|promo(?:tion|tional)?|review|feedback|rating|incentive/i.test(Object.values(content).join(' '))))throw Error('eBay wording must use order messages and contain no promotional invitations');
 return content;
}
export function templateKey(kind:string,channel:string){return kind+':'+(channel==='EBAY'?'EBAY':'WEBSITE');}
export async function publishedTemplate(kind:string,channel:string,env:any,transport:typeof fetch){
 const key=templateKey(kind,channel);if(!templateKeys.includes(key))return null;
 const secret=env.get('SUPABASE_SERVICE_ROLE_KEY');
 const r=await transport(env.get('SUPABASE_URL')+'/rest/v1/rpc/get_published_email_template',{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({p_key:key})});
 if(!r.ok)throw Error('Published email template unavailable');const data=await r.json();if(!data?.id||data.key!==key)throw Error('Published email template unavailable');validateTemplate(key,data.content);return data;
}
