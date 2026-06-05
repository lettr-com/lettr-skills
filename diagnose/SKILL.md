---
name: diagnose
description: Use when emails are not delivering, a domain won't verify, a webhook is silent, or rate limits/quotas are firing. Triage flow pairs each symptom with the right diagnostic step and a reference for interpreting the result.
---

# Diagnose Lettr delivery problems

The job is **interpretation**. Fetch the relevant data from Lettr, then read the result against the references in this skill to tell the user what's wrong and how to fix it.

## Triage by symptom

Pick the row that matches what the user is reporting.

| Symptom | What to fetch | Reference |
|---|---|---|
| "I sent an email, the user never got it" | Email events filtered by recipient (last hour) | [`bounce-classes.md`](./references/bounce-classes.md), [`webhook-events.md`](./references/webhook-events.md) |
| "I get 422 / domain rejected when sending" | Domain list, then details for the failing one | [`dns-failures.md`](./references/dns-failures.md) |
| "I added a domain but it stays pending" | Trigger verification, then re-fetch the domain | [`dns-failures.md`](./references/dns-failures.md) |
| "Webhook isn't firing for my events" | Webhook list, then details for the suspect one | [`webhook-events.md`](./references/webhook-events.md) |
| "Webhook update keeps failing validation (422)" | Webhook details, to inspect current event types | [`webhook-events.md`](./references/webhook-events.md) — see naming gotcha |
| "I'm getting 429 / quota exceeded" | Validate API key, then read the response payload | [`quota-rate-limits.md`](./references/quota-rate-limits.md) |
| "Open / click tracking shows nothing" | Event detail for one known send | [`webhook-events.md`](./references/webhook-events.md) — engagement events |

## General flow

1. **Reproduce by request_id when possible.** If the user has a `request_id` from a recent send, fetch its event timeline first — it's the cheapest lookup.
2. **Otherwise filter by recipient.** Pull email events filtered by the affected address, narrowed to the relevant time window.
3. **Read the latest event.** The chronologically last event is usually decisive. `delivery` means the receiving server accepted it (problem is downstream — spam folder, user error). `bounce`, `policy_rejection`, `out_of_band`, or `delay` mean Lettr couldn't or didn't fully deliver — read the reference to interpret the class.
4. **Confirm setup before suspecting bugs.** If a fresh integration is misbehaving, validate the API key and list domains first. Most early-stage problems are unverified domains or `from` addresses on the wrong domain.

## What this skill does NOT do

- It does not read user mailboxes. If a user reports "I didn't get the email" but Lettr shows `delivery`, the message is in their inbox/spam — the user must check.
- It does not repair DNS at the user's registrar. The skill explains what's wrong; the user fixes it at Cloudflare/Route53/etc.
