"""Regressions for category startup URLs; no network or business operations."""
import argparse,re,unittest
from pathlib import Path
from urllib.parse import urljoin,urlsplit,parse_qs

ROOT=Path(__file__).resolve().parents[1]/'dist'
SITE='https://apparitioninstruments.co.uk/'
REVISION='0f4b82d6f618ecc7e661c3b3ff13ca1b58b66ca4'
CATEGORIES=('treble-bleeds','capacitors','potentiometers')
ENTRY=re.compile(r'<script\b[^>]*\bsrc=["\']([^"\']*storefront/entry\.mjs[^"\']*)["\']')
PAYLOAD=None

def resolved(page,uri):return urlsplit(urljoin(SITE+page,uri))
def correct(page,uri,root):
    value=resolved(page,uri)
    return value.scheme=='https' and value.netloc=='apparitioninstruments.co.uk' and value.path=='/storefront/entry.mjs' and parse_qs(value.query).get('build')==[REVISION] and (root/value.path.lstrip('/')).is_file()

class CategoryEntries(unittest.TestCase):
    def test_nested_category_sources_use_current_entry(self):
        for category in CATEGORIES:
            page=f'components/{category}/index.html';urls=ENTRY.findall((ROOT/page).read_text())
            self.assertEqual(len(urls),1,page);self.assertTrue(correct(page,urls[0],ROOT),page)
    def test_every_current_payload_storefront_entry_resolves(self):
        if PAYLOAD is None:self.skipTest('Supply the exact prepared payload')
        checked=[]
        for path in PAYLOAD.rglob('*.html'):
            page=path.relative_to(PAYLOAD).as_posix()
            for uri in ENTRY.findall(path.read_text()):
                self.assertTrue(correct(page,uri,PAYLOAD),(page,uri));checked.append(page)
        self.assertEqual(len(checked),17)
    def test_previous_category_regression_is_rejected(self):
        for category in CATEGORIES:
            page=f'components/{category}/index.html';old='../storefront/entry.mjs?build='+REVISION
            self.assertEqual(resolved(page,old).path,'/components/storefront/entry.mjs')
            self.assertFalse(correct(page,old,ROOT))
    def test_correct_path_with_old_cached_controller_is_rejected(self):
        old='../../storefront/entry.mjs?build=b396ec59d317b58ed1c9cd94f8f65620cd50a04c'
        self.assertFalse(correct('components/treble-bleeds/index.html',old,ROOT))

if __name__=='__main__':
    cli=argparse.ArgumentParser();cli.add_argument('--payload',type=Path);args,rest=cli.parse_known_args()
    PAYLOAD=args.payload
    unittest.main(argv=[__file__,*rest])
