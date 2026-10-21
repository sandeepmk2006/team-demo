# team-demo

A small zero-dependency todo app (Node >= 18) built as a **real test of team mode** from
[multi-codingagent](https://github.com/sandeepmk2006/multi-codingagent): Claude Code led, while
Antigravity (agy) and GitHub Copilot worked in parallel as sub-agents in separate git worktrees.

## Who built what
| Part | Author | Reviewed by |
|---|---|---|
| `SPEC.md`, `src/store.js`, wiring, merges, review fixes | Claude (lead) | — |
| `src/server.js` (REST API) | Copilot | Claude |
| `public/index.html`, store + API tests | agy (Gemini Flash) | Copilot |
| Filtering (`?done=`, `?q=`) + UI filters | Copilot | agy (Claude Sonnet 4.6) |
| `src/file-store.js` (persistence) | agy (Claude Opus 4.6) | Copilot |

Full task history, stalls and review findings: [`.multiagent/BOARD.md`](.multiagent/BOARD.md). Git history shows each agent's commits.

## Run
```bash
npm start                         # http://localhost:3000, in-memory
DATA_FILE=todos.json npm start    # persist to a JSON file
npm test                          # 87 tests
```

## API
`GET /api/todos[?done=true|false][&q=text]` · `POST /api/todos {title}` · `GET|PATCH|DELETE /api/todos/:id` — see `SPEC.md`.
