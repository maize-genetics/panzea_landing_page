#!/usr/bin/env node
/**
 * Serve dist/ and screenshot a set of pages for visual review.
 * Usage: node scripts/screenshot.mjs [outputDir]
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = resolve(process.argv[2] ?? join(root, '.screenshots'));
mkdirSync(out, { recursive: true });

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
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
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
  if (!hit) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' });
  createReadStream(hit).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const shots = [
  ['home', '/', 1280, 900, true],
  ['home-mobile', '/', 390, 844, true],
  ['person', '/edward-buckler', 1280, 900, true],
  ['people', '/allpeople', 1280, 1200, false],
  ['publications', '/publications', 1280, 1100, false],
  ['faqs', '/faqs', 1280, 1100, false],
  ['data', '/data', 1280, 900, true],
  ['outreach', '/education-and-outreach', 1280, 900, true],
  ['genotype-search', '/genotype-search', 1280, 900, true],
  ['glossary', '/glossary', 1280, 1000, false],
  ['lab', '/buckler-lab-members', 1280, 1100, false],
  ['nav-mobile-open', '/allpeople', 390, 844, false],
];

const browser = await chromium.launch();
let failures = 0;

for (const [name, path, width, height, fullPage] of shots) {
  const page = await browser.newPage({ viewport: { width, height } });
  const issues = [];
  page.on('pageerror', (e) => issues.push(`js: ${e}`));
  page.on('requestfailed', (r) => issues.push(`req: ${r.url()}`));
  page.on('console', (m) => m.type() === 'error' && issues.push(`console: ${m.text()}`));

  const res = await page.goto(base + path, { waitUntil: 'networkidle' });
  if (name === 'nav-mobile-open') await page.click('[data-menu-toggle]');
  await page.screenshot({ path: join(out, `${name}.png`), fullPage });

  if (issues.length) failures += 1;
  console.log(
    `${name.padEnd(18)} ${res?.status()} ${issues.length ? `\n    ${issues.join('\n    ')}` : 'ok'}`,
  );
  await page.close();
}

await browser.close();
server.close();
console.log(`\nwrote ${shots.length} screenshots to ${out}`);
process.exit(failures ? 1 : 0);
