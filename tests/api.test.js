'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('API routes and SPEC compliance', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = require('../src/server.js').createServer(require('../src/store.js').createStore());
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
    });
  });

  describe('GET /api/todos (list)', () => {
    it('initially returns 200 with an empty array', async () => {
      const res = await fetch(`${baseUrl}/api/todos`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const body = await res.json();
      assert.deepEqual(body, []);
    });
  });

  describe('POST /api/todos (create 201)', () => {
    it('creates a new todo and returns 201 with created object', async () => {
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test todo 1' }),
      });

      assert.equal(res.status, 201);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const todo = await res.json();
      assert.equal(todo.id, 1);
      assert.equal(todo.title, 'Test todo 1');
      assert.equal(todo.done, false);
      assert.equal(typeof todo.createdAt, 'string');
      assert.ok(!Number.isNaN(Date.parse(todo.createdAt)));
    });

    it('trims title whitespace on creation', async () => {
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   Trimmed task   ' }),
      });

      assert.equal(res.status, 201);
      const todo = await res.json();
      assert.equal(todo.title, 'Trimmed task');
    });

    it('accepts title with exactly 200 characters', async () => {
      const title200 = 'x'.repeat(200);
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title200 }),
      });

      assert.equal(res.status, 201);
      const todo = await res.json();
      assert.equal(todo.title, title200);
    });
  });

  describe('POST /api/todos (create invalid 400)', () => {
    it('returns 400 if title property is missing', async () => {
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'title must be a string');
    });

    it('returns 400 if title is empty or only whitespace', async () => {
      for (const emptyTitle of ['', '   ', '\t\n']) {
        const res = await fetch(`${baseUrl}/api/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: emptyTitle }),
        });

        assert.equal(res.status, 400);
        assert.equal(res.headers.get('content-type'), 'application/json');
        const data = await res.json();
        assert.equal(data.error, 'title is required');
      }
    });

    it('returns 400 if title is not a string', async () => {
      for (const invalidTitle of [123, true, null, []]) {
        const res = await fetch(`${baseUrl}/api/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: invalidTitle }),
        });

        assert.equal(res.status, 400);
        assert.equal(res.headers.get('content-type'), 'application/json');
        const data = await res.json();
        assert.equal(data.error, 'title must be a string');
      }
    });

    it('returns 400 if title exceeds 200 characters', async () => {
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'a'.repeat(201) }),
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'title must be at most 200 characters');
    });
  });

  describe('GET /api/todos after creation', () => {
    it('returns 200 with an array containing all created todos', async () => {
      const res = await fetch(`${baseUrl}/api/todos`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const list = await res.json();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 3);
      assert.equal(list[0].id, 1);
    });
  });

  describe('GET /api/todos/:id (get 200/404)', () => {
    it('returns 200 and todo object when id exists', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const todo = await res.json();
      assert.equal(todo.id, 1);
      assert.equal(todo.title, 'Test todo 1');
      assert.equal(todo.done, false);
      assert.equal(typeof todo.createdAt, 'string');
    });

    it('returns 404 when id does not exist', async () => {
      const res = await fetch(`${baseUrl}/api/todos/99999`);
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'not found');
    });
  });

  describe('PATCH /api/todos/:id (PATCH title/done 200)', () => {
    it('updates title and returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated title 1' }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const todo = await res.json();
      assert.equal(todo.id, 1);
      assert.equal(todo.title, 'Updated title 1');
      assert.equal(todo.done, false);
    });

    it('updates done status and returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: true }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const todo = await res.json();
      assert.equal(todo.id, 1);
      assert.equal(todo.title, 'Updated title 1');
      assert.equal(todo.done, true);
    });

    it('updates both title and done simultaneously and returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Both updated', done: false }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const todo = await res.json();
      assert.equal(todo.id, 1);
      assert.equal(todo.title, 'Both updated');
      assert.equal(todo.done, false);
    });

    it('ignores unknown keys in patch and returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Known title', unknownKey: 'ignored' }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const todo = await res.json();
      assert.equal(todo.id, 1);
      assert.equal(todo.title, 'Known title');
      assert.equal(todo.unknownKey, undefined);
    });
  });

  describe('PATCH /api/todos/:id (PATCH invalid 400)', () => {
    it('returns 400 for empty or invalid title in patch', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ' }),
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'title is required');
    });

    it('returns 400 for title exceeding 200 characters in patch', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'b'.repeat(201) }),
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'title must be at most 200 characters');
    });

    it('returns 400 if done is not a boolean', async () => {
      for (const invalidDone of ['true', 1, null, 0, {}]) {
        const res = await fetch(`${baseUrl}/api/todos/1`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done: invalidDone }),
        });

        assert.equal(res.status, 400);
        assert.equal(res.headers.get('content-type'), 'application/json');
        const data = await res.json();
        assert.equal(data.error, 'done must be a boolean');
      }
    });

    it('returns 400 if patch is not an object', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('not-an-object'),
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'patch must be an object');
    });
  });

  describe('PATCH /api/todos/:id (PATCH missing 404)', () => {
    it('returns 404 when patching non-existent id', async () => {
      const res = await fetch(`${baseUrl}/api/todos/99999`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Non-existent todo' }),
      });

      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'not found');
    });
  });

  describe('DELETE /api/todos/:id (DELETE 204 then 404)', () => {
    it('returns 204 on deletion, then 404 on subsequent DELETE or GET', async () => {
      const createRes = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Item to delete' }),
      });
      assert.equal(createRes.status, 201);
      const { id } = await createRes.json();

      const delRes = await fetch(`${baseUrl}/api/todos/${id}`, {
        method: 'DELETE',
      });
      assert.equal(delRes.status, 204);
      const text = await delRes.text();
      assert.equal(text, '');

      const getRes = await fetch(`${baseUrl}/api/todos/${id}`);
      assert.equal(getRes.status, 404);
      assert.equal(getRes.headers.get('content-type'), 'application/json');

      const repeatDelRes = await fetch(`${baseUrl}/api/todos/${id}`, {
        method: 'DELETE',
      });
      assert.equal(repeatDelRes.status, 404);
      assert.equal(repeatDelRes.headers.get('content-type'), 'application/json');
      const err = await repeatDelRes.json();
      assert.equal(err.error, 'not found');
    });

    it('returns 404 when deleting a non-existent todo', async () => {
      const res = await fetch(`${baseUrl}/api/todos/99999`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'not found');
    });
  });

  describe('Invalid JSON body (400)', () => {
    it('returns 400 with invalid JSON message for POST /api/todos', async () => {
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"title": "broken json...',
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'invalid JSON');
    });

    it('returns 400 with invalid JSON message for PATCH /api/todos/:id', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{not valid json}',
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'invalid JSON');
    });
  });

  describe('Body over 10KB (413)', () => {
    it('returns 413 for POST /api/todos when body exceeds 10KB', async () => {
      const largeBody = 'a'.repeat(10 * 1024 + 1);
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largeBody,
      });

      assert.equal(res.status, 413);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'request body too large');
    });

    it('returns 413 for PATCH /api/todos/:id when body exceeds 10KB', async () => {
      const largeBody = 'b'.repeat(10 * 1024 + 1);
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: largeBody,
      });

      assert.equal(res.status, 413);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'request body too large');
    });
  });

  describe('Unknown route (404)', () => {
    it('returns 404 for unknown api endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/unknown`);
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'not found');
    });

    it('returns 404 for non-numeric todo id', async () => {
      const res = await fetch(`${baseUrl}/api/todos/not-a-number`);
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'not found');
    });

    it('returns 404 for unsupported method on /api/todos', async () => {
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'PUT',
      });
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'not found');
    });

    it('returns 404 for unsupported method on /api/todos/:id', async () => {
      const res = await fetch(`${baseUrl}/api/todos/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Invalid method' }),
      });
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('content-type'), 'application/json');
      const data = await res.json();
      assert.equal(data.error, 'not found');
    });
  });

  describe('JSON content-type', () => {
    it('ensures all JSON responses set Content-Type application/json', async () => {
      const requests = [
        { url: `${baseUrl}/api/todos`, opts: { method: 'GET' } },
        { url: `${baseUrl}/api/todos/1`, opts: { method: 'GET' } },
        { url: `${baseUrl}/api/todos/99999`, opts: { method: 'GET' } },
        { url: `${baseUrl}/api/unknown`, opts: { method: 'GET' } },
      ];

      for (const { url, opts } of requests) {
        const res = await fetch(url, opts);
        assert.equal(res.headers.get('content-type'), 'application/json');
      }
    });
  });

  describe('Public static files', () => {
    it('serves public/index.html at GET /', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /text\/html/);
      const text = await res.text();
      assert.ok(text.length > 0);
    });
  });
});
