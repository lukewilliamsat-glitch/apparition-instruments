"""Byte-level scope check; no app import, build, workflow or service request."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BASE = '2e3c45a6836bd5c9a1e6ec39acab027eaeb0bf8f'
paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', BASE], cwd=ROOT, text=True).splitlines()
changed = []
for path in paths:
    expected = subprocess.check_output(['git', 'rev-parse', BASE + ':' + path], cwd=ROOT, text=True).strip()
    actual = subprocess.check_output(['git', 'hash-object', '--', path], cwd=ROOT, text=True).strip()
    if expected != actual:
        changed.append(path)
routes = [p for p in changed if p.endswith('/index.html') and '/storefront/entry.mjs' in (ROOT / p).read_text()]
assert len(routes) == 16, routes
assert set(changed) == set(routes + ['dist/faq/index.html', 'dist/basket-ui.mjs', 'tests/p10c-storefront-truth.mjs'])
notice = 'Browse components and review supported items in your basket. A basket is not an order or a stock reservation. Checkout is available only when current prices, stock and delivery charges can be confirmed.'
for path in routes:
    before = subprocess.check_output(['git', 'show', BASE + ':' + path], cwd=ROOT, text=True)
    match = re.search(r'src="([^"]*(?:components/components\.mjs\?v=p11|products/app\.mjs\?v=p11ef|basket/basket\.mjs|checkout/checkout\.mjs))"', before)
    assert match, path
    prefix = re.split(r'(?:components/components|products/app|basket/basket|checkout/checkout)\.mjs', match.group(1))[0]
    expected = before.replace('src="' + match.group(1) + '"', 'src="' + prefix + 'storefront/entry.mjs"')
    expected = expected.replace('Browse current components and add available items to your basket. Review delivery and your order total before secure checkout.', notice)
    expected = expected.replace('Review your components and kit configurations, then continue to secure checkout.', 'Review your components and kit configurations. When checkout is available, current prices, stock and delivery charges are checked before secure payment.')
    expected = expected.replace('Review your basket before secure checkout.', 'Review your basket. Checkout is available only when ordering and current product information can be checked.')
    assert (ROOT / path).read_text() == expected, path
before = subprocess.check_output(['git', 'show', BASE + ':dist/basket-ui.mjs'], cwd=ROOT, text=True)
assert (ROOT / 'dist/basket-ui.mjs').read_text() == before.replace('Your selections are saved locally for planning; no order has been placed. Delivery is calculated at checkout. Editing a kit applies current options and prices.', 'Your selections are saved in this browser; they are not an order or a stock reservation. Checkout is available only when current prices, stock and delivery charges can be checked. Editing a kit applies current options and prices.')
record = {'status': 'PASS', 'base': BASE, 'baselineFiles': len(paths), 'unchanged': len(paths) - len(changed), 'changed': changed,
          'routeHTML': len(routes), 'commerceRulesUnchanged': True, 'workflowChanges': 0,
          'newModules': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in ['dist/storefront/startup.mjs', 'dist/storefront/entry.mjs']}}
print(json.dumps(record, indent=2))
