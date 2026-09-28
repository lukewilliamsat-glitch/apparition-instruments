from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import importlib.util
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('seo', ROOT / 'scripts/generate-seo.py')
seo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seo)

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonical = []
        self.jsonld = []
        self.title = ''
        self.headings = []
        self.links = set()
        self.current = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[attrs.get('property') or attrs.get('name')] = attrs.get('content')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs['href'])
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.current = 'jsonld'
            self.jsonld.append('')
        if tag in ('title', 'h1'):
            self.current = tag
        if tag == 'a' and attrs.get('href'):
            self.links.add(attrs['href'])

    def handle_endtag(self, tag):
        if tag == 'script' and self.current == 'jsonld':
            self.current = ''
        if tag == self.current:
            self.current = ''

    def handle_data(self, data):
        if self.current == 'jsonld':
            self.jsonld[-1] += data
        elif self.current == 'title':
            self.title += data
        elif self.current == 'h1':
            self.headings.append(data.strip())

def read(route):
    file = ROOT / 'dist' / route.lstrip('/') / 'index.html'
    page = Page()
    page.feed(file.read_text())
    return page

assert (ROOT / 'dist/robots.txt').read_text() == 'User-agent: *\nAllow: /\nSitemap: https://apparitioninstruments.co.uk/sitemap.xml\n'
xml = ET.parse(ROOT / 'dist/sitemap.xml')
namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = [node.text for node in xml.findall('s:url/s:loc', namespace)]
assert urls[:len(seo.PAGES)] == [seo.BASE + route for route in seo.PAGES]
assert set(urls[len(seo.PAGES):]) == {seo.BASE + '/products/' + f.parent.name + '/' for f in (ROOT / 'dist/products').glob('*/index.html')}
assert len(urls) == len(set(urls))
titles = set()
for route, (title, description) in seo.PAGES.items():
    page = read(route)
    url = seo.BASE + route
    assert page.title == title and title not in titles
    titles.add(title)
    assert page.meta['description'] == description
    assert page.canonical == [url]
    assert page.meta['og:url'] == url
    assert page.meta['og:title'] == title
    assert page.meta['og:description'] == description
    assert page.meta['og:image'] == seo.IMAGE
    assert page.meta['twitter:card'] == 'summary'
    assert page.headings
    graph = json.loads(page.jsonld[0])['@graph']
    assert graph[0]['url'] == url and graph[0]['@id'] == url + '#webpage'
    assert all(node['@type'] != 'Product' for node in graph)
    assert not any(key in str(graph).lower() for key in ('aggregaterating', 'reviewcount'))
    if route == '/':
        assert {node['@type'] for node in graph} == {'Organization', 'WebSite', 'WebPage'}
        assert graph[2]['identifier']['value'] == '17454761'
    else:
        assert len(graph) == 1

for route in seo.NOINDEX:
    page = read(route)
    assert page.meta['robots'].startswith('noindex')
    assert seo.BASE + route not in urls

for file in (ROOT / 'dist/admin').rglob('*.html'):
    page = Page()
    page.feed(file.read_text())
    assert page.meta['robots'].startswith('noindex')
    assert not page.canonical

error = Page()
error.feed((ROOT / 'dist/404.html').read_text())
assert error.meta['robots'].startswith('noindex') and not error.canonical
home = read('/')
assert {'/components/', '/wiring-kits/', '/wiring-generator/', '/luthier-hub/'}.issubset(home.links)
assert {'/contact/', '/faq/', '/terms/', '/privacy/'}.issubset(home.links)
assert read('/wiring-diagrams/').canonical == [seo.BASE + '/wiring-generator/']
assert all(urlparse(url).netloc == 'apparitioninstruments.co.uk' for url in urls)
print(f'P09A.1 SEO: {len(urls)} canonical public pages, {len(seo.NOINDEX)} utility routes, admin and 404 verified')
