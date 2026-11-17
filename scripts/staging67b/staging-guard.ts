const project = 'https://prwmowexhonguvtiywsy.supabase.co';
type Environment = { get: (key: string) => string | undefined };
const sandboxKey = /^(?:sk|rk)_test_[A-Za-z0-9]+$/;

export function stagingEnvironment(source: Environment): Environment | null {
  if (source.get('SUPABASE_URL') !== project) return null;
  const stripe = source.get('STAGING_STRIPE_SECRET_KEY');
  const webhook = source.get('STAGING_STRIPE_WEBHOOK_SECRET');
  const enabled = source.get('STAGING_PAYMENTS_ENABLED') === 'true' &&
    stripe && sandboxKey.test(stripe) && webhook && /^whsec_[A-Za-z0-9]+$/.test(webhook);
  return { get(key) {
    if (key === 'SUPABASE_URL') return project;
    if (key === 'SUPABASE_ANON_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY') return source.get(key);
    if (!enabled) return undefined;
    if (key === 'STRIPE_SECRET_KEY') return stripe;
    if (key === 'STRIPE_WEBHOOK_SECRET') return webhook;
    if (key === 'COMMERCE67_RECONCILE_SECRET') return source.get('STAGING_COMMERCE_RECONCILE_SECRET');
    if (key === 'COMMERCE67_TURNSTILE_SECRET') return source.get('STAGING_TURNSTILE_SECRET');
    if (['COMMERCE67_CHECKOUT_ENABLED','COMMERCE67_SENTINEL_ENABLED',
      'COMMERCE67_RESERVATION_EVENTS','COMMERCE67_SENTINEL_EVENTS'].includes(key)) return 'true';
    return undefined;
  }};
}

export function stagingFetch(env: Environment, transport: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    if (typeof input !== 'string' && !(input instanceof URL)) throw Error('Absolute provider URL required');
    const url = new URL(input);
    if (url.username || url.password || url.hash || url.protocol !== 'https:') throw Error('Unsafe provider URL');
    if (url.origin === project) {
      if (!url.pathname.startsWith('/rest/v1/') && !url.pathname.startsWith('/auth/v1/')) throw Error('Unknown staging route');
    } else if (url.origin === 'https://api.stripe.com') {
      const key = env.get('STRIPE_SECRET_KEY');
      if (!key || !sandboxKey.test(key) || new Headers(init?.headers).get('authorization') !== 'Bearer ' + key ||
        !/^\/v1\/(?:checkout\/sessions(?:\/cs_test_[A-Za-z0-9]{8,})?|refunds\/re_[A-Za-z0-9]{8,})$/.test(url.pathname)) {
        throw Error('Stripe Sandbox route or credential required');
      }
    } else if (url.origin !== 'https://challenges.cloudflare.com' ||
        url.pathname !== '/turnstile/v0/siteverify' || init?.method !== 'POST' ||
        !env.get('COMMERCE67_TURNSTILE_SECRET')) {
      throw Error('External staging destination denied');
    }
    return transport(url.toString(), { ...init, redirect: 'error' });
  };
}

export function staged(run: (req: Request, env: Environment, transport: typeof fetch) => Promise<Response>) {
  return (req: Request) => {
    const env = stagingEnvironment(Deno.env);
    return env ? run(req, env, stagingFetch(env)) :
      Response.json({ message: 'Incorrect staging project' }, { status: 503 });
  };
}
