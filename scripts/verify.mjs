#!/usr/bin/env node
// Static verification harness for the skills package. No API calls.
//
//   node scripts/verify.mjs
//
// Hard checks (exit 1 on failure):
//   1. _generated/ is in sync with the sources         (delegates to sync.mjs --check)
//   2. every relative Markdown link resolves
//   3. every SKILL.md has valid frontmatter (name + description)
// Soft check (reported, never fails the build):
//   4. methods referenced in _generated/sdk/<lang>/*.md exist in the real SDK source
//      (../lettr-<lang>), catching drift between the docs and the shipped SDK.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/sources.json'), 'utf8'));
let hardFail = false;

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.log(`  ✗ ${m}`); hardFail = true; };
const warn = (m) => console.log(`  ! ${m}`);
const head = (m) => console.log(`\n${m}`);

// ── 1. sync ────────────────────────────────────────────────────────────────
head('[1/4] _generated/ in sync with sources');
try {
  execSync('node scripts/sync.mjs --check', { cwd: ROOT, stdio: 'pipe' });
  ok('_generated/ is up to date');
} catch (e) {
  bad('_generated/ is stale — run `npm run sync`');
  process.stdout.write((e.stdout || e.stderr || '').toString().split('\n').map(l => '      ' + l).join('\n'));
}

// ── 2. links ─────────────────────────────────────────────────────────────────
head('[2/4] relative Markdown links resolve');
const mdFiles = walk(ROOT, f => f.endsWith('.md'))
  .filter(f => !f.includes('/node_modules/') && !f.includes('/.git/'));
let linkBad = 0, linkN = 0;
for (const file of mdFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\]\((\.\.?\/[^)]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target) continue;
    linkN++;
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      bad(`broken link in ${rel(file)} -> ${m[1]}`);
      linkBad++;
    }
  }
}
if (!linkBad) ok(`${linkN} relative links all resolve`);

// ── 3. frontmatter ───────────────────────────────────────────────────────────
head('[3/4] SKILL.md frontmatter valid');
const skills = walk(ROOT, f => f.endsWith('SKILL.md'))
  .filter(f => !f.includes('/.git/'));
let fmBad = 0;
for (const file of skills) {
  const text = fs.readFileSync(file, 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { bad(`${rel(file)}: no frontmatter block`); fmBad++; continue; }
  if (!/^name:\s*\S/m.test(fm[1]))        { bad(`${rel(file)}: missing name`); fmBad++; }
  if (!/^description:\s*\S/m.test(fm[1]))  { bad(`${rel(file)}: missing description`); fmBad++; }
}
if (!fmBad) ok(`${skills.length} SKILL.md files have name + description`);

// ── 4. SDK method cross-check (soft) ─────────────────────────────────────────
head('[4/4] referenced SDK methods exist in SDK source  (soft — review only)');
// per-language patterns for "a call/identifier followed by ("
const CALL = /(?:->|\.|::)\s*([A-Za-z_]\w*)\s*\(|new\s+([A-Z]\w*)\s*\(/g;
// "defined" = ANY identifier occurrence in source — a class/enum/DTO is defined
// without a paren (`class Foo`), so a paren-only match misses it. Lenient on
// purpose: a symbol that appears nowhere in the SDK is the real hallucination signal.
const SRC_TOKEN = /[A-Za-z_]\w*/g;
// languages whose SDK surface actually lives in another package (thin wrappers)
const EXTRA_REPOS = { laravel: ['../lettr-php'] };
// tokens that are language noise, not SDK symbols
const NOISE = new Set(['if','for','foreach','while','switch','function','echo','print','array',
  'return','new','catch','isset','count','sprintf','require','use','await','async','map','filter',
  'forEach','Buffer','console','JSON','Promise','int','let','const','var','fn','match','Some','Ok',
  'println','printf','import','class','public','private','static','void','String','System']);

for (const lang of cfg.languages) {
  const repo = path.join(ROOT, lang.repo);
  const sdkDocs = path.join(ROOT, cfg.outDir, 'sdk', lang.id);
  if (!fs.existsSync(repo)) { warn(`${lang.id}: SDK repo ${lang.repo} not checked out — skipped`); continue; }
  if (!fs.existsSync(sdkDocs)) continue;

  // referenced symbols, only from fenced code blocks for this language
  const referenced = new Set();
  for (const f of fs.readdirSync(sdkDocs).filter(n => n.endsWith('.md'))) {
    const md = fs.readFileSync(path.join(sdkDocs, f), 'utf8');
    for (const block of md.matchAll(/```[\w-]*\n([\s\S]*?)```/g)) {
      for (const c of block[1].matchAll(CALL)) {
        const sym = c[1] || c[2];
        if (sym && !NOISE.has(sym) && sym.length > 2) referenced.add(sym);
      }
    }
  }

  // every identifier anywhere in the SDK source (+ any wrapped packages)
  const defined = new Set();
  const repos = [repo, ...(EXTRA_REPOS[lang.id] || []).map(r => path.join(ROOT, r))];
  for (const r of repos) {
    if (!fs.existsSync(r)) continue;
    for (const src of walk(r, f => /\.(php|ts|js|py|go|rs|java)$/.test(f))
          .filter(f => !/(vendor|node_modules|\.git|target|build|dist|tests?)\//.test(f))) {
      for (const d of fs.readFileSync(src, 'utf8').matchAll(SRC_TOKEN)) defined.add(d[0]);
    }
  }

  const missing = [...referenced].filter(s => !defined.has(s)).sort();
  if (!missing.length) ok(`${lang.id}: all ${referenced.size} referenced symbols found in SDK source`);
  else warn(`${lang.id}: ${missing.length}/${referenced.size} not found in ${lang.repo} → ${missing.join(', ')}`);
}

// ── summary ──────────────────────────────────────────────────────────────────
head(hardFail ? '✗ verify FAILED (hard checks)' : '✓ verify passed (hard checks)');
process.exit(hardFail ? 1 : 0);

function walk(dir, pred, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, acc);
    else if (pred(p)) acc.push(p);
  }
  return acc;
}
function rel(p) { return path.relative(ROOT, p); }
