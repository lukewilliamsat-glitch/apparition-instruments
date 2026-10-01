// Editorial relationships only: no stock, prices, product records or equations.
import {normaliseCircuitState,circuitStateURL,wiringHandoff,designerHandoff} from '../electronics/state/circuit-state.mjs';
import {makeCircuit} from '../wiring-generator/model.mjs';
import {applyCircuitAnalysis} from '../electronics/state/circuit-state.mjs';
import {deploymentPath} from '../deployment.mjs';
export const topics=[['pots','01','Potentiometers'],['capacitors','02','Capacitors & treble bleeds'],['pickups','03','Pickups & conductors'],['switching','04','Switching & circuits'],['grounding','05','Grounding & output'],['wiring','06','Wiring & soldering'],['diagnosis','07','Diagnosis & troubleshooting'],['tools','08','Tools & interactive labs']];
export const tools={
 circuit:{title:'Signal Forge / Circuit Lab',purpose:'Inspect the supported circuit topology, contacts and conductive paths.',path:'/circuit-forge/',mode:'physical'},
 signal:{title:'Signal Forge / Signal Lab',purpose:'Compare electrical voltage transfer for one selected pickup with Modern wiring. Both, 50s and 60s response remain outside this model.',path:'/circuit-forge/',mode:'signal'},
 wiring:{title:'Wiring Generator',purpose:'Create a physical connection list, conductor reference and printable bench diagram.',path:'/wiring-generator/'},
 bleed:{title:'Treble Bleed Designer',purpose:'Explore capacitor-only and RC networks with explicit pickup, pot and cable assumptions.',path:'/treble-bleed-designer/'},
 kit:{title:'Kit Builder',purpose:'Configure a supported purchasable kit, then review brands, dimensions, fitment, availability and price.',path:'/les-paul-kits/'}
};
export function exampleState(example='default'){
 const s=normaliseCircuitState({configuration:{position:'neck'}});
 if(example==='250k')for(const channel of Object.values(s.responseAssumptions.channels))channel.volumePot=250;
 if(example==='047')s.configuration.neckCap='0.047';
 if(example==='duncan')s.configuration.bleed='duncan';
 if(example==='prs')s.configuration.bleed='prs';
 return s;
}
export function toolURL(id,example='default'){
 const tool=tools[id];if(!tool)throw Error('Unknown tool relationship.');if(id==='kit')return deploymentPath(tool.path);
 const s=exampleState(example),c=applyCircuitAnalysis(makeCircuit(s.configuration),s);
 if(id==='wiring')return wiringHandoff(c);
 if(id==='bleed')return designerHandoff(c).url;
 return circuitStateURL(tool.path,s,{mode:tool.mode});
}
export const articles=[
 {id:'pots',slug:'potentiometers-explained',topic:'pots',title:'Potentiometers explained',intro:'Resistance, taper, loading and the measurements that determine physical fit.',tags:'500k 250k 300k 1M audio log linear shaft resistance volume tone',tool:'signal',example:'250k',product:'potentiometers',existing:true},
 {id:'caps',slug:'capacitors-treble-bleeds',topic:'capacitors',title:'Capacitors and treble bleeds explained',intro:'Understand capacitance, tolerance and the two different jobs a capacitor can do in a guitar.',tags:'0.010 0.015 0.022 0.033 0.047 microfarad nanofarad picofarad voltage capacitor',tool:'signal',example:'047',product:'capacitors',existing:true},
 {id:'bleeds',slug:'treble-bleeds',topic:'capacitors',title:'Choosing a treble bleed in context',intro:'A treble bleed changes a volume circuit. Its effect depends on the pickup, pots, controls and load.',tags:'treble bleed PRS Duncan parallel RC 180pF 1nF 150k taper',tool:'bleed',example:'duncan',product:'treble-bleeds',sections:[
 ['volume','Why response changes with volume','A passive pickup, volume control and cable form an interacting impedance network. Moving the wiper changes the source impedance presented to the cable capacitance and input load. The result can change the high-frequency voltage response as well as the output level.'],
 ['bypass','What the bypass does','A treble bleed connects between volume input and wiper. A capacitor provides a frequency-dependent path around part of the volume resistance. A parallel resistor adds a resistive path and changes the effective volume-control behaviour. This is a circuit change, not a universal repair.'],
 ['networks','Capacitor-only and parallel RC','The supported PRS-style example uses 180 pF. The capacitor-only example uses 1 nF. The Duncan-style example uses 1 nF and 150 kΩ in parallel. These are existing shared circuit choices; brand names describe the convention, not measured pickup data or a guarantee for every instrument.'],
 ['context','Compare the surrounding circuit','Pot resistance and taper, pickup electrical assumptions, cable capacitance, input resistance and control position all matter. There is no universally best network. Compare at the same volume with the same assumptions before choosing a preference.'],
 ['limits','Understand the comparison','Signal Lab models electrical voltage transfer for Modern wiring with Neck or Bridge selected. Its same-volume A/B compares the circuit against no bleed. Designer uses a full-volume reference and supports deeper network exploration. Neither models acoustic SPL, amplifier or speaker response, hearing, or perceived loudness.'],
 ['choose','Choose and check','Start with the smallest change that answers your need. Verify the input and wiper terminals, leave the casing ground separate, and compare the wiring diagram before soldering. A correct equivalent network follows the same electrical laws regardless of branding.'] ]},
 {id:'pickups',slug:'pickup-conductors',topic:'pickups',title:'Pickup conductors and colour conventions',intro:'Separate coil function from wire colour before making a connection.',tags:'pickup colours colors conductor coil start finish series link hot shield braided',tool:'wiring',sections:[
 ['formats','One conductor, two conductors and braid','A single insulated core with an outer braid commonly uses the core for signal and the braid as the return and shield. Two insulated conductors can provide separate signal and return, sometimes with an additional shield. Identify your exact construction from the pickup maker’s documentation.'],
 ['coils','Four conductors and coil ends','A four-conductor humbucker exposes the start and finish of each coil, allowing a normal series connection to be identified. The shared wiring authority names coil functions independently of colour. Coil start and finish are winding references; they do not independently establish magnetic polarity or a complete phase relationship.'],
 ['series','Series link, hot and return','In the supported standard series humbucker, two coil ends form the local series link and are insulated together. The remaining signal lead goes to the volume input; the coil return and separate shield terminate at the authorised ground point. The series link is not a ground connection.'],
 ['colours','Manufacturer colours are conventions','The reference below is rendered from the same pickupConventions registry used by the Generator and Forge. Unresolved profiles show semantic functions rather than invented colours. Check the exact pickup model and manufacturer instructions before relying on a convention.'],
 ['limits','What these colours do not tell you','Colour mappings do not supply measured pickup resistance, inductance or capacitance. Signal Lab presets are illustrative electrical assumptions. Coil split, phase and series/parallel response modelling are deferred.'] ]},
 {id:'switches',slug:'selectors',topic:'switching',title:'Selector contacts and pickup paths',intro:'A selector connects terminals. Its physical layout must match the circuit you are wiring.',tags:'selector 3 way toggle switch common open closed contact',tool:'circuit',sections:[
 ['contacts','Open and closed contacts','A closed contact provides a conductive path between terminals. An open contact interrupts that path. A selector is a set of these connections, not an electronic mixer with its own gain.'],
 ['threeway','The supported three-way circuit','In the shared Les Paul topology, Neck connects the neck volume output to the common output, Bridge connects the bridge volume output, and Both connects both branches. Circuit Lab shows the actual closed contacts and traces to the jack. Connecting Both physically does not mean Signal Lab has a validated coupled response model.'],
 ['physical','Identify terminals before soldering','Common means the shared output contact in this context. Switch terminal positions vary by construction. Use the exact switch specification and a continuity test with the guitar disconnected; do not infer terminal function from its location alone.'],
 ['inspect','Use the right tool','Circuit Lab explains paths and contacts. Wiring Generator presents physical destinations. More complex switch topology and coil-level response are not added by this guide.'] ]},
 {id:'circuits',slug:'wiring-circuits-explained',topic:'switching',title:'Guitar wiring circuits explained',intro:'Follow the signal, understand the controls and compare supported passive wiring.',tags:'modern 50s 60s volume tone circuit topology',tool:'circuit',existing:true},
 {id:'ground',slug:'grounding-output',topic:'grounding',title:'Ground, shield and the output jack',intro:'Follow the signal return and keep shielding roles clear.',tags:'ground hum noise shield drain bridge strings sleeve tip output jack continuity',tool:'wiring',sections:[
 ['return','Signal ground and output','Signal ground is the circuit’s reference and return path. The output jack sleeve connects to that return; the tip carries the output signal. Identify tip and sleeve contacts on the actual jack, rather than using their apparent position.'],
 ['casings','Pot casings and shared return','The supported wiring uses authorised casing solder points and a shared ground harness. A grounded lug is a separate electrical connection from the metal casing. Check each required bond and the final sleeve connection.'],
 ['shield','Ground is a node; shielding is a role','A shield or drain conductor can connect to the ground reference while its purpose is to reduce interference reaching the signal wiring. Coil return and shield are separately identified even when they terminate at one casing point. A shield is not an interchangeable signal lead.'],
 ['bridge','Bridge and string ground','Where the instrument design requires it, the bridge/string bond connects the metal hardware to the guitar’s ground network. Touching grounded strings can change picked-up interference; it does not by itself prove the entire wiring is correct.'],
 ['test','Check continuity safely','Disconnect the guitar from the amplifier before resistance or continuity checks. Compare the intended ground points with jack sleeve, and inspect for loose joints or shorts to hot terminals. A continuity reading alone does not diagnose every intermittent fault. This guide concerns passive guitars; do not open mains-powered amplifier equipment.'] ]},
 {id:'install',slug:'les-paul-installation',topic:'wiring',title:'Wire a Les Paul using your kit',intro:'Prepare, connect, inspect and test against the diagram for your supported configuration.',tags:'solder installation wiring kit bench continuity',tool:'wiring',existing:true},
 {id:'troubleshoot',slug:'troubleshooting',topic:'diagnosis',title:'Passive guitar troubleshooting',intro:'Start with a symptom, narrow the checks, and inspect the appropriate circuit view.',tags:'hum crackle no output mute intermittent selector problem diagnosis',tool:'circuit'},
 {id:'glossary',slug:'glossary',topic:'tools',title:'Guitar electronics glossary',intro:'Concise definitions of the terms used in Apparition’s guides and tools.',tags:'wiper lug common sleeve capacitance resistance taper load terminology',tool:'circuit'},
 {id:'tools',slug:'tools',topic:'tools',title:'Choose the right tool',intro:'Learn, inspect, model, wire and configure a kit with clear capability boundaries.',tags:'Signal Forge Circuit Lab Signal Lab generator designer kit builder tools',tool:'signal'}
];
export const article=id=>{const a=articles.find(a=>a.id===id);if(!a)throw Error('Unknown article relationship.');return a;};
export const articleURL=id=>deploymentPath('/luthier-hub/'+article(id).slug+'/');
export const paths=[
 ['Guitar electronics 101',['glossary','circuits','pots','caps','switches','ground']],
 ['Pots & tone controls',['pots','caps','circuits']],
 ['Treble bleeds',['pots','bleeds','caps']],
 ['Understanding your pickups',['pickups','switches','ground']],
 ['Wiring a guitar',['circuits','pickups','ground','install']],
 ['Diagnosing common problems',['troubleshoot','ground','switches']]
];
export const relationships={
 potentiometers:{article:'pots',tool:'signal',example:'250k',role:'A resistive control with a movable wiper. Its value loads the circuit; its taper describes resistance versus rotation.'},
 capacitors:{article:'caps',tool:'signal',example:'047',role:'A frequency-dependent impedance. In the tone branch, capacitance and pot setting influence the electrical response.'},
 'treble-bleeds':{article:'bleeds',tool:'bleed',example:'duncan',role:'A network between volume input and wiper, changing the response at reduced volume.'},
 selector:{article:'switches',tool:'circuit',role:'Contacts connect selected pickup outputs to a common output.'},
 jack:{article:'ground',tool:'wiring',role:'Tip carries signal; sleeve provides the circuit return.'},
 pickup:{article:'pickups',tool:'wiring',role:'A pickup source and its conductor convention are distinct from the assumed electrical response model.'}
};
export function relationshipLinks(category){const r=relationships[category];if(!r)return [];return [['Learn: '+article(r.article).title,articleURL(r.article)],['Explore: '+tools[r.tool].title,toolURL(r.tool,r.example)]];}
export const symptoms=[
 ['No output','Check the cable and amplifier input with a known working guitar first, then jack tip/sleeve wiring, unwanted hot-to-ground shorts and selector output.','ground','wiring'],
 ["One pickup does not work",'Compare both single-pickup positions. Inspect its hot lead, return, series link and selector branch against the diagram.','pickups','circuit'],
 ['Volume does not fully mute','Check the ground-end lug bond and the input/wiper identification against the selected wiring. Do not assume every two-volume topology behaves identically.','pots','wiring'],
 ['Tone control does nothing','Inspect the capacitor connection, tone wiper and required ground bond. Check the selected wiring style before moving a lead.','caps','signal'],
 ['Hum changes when touching strings','Inspect bridge/string ground and shielding continuity. This symptom can be consistent with interference pickup but is not proof of a specific fault.','ground','wiring'],
 ['Hum does not change when touching strings','Try another cable and environment, then inspect shielding, return paths and pickup type. Single-coil interference is not always a wiring defect.','ground','wiring'],
 ['Crackling pot','Check whether movement of the shaft or a nearby lead reproduces it. Inspect joints and the control; use only suitable contact maintenance for the part.','pots','wiring'],
 ['Intermittent output','With the guitar disconnected, inspect loose jack contacts, fractured joints and leads that move or short. Avoid pulling delicate pickup wires.','ground','wiring'],
 ['Selector position not working','Identify the actual common and contact pairs with a disconnected continuity test. Compare the expected path in Circuit Lab.','switches','circuit'],
 ['Treble bleed behaves strangely','Verify input/wiper terminals and whether the resistor is parallel or series. Compare the pot, cable/load and volume assumptions in the Designer.','bleeds','bleed']
];
export const glossary=[
 ['Capacitance','Ability to store charge per voltage difference; measured in farads. Guitar values commonly use µF, nF and pF.','caps'],
 ['Resistance','Opposition to current in a resistive path; measured in ohms (Ω).','pots'],
 ['Potentiometer','A resistive track with two ends and a movable wiper.','pots'],
 ['Audio / log taper','A non-linear relationship between rotation and wiper resistance, commonly used for volume controls. Exact laws vary.','pots'],
 ['Linear taper','A nominally linear relationship between rotation and wiper resistance.','pots'],
 ['Wiper','The moving contact on a potentiometer track.','pots'],
 ['Lug','A physical terminal for making an electrical connection.','install'],
 ['Ground','The circuit reference and return node; not automatically mains protective earth.','ground'],
 ['Shield','A conductive screen intended to reduce interference coupling into signal wiring.','ground'],
 ['Hot','The signal-bearing conductor or node relative to the circuit return.','pickups'],
 ['Series','Components connected consecutively so the same branch current passes through them.','bleeds'],
 ['Parallel','Branches connected across the same two electrical nodes.','bleeds'],
 ['Treble bleed','A network between a volume input and wiper that changes reduced-volume frequency response.','bleeds'],
 ['Tone capacitor','A capacitor in the tone branch that contributes frequency-dependent impedance.','caps'],
 ['Pickup conductor','A lead connected to a coil end or shield; its colour follows a convention.','pickups'],
 ['Coil start','One winding end identified as the start in a documented convention.','pickups'],
 ['Coil finish','The other winding end identified as the finish; electrical phase also depends on winding and magnetic orientation.','pickups'],
 ['Series link','The local connection between two coil ends in a series humbucker.','pickups'],
 ['Selector contact','A conductive switch surface that connects or disconnects terminals.','switches'],
 ['Common','A shared selector output contact in the supported pickup circuit.','switches'],
 ['Tip','The signal contact of the supported mono output jack.','ground'],
 ['Sleeve','The return contact of the supported mono output jack.','ground'],
 ['Load','The impedance presented to a source by the rest of the circuit.','pots'],
 ['Input resistance','The resistive part of the external input load represented in the model.','pots'],
 ['Cable capacitance','The cable’s capacitance between signal and return, included as a load assumption.','caps']
];
