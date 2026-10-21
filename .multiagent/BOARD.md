# Team board
Lead: claude | Agents: claude, agy, copilot

| # | Task | Owner | Model | Worktree/branch | Status | Verified by |
|---|------|-------|-------|-----------------|--------|-------------|
| 1 | SPEC.md + src/store.js | claude | opus 5.5 | main | merged | node smoke check |
| 2 | src/server.js HTTP API | copilot | auto | team/copilot-api | merged | claude smoke test; review by claude (agy review timed out) — 2 fixes |
| 3 | public/index.html + tests/ | agy | gemini flash | team/agy-ui-tests2 (~/.multiagent-worktrees) | merged | claude ran 64 tests; review by copilot — 1 fix |
| 4 | cross-review + merge + full test run | claude | opus 5.5 | main | merged | npm test 65/65 + live server check |

## Notes / decisions
- Contract is SPEC.md; agents must not touch files they don't own.
- agy stalled in untrusted D:	eam-demo (approval prompts) -> worktree moved under ~/.multiagent-worktrees (trusted). Led to team-worktree in the plugin.
- agy looped 24x trying to create a scratch dir when it could not run api tests (server not on its branch) -> merged copilot's branch into agy's, re-briefed with 'no scratch files'.
- agy review needs --yolo (cannot run commands otherwise); then timed out at 8m -> lead reviewed instead.
- Fixes on merge: server 500 instead of hang on unexpected errors (+ regression test), content-type by extension, stronger list test, npm test script for Node 22.

## Round 2 — v2 features (agy-run + complexity routing)
| # | Task | Owner | Model | Status | Verified by |
|---|------|-------|-------|--------|-------------|
| 5 | Spec v2 | claude | opus 5.5 | merged | — |
| 6 | src/file-store.js + tests | agy | claude-opus-4-6-thinking (c=high), 122s, no stalls | merged | 80/80; review by copilot (c=high): 3 findings, all confirmed |
| 7 | filtering server + UI + tests | copilot | auto, balance (c=medium), 112s | merged | 70/70; review by agy (claude-sonnet-4-6, c=medium): 2 of 5 findings confirmed |
| 8 | DATA_FILE wiring, review fixes, merge | claude | opus 5.5 | merged | npm test 87/87; restart persistence e2e |

- Fixes: file-store writes to disk before touching memory (failed write = no divergence, tmp cleaned), loaded records validated (dup/invalid ids -> CORRUPT_STORE), validation reused from store.js, locale-independent search, combined-filter test made meaningful.
- Plugin bug found by this run: Copilot model "auto" rejects --reasoning-effort, and the no-op check missed it -> fixed (auto-tier only; git-state comparison).
