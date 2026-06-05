---
name: webhooks
description: Use when setting up Lettr webhooks — registering an endpoint via the SDK/API and writing the handler that receives delivery/open/click/bounce events in the user's app. Covers auth (none/basic/oauth2), fast-ack + async processing, and idempotency.
---

# Lettr webhooks

Two halves: **register** a webhook endpoint with Lettr, and **handle** the events it posts to the user's app. The first is a few SDK calls; the second is where correctness actually lives.

## 1. Load the references

- **SDK calls (register/list/update/delete):** detect the stack via [`../_shared/detect-stack.md`](../_shared/detect-stack.md), then read [`../_generated/sdk/<lang>/webhooks.md`](../_generated/sdk).
- **Wire contract:** [`../_generated/api/index.md`](../_generated/api/index.md), Webhooks section — note `auth_type` and `events_mode` are required on create.
- **Payload format, event types, retries:** the live docs at `https://docs.lettr.com/learn/webhooks` (event-types, handling, retries).

## 2. Register the endpoint

Create with `name`, `url` (HTTPS), `auth_type`, and `events_mode`:

- `events_mode = all` → every event, no `events` array.
- `events_mode = selected` → an explicit `events` array (e.g. `message.delivery`, `message.bounce`, `engagement.click`). Subscribe only to what the handler uses.

## 3. Authentication — get this right

Lettr authenticates **to** the user's endpoint. There is **no HMAC signature scheme** — don't write signature-verification code. The mechanism is set at registration via `auth_type`:

| `auth_type` | What Lettr sends | Handler must |
|-|-|-|
| `none` | nothing | reject by other means (secret URL path, IP allowlist) — weakest |
| `basic` | `Authorization: Basic …` | compare username/password to stored secrets, else `401` |
| `oauth2` | `Authorization: Bearer …` | validate the token against the OAuth server, else `401` |

Credentials are configured in the dashboard and never returned by the API (the API only exposes `auth_type` + `has_auth_credentials`). Store the expected secrets in env/secret manager, never hardcoded.

## 4. Write the handler correctly

- **Verify auth first**, before doing any work (see table above).
- **Ack fast, process async.** Return `2xx` immediately, then process events in the background (queue/`setImmediate`/job). Slow handlers cause timeouts → retries → duplicate processing.
- **Be idempotent.** Lettr **retries on non-2xx**, so the same event can arrive more than once. Dedupe on the event id and make processing safe to repeat.
- **HTTPS only.** Plaintext leaks credentials and payloads.

## 5. Verify it works

Trigger a real event (send a test email via the `sending` skill, or use the dashboard's webhook test if available) and confirm the handler receives it and returns `2xx`. Check the webhook's `last_status`/`last_failure_at` (`GET /webhooks/{id}`) — a failing webhook shows up there.

## What this skill does not do

- It doesn't diagnose *why an email* bounced — that's `diagnose` (this skill just makes sure the events arrive).
- It doesn't configure webhook credentials — those are set in the dashboard.
