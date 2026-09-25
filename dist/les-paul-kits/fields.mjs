import {lesPaul,defaults,upgradeLabel,resolveLesPaulKit} from './config.mjs';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const lineKey={caps:'capacitors',neckCap:'capacitors',bridgeCap:'capacitors'};
function optionPrice(state,group,value){
 const current=resolveLesPaulKit(state),candidate=resolveLesPaulKit({...state,[group]:value}),key=lineKey[group]||group;
 const amount=resolved=>resolved.pricing.lines.find(line=>line.key===key)?.price;
 // Shaft changes the physical pot; its card shows the change from the
 // currently selected shaft, while the pot line remains the total authority.
 return group==='shaft'?amountFor(candidate,'pots')-amountFor(current,'pots'):amount(candidate);
}
function amountFor(resolved,key){return resolved.pricing.lines.find(line=>line.key===key)?.price;}
function optionOutOfStock(state,group,value){const candidate=resolveLesPaulKit({...state,[group]:value}),roles={pots:['potentiometers'],shaft:['potentiometers'],caps:['neckToneCapacitor','bridgeToneCapacitor'],bleed:['trebleBleeds'],jack:['outputJack'],selector:['selector']}[group]||[];return candidate.availability.unavailable.some(part=>roles.includes(part.role)&&part.stockState==='out-of-stock');}
function capacitorGroups(entries){
 const groups=new Map();for(const [id,option] of Object.entries(entries)){
  if(id==='mixed')continue;
  const value=Number(option.value);
  if(!Number.isFinite(value)||value<=0)continue;
  if(!groups.has(value))groups.set(value,[]);groups.get(value).push([id,option]);
 }
 return [...groups].sort(([a],[b])=>a-b);
}
export function renderKitFields(form){
 const heading=form.querySelector('.form-heading');form.replaceChildren(heading);
 let number=0;
 function group(name,title,entries,{note='',info=false,capacitanceGroups=false}={}){
  const section=el('details','kit-section'),summary=el('summary'),titleRow=el('span','section-heading');section.dataset.option=name;section.open=number===0;titleRow.append(el('span','section-number',String(++number).padStart(2,'0')),el('strong','',title));const selected=el('span','section-selection');selected.dataset.selectedOption=name;summary.append(titleRow,selected);section.append(summary);const fs=el('fieldset'),legend=el('legend','sr-only',title);fs.append(legend);section.append(fs);
  const choices=el('div',capacitanceGroups?'capacitor-groups':'choices two');
  const byCap=capacitanceGroups?new Map(capacitorGroups(entries).map(([value,items])=>[value,items])):null;
  const capContainers=new Map();if(byCap)for(const [value] of byCap){const container=el('div','capacitor-value-group'),heading=el('h3','capacitor-value-heading',value+' µF'),list=el('div','choices two');container.append(heading,list);choices.append(container);capContainers.set(value,list);}
  for(const [id,option] of Object.entries(entries)){
   const wrap=el('div','choice-with-info'),label=el('label','choice'),input=el('input');input.type='radio';input.name=name;input.value=id;input.defaultChecked=defaults[name]===id;input.checked=input.defaultChecked;if(option.enabled===false){wrap.hidden=true;input.disabled=true;input.setAttribute('aria-hidden','true');}
   const resolved=resolveLesPaulKit({...defaults,[name]:id}),capQuantity=resolved.components.filter(part=>['neckToneCapacitor','bridgeToneCapacitor'].includes(part.role)&&part.componentId===id).reduce((sum,part)=>sum+part.quantity,0);
   const amount=optionPrice(defaults,name,id),text=el('span');text.append(el('strong','',name==='caps'&&id!=='mixed'?capQuantity+' × '+option.label:option.label));
   if(name==='caps'&&id!=='mixed'){text.append(el('small','',option.value+' µF'),el('small','',option.component?.manufacturer||'Manufacturer not specified'));}
   const price=el('small',Number.isSafeInteger(amount)&&amount!==0?'paid-upgrade':'',(id==='mixed'?'Choose each capacitor · ':'')+upgradeLabel(amount)+(optionOutOfStock(defaults,name,id)?' · Out of stock':''));price.dataset.optionPrice='';text.append(price);
   if(!info&&option.description)text.append(el('small','',option.description));label.append(input,text);wrap.append(label);
   if(info){const details=el('details','option-info'),summary=el('summary','','Technical details');summary.setAttribute('aria-label','Technical details for '+option.label);details.append(summary,el('p','',option.description));wrap.append(details);}
   (capContainers?.get(Number(option.value))||choices).append(wrap);
  }
  fs.append(choices);if(!Object.values(entries).some(o=>o.enabled!==false))fs.append(el('p','option-note','No eligible options are currently available.'));if(note)fs.append(el('p','option-note',note));form.append(section);return fs;
 }
 const wiring=group('wiring','Wiring style',lesPaul.wiring);const wiringNote=el('p','option-note');wiringNote.id='wiring-note';wiring.append(wiringNote);
 group('pots',lesPaul.builderModel.groups.find(group=>group.key==='pots')?.label||'Potentiometers',lesPaul.pots);
 group('shaft',lesPaul.builderModel.groups.find(group=>group.key==='shaft')?.label||'Shaft length',lesPaul.shaft);
 group('matching','Precision matching',lesPaul.matching);
 const caps=group('caps','Tone capacitors',{...lesPaul.capacitors,mixed:{label:'Mixed pair',price:0,description:'Choose the neck and bridge tone capacitors separately.'}},{info:true,capacitanceGroups:true,note:'One tone capacitor for each pickup circuit. Capacitance changes the tone-control response; series identifies component construction and specification.'});
 const mixed=el('div','mixed-values');mixed.id='mixed-values';mixed.hidden=true;
 for(const [name,labelText] of [['neckCap','Neck tone capacitor'],['bridgeCap','Bridge tone capacitor']]){const label=el('label','',labelText),select=el('select');select.name=name;for(const [id,cap] of Object.entries(lesPaul.capacitors)){const o=el('option','',cap.label+' · '+cap.value+' µF · '+(cap.component?.manufacturer||'Manufacturer not specified'));o.value=id;o.hidden=cap.enabled===false;o.disabled=cap.enabled===false;o.defaultSelected=defaults[name]===id;o.selected=o.defaultSelected;select.append(o);}label.append(select);mixed.append(label);}caps.append(mixed);
 const bleed=group('bleed','Treble bleed · both volume controls',lesPaul.bleed,{info:true,note:'Every upgrade price in this section covers the pair of volume controls.'});bleed.id='treble-bleed-options';bleed.setAttribute('aria-describedby','bleed-availability');
 const availability=el('p','option-note','Treble bleeds are unavailable with our 50s wiring. Select 60s or Modern wiring to add one.');availability.id='bleed-availability';const bleedNote=el('p','bleed-note');bleedNote.id='bleed-note';bleed.append(availability,bleedNote);
 group('jack','Output jack',{...lesPaul.jack,none:{...lesPaul.jack.none,label:'Use my existing output jack'}},{info:true,note:'The complete circuit always requires an output jack. Choose whether we supply a new one.'});group('selector','Toggle switch',{...lesPaul.selector,none:{...lesPaul.selector.none,label:'Use my existing toggle switch'}},{info:true,note:'The complete circuit requires a 3-way toggle. Retain compatible existing hardware or choose a new switch.'});
 const guitarSection=el('details','kit-section'),guitarSummary=el('summary','','Guitar model and year · optional');guitarSection.append(guitarSummary);const guitar=el('fieldset'),legend=el('legend');legend.append(el('span','',String(++number).padStart(2,'0')),document.createTextNode(' Your guitar (optional)'));const label=el('label','','Guitar model and year');label.htmlFor='guitar-model';const input=el('input','kit-model');input.id='guitar-model';input.name='model';input.type='text';input.maxLength=120;input.placeholder='For example: Epiphone Les Paul Standard, 2008';guitar.append(legend,label,input,el('p','option-note','Confirm mounting depth, bushing diameter and knob fit before assembly.'));guitarSection.append(guitar);form.append(guitarSection);
}

export function updateFieldSummaries(form,state){
 const resolved=resolveLesPaulKit(state);
 for(const group of lesPaul.builderModel.groups){for(const input of form.querySelectorAll(`input[name="${group.key}"]`)){const status=resolved.optionAvailability[group.key][input.value],disabled=status==='not-eligible',wrap=input.closest('.choice-with-info');input.disabled=disabled;input.setAttribute('aria-hidden',String(disabled));wrap.hidden=disabled&&!input.checked;}}
 for(const section of form.querySelectorAll('[data-option]')){
  const name=section.dataset.option,output=section.querySelector('[data-selected-option]');
  let label;
  if(name==='caps')label=state.caps==='mixed'?'Mixed pair · neck / bridge · '+upgradeLabel(amountFor(resolved,'capacitors')): '2 × '+lesPaul.capacitors[state.caps].label+' · '+upgradeLabel(amountFor(resolved,'capacitors'));
  else {const option=lesPaul[name][state[name]],input=[...section.querySelectorAll('input[type=radio]')].find(item=>item.value===state[name]);const amount=optionPrice(state,name,state[name]);label=option.label+' · '+(option.enabled===false||input?.disabled?'Unavailable':upgradeLabel(amount));}
  const role={pots:'potentiometers',shaft:'potentiometers',bleed:'trebleBleeds',jack:'outputJack',selector:'selector'}[name];
  if(resolved.availability.unavailable.some(part=>role?part.role===role:name==='caps'&&['neckToneCapacitor','bridgeToneCapacitor'].includes(part.role)))label+=' · Out of stock';
  output.textContent=label;
  for(const input of section.querySelectorAll('input[type=radio]')){
   const price=input.closest('.choice-with-info').querySelector('[data-option-price]');if(price){const amount=optionPrice(state,name,input.value);price.textContent=(name==='caps'&&input.value==='mixed'?'Choose each capacitor · ':'')+upgradeLabel(amount)+(optionOutOfStock(state,name,input.value)?' · Out of stock':'');price.classList.toggle('paid-upgrade',Number.isSafeInteger(amount)&&amount!==0);}
   const unavailable=input.getAttribute('aria-hidden')==='true';
   if(unavailable)input.closest('.choice-with-info').hidden=!input.checked;
  }
 }
}
