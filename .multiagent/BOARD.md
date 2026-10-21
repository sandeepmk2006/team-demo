# Team board
Lead: claude | Agents: claude, agy, copilot

| # | Task | Owner | Model | Worktree/branch | Status | Verified by |
|---|------|-------|-------|-----------------|--------|-------------|
| 1 | SPEC.md + src/store.js | claude | opus 5.5 | main | merged | node smoke check |
| 2 | src/server.js HTTP API | copilot | auto | team/copilot-api | running | |
| 3 | public/index.html + tests/ | agy | gemini flash | team/agy-ui-tests | running | |
| 4 | cross-review + merge + full test run | claude | — | main | todo | |

## Notes / decisions
- Contract is SPEC.md; agents must not touch files they don't own.
