import pcbnew, sys

inb=sys.argv[1]; outb=sys.argv[2]
b=pcbnew.LoadBoard(inb)
def FM(v): return pcbnew.FromMM(v)
def mm(v): return round(pcbnew.ToMM(v),2)

ebb=b.GetBoardEdgesBoundingBox()
X0,Y0,X1,Y1=ebb.GetX(),ebb.GetY(),ebb.GetX()+ebb.GetWidth(),ebb.GetY()+ebb.GetHeight()

gnd=b.FindNet("GND"); v3=b.FindNet("+3V3")
print("GND code",gnd.GetNetCode(),"+3V3 code",v3.GetNetCode())

def add_zone(net, layers, name, prio=0):
    z=pcbnew.ZONE(b)
    ls=pcbnew.LSET()
    for L in layers: ls.AddLayer(L)
    z.SetLayerSet(ls)
    if net is not None:
        z.SetNet(net)
    z.SetZoneName(name)
    z.SetAssignedPriority(prio)
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_FULL)
    z.SetLocalClearance(FM(0.2))
    z.SetMinThickness(FM(0.2))
    poly=z.Outline(); poly.NewOutline()
    for (x,y) in [(X0,Y0),(X1,Y0),(X1,Y1),(X0,Y1)]:
        poly.Append(int(x),int(y))
    b.Add(z)
    return z

def add_rulearea(layers, name, x0,y0,x1,y1, no_fill=True, no_tracks=False, no_vias=False):
    z=pcbnew.ZONE(b)
    z.SetIsRuleArea(True)
    z.SetDoNotAllowZoneFills(no_fill)
    z.SetDoNotAllowTracks(no_tracks)
    z.SetDoNotAllowVias(no_vias)
    z.SetDoNotAllowPads(False)
    z.SetDoNotAllowFootprints(False)
    ls=pcbnew.LSET()
    for L in layers: ls.AddLayer(L)
    z.SetLayerSet(ls)
    z.SetZoneName(name)
    poly=z.Outline(); poly.NewOutline()
    for (x,y) in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]:
        poly.Append(int(x),int(y))
    b.Add(z)
    return z

ALL=[pcbnew.F_Cu,pcbnew.In1_Cu,pcbnew.In2_Cu,pcbnew.B_Cu]
# antenna keepout: no copper fill on any layer (RF)
add_rulearea(ALL,"antenna_keepout", FM(134.8),Y0, FM(148.7),FM(53.4), no_fill=True, no_tracks=True, no_vias=True)

# planes / pours
add_zone(gnd,[pcbnew.In1_Cu],"L2_GND_plane",prio=1)      # solid GND reference
add_zone(v3,[pcbnew.In2_Cu],"L3_3V3_power",prio=1)        # power/signal hybrid: 3V3 pour
add_zone(gnd,[pcbnew.B_Cu],"L4_GND_flood",prio=0)         # secondary GND flood
add_zone(gnd,[pcbnew.F_Cu],"L1_GND_flood",prio=0)         # top GND flood around signals

# stitching vias to tie planes to nets: place GND vias near IC/connector GND pads in open spots
def add_via(x,y,net):
    v=pcbnew.PCB_VIA(b)
    v.SetPosition(pcbnew.VECTOR2I(int(x),int(y)))
    v.SetDrill(FM(0.3)); v.SetWidth(FM(0.6))
    v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
    v.SetNet(net)
    b.Add(v)
    return v

# collect GND and +3V3 SMD pad locations; add a via offset from each (a subset) to stitch
def pad_pts(net):
    pts=[]
    for f in b.GetFootprints():
        for p in f.Pads():
            if p.GetNetname()==net:
                pts.append((f.GetReference(),p.GetPadName(),p.GetPosition().x,p.GetPosition().y))
    return pts

# refill zones first so we know connectivity; add stitching after
filler=pcbnew.ZONE_FILLER(b)
filler.Fill(b.Zones())
b.BuildConnectivity()
pcbnew.SaveBoard(outb,b)
print("saved with pours (pre-stitch):", outb)
print("zones:", len(list(b.Zones())))
