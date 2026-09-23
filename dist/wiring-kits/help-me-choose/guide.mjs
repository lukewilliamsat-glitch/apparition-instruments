import {lesPaul,formatKitPrice,specLabels} from '../../les-paul-kits/config.mjs';
import {recommend} from './recommend.mjs';
const group=(key,title,choices,note='')=>({key,title,choices,note});
const unsure=['unsure',"I’m not sure"];
const steps=[
 {title:'What guitar are you working on?',groups:[group('guitar','Choose your guitar',[['les-paul','Les Paul style'],['sg','Gibson / Epiphone SG'],['prs','PRS style'],['strat','Stratocaster / HSS'],['tele','Telecaster'],['other','Another guitar'],unsure],'The current kit supports a passive Les Paul style layout with two volume and two tone controls.')]},
 {title:'What pickups does it have?',groups:[group('pickups','Pickup type',[['humbuckers','Passive humbuckers'],['p90','Passive P90s'],['active','Active pickups / powered electronics'],['other','Another arrangement'],unsure],'Active pickup systems can require different control values. Check the pickup specification if you are unsure.')]},
 {title:'How much are you replacing?',groups:[group('scope','Your project',[['full','The complete volume and tone harness'],['partial','Just a faulty control or individual component'],unsure])]},
 {title:'How do you use your controls?',groups:[group('volume','Do you turn the guitar’s volume down while playing?',[['often','Yes, regularly'],['rarely','Rarely, I mostly leave it up'],unsure]),group('clarity','When you turn down, do you want to retain more high-frequency detail?',[['yes','Yes, that matters to me'],['no','No particular preference'],unsure]),group('feel','How would you like volume and tone to respond?',[['independent','More separate adjustment'],['interactive','I like experimenting with them together'],unsure],'Interacting controls can take more adjustment. There is no single best configuration.')]},
 {title:'Would you like new jack and selector hardware?',groups:[group('hardware','Hardware',[['keep','Keep my existing jack and selector'],['replace',`Replace both (+${formatKitPrice(lesPaul.jack.pureTone.price+lesPaul.selector.switchcraft.price)})`],unsure],`Replacement recommendation: ${lesPaul.jack.pureTone.label} and ${lesPaul.selector.switchcraft.label}. You can change either in the builder.`)]},
 {title:'Do you know the required pot shaft length?',groups:[group('shaft','Mounting depth',[['short',lesPaul.shaft.short.label],['long',lesPaul.shaft.long.label],unsure],'Check the threaded mounting depth of the existing pots. “I’m not sure” will flag this for checking, not guarantee a fit.')]},
 {title:'Would you like a closely matched set of pots?',groups:[group('matching','Pot selection',[['no',lesPaul.matching.standard.label+' · included'],['yes',lesPaul.matching.precision.label+' · +'+formatKitPrice(lesPaul.matching.precision.price)],unsure],lesPaul.matching.precision.description)]}
];
const answers={},mount=document.querySelector('#guide-stage'),progress=document.querySelector('#guide-progress'),status=document.querySelector('#guide-status');let index=0;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function button(text,action,cls='button secondary'){const b=el('button',cls,text);b.type='button';b.addEventListener('click',action);return b;}
function focusHeading(){mount.querySelector('h1,h2')?.focus();}
function render(focus=true){
 status.textContent='';mount.replaceChildren();progress.textContent=`QUESTION ${index+1} / ${steps.length}`;document.querySelector('#guide-meter').value=index;
 const step=steps[index],heading=el('h1','',step.title);heading.tabIndex=-1;mount.append(heading);
 for(const g of step.groups){const fs=el('fieldset'),legend=el('legend','',g.title);fs.append(legend);if(g.note){const p=el('p','guide-note',g.note);p.id='note-'+g.key;fs.setAttribute('aria-describedby',p.id);fs.append(p);}const choices=el('div','guide-choices');for(const [value,text] of g.choices){const label=el('label','guide-choice'),input=el('input');input.type='radio';input.name=g.key;input.value=value;input.checked=answers[g.key]===value;input.addEventListener('change',()=>{answers[g.key]=value;status.textContent='';});label.append(input,el('span','',text));choices.append(label);}fs.append(choices);mount.append(fs);}
 const actions=el('div','guide-actions');if(index)actions.append(button('← Back',()=>{index--;render();}));actions.append(button(index===steps.length-1?'See my configuration →':'Continue →',()=>{if(step.groups.some(g=>!answers[g.key])){status.textContent='Choose an answer for each question, including “I’m not sure” if needed.';mount.querySelector(`input[name="${step.groups.find(g=>!answers[g.key]).key}"]`).focus();return;}if(index===steps.length-1)showResult();else{index++;render();}},'button'));mount.append(actions);if(focus)focusHeading();
}
function showResult(){
 const result=recommend(answers);mount.replaceChildren();progress.textContent='APPARITION / YOUR STARTING POINT';document.querySelector('#guide-meter').value=steps.length;const h=el('h1','',result.title);h.tabIndex=-1;mount.append(h);
 if(result.supported){mount.append(el('p','guide-note','A sensible starting configuration based on your answers. Review the specification and fitment before assembly.'),el('h2','',lesPaul.name),el('p','recommendation-price',formatKitPrice(result.pricing.total)+' · delivery additional'));
 const dl=el('dl','recommendation-spec');for(const [k,v] of Object.entries(result.specification)){if(k==='model')continue;const row=el('div');row.append(el('dt','',specLabels[k]),el('dd','',v));dl.append(row);}mount.append(dl);
 const why=el('details','recommendation-why');why.open=true;why.append(el('summary','','Why these choices?'));const list=el('ul');result.reasons.forEach(reason=>list.append(el('li','',reason)));why.append(list);mount.append(why);
 const check=el('aside','fitment-check');check.append(el('h2','','Before you build'));result.checks.forEach(note=>check.append(el('p','',note)));mount.append(check);
 const a=el('a','button','CONFIGURE THIS KIT →');a.href=result.url;mount.append(a);
 }else{mount.append(el('p','guide-note',result.message));const a=el('a','button',result.route.startsWith('/components')?'Explore components →':'Explore planned kits →');a.href=result.route;mount.append(a);}
 const actions=el('div','guide-actions');actions.append(button('← Review answers',()=>render()),button('Start again',()=>{for(const key of Object.keys(answers))delete answers[key];index=0;render();}));mount.append(actions);focusHeading();
}
render(false);
