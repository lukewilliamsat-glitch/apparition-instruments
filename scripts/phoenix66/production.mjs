import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { immutableHost, verifyGate } from './stage-baseline.mjs';

const account = '5ecc2102d615e638e3b0ec932f941232';
const project = 'apparition-instruments';
const primary = 'https://apparition-instruments.pages.dev';
const preview = 'https://apparition-phoenix-preview.pages.dev';
const nightfallPreview = 'https://nightfall.apparition-phoenix-preview.pages.dev';
const apex = 'https://apparitioninstruments.co.uk';
const www = 'https://www.apparitioninstruments.co.uk';
const rollback = '69e29ee3-e5e6-4101-a72e-4555ec18e593';
const baseline = '53331335fe3f1418bc8ea77b82e29ef5ae58c9f1';
const candidate = 'afbac1358e782b588d222960eebb03f170a026bb';
const message = 'PHOENIX 66H verified NIGHTFALL';
const sourceArtifact = 14157650445;
const sourceRun = 43703349542;
const baselineZip = 'd2b99e0474adfb3fc55a3cbaf38e67f18a222d264cdf87687132d9edbfa84856';
const candidateZip = 'f2c3ee749fd4d18639c0b82da3377369db84a0ea584a3a59cfc2db69867f7c0a';
const markerPaths = ['backend/component-data.mjs', 'products/app.mjs', 'components/catalogue.mjs',
  'wiring-kits/kit-data.mjs', 'admin/component-repository.mjs', 'admin/catalogue-settings/settings.mjs'];
const publicPaths = new Map([
  ['/', 'index.html'], ['/components/treble-bleeds/', 'components/treble-bleeds/index.html'],
  ['/products/bleed-cap/', 'products/bleed-cap/index.html'], ['/products/bleed-cap/image.png', 'products/bleed-cap/image.png'],
  ['/basket/', 'basket/index.html'], ['/checkout/', 'checkout/index.html'],
  ['/les-paul-kits/', 'les-paul-kits/index.html'], ['/circuit-forge/', 'circuit-forge/index.html'],
  ['/admin/', 'admin/index.html'], ['/admin/orders/', 'admin/orders/index.html'],
  ...markerPaths.map(path => ['/' + path, path]),
]);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const isDeployment = (d, commit) => d?.environment === 'production' && d.latest_stage?.name === 'deploy' &&
  d.latest_stage.status === 'success' && d.deployment_trigger?.metadata?.branch === 'production' &&
  d.deployment_trigger.metadata.commit_hash === commit;

export async function verifySeparatePreview(origin, request = fetch) {
  assert([preview, nightfallPreview].includes(origin), 'Unapproved separate preview hostname');
  const r = await request(origin + '/', {
    redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const location = r.headers.get('location');
  await r.body?.cancel();
  assert([302, 303, 307, 308].includes(r.status) && location, 'Expected a preview Access login redirect');
  const login = new URL(location, origin);
  assert(login.protocol === 'https:' && login.hostname.endsWith('.cloudflareaccess.com') &&
    login.pathname.startsWith('/cdn-cgi/access/login/'), 'Unexpected preview login target');
}

async function publicReadback(pin) {
  const files = new Map(pin.files.map(f => [f.path, f]));
  const rev = pin.applicationCommit;
  for (const [url, path] of publicPaths) {
    const expected = files.get(path);
    assert(expected, 'Missing receipt member ' + path);
    const r = await fetch(apex + url + '?__phoenix66h=' + rev, {
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    assert.equal(r.status, 200, url + ' was not anonymously available');
    const mime = r.headers.get('content-type') ?? '';
    assert(path.endsWith('.html') ? mime.startsWith('text/html') : path.endsWith('.png') ?
      mime.startsWith('image/png') : /javascript/i.test(mime), 'Unexpected MIME for ' + url);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(bytes.length, expected.bytes, 'Unexpected served length for ' + url);
    assert.equal(sha(bytes), expected.sha256, 'Unexpected served SHA-256 for ' + url);
  }
  const suffix = '/products/bleed-cap/?phoenix=66h';
  const r = await fetch(www + suffix, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
  await r.body?.cancel();
  assert([301, 308].includes(r.status) && r.headers.get('location') === apex + suffix,
    'www did not preserve path and query in its HTTPS apex redirect');
  console.log('PASS: ' + publicPaths.size + ' anonymous public HTTPS files match ' + rev + ' and www preserves path/query');
}

async function main() {
  const root = resolve(process.argv[2]);
  assert(process.env.PHOENIX66_NIGHTFALL_PRODUCTION === 'true', 'Explicit production target missing');
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const wrangler = process.env.WRANGLER_BIN;
  assert(token && wrangler && process.env.CLOUDFLARE_ACCOUNT_ID === account, 'Missing approved publishing configuration');
  const receipt = JSON.parse(await readFile(resolve(root, 'receipt.json'), 'utf8'));
  assert(receipt.sourceArtifact === sourceArtifact && receipt.sourceRun === sourceRun, 'Unapproved package receipt');
  for (const [name, rev, zip] of [['baseline', baseline, baselineZip], ['nightfall', candidate, candidateZip]]) {
    const pin = receipt.payloads[name];
    assert(pin.applicationCommit === rev && pin.zipSha256 === zip && pin.files.length === 460, 'Unapproved upload identity');
    assert.equal(sha(await readFile(resolve(root, name + '.zip'))), zip, 'ZIP SHA-256 mismatch');
  }
  const url = 'https://api.cloudflare.com/client/v4/accounts/' + account + '/pages/projects/' + project;
  async function api(path = '') {
    const response = await fetch(url + path, { headers: { Authorization: 'Bearer ' + token },
      redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert(response.ok, 'Pages API HTTP ' + response.status);
    const body = await response.json();
    assert(body.success === true, 'Pages API rejected read-back');
    return body.result;
  }
  const p = await api();
  assert(p.name === project && p.subdomain === project + '.pages.dev' && p.production_branch === 'production' &&
    (!p.source?.type || p.source.type === 'direct_upload'), 'Unexpected production Pages project');
  const domains = await api('/domains');
  assert.deepEqual(domains.map(d => [d.name, d.status]).sort(),
    [['apparitioninstruments.co.uk', 'active'], ['www.apparitioninstruments.co.uk', 'active']], 'Unexpected public domains');
  const old = await api('/deployments/' + rollback);
  assert(old.id === rollback && isDeployment(old, baseline), 'Approved rollback deployment is unavailable');
  assert(p.canonical_deployment?.id === rollback && isDeployment(p.canonical_deployment, baseline),
    'Canonical production deployment changed');
  await Promise.all([verifyGate(primary), verifyGate(immutableHost(old.url)), verifySeparatePreview(preview),
    verifySeparatePreview(nightfallPreview), publicReadback(receipt.payloads.baseline)]);
  assert((await api()).canonical_deployment?.id === rollback, 'Production changed before publication');

  const proc = spawnSync(wrangler, ['pages', 'deploy', resolve(root, 'nightfall'), '--project-name', project,
    '--branch', 'production', '--commit-hash', candidate, '--commit-message', message, '--commit-dirty=true'],
    { stdio: 'inherit', timeout: 180000, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  assert.equal(proc.status, 0, 'Cloudflare uploader did not confirm a deployment; inspect before retrying');
  const deployed = (await api()).canonical_deployment;
  assert(isDeployment(deployed, candidate) && deployed.id !== rollback &&
    deployed.deployment_trigger.metadata.commit_message === message, 'Expected production identity was not read back');
  console.log(JSON.stringify({ deployment: deployed.id, application: candidate, rollback, zip: candidateZip }));
  await Promise.all([verifyGate(primary), verifyGate(immutableHost(deployed.url)), verifySeparatePreview(preview),
    verifySeparatePreview(nightfallPreview), publicReadback(receipt.payloads.nightfall)]);
  assert(isDeployment(await api('/deployments/' + rollback), baseline), 'Rollback became unavailable after release');
  assert.equal((await api()).canonical_deployment?.id, deployed.id, 'Production changed during verification');
  console.log('PASS: approved NIGHTFALL production deployment, rollback and anonymous preview protection independently read back');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
