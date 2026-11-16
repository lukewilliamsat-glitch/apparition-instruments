import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = 'apparition-instruments';
const hostname = project + '.pages.dev';
const primary = 'https://' + hostname;
const baselineCommit = '53331335fe3f1418bc8ea77b82e29ef5ae58c9f1';
const baselineDigest = 'd82ba2358bd5e5d4a6bc803f1c092cecd707cfb27a2e515b220281d4f29101b5';
const baselineZip = 'd2b99e0474adfb3fc55a3cbaf38e67f18a222d264cdf87687132d9edbfa84856';

export function immutableHost(value) {
  const u = new URL(value);
  assert.equal(u.protocol, 'https:');
  assert.match(u.hostname, /^[a-f0-9]{8,32}\.apparition-instruments\.pages\.dev$/);
  assert(!u.username && !u.password && !u.port && u.pathname === '/' && !u.search && !u.hash);
  return u.origin;
}

export async function verifyGate(origin, request = fetch) {
  assert.equal(origin === primary ? origin : immutableHost(origin), origin);
  const response = await request(origin + '/', {
    redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const location = response.headers.get('location');
  await response.body?.cancel();
  assert([302, 303, 307, 308].includes(response.status) && location,
    'Expected a Cloudflare Access login redirect, received HTTP ' + response.status);
  const redirect = new URL(location, origin);
  assert(redirect.protocol === 'https:' && redirect.hostname.endsWith('.cloudflareaccess.com') &&
    redirect.pathname.startsWith('/cdn-cgi/access/login/'), 'Unexpected anonymous redirect');
}

async function main() {
  const root = resolve(process.argv[2]);
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token,
    WRANGLER_BIN: wrangler, PHOENIX66_PRIVATE_BASELINE_STAGE: enabled } = process.env;
  assert(enabled === 'true' && /^[a-f0-9]{32}$/.test(account ?? '') && token && wrangler);
  const receipt = JSON.parse(await readFile(join(root, 'receipt.json'), 'utf8'));
  const pin = receipt.payloads.baseline;
  assert(receipt.sourceRun === 43703349542 && receipt.sourceArtifact === 14157650445 &&
    pin.applicationCommit === baselineCommit && pin.payloadDigest === baselineDigest &&
    pin.zipSha256 === baselineZip && pin.files.length === 460, 'Unapproved baseline receipt');
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + account + '/pages/projects/' + project;
  const api = async (path = '') => {
    const r = await fetch(base + path, { headers: { Authorization: 'Bearer ' + token },
      redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert(r.ok, 'Cloudflare Pages API HTTP ' + r.status);
    const body = await r.json();
    assert(body.success === true);
    return body.result;
  };
  async function projectState() {
    const p = await api();
    assert(p.name === project && p.subdomain === hostname && p.production_branch === 'production' &&
      Array.isArray(p.domains) && p.domains.length === 1 && p.domains[0] === hostname &&
      (!p.source?.type || p.source.type === 'direct_upload'), 'Unexpected staging project identity or routing');
    assert.deepEqual(await api('/domains'), [], 'Staging project already has a customer domain');
    return p;
  }
  const marker = 'PHOENIX66 private Access probe';
  const release = 'PHOENIX66 verified unchanged baseline';
  const checkDeployment = (d, message, sha) => d?.environment === 'production' &&
    d.latest_stage?.name === 'deploy' && d.latest_stage?.status === 'success' &&
    d.deployment_trigger?.metadata?.branch === 'production' &&
    d.deployment_trigger.metadata.commit_message === message && d.deployment_trigger.metadata.commit_hash === sha;
  async function upload(directory, message, sha) {
    const child = spawnSync(wrangler, ['pages','deploy', directory, '--project-name', project,
      '--branch','production','--commit-hash',sha,'--commit-message',message,'--commit-dirty=true'],
      { stdio: 'inherit', timeout: 180000, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
    assert.equal(child.status, 0, 'Cloudflare did not confirm the staging upload');
    const p = await projectState();
    const d = p.canonical_deployment;
    assert(checkDeployment(d, message, sha), 'Expected production-branch deployment identity not read back');
    return d;
  }
  const existing = await projectState();
  if (checkDeployment(existing.canonical_deployment, release, baselineCommit)) {
    const d = existing.canonical_deployment;
    await Promise.all([verifyGate(primary), verifyGate(immutableHost(d.url))]);
    console.log(JSON.stringify({ status: 'already staged', deploymentId: d.id, host: primary, digest: baselineDigest }));
    return;
  }
  const probeSha = '0000000000000000000000000000000000000066';
  assert(!existing.canonical_deployment || checkDeployment(existing.canonical_deployment, marker, probeSha),
    'Will not replace an unrelated deployment');
  let probe = existing.canonical_deployment;
  if (!probe) {
    const directory = await mkdtemp(join(tmpdir(), 'phoenix66-probe-'));
    try {
      await writeFile(join(directory, 'index.html'), '<!doctype html><title>Private staging probe</title>\n');
      await writeFile(join(directory, '_headers'), '/*\n  X-Robots-Tag: noindex\n');
      probe = await upload(directory, marker, probeSha);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  await Promise.all([verifyGate(primary), verifyGate(immutableHost(probe.url))]);
  assert.equal((await projectState()).canonical_deployment.id, probe.id, 'Staging identity changed');
  console.log('PASS: anonymous access denied by Cloudflare Access on primary and immutable probe host');
  const d = await upload(join(root, 'baseline'), release, baselineCommit);
  await Promise.all([verifyGate(primary), verifyGate(immutableHost(d.url))]);
  console.log(JSON.stringify({ status: 'staged', deploymentId: d.id, immutableHost: immutableHost(d.url),
    host: primary, source: baselineCommit, digest: baselineDigest, routesPublic: false }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
