#!/usr/bin/env node
/** Serve dist/ and run an inline DOM query against a page, for debugging. */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const [, , pagePath = '/', expression] = process.argv;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const candidates =
    path === '/'
      ? ['index.html']
      : [path.slice(1), `${path.slice(1)}.html`, join(path.slice(1), 'index.html')];
  const hit = candidates
    .map((c) => join(dist, c))
    .find((p) => existsSync(p) && statSync(p).isFile());
  if (!hit) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' });
  createReadStream(hit).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`http://127.0.0.1:${port}${pagePath}`, { waitUntil: 'networkidle' });
console.log(JSON.stringify(await page.evaluate(expression), null, 1));
await browser.close();
server.close();
