#!/usr/bin/env node
// Static verification harness for the skills package. No API calls.
//
//   node scripts/verify.mjs
//
// Hard checks (exit 1 on failure):
//   1. _generated/ is in sync with the sources         (delegates to sync.mjs --check)
//   2. every relative Markdown link resolves
//   3. every SKILL.md has valid frontmatter (name + description)
//   4. every symbol referenced in _generated/sdk/<lang>/*.md exists in the real
//      SDK source (../lettr-<lang>), catching drift between the docs and the
//      shipped SDK. Languages whose repo is not checked out are skipped, so this
//      degrades to a no-op rather than a failure outside a full workspace.
//
// Pass --soft to downgrade check 4 to a warning.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/sources.json'), 'utf8'));
const SOFT = process.argv.includes('--soft');
let hardFail = false;

// "defined" = ANY identifier occurrence in source — a class/enum/DTO is defined
// without a paren (`class Foo`), so a paren-only match misses it. Lenient on
// purpose: a symbol that appears nowhere in the SDK is the real hallucination signal.
const SRC_TOKEN = /[A-Za-z_]\w*/g;

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

// ── 4. SDK symbol cross-check ────────────────────────────────────────────────
head(`[4/4] referenced SDK symbols exist in SDK source${SOFT ? '  (soft — review only)' : ''}`);

// Extraction. Each pattern captures (qualifier, symbol) or just (symbol).
//
// CALL is the original pattern: a method reached through an object or class.
// It requires a trailing `(`, which is why it alone was not enough — see
// TYPE_REF below.
const CALL = /(?:([A-Za-z_]\w*)\s*)?(?:->|::|\.)\s*([A-Za-z_]\w*)\s*\(/g;
// A constructor: `new Lettr(...)`.
const CTOR = /\bnew\s+([A-Z]\w*)\s*\(/g;
// A qualified *type or constant* reference with no trailing paren:
// `*lettr.APIError` in a Go type switch, `ErrorCode::RateLimitExceeded` in a
// Rust match arm, `LettrException.class` in a Java catch. These are pure
// references — nothing is invoked, so CALL's mandatory `(` never matched them.
// That blind spot is how a documented-but-nonexistent Go error type reached
// users despite this harness running clean.
//
// No whitespace is allowed around the separator: real code writes
// `lettr.APIError`, never `lettr. APIError`. Being lenient there matches an
// English sentence boundary instead ("...not a validation error. NOT a ...")
// and floods the report with capitalised prose words.
const TYPE_REF = /([A-Za-z_]\w*)(?:::|\.)([A-Z][A-Za-z0-9_]*)\b(?!\s*\()/g;
// A type named bare in a catch / except / instanceof position, with no
// qualifier to hang off: `catch (RateLimitException $e)`, `except RateLimitError`.
const BARE_TYPE = /\b(?:catch|except|instanceof)\s*\(?\s*([A-Z]\w*)/g;

// Symbols the snippet defines for itself. A tutorial that writes
// `func sendWelcomeEmail(...)` and then calls it is not referencing the SDK,
// so its own declarations must not be reported as drift.
const LOCAL_DEFS = [
  /\b(?:function|func|fn|def)\s+([A-Za-z_]\w*)/g,
  /\b(?:class|struct|enum|interface|record|trait|type)\s+([A-Za-z_]\w*)/g,
  /\b(?:const|let|var|val)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?(?:\(|function)/g,
  /\b(?:public|private|protected)\s+(?:static\s+|final\s+|abstract\s+)*[\w<>\[\],.]+\s+([A-Za-z_]\w*)\s*\(/g,
];
// Comments are prose, not API surface. Left in, a sentence like
// `// 422 — invalid request. Field validation populates ...` reads as a
// reference to a `Field` type. The `(?<!:)` guard keeps `https://` intact.
const stripComments = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(?<!:)\/\/.*$/gm, ' ')
  .replace(/^\s*#(?!\[).*$/gm, ' ');

// A symbol pulled in from a namespace that is not the SDK's — `use App\Mail\OrderShipped`,
// `import com.example.orders.OrderShipped`. The snippet is demonstrating integration with
// the reader's own application, which by definition does not live in the SDK repo.
const IMPORT = /^[ \t]*(?:use|import|from)\s+([\w\\./]+)/gm;
// The same idea for Python's `from <module> import <names>` and the JS
// `import { a, b } from '<module>'`, where the names that matter sit *after*
// the module path rather than at the end of it.
const FROM_IMPORT = /^[ \t]*from\s+([\w.]+)\s+import\s+([^\n]+)/gm;
const NAMED_IMPORT = /^[ \t]*import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gm;

// Qualifiers that belong to the language's standard library or to an unrelated
// framework. A symbol reached through one of these can never be SDK drift, so it
// is dropped before the comparison instead of being reported and re-dismissed by
// hand on every run. Keyed by the qualifier because that is what identifies the
// owner — listing the symbols themselves would mean re-listing all of `fmt`.
const FOREIGN_QUALIFIERS = {
  go: ['fmt', 'os', 'time', 'sync', 'context', 'log', 'errors', 'strings', 'strconv',
       'json', 'http', 'io', 'ioutil', 'mail', 'base64', 'StdEncoding', 'rand', 'godotenv', 'slog'],
  rust: ['std', 'tokio', 'sync', 'serde_json', 'Duration', 'Instant', 'Arc', 'Semaphore',
         'String', 'Vec', 'Box', 'env', 'futures', 'Result', 'Option',
         'base64', 'general_purpose',        // base64 crate
         'actix_web', 'web', 'HttpResponse'], // actix-web
  java: ['System', 'String', 'Math', 'Base64', 'Files', 'Paths', 'Pattern', 'Thread',
         'Executors', 'TimeUnit', 'CompletableFuture', 'Collectors', 'Arrays', 'Objects',
         'Optional', 'List', 'Map', 'Instant', 'Duration', 'LoggerFactory', 'Logger',
         'ResponseEntity', 'HttpStatus'],
  php: ['Log', 'Mail', 'Cache', 'DB', 'Config', 'Str', 'Arr', 'Carbon', 'Storage',
        'Queue', 'Http', 'Response', 'Schema', 'Blade'],
  python: ['os', 'json', 'time', 'sys', 're', 'logging', 'asyncio', 'datetime', 'base64',
           'pathlib', 'Path', 'traceback'],
  node: ['JSON', 'console', 'Buffer', 'Promise', 'Object', 'Array', 'Math', 'Date',
         'process', 'fs', 'path', 'crypto'],
};
FOREIGN_QUALIFIERS.laravel = FOREIGN_QUALIFIERS.php;

// Noise that survives the qualifier rule because the receiver is a local variable
// whose type the harness cannot see (`wg.Add(1)` — `wg` is a `sync.WaitGroup`), or
// because the call is mid-chain and has no qualifier token at all
// (`Mail::to($x)->queue(...)`). Each entry names the owner it actually belongs to.
const FOREIGN_SYMBOLS = {
  go: ['Add', 'Done', 'Wait',       // sync.WaitGroup
       'Err',                        // context.Context
       'Info', 'Warn', 'Error', 'Debug'], // log/slog logger
  rust: ['acquire_owned',            // tokio::sync::Semaphore
         'fold', 'collect', 'iter', 'into_iter', 'map_err', 'unwrap_or_else'], // std iterator/Result
  java: ['awaitTermination', 'shutdown', 'submit',  // ExecutorService
         'matcher', 'matches',                       // Pattern/Matcher
         'getMessage', 'printStackTrace',            // Throwable
         'collect', 'toList', 'toArray', 'stream',   // Stream API
         'encodeToString', 'getEncoder',             // java.util.Base64
         'RuntimeException', 'IllegalStateException', // java.lang
         'IllegalArgumentException', 'InterruptedException',
         'info', 'warn', 'error', 'debug'],          // slf4j Logger
  php: [],
  laravel: ['queue', 'later', 'warning', 'hasTo', 'hasCc', 'hasBcc'], // Mail facade / PendingMail / MailableTestAssertions
  python: ['sleep', 'get', 'append', 'join', 'gather'],
  node: [],
};

// Language-level keywords and primitives that are not symbols in any package.
const NOISE = new Set(['if', 'for', 'foreach', 'while', 'switch', 'function', 'echo', 'print',
  'array', 'return', 'new', 'catch', 'isset', 'count', 'sprintf', 'require', 'use', 'await',
  'async', 'map', 'filter', 'forEach', 'int', 'let', 'const', 'var', 'fn', 'match', 'Some',
  'Ok', 'Err', 'None', 'println', 'printf', 'import', 'class', 'public', 'private', 'static',
  'void', 'String', 'System', 'this', 'self', 'super', 'try', 'else', 'defer', 'range',
  'struct', 'enum', 'impl', 'pub', 'mut', 'true', 'false', 'null', 'nil', 'None']);

// languages whose SDK surface actually lives in another package (thin wrappers)
const EXTRA_REPOS = { laravel: ['../lettr-php'] };

let driftFound = false;

for (const lang of cfg.languages) {
  const repo = path.join(ROOT, lang.repo);
  const sdkDocs = path.join(ROOT, cfg.outDir, 'sdk', lang.id);
  if (!fs.existsSync(repo)) { warn(`${lang.id}: SDK repo ${lang.repo} not checked out — skipped`); continue; }
  if (!fs.existsSync(sdkDocs)) continue;

  const foreignQual = new Set(FOREIGN_QUALIFIERS[lang.id] || []);
  const foreignSym = new Set(FOREIGN_SYMBOLS[lang.id] || []);

  // referenced symbols, only from fenced code blocks for this language
  const referenced = new Set();
  for (const f of fs.readdirSync(sdkDocs).filter(n => n.endsWith('.md'))) {
    const md = fs.readFileSync(path.join(sdkDocs, f), 'utf8');
    const blocks = [...md.matchAll(/```[\w-]*\n([\s\S]*?)```/g)]
      .map(b => stripComments(b[1]));

    // Anything the page declares or imports from a non-Lettr namespace is the
    // example's own, not the SDK's. Collected across the whole page first: a
    // guide routinely declares a helper in one fence and calls it in the next,
    // and scoping this per block would report the helper as missing SDK surface.
    const local = new Set();
    for (const code of blocks) {
      for (const re of LOCAL_DEFS) for (const m of code.matchAll(re)) local.add(m[1]);
      for (const m of code.matchAll(IMPORT)) {
        const parts = m[1].split(/[\\./]/).filter(Boolean);
        if (parts.length > 1 && !/lettr/i.test(parts[0])) local.add(parts[parts.length - 1]);
      }
      for (const m of code.matchAll(FROM_IMPORT)) {
        if (/lettr/i.test(m[1])) continue;
        for (const n of m[2].matchAll(/[A-Za-z_]\w*/g)) if (n[0] !== 'as') local.add(n[0]);
      }
      for (const m of code.matchAll(NAMED_IMPORT)) {
        if (/lettr/i.test(m[2])) continue;
        for (const name of m[1].split(',')) if (name.trim()) local.add(name.trim().split(/\s+as\s+/).pop());
      }
    }

    const add = (sym, qualifier) => {
      if (!sym || sym.length <= 2) return;
      if (NOISE.has(sym) || local.has(sym)) return;
      if (qualifier && (foreignQual.has(qualifier) || local.has(qualifier))) return;
      if (foreignSym.has(sym)) return;
      referenced.add(sym);
    };

    for (const code of blocks) {
      for (const m of code.matchAll(CALL)) add(m[2], m[1]);
      for (const m of code.matchAll(CTOR)) add(m[1]);
      for (const m of code.matchAll(TYPE_REF)) add(m[2], m[1]);
      for (const m of code.matchAll(BARE_TYPE)) add(m[1]);
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
  if (!missing.length) { ok(`${lang.id}: all ${referenced.size} referenced symbols found in SDK source`); continue; }
  driftFound = true;
  const msg = `${lang.id}: ${missing.length}/${referenced.size} not found in ${lang.repo} → ${missing.join(', ')}`;
  if (SOFT) warn(msg); else bad(msg);
}

if (driftFound && !SOFT) {
  console.log('');
  console.log('  A symbol documented in _generated/sdk/ does not exist in the SDK it documents.');
  console.log('  Either the SDK dropped it (fix the source doc in the SDK repo, then `npm run sync`)');
  console.log('  or it never existed. If it is a standard-library or framework symbol the harness');
  console.log('  cannot attribute, add it to FOREIGN_QUALIFIERS/FOREIGN_SYMBOLS in this file with a');
  console.log('  note naming its real owner. Re-run with --soft to downgrade to a warning.');
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
