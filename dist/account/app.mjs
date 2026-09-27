export const accountRedirect='https://apparitioninstruments.co.uk/account/';
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const callbackFields=['code','error','error_code','error_description','type','token_hash','access_token','refresh_token'];

export function createAccountApp({auth,document,location,history,loadOrders=async()=>[],setTimeoutFn=setTimeout}={}){
 if(!auth||!document||!location||!history)throw Error('Account setup is incomplete');
 const el=id=>document.getElementById(id);
 const status=el('account-status'),error=el('account-error');
 const sections={out:el('account-signed-out'),in:el('account-signed-in'),recovery:el('account-recovery')};
 const views={signin:el('account-signin'),signup:el('account-signup'),recover:el('account-recover'),confirmation:el('account-confirmation')};
 let currentView='signin',recoveryMode=false,initializing=true,pendingEmail='',resendUntil=0,sequence=0;
 const showError=message=>{error.textContent=message;error.hidden=!message;};
 const setStatus=message=>{status.textContent=message;};
 const display=section=>{Object.entries(sections).forEach(([name,node])=>{node.hidden=name!==section;});};
 const clearOrders=()=>{el('my-orders-list').replaceChildren();el('my-orders-status').textContent='';};
 async function showOrders(run){
  const list=el('my-orders-list'),notice=el('my-orders-status');list.replaceChildren();notice.textContent='Loading your Orders…';
  try{
   const orders=await loadOrders();if(run!==sequence)return;
   if(!orders.length){notice.textContent='No Orders are linked to this account yet. You can still checkout as a guest.';return;}
   notice.textContent='';
   const labels={pending:'Order Confirmed',in_production:'In Production',ready_to_dispatch:'Ready to Dispatch',dispatched:'Dispatched',completed:'Fulfilment complete'};
   for(const order of orders){
    const item=document.createElement('li'),link=document.createElement('a'),reference=document.createElement('strong'),details=document.createElement('span'),state=document.createElement('span');
    link.href='/account/order/?reference='+encodeURIComponent(order.reference);
    reference.textContent=order.reference;
    const date=new Date(order.createdAt);
    details.textContent=(Number.isNaN(date.getTime())?'Order date unavailable':new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(date))+' · '+
     (Number.isSafeInteger(order.totalPence)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(order.totalPence/100):'Total unavailable');
    state.textContent=order.paymentStatus==='refunded'?'Refunded':labels[order.status]||'Status unavailable';
    link.append(reference,details,state);item.append(link);list.append(item);
   }
  }catch{if(run===sequence)notice.textContent='Your Orders could not be loaded. Please refresh this page to try again.';}
 }
 const setView=view=>{
  if(!views[view])return;
  currentView=view;
  Object.entries(views).forEach(([name,node])=>{node.hidden=name!==view;});
  document.querySelectorAll('.account-tabs [data-view]').forEach(button=>button.setAttribute('aria-current',String(button.dataset.view===view)));
  el('account-google').hidden=view==='recover'||view==='confirmation';
  display('out');showError('');
 };
 const messageFor=(failure,action)=>{
  if(failure?.status===429||failure?.code==='over_email_send_rate_limit'||failure?.code==='over_request_rate_limit')return 'Too many attempts. Please wait before trying again.';
  if(failure?.code==='email_not_confirmed')return 'Please confirm your email using the link we sent before signing in.';
  if(action==='signin')return 'We could not sign you in. Check your details and try again.';
  if(action==='signup')return 'We could not create the account right now. Please try again later.';
  return 'That request could not be completed. Please try again later.';
 };
 async function submit(form,action,operation){
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;showError('');setStatus(action==='signin'?'Signing in…':'Please wait…');
  try{await operation();}
  catch(failure){showError(messageFor(failure,action));setStatus('');}
  finally{button.disabled=false;}
 }
 function verifiedEmail(user){return user?.email&&user?.email_confirmed_at?user.email:null;}
 async function refreshIdentity(){
  const run=++sequence;
  try{
   const {data,error:failure}=await auth.getUser();
   if(run!==sequence)return;
   if(failure||!verifiedEmail(data?.user)){
    if(initializing)setStatus('');
    if(!failure&&data?.user)showError('Confirm your email to finish setting up your account.');
    display('out');return;
   }
   el('account-email').textContent=verifiedEmail(data.user);
   display(recoveryMode?'recovery':'in');
   setStatus('');showError('');
   if(!recoveryMode)await showOrders(run);
  }catch{
   if(run!==sequence)return;
   display('out');setStatus('');showError('Account service is temporarily unavailable. Please try again shortly.');
  }finally{initializing=false;}
 }
 function callbackError(){
  const url=new URL(location.href);
  if(!url.searchParams.has('error')&&!url.hash.includes('error='))return '';
  const code=url.searchParams.get('error_code')||new URLSearchParams(url.hash.slice(1)).get('error_code');
  return code==='access_denied'?'Google sign-in was cancelled. You can try again.':
   code==='otp_expired'?'That account link has expired. Request a new one.':
   'That account link could not be used. Please try again.';
 }
 function clearCallback(){
  const url=new URL(location.href);
  if(callbackFields.some(key=>url.searchParams.has(key))||url.hash){
   history.replaceState(null,'',accountRedirect);
  }
 }
 async function start(){
  const returnedError=callbackError();
  const hadCode=new URL(location.href).searchParams.has('code');
  auth.onAuthStateChange((event)=>{
   if(event==='PASSWORD_RECOVERY')recoveryMode=true;
   if(event==='SIGNED_OUT'){
    sequence++;recoveryMode=false;el('account-email').textContent='';clearOrders();display('out');setStatus('');return;
   }
   if(event==='SIGNED_IN'||event==='PASSWORD_RECOVERY'||event==='TOKEN_REFRESHED')setTimeoutFn(()=>{refreshIdentity();},0);
  });
  try{
   const result=await auth.getSession();
   clearCallback();
   if(result.error)throw result.error;
   if(result.data?.session)await refreshIdentity();
   else{display('out');setStatus('');initializing=false;}
   if(returnedError)showError(returnedError);
   else if(hadCode&&!result.data?.session)showError('That account link is invalid or has expired.');
  }catch{
   clearCallback();display('out');setStatus('');showError('That account link could not be used. Please try again.');initializing=false;
  }
 }
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
 el('signin-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;
  submit(form,'signin',async()=>{
   const {data,error:failure}=await auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});
   if(failure)throw failure;
   if(!data?.session)throw Error('No session');
   await refreshIdentity();
  });
 });
 el('signup-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;
  submit(form,'signup',async()=>{
   const email=form.elements.email.value.trim(),password=form.elements.password.value;
   if(!emailPattern.test(email))throw Error('Invalid email');
   if(password.length<8){showError('Use a password of at least 8 characters.');setStatus('');return;}
   if(password!==form.elements.confirm.value){showError('The passwords do not match.');setStatus('');return;}
   const {error:failure}=await auth.signUp({email,password,options:{emailRedirectTo:accountRedirect}});
   if(failure)throw failure;
   pendingEmail=email;resendUntil=Date.now()+60000;el('resend-confirmation').disabled=true;
   setTimeoutFn(()=>{el('resend-confirmation').disabled=false;},60000);
   form.reset();setView('confirmation');setStatus('If this address can be registered, check your email for a confirmation link.');
  });
 });
 el('resend-confirmation').addEventListener('click',async()=>{
  if(!pendingEmail||Date.now()<resendUntil)return;
  const button=el('resend-confirmation');button.disabled=true;showError('');
  try{const {error:failure}=await auth.resend({type:'signup',email:pendingEmail,options:{emailRedirectTo:accountRedirect}});if(failure)throw failure;
   setStatus('If this address can be registered, another confirmation link is on its way.');resendUntil=Date.now()+60000;
   setTimeoutFn(()=>{button.disabled=false;},60000);
  }catch(failure){showError(messageFor(failure,'resend'));button.disabled=false;}
 });
 el('recovery-request-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;
  submit(form,'recover',async()=>{
   const {error:failure}=await auth.resetPasswordForEmail(form.elements.email.value.trim(),{redirectTo:accountRedirect});
   if(failure)throw failure;
   form.reset();setStatus('If this address has an account, a recovery link is on its way.');
  });
 });
 el('password-update-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;
  submit(form,'update',async()=>{
   const password=form.elements.password.value;
   if(password.length<8){showError('Use a password of at least 8 characters.');setStatus('');return;}
   if(password!==form.elements.confirm.value){showError('The passwords do not match.');setStatus('');return;}
   const {error:failure}=await auth.updateUser({password});if(failure)throw failure;
   recoveryMode=false;form.reset();await refreshIdentity();setStatus('Your password has been updated.');
  });
 });
 el('google-signin').addEventListener('click',async()=>{
  const button=el('google-signin');button.disabled=true;showError('');setStatus('Opening Google sign-in…');
  try{const {error:failure}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:accountRedirect}});if(failure)throw failure;}
  catch(failure){showError(messageFor(failure,'google'));setStatus('');button.disabled=false;}
 });
 el('account-signout').addEventListener('click',async()=>{
  sequence++;el('account-email').textContent='';clearOrders();display('out');setView('signin');setStatus('Signing out…');
  try{const {error:failure}=await auth.signOut({scope:'local'});if(failure)throw failure;setStatus('You have signed out.');}
  catch{setStatus('');showError('Sign out could not be completed. Please reload and try again.');}
 });
 return {start,setView,refreshIdentity};
}
