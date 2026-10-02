"""Idempotent public-shell projection. No page-content or business-code rewriting."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]

def mode(path):
    route = str(path)
    if route.startswith(('circuit-forge/', 'wiring-generator/', 'treble-bleed-designer/')):
        return 'technical'
    if route.startswith(('account/', 'basket/', 'contact/', 'checkout/', 'success/')):
        return 'service'
    if route.startswith(('luthier-hub/', 'faq/', 'terms/', 'privacy/', 'interactive-tools/')):
        return 'editorial'
    return 'commercial'

def project(source, path):
    if str(path).startswith('admin/') or '<header class="site-header">' not in source or 'aria-label="Main navigation"' not in source:
        return source
    def body(match):
        classes = [c for c in (match[1] or '').split() if c != 'site-ui' and not c.startswith('ui-')]
        return '<body class="' + ' '.join(classes + ['site-ui', 'ui-' + mode(path)]) + '">'
    source = re.sub(r'<body(?: class="([^"]*)")?>', body, source, count=1)
    source = re.sub(r'<link[^>]*href="(?:/|(?:\.\./)*)customer-ui\.css"[^>]*>\s*', '', source)
    return source.replace('</head>', '<link rel="stylesheet" href="/customer-ui.css"></head>')

def sync():
    count = 0
    for path in (ROOT / 'dist').rglob('index.html'):
        source = path.read_text()
        updated = project(source, path.relative_to(ROOT / 'dist'))
        if updated != source:
            path.write_text(updated)
            count += 1
    return count

if __name__ == '__main__':
    print(f'Customer UI hub projected onto {sync()} public shells.')
