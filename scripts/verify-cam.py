#!/usr/bin/env python3
"""Compare generated CAM geometry against the immutable reviewed source release.

Install scripts/requirements-cam.txt. With no argument, download the pinned
GitHub attachment into .tools/ and verify its SHA-256 before reading it.
This checks rendered area, not original Gerber text or KiCad DRC.
"""
import pathlib,json,warnings,argparse,hashlib,urllib.request,zipfile,sys,io
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASELINE_URL='https://github.com/user-attachments/files/32196761/artifact.zip'
BASELINE_SHA256='04a550f106794759ea77e9052ce06560362f5513abd1621cf5e8ad5018f52799'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline',type=pathlib.Path,help='Directory containing original crimpdeq Gerbers (default: pinned attachment)')
args=parser.parse_args()
if args.baseline:
 old=args.baseline
else:
 cache=ROOT/'.tools/cam-baseline';cache.mkdir(parents=True,exist_ok=True)
 archive=cache/'artifact.zip'
 if not archive.exists():urllib.request.urlretrieve(BASELINE_URL,archive)
 if hashlib.sha256(archive.read_bytes()).hexdigest()!=BASELINE_SHA256:raise SystemExit('Baseline SHA256 mismatch')
 with zipfile.ZipFile(archive) as package:
  with zipfile.ZipFile(io.BytesIO(package.read('crimpdeq.zip'))) as z:
   for name in z.namelist():
    target=cache/pathlib.Path(name).name
    if target.suffix.lower() in ('.gtl','.gbl','.g1','.g2','.gtp','.gbp','.gts','.gbs'):target.write_bytes(z.read(name))
 old=cache
new=ROOT/'dist/crimpdeq/gerbers';results=[]
from gerbonara import GerberFile,ExcellonFile
from shapely.geometry import Polygon,Point,LineString
from shapely import union_all,make_valid,set_precision
from shapely.affinity import translate
warnings.simplefilter('ignore')
def shape(p):
 n=type(p).__name__
 if n=='Circle':return Point(p.x,p.y).buffer(p.r,quad_segs=64)
 if n=='Line':return LineString([(p.x1,p.y1),(p.x2,p.y2)]).buffer(p.width/2,quad_segs=64)
 if n=='Rectangle':p=p.to_arc_poly()
 if type(p).__name__=='ArcPoly':return make_valid(Polygon(p.approximate_arcs(max_error=.0001).outline))
 raise ValueError(n)
def geom(path):
 g=GerberFile.open(path);shapes=[];result=Polygon();dark=True
 for o in g.objects:
  for p in o.to_primitives():
   if p.polarity_dark!=dark:
    q=union_all(shapes);result=result.union(q) if dark else result.difference(q)
    shapes=[];dark=p.polarity_dark
   shapes.append(shape(p))
 q=union_all(shapes);return result.union(q) if dark else result.difference(q)
for a,b in [('F_Cu.gbr','crimpdeq-F_Cu.gtl'),('B_Cu.gbr','crimpdeq-B_Cu.gbl'),('In1_Cu.gbr','crimpdeq-In1_Cu.g1'),('In2_Cu.gbr','crimpdeq-In2_Cu.g2'),('F_Paste.gbr','crimpdeq-F_Paste.gtp'),('B_Paste.gbr','crimpdeq-B_Paste.gbp'),('F_Mask.gbr','crimpdeq-F_Mask.gts'),('B_Mask.gbr','crimpdeq-B_Mask.gbs')]:
 x=set_precision(translate(geom(old/b),-142.45,67.4),.000001);y=set_precision(geom(new/a),.000001)
 d=x.symmetric_difference(y)
 r={'layer':a,'original_area_mm2':x.area,'converted_area_mm2':y.area,'difference_mm2':d.area,'diff_bounds':d.bounds if not d.is_empty else None}
 results.append(r);print(r,flush=True)
 r['passed']=d.area<=1e-5
report={'passed':all(r['passed'] for r in results),'area_tolerance_mm2':1e-5,'coordinate_grid_mm':1e-6,'arc_approximation_max_error_mm':0.0001,'baseline_sha256':BASELINE_SHA256 if not args.baseline else None,'layers':results}
(ROOT/'dist/crimpdeq/cam-equivalence.json').write_text(json.dumps(report,indent=2)+'\n')
sys.exit(0 if report['passed'] else 1)
