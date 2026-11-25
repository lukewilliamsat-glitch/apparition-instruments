import { prepareSandboxCheckout } from '../dominion78c/stripe79.mjs';

const columns = `order_id::text as "orderId", account, currency,
  expected_minor as "expectedMinor", expiration::double precision as expiration,
  binding, 'apparition79/' || binding as "idempotencyKey",
  session_id as "sessionId", intent, 'sandbox' as mode`;

// The caller supplies the isolated PostgreSQL client or the existing settlement transaction client.
export function checkoutPlans(db) {
  const table = 'convergence87.checkout_plans';

  async function lookup(where, args) {
    const result = await db.query(`select ${columns} from ${table} where ${where}`, args);
    return result.rows[0] ?? null;
  }

  async function bind(column, orderId, binding, identity) {
    try {
      const result = await db.query(
        `update ${table} set ${column} = $3
         where order_id = $1 and binding = $2 and (${column} is null or ${column} = $3)`,
        [orderId, binding, identity],
      );
      return result.rowCount === 1;
    } catch (error) {
      if (column === 'session_id' && error.code === '23505') return false;
      throw error;
    }
  }

  return {
    async save(input) {
      const plan = prepareSandboxCheckout(input);
      await db.query(
        `insert into ${table} (order_id, account, currency, expected_minor, expiration, binding)
         values ($1, $2, $3, $4, $5, $6) on conflict (order_id) do nothing`,
        [plan.orderId, plan.account, plan.currency, plan.expectedMinor, plan.expiration, plan.binding],
      );
      const saved = await lookup('order_id = $1', [plan.orderId]);
      if (saved?.binding !== plan.binding) throw Error('Saved checkout plan conflicts with this request');
      return saved;
    },
    read: orderId => lookup('order_id = $1', [orderId]),
    bySession: (account, sessionId) => lookup('account = $1 and session_id = $2', [account, sessionId]),
    byIntent: (account, intent) => lookup('account = $1 and intent = $2', [account, intent]),
    attach: ({ orderId, binding, sessionId }) => bind('session_id', orderId, binding, sessionId),
    // Call within the same transaction that commits verified payment evidence and stock disposition.
    attachVerifiedIntent: ({ orderId, binding, intent }) => bind('intent', orderId, binding, intent),
  };
}
