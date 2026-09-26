import {createAdminAuth} from './admin-auth.mjs';
import {setComponentRepository} from './component-repository.mjs';
import {createAdminComponentRepository} from '../backend/component-data.mjs';
import {setAssemblyRepository} from './assembly-repository.mjs';
import {createAdminAssemblyRepository} from '../backend/assembly-data.mjs';
import {createAuthenticatedRepositoryTransport} from '../backend/providers.mjs?v=p07b5';
import {createAdminOrderRepository,setAdminOrderRepository} from '../backend/order-data.mjs?v=p08b2a';

const element=(document,tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const entryModules=document=>(document.querySelector('script[data-admin-entry]')?.dataset.adminEntry||'').split(',').map(value=>value.trim()).filter(Boolean);

export async function bootAdminGate({document=globalThis.document,auth=createAdminAuth(),load=specifier=>import(specifier)}={}){
 const body=document.body;body.classList.remove('admin-authorized');
 const main=element(document,'main');main.className='admin-access-gate';main.setAttribute('aria-labelledby','admin-access-title');body.prepend(main);
 const panel=element(document,'section');panel.className='admin-access-panel';main.append(panel);
 const eyebrow=element(document,'p','APPARITION / ADMIN');eyebrow.className='eyebrow';
 const title=element(document,'h1','Admin Access');title.id='admin-access-title';
 const note=element(document,'p');note.className='admin-access-note';
 const feedback=element(document,'p');feedback.className='error';feedback.setAttribute('role','alert');
 const home=element(document,'a','Return to website'),path=document.location?.pathname||'',adminAt=path.indexOf('/admin/');home.href=adminAt<0?'../':path.slice(0,adminAt+1);
 panel.append(eyebrow,title,note,feedback,home);

 const signOut=async()=>{
  setComponentRepository(null);
  setAssemblyRepository(null);
  setAdminOrderRepository(null);
  body.classList.remove('admin-authorized');main.hidden=false;panel.replaceChildren(eyebrow,title,note,feedback);
  note.textContent='Signing out…';feedback.textContent='';
  try{await auth.signOut();document.querySelector('.admin-lock')?.remove();render('signed-out');}catch{render('sign-out-error');}
 };
 const signOutButton=()=>{const button=element(document,'button','Sign Out');button.type='button';button.className='button';button.addEventListener('click',signOut);return button;};
 const render=state=>{
  body.classList.remove('admin-authorized');main.hidden=false;feedback.textContent='';panel.replaceChildren(eyebrow,title,note);
  if(state==='denied'||state==='sign-out-error'){
   note.textContent=state==='denied'?'This account is not authorised for Admin access.':'Could not end the Admin session. Please retry.';
   panel.append(signOutButton(),home);return;
  }
  if(state==='checking'){note.textContent='Checking Admin access…';panel.append(feedback);return;}
  note.textContent='Sign in with your authorised Apparition Admin account.';
  const form=element(document,'form');
  const emailLabel=element(document,'label','Email'),email=element(document,'input');email.type='email';email.name='email';email.required=true;email.autocomplete='username';emailLabel.append(email);
  const passwordLabel=element(document,'label','Password'),password=element(document,'input');password.type='password';password.name='password';password.required=true;password.autocomplete='current-password';passwordLabel.append(password);
  const button=element(document,'button','Sign In');button.type='submit';button.className='button';form.append(emailLabel,passwordLabel,button);
  form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;feedback.textContent='';note.textContent='Authenticating…';
   try{const result=await auth.signIn(email.value.trim(),password.value);if(result.status==='authorized')await reveal();else if(result.status==='denied')render('denied');else{note.textContent='Sign in with your authorised Apparition Admin account.';feedback.textContent='Sign-in failed. Check your email and password.';password.value='';password.focus();}}
   catch{note.textContent='Sign in with your authorised Apparition Admin account.';feedback.textContent='Admin sign-in is unavailable. Please try again.';}
   finally{button.disabled=false;}
  });
  panel.append(form,feedback,home);email.focus();
 };
 const reveal=async()=>{
  const signOutControl=signOutButton();signOutControl.className='admin-lock';body.prepend(signOutControl);
  try{
   if(typeof auth.accessToken==='function'){
    const transport=createAuthenticatedRepositoryTransport(auth);
    setComponentRepository(createAdminComponentRepository(transport));
    setAssemblyRepository(createAdminAssemblyRepository(transport));
    setAdminOrderRepository(createAdminOrderRepository(transport));
   }
   for(const entry of entryModules(document))await load(new URL(entry,document.baseURI).href);
   main.hidden=true;body.classList.add('admin-authorized');
  }catch{setComponentRepository(null);setAssemblyRepository(null);setAdminOrderRepository(null);signOutControl.remove();render('checking');feedback.textContent='Admin could not load. Please reload and try again.';}
 };
 render('checking');
 try{const result=await auth.restore();if(result.status==='authorized')await reveal();else render(result.status==='denied'?'denied':'signed-out');}
 catch{render('signed-out');feedback.textContent='Could not check Admin access. Please try again.';}
}

if(typeof document!=='undefined')bootAdminGate().catch(()=>{
 document.body.classList.remove('admin-authorized');
 const gate=document.querySelector('.admin-access-gate');if(gate)gate.textContent='Admin access is unavailable. Please reload.';
});
