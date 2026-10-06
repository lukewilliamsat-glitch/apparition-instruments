// Explicitly authored public repository content, rendered by the existing CMS
// document/template contract. A published CMS record takes precedence if adopted.
import {makeGuide} from './guides.mjs';
const guide=makeGuide('reading-a-circuit-model','Reading a Guitar Circuit Model','wiring','Separate the connections a circuit model describes, the response it can analyse and the physical checks still required before building.',['circuits','lugs','values','pickups'],['signal','wiring'],[],[
 ['Start with a question',
  'Use Circuit Lab to ask where a connection goes or what a selector connects. Use Signal Lab to compare the supported electrical response under the displayed assumptions. A connection drawing and a response plot answer different questions; neither is a guarantee that a particular part fits your guitar.',
  'Start with a modelled guitar reference in Guitar & Pickups. Choose the controls and selector before changing values. Read the Wiring, Response and Kit capability messages: support for one output does not imply support for all three.'],
 ['Read the connection, not its position on the screen',
  'Select a component, terminal or wire to inspect its role and connections. External conductors and closed internal switch contacts are distinct. A line crossing is not permission to solder the conductors together; follow terminal identity and the connection list.',
  'For the conventional dependent volume path, the signal enters volume lug 3 and leaves the wiper, lug 2. The grounded end is lug 1. The output jack uses TIP for signal and SLEEVE for return. Physical orientation and contact numbering must be verified on the actual part. Other intentionally supported wiring arrangements may route the controls differently; use their own connection list.'],
 ['Treat a response as a conditional comparison',
  'The displayed response belongs to the selected supported circuit, pickup assumptions, control positions, cable capacitance and input load. Change one assumption at a time and compare the resulting electrical transfer. A plotted difference does not establish how audible that difference will be.',
  'Read unsupported messages literally. An unmodelled switching state is not a zero response or a failed instrument. Combined-pickup and other unsupported response states must not be inferred from a single-pickup plot. Circuit Lab may still describe a supported connection arrangement when response analysis is unavailable.'],
 ['Continue without losing the question',
  'Undo and redo circuit edits while experimenting. Save a named project on this browser, or share its circuit settings without the private project name and local notes. Local saves are not cloud backups.',
  'Open the Wiring Diagram Generator only when the wiring handoff is available. Its printable drawing and SVG export describe supported connections. A kit handoff is conditional on actual supported component values, not merely the guitar name. Check stock, dimensions, shaft fit and the maker’s documentation separately before ordering or building.'],
 ['A practical comparison',[
  'Choose a supported reference and one pickup position. Note the capability messages.',
  'Inspect the output path and the selected control terminals in Circuit Lab.',
  'Open Signal Lab only if response is available; note the pickup and load assumptions.',
  'Change one supported value or control position, compare, then undo the change.',
  'Save or share the state and follow the relevant wiring or learning link.'
 ]]
],[['Guitar circuit fundamentals','/luthier-hub/wiring-circuits-explained/'],['Potentiometer terminals','/luthier-hub/guitar-pot-lug-numbering-wiring/']]);
guide.content.published_at=guide.content.content_updated_at='2026-10-06';
export const repositoryGuides=[{...guide,id:'acd71dd3-cda3-54f1-9d35-1c4a10542e69',template_key:'generic'}];
export function withRepositoryGuides(records){return [...records,...repositoryGuides.filter(g=>!records.some(r=>r.guide_key===g.guide_key))];}
