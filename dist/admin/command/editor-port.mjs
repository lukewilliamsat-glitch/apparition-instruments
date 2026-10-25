// Local draft preview. A read identity is never promoted to an atomic write revision.
export function createPreviewPort(boundary){
 let owner=null;
 return Object.freeze({kind:'command02-read-preview',owner:()=>owner,release(){owner=null;},
  async read(id,options={}){
   const auth=await boundary.authorize();
   if(!auth.grant.capabilities.draftPreview)throw Object.assign(Error('Local draft preview is not authorised.'),{code:'PERMISSION',outcome:'not-applied'});
   if(owner&&owner!==auth.grant.subject)throw Object.assign(Error('Restore the original identity to view its retained draft.'),{code:'PERMISSION',outcome:'not-applied'});
   const record=await boundary.readProduct(id,{...options,force:true});owner??=auth.grant.subject;return {...record,revision:record.previewRevision};
  },save:boundary.mutations.save,status:boundary.mutations.status
 });
}
