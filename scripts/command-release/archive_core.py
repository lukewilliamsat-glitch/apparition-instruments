"""Exact generic NIGHTWATCH archive core; no SPECTRE overlay or network transport."""
from __future__ import annotations
import hashlib,io,json,re,stat,tarfile,unicodedata,zipfile
from dataclasses import dataclass
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


def make_bundle(payload:Payload,source_commit:str,kind:str):
    require(re.fullmatch(r'[a-f0-9]{40}',source_commit) is not None,'Source identity')
    require(kind in ('release','rollback'),'Bundle kind')
    raw=pages_zip(payload)
    receipt={'version':1,'kind':kind,'sourceCommit':source_commit,'payloadDigest':payload.digest(),'archiveSHA256':sha(raw),'archiveBytes':len(raw),'files':payload.manifest(),'directories':list(payload.directories)}
    return raw,receipt


def verify_bundle(raw,receipt,expected_receipt_sha):
    require(sha(canonical(receipt))==expected_receipt_sha,'Receipt digest mismatch')
    require(set(receipt)=={'version','kind','sourceCommit','payloadDigest','archiveSHA256','archiveBytes','files','directories'},'Receipt schema')
    require(type(receipt['version']) is int and receipt['version']==1 and receipt['kind'] in ('release','rollback'),'Receipt version/kind')
    require(re.fullmatch(r'[a-f0-9]{40}',receipt['sourceCommit']) is not None,'Receipt source')
    payload=read_pages_zip(raw,receipt['archiveSHA256'],receipt['archiveBytes'])
    require(payload.manifest()==receipt['files'] and list(payload.directories)==receipt['directories'],'Complete inventory mismatch')
    require(payload.digest()==receipt['payloadDigest'],'Payload digest mismatch');return payload


def _snapshot(value,expected,holiday,now):
    require(isinstance(value,dict),'Snapshot missing')
    require(isinstance(expected.get('deploymentId'),str) and 0<len(expected['deploymentId'])<=200,'Active deployment identity missing')
    require(isinstance(expected.get('sourceCommit'),str) and re.fullmatch('[a-f0-9]{40}',expected['sourceCommit']),'Active source identity missing')
    require(isinstance(expected.get('payloadDigest'),str) and re.fullmatch('[a-f0-9]{64}',expected['payloadDigest']),'Active payload identity missing')
    require(value.get('deploymentId')==expected['deploymentId'],'Active deployment drift')
    require(value.get('sourceCommit')==expected['sourceCommit'],'Active source drift')
    require(value.get('payloadDigest')==expected['payloadDigest'],'Complete active-payload association missing/drifted')
    require(value.get('holidayEvidenceSHA256')==holiday,'Holiday evidence drift')
    require(value.get('holidayMode') is True and value.get('physicalOrdersPaused') is True and value.get('onlineToolsAvailable') is True,'Holiday protection unverified')
    require(value.get('closureWindow')==['2026-10-17','2026-11-15'],'Closure window mismatch')
    require(type(value.get('observedAt')) is int and 0<=now-value['observedAt']<=300,'Stale current-state evidence')
    require(type(value.get('competingPublishers')) is int and value['competingPublishers']==0,'Concurrent publisher')
