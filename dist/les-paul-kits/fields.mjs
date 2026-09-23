import {lesPaul,defaults,upgradeLabel} from './config.mjs';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function renderKitFields(form){
 const heading=form.querySelector('.form-heading');form.replaceChildren(heading);
 let number=0;
 function group(name,title,entries,{note='',info=false}={}){
  const section=el('details','kit-section'),summary=el('summary'),titleRow=el('span','section-heading');section.dataset.option=name;section.open=number===0;titleRow.append(el('span','section-number',String(++number).padStart(2,'0')),el('strong','',title));const selected=el('span','section-selection');selected.dataset.selectedOption=name;summary.append(titleRow,selected);section.append(summary);const fs=el('fieldset'),legend=el('legend','sr-only',title);fs.append(legend);section.append(fs);
  const choices=el('div','choices two');
  for(const [id,option] of Object.entries(entries)){
   const wrap=el('div','choice-with-info'),label=el('label','choice'),input=el('input');input.type='radio';input.name=name;input.value=id;input.defaultChecked=defaults[name]===id;input.checked=input.defaultChecked;if(option.enabled===false){wrap.hidden=true;input.disabled=true;input.setAttribute('aria-hidden','true');}
   const text=el('span');text.append(el('strong','',option.label),el('small',option.price?'paid-upgrade':'',(id==='mixed'?'Choose each capacitor':upgradeLabel(option.price))+(name==='bleed'&&id!=='none'?' · both controls':'')));
   if(!info&&option.description)text.append(el('small','',option.description));label.append(input,text);wrap.append(label);
   if(info){const details=el('details','option-info'),summary=el('summary','','Technical details');summary.setAttribute('aria-label','Technical details for '+option.label);details.append(summary,el('p','',option.description));wrap.append(details);}
   choices.append(wrap);
  }
  fs.append(choices);if(!Object.values(entries).some(o=>o.enabled!==false))fs.append(el('p','option-note','No eligible options are currently available.'));if(note)fs.append(el('p','option-note',note));form.append(section);return fs;
 }
 const wiring=group('wiring','Wiring style',lesPaul.wiring);const wiringNote=el('p','option-note');wiringNote.id='wiring-note';wiring.append(wiringNote);
 group('pots','Potentiometers',lesPaul.pots);
 group('shaft','Shaft length',lesPaul.shaft);
 group('matching','Precision matching',lesPaul.matching);
 const caps=group('caps','Tone capacitors',Object.fromEntries([...Object.entries(lesPaul.capacitors).map(([id,o])=>[id,{...o,price:o.price*2,label:'2 × '+o.label}]),['mixed',{label:'Mixed pair',price:0,description:'Choose the neck and bridge tone capacitors separately.'}]]),{info:true,note:'One tone capacitor for each pickup circuit. Capacitance changes the tone-control response; series identifies component construction and specification.'});
 const mixed=el('div','mixed-values');mixed.id='mixed-values';mixed.hidden=true;
 for(const [name,labelText] of [['neckCap','Neck tone capacitor'],['bridgeCap','Bridge tone capacitor']]){const label=el('label','',labelText),select=el('select');select.name=name;for(const [id,cap] of Object.entries(lesPaul.capacitors)){const o=el('option','',cap.label+' · '+upgradeLabel(cap.price));o.value=id;o.hidden=cap.enabled===false;o.disabled=cap.enabled===false;o.defaultSelected=defaults[name]===id;o.selected=o.defaultSelected;select.append(o);}label.append(select);mixed.append(label);}caps.append(mixed);
 const bleed=group('bleed','Treble bleed · both volume controls',lesPaul.bleed,{info:true,note:'Every upgrade price in this section covers the pair of volume controls.'});bleed.id='treble-bleed-options';bleed.setAttribute('aria-describedby','bleed-availability');
 const availability=el('p','option-note','Treble bleeds are unavailable with our 50s wiring. Select 60s or Modern wiring to add one.');availability.id='bleed-availability';const bleedNote=el('p','bleed-note');bleedNote.id='bleed-note';bleed.append(availability,bleedNote);
 group('jack','Output jack',{...lesPaul.jack,none:{...lesPaul.jack.none,label:'Use my existing output jack'}},{info:true,note:'The complete circuit always requires an output jack. Choose whether we supply a new one.'});group('selector','Toggle switch',{...lesPaul.selector,none:{...lesPaul.selector.none,label:'Use my existing toggle switch'}},{info:true,note:'The complete circuit requires a 3-way toggle. Retain compatible existing hardware or choose a new switch.'});
 const guitarSection=el('details','kit-section'),guitarSummary=el('summary','','Guitar model and year · optional');guitarSection.append(guitarSummary);const guitar=el('fieldset'),legend=el('legend');legend.append(el('span','',String(++number).padStart(2,'0')),document.createTextNode(' Your guitar (optional)'));const label=el('label','','Guitar model and year');label.htmlFor='guitar-model';const input=el('input','kit-model');input.id='guitar-model';input.name='model';input.type='text';input.maxLength=120;input.placeholder='For example: Epiphone Les Paul Standard, 2008';guitar.append(legend,label,input,el('p','option-note','Confirm mounting depth, bushing diameter and knob fit before assembly.'));guitarSection.append(guitar);form.append(guitarSection);
}

export function updateFieldSummaries(form,state){
 for(const section of form.querySelectorAll('[data-option]')){
  const name=section.dataset.option,output=section.querySelector('[data-selected-option]');
  let label;
  if(name==='caps')label=state.caps==='mixed'?'Mixed pair · neck / bridge': '2 × '+lesPaul.capacitors[state.caps].label;
  else {const option=lesPaul[name][state[name]];label=option.label+' · '+(option.enabled===false?'Unavailable':upgradeLabel(option.price));}
  output.textContent=label;
  for(const input of section.querySelectorAll('input[type=radio]')){
   const unavailable=input.getAttribute('aria-hidden')==='true';
   if(unavailable)input.closest('.choice-with-info').hidden=!input.checked;
  }
 }
}
