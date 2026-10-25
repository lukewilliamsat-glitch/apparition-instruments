"""Offline Pages payload verification/assembly. No network, generators or image decoder."""
from __future__ import annotations
import hashlib,html,io,json,posixpath,re,stat,tarfile,unicodedata,zipfile
from html.parser import HTMLParser
from dataclasses import dataclass
from urllib.parse import unquote_plus,urlsplit,urlunsplit

ANCHOR_SHA='d358efe91b5db0b0845505afd91a3eaa079c4bc0aeaa9a331fe5916d4266e349'
ANCHOR_BYTES=20301705
OLD_CSS='f72258fb8d455513d2cb38e3672f914207f81ee37664c7e6b32edc7d9c320f26'
NEW_CSS='16d6ebbd2372d54e32565a7999edfd1bc9152c785b77f1bcbf79ee47bba1794a'
MAX_ZIP=22*1024*1024
MAX_TAR=64*1024*1024
MAX_FILE=8*1024*1024
MAX_ENTRIES=4096
class Rejected(ValueError):pass

def require(condition,message):
    if not condition:raise Rejected(message)
def sha(data):return hashlib.sha256(data).hexdigest()
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')
def strict_json(data):
    def pairs(items):
        result={}
        for k,v in items:
            require(k not in result,'Duplicate JSON key');result[k]=v
        return result
    return json.loads(data.decode('utf-8'),object_pairs_hook=pairs,parse_constant=lambda x:(_ for _ in ()).throw(Rejected('Nonfinite JSON')))
def safe_path(name):
    require(isinstance(name,str) and 0<len(name.encode('utf-8'))<=512,'Path length/type')
    require(not name.startswith('/') and '\\' not in name and ':' not in name and '?' not in name and '#' not in name,'Unsafe path')
    require(not any(ord(c)<32 or ord(c)==127 for c in name),'Control in path')
    parts=name.split('/')
    require(len(parts)<=32 and all(p not in ('','.','..','.git','.github') for p in parts),'Noncanonical/reserved path')
    require(unicodedata.normalize('NFC',name)==name,'Noncanonical Unicode path')
    return name.casefold()

def inventory(files):
    require(isinstance(files,dict) and 0<len(files)<=MAX_ENTRIES,'File count/type')
    seen=set();total=0;out=[]
    for name,data in sorted(files.items()):
        key=safe_path(name);require(key not in seen,'Conflicting file names');seen.add(key)
        require(isinstance(data,bytes) and len(data)<=MAX_FILE,'File size/type');total+=len(data)
        require(total<=MAX_TAR,'Total file size')
        out.append({'path':name,'bytes':len(data),'sha256':sha(data)})
    for key in seen:
        require(not any(parent in seen for parent in _parents(key)),'File/directory collision')
    return out

def _parents(name):
    parts=name.split('/')
    return ['/'.join(parts[:i]) for i in range(1,len(parts))]

def payload_digest(files):return sha(canonical(inventory(files)))
@dataclass(frozen=True)
class Payload:
    files:dict[str,bytes]
    directories:tuple[str,...]=()
    def digest(self):return payload_digest(self.files)
    def manifest(self):return inventory(self.files)


def read_pages_zip(raw:bytes,expected_sha:str,expected_size:int)->Payload:
    require(isinstance(raw,bytes) and len(raw)<=MAX_ZIP,'ZIP size/type')
    require(len(raw)==expected_size and sha(raw)==expected_sha,'Original ZIP integrity')
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            entries=z.infolist();require(len(entries)==1,'Expected one Pages envelope')
            item=entries[0];mode=(item.external_attr>>16)&0xffff
            require(item.filename=='artifact.tar' and stat.S_IFMT(mode) in (0,stat.S_IFREG),'Unsafe envelope path/type')
            require(not item.flag_bits&1 and item.compress_type in (zipfile.ZIP_STORED,zipfile.ZIP_DEFLATED),'ZIP encoding')
            require(item.file_size<=MAX_TAR and item.file_size/max(1,item.compress_size)<=1000,'ZIP expansion')
            with z.open(item) as source:
                chunks=[];n=0
                while True:
                    b=source.read(65536)
                    if not b:break
                    n+=len(b);require(n<=MAX_TAR,'ZIP expansion');chunks.append(b)
                require(n==item.file_size,'ZIP truncation');tar=b''.join(chunks)
        return _read_tar(tar)
    except (zipfile.BadZipFile,tarfile.TarError,EOFError,UnicodeError) as e:raise Rejected('Corrupt archive') from e


def _read_tar(raw):
    require(len(raw)<=MAX_TAR and len(raw)%512==0,'TAR size/alignment')
    stream=io.BytesIO(raw);files={};dirs=[];seen={};entry_count=0;total=0
    while True:
        block=stream.read(512);require(len(block)==512,'Truncated TAR header')
        if not any(block):
            second=stream.read(512);require(len(second)==512 and not any(second),'TAR end markers')
            require(not any(stream.read()),'TAR trailing data');break
        info=tarfile.TarInfo.frombuf(block,'utf-8','strict');entry_count+=1
        require(entry_count<=MAX_ENTRIES*2,'TAR entry count')
        require(info.type in (tarfile.REGTYPE,tarfile.AREGTYPE,tarfile.DIRTYPE),'TAR link/special/extended type')
        require(not info.mode&0o7000,'Privileged mode')
        name=info.name[2:] if info.name.startswith('./') else info.name
        if name in ('','.'):require(info.isdir(),'Invalid root entry');key='.'
        else:key=safe_path(name.rstrip('/') if info.isdir() else name)
        require(key not in seen,'Duplicate/conflicting TAR path');seen[key]='dir' if info.isdir() else 'file'
        require(not any(seen.get(parent)=='file' for parent in _parents(key)),'File/directory prefix')
        if info.isdir():require(info.size==0,'Directory contents');dirs.append(name.rstrip('/') or '.');continue
        require(key!='.' and 0<=info.size<=MAX_FILE,'TAR file size');total+=info.size
        require(total<=MAX_TAR,'TAR total size')
        data=stream.read(info.size);require(len(data)==info.size,'Truncated TAR file');files[name]=data
        pad=(-info.size)%512;require(not any(stream.read(pad)),'TAR file padding')
    inventory(files)
    require('index.html' in files and 0<len(files['index.html'])<=2*1024*1024,'Missing/oversized Pages root')
    for key,kind in seen.items():
        if kind=='file':require(not any(x.startswith(key+'/') for x in seen),'File/directory collision')
    return Payload(files,tuple(sorted(dirs)))


def pages_zip(payload:Payload)->bytes:
    inventory(payload.files)
    tarbuf=io.BytesIO()
    with tarfile.open(fileobj=tarbuf,mode='w',format=tarfile.USTAR_FORMAT) as tar:
        for path in sorted(set(payload.directories)):
            name='.' if path in ('.','') else path
            if name!='.':safe_path(name)
            info=tarfile.TarInfo('./'+name if name!='.' else '.');info.type=tarfile.DIRTYPE;info.mode=0o755;tar.addfile(info)
        for name,data in sorted(payload.files.items()):
            info=tarfile.TarInfo('./'+name);info.size=len(data);info.mode=0o644;tar.addfile(info,io.BytesIO(data))
    require(len(tarbuf.getbuffer())<=MAX_TAR,'Expanded package bound')
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        info=zipfile.ZipInfo('artifact.tar',(1980,1,1,0,0,0));info.external_attr=(stat.S_IFREG|0o644)<<16;info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,tarbuf.getvalue())
    require(len(out.getbuffer())<=MAX_ZIP,'Packaged ZIP bound')
    result=out.getvalue();read_pages_zip(result,sha(result),len(result));return result


def stamp_css(raw:bytes,path:str,css_hash=NEW_CSS)->bytes:
    require(len(raw)<=2*1024*1024,'HTML size')
    text=raw.decode('utf-8');offsets=[0]
    for m in re.finditer('\n',text):offsets.append(m.end())
    edits=[]
    class Links(HTMLParser):
        def handle_starttag(self,tag,attrs):
            attributes=dict(attrs)
            if tag!='link' or 'stylesheet' not in attributes.get('rel','').lower().split():return
            url=attributes.get('href','');u=urlsplit(url)
            if u.scheme or u.netloc:
                require(posixpath.basename(u.path)!='customer-ui.css','Absolute CSS reference requires review');return
            target=posixpath.normpath(u.path.lstrip('/') if u.path.startswith('/') else posixpath.join(posixpath.dirname(path),u.path))
            if target!='customer-ui.css':return
            query=[segment for segment in u.query.split('&') if segment and unquote_plus(segment.split('=',1)[0])!='nw'];query.append('nw='+css_hash)
            url=urlunsplit(('', '',u.path,'&'.join(query),u.fragment))
            start=self.get_starttag_text()
            matches=list(re.finditer(r"""(\bhref\s*=\s*)([\"'])([^\"']*)([\"'])""",start,re.I))
            require(len(matches)==1,'CSS reference attribute ambiguity')
            m=matches[0];require(m[2]==m[4],'CSS reference quote')
            if '&amp;' in m[3]:url=url.replace('&','&amp;')
            line,col=self.getpos();absolute=offsets[line-1]+col
            edits.append((absolute+m.start(3),absolute+m.end(3),url))
        handle_startendtag=handle_starttag
    parser=Links(convert_charrefs=True);parser.feed(text);parser.close()
    for a,b,value in reversed(edits):text=text[:a]+value+text[b:]
    return text.encode('utf-8')


def assemble_spectre(baseline:Payload,css:bytes):
    inventory(baseline.files)
    require(sha(baseline.files.get('customer-ui.css',b''))==OLD_CSS,'Baseline CSS drift')
    require(sha(css)==NEW_CSS,'Unapproved CSS')
    files=dict(baseline.files);files['customer-ui.css']=css;changes=[]
    for name,original in baseline.files.items():
        if name.endswith('.html'):files[name]=stamp_css(original,name)
    verify_overlay(baseline,Payload(files,baseline.directories),css)
    for name in sorted(files):
        if files[name]!=baseline.files[name]:changes.append({'path':name,'before':sha(baseline.files[name]),'after':sha(files[name]),'reason':'verified hero CSS' if name=='customer-ui.css' else 'CSS cache identity only'})
    require(any(r['reason']=='CSS cache identity only' for r in changes),'No verifiable CSS reference')
    return Payload(files,baseline.directories),changes

def verify_overlay(baseline:Payload,candidate:Payload,css:bytes):
    inventory(candidate.files)
    require(set(baseline.files)==set(candidate.files),'Added/deleted payload file')
    require(candidate.directories==baseline.directories,'Changed directory inventory')
    require(sha(css)==NEW_CSS and sha(baseline.files.get('customer-ui.css',b''))==OLD_CSS,'CSS approval mismatch')
    for name,before in baseline.files.items():
        expected=css if name=='customer-ui.css' else stamp_css(before,name) if name.endswith('.html') else before
        require(candidate.files[name]==expected,'Unexpected payload change: '+name)


def make_bundle(payload:Payload,source_commit:str,kind:str):
    require(re.fullmatch(r'[a-f0-9]{40}',source_commit) is not None,'Source identity')
    require(kind in ('release','rollback'),'Bundle kind')
    raw=pages_zip(payload)
    receipt={'version':1,'kind':kind,'sourceCommit':source_commit,'payloadDigest':payload.digest(),'archiveSHA256':sha(raw),'archiveBytes':len(raw),'files':payload.manifest(),'directories':list(payload.directories)}
    return raw,receipt

def verify_bundle(raw,receipt,expected_receipt_sha):
    require(sha(canonical(receipt))==expected_receipt_sha,'Receipt digest mismatch')
    require(set(receipt)=={'version','kind','sourceCommit','payloadDigest','archiveSHA256','archiveBytes','files','directories'},'Receipt schema')
    require(receipt['version']==1 and receipt['kind'] in ('release','rollback'),'Receipt version/kind')
    require(re.fullmatch(r'[a-f0-9]{40}',receipt['sourceCommit']) is not None,'Receipt source')
    payload=read_pages_zip(raw,receipt['archiveSHA256'],receipt['archiveBytes'])
    require(payload.manifest()==receipt['files'] and list(payload.directories)==receipt['directories'],'Complete inventory mismatch')
    require(payload.digest()==receipt['payloadDigest'],'Payload digest mismatch');return payload
