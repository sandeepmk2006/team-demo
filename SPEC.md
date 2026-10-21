# Todo app — spec (zero dependencies, Node >= 18, CommonJS)

## Data layer — src/store.js (owner: lead)
createStore() -> { list(), get(id), add(title), update(id, patch), remove(id) }
- Todo: { id: number (auto-increment from 1), title: string, done: boolean, createdAt: ISO string }
- add(title): title trimmed; empty or > 200 chars -> throws Error with .code = 'VALIDATION'
- update(id, patch): patch may contain title (same rules) and/or done (boolean, else VALIDATION); unknown keys ignored; missing id -> returns null
- get/remove: missing id -> null / false

## HTTP API — src/server.js (owner: copilot)
createServer(store) returns a node:http Server (not listening). `node src/server.js` listens on PORT (default 3000) and serves public/ at /.
- GET    /api/todos          -> 200 [todos]
- POST   /api/todos {title}  -> 201 todo | 400 {error}
- GET    /api/todos/:id      -> 200 todo | 404 {error}
- PATCH  /api/todos/:id {title?,done?} -> 200 todo | 400 | 404
- DELETE /api/todos/:id      -> 204 | 404
- Invalid JSON body -> 400; body > 10KB -> 413; unknown route -> 404; all JSON responses Content-Type application/json
- GET / -> public/index.html

## UI — public/index.html (owner: agy)
Single file, vanilla JS, uses the API: list, add, toggle done, delete, inline edit title. Shows API errors.

## Tests — tests/*.test.js (owner: agy), run with `node --test`
store.test.js covers every store rule; api.test.js starts createServer(createStore()) on port 0 and covers every route + error case.

## v2 features

### Persistent store — src/file-store.js (owner: agy, complexity high)
createFileStore(filePath) -> same interface and rules as createStore() (reuse/extend src/store.js behaviour exactly).
- Loads existing todos from filePath on creation (missing file = empty; corrupt JSON -> throws Error with .code = 'CORRUPT_STORE').
- Every add/update/remove persists synchronously and atomically (write temp file in same dir, then rename).
- ids continue after the highest loaded id.
- Tests: tests/file-store.test.js (temp dirs via fs.mkdtempSync(os.tmpdir())), covering reload, id continuation, atomic write, corrupt file.

### Filtering — src/server.js + public/index.html (owner: copilot, complexity medium)
- GET /api/todos?done=true|false filters by done; any other value of done -> 400.
- GET /api/todos?q=text -> case-insensitive substring match on title; combinable with done.
- UI: filter buttons All / Active / Done and a search box, using these query params.
- Tests: tests/filter.test.js.

### Wiring — lead
`node src/server.js` uses createFileStore(process.env.DATA_FILE) when DATA_FILE is set, else in-memory.
