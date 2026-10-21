'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server.js');
const { createStore } = require('../src/store.js');

describe('todo filtering', () => {
  let server;
  let baseUrl;

  before(async () => {
    const store = createStore();
    store.add('Write Documentation');
    const doneTodo = store.add('Fix the BUG');
    store.update(doneTodo.id, { done: true });
    store.add('Buy groceries');
    server = createServer(store);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  async function get(path) {
    const response = await fetch(`${baseUrl}${path}`);
    return { response, body: await response.json() };
  }

  test('done=true returns only completed todos', async () => {
    const { response, body } = await get('/api/todos?done=true');
    assert.equal(response.status, 200);
    assert.deepEqual(body.map((todo) => todo.title), ['Fix the BUG']);
  });

  test('done=false returns only active todos', async () => {
    const { response, body } = await get('/api/todos?done=false');
    assert.equal(response.status, 200);
    assert.deepEqual(body.map((todo) => todo.title), ['Write Documentation', 'Buy groceries']);
  });

  test('invalid done value returns 400', async () => {
    const { response, body } = await get('/api/todos?done=yes');
    assert.equal(response.status, 400);
    assert.equal(body.error, 'done must be true or false');
  });

  test('q performs a case-insensitive title substring match', async () => {
    const { response, body } = await get('/api/todos?q=bug');
    assert.equal(response.status, 200);
    assert.deepEqual(body.map((todo) => todo.title), ['Fix the BUG']);
  });

  test('q and done can be combined', async () => {
    const { response, body } = await get('/api/todos?q=the&done=true');
    assert.equal(response.status, 200);
    assert.deepEqual(body.map((todo) => todo.title), ['Fix the BUG']);
  });
});
