export const categories=Object.freeze({general:'General Enquiry',order:'Order Help',product:'Product Advice',wiring:'Wiring / Technical Help',returns:'Returns / Refunds',other:'Other'});
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const clean=(value:unknown)=>typeof value==='string'?value.trim():'';
export function validateEnquiry(input:any){
 if(!input||typeof input!=='object'||Array.isArray(input)||!['category,email,message,name,orderReference,submissionId,website','category,email,message,name,orderContext,orderReference,submissionId,website'].includes(Object.keys(input).sort().join(',')))throw Error('Invalid enquiry fields');
 if(typeof input.name!=='string'||/[\r\n\x00-\x1f\x7f]/.test(input.name)||typeof input.email!=='string'||/[\r\n\x00-\x1f\x7f]/.test(input.email)||typeof input.orderReference!=='string'||/[\r\n\x00-\x1f\x7f]/.test(input.orderReference))throw Error('Invalid enquiry fields');
 const name=clean(input.name).replace(/ +/g,' '),email=clean(input.email).toLowerCase(),category=input.category,orderReference=clean(input.orderReference).toUpperCase();
 const message=typeof input.message==='string'?input.message.replace(/\r\n?/g,'\n').trim():'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId||''))throw Error('Invalid submission');
 if(typeof input.website!=='string'||input.website.length>200)throw Error('Invalid enquiry fields');
 if(name.length<2||name.length>100||/[\x00-\x1f\x7f]/.test(name))throw Error('Invalid name');
 if(email.length>254||!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email)||email.includes('..')||/[\r\n]/.test(email))throw Error('Invalid email');
 if(!Object.hasOwn(categories,category))throw Error('Invalid category');
 if(orderReference&&!/^AI-\d{6}$/.test(orderReference))throw Error('Invalid Order reference');
 if(input.orderContext!==undefined&&typeof input.orderContext!=='boolean')throw Error('Invalid Order context');
 if(input.orderContext&&!orderReference)throw Error('Order context requires a reference');
 if(message.length<10||message.length>5000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message))throw Error('Invalid message');
 return {submissionId:input.submissionId,name,email,category,orderReference,orderContext:input.orderContext===true,verifiedOrderReference:'',message,honeypot:input.website.length>0};
}
export function renderEnquiry(data:ReturnType<typeof validateEnquiry>,at:string){
 const category=categories[data.category as keyof typeof categories];
 const orderLabel=data.verifiedOrderReference?'Order Reference (verified)':'Order reference (unverified context)';
 const lines=['NEW WEBSITE ENQUIRY','',`Name: ${data.name}`,`Email: ${data.email}`,`Category: ${category}`,...(data.orderReference?[`${orderLabel}: ${data.orderReference}`]:[]),`Submitted: ${at}`,'','MESSAGE',data.message,'','Reply to this email to respond to the customer.'];
 const row=(label:string,value:string)=>`<tr><th align="left" style="padding:5px 12px 5px 0;color:#c9a46d;vertical-align:top">${label}</th><td style="padding:5px 0;overflow-wrap:anywhere">${escape(value)}</td></tr>`;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#161615;color:#f4efe6;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#262621"><tr><td style="padding:24px 26px;border-bottom:3px solid #bd9354"><strong style="color:#d7ad69;letter-spacing:2px">APPARITION INSTRUMENTS</strong><h1 style="font-size:21px;margin:16px 0 0">NEW WEBSITE ENQUIRY</h1></td></tr><tr><td style="padding:24px 26px;font-size:14px;line-height:1.6"><table role="presentation" cellpadding="0" cellspacing="0">${row('Customer',data.name)}${row('Email',data.email)}${row('Category',category)}${data.orderReference?row(orderLabel,data.orderReference):''}${row('Submitted',at)}</table><h2 style="color:#d7ad69;font-size:14px;margin:28px 0 10px">MESSAGE</h2><div style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(data.message)}</div></td></tr><tr><td style="padding:18px 26px;background:#1d1d1b;color:#d9d1c1;font-size:12px">Reply to this email to respond to the customer's validated address.</td></tr></table></td></tr></table></body></html>`;
 return {to:'luke@apparitioninstruments.co.uk',replyTo:data.email,subject:`Apparition Instruments enquiry - ${category}`,text:lines.join('\n'),html};
}
