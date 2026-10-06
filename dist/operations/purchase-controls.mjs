// Presentation consumes the current Operations RPC projection, never a banner.
export function purchasePermission(view,{editing=false}={}){
 if(editing)return {allowed:true,message:''};
 const store=view?.apparitionStoreState;
 if(store?.state==='OPEN')return {allowed:true,message:''};
 return {allowed:false,message:store?.state==='ORDERS_PAUSED'?[store.customer_title,store.customer_message].filter(Boolean).join(' · ')||'Ordering is paused. Your saved basket remains available.':store?.customer_message||'Checking ordering availability. Browsing and configuration remain available.'};
}
export function assertPurchaseAllowed(view,options){const result=purchasePermission(view,options);if(!result.allowed)throw Error(result.message);}
let serial=0;
export function bindPurchaseControl(button,{available=()=>true,editing=()=>false}={}){
 const doc=button.ownerDocument,view=doc.defaultView,message=doc.createElement('p');message.className='product-feedback';message.id='purchase-availability-'+(++serial);message.setAttribute('role','status');button.after(message);button.setAttribute('aria-describedby',[button.getAttribute('aria-describedby'),message.id].filter(Boolean).join(' '));
 function update(){const permission=purchasePermission(view,{editing:editing()});button.disabled=!available()||!permission.allowed;message.hidden=permission.allowed;message.textContent=permission.message;}
 view?.addEventListener('apparition:store-status',update);update();return {update,dispose(){view?.removeEventListener('apparition:store-status',update);message.remove();}};
}
