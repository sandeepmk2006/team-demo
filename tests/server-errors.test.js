'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server.js');

test('unexpected store error returns 500 instead of hanging', async () => {
  const broken = { add() { throw new Error('disk on fire'); }, update() { throw new Error('disk on fire'); } };
  const server = createServer(broken).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const post = await fetch(`${base}/api/todos`, { method: 'POST', body: '{"title":"x"}', signal: AbortSignal.timeout(2000) });
    assert.equal(post.status, 500);
    const patch = await fetch(`${base}/api/todos/1`, { method: 'PATCH', body: '{"done":true}', signal: AbortSignal.timeout(2000) });
    assert.equal(patch.status, 500);
  } finally {
    server.close();
  }
});
