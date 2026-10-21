'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('./store');

function createFileStore(filePath) {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  // Load existing todos from file (missing file = empty)
  let loaded = [];
  if (fs.existsSync(resolvedPath)) {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    try {
      loaded = JSON.parse(raw);
      if (!Array.isArray(loaded)) {
        const err = new Error('Store file is corrupt');
        err.code = 'CORRUPT_STORE';
        throw err;
      }
    } catch (e) {
      if (e.code === 'CORRUPT_STORE') throw e;
      const err = new Error('Store file is corrupt');
      err.code = 'CORRUPT_STORE';
      throw err;
    }
  }

  // Delegate to the in-memory store for all business-logic/validation
  const inner = createStore();

  // Determine highest existing id so auto-increment continues correctly
  let maxId = 0;
  for (const todo of loaded) {
    if (typeof todo.id === 'number' && todo.id > maxId) maxId = todo.id;
  }

  // Replay loaded todos into the inner store by directly injecting them
  // We need to get access to the inner map — but createStore doesn't expose it.
  // Instead we build a thin wrapper that keeps its own canonical array and
  // delegates validation to createStore's methods.

  // Re-approach: build the file store from scratch, reusing validation helpers
  // from store.js by requiring them. But store.js only exports createStore.
  // Decision: replicate the validation inline (same rules) and delegate to
  // a private in-memory map, mirroring store.js exactly.

  // Actually, simplest correct approach: maintain our own Map + nextId,
  // reuse createStore() purely for validation by calling its methods in a
  // throw-away manner. But that's convoluted.

  // Cleanest approach: just reimplement with same logic, adding persistence.

  const todos = new Map();
  let nextId = maxId + 1;

  for (const todo of loaded) {
    todos.set(todo.id, { ...todo });
  }

  function persist() {
    const data = JSON.stringify([...todos.values()]);
    const tmp = resolvedPath + '.tmp.' + process.pid;
    fs.writeFileSync(tmp, data, 'utf8');
    fs.renameSync(tmp, resolvedPath);
  }

  function validationError(message) {
    const err = new Error(message);
    err.code = 'VALIDATION';
    return err;
  }

  function cleanTitle(title) {
    if (typeof title !== 'string') throw validationError('title must be a string');
    const t = title.trim();
    if (!t) throw validationError('title is required');
    if (t.length > 200) throw validationError('title must be at most 200 characters');
    return t;
  }

  return {
    list() {
      return [...todos.values()].map((t) => ({ ...t }));
    },
    get(id) {
      const t = todos.get(Number(id));
      return t ? { ...t } : null;
    },
    add(title) {
      const todo = { id: nextId++, title: cleanTitle(title), done: false, createdAt: new Date().toISOString() };
      todos.set(todo.id, todo);
      persist();
      return { ...todo };
    },
    update(id, patch) {
      const t = todos.get(Number(id));
      if (!t) return null;
      if (!patch || typeof patch !== 'object') throw validationError('patch must be an object');
      const next = { ...t };
      if ('title' in patch) next.title = cleanTitle(patch.title);
      if ('done' in patch) {
        if (typeof patch.done !== 'boolean') throw validationError('done must be a boolean');
        next.done = patch.done;
      }
      todos.set(t.id, next);
      persist();
      return { ...next };
    },
    remove(id) {
      const result = todos.delete(Number(id));
      if (result) persist();
      return result;
    },
  };
}

module.exports = { createFileStore };
