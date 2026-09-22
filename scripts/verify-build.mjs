#!/usr/bin/env node
/**
 * Post-build checks:
 *  1. every URL the old Wix site published still resolves in dist/
 *  2. every internal link and asset reference in the built HTML exists
 *
 * Run with `npm run verify` after `npm run build`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('dist/ not found - run `npm run build` first.');
  process.exit(1);
}

/** Walk dist/ and collect every file path relative to the dist root. */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full.slice(dist.length + 1));
  }
  return acc;
}

const files = new Set(walk(dist));
const htmlFiles = [...files].filter((f) => f.endsWith('.html'));

/** Resolve a site-root path the way a static host would. */
function resolves(path) {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]).replace(/^\//, '');
  if (clean === '' ) return files.has('index.html');
  return (
    files.has(clean) ||
    files.has(`${clean}.html`) ||
    files.has(`${clean}/index.html`) ||
    files.has(clean.replace(/\/$/, '/index.html'))
  );
}

const problems = [];

// 1. Legacy URL coverage.
const legacy = readFileSync(join(root, 'scripts/legacy-urls.txt'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const missingLegacy = legacy.filter((u) => !resolves(u));
for (const u of missingLegacy) problems.push(`legacy URL no longer resolves: ${u}`);

// 2. Internal links and asset references.
const LINK_RE = /(?:href|src)="([^"]+)"/g;
let checkedLinks = 0;
const badLinks = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(join(dist, file), 'utf8');
  for (const [, raw] of html.matchAll(LINK_RE)) {
    if (!raw.startsWith('/') || raw.startsWith('//')) continue;
    checkedLinks += 1;
    if (!resolves(raw)) {
      if (!badLinks.has(raw)) badLinks.set(raw, new Set());
      badLinks.get(raw).add(file);
    }
  }
}

for (const [link, sources] of badLinks) {
  const where = [...sources].slice(0, 3).join(', ');
  problems.push(
    `broken internal link ${link} (in ${where}${sources.size > 3 ? `, +${sources.size - 3} more` : ''})`,
  );
}

// 3. Every publication PDF referenced is actually shipped.
const pdfRefs = new Set();
for (const file of htmlFiles) {
  const html = readFileSync(join(dist, file), 'utf8');
  for (const [, raw] of html.matchAll(/href="([^"]+\.pdf)"/g)) {
    if (raw.startsWith('/')) pdfRefs.add(raw);
  }
}
const missingPdfs = [...pdfRefs].filter((p) => !resolves(p));
for (const p of missingPdfs) problems.push(`missing PDF: ${p}`);

console.log(`pages built:        ${htmlFiles.length}`);
console.log(`legacy URLs:        ${legacy.length - missingLegacy.length}/${legacy.length} resolve`);
console.log(`internal links:     ${checkedLinks - badLinks.size} ok, ${badLinks.size} broken`);
console.log(`publication PDFs:   ${pdfRefs.size - missingPdfs.length}/${pdfRefs.size} present`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('\nAll checks passed.');
