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
