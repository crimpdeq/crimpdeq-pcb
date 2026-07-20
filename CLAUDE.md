# CLAUDE.md

Guidance for Claude Code / agents working in this repo (Crimpdeq PCB).

## Start here

**Read `agents.md` first, before doing anything.** It is the canonical handoff: current
board variants, the latest session log, key decisions, tooling (KiCad + FreeRouting),
verification steps, and important constraints. Do not re-derive things it already records.

Reproduction scripts for the 4-layer reorg live in `tools/4layer/` (see its README).

## Non-negotiables (details in `agents.md`)

- Preserve the exact schematic connectivity — do not change pad nets or add/remove components
  unless explicitly asked. The frozen BOM, netlist, and routing rules are in agents.md
  ("Design Invariants — Components And Routing"); all changes must preserve them. Verify with
  `tools/4layer/verify.py` and, for equivalence to the upstream release,
  `tools/4layer/compare_connectivity.py`.
- Do not grow the board outline unless asked.
- Run FreeRouting **headless** (`java -Djava.awt.headless=true …`) or it hangs on a GUI dialog.
- Keep tool downloads (FreeRouting jar, JDK) OUTSIDE the repo.

## Commit your work

When you finish a unit of work, **commit it** — don't leave the deliverable uncommitted.

- Use focused commits with clear messages (e.g. `Add 4-layer antenna+LED-on-back PCB variant`).
- Commit the board files, gerber ZIP, DRC report, and renders together for a new package.
- Under each `pcb/designs/<name>/gerbers/` directory, track the Gerber **.zip**, not loose
  Gerber files.
- `.kicad_prl` is intentionally gitignored (local UI state); `.kicad_pro` and `.kicad_dru`
  ARE tracked.
- Leave unrelated untracked/generated files alone unless asked to clean them.
- Update `agents.md` (add to the Session Log) so the next session has current context.
