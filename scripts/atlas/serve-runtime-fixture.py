"""Prepared loopback-only read-only fixture server. Does NOT establish browser process isolation.
Do not load application pages until an independently isolated disposable browser is verified.
"""
import argparse,hashlib,json,pathlib,urllib.parse,http.server,mimetypes,re
CSP="sandbox allow-scripts allow-same-origin; default-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; form-action 'none'; worker-src 'none'; frame-src 'self'; base-uri 'none'; object-src 'none'"
def fixture_path(url):
 p=urllib.parse.urlsplit(url)
 if p.scheme or p.netloc or p.fragment:raise ValueError('Fixture requests must be local static paths')
 if p.query and any(k not in ['build','v'] or not re.fullmatch(r'[A-Za-z0-9.-]{1,80}',v) for k,v in urllib.parse.parse_qsl(p.query,keep_blank_values=True)):raise ValueError('Only static build identity queries are allowed')
 decoded=urllib.parse.unquote(p.path)
 if '\\' in decoded or '\x00' in decoded or any(x in ['.','..'] for x in decoded.split('/')) or '%' in decoded:raise ValueError('Invalid static path')
 rel=decoded.lstrip('/')
 if rel.startswith(('rest/','auth/','functions/','api/','__')):raise ValueError('API routes forbidden')
 if not rel or rel.endswith('/'):rel+='index.html'
 return rel
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--manifest',required=True);p.add_argument('--sha256',required=True);p.add_argument('--allow-loopback',action='store_true');a=p.parse_args()
 if not a.allow_loopback:p.error('Explicit local serving flag required; browser isolation remains a separate gate')
 root=pathlib.Path(a.root).resolve();raw=pathlib.Path(a.manifest).read_bytes();assert hashlib.sha256(raw).hexdigest()==a.sha256;manifest=json.loads(raw);files={f['path']:f for f in manifest['files']}
 for name,item in files.items():
  file=(root/name);assert not file.is_symlink() and file.resolve().is_relative_to(root);assert hashlib.sha256(file.read_bytes()).hexdigest()==item['sha256']
 class Handler(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
   try:
    name=fixture_path(self.path);item=files[name];file=root/name;body=file.read_bytes();assert hashlib.sha256(body).hexdigest()==item['sha256']
   except Exception:self.send_error(404);return
   self.send_response(200);self.send_header('Content-Type','text/javascript' if name.endswith('.mjs') else mimetypes.guess_type(name)[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(body)));self.send_header('Content-Security-Policy',CSP);self.send_header('Referrer-Policy','no-referrer');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(body)
  def do_POST(self):self.send_error(405)
  do_PUT=do_PATCH=do_DELETE=do_POST
  def log_message(self,*args):pass
 server=http.server.HTTPServer(('127.0.0.1',0),Handler);print(json.dumps({'origin':'http://127.0.0.1:'+str(server.server_port),'browserIsolationVerified':False,'productionConnectionsAllowed':False}),flush=True);server.serve_forever()
if __name__=='__main__':main()
