let adminRepository=null;
export const setOperationsRepository=repo=>{adminRepository=repo;};
export function currentOperationsRepository(){if(!adminRepository)throw Error('Admin operations repository is unavailable.');return adminRepository;}
export function createOperationsRepository(transport){
 const send=async(resource,options)=>{const r=await transport.send(resource,options),data=await r.json();if(!r.ok)throw Error(data.message||'Operations could not be saved.');return data;};
 return Object.freeze({store:async()=>(await send('site_operations',{query:'?select=*'}))[0],posts:()=>send('news_posts',{query:'?select=*&order=updated_at.desc'}),audit:()=>send('site_operations_audit',{query:'?select=*&order=created_at.desc&limit=30'}),saveStore:change=>send('rpc/set_store_operations',{method:'POST',body:{p_change:change}}),savePost:post=>send('rpc/save_news_post',{method:'POST',body:{p_post:post}})});
}
