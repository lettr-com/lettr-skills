---
name: audience
description: Use when managing Lettr audience data from code — contact lists, contacts (incl. double opt-in and bulk import), subscription topics, custom properties, and dynamic segments. This is the marketing/contacts side that campaigns send to.
---

# Manage Lettr audience

The audience is what campaigns target: **lists** (static collections), **contacts** (the people), **topics** (subscription categories), **properties** (typed custom fields), and **segments** (dynamic groups defined by conditions). All five share a CRUD shape.

## 1. Load the references

- **SDK calls:** detect the stack via [`../_shared/detect-stack.md`](../_shared/detect-stack.md), then read [`../_generated/sdk/<lang>/audience.md`](../_generated/sdk) — the sub-services, DTOs, enums, and bulk helpers.
- **Wire contract:** [`../_generated/api/index.md`](../_generated/api/index.md), Audience section — every endpoint with required fields bolded.

## 2. Map the task to the right resource

| Goal | Resource |
|-|-|
| Group contacts statically | **list** (`POST /audience/lists`) |
| Add/import people, all treated the same | **contacts** — `…/bulk` with a flat `emails` list |
| Import people who differ from each other | **contacts** — `…/bulk` with `contacts[]`, one row per person |
| Let people opt in/out of categories | **topics** |
| Move many people on/off many topics | `POST`/`DELETE /audience/contacts/topics/bulk` |
| Store typed custom fields (plan, signup date…) | **properties** — create the property before setting it on contacts |
| Target by rules (plan = pro AND domain = …) | **segments** |

## 3. Gotchas that matter

- **Double opt-in.** Creating a contact with a double-opt-in config sends a confirmation email and leaves the contact `Unverified` until they confirm — they are **not** subscribed yet. Don't treat creation as subscription. Requires a verified `from` domain and (usually) a confirmation template.
- **Contact status is meaningful.** `Subscribed`, `Unsubscribed`, `Bounced`, `Complained`, `Unverified`. Don't resurrect `Unsubscribed`/`Complained` contacts by re-creating them — that's a compliance problem, not a bug.
- **Bulk over loops.** For many contacts, or many list/topic attach/detach operations, use the `…/bulk` endpoints, not N single calls (rate limit is 3 req/s per team).
- **A successful bulk import does not mean every row landed.** `POST /audience/contacts/bulk` answers `201` even when rows failed: bad rows are skipped, the rest of the batch commits. Always read `error_count` and `errors[]` (each carries a zero-based `index` into the rows you sent, plus `email`, `error_code` and `error`) and report skipped rows to the user. Never report "imported N contacts" from the row count you submitted.
- **`already_existed` and `updated` overlap — they never sum to the row count.** They answer different questions: "was it already there?" and "did we change it?". A contact that already existed and got a list attached is counted in **both**. Reporting `created + already_existed + updated` as a total is wrong arithmetic. Note `updated` counts *any* change, including a list or topic attach — not just properties being written.
- **`update_existing` gates properties *and* opt-outs.** With it off, an existing contact is still attached to the requested lists and topic **opt-ins** — but its properties are left alone and any row-level **`opt_out` is silently ignored**, with no error row to tell you. Importing consent or suppression data for people who may already be in the audience requires `update_existing: true`, or the opt-outs are dropped on the floor.
- **Row-level `opt_out` beats batch-level `opt_in`.** That precedence is the point of the feature: a topic whose `default_subscription` is `opt_out` auto-subscribes newly created contacts, and a row-level `opt_out` suppresses that in the same request instead of needing a cleanup call afterwards. This applies unconditionally to **newly created** contacts; for contacts that already exist it only applies when `update_existing` is on (see above).
- **A duplicate contact is a `409`, not a server error.** `POST /audience/contacts` on an email that already exists returns `409` / `resource_already_exists`. It is client-correctable — update the existing contact, or bulk-create with `update_existing` — and it must **not** be retried. It used to escape as `500` / `send_error`; that code named email delivery, which was never involved, so ignore any older reference that maps `send_error` to this endpoint.
- **`contacts[]` gives you the ids back.** The bulk response returns `{ id, email, created }` for every contact that exists after the request, in submission order. Use it instead of a follow-up lookup to resolve ids.
- **Properties are typed and pre-declared.** Create a property (`String`/`Number`/`Boolean`/`Date`/`Json`) before writing it on contacts; a `fallback_value` covers contacts that lack it.
- **Segment condition logic:** conditions **within a group are OR-ed**, **groups are AND-ed** — i.e. `(A OR B) AND (C OR D)`. One group means "any of these"; add a *group* to narrow, add a *condition* to widen. Getting this inverted silently changes who gets mail. Scope a segment to a `list_id` when you don't want it spanning the whole audience.

## 4. Verify

After a bulk import or segment change, read it back (`GET` the list/segment, or list contacts filtered by status/list) and report counts to the user before anything sends to it. Sending to the audience is the `campaigns` skill.

For a bulk import specifically, report `created`, `already_existed` and `updated` as three separate answers rather than a total (they overlap), and state the skipped-row count explicitly — including when it is zero, so "all rows landed" is something you checked rather than assumed.

## What this skill does not do

- It doesn't create or send campaigns — that's `campaigns`.
- It doesn't send transactional one-offs — that's `sending`.
