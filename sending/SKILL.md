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
| Must not double-send on retry | set the `idempotency_key` field on the send call (derive it from the business event, e.g. `order-confirmation-{orderId}`) |
| Send later | `POST /emails/scheduled` — keep the returned `transmissionId` to cancel |

## 3. Preconditions that cause most failures

- **`from` must be on a verified sending domain.** Unverified → `422`. If the user hasn't verified one, route to `install` (domain step) before sending.
- **50 recipients max per call, counted across `to` + `cc` + `bcc` combined** (not 50 each). More than that → batch (see the table above).
- **Transactional vs marketing.** `transactional` bypasses unsubscribe suppression — correct for password resets/receipts, wrong for anything a user can opt out of.

## 4. Wrap the send in error handling

The SDKs throw typed exceptions — map them, don't swallow them. From the generated reference: `ValidationException` (422, usually unverified domain or bad address), `UnauthorizedException` (401, bad key), `QuotaExceededException` / `RateLimitException` (429 — distinct: quota = plan limit, rate = 3 req/s/team, retry after the given delay). Production sends must catch these.

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
