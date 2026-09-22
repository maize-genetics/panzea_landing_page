#!/usr/bin/env node
/** Serve dist/ and run axe-core over a representative set of pages. */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const axePath = require.resolve('axe-core/axe.min.js');

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
  const hit = (path === '/' ? ['index.html'] : [path.slice(1), `${path.slice(1)}.html`])
    .map((c) => join(dist, c))
    .find((p) => existsSync(p) && statSync(p).isFile());
  if (!hit) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' });
  createReadStream(hit).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const pages = [
  '/',
  '/allpeople',
  '/edward-buckler',
  '/publications',
  '/faqs',
  '/glossary',
  '/data',
  '/education-and-outreach',
  '/genotype-search',
  '/buckler-lab-members',
  '/404',
];
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch();
let total = 0;

for (const viewport of viewports) {
  for (const path of pages) {
    const page = await browser.newPage({ viewport });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.addScriptTag({ path: axePath });
    const { violations } = await page.evaluate(() =>
      // eslint-disable-next-line no-undef
      axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }),
    );
    total += violations.length;
    const label = `${viewport.name} ${path}`.padEnd(34);
    if (violations.length === 0) {
      console.log(`${label} clean`);
    } else {
      console.log(`${label} ${violations.length} violation(s)`);
      for (const v of violations) {
        console.log(`    [${v.impact}] ${v.id}: ${v.help}`);
        for (const node of v.nodes.slice(0, 2)) {
          console.log(`        ${node.target.join(' ')}`);
          console.log(`        ${node.failureSummary?.split('\n').join(' ')}`);
        }
      }
    }
    await page.close();
  }
}

await browser.close();
server.close();
console.log(`\n${total} total violation(s)`);
process.exit(total ? 1 : 0);
