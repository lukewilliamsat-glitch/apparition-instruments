import {adminSessionKey,adminSessionValue,temporaryPasswordDigest} from './admin-gate-config.mjs';

export async function sha256Hex(value,cryptoProvider=globalThis.crypto){
 if(!cryptoProvider?.subtle)throw new Error('Password verification is unavailable in this browser.');
 const bytes=new TextEncoder().encode(String(value));const digest=await cryptoProvider.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function adminIsAuthorized(storage=globalThis.sessionStorage){try{return storage.getItem(adminSessionKey)===adminSessionValue;}catch{return false;}}
export async function authorizeAdmin(password,storage=globalThis.sessionStorage,digest=sha256Hex){
 if(await digest(password)!==temporaryPasswordDigest)return false;
 try{storage.setItem(adminSessionKey,adminSessionValue);return true;}catch{throw new Error('Session access could not be saved in this browser.');}
}
export function lockAdmin(storage=globalThis.sessionStorage){try{storage.removeItem(adminSessionKey);}catch{}return !adminIsAuthorized(storage);}

function element(document,tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
function entryModules(document){const script=document.querySelector('script[data-admin-entry]');return (script?.dataset.adminEntry||'').split(',').map(value=>value.trim()).filter(Boolean);}
async function revealAdmin(document,storage,load){
 document.querySelector('.admin-access-gate')?.remove();document.body.classList.add('admin-authorized');
 const lock=element(document,'button','Lock Admin');lock.type='button';lock.className='admin-lock';lock.addEventListener('click',()=>{lockAdmin(storage);globalThis.location.reload();});document.body.prepend(lock);
 for(const entry of entryModules(document))await load(new URL(entry,document.baseURI).href);
}
function renderAccessGate(document,storage,load,digest){
 const main=element(document,'main');main.className='admin-access-gate';main.setAttribute('aria-labelledby','admin-access-title');
 const panel=element(document,'section');panel.className='admin-access-panel';const eyebrow=element(document,'p','APPARITION / ADMIN');eyebrow.className='eyebrow';const title=element(document,'h1','Admin Access');title.id='admin-access-title';const note=element(document,'p','This temporary client-side gate prevents casual access only. It is not secure authentication.');note.className='admin-access-note';
 const form=element(document,'form'),label=element(document,'label','Password'),input=element(document,'input');input.type='password';input.name='password';input.required=true;input.autocomplete='current-password';label.append(input);const button=element(document,'button','Enter Admin');button.type='submit';button.className='button';const feedback=element(document,'p');feedback.className='error';feedback.setAttribute('role','alert');form.append(label,button,feedback);
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;feedback.textContent='';try{if(!await authorizeAdmin(input.value,storage,digest)){feedback.textContent='Incorrect password. Please try again.';input.select();return;}await revealAdmin(document,storage,load);}catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}});
 const home=element(document,'a','Return to website'),path=document.location?.pathname||'',adminAt=path.indexOf('/admin/');home.href=adminAt<0?'../':path.slice(0,adminAt+1);panel.append(eyebrow,title,note,form,home);main.append(panel);document.body.prepend(main);input.focus();
}
export async function bootAdminGate({document=globalThis.document,storage=globalThis.sessionStorage,load=specifier=>import(specifier),digest=sha256Hex}={}){
 if(adminIsAuthorized(storage))await revealAdmin(document,storage,load);else renderAccessGate(document,storage,load,digest);
}
if(typeof document!=='undefined')bootAdminGate().catch(error=>{const gate=document.querySelector('.admin-access-gate .error');if(gate)gate.textContent=error.message;});
