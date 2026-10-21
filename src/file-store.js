'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { cleanTitle, validationError } = require('./store');

function corrupt(message) {
  const err = new Error(`Store file is corrupt: ${message}`);
  err.code = 'CORRUPT_STORE';
  return err;
}

function loadTodos(filePath) {
  if (!fs.existsSync(filePath)) return [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw corrupt('invalid JSON');
  }
  if (!Array.isArray(data)) throw corrupt('expected an array');
  const seen = new Set();
  for (const t of data) {
    const valid = t && Number.isInteger(t.id) && t.id > 0 && typeof t.title === 'string'
      && typeof t.done === 'boolean' && typeof t.createdAt === 'string';
    if (!valid) throw corrupt(`invalid record ${JSON.stringify(t)}`);
    if (seen.has(t.id)) throw corrupt(`duplicate id ${t.id}`);
    seen.add(t.id);
  }
  return data;
}

function createFileStore(filePath) {
  const resolvedPath = path.resolve(filePath);
  const todos = new Map(loadTodos(resolvedPath).map((t) => [t.id, { ...t }]));
  let nextId = Math.max(0, ...todos.keys()) + 1;

  // Write the candidate state to disk first; memory only changes after the write succeeds,
  // so a failed write never leaves memory and disk disagreeing.
  function commit(nextTodos) {
    const tmp = `${resolvedPath}.tmp.${process.pid}`;
    try {
      fs.writeFileSync(tmp, JSON.stringify([...nextTodos.values()]), 'utf8');
      fs.renameSync(tmp, resolvedPath);
    } catch (err) {
      fs.rmSync(tmp, { force: true });
      throw err;
    }
    todos.clear();
    for (const [id, t] of nextTodos) todos.set(id, t);
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
      const todo = { id: nextId, title: cleanTitle(title), done: false, createdAt: new Date().toISOString() };
      commit(new Map(todos).set(todo.id, todo));
      nextId++;
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
      commit(new Map(todos).set(t.id, next));
      return { ...next };
    },
    remove(id) {
      const key = Number(id);
      if (!todos.has(key)) return false;
      const nextTodos = new Map(todos);
      nextTodos.delete(key);
      commit(nextTodos);
      return true;
    },
  };
}

module.exports = { createFileStore };
