'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../src/store.js');

describe('store - createStore()', () => {
  test('returns an object with list, get, add, update, remove methods', () => {
    const store = createStore();
    assert.equal(typeof store.list, 'function');
    assert.equal(typeof store.get, 'function');
    assert.equal(typeof store.add, 'function');
    assert.equal(typeof store.update, 'function');
    assert.equal(typeof store.remove, 'function');
  });

  test('initial state has empty list', () => {
    const store = createStore();
    assert.deepEqual(store.list(), []);
  });

  test('separate store instances maintain isolated state and id sequences', () => {
    const store1 = createStore();
    const store2 = createStore();

    const t1 = store1.add('Store 1 todo');
    assert.equal(t1.id, 1);
    assert.equal(store1.list().length, 1);
    assert.equal(store2.list().length, 0);

    const t2 = store2.add('Store 2 todo');
    assert.equal(t2.id, 1);
    assert.equal(store2.list().length, 1);
  });
});

describe('store.add(title)', () => {
  test('adds a todo with auto-incrementing id starting at 1', () => {
    const store = createStore();
    const todo1 = store.add('Task 1');
    assert.equal(todo1.id, 1);
    assert.equal(todo1.title, 'Task 1');
    assert.equal(todo1.done, false);
    assert.ok(typeof todo1.createdAt === 'string');
    assert.ok(!Number.isNaN(Date.parse(todo1.createdAt)));

    const todo2 = store.add('Task 2');
    assert.equal(todo2.id, 2);
    assert.equal(todo2.title, 'Task 2');
  });

  test('trims whitespace around title', () => {
    const store = createStore();
    const todo = store.add('   Padded title   ');
    assert.equal(todo.title, 'Padded title');
  });

  test('accepts exactly 200 characters title', () => {
    const store = createStore();
    const title200 = 'x'.repeat(200);
    const todo = store.add(title200);
    assert.equal(todo.title, title200);
  });

  test('accepts title with 200 characters after trimming', () => {
    const store = createStore();
    const title200 = '  ' + 'y'.repeat(200) + '  ';
    const todo = store.add(title200);
    assert.equal(todo.title, 'y'.repeat(200));
  });

  test('throws VALIDATION error if title is missing or not a string', () => {
    const store = createStore();
    const invalidTitles = [undefined, null, 123, {}, [], true, Symbol('test')];
    for (const val of invalidTitles) {
      assert.throws(
        () => store.add(val),
        (err) => {
          assert.equal(err.code, 'VALIDATION');
          assert.equal(err.message, 'title must be a string');
          return true;
        }
      );
    }
  });

  test('throws VALIDATION error if title is empty or only whitespace', () => {
    const store = createStore();
    const emptyTitles = ['', ' ', '   \t\n  '];
    for (const val of emptyTitles) {
      assert.throws(
        () => store.add(val),
        (err) => {
          assert.equal(err.code, 'VALIDATION');
          assert.equal(err.message, 'title is required');
          return true;
        }
      );
    }
  });

  test('throws VALIDATION error if title exceeds 200 characters', () => {
    const store = createStore();
    const over200 = 'a'.repeat(201);
    assert.throws(
      () => store.add(over200),
      (err) => {
        assert.equal(err.code, 'VALIDATION');
        assert.equal(err.message, 'title must be at most 200 characters');
        return true;
      }
    );
  });

  test('returned todo is a copy and does not mutate store state when modified', () => {
    const store = createStore();
    const todo = store.add('Original');
    todo.title = 'Mutated externally';
    todo.done = true;

    const fromStore = store.get(todo.id);
    assert.equal(fromStore.title, 'Original');
    assert.equal(fromStore.done, false);
  });
});

describe('store.get(id)', () => {
  test('returns copy of todo by numeric id', () => {
    const store = createStore();
    const created = store.add('Item');
    const fetched = store.get(created.id);
    assert.deepEqual(fetched, created);
  });

  test('coerces string id to number', () => {
    const store = createStore();
    const created = store.add('Item');
    const fetched = store.get(String(created.id));
    assert.deepEqual(fetched, created);
  });

  test('returns null when id does not exist', () => {
    const store = createStore();
    store.add('Item');
    assert.equal(store.get(999), null);
  });

  test('returns null for non-numeric or missing id', () => {
    const store = createStore();
    assert.equal(store.get('abc'), null);
    assert.equal(store.get(NaN), null);
    assert.equal(store.get(undefined), null);
  });

  test('returned todo is a copy', () => {
    const store = createStore();
    const created = store.add('Item');
    const fetched = store.get(created.id);
    fetched.title = 'Altered';

    const fetchedAgain = store.get(created.id);
    assert.equal(fetchedAgain.title, 'Item');
  });
});

describe('store.list()', () => {
  test('returns all todos as an array of copies', () => {
    const store = createStore();
    const t1 = store.add('First');
    const t2 = store.add('Second');

    const items = store.list();
    assert.equal(items.length, 2);
    assert.deepEqual(items, [t1, t2]);

    items[0].title = 'Tampered';
    assert.equal(store.get(t1.id).title, 'First');
  });
});

describe('store.update(id, patch)', () => {
  test('returns null if todo id does not exist', () => {
    const store = createStore();
    const result = store.update(999, { title: 'New' });
    assert.equal(result, null);
  });

  test('throws VALIDATION error if patch is null or not an object', () => {
    const store = createStore();
    const t = store.add('Item');

    const invalidPatches = [null, undefined, 'string', 123, true];
    for (const p of invalidPatches) {
      assert.throws(
        () => store.update(t.id, p),
        (err) => {
          assert.equal(err.code, 'VALIDATION');
          assert.equal(err.message, 'patch must be an object');
          return true;
        }
      );
    }
  });

  test('updates title with trimmed value', () => {
    const store = createStore();
    const t = store.add('Old title');
    const updated = store.update(t.id, { title: '  Brand new title  ' });
    assert.equal(updated.title, 'Brand new title');
    assert.equal(store.get(t.id).title, 'Brand new title');
  });

  test('throws VALIDATION error if patch.title is invalid', () => {
    const store = createStore();
    const t = store.add('Old title');

    // non-string
    assert.throws(
      () => store.update(t.id, { title: 123 }),
      (err) => err.code === 'VALIDATION' && err.message === 'title must be a string'
    );

    // empty or whitespace
    assert.throws(
      () => store.update(t.id, { title: '   ' }),
      (err) => err.code === 'VALIDATION' && err.message === 'title is required'
    );

    // over 200 chars
    assert.throws(
      () => store.update(t.id, { title: 'x'.repeat(201) }),
      (err) => err.code === 'VALIDATION' && err.message === 'title must be at most 200 characters'
    );
  });

  test('updates done to true or false', () => {
    const store = createStore();
    const t = store.add('Item');

    const u1 = store.update(t.id, { done: true });
    assert.equal(u1.done, true);
    assert.equal(store.get(t.id).done, true);

    const u2 = store.update(t.id, { done: false });
    assert.equal(u2.done, false);
    assert.equal(store.get(t.id).done, false);
  });

  test('throws VALIDATION error if patch.done is not a boolean', () => {
    const store = createStore();
    const t = store.add('Item');

    const invalidDones = ['true', 'false', 1, 0, null, {}, []];
    for (const val of invalidDones) {
      assert.throws(
        () => store.update(t.id, { done: val }),
        (err) => {
          assert.equal(err.code, 'VALIDATION');
          assert.equal(err.message, 'done must be a boolean');
          return true;
        }
      );
    }
  });

  test('updates both title and done simultaneously', () => {
    const store = createStore();
    const t = store.add('Item');
    const updated = store.update(t.id, { title: 'Updated item', done: true });
    assert.equal(updated.title, 'Updated item');
    assert.equal(updated.done, true);
  });

  test('ignores unknown keys in patch', () => {
    const store = createStore();
    const t = store.add('Item');
    const updated = store.update(t.id, { unknownKey: 'ignored', foo: 42 });
    assert.equal(updated.unknownKey, undefined);
    assert.equal(updated.foo, undefined);
    assert.deepEqual(updated, t);
  });

  test('preserves id and createdAt even if provided in patch', () => {
    const store = createStore();
    const t = store.add('Item');
    const updated = store.update(t.id, { id: 999, createdAt: '2000-01-01' });
    assert.equal(updated.id, t.id);
    assert.equal(updated.createdAt, t.createdAt);
  });

  test('coerces string id to number in update', () => {
    const store = createStore();
    const t = store.add('Item');
    const updated = store.update(String(t.id), { done: true });
    assert.equal(updated.done, true);
  });

  test('returned todo is a copy', () => {
    const store = createStore();
    const t = store.add('Item');
    const updated = store.update(t.id, { title: 'Fresh' });
    updated.title = 'Hacked';
    assert.equal(store.get(t.id).title, 'Fresh');
  });
});

describe('store.remove(id)', () => {
  test('returns true when deleting an existing todo', () => {
    const store = createStore();
    const t = store.add('To be removed');
    assert.equal(store.remove(t.id), true);
    assert.equal(store.get(t.id), null);
    assert.equal(store.list().length, 0);
  });

  test('returns false when deleting a non-existent todo', () => {
    const store = createStore();
    assert.equal(store.remove(999), false);
  });

  test('coerces string id to number in remove', () => {
    const store = createStore();
    const t = store.add('To remove');
    assert.equal(store.remove(String(t.id)), true);
    assert.equal(store.get(t.id), null);
  });

  test('subsequent remove returns false', () => {
    const store = createStore();
    const t = store.add('Item');
    assert.equal(store.remove(t.id), true);
    assert.equal(store.remove(t.id), false);
  });
});
