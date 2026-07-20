import pcbnew, sys, os

noroute_board = sys.argv[1]
ses_in = sys.argv[2]
out_board = sys.argv[3]

b = pcbnew.LoadBoard(noroute_board)
before = len(list(b.GetTracks()))

ok = False
try:
    ok = pcbnew.ImportSpecctraSES(b, ses_in)
except TypeError:
    ok = pcbnew.ImportSpecctraSES(ses_in)
after = len(list(b.GetTracks()))
print("ImportSpecctraSES ok=", ok, "tracks before=", before, "after=", after)

pcbnew.SaveBoard(out_board, b)
print("saved routed board:", out_board)
