---
name: campaigns
description: Use when sending or scheduling Lettr campaigns from code and reading their engagement events. Campaigns are authored in the Lettr dashboard; the API lists, sends, schedules, unschedules, and reports on them.
---

# Send & schedule Lettr campaigns

A campaign is a one-to-many marketing send to an audience list/segment. **Campaigns are created and designed in the Lettr dashboard** — the API does not create, edit, or delete them. From code you can list them, trigger or schedule a send, cancel a schedule, and pull engagement events.

## 1. Load the references

- **SDK calls:** detect the stack via [`../_shared/detect-stack.md`](../_shared/detect-stack.md), then read [`../_generated/sdk/<lang>/campaigns.md`](../_generated/sdk).
- **Wire contract:** [`../_generated/api/index.md`](../_generated/api/index.md), Campaigns section.

## 2. The only operations that exist

| Goal | Call |
|-|-|
| Find a campaign / its id and status | `GET /campaigns`, `GET /campaigns/{id}` |
| Send now | `POST /campaigns/{id}/send` |
| Send later | `POST /campaigns/{id}/schedule` with `scheduled_at` |
| Cancel a scheduled send | `POST /campaigns/{id}/unschedule` |
| Read opens/clicks/etc. | `GET /campaigns/{id}/events` |

If the user wants to *create* or *change content/audience* of a campaign, that's a dashboard task — tell them, don't look for an API that isn't there.

## 3. The template must be a campaign template

A campaign can only send a template whose `purpose` is `campaign`. This is the most common way a campaign gets stuck, and it fails late: the template is created, the content is right, and the dashboard simply will not offer it when binding the campaign.

`purpose` **cannot be changed after creation** — a transactional template has to be rebuilt as a campaign one, content and all.

So when a user asks for a newsletter or promotion and you create the template for them, set `purpose: "campaign"` at creation time. See the `templates` skill, step 3. To check what already exists, list templates filtered by `purpose=campaign` — that returns exactly the set a campaign is able to use.

A folder's purpose is separate: filing a template in a campaign folder does not make the template a campaign template.

## 4. Gotchas

- **Sending is irreversible and goes to real people.** Always confirm the target campaign's name, audience size, and content with the user before calling `send`. Prefer `schedule` (which can be cancelled) over `send` when there's any doubt.
- **The audience must be ready first.** A campaign sends to whatever list/segment it's bound to. If that audience needs building or cleaning, do it in the `audience` skill before sending.
- **`scheduled_at` is a timestamp** — confirm the timezone interpretation with the user; an off-by-timezone schedule sends at the wrong hour.
- **Idempotency:** don't retry a `send` blindly on a network error — re-fetch the campaign status first to see whether it already started. The idempotency keys described in the `sending` skill cover transactional sends (`POST /emails`), **not** campaign sends; there is no key to pass here, so status is the only check.

## 5. After sending

Report the campaign id and scheduled/sent status. For results, poll `GET /campaigns/{id}/events` (opens, clicks, bounces). Delivery problems on individual recipients are the `diagnose` skill.

## What this skill does not do

- It doesn't build or clean the audience — that's `audience`.
- It doesn't author campaign content — that's the dashboard.
- It doesn't send transactional email — that's `sending`.
