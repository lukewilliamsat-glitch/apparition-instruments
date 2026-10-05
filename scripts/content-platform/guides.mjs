// Original supporting editorial content. Existing primary guides and revisions are untouched.
const text=value=>({type:'text',text:value}),p=value=>({type:'paragraph',content:[text(value)]}),h=value=>({type:'heading',attrs:{level:2},content:[text(value)]}),list=items=>({type:'bullet_list',content:items.map(value=>({type:'list_item',content:[p(value)]}))}),source=(title,href)=>({type:'paragraph',content:[{type:'text',text:title,marks:[{type:'link',attrs:{href}}]}]});
const make=(key,title,category,intro,related,tools,components,sections,sources)=>({guide_key:key,content:{version:1,title,slug:key,category,intro,seo_title:title,meta_description:intro,indexable:true,primary_intent:null,related,tools,components,published_at:'2026-10-05',content_updated_at:'2026-10-05',body:{version:1,slots:{main:{type:'doc',content:[...sections.flatMap(([heading,...blocks])=>[h(heading),...blocks.map(block=>Array.isArray(block)?list(block):p(block))]),h('References and scope'),...sources.map(([title,url])=>source(title,url)),p('This guide describes passive instrument electronics. Verify the actual part documentation and disconnected circuit before changing a connection. Tool links below are for supported configurations and do not imply that every modification in this guide is modelled.')]}}}}});
export const expansionGuides=[
make('independent-dependent-volumes','Independent vs Dependent Guitar Volume Controls','potentiometers','Understand why one volume can silence both pickups in a combined selector position, and what changes when the pickup is connected to the wiper.',['lp-controls','lugs','modern-50s','values'],['wiring','signal'],['potentiometers'],[
 ['Begin with the symptom',
 'On many two-volume passive guitars, selecting both pickups and turning either volume fully down silences the whole output. That can be normal operation rather than a failed pickup or selector. The two controls share a connection at the selector in that position. A volume wiper at the grounded end of its track can therefore ground the shared signal connection.',
 'Test the two single-pickup selector positions first. If each pickup works alone but the combined position goes silent only when one volume reaches zero, record that behaviour before assuming the harness is faulty. If a pickup is silent in its own position, investigate that separate fault rather than explaining everything as volume interaction.'],
 ['Follow terminals, not diagram orientation',
 'In the conventional volume arrangement used in Apparition terminal references, lug 3 is the signal-input end, lug 2 is the wiper/output and lug 1 is the grounded end. These identities describe the pot with the stated reference orientation. Confirm the actual part orientation, and keep its metal casing separate from the resistive track terminals.',
 'For two conventional volumes feeding a selector, the selector joins their wiper outputs when both pickups are selected. At minimum, one wiper reaches the grounded track end. That creates a low-resistance route from the shared output to ground. The practical result follows the connection topology, not the pot brand or an unexplained defect.'],
 ['What the independent arrangement changes',
 'A commonly used independent-volume arrangement connects the pickup to the wiper and takes the outgoing signal from the opposite signal-side track end, with the other track end grounded. This exchanges input and output connections relative to the conventional arrangement; it does not rename the wiper or alter physical lug numbers.',
 'At zero, the pickup-connected wiper reaches ground, while the outgoing connection remains separated from that ground by the track. The other pickup is therefore not simply shorted through that control. Independent means a useful change in the zero-volume interaction. It does not mean the two sources or their loads are completely isolated.'],
 ['The trade-off is still an electrical network',
 'Changing the arrangement also changes the impedance seen by the pickup as the knob moves. The response and useful sweep can differ from the conventional circuit. Tone connections and treble-bleed placement also need to match the intended topology. Moving a single wire while retaining every other assumption can produce confusing results.',
 'Modern versus 50s tone wiring is another choice. It concerns where the tone network connects relative to the volume control and should not be treated as a synonym for independent volumes. Decide separately which interaction and tone connection you want.'],
 ['A bounded bench check',[
 'Disconnect the guitar from the amplifier and record the original wiring before making changes.',
 'Identify each volume wiper and track end with the actual part drawing or an isolated resistance test.',
 'Compare the signal and return paths in each selector position, including both volumes at zero and full.',
 'After continuity checks, compare control behaviour with the same cable and amplifier settings; do not treat a drawing as a promise about perceived sound.'
 ],'Use the existing Les Paul control and lug guides for the conventional harness first. The Generator and Signal Forge links are references for their explicitly supported topologies; an independent-volume modification is not automatically covered by the current model.']
],[['StewMac: volume-pot wiring and independent control','https://www.stewmac.com/video-and-ideas/online-resources/learn-about-guitar-pickups-and-electronics-and-wiring/understanding-guitar-wiring-part-3-how-is-a-volume-pot-wired/'],['Seymour Duncan: Les Paul wiring variants','https://www.seymourduncan.com/blog/tips-and-tricks/lespaulwiring']]),
make('pickup-phase-switching','Pickup Phase Switching: Signal Polarity and Shield Ground','pickups','Separate relative signal polarity from magnetic polarity, coil splitting and shielding before adding a phase switch.',['pickups','coil-split-guide','series-parallel-guide','push-pull-dpdt'],['wiring'],['potentiometers'],[
 ['Relative polarity is the useful question',
 'A phase-reversing switch commonly exchanges one pickup’s signal and coil-return connections. This reverses its electrical signal polarity relative to another pickup. The familiar effect occurs when both signals are combined: their frequency-dependent contributions can reinforce or cancel differently.',
 'There is no second pickup signal to cancel against when that pickup is selected alone. A polarity reversal of the entire isolated pickup should therefore not be described as a new single-pickup equaliser. Additional switching, asymmetric wiring or a fault can change that conclusion, so establish which circuit is actually being switched.'],
 ['Why the result is not perfect cancellation',
 'Neck and bridge pickups sense different locations on the string and need not have identical response or level. Reversing one signal in a combined position does not subtract two identical recordings. The surviving result depends on pickup placement, construction, wiring, control settings and load.',
 'Descriptions such as hollow or reduced low-frequency output are listening descriptions, not a universal numerical response or proof that the pickups are incorrectly manufactured. A deliberate out-of-phase combination is an option; it should be distinguished from an unexpected cancellation after replacing a pickup.'],
 ['Keep chassis and shield grounded',
 'A pickup with separate coil conductors and a shield/chassis conductor allows the coil connections to be exchanged while the shield remains connected to ground. The bare drain wire is not a interchangeable signal lead. Covers, baseplates and other exposed metal must keep their intended ground connection.',
 'A two-wire pickup can tie its coil return to its cover or baseplate internally. Reversing those two wires may put metal shielding on the signal connection. Single-coil construction can add further limitations involving pole pieces and coil insulation. Check the maker’s documented lead arrangement; do not assume every pickup can be reversed by a simple external swap.'],
 ['DPDT switching and coil modes',
 'A suitable DPDT switch can exchange two signal connections using two poles. Verify the common contacts and both switch states with the disconnected part; rear-view orientation and manufacturer numbering vary. Use a documented wiring reference rather than copying six terminal numbers from an unrelated switch.',
 'Reversing an entire humbucker’s output is different from reversing one of its coils internally. The latter changes the relationship between the coils and may affect both string-signal addition and hum cancellation. Coil splitting and series/parallel switching are also separate operations. A combined control should be analysed state by state.'],
 ['Troubleshoot the combination methodically',[
 'Confirm that each pickup has normal output when selected alone.',
 'Document the maker’s coil, series-link and separate shield identities.',
 'Test the switch contact pairs in both positions before installing jumpers.',
 'Keep shields grounded and verify that no switch state shorts the output unexpectedly.',
 'Compare the combined setting at matched volume settings; do not use wire colour alone to infer polarity.'
 ],'The existing Generator can help inspect supported signal/ground routes. This article does not add a new phase-switch topology to the shared electrical authority.']
],[['Fralin: separate coil leads and chassis ground','https://www.fralinpickups.com/2020/09/29/reverse-pickup-polarity-multiple-leads/'],['Fralin: limitations when reversing single-coil leads','https://www.fralinpickups.com/2020/04/10/how-to-reverse-pickup-phase/comment-page-1/'],['Seymour Duncan: pickup polarity and phase','https://www.seymourduncan.com/blog/latest-updates/pickup-polarity-and-phase-made-simple']]),
make('push-pull-dpdt','Push/Pull Pots and DPDT Switching Fundamentals','pickups','Treat a push/pull control as a potentiometer and a separate switch, then identify the two poles and their throw contacts before choosing a modification.',['pots','lugs','coil-split-guide','pickup-phase-switching','partial-coil-splits'],['wiring'],['potentiometers'],[
 ['Two devices share one control',
 'A conventional push/pull guitar control combines a rotary potentiometer with a mechanically operated switch. The three resistive-track terminals still perform the pot’s normal task. The switch terminals are a separate contact system; pulling the shaft does not, by itself, tell you how the pot or pickups are connected.',
 'A DPDT switch means double-pole, double-throw: two separate common contacts can each connect to one of two throw contacts. The poles move together mechanically. That description does not require a connection between the poles and does not identify the contact numbering of your particular part.'],
 ['Identify commons with a meter',
 'Many push/pull switches present six contacts in two groups of three, but orientation and numbering are not universal. In a common layout, each middle contact is a pole common. Confirm that on the actual disconnected switch rather than relying on which row looks central in a photograph.',
 'For one pole, find the contact that connects to one neighbour in the pushed position and the other neighbour in the pulled position. Repeat for the second pole. Record the two contact maps. A continuity check is more informative than saying the switch is on or off because a DPDT typically selects between routes.'],
 ['Fit is part of the specification',
 'The potentiometer value and taper, shaft type, bushing length, thread, body depth and switch form all matter. A control that fits an SG cavity may not fit the same way in another instrument. Check the pot and switch drawing, available cavity depth and knob compatibility before ordering a replacement.',
 'The Bourns PDB183 datasheet is one example of a documented DPDT push/pull part. Its contact and dimension information applies to that model. It is not a universal drawing for CTS, Alpha or every Bourns variant. Avoid translating terminal numbers across products without verifying their functions.'],
 ['Choose a complete switching task',
 'Coil splitting can use a pole to route an accessible humbucker series junction toward ground. Relative phase reversal usually needs two poles to exchange two coil-signal connections while leaving the shield grounded. Other modifications require their own complete switching map.',
 'Count the independent routes needed in every state. A six-terminal switch is not automatically capable of every combination of split, series/parallel and phase functions at once. A pot fitted in the tone position can carry a switch function independently of its tone-track wiring, provided the complete documented circuit is retained.'],
 ['Plan before soldering',[
 'Keep the three pot terminals, metal casing and six switch contacts distinct in your notes.',
 'Label actual commons and throws using continuity measurements in both positions.',
 'Check required pickup conductors and keep chassis/shield leads out of signal-reversing paths.',
 'Inspect clearance so exposed terminals cannot contact shielding or adjacent parts.',
 'Verify both switch states after assembly before reconnecting the amplifier.'
 ],'Use the related coil-split and phase guides to understand the intended function before choosing a switch diagram. Supported Generator drawings remain the authority for the configurations they actually expose.']
],[['Bourns PDB183: switch type, contact drawing and dimensions','https://www.bourns.com/data/global/pdfs/PDB183.pdf'],['Fralin: push/pull switching examples','https://www.fralinpickups.com/2017/03/29/push-pull-pots-mods/'],['Seymour Duncan: push/pull installation context','https://www.seymourduncan.com/blog/latest-updates/how-to-add-push-pull-pot-wiring-to-a-les-paul-style-guitar']]),
make('pickup-dc-resistance-output','Pickup DC Resistance Is Not an Output Rating','pickups','Use resistance measurements to investigate coil continuity and wiring state, while keeping output, inductance and electrical response separate.',['pickups','pickup-inductance','series-parallel-guide','coil-split-guide'],['signal'],[],[
 ['What the meter actually measures',
 'A DC resistance reading measures opposition to a small direct current through the connected winding path. It is useful for checking continuity and comparing an identified coil with its documented specification. It is not a measurement of the voltage generated by a moving guitar string.',
 'A pickup’s resistance depends on winding length, conductor dimensions and material, as well as temperature. Two different designs can have similar resistance and substantially different magnetic systems or electrical behaviour. A larger resistance number does not establish a universally louder, better or more powerful pickup.'],
 ['Compare like with like',
 'Within one design family, resistance may help identify a winding variant because additional turns can also add wire length. Across different wire gauges, magnet systems and geometries, the same shortcut becomes unreliable. Read the maker’s output description and test conditions separately from the DCR figure.',
 'Actual generated voltage depends on string motion and the pickup’s transduction system, then interacts with the surrounding electrical load. Pickup height and the measurement setup matter. A catalogue’s DCR, resonant-peak and output descriptions should not be collapsed into a single ranking.'],
 ['Measure the intended coil path',
 'An installed measurement at the jack includes whatever the selector and controls connect. A pot track can provide a parallel resistance path, and another selected pickup can change the reading. A measurement lower than the isolated specification is not sufficient proof of a damaged winding.',
 'For an isolated measurement, disconnect the relevant conductors from parallel circuit paths as appropriate and follow the manufacturer’s lead identification. With a four-conductor humbucker, establish which leads belong to each coil and how the coils are connected. Treat the separate shield as shielding, not an extra winding terminal.'],
 ['Wiring modes change resistance without defining output',
 'Two equal coils of resistance R give 2R in series and R/2 in parallel in the ideal DC resistance calculation. Selecting one coil gives approximately R. These are circuit relationships; the output voltage does not follow the same numerical ratios under every load or excitation.',
 'The measurement can still be a useful sanity check of a switching circuit. If a intended full-series state reads like one isolated coil, review the series junction and switch connections. If the reading is unstable, inspect leads and probe contact before deciding that the pickup itself is defective.'],
 ['Record enough context',[
 'Record the pickup model, lead arrangement, selected wiring state and whether the coil was isolated.',
 'Allow measurements to stabilise and compare at similar temperatures; warmer copper winding resistance can be higher.',
 'Avoid holding probe tips across the measurement path or treating a poor contact as an open winding.',
 'Use the expected range from the actual maker, rather than an unrelated pickup with a similar name.',
 'Investigate unusual readings together with continuity, mechanical condition and audible symptoms.'
 ],'Signal Forge uses explicit pickup and loading assumptions for a bounded response model. A DCR reading alone does not supply all of those assumptions or predict a complete amplified sound.']
],[['Seymour Duncan: resistance and output are different measurements','https://www.seymourduncan.com/blog/latest-updates/pickup-resistance-vs-output'],['Seymour Duncan support: resistance measurement and temperature','https://seymourduncan.zendesk.com/hc/en-us/articles/360036534074-How-Can-I-Measure-the-DC-Resistance-of-a-Pickup'],['Seymour Duncan: DC readings in different coil modes','https://www.seymourduncan.com/blog/swd/what-readings-do-you-get-if-a-humbucking-pickup-is-in-series-humbucking-split-out-of-phase-with-itself-and-parallel']]),
make('pickup-inductance','Pickup Inductance: A Useful Circuit Parameter, Not a Tone Score','pickups','Understand inductive impedance and resonance without treating a henry reading as a complete description of a pickup.',['pickup-dc-resistance-output','cable-capacitance','values','tone','series-parallel-guide'],['signal'],[],[
 ['Inductance describes part of the winding behaviour',
 'A pickup winding behaves as more than a DC resistance. Its changing current produces a changing magnetic field, and the winding’s inductance contributes frequency-dependent impedance. Inductance is measured in henries. A DC ohmmeter does not measure it.',
 'The winding and magnetic construction influence inductance. The pickup also has resistance, capacitance and losses. A useful model states those assumptions separately rather than treating the inductance number as a complete prediction of output or perceived sound.'],
 ['Frequency changes the opposition to current',
 'For an ideal inductor, inductive reactance is proportional to frequency and inductance: XL = 2πfL. The equation describes an ideal circuit element. A real pickup is a transducer with additional winding and magnetic effects, not an isolated perfect inductor connected to an ideal source.',
 'This distinction explains why the same resistance reading can accompany different frequency response. It does not justify ranking pickups by inductance alone. Measurements need a stated method and operating frequency; two meters or test fixtures can report different equivalent values for a lossy device.'],
 ['The surrounding circuit contributes to resonance',
 'Inductance interacts with pickup winding capacitance and the capacitance presented by an unbuffered cable. A simple ideal LC estimate is f ≈ 1/(2π√LC). This is a bounded approximation, not the full response of a guitar with volume and tone controls.',
 'Resistance and losses affect the height and breadth of the response feature. The tone network is also frequency-dependent. Adding a tone capacitor to the circuit should not be interpreted as simply substituting that capacitor for every other capacitance in the ideal formula.'],
 ['Use measurements comparatively and state the setup',
 'An isolated winding or documented pickup mode gives a more interpretable inductance test than an unknown installed harness. Record the test frequency, equivalent-series or parallel setting, fixture and whether the pickup is split, series-connected or parallel-connected.',
 'Core and metal losses can make an equivalent inductance frequency-dependent. Published values from different test methods may not be directly comparable. A practical comparison should hold the measurement method and surrounding load constant, and report uncertainty instead of inventing excessive precision.'],
 ['Turn the parameter into a useful question',[
 'Which coil mode does the number describe?',
 'What cable capacitance and amplifier input are connected to the passive pickup?',
 'Are pot resistance, knob position and tone connection the same in the comparison?',
 'Does the measurement method match the maker’s stated conditions?',
 'Which parts of the real instrument are outside the simplified model?'
 ],'Use Signal Forge to change one supported pickup or load assumption at a time. Keep its modelling limits separate from mechanical pickup placement, string motion, amplifier behaviour and listening preference.']
],[['Seymour Duncan: pickup inductance background','https://www.seymourduncan.com/blog/latest-updates/inductance-what-it-is-and-why-it-matters'],['Seymour Duncan: pickup impedance and response','https://www.seymourduncan.com/blog/latest-updates/impedance-how-it-works-in-your-pickup'],['Seymour Duncan: resistive and capacitive loading context','https://www.seymourduncan.com/blog/tips-and-tricks/250k-pots-versus-500k-pots-going-deeper-into-the-subject']]),
make('cable-capacitance','Guitar Cable Capacitance and the Passive Pickup Load','wiring','Treat an unbuffered guitar cable as part of the electrical load, then distinguish capacitance per metre, total capacitance and buffered connections.',['pickup-inductance','values','tone','bleeds','ground'],['signal','bleed'],[],[
 ['A passive cable contributes capacitance',
 'The signal conductor and surrounding shield are separated by insulating material. That geometry gives the cable capacitance between signal and return. In a passive guitar connection, it forms part of the frequency-dependent load seen by the pickup and controls.',
 'For the same cable construction, a longer length generally contributes more capacitance. The relationship is an electrical parameter, not evidence of a material having a preferred musical character. Construction, length, connector condition and handling noise are separate considerations.'],
 ['Per-metre figures are not total cable figures',
 'Cable datasheets may specify capacitance per metre or per foot, with a measurement frequency and temperature. Total cable capacitance is approximately the per-length figure multiplied by cable length, with connector and fixture contributions included where relevant.',
 'For example, a hypothetical 100 pF/m cable of 3 m contributes about 300 pF, while 6 m contributes about 600 pF before those extra contributions. This is an arithmetic illustration, not a specification for every cable. Check the actual manufacturer’s units before entering a value into a tool.'],
 ['The pickup and controls determine the consequence',
 'Cable capacitance interacts with pickup inductance and other circuit capacitances. Changing it can shift the electrical response and resonance. Pickup resistance, pot loading, tone settings and the amplifier input influence the observed result, so cable length alone is not a complete predictor.',
 'The effect of rolling down a conventional volume control also depends on the impedance between the pickup, wiper and cable. A treble-bleed network changes that frequency-dependent relationship. Choosing a bleed without stating cable/load assumptions can make two otherwise similar tests difficult to compare.'],
 ['A buffer changes which source drives the cable',
 'After an appropriate low-output-impedance buffer, the following cable is driven by that buffer rather than directly by the passive pickup. The cable before the first active buffer remains part of the pickup-side circuit. Identify whether a pedal is actually buffered in the operating/bypass state being used.',
 'Active pickups and onboard electronics need their own stated output and load assumptions. Do not transfer a passive guitar’s cable calculation uncritically to every active instrument. The relevant question is the complete connection path, including which device drives each cable segment.'],
 ['A repeatable comparison',[
 'Use the same guitar, pickup mode, volume/tone positions and amplifier input for the comparison.',
 'Record cable length and capacitance units; measure an unplugged cable if the meter supports it.',
 'Separate a capacitance comparison from crackle, broken connections or excessive handling noise.',
 'Change one load assumption at a time in the supported tool; do not call a preference an objective improvement.',
 'When adding a buffer, record its location and bypass state so the pickup-side cable is still identified.'
 ],'Signal Forge and Treble Bleed Designer expose supported load assumptions. Use a documented total capacitance estimate, and keep the model separate from a guarantee about the entire amplified rig.']
],[['Mogami W2524: capacitance units and stated conditions','https://mogamicable.com/category/products/W2524.php'],['Seymour Duncan: resistive and capacitive pickup loading','https://www.seymourduncan.com/blog/tips-and-tricks/250k-pots-versus-500k-pots-going-deeper-into-the-subject']]),
make('partial-coil-splits','Partial Coil Splits: Resistor Loading at the Series Junction','pickups','Understand what a partial-split resistor changes, why it is not a coil tap, and why the value belongs to a particular pickup and wiring arrangement.',['coil-split-guide','push-pull-dpdt','pickups','series-parallel-guide','pickup-dc-resistance-output'],['wiring'],['potentiometers'],[
 ['Start with the full humbucker connection',
 'In a conventional series humbucker, two coils are connected through a series junction and their string-signal contributions combine. A full split commonly routes that junction to ground, bypassing one coil in the documented lead arrangement. The coil retained depends on which end is hot, which end is grounded and which junction is switched.',
 'Manufacturer wire colours identify leads only within that manufacturer’s scheme. Establish coil start/end, series link and separate shield identities before copying a switching diagram. A grounded shield should not become part of a coil-selection experiment.'],
 ['The resistor makes the bypass incomplete',
 'In a partial-split arrangement, the switched series junction reaches ground through a resistor rather than a direct wire. The bypassed coil is therefore not simply removed by a zero-resistance short. The remaining contribution depends on that resistor and the pickup’s frequency-dependent impedances.',
 'This is a circuit description. It does not supply a universal percentage split or a guaranteed match to a separate single-coil pickup. A humbucker’s two coils need not be identical, and cable, control settings and loading can change the practical comparison.'],
 ['Do not confuse a split with a tap',
 'A coil tap requires an additional connection brought out from partway through a winding. Splitting a humbucker selects or bypasses a coil using the accessible inter-coil connection. A partial split uses a finite bypass resistance. These are different constructions and should not be described as interchangeable.',
 'Four-conductor humbuckers often expose the connections needed for external coil-mode switching, but the available leads and internal construction still need verification. A vintage-style two-conductor lead does not automatically expose the series junction needed for this modification.'],
 ['Choose values in a stated context',
 'A resistor value recommended by a pickup maker belongs to the stated pickup and wiring example. Fralin publishes partial-split examples; those examples should not be treated as a universal value for every humbucker. A different winding or retained coil can need a different compromise.',
 'Compare a documented full-series state, a full split and the proposed partial split under the same pickup height, cable and control settings. Record which coil remains directly in the signal path. A partial split does not guarantee full hum cancellation, and the residual noise behaviour must be evaluated rather than assumed.'],
 ['Verify both switch positions',[
 'Measure the isolated switching contacts first and identify the actual common/throw pairs.',
 'Confirm the full-series state keeps the intended junction and does not route the output to ground.',
 'Confirm the split state reaches the junction through the chosen resistor and keeps the shield grounded.',
 'Check resistance/continuity as a wiring sanity check, not as a complete output measurement.',
 'Insulate exposed resistor leads and inspect clearance to pot casings and cavity shielding.'
 ],'Read the existing coil-splitting guide before treating the partial-split connection as a modification. The Generator link supports only its documented configurations; this article does not extend the shared electrical model.']
],[['Fralin: documented partial-split switching example','https://www.fralinpickups.com/diagram/coil-split-two-pickups-partial-split-resistor/'],['Fralin: resistor application context','https://www.fralinpickups.com/product/resistors/'],['Fralin: push/pull and partial-split explanation','https://www.fralinpickups.com/2017/03/29/push-pull-pots-mods/']]),
make('output-jack-faults','Output Jack Wiring and Common Passive Guitar Faults','troubleshooting','Identify jack TIP and SLEEVE by function, then separate contact, mechanical and solder faults from pickup or control problems.',['ground','grounding-guide','troubleshoot','lugs'],['wiring'],[],[
 ['Identify the two electrical connections',
 'For a conventional passive mono instrument output, the plug TIP carries the signal and the SLEEVE is the common return/shield connection. Identify the corresponding jack contacts using the actual part drawing or continuity to an inserted plug. Do not assign them by solder-lug length or a photograph’s orientation.',
 'Open-frame, enclosed, stereo and switching jacks can have different contact layouts. Extra terminals can provide a ring connection or switched contacts. Active instruments may use a jack contact for battery switching. Follow that circuit’s documentation rather than grounding every unused-looking terminal.'],
 ['Check the cable before opening the instrument',
 'A faulty cable or plug can imitate a loose jack, intermittent solder joint or silent pickup. Try a known-working instrument cable and a known-working input before replacing guitar parts. Record whether moving the plug, rotating it or changing selector positions reproduces the fault.',
 'With the guitar unplugged from the amplifier, continuity checks can trace the cable TIP and SLEEVE to the intended jack terminals. Avoid measuring resistance on an energised circuit. This guide covers instrument electronics, not work inside amplifiers or their power supplies.'],
 ['Mechanical looseness can become an electrical problem',
 'A jack that rotates when its mounting nut loosens can twist or strain attached wires. Prevent the jack body turning while addressing its mounting hardware, and check for suitable clearance and washers. Use the actual part’s installation instructions; excessive force can damage hardware or the instrument.',
 'Inspect whether the plug engages the intended contacts and whether a contact or terminal touches conductive cavity shielding. A terminal that only shorts when the jack is installed can make the loose assembly appear healthy on the bench. Inspect the assembled clearances, not just a free-floating drawing.'],
 ['Separate an open connection from a short',
 'A broken signal connection, failed TIP contact or fractured joint can interrupt the output. A signal terminal contacting ground can also produce silence. A poor return path can produce noise or intermittency. The symptom alone does not uniquely identify which connection failed.',
 'Compare continuity across the intended cable contact and jack terminal while gently moving the disconnected assembly. Inspect the joint, conductor and strain path. Test the circuit’s signal-to-ground resistance in a documented selector/control state, since pot and pickup paths make that reading different from an isolated bare jack.'],
 ['Before deciding to replace the part',[
 'Confirm the external cable and amplifier input first.',
 'Identify TIP/SLEEVE electrically with the correct plug and actual part reference.',
 'Check mounting rotation, wire strain, contact engagement and clearance to shielding.',
 'Inspect intended connections for intermittency while the instrument is disconnected.',
 'After any repair, verify the installed assembly and every selector/control state used in normal operation.'
 ],'The Wiring Diagram Generator can show the supported instrument signal path to jack TIP and return to SLEEVE. Keep those terminal identities distinct; changing a jack drawing should never reverse the circuit’s signal and return authority.']
],[['Switchcraft 11: mono two-conductor jack reference','https://www.switchcraft.com/1-4-mono-2-conductor-jack-w-nut-and-washer-open-circuit/11/'],['Switchcraft: manufacturer drawings with TIP/SLEEVE identities','https://www.switchcraft.com/assets/1/24/11W07-W11_CD.pdf']])
];
