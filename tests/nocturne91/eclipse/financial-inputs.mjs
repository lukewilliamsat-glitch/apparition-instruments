import {decimal, decimalText} from './economics.mjs?build=sentinel77a-c1';
import {updateFee} from './eclipse-model.mjs?build=sentinel77a-c1';
import {element} from '../nocturne-ui.mjs?build=nocturne90';

const recorded = 'Admin confirmed this amount from the order’s expenditure records.';
const manualFee = 'Admin confirmed this amount from the order’s selling fee records.';

export function mountFinancialInputs({document:d, root, order, getDraft, edit, feedbackChanged}) {
  const sections=element(d,'div');
  sections.className='nocturne-columns eclipse-inline-inputs';
  const direct=section('Other direct costs');
  const selling=section('Selling costs');
  const postage=section('Fulfilment without workshop evidence');
  const feedback=element(d,'p');
  feedback.setAttribute('role','status');
  root.append(sections,feedback);

  function section(title) {
    const group=element(d,'fieldset');
    group.append(element(d,'legend',title));
    sections.append(group);
    return group;
  }
  function addControl(group, title, value, apply) {
    const wrap=element(d,'label',title),input=element(d,'input');
    input.type='text';
    input.inputMode='decimal';
    input.maxLength=24;
    input.value=value==null?'':decimalText(value);
    wrap.append(input);
    group.append(wrap);
    input.addEventListener('input',()=>{
      try {
        const amount=input.value.trim()===''?null:decimal(input.value);
        input.removeAttribute('aria-invalid');
        apply(amount);
        feedback.textContent='';
      }catch(error){
        input.setAttribute('aria-invalid','true');
        feedback.textContent=error.message;
      }
      feedbackChanged();
    });
    return input;
  }
  function confirmation(group,title,checked,apply) {
    const label=element(d,'label'),input=element(d,'input');
    input.type='checkbox';
    input.checked=checked;
    input.addEventListener('change',()=>apply(input.checked));
    label.append(input,d.createTextNode(' '+title));
    group.append(label);
    return input;
  }
  function costEditor(group,key,title) {
    const row=getDraft().costs[key];
    const owned=row.state!=='confirmed'||row.source===recorded;
    if(!owned){
      group.append(element(d,'p','A saved confirmed amount is on record. Review exceptions to make an evidenced correction.'));
      return;
    }
    function setCost(minor,state) {
      const draft=structuredClone(getDraft());
      draft.costs[key]={minor,state,source:state==='confirmed'?recorded:state==='estimated'?'Manually entered estimate':''};
      edit(draft);
    }
    const input=addControl(group,title,row.minor,minor=>{
      if (minor===getDraft().costs[key].minor) return;
      check.checked=false;
      check.disabled=minor===null;
      setCost(minor,minor===null?'unknown':'estimated');
    });
    const check=confirmation(group,'I checked this amount against an order expenditure record',
      row.state==='confirmed',checked=>{
        const amount=getDraft().costs[key].minor;
        if(amount===null) return;
        setCost(amount,checked?'confirmed':'estimated');
      });
    return {input,check};
  }

  let postageControls, postageNote;
  function rebuild(protectedPostage) {
    for (const group of [direct,selling,postage]) while(group.childNodes.length>1)group.lastChild.remove();
    feedback.textContent='';
    const draft=getDraft(), currency=draft.currency;
    costEditor(direct,'other','Other direct costs ('+currency+')');
    if(protectedPostage){
      postageControls=null;
      postageNote=element(d,'p','Review packaging and postage from QUARTERMASTER in the summary above.');
    }else{
      postageControls=costEditor(postage,'shipping','Actual postage ('+currency+')');
      postageNote=element(d,'p','Use this for postage evidenced outside the workshop.');
    }
    postage.append(postageNote);
    const category=order.channel==='WEBSITE'?'payment':'marketplace';
    const matching=draft.fees.filter(row=>row.category===category);
    const row=matching[0];
    if(matching.length>1||matching.some(row=>row.method!=='fixed'||row.direction!=='charge'||row.includes?.length)||
      draft.fees.some(row=>row.includes?.includes(category))||row?.state==='confirmed'&&row.source!==manualFee) {
      selling.append(element(d,'p','Saved selling charges are shown above. Use the exception controls to reconcile a statement or fee credit.'));
      return;
    }
    const getManual=()=>getDraft().fees.find(row=>row.category===category);
    addControl(selling,order.channel==='WEBSITE'?'Payment processing fee ('+currency+')':'Marketplace selling fee ('+currency+')',
      row?.actualMinor??row?.amountMinor??null,amount=>{
        const existing=getManual();
        if(amount===(existing?.actualMinor??existing?.amountMinor??null))return;
        check.checked=false; check.disabled=amount===null;
        const next=updateFee(getDraft(),category,amount,'estimated','Manually entered estimate');
        next.feesComplete=false;
        edit(next);
      });
    const check=confirmation(selling,'I checked this fee against the provider’s record',row?.state==='confirmed',checked=>{
      const existing=getManual(),amount=existing?.actualMinor??existing?.amountMinor??null;
      if(amount!==null)edit(updateFee(getDraft(),category,amount,checked?'confirmed':'estimated',checked?manualFee:'Manually entered estimate'));
    });
    selling.append(element(d,'p','Leave the amount blank when unknown. Confirm the full fee breakdown in exceptions if all charges are accounted for.'));
  }

  function setDisabled(locked) {
    for(const input of sections.querySelectorAll('input')){
      input.disabled=locked || input.type==='checkbox' && !input.parentNode.previousElementSibling?.querySelector('input')?.value.trim();
    }
  }
  return {rebuild,setDisabled,
    setWorkshopProtected(value) {
      if(postageControls&&value){postageControls.input.disabled=true;postageControls.check.disabled=true;
        postageNote.textContent='QUARTERMASTER has recorded evidence for this order. Review it in the summary.';}
    },
    show(visible){sections.hidden=!visible;feedback.hidden=!visible;},
    valid:()=>!root.querySelector('.eclipse-inline-inputs [aria-invalid=true]')
  };
}
