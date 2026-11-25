import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { checkoutPlans } from './checkout-plans.mjs';

const { Pool } = createRequire(import.meta.url)(process.env.DOMINION_PG_MODULE);
const pool = new Pool();
try {
  await pool.query(await readFile(new URL('./checkout-plans.review.sql', import.meta.url), 'utf8'));
  const store = checkoutPlans(pool);
  const input = {
    orderId: randomUUID(), account: 'acct_Fixture87', currencyCode: 'GBP',
    expectedMinor: 1234, now: '2026-11-25T12:00:00Z', expiresAt: '2026-11-25T13:00:00Z',
  };
  const [plan, replay] = await Promise.all([store.save(input), store.save(input)]);
  assert.deepEqual(plan, replay);
  await assert.rejects(store.save({ ...input, expectedMinor: 1235 }), /conflicts/);

  const attachment = { orderId: plan.orderId, binding: plan.binding };
  const sessions = ['cs_test_OneFixture87', 'cs_test_TwoFixture87'];
  const outcomes = await Promise.all(sessions.map(sessionId => store.attach({ ...attachment, sessionId })));
  assert.deepEqual([...outcomes].sort(), [false, true]);
  const sessionId = sessions[outcomes.indexOf(true)];
  assert.equal(await store.attach({ ...attachment, sessionId }), true);
  assert.equal(await store.attach({ ...attachment, binding: '0'.repeat(64), sessionId }), false);
  assert.equal(await store.bySession('acct_OtherFixture', sessionId), null);
  assert.equal((await store.bySession(plan.account, sessionId)).orderId, plan.orderId);
  const other = await store.save({ ...input, orderId: randomUUID() });
  assert.equal(await store.attach({ orderId: other.orderId, binding: other.binding, sessionId }), false);
  await assert.rejects(store.attach({ orderId: other.orderId, binding: other.binding, sessionId: 'cs_live_DeniedFixture' }), { code: '23514' });

  const tx = await pool.connect();
  const intent = 'pi_Fixture87Intent';
  try {
    await tx.query('begin');
    assert.equal(await checkoutPlans(tx).attachVerifiedIntent({ ...attachment, intent }), true);
    await tx.query('rollback');
    assert.equal(await store.byIntent(plan.account, intent), null);
    await tx.query('begin');
    assert.equal(await checkoutPlans(tx).attachVerifiedIntent({ ...attachment, intent }), true);
    await tx.query('commit');
    assert.equal((await store.byIntent(plan.account, intent)).orderId, plan.orderId);
  } finally {
    tx.release();
  }
  await pool.query('create role fixture_untrusted');
  const denied = await pool.connect();
  try {
    await denied.query('set role fixture_untrusted');
    await assert.rejects(checkoutPlans(denied).read(plan.orderId), { code: '42501' });
  } finally {
    denied.release();
  }
  console.log('Native PostgreSQL plan store passed durable replay, concurrent binding, account isolation, transaction rollback, and access denial');
} finally {
  await pool.end();
}
