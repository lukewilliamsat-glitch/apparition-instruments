import {createDocumentSession} from './document-session.mjs';
import {initialiseManifest,manifestRegistry,approvedImage,validateComposition} from '../hub-cms/manifest-adapter.mjs';
import {createMediaRepository} from '../hub-media/repository.mjs';
// Existing CMS remains article semantic/persistence authority; interaction is universal.
export function createArticleAdapter({mediaRepository=createMediaRepository()}={}){return {create(page,presentation,context){return createDocumentSession(page,presentation,context,{record:page.article,registry:manifestRegistry,initialise:initialiseManifest,validate:validateComposition,approvedImage,media:async()=>{const [assets,usage]=await Promise.all([mediaRepository.assets(),mediaRepository.usage()]);return [assets,usage.map(u=>({...u,document_id:u.article_id}))];},save:(record,content,manifest,repository)=>repository.saveManifest(record,content,manifest,'DRAFT'),saved:row=>page.article=row});}};}
