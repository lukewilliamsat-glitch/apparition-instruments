const names={
  edit:'Edit material details',archive:'Archive material',reactivate:'Reactivate material',
  'stocktake-in':'Stocktake increase',opening:'Register opening stock',
  'stocktake-out':'Stocktake decrease',damaged:'Record damage',lost:'Record lost packaging',
  missing:'Record missing packaging','supplier-return':'Return to supplier',
  'receipt-overcount':'Correct an overcounted receipt','receipt-undercount':'Correct an undercounted receipt',
  'reverse-receipt':'Reverse an unused receipt',reference:'Correct purchase reference','batch-cost':'Correct batch cost'
};
const positive=new Set(['stocktake-in','opening','receipt-undercount']);
const negative=new Set(['stocktake-out','damaged','lost','missing','supplier-return','receipt-overcount']);
const moneyPattern='[0-9]{1,6}([.][0-9]{1,2})?';
export async function drawManagement({body,call,writer,field,el,link,summary,cards,href,heading,gbp,
  dateTime,poundsToMinor,sku,batchId,canFinance,historyPage,signal}) {
  const [detail,suppliers]=await Promise.all([
    call('detail',{p_sku:sku,p_page:historyPage,...(batchId?{p_batch:batchId}:{})}),
    call('suppliers').catch(()=>[])
  ]);
  if(signal.aborted) return;
  const s=detail.state;
  const b=s.batch;
  const title=b?'Batch '+b.reference:s.title;
  body.append(el('h3',title));
  summary(body,[['SKU',s.displaySku],['Material',s.title],['Status',s.archived?'Archived':'Active'],
    ['Physical stock',s.physical],['Reserved',s.reserved],['Available',s.physical-s.reserved],
    ['Description',s.description||null],['Supplier',b?.supplierName],['Received',b?.received],
    ['Batch remaining',b?.remaining],['Batch total',b?gbp(b.totalMinor):null],['Packed units',b?.usedUnits],
    ['Cost already recorded against packs',b?gbp(b.usedMinor):null],['Received at',b?dateTime.format(new Date(b.receivedAt)):null]]);
  body.append(link(b?'Back to purchase history':'Back to packaging',href(b?'purchasing':'packaging',{sku})));
  if(detail.mode==='workshop'){
    const box=el('section');
    box.append(el('h3','Make an audited correction'));
    const actions=b?['reference','stocktake-out','damaged','lost','missing','supplier-return','receipt-overcount',
      ...(!s.archived?['receipt-undercount']:[]),'reverse-receipt',...(canFinance?['batch-cost']:[])]
      :['edit',s.archived?'reactivate':'archive',...(!s.archived?['stocktake-in',...(s.physical===0?['opening']:[])]:[])];
    const choice=field('Choose a change',{choices:[['','Select a change'],...actions.map(id=>[id,names[id]])]});
    const area=el('div');
    box.append(choice.wrapper,area);body.append(box);
    const number=(label,min,max,value='')=>field(label,{type:'number',min,max,step:'1',value});
    const reference=(label,value='')=>field(label,{value,maxLength:100,pattern:'.{3,100}'});
    const cost=(label,value='')=>field(label,{value,inputMode:'decimal',pattern:moneyPattern,maxLength:9});
    const toPence=value=>{
      const minor=poundsToMinor(value);
      if(minor===null) throw new Error('Enter an amount up to £100,000 with up to two decimal places.');
      return minor;
    };
    choice.input.addEventListener('change',()=>{
      const op=choice.input.value;
      area.replaceChildren();
      if(!actions.includes(op))return;
      let fields=[], data=()=>({});
      if(op==='edit'){
        fields=[field('SKU reference',{value:s.displaySku,maxLength:48,pattern:'[A-Za-z0-9][A-Za-z0-9_\\-]{0,47}'}),
          field('Packaging name',{value:s.title,maxLength:120}),field('Description',{value:s.description,maxLength:240,required:false}),
          ...[['Inner',s.inner],['Outer',s.outer]].flatMap(([side,dimensions])=>
            ['length','width','height'].map((axis,i)=>number(side+' '+axis+' (mm)',1,1500,dimensions[i]))),
          number('Tare weight (g)',0,25000,s.tare),number('Reorder threshold',0,100000,s.reorder)];
        data=([displaySku,title,description,il,iw,ih,ol,ow,oh,tare,reorder])=>
          ({displaySku,title,description,inner:[il,iw,ih],outer:[ol,ow,oh],tare,reorder});
      } else if(positive.has(op)){
        const eligible=op==='receipt-undercount'?suppliers.filter(x=>x.id===b.supplier):suppliers;
        if(!eligible.length){
          area.append(el('p','An active supplier is required to attribute the added stock.'));
          return;
        }
        fields=[field('Supplier',{choices:[['','Select supplier'],...eligible.map(x=>[x.id,x.name])],
          value:eligible.length===1?eligible[0].id:''}),reference('Source or correction reference'),
          number('Units to add',1,10000),cost('Total cost of added units (GBP)')];
        data=([supplier,reference,quantity,price])=>({supplier,reference,quantity,totalMinor:toPence(price)});
      } else if(negative.has(op)){
        fields=[number('Units to remove',1,Math.max(1,b.remaining))];
        data=([quantity])=>({quantity});
      } else if(op==='reference'){
        fields=[reference('Correct purchase reference',b.reference)];
        data=([reference])=>({reference});
      } else if(op==='batch-cost'){
        fields=[cost('Corrected batch total (GBP)',(b.totalMinor/100).toFixed(2))];
        if(b.usedUnits>0) fields.push(reference('New reference for the remaining units'));
        data=([price,reference])=>({totalMinor:toPence(price),...(reference?{reference}:{})});
        area.append(el('p','Previously packed units keep their recorded cost. A part-used batch moves only its remaining units to a corrected batch.'));
      } else if(op==='reverse-receipt'){
        area.append(el('p','A reversal removes all units from this unused receipt and keeps the original record.'));
      } else if(op==='archive'){
        area.append(el('p','Archived stock stays in history and is hidden from new receipts and reservations.'));
      }
      fields.push(field('Reason for this change',{maxLength:240,pattern:'.{3,240}'}));
      writer(area,names[op],fields,values=>{
        const reason=values.pop();
        const body={p_request:crypto.randomUUID(),p_sku:sku,p_batch:batchId,
          p_expected:detail.revision,p_action:op,p_reason:reason,p_values:data(values)};
        return call('change',body);
      },'Change saved. The audit history has been updated.',
      'Change unconfirmed. Reload and check history before trying again. A stale record, conflicting reference or reserved stock can block a change.');
    });
  }
  const history=el('section');history.append(el('h3','Adjustment history'));body.append(history);
  cards(history,detail.history,'No audited changes recorded.',(card,r)=>{
    card.append(el('h4',names[r.action]??r.action),el('p',r.reason));
    summary(card,[['Recorded',dateTime.format(new Date(r.at))],
      ['Previous SKU',r.before?.displaySku],['Current SKU',r.after.displaySku],
      ['Previous physical stock',r.before?.physical],['New physical stock',r.after.physical],
      ['Previous batch reference',r.before?.batch?.reference],['Batch reference',r.after.batch?.reference],
      ['Previous batch cost',r.before?.batch?gbp(r.before.batch.totalMinor):null],
      ['Batch cost',r.after.batch?gbp(r.after.batch.totalMinor):null],
      ['Replacement batch',r.after.replacement?.reference]]);
  });
  const target=page=>href(heading==='Purchasing'?'purchasing':'packaging',{sku,manage:1,
    ...(batchId?{batch:batchId}:{}),history:page});
  if(historyPage>0) history.append(link('Previous changes',target(historyPage-1)));
  if(detail.hasMore) history.append(link('Older changes',target(historyPage+1)));
}
