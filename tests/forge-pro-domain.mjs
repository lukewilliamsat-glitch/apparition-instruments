import assert from 'node:assert/strict';
import {createSnapshot,validateSnapshot,localFromSnapshot,compareRevisions,normaliseMeasurement,passportProjection,canonical} from '../dist/forge-pro/domain.mjs';
import {normaliseProject} from '../dist/electronics/state/project.mjs';
import {createReference} from '../dist/electronics/instrument/configuration.mjs';
import {buildSheetModel,renderBuildSheet} from '../dist/forge-pro/documents.mjs';
import {capabilities,hasCapability,requireCapability} from '../dist/forge-pro/capabilities.mjs';
const local=normaliseProject({version:1,electronics:{version:1}}),s=createSnapshot({title:'<script>private</script>',notes:'Private notes',instrument:{serial:'PRIVATE-123',manufacturer:'Builder',year:2026}},local);
assert.equal(validateSnapshot(s).metadata.instrument.year,2026);assert.equal(localFromSnapshot(s).electronics.version,1);
const reordered=JSON.parse(canonical(s));assert.deepEqual(validateSnapshot(reordered),s);
assert.throws(()=>validateSnapshot({...s,technical:{...s.technical,summary:'Fabricated'}}));assert.throws(()=>validateSnapshot({...s,schema:2}));assert.throws(()=>validateSnapshot({...s,engine:'future'}));
assert.equal(compareRevisions(s,reordered).changes.length,0);const next=createSnapshot({...s.metadata,title:'Rewire'},local);assert.equal(compareRevisions(s,next).changes[0].path,'instrument/project.title');assert.equal(compareRevisions(s,{...next,engine:'future'}).supported,false);
for(const type of ['resistance','capacitance','pickupDCR','pickupInductance']){const unit={resistance:'kohm',capacitance:'nF',pickupDCR:'ohm',pickupInductance:'H'}[type],m=normaliseMeasurement({type,unit,value:'487.6123',nominal:500});assert.equal(m.value,487.6123);assert.equal(m.nominal,500);}
assert.throws(()=>normaliseMeasurement({type:'pickupDCR',unit:'H',value:12}));for(const value of ['',0,-1,Infinity,'NaN'])assert.throws(()=>normaliseMeasurement({type:'resistance',unit:'ohm',value}));
const instrument=createReference('les-paul');instrument.label='PRIVATE LABEL';instrument.extensions={note:'PRIVATE EXTENSION'};const si=createSnapshot(s.metadata,{version:1,electronics:{version:2,instrument}}),passport=JSON.stringify(passportProjection(si));for(const secret of ['PRIVATE LABEL','PRIVATE EXTENSION','PRIVATE-123','Private notes','Builder'])assert(!passport.includes(secret));
assert(!hasCapability([],capabilities.cloud));assert.throws(()=>requireCapability([],capabilities.cloud));
const doc={id:'doc',project_id:'project',kind:'TECHNICAL_BUILD_SHEET',created_at:'2026-10-07T10:00:00Z',payload:{schema:1,snapshot:s,revision:{sequence:1,name:'Factory'},measurements:[]}},html=renderBuildSheet(buildSheetModel(doc));assert(!html.includes('<script>private'));assert(html.includes('&lt;script&gt;'));for(const t of ['USER-ENTERED','MEASURED','DERIVED','KNOWN SETTINGS','Physical fit UNKNOWN','NOT MODELLED'])assert(html.includes(t));const original=structuredClone(s);doc.payload.snapshot=createSnapshot({title:'Next'},local);assert.deepEqual(s,original);
console.log('Forge Pro domain: metadata, versions, authority, comparison, units/precision, privacy and document escaping PASS');
