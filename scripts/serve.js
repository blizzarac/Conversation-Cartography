#!/usr/bin/env node
// Zero-dependency static file server for previewing dist/ locally.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = process.env.PORT || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.md': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(ROOT, reqPath);
    let st = await stat(filePath).catch(() => null);
    if (st?.isDirectory()) filePath = path.join(filePath, 'index.html');
    else if (!st) filePath = path.join(ROOT, reqPath, 'index.html');
    let body;
    try {
      body = await readFile(filePath);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('404 not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(500); res.end(String(err));
  }
}).listen(PORT, () => console.log(`serving dist/ at http://localhost:${PORT}`));
