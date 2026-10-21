'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('./store');

const MAX_BODY_BYTES = 10 * 1024;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function readJson(req, res) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let tooLarge = false;

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (tooLarge) {
        sendError(res, 413, 'request body too large');
        reject(new Error('body too large'));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        sendError(res, 400, 'invalid JSON');
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function servePublic(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    sendError(res, 404, 'not found');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendError(res, 404, 'not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function createServer(store) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const todoMatch = pathname.match(/^\/api\/todos\/(\d+)$/);

    if (pathname === '/api/todos') {
      if (req.method === 'GET') {
        const done = url.searchParams.get('done');
        if (done !== null && done !== 'true' && done !== 'false') {
          sendError(res, 400, 'done must be true or false');
          return;
        }
        const query = url.searchParams.get('q');
        let todos = store.list();
        if (done !== null) todos = todos.filter((todo) => todo.done === (done === 'true'));
        if (query !== null) {
          const normalizedQuery = query.toLowerCase();
          todos = todos.filter((todo) => todo.title.toLowerCase().includes(normalizedQuery));
        }
        sendJson(res, 200, todos);
        return;
      }
      if (req.method === 'POST') {
        try {
          const body = await readJson(req, res);
          sendJson(res, 201, store.add(body && body.title));
        } catch (error) {
          if (error.code === 'VALIDATION') sendError(res, 400, error.message);
          else if (!res.headersSent) sendError(res, 500, 'internal error');
        }
        return;
      }
      sendError(res, 404, 'not found');
      return;
    }

    if (todoMatch) {
      const id = todoMatch[1];
      if (req.method === 'GET') {
        const todo = store.get(id);
        if (!todo) sendError(res, 404, 'not found');
        else sendJson(res, 200, todo);
        return;
      }
      if (req.method === 'PATCH') {
        try {
          const body = await readJson(req, res);
          const todo = store.update(id, body);
          if (!todo) sendError(res, 404, 'not found');
          else sendJson(res, 200, todo);
        } catch (error) {
          if (error.code === 'VALIDATION') sendError(res, 400, error.message);
          else if (!res.headersSent) sendError(res, 500, 'internal error');
        }
        return;
      }
      if (req.method === 'DELETE') {
        if (store.remove(id)) res.writeHead(204).end();
        else sendError(res, 404, 'not found');
        return;
      }
      sendError(res, 404, 'not found');
      return;
    }

    if (req.method === 'GET' && (pathname === '/' || !pathname.startsWith('/api/'))) {
      servePublic(req, res, pathname);
      return;
    }

    sendError(res, 404, 'not found');
  });
}

if (require.main === module) {
  const store = process.env.DATA_FILE
    ? require('./file-store').createFileStore(process.env.DATA_FILE)
    : createStore();
  const server = createServer(store);
  server.listen(process.env.PORT || 3000);
}

module.exports = { createServer };
