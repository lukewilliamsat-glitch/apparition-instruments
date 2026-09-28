"""Apply deterministic static SEO metadata to the GitHub Pages output.

Run after editing a page's HTML; keep the route model below in sync with dist.
"""
from html import escape
import json
from pathlib import Path

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
    '/luthier-hub/': ('Luthier Hub: Guitar Electronics Guides | Apparition Instruments', 'Learn how guitar circuits, potentiometers, capacitors and treble bleeds work through practical guides.'),
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


def main():
    files = [f for f in ROOT.rglob('*.html') if f.name == 'index.html']
    products = {page_path(f) for f in files if f.parent.parent == ROOT / 'products'}
    assert set(PAGES) | NOINDEX | products | {page_path(f) for f in files if '/admin/' in str(f)} == {page_path(f) for f in files}
    for file in files:
        route = page_path(file)
        html = file.read_text()
        if route in PAGES:
            title, description = PAGES[route]
            import re
            html = re.sub(r'<!-- SEO METADATA START -->.*?<!-- SEO METADATA END -->\n?', '', html, flags=re.S)
            # Upgrade the first generated version, which preceded the markers.
            html = re.sub(r'<meta name="description" content="[^"]*">\n<link rel="canonical" href="https://apparitioninstruments.co.uk/[^\"]*">.*?</script>\n?', '', html, count=1, flags=re.S)
            html = re.sub(r'<title>.*?</title>', '<title>' + escape(title) + '</title>', html, count=1, flags=re.S)
            html = re.sub(r'<meta name="description" content="[^"]*">', '', html, count=1)
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
            html = html.replace('</head>', '<!-- SEO METADATA START -->\n' + metadata + '\n<!-- SEO METADATA END -->\n</head>', 1)
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
    for route in sorted(products):
        SubElement(SubElement(urlset, 'url'), 'loc').text = BASE + route
    ElementTree(urlset).write(ROOT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)


if __name__ == '__main__':
    main()
