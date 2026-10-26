import {catalogue,detail,emptyFilters,filterCatalogue} from './model.mjs';
// The caller must supply an approved synthetic transport. Never fall back to fetch.
export function createWorkbench({transport,onChange=()=>{}}={}) {
  if(!['command01-synthetic','command05-readonly'].includes(transport?.kind) || typeof transport.list!=='function' || typeof transport.detail!=='function') throw new Error('Explicit read-only catalogue transport required.');
  let alive=true,listGeneration=0,detailGeneration=0,listAbort,detailAbort,pendingList;
  const state={status:'idle',rows:[],filters:emptyFilters(),selectedId:null,detail:null,detailStatus:'idle',error:'',detailError:''};
  const snapshot=()=>({...state,rows:[...state.rows],filters:{...state.filters},visible:filterCatalogue(state.rows,state.filters)});
  const emit=()=>{if(alive)onChange(snapshot());};
  function invalidateDetail(){detailGeneration++;detailAbort?.abort();}
  async function select(id,{focus=true}={}) {
    if(!alive)return;
    if(!state.rows.some(row=>row.id===id))throw new Error('Selected product is unavailable.');
    if(state.selectedId===id&&state.detailStatus==='ready')return;
    invalidateDetail();const generation=detailGeneration;
    detailAbort=new AbortController();const signal=detailAbort.signal;
    state.selectedId=id;state.detail=null;state.detailStatus='loading';state.detailError='';state.focusInspector=focus;emit();
    try{
      const raw=await transport.detail(id,{signal});
      if(!alive||generation!==detailGeneration||state.selectedId!==id)return;
      const result=detail(raw,id),current=state.rows.find(row=>row.id===id);
      if(!current||result.revision!==current.revision)throw new Error('Product changed. Refresh the catalogue before inspecting it.');
      state.detail=result;state.detailStatus='ready';
    }catch(error){
      if(!alive||generation!==detailGeneration||state.selectedId!==id)return;
      state.detailError=error instanceof Error?error.message:'Product details could not be loaded.';state.detailStatus='error';
    }
    emit();
  }
  function refresh({supersede=false}={}) {
    if(!alive)return Promise.resolve();
    if(pendingList&&!supersede)return pendingList;
    const generation=++listGeneration;listAbort?.abort();listAbort=new AbortController();
    const signal=listAbort.signal;
    // Invalidate in-flight details immediately, even if the transport ignores abort.
    invalidateDetail();
    if(state.detailStatus==='loading'){state.detailStatus='waiting';}
    state.status='loading';state.error='';emit();
    const task=(async()=>{
      try{
        const next=catalogue(await transport.list({signal}));
        if(!alive||generation!==listGeneration)return;
        state.rows=next;state.status='ready';
        if(state.selectedId){
          const current=next.find(row=>row.id===state.selectedId);
          if(!current){state.selectedId=null;state.detail=null;state.detailStatus='idle';state.detailError='';}
          else if(state.detail?.revision!==current.revision||state.detailStatus!=='ready'){
            state.detail=null;state.detailStatus='waiting';
            emit();void select(state.selectedId,{focus:false});
          }
        }
      }catch(error){
        if(!alive||generation!==listGeneration)return;
        state.error=error instanceof Error?error.message:'Catalogue could not be loaded.';state.status='error';
        if(state.detailStatus==='waiting'){state.detailStatus='error';state.detailError='Catalogue refresh failed. Retry before loading details.';}
      }finally{
        if(alive&&generation===listGeneration){pendingList=null;emit();}
      }
    })();
    pendingList=task;return task;
  }
  function setFilter(key,value){
    if(!alive)return;
    if(!Object.hasOwn(state.filters,key))throw new Error('Unknown filter.');
    state.filters[key]=String(value);emit();
  }
  function clearFilters(){if(alive){state.filters=emptyFilters();emit();}}
  function close(){if(alive){invalidateDetail();state.selectedId=null;state.detail=null;state.detailStatus='idle';state.detailError='';emit();}}
  function destroy(){alive=false;++listGeneration;listAbort?.abort();invalidateDetail();pendingList=null;}
  emit();return {snapshot,refresh,select,setFilter,clearFilters,close,destroy};
}
