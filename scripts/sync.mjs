#!/usr/bin/env node
// Regenerates the _generated/ tree from the Lettr docs + OpenAPI spec.
//
//   node scripts/sync.mjs            regenerate everything
//   node scripts/sync.mjs --lang php only that language
//   node scripts/sync.mjs --check    fail (exit 1) if output would change; for CI
//
// Inputs are declared in scripts/sources.json. Everything under _generated/ is
// machine-owned: do not hand-edit it, edit the upstream docs/SDK and re-run.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(read(path.join(ROOT, 'scripts/sources.json')));
const args = process.argv.slice(2);
const onlyLang = flag('--lang');
const checkMode = args.includes('--check');

const writes = []; // {abs, body} queued, flushed at the end so --check can diff first

// ---------------------------------------------------------------------------
// MDX -> agent-readable Markdown
// ---------------------------------------------------------------------------

function mdxToMd(raw) {
  let s = raw;

  // frontmatter -> capture title/description, drop the block
  let title = '', description = '';
  const fm = s.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    title = (fm[1].match(/^title:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';
    description = (fm[1].match(/^description:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';
    s = s.slice(fm[0].length);
  }

  // drop the trailing "What's Next" nav section (Cards = doc chrome, not for agents)
  s = s.replace(/\n#{2,3}\s+What['’]s Next[\s\S]*$/i, '\n');

  // import lines
  s = s.replace(/^import\s+.*$/gm, '');

  // callout components -> blockquotes
  s = s.replace(/<(Tip|Note|Info|Warning|Check|Danger)>([\s\S]*?)<\/\1>/g, (_, tag, body) => {
    const label = tag === 'Check' ? 'Note' : tag;
    const inner = body.trim().split('\n').map(l => '> ' + l.trim()).join('\n');
    return `\n> **${label}:**\n${inner}\n`;
  });

  // accordions / steps / tabs -> headings + body
  s = s.replace(/<\/?AccordionGroup>/g, '');
  s = s.replace(/<Accordion\s+title=["'](.*?)["']\s*>([\s\S]*?)<\/Accordion>/g,
    (_, t, body) => `\n**${t}**\n${body.trim()}\n`);
  s = s.replace(/<\/?Steps>/g, '');
  s = s.replace(/<Step\s+title=["'](.*?)["']\s*>([\s\S]*?)<\/Step>/g,
    (_, t, body) => `\n#### ${t}\n${body.trim()}\n`);
  s = s.replace(/<\/?Tabs>/g, '');
  s = s.replace(/<Tab\s+title=["'](.*?)["']\s*>([\s\S]*?)<\/Tab>/g,
    (_, t, body) => `\n**${t}**\n${body.trim()}\n`);

  // strip nav cards entirely (open/close, self-closing, and any wrapped body)
  s = s.replace(/<CardGroup[\s\S]*?<\/CardGroup>/g, '');
  s = s.replace(/<Card\b[^>]*\/>/g, '');
  s = s.replace(/<\/?Card\b[^>]*>/g, '');
  // remaining structural wrappers we don't render
  s = s.replace(/<\/?(Frame|Columns|Column|ParamField|ResponseField|Expandable)\b[^>]*>/g, '');

  // orphan endpoint lines left behind by stripped inline <Card>METHOD /path</Card>
  // links (e.g. a bare "  GET /audience/lists" outside any code block)
  s = s.replace(/^[ \t]*(GET|POST|PUT|PATCH|DELETE)\s+\/\S*[ \t]*$/gm, '');

  // root-relative doc links -> absolute docs URLs (keep anchors as-is)
  s = s.replace(/\]\((\/[^)#][^)]*)\)/g, (_, p) => `](${cfg.docsBaseUrl}${p})`);

  // tidy whitespace
  s = s.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

  return { title, description, body: s };
}

// ---------------------------------------------------------------------------
// Per-language SDK references  (_generated/sdk/<lang>/<topic>.md)
// ---------------------------------------------------------------------------

function syncSdk() {
  const langs = cfg.languages.filter(l => !onlyLang || l.id === onlyLang);
  let count = 0;

  for (const lang of langs) {
    const qdir = path.join(ROOT, cfg.docsRoot, 'quickstart', lang.quickstart);
    const usedSource = new Map(); // resolved source file -> topic that first claimed it

    for (const topic of cfg.topics) {
      const src = topic.candidates
        .map(name => path.join(qdir, `${name}.mdx`))
        .find(p => fs.existsSync(p));
      if (!src) continue;

      const outAbs = path.join(ROOT, cfg.outDir, 'sdk', lang.id, `${topic.id}.md`);
      const rel = path.relative(ROOT, src).replace(/^\.\.\//, '');

      // If a different topic already emitted this exact source for this language
      // (e.g. Go bundles install+send into quickstart.mdx), write a pointer stub
      // instead of duplicating the whole file.
      if (usedSource.has(src)) {
        const owner = usedSource.get(src);
        queue(outAbs, [
          genHeader(rel),
          `# ${lang.label} — ${cap(topic.id)}`,
          ``,
          `This language covers **${topic.id}** in the same guide as **${owner}**.`,
          `See [\`${owner}.md\`](./${owner}.md).`,
          ``,
        ].join('\n'));
        count++;
        continue;
      }
      usedSource.set(src, topic.id);

      const { title, description, body } = mdxToMd(read(src));
      queue(outAbs, [
        genHeader(rel),
        `# ${lang.label} — ${title || cap(topic.id)}`,
        description ? `\n> ${description}\n` : '',
        body,
        '',
      ].join('\n'));
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// API catalog  (_generated/api/index.md + bundled openapi.json)
// ---------------------------------------------------------------------------

function syncApi() {
  const specPath = path.join(ROOT, cfg.openapi);
  const spec = JSON.parse(read(specPath));
  const schemas = spec.components?.schemas || {};

  // refName -> "field (required), field, ..." (one level deep, enough to orient)
  const fieldsOf = (ref) => {
    if (!ref) return '';
    const name = ref.split('/').pop();
    const sch = schemas[name];
    if (!sch?.properties) return name;
    const required = new Set(sch.required || []);
    const fields = Object.keys(sch.properties)
      .map(k => required.has(k) ? `**${k}**` : k)
      .join(', ');
    return `${name} { ${fields} }`;
  };

  // group operations by tag, in spec tag order
  const order = (spec.tags || []).map(t => t.name);
  const groups = new Map();
  for (const [p, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (!/^(get|post|put|patch|delete)$/.test(method)) continue;
      const tag = (op.tags || ['Other'])[0];
      if (!groups.has(tag)) groups.set(tag, []);
      const bodyRef = op.requestBody?.content?.['application/json']?.schema?.$ref;
      const errs = Object.keys(op.responses || {}).filter(c => +c >= 400);
      groups.get(tag).push({
        method: method.toUpperCase(), path: p,
        summary: op.summary || op.operationId || '',
        opId: op.operationId || '',
        body: bodyRef ? fieldsOf(bodyRef) : '',
        errs,
      });
    }
  }

  const sortedTags = [...groups.keys()].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const lines = [
    genHeader(path.relative(ROOT, specPath).replace(/^\.\.\//, '')),
    `# Lettr API — endpoint catalog`,
    ``,
    `Base URL \`${(spec.servers?.[0]?.url) || 'https://app.lettr.com/api'}\` · Auth \`Authorization: Bearer $LETTR_API_KEY\``,
    ``,
    `Condensed from the OpenAPI spec — ${Object.keys(spec.paths).length} paths. Request-body fields in **bold** are required. For full request/response schemas read the bundled [\`openapi.json\`](./openapi.json).`,
    ``,
  ];

  for (const tag of sortedTags) {
    lines.push(`## ${tag}`, '');
    for (const op of groups.get(tag)) {
      lines.push(`### \`${op.method} ${op.path}\` — ${op.summary}`);
      const meta = [];
      if (op.opId) meta.push(`op: \`${op.opId}\``);
      if (op.body) meta.push(`body: ${op.body}`);
      if (op.errs.length) meta.push(`errors: ${op.errs.join(', ')}`);
      if (meta.length) lines.push(meta.join(' · '));
      lines.push('');
    }
  }

  queue(path.join(ROOT, cfg.outDir, 'api', 'index.md'), lines.join('\n'));
  queue(path.join(ROOT, cfg.outDir, 'api', 'openapi.json'),
    JSON.stringify(spec, null, 2) + '\n');
  return 1;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function genHeader(srcRel) {
  return `<!-- AUTO-GENERATED by scripts/sync.mjs from ${srcRel} -->\n` +
         `<!-- Do not edit by hand. Run \`npm run sync\` to regenerate. -->\n`;
}
function queue(abs, body) { writes.push({ abs, body }); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function flag(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }

function flush() {
  let changed = 0;
  for (const { abs, body } of writes) {
    const prev = fs.existsSync(abs) ? read(abs) : null;
    if (prev === body) continue;
    changed++;
    if (checkMode) {
      console.error(`would change: ${path.relative(ROOT, abs)}`);
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return changed;
}

// ---------------------------------------------------------------------------

const sdkCount = syncSdk();
const apiCount = syncApi();
const changed = flush();

if (checkMode) {
  if (changed) { console.error(`\n${changed} file(s) out of date. Run: npm run sync`); process.exit(1); }
  console.log('_generated/ is up to date.');
} else {
  console.log(`Synced ${sdkCount} SDK references + API catalog → ${cfg.outDir}/ (${changed} changed).`);
}
