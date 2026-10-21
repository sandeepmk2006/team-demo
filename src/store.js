'use strict';

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

function createStore() {
  const todos = new Map();
  let nextId = 1;

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
      return { ...next };
    },
    remove(id) {
      return todos.delete(Number(id));
    },
  };
}

module.exports = { createStore, cleanTitle, validationError };
