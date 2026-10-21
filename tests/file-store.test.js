'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createFileStore } = require('../src/file-store');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'file-store-test-'));
}

describe('createFileStore', () => {
  it('starts empty when file does not exist', () => {
    const dir = tmpDir();
    const store = createFileStore(path.join(dir, 'todos.json'));
    assert.deepStrictEqual(store.list(), []);
  });

  it('add / get / list / update / remove work like in-memory store', () => {
    const dir = tmpDir();
    const store = createFileStore(path.join(dir, 'todos.json'));

    const todo = store.add('Buy milk');
    assert.equal(todo.id, 1);
    assert.equal(todo.title, 'Buy milk');
    assert.equal(todo.done, false);
    assert.ok(todo.createdAt);

    assert.deepStrictEqual(store.get(1), todo);
    assert.deepStrictEqual(store.list(), [todo]);

    const updated = store.update(1, { done: true });
    assert.equal(updated.done, true);

    assert.equal(store.remove(1), true);
    assert.deepStrictEqual(store.list(), []);
    assert.equal(store.remove(1), false);
  });

  it('persists and reloads todos from file', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');

    const store1 = createFileStore(fp);
    store1.add('First');
    store1.add('Second');
    store1.update(2, { done: true });

    // Create a new store from same file — should reload
    const store2 = createFileStore(fp);
    const items = store2.list();
    assert.equal(items.length, 2);
    assert.equal(items[0].title, 'First');
    assert.equal(items[1].title, 'Second');
    assert.equal(items[1].done, true);
  });

  it('continues ids after the highest loaded id', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');

    const store1 = createFileStore(fp);
    store1.add('A'); // id 1
    store1.add('B'); // id 2
    store1.add('C'); // id 3
    store1.remove(3);

    // Reload — highest remaining id is 2
    const store2 = createFileStore(fp);
    const added = store2.add('D');
    assert.equal(added.id, 3, 'id should continue after highest loaded id (2)');
  });

  it('continues ids after highest id even if items were removed', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');

    // Manually seed a file with a gap
    fs.writeFileSync(fp, JSON.stringify([
      { id: 5, title: 'Five', done: false, createdAt: new Date().toISOString() },
    ]));

    const store = createFileStore(fp);
    const added = store.add('Six');
    assert.equal(added.id, 6);
  });

  it('atomic write: file is valid JSON even after add', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');

    const store = createFileStore(fp);
    store.add('Check');

    // Read file directly — should be valid JSON
    const raw = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(raw);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].title, 'Check');
  });

  it('atomic write: no temp file left behind', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');

    const store = createFileStore(fp);
    store.add('Item');

    const files = fs.readdirSync(dir);
    assert.equal(files.length, 1, 'only the data file should remain');
    assert.equal(files[0], 'todos.json');
  });

  it('throws CORRUPT_STORE for invalid JSON', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');
    fs.writeFileSync(fp, '{not json!!!}');

    assert.throws(
      () => createFileStore(fp),
      (err) => err.code === 'CORRUPT_STORE'
    );
  });

  it('throws CORRUPT_STORE for non-array JSON', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');
    fs.writeFileSync(fp, '{"a":1}');

    assert.throws(
      () => createFileStore(fp),
      (err) => err.code === 'CORRUPT_STORE'
    );
  });

  it('validation: empty title throws VALIDATION', () => {
    const dir = tmpDir();
    const store = createFileStore(path.join(dir, 'todos.json'));
    assert.throws(
      () => store.add('   '),
      (err) => err.code === 'VALIDATION'
    );
  });

  it('validation: title > 200 chars throws VALIDATION', () => {
    const dir = tmpDir();
    const store = createFileStore(path.join(dir, 'todos.json'));
    assert.throws(
      () => store.add('x'.repeat(201)),
      (err) => err.code === 'VALIDATION'
    );
  });

  it('get / remove on missing id return null / false', () => {
    const dir = tmpDir();
    const store = createFileStore(path.join(dir, 'todos.json'));
    assert.equal(store.get(999), null);
    assert.equal(store.remove(999), false);
  });

  it('update on missing id returns null', () => {
    const dir = tmpDir();
    const store = createFileStore(path.join(dir, 'todos.json'));
    assert.equal(store.update(999, { done: true }), null);
  });

  it('update persists changes to file', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');
    const store = createFileStore(fp);
    store.add('Original');
    store.update(1, { title: 'Updated' });

    const store2 = createFileStore(fp);
    assert.equal(store2.get(1).title, 'Updated');
  });

  it('remove persists deletion to file', () => {
    const dir = tmpDir();
    const fp = path.join(dir, 'todos.json');
    const store = createFileStore(fp);
    store.add('ToDelete');
    store.remove(1);

    const store2 = createFileStore(fp);
    assert.deepStrictEqual(store2.list(), []);
  });
});

describe('review fixes', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { createFileStore } = require('../src/file-store.js');

  it('a failed write leaves memory unchanged and no temp file behind', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-fail-'));
    const file = path.join(dir, 'todos.json');
    const store = createFileStore(file);
    store.add('kept');
    fs.rmSync(file);
    fs.mkdirSync(file); // renaming onto a directory fails on every OS
    assert.throws(() => store.add('lost'));
    assert.throws(() => store.update(1, { done: true }));
    assert.throws(() => store.remove(1));
    assert.deepEqual(store.list().map((t) => [t.id, t.title, t.done]), [[1, 'kept', false]]);
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.includes('.tmp.')), []);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rejects duplicate ids and malformed records as CORRUPT_STORE', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-bad-'));
    const file = path.join(dir, 'todos.json');
    const ok = { id: 1, title: 'a', done: false, createdAt: '2026-01-01T00:00:00.000Z' };
    for (const data of [[ok, ok], [{ ...ok, id: 'x' }], [{ ...ok, done: 'no' }], [null]]) {
      fs.writeFileSync(file, JSON.stringify(data));
      assert.throws(() => createFileStore(file), (e) => e.code === 'CORRUPT_STORE');
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
