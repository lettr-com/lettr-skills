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
| Add/import people | **contacts** — single, or `…/bulk` for many |
| Let people opt in/out of categories | **topics** |
| Store typed custom fields (plan, signup date…) | **properties** — create the property before setting it on contacts |
| Target by rules (plan = pro AND domain = …) | **segments** |

## 3. Gotchas that matter

- **Double opt-in.** Creating a contact with a double-opt-in config sends a confirmation email and leaves the contact `Unverified` until they confirm — they are **not** subscribed yet. Don't treat creation as subscription. Requires a verified `from` domain and (usually) a confirmation template.
- **Contact status is meaningful.** `Subscribed`, `Unsubscribed`, `Bounced`, `Complained`, `Unverified`. Don't resurrect `Unsubscribed`/`Complained` contacts by re-creating them — that's a compliance problem, not a bug.
- **Bulk over loops.** For many contacts or many list attach/detach operations, use the `…/bulk` endpoints, not N single calls (rate limit is 3 req/s per team).
- **Properties are typed and pre-declared.** Create a property (`String`/`Number`/`Boolean`/`Date`/`Json`) before writing it on contacts; a `fallback_value` covers contacts that lack it.
- **Segment condition logic:** conditions **within a group are AND-ed**, **groups are OR-ed**. Getting this inverted silently changes who gets mail. Scope a segment to a `list_id` when you don't want it spanning the whole audience.

## 4. Verify

After a bulk import or segment change, read it back (`GET` the list/segment, or list contacts filtered by status/list) and report counts to the user before anything sends to it. Sending to the audience is the `campaigns` skill.

## What this skill does not do

- It doesn't create or send campaigns — that's `campaigns`.
- It doesn't send transactional one-offs — that's `sending`.
