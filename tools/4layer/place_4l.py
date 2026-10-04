import pcbnew, sys, json, os

TOL = pcbnew.FromMM(0.08)
def mm(v): return pcbnew.ToMM(v)
def FM(v): return pcbnew.FromMM(v)

def pad_extent(fp):
    xs=[]; ys=[]
    for p in fp.Pads():
        bb=p.GetBoundingBox(); xs+=[bb.GetX(),bb.GetX()+bb.GetWidth()]; ys+=[bb.GetY(),bb.GetY()+bb.GetHeight()]
    if not xs:
        bb=fp.GetBoundingBox(); return (bb.GetX(),bb.GetY(),bb.GetX()+bb.GetWidth(),bb.GetY()+bb.GetHeight())
    return (min(xs),min(ys),max(xs),max(ys))
def boxes_overlap(a,b): return not (a[2]<=b[0] or b[2]<=a[0] or a[3]<=b[1] or b[3]<=a[1])
def is_through(fp):
    for p in fp.Pads():
        if p.GetAttribute() in (pcbnew.PAD_ATTRIB_PTH, pcbnew.PAD_ATTRIB_NPTH): return True
    return False

in_board=sys.argv[1]; moves_json=sys.argv[2]; out_noroute=sys.argv[3]; dsn_out=sys.argv[4]
clearance=float(sys.argv[5]) if len(sys.argv)>5 else 0.2
moves=json.load(open(moves_json))
b=pcbnew.LoadBoard(in_board)

# --- convert to 4 copper layers ---
b.SetCopperLayerCount(4)
# name inner layers
b.SetLayerName(pcbnew.In1_Cu, "In1.Cu")
b.SetLayerName(pcbnew.In2_Cu, "In2.Cu")
print("copper layers:", b.GetCopperLayerCount())

fps={f.GetReference():f for f in b.GetFootprints()}
moved={m['ref'] for m in moves}
for mv in moves:
    f=fps[mv['ref']]
    want=pcbnew.F_Cu if mv.get('layer')=='F' else (pcbnew.B_Cu if mv.get('layer')=='B' else None)
    if want is not None and f.GetLayer()!=want: f.Flip(f.GetPosition(), True)
    if 'rot' in mv: f.SetOrientationDegrees(mv['rot'])
    if 'x' in mv and 'y' in mv: f.SetPosition(pcbnew.VECTOR2I(FM(mv['x']),FM(mv['y'])))

# overlap check involving moved refs
ebb=b.GetBoardEdgesBoundingBox()
ex0,ey0,ex1,ey1=ebb.GetX(),ebb.GetY(),ebb.GetX()+ebb.GetWidth(),ebb.GetY()+ebb.GetHeight()
infos=[(f.GetReference(),f.GetLayer(),is_through(f),pad_extent(f)) for f in b.GetFootprints()]
clr=FM(clearance); problems=[]
for i in range(len(infos)):
    r1,l1,t1,e1=infos[i]
    if r1 in moved and (e1[0]<ex0-TOL or e1[1]<ey0-TOL or e1[2]>ex1+TOL or e1[3]>ey1+TOL):
        problems.append(f"OUTLINE {r1} [{mm(e1[0]):.2f},{mm(e1[1]):.2f},{mm(e1[2]):.2f},{mm(e1[3]):.2f}]")
    for j in range(i+1,len(infos)):
        r2,l2,t2,e2=infos[j]
        if r1 not in moved and r2 not in moved: continue
        if not ((l1==l2) or t1 or t2): continue
        if boxes_overlap((e1[0]-clr,e1[1]-clr,e1[2]+clr,e1[3]+clr), e2):
            problems.append(f"OVERLAP {r1}({'F' if l1==pcbnew.F_Cu else 'B'}{'/TH' if t1 else ''}) <-> {r2}({'F' if l2==pcbnew.F_Cu else 'B'}{'/TH' if t2 else ''})")
if problems:
    print("PLACEMENT PROBLEMS (moved-involving):")
    for p in problems: print("  "+p)
else:
    print("PLACEMENT OK: no new overlaps involving moved parts.")

# NOTE: keepouts (antenna, HX711 via) are injected directly into the DSN for FreeRouting,
# and added as proper KiCad zones to the routed board afterward. Not added here.

# FULL rip-up of tracks/vias
tr=list(b.GetTracks())
for t in tr: b.RemoveNative(t)
b.BuildListOfNets()
pcbnew.SaveBoard(out_noroute,b)
ok=pcbnew.ExportSpecctraDSN(b,dsn_out)
print(f"full rip: removed {len(tr)}; DSN ok={ok} size={os.path.getsize(dsn_out) if os.path.exists(dsn_out) else -1}")
print("RESULT:", "PROBLEMS" if problems else "CLEAN")
