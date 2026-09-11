---
name: sending
description: Use when sending transactional email from a project with Lettr — composing a message (HTML/text/template), attachments, cc/bcc, tracking and metadata options, batch sends, scheduling, and idempotency. Assumes the SDK is already installed (run `install` first if not).
---

# Send email with Lettr

Write the send in the user's own stack using the installed SDK, then verify it actually went out. The exact SDK calls are generated per language — this skill is the judgment around them.

## 1. Know the stack and load the SDK reference

Detect the language using [`../_shared/detect-stack.md`](../_shared/detect-stack.md), then read the matching generated reference for the exact, current SDK surface:

- **SDK calls:** [`../_generated/sdk/<lang>/sending.md`](../_generated/sdk) — `sendHtml`/`sendText`/`sendTemplate`, the fluent builder, attachments, options, response shape, typed exceptions.
- **Wire contract (any language):** [`../_generated/api/index.md`](../_generated/api/index.md) — the `POST /emails` field list. Bold fields are required (`from`, `to`, `subject`). Read this when the SDK reference doesn't cover a field, or when there's no SDK and you're calling the API directly.

Never invent method names from memory — the generated reference is the source of truth and is regenerated from the SDKs.

## 2. Pick the send shape

| Situation | Use |
|-|-|
| One-off HTML or text, few options | the quick `sendHtml` / `sendText` helper |
| Tracking, metadata, cc/bcc, reply-to, attachments together | the fluent email builder |
| Content managed in Lettr (merge tags) | template send — pair with the `templates` skill |
| Same content to many recipients | put up to 50 addresses in `to` (one API call delivers a separate copy to each); `substitution_data` applies to the whole batch, not per-recipient |
| More than 50 recipients | chunk into batches of ≤50 and send a separate call per batch — sequentially or in parallel, staying under 3 req/s. There is no bulk endpoint; looping batches is the intended pattern |
| Must not double-send on retry | Pass an **idempotency key** derived from the business event (e.g. `order-confirmation-{orderId}`) and reuse the *same* value on every retry — the API returns the original result instead of sending again. See §3a. You no longer need a DB flag or cache key for this |
| Send later | `POST /emails/scheduled` — keep the returned `transmissionId` to cancel |

## 3. Preconditions that cause most failures

- **`from` must be on a verified sending domain.** Unverified → **`400`** with `error_code: unconfigured_domain` (not `422` — see error handling below). If the user hasn't verified one, route to `install` (domain step) before sending.
- **50 recipients max per call, counted across `to` + `cc` + `bcc` combined** (not 50 each). More than that → batch (see the table above).
- **Quota is charged per recipient on the same `to` + `cc` + `bcc` basis** — a 50-address call costs 50, not 1. If you're adding a fixed `bcc` (an archive or audit address) to every send, say so out loud: it doubles the user's quota consumption. Enforcement is all-or-nothing, so a call that would cross the limit is rejected entirely rather than partially delivered.
- **`transactional` defaults to `true` — you must opt *out*.** It bypasses unsubscribe suppression, which is correct for password resets and receipts. For anything a user can opt out of, explicitly set `options.transactional: false`; leaving it unset sends to unsubscribed contacts.

## 3a. Retrying safely: idempotency keys

A timeout tells you nothing about whether the email went out. The send may well have succeeded and only the response was lost, so a blind retry delivers twice.

Pass an idempotency key and the retry is safe: reusing a key returns the original result rather than sending again.

- **Derive the key from the business event** — `order-4417-receipt`, `invoice-2026-03-payment-failed`. **Never** from a timestamp, a UUID, or anything random: those differ on the retry, which is precisely when the key has to match, and a fresh key makes the mechanism a no-op.
- **The key is yours.** No SDK invents one for you — except `lettr-laravel`, which derives one per queued job so that a job retry does not re-send. Everywhere else, if you did not pass a key there is no protection.
- **Read the replay flag.** Responses expose whether the result was replayed (`replayed` in Node/Rust/PHP, `Replayed` in Go, equivalent elsewhere). `replayed: true` means no second email went out — that is a **success**, not an error. Log it differently, don't treat it as a failure.
- **Scope:** keys are held 24 hours and are scoped per team *and* API key. The same string through a different API key is a different key.
- **Two 409s, opposite reactions.** `idempotency_in_progress` means an earlier send with this key is still running — retry with the **same** key after `Retry-After` seconds. `idempotency_key_conflict` means the key was already used with a *different* payload — **never** retry it; it will fail identically forever. Use a new key, or resend the original payload.

The old guidance — guard with your own DB flag or cache key — is no longer necessary for this. It is still reasonable if you want a business-level record of what was sent, but it is not what stops a duplicate.

## 4. Wrap the send in error handling

The SDKs surface typed errors — map them, don't swallow them. Read the generated reference for this language's exact names and shapes; they differ a lot (PHP/Java throw exceptions, Go returns a single `lettr.Error` plus `Is*` helpers, Rust returns an `Error` enum, Node returns a `{ type, error_code }` result). The cases to handle:

- **401** — bad or revoked key.
- **422** — a malformed request: missing field, bad address format.
- **429** — two distinct causes, told apart by `error_code`: `rate_limit_exceeded` (3 req/s per team — back off per `Retry-After`) vs `quota_exceeded` / `daily_quota_exceeded` (plan limit — waiting won't help until the window resets).
- **400 `unconfigured_domain`** — the `from` domain isn't verified. ⚠️ This is the most common first-send failure and it is **not** a validation error: it will not be caught by a `ValidationException`/422 branch. Match on the status or `error_code`, not on the validation type.

Production sends must handle all four.

## 5. Offer to verify the send actually happened

A `2xx` only means Lettr **accepted** the request, not that it was delivered. Don't send a live test silently — **ask the user** whether they want one (it sends a real email and consumes quota). If they decline, just wire the code and capture `request_id` in it.

If they want verification:

1. Capture `request_id` from the response (store it — it's how every later lookup works).
2. Send one real test to an address the user controls, using a verified `from`.
3. Fetch the event timeline for that `request_id` (`GET /emails/{requestId}`). A `delivery` event = the receiving server accepted it. A `bounce`/`policy_rejection` = hand off to the `diagnose` skill.

Either way, report what was wired up and the `request_id` (plus the last event seen, if verified).

## What this skill does not do

- It doesn't author template HTML — that's `templates`.
- It doesn't triage a failed/bouncing send — that's `diagnose`.
- It doesn't install the SDK or verify domains — that's `install`.
