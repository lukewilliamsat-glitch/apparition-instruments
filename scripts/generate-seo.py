"""Apply deterministic static SEO metadata to the GitHub Pages output.

Run after editing a page's HTML; keep the route model below in sync with dist.
"""
from html import escape, unescape
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / 'dist'
BASE = 'https://apparitioninstruments.co.uk'
BRAND = 'Apparition Instruments'
IMAGE = BASE + '/assets/apparition-logo.png'

# Useful static pages and customer-facing tools. Descriptions describe current content.
PAGES = {
    '/': ('Apparition Instruments | Guitar Electronics, Wiring Kits & Components UK', 'UK guitar electronics from Apparition Instruments: hand-assembled wiring kits, tested components, treble bleed circuits and practical guitar wiring tools.'),
    '/components/': ('Guitar Components | Apparition Instruments', 'Explore guitar electronics components including potentiometers, capacitors and treble bleed circuits from Apparition Instruments.'),
    '/components/potentiometers/': ('Guitar Potentiometers | Apparition Instruments', 'Explore guitar potentiometers and choose the controls that suit your guitar wiring project.'),
    '/components/capacitors/': ('Guitar Capacitors | Apparition Instruments', 'Explore guitar tone capacitors and their role in a passive guitar circuit.'),
    '/components/treble-bleeds/': ('Guitar Treble Bleed Circuits | Apparition Instruments', 'Explore treble bleed circuits designed to retain clarity as you turn down your guitar volume.'),
    '/wiring-kits/': ('Prewired Guitar Wiring Kits | Apparition Instruments', 'Explore prewired guitar wiring kits, check guitar fitment and build a specification for your instrument.'),
    '/les-paul-kits/': ('Prewired Les Paul Wiring Kits | Apparition Instruments', 'Configure a prewired Les Paul style guitar harness and review its component and wiring options.'),
    '/wiring-kits/prs-custom-24/': ('PRS Custom 24 Wiring Kit | Apparition Instruments', 'Explore the forthcoming Apparition Instruments PRS Custom 24 wiring kit and its planned specifications.'),
    '/wiring-kits/prs-se-594/': ('PRS SE 594 Wiring Kit | Apparition Instruments', 'Explore the forthcoming Apparition Instruments PRS SE 594 wiring kit and its planned specifications.'),
    '/wiring-kits/prs-se-custom-24/': ('PRS SE Custom 24 Wiring Kit | Apparition Instruments', 'Explore the forthcoming Apparition Instruments PRS SE Custom 24 wiring kit and its planned specifications.'),
    '/wiring-kits/sg/': ('SG Guitar Wiring Kit | Apparition Instruments', 'Explore the forthcoming Apparition Instruments SG wiring kit for Gibson and Epiphone style guitars.'),
    '/wiring-kits/help-me-choose/': ('Help Me Choose a Wiring Kit | Apparition Instruments', 'Find a sensible starting specification for your guitar wiring upgrade with the guided kit chooser.'),
    '/interactive-tools/': ('Interactive Guitar Electronics Tools | Apparition Instruments', 'Explore interactive resources for guitar wiring, treble bleed networks and guitar electronics.'),
    '/wiring-generator/': ('Guitar Wiring Diagram Generator | Apparition Instruments', 'Explore a terminal-based Les Paul wiring diagram and inspect the wiring connections in your guitar circuit.'),
    '/treble-bleed-designer/': ('Guitar Treble Bleed Designer | Apparition Instruments', 'Model passive guitar treble bleed networks using your pickup, controls and circuit values.'),
    '/luthier-hub/': ('Luthier Hub: Guitar electronics, tools & bench guides | Apparition Instruments', 'Learn passive guitar electronics, follow guided paths, diagnose common symptoms and connect to Apparition’s circuit tools.'),
    '/luthier-hub/potentiometers-explained/': ('Guitar Potentiometers Explained | Apparition Instruments', 'Understand the role of potentiometers in passive guitar electronics and how control choices affect the circuit.'),
    '/luthier-hub/capacitors-treble-bleeds/': ('Guitar Capacitors and Treble Bleeds Explained | Apparition Instruments', 'Learn how tone capacitors and treble bleed networks perform different jobs in a passive guitar circuit.'),
    '/luthier-hub/wiring-circuits-explained/': ('Guitar Wiring Circuits Explained | Apparition Instruments', 'A practical explanation of passive guitar wiring circuits and the components that shape their behaviour.'),
    '/luthier-hub/les-paul-installation/': ('How to Wire a Les Paul with an Apparition Kit | Apparition Instruments', 'Follow a practical guide to fitting a passive two-volume, two-tone Les Paul wiring harness.'),
    '/contact/': ('Contact Apparition Instruments | Guitar Electronics Help', 'Ask Apparition Instruments about guitar components, wiring kit fitment or a guitar electronics project.'),
    '/faq/': ('Guitar Electronics FAQ | Apparition Instruments', 'Answers to common questions about Apparition Instruments guitar wiring kits, components and orders.'),
    '/guitar-project/': ('The Guitar Project | Apparition Instruments', 'Discover original Apparition guitars currently in development in the UK workshop.'),
    '/terms/': ('Terms and Conditions | Apparition Instruments', 'Read the terms and conditions for Apparition Instruments Limited.'),
    '/privacy/': ('Privacy Policy | Apparition Instruments', 'Read how Apparition Instruments Limited handles personal information and customer enquiries.'),
}

NOINDEX = {'/account/', '/basket/', '/checkout/', '/checkout/success/', '/wiring-kits/build/', '/wiring-kits/specification/', '/wiring-diagrams/'}


def page_path(file):
    relative = file.relative_to(ROOT)
    return '/' if relative == Path('index.html') else '/' + str(relative.parent) + '/'


def schema(route, title, description):
    url = BASE + route
    graph = [{ '@type': 'WebPage', '@id': url + '#webpage', 'url': url,
               'name': title, 'description': description,
               'isPartOf': {'@id': BASE + '/#website'} }]
    if route == '/':
        graph.extend([
            {'@type': 'WebSite', '@id': BASE + '/#website', 'url': BASE + '/',
             'name': BRAND, 'publisher': {'@id': BASE + '/#organization'}},
            {'@type': 'Organization', '@id': BASE + '/#organization',
             'name': 'Apparition Instruments Limited', 'legalName': 'Apparition Instruments Limited',
             'url': BASE + '/', 'logo': IMAGE,
             'identifier': {'@type': 'PropertyValue', 'propertyID': 'UK company number', 'value': '17454761'}}
        ])
    return json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('<', '\\u003c')


def public_routes(files):
    """Keep generated editorial/tool routes when rebuilding the sitemap."""
    routes = set()
    for file in files:
        source = file.read_text()
        if re.search(r'<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex', source):
            continue
        route = page_path(file)
        if 'href="' + BASE + route + '"' in source and re.search(r'<link\b[^>]*rel="canonical"', source):
            routes.add(route)
    return routes


def main(routes=None):
    files = [f for f in ROOT.rglob('*.html') if f.name == 'index.html']
    products = {page_path(f) for f in files if f.parent.parent == ROOT / 'products'}
    indexable = public_routes(files)
    for file in files:
        route = page_path(file)
        if routes is not None and route not in routes:
            continue
        html = file.read_text()
        # Hub templates own Article/Breadcrumb schema and metadata; sitemap discovery remains shared.
        if route.startswith('/luthier-hub/') and 'data-hub-reference="v1"' in html:
            continue
        if route in PAGES or route in indexable and route not in products:
            title, description = PAGES.get(route, (unescape(re.search(r'<title>(.*?)</title>', html, re.S)[1]), unescape(re.search(r'<meta name="description" content="([^"]*)"', html)[1])))
            html = re.sub(r'<!-- SEO METADATA START -->.*?<!-- SEO METADATA END -->\n?', '', html, flags=re.S)
            # Remove only metadata nodes. The old range expression could consume
            # scripts/styles between a canonical and the next JSON-LD script.
            html = re.sub(r'<meta\b[^>]*(?:name="(?:description|twitter:card)"|property="og:[^"]+")[^>]*>\n?', '', html)
            html = re.sub(r'<link\b[^>]*rel="canonical"[^>]*>\n?', '', html)
            html = re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>\n?', '', html, flags=re.S)
            html = re.sub(r'<title>.*?</title>', '<title>' + escape(title) + '</title>', html, count=1, flags=re.S)
            metadata = '\n'.join([
                '<meta name="description" content="' + escape(description, quote=True) + '">',
                '<link rel="canonical" href="' + BASE + route + '">',
                '<meta property="og:type" content="website">',
                '<meta property="og:site_name" content="' + BRAND + '">',
                '<meta property="og:title" content="' + escape(title, quote=True) + '">',
                '<meta property="og:description" content="' + escape(description, quote=True) + '">',
                '<meta property="og:url" content="' + BASE + route + '">',
                '<meta property="og:image" content="' + IMAGE + '">',
                '<meta property="og:image:alt" content="Apparition Instruments logo">',
                '<meta name="twitter:card" content="summary">',
                '<script type="application/ld+json">' + schema(route, title, description) + '</script>',
            ])
            html = re.sub(r'(?m)^[ \t]+$', '', html)
            block = '<!-- SEO METADATA START -->\n' + metadata + '\n<!-- SEO METADATA END -->\n'
            anchor = '<link rel="stylesheet" href="/customer-ui.css">'
            html = html.replace(anchor, block + anchor, 1) if anchor in html else html.replace('</head>', block + '</head>', 1)
        elif route in NOINDEX:
            if '<meta name="robots"' not in html:
                html = html.replace('</head>', '<meta name="robots" content="noindex,follow">\n</head>', 1)
            if route == '/wiring-diagrams/':
                html = html.replace('href="../wiring-generator/"', 'href="' + BASE + '/wiring-generator/"', 1)
        if route not in products:
            file.write_text(html)
    (ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: ' + BASE + '/sitemap.xml\n')
    from xml.etree.ElementTree import Element, SubElement, ElementTree
    urlset = Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for route in PAGES:
        SubElement(SubElement(urlset, 'url'), 'loc').text = BASE + route
    for route in sorted(indexable - set(PAGES)):
        SubElement(SubElement(urlset, 'url'), 'loc').text = BASE + route
    ElementTree(urlset).write(ROOT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--route', action='append', help='Refresh only selected metadata; retain all public sitemap routes.')
    main(parser.parse_args().route)
