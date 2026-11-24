// Isolated workshop overlay. The 84B production entry remains byte-for-byte sealed.
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const modes = new Set(['disabled', 'workshop', 'drain']);
const states = new Set(['none', 'reserved', 'released', 'packed']);
const money = new Intl.NumberFormat('en-GB', {style:'currency', currency:'GBP'});
const boundedInt = (n,min,max) => Number.isSafeInteger(n) && n >= min && n <= max;

const rpc = {
  view: ['GET','quartermaster84w_workspace'],
  command: ['POST','quartermaster84w_pack'],
  receipt: ['GET','quartermaster84w_command_result'],
  material: ['POST','quartermaster84w_create_material'],
  receive: ['POST','quartermaster84w_receive']
};

export function stageTransport({backend, auth, boundedJSON, fetcher=fetch}) {
  const stage = new URL(backend.url);
  if (stage.origin !== 'https://prwmowexhonguvtiywsy.supabase.co' || stage.pathname !== '/' ||
      stage.username || stage.password || stage.search || stage.hash) {
    throw new Error('The workshop overlay requires the isolated staging host');
  }
  return async (operation, values, signal) => {
    if (!Object.hasOwn(rpc,operation)) throw new Error('Unknown workshop operation');
    const [method,name] = rpc[operation];
    const url = new URL('/rest/v1/rpc/'+name,stage.origin);
    if (method==='GET') url.search = new URLSearchParams(values);
    const access = await auth.accessToken({signal,bounded:true});
    if (!access) throw new Error('Admin session required');
    let issuer;
    try {
      const payload = access.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      issuer = JSON.parse(atob(payload)).iss;
    } catch {}
    if (issuer !== stage.origin+'/auth/v1') throw new Error('Use a staging Admin session');
    const response = await fetcher(url,{
      method,signal,cache:'no-store',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',
      headers:{apikey:backend.publishableKey,Authorization:'Bearer '+access,
        ...(method==='POST'?{'Content-Type':'application/json'}:{})},
      body:method==='POST'?JSON.stringify(values):undefined
    });
    if (!response.ok) throw new Error('Workshop request declined');
    return boundedJSON(response,96000,{signal});
  };
}

function goodContext(value) {
  if (value?.schema!==1 || !modes.has(value.mode)) return false;
  if (value.mode==='disabled') return value.order===null;
  const o=value.order;
  return typeof o?.reference==='string' && o.reference.length<=128 && states.has(o.state) &&
    boundedInt(o.generation,0,Number.MAX_SAFE_INTEGER) && boundedInt(o.revision,0,Number.MAX_SAFE_INTEGER) &&
    ['canPick','canRelease','canReserve','canReceive','canRecordPostage'].every(k=>typeof o[k]==='boolean') &&
    Array.isArray(o.picks) && o.picks.length<=100 &&
    o.picks.every(p=>typeof p.id==='string' && p.id.length<=120 && typeof p.title==='string' &&
      boundedInt(p.quantity,1,10000) && boundedInt(p.picked,0,p.quantity)) &&
    Array.isArray(o.materials) && o.materials.length<=25 &&
    o.materials.every(m=>typeof m.sku==='string' && typeof m.title==='string' && boundedInt(m.available,0,1000000)) &&
    Array.isArray(o.batches) && o.batches.length<=25 &&
    o.batches.every(b=>typeof b.id==='string' && uuid.test(b.id) && boundedInt(b.remaining,1,10000)) &&
    ['material','estimate','actual'].every(k=>o.cost?.[k]===null || boundedInt(o.cost?.[k],0,10000000)) &&
    (o.parcel===null || (Array.isArray(o.parcel?.mm) && o.parcel.mm.length===3 &&
      o.parcel.mm.every(n=>boundedInt(n,1,1500)) && boundedInt(o.parcel.grams,1,25000) &&
      typeof o.parcel.format==='string' && o.parcel.format.length<=48 &&
      (o.parcel.tracking===null || typeof o.parcel.tracking==='string' && o.parcel.tracking.length<=48)));
}

export function mountWorkshop({document, root, orderId, request, makeRequestId=()=>crypto.randomUUID()}) {
  const stop = new AbortController();
  const el = (tag,text) => {
    const item=document.createElement(tag);
    if (text!==undefined) item.textContent=text;
    return item;
  };
  const status=el('p','Choose an existing order in Orders.');
  status.setAttribute('role','status');
  const back=el('a',uuid.test(orderId??'')?'Back to this order':'Back to Orders');
  back.href='/admin/orders/'+(uuid.test(orderId??'')?'?id='+encodeURIComponent(orderId):'');
  const view=el('div');view.className='workshop-record';
  root.replaceChildren(back,el('h1','Quartermaster'),status,view);
  let pending=false;
  let current;
  const call=(name,body)=>request(name,body,AbortSignal.any([stop.signal,AbortSignal.timeout(8000)]));
  const close=()=>{stop.abort();root.replaceChildren();};

  function section(heading) {
    const node=el('section');
    node.append(el('h2',heading));view.append(node);
    return node;
  }
  const count=(label,max,value=undefined,min=0)=>({label,type:'number',max,value,min});
  const text=(label,max,pattern,required=true)=>({label,type:'text',max,pattern,required});
  const select=(label,choices)=>({label,choices});
  const size=label=>['length','width','height'].map(axis=>count(label+' '+axis+' (mm)',1500,undefined,1));
  const uuidPattern='[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}';
  const skuPattern='[A-Za-z0-9][A-Za-z0-9_\\-]{0,47}';

  function form(parent, caption, fields, submit) {
    const node=el('form');node.className='workshop-pick';
    const read=[];
    for(const field of fields) {
      const label=el('label',field.label);
      const input=el(field.choices?'select':'input');
      input.required=field.required??true;
      if(field.choices) {
        for(const [value,caption] of field.choices) {
          const choice=el('option',caption);choice.value=value;input.append(choice);
        }
      } else {
        input.type=field.type;
        if(field.type==='number') {
          input.min=String(field.min);input.max=String(field.max);input.step='1';
        } else {
          input.maxLength=field.max;
          if(field.pattern) input.pattern=field.pattern;
        }
        if(field.value!==undefined) input.value=String(field.value);
      }
      label.append(input);node.append(label);
      read.push(()=>field.type==='number'?input.valueAsNumber:input.value.trim());
    }
    const button=el('button',caption);button.type='submit';node.append(button);parent.append(node);
    node.addEventListener('submit',event=>{
      event.preventDefault();
      if(!pending && node.checkValidity()) void submit(read.map(value=>value()));
    });
  }

  async function save(operation,body) {
    pending=true;
    for(const x of view.querySelectorAll('button')) x.disabled=true;
    status.textContent='Saving workshop evidence…';
    try {
      await call(operation,body);
    } catch {
      if(stop.signal.aborted) return;
      if(operation==='command') {
        try {
          const receipt=await call('receipt',{p_request:body.p_request});
          if (!receipt) throw new Error('No recorded outcome');
        } catch {
          if(!stop.signal.aborted) status.textContent='The outcome could not be confirmed. Reload this order before making another change.';
          return;
        }
      } else {
        status.textContent='The outcome could not be confirmed. Recheck the existing entry before trying again.';
        return;
      }
    }
    pending=false;
    await load();
  }
  function command(action) {
    return save('command',{p_order:orderId,p_request:makeRequestId(),
      p_generation:current.generation,p_revision:current.revision,p_action:action});
  }

  function render(result) {
    view.replaceChildren();
    if(result.mode==='disabled') {
      status.textContent='Packing is disabled.';
      return;
    }
    const o=current=result.order;
    status.textContent=o.reference+' · '+(result.mode==='drain'?'Release retained packing':o.state);
    if(o.canReserve) {
      const materials=o.materials.filter(m=>m.available>0).map(m=>[m.sku,m.title+' · '+m.available+' available']);
      const panel=section('Packaging availability');
      if(materials.length) form(panel,'Reserve packaging',[select('Packaging material',materials)],([sku])=>command({kind:'reserve',sku}));
      else panel.append(el('p','No packaging materials available.'));
    }
    if(o.picks.length) {
      const picking=section('Saved order pick list');
      for(const part of o.picks) {
        if(o.canPick) form(picking,'Save picked count',[count(part.title+' · '+part.quantity+' required',part.quantity,part.picked)],
          ([quantity])=>command({kind:'pick',component:part.id,quantity}));
        else picking.append(el('p',part.title+' · '+part.picked+' / '+part.quantity+' picked'));
      }
    }
    if(o.canPick && o.batches.length && o.picks.length && o.picks.every(p=>p.picked===p.quantity)) {
      form(section('Complete packing'),'Record completed pack',[
        select('Packaging batch',o.batches.map(b=>[b.id,b.id.slice(-8)+' · '+b.remaining+' remaining'])),
        ...size('Outer'),count('Parcel weight (g)',25000,undefined,1),
        select('Postal format',[['letter','Letter'],['large-letter','Large letter'],['small-parcel','Small parcel']]),
        text('Tracking reference',48,'[A-Za-z0-9 \\-]{4,48}',false),count('Estimated postage (pence)',1000000)
      ],([purchase,length,width,height,grams,format,tracking,estimate])=>
        command({kind:'complete',purchase,mm:[length,width,height],grams,format,tracking:tracking||null,estimate}));
    }
    if(o.canRelease) form(section('Release packing'),'Release reserved packaging',[],()=>command({kind:'release'}));
    const costs=section('Packing and postage evidence');
    for(const [name,key] of [['Packaging used','material'],['Postage estimate','estimate'],['Postage recorded','actual']]) {
      costs.append(el('p',name+' · '+(o.cost[key]===null?'Not recorded':money.format(o.cost[key]/100))));
    }
    if(o.parcel) {
      costs.append(el('p',o.parcel.mm.join(' × ')+' mm · '+o.parcel.grams+' g · '+o.parcel.format));
      if(o.parcel.tracking) costs.append(el('p','Tracking · '+o.parcel.tracking));
    }
    if(o.canRecordPostage) form(costs,'Record actual postage',[count('Actual postage (pence)',1000000),
      text('Receipt reference',100,'[A-Za-z0-9_.\\-]{3,100}')],([minor,receipt])=>command({kind:'postage',minor,receipt}));
    if(o.canReceive) {
      form(section('Packaging stock'),'Create packaging SKU',[text('Packaging SKU',48,skuPattern),
        text('Material name',120),...size('Inner'),...size('Outer'),count('Tare (g)',25000),count('Reorder threshold',100000)],
        ([p_sku,p_title,ii,iw,ih,oi,ow,oh,p_tare,p_reorder])=>
          save('material',{p_sku,p_title,p_inner:[ii,iw,ih],p_outer:[oi,ow,oh],p_tare,p_reorder}));
      form(section('Packaging receipts'),'Record packaging receipt',[text('Packaging SKU',48,skuPattern),
        text('Supplier record ID',36,uuidPattern),text('Supplier reference',100),
        count('Units received',10000,undefined,1),count('Batch cost (pence)',10000000)],
        ([p_sku,p_supplier,p_ref,p_qty,p_total])=>save('receive',{p_id:makeRequestId(),p_sku,p_supplier,p_ref,p_qty,p_total}));
    }
  }
  async function load() {
    status.textContent='Loading packing record…';
    try {
      const result=await call('view',{p_order:orderId});
      if (!goodContext(result)) throw new Error('Unexpected workshop response');
      if (!stop.signal.aborted) render(result);
    } catch {
      if (!stop.signal.aborted) {
        view.replaceChildren();
        status.textContent='No accessible packing record. Return to Orders or reload to try again.';
      }
    }
  }
  if(uuid.test(orderId??'')) void load();
  return {lock:close,destroy:close};
}
