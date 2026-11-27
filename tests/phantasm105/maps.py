import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import sys
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);N=2048;rng=np.random.default_rng(105)
grain=rng.normal(0,.014,(N,N)).astype('float32');low=np.asarray(Image.fromarray(rng.integers(90,165,(64,64),dtype=np.uint8)).resize((N,N),Image.Resampling.BICUBIC),dtype='float32')/255-.5
scratch=Image.new('L',(N,N),128);d=ImageDraw.Draw(scratch)
for i in range(16000):
 x,y=rng.integers(0,N,2);angle=rng.uniform(0,6.283);length=rng.uniform(3,90);d.line((x,y,x+np.cos(angle)*length,y+np.sin(angle)*length),fill=int(rng.integers(96,157)),width=1)
h=grain+low*.06+(np.asarray(scratch,dtype='float32')/255-.5)*.19
rough=np.clip(.43+low*.20+grain*1.5+(np.asarray(scratch)/255-.5)*.6,.26,.62)
base=np.clip(211+low*13+grain*10,195,223).astype('uint8');rgb=np.stack([base,np.minimum(base.astype('int16')+2,255).astype('uint8'),np.minimum(base.astype('int16')+3,255).astype('uint8')],2)
def save(a,name):Image.fromarray(a).save(out/name,format='WEBP',lossless=name!='cts105-normal.webp',quality=95,method=6)
save(rgb,'cts105-colour.webp');save(np.uint8(np.clip(h*.7+.5,0,1)*255),'cts105-height.webp');save(np.uint8(rough*255),'cts105-roughness.webp')
dy,dx=np.gradient(h);normal=np.stack([-dx*9,-dy*9,np.ones_like(h)],2);normal/=np.linalg.norm(normal,axis=2,keepdims=True);save(np.uint8((normal*.5+.5)*255),'cts105-normal.webp')
