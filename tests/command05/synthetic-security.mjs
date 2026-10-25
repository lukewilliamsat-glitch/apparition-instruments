import assert from 'node:assert/strict';
import {createFixtureServices} from './fixture-services.mjs';
const f=createFixtureServices({role:'editor'}),p=f.syntheticEditorPersistence;
const record=await p.read('fx-pot-01'),command={id:record.id,expectedRevision:record.revision,operationId:'command02-op-test',patch:{description:'Actor-bound synthetic operation'}};
const saved=await p.save(command);assert.equal(saved.record.revision,'sim-2');assert.deepEqual(await p.save(command),saved);assert.equal(f.calls.filter(c=>c.kind==='synthetic-save').length,1);
assert.equal((await p.status(command.operationId)).status,'committed');f.setSubject('fictional-admin-2');
await assert.rejects(p.status(command.operationId),{code:'PERMISSION'});await assert.rejects(p.read(record.id),{code:'PERMISSION'});p.release();await p.read(record.id);await assert.rejects(p.save(command));
f.setRole('readonly');await assert.rejects(p.save({...command,operationId:'another-operation'}),{code:'PERMISSION'});
console.log('Synthetic integration authority: actor-bound receipt/read/replay, duplicate protection and write revocation PASS. No production contract claimed.');
