#!/usr/bin/env node
// LIVE end-to-end check against the real Lettr API. Sends a real email.
//
//   npm run verify:live
//
// Reads credentials from .env.local (gitignored) or the environment:
//   LETTR_API_KEY   required — sandbox key (lttr_…)
//   LETTR_FROM      required — a verified sending address, e.g. hello@yourdomain.com
//   LETTR_TEST_TO   required — a recipient you control (the test lands here)
//   LETTR_BASE_URL  optional — defaults to https://app.lettr.com/api
//
// Exercises the exact chain the install + sending skills rely on:
//   1. auth check          GET  /auth/check
//   2. verified domain     GET  /domains            (confirm LETTR_FROM's domain is verified)
//   3. send                POST /emails             (capture request_id)
//   4. event timeline      GET  /emails/{requestId} (poll for delivery / bounce)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(path.join(ROOT, '.env.local'));

const KEY  = need('LETTR_API_KEY');
const FROM = need('LETTR_FROM');
const TO   = need('LETTR_TEST_TO');
const BASE = (process.env.LETTR_BASE_URL || 'https://app.lettr.com/api').replace(/\/$/, '');

const ok = (m) => console.log(`  ✓ ${m}`);
const info = (m) => console.log(`    ${m}`);
const die = (m, body) => { console.error(`  ✗ ${m}`); if (body) console.error(indent(body)); process.exit(1); };

console.log(`\nLive E2E against ${BASE}\n`);

// 1. auth ---------------------------------------------------------------------
console.log('[1/4] auth check  GET /auth/check');
{
  const { status, json, text } = await api('GET', '/auth/check');
  if (status === 401) die('API key rejected (401) — check LETTR_API_KEY', text);
  if (status >= 400) die(`auth check failed (${status})`, text);
  const team = json?.data?.team_id ?? json?.team_id ?? json?.data?.teamId ?? '(unknown)';
  ok(`key valid — team ${team}`);
}

// 2. domain -------------------------------------------------------------------
console.log('[2/4] verified domain  GET /domains');
const fromDomain = FROM.split('@')[1]?.toLowerCase();
{
  const { status, json, text } = await api('GET', '/domains');
  if (status >= 400) die(`could not list domains (${status})`, text);
  const domains = json?.data ?? json ?? [];
  const match = (Array.isArray(domains) ? domains : []).find(
    d => (d.domain || d.name || '').toLowerCase() === fromDomain);
  if (!match) die(`LETTR_FROM domain "${fromDomain}" not found on this team — verify it first (sending will 400 unconfigured_domain)`);
  const verified = match.verified ?? match.is_verified ?? /verified|active/i.test(match.status || '');
  if (!verified) die(`domain "${fromDomain}" exists but is not verified (status: ${match.status ?? 'unknown'})`);
  ok(`${fromDomain} is verified`);
}

// 3. send ---------------------------------------------------------------------
console.log(`[3/4] send  POST /emails  (${FROM} → ${TO})`);
let requestId;
{
  const stamp = new Date().toISOString();
  const { status, json, text } = await api('POST', '/emails', {
    from: FROM,
    to: [TO],
    subject: `Lettr skills E2E ${stamp}`,
    html: `<p>End-to-end verification from lettr-skills.</p><p>${stamp}</p>`,
    text: `End-to-end verification from lettr-skills. ${stamp}`,
  });
  if (status === 400) die('send rejected (400) — sending domain not verified (unconfigured_domain)', text);
  if (status === 422) die('send rejected (422) — malformed request (missing field or bad address format)', text);
  if (status === 429) die('rate/quota limit (429)', text);
  if (status >= 400) die(`send failed (${status})`, text);
  requestId = json?.data?.request_id ?? json?.request_id;
  if (!requestId) die('send returned no request_id', text);
  ok(`accepted — request_id ${requestId}`);
  info(`accepted ${json?.data?.accepted ?? '?'} / rejected ${json?.data?.rejected ?? '?'}`);
}

// 4. event timeline -----------------------------------------------------------
console.log('[4/4] event timeline  GET /emails/{requestId}  (polling up to 45s)');
{
  const deadline = Date.now() + 45_000;
  let last = null, terminal = false;
  while (Date.now() < deadline) {
    const { status, json } = await api('GET', `/emails/${requestId}`);
    if (status < 400) {
      const events = extractEvents(json);
      if (events.length) {
        const newest = events[events.length - 1];
        if (newest !== last) { info(`event: ${newest}`); last = newest; }
        if (/deliver/i.test(newest)) { ok('delivered'); terminal = true; break; }
        if (/bounce|reject|fail|spam|complain/i.test(newest)) {
          console.error(`  ✗ terminal failure event: ${newest}`); terminal = true; process.exitCode = 1; break;
        }
      }
    }
    await sleep(3000);
  }
  if (!terminal) {
    info('no terminal event within 45s — accepted but not yet delivered (normal for sandbox/slow MTAs)');
    ok('chain works through acceptance; check the dashboard for final delivery');
  }
}

console.log(`\n✓ live E2E complete\n`);

// helpers ---------------------------------------------------------------------
async function api(method, p, body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
function extractEvents(json) {
  const out = [];
  const arr = json?.data?.events ?? json?.events ?? [];
  for (const e of Array.isArray(arr) ? arr : []) out.push(e.type ?? e.event ?? e.name ?? JSON.stringify(e));
  // some APIs expose a single latest status instead of an array
  const status = json?.data?.status ?? json?.status;
  if (!out.length && status) out.push(String(status));
  return out;
}
function need(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing ${name}. Set it in .env.local (gitignored) or the environment.`); process.exit(2); }
  return v;
}
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function indent(s) { return String(s).split('\n').map(l => '      ' + l).join('\n'); }
