---
name: templates
description: Use when authoring or editing Lettr-managed email templates — choosing transactional vs campaign purpose, writing HTML with merge tags, validating tags against a template version, and previewing or test-sending before shipping.
---

# Author Lettr templates

Templates live in Lettr and are referenced by `slug` when sending. This skill is about writing the HTML and merge tags correctly and verifying the result before it goes to real recipients.

## 1. Load the references

- **SDK calls:** detect the stack via [`../_shared/detect-stack.md`](../_shared/detect-stack.md), then read [`../_generated/sdk/<lang>/templates.md`](../_generated/sdk) for create/update/get and merge-tag calls.
- **Wire contract:** [`../_generated/api/index.md`](../_generated/api/index.md) — the Templates section (`POST /templates`, `PUT /templates/{slug}`, `GET /templates/{slug}/merge-tags`, `GET /templates/html`).
- **Merge-tag syntax & conventions:** [`references/merge-tags.md`](./references/merge-tags.md).

## 2. Find the project

Templates are project-scoped. List projects (`GET /projects`) to get the right `project_id`. If the team has only one, use it.

## 3. Decide the purpose — before you create anything

Every template is either **transactional** or **campaign**, and it defaults to transactional.

| Purpose | What it is | Examples |
|-|-|-|
| `transactional` (default) | Triggered by one person's action | Password reset, receipt, order confirmation, alert |
| `campaign` | Marketing sent to an audience list | Newsletter, promotion, product announcement |

**This cannot be changed after creation.** A campaign can only send a template whose purpose is `campaign`, so a newsletter created with the default has to be rebuilt from scratch — and the failure does not surface until someone tries to attach it to a campaign in the dashboard, long after you have finished.

So: if the user's request is a newsletter, a promotion, an announcement, or anything else going to an audience rather than to one person, pass `purpose: "campaign"` on create. If you are not sure, **ask** — it is a cheap question and an expensive mistake.

Folders have a purpose too, and it is **independent**. Filing a template in a campaign folder does not make the template a campaign template; only `purpose` on the template does.

## 4. Author the HTML

Write standard email-safe HTML. Use `{{variable}}` for merge tags; see the merge-tags reference for conditionals and loops. Keep in mind email-client constraints (inline-friendly CSS, table layouts) — the `sending` options control CSS inlining at send time.

## 5. Create or update

- **New:** create with `name`, `html` (or `json` for the visual-editor format), `purpose` (see step 3), and `project_id` if applicable. The response returns a `slug` — that's the send-time identifier, and echoes back the `purpose` you actually got.
- **Folder:** `folder_id` is optional; omitting it files the template in whichever folder the API picks. To choose deliberately, list folders (`GET /folders`) — that is the only call that returns a folder id. Nothing else does, so the alternative is hardcoding an integer read out of an app URL.
- **Existing:** update by slug. Each update creates a **new version**; merge tags are re-extracted automatically. Older versions stay pinnable at send time (`template_version`), which is how you keep production stable while drafting. `purpose` is fixed at creation and cannot be updated.

### Imported templates are not instantly sendable

Template responses carry `preparation_status`: `pending`, `ready` or `failed`. An imported or JSON-authored template renders asynchronously, so it exists before its HTML does — typically for a few seconds.

- **After a create:** `pending` means there is no HTML yet. Sending now sends nothing useful. Poll `GET /templates/{slug}` until it settles; seconds, not minutes.
- **After an update:** the *previous* render keeps serving until the new one settles. A `pending` template still sends — just not yet the new content. That is the trap: the send succeeds and quietly delivers the old version.
- **`failed`** means the render did not produce HTML. Do not send; re-import or fix the source.
- **Absent** on older API responses — treat that as ready rather than blocking.

To check a whole batch at once, list with `folder_id` and `per_page=100` rather than fetching each template individually; a per-template `GET` drags the full HTML payload against the same rate limit.

## 6. Confirm merge tags

Fetch the template's merge tags (`GET /templates/{slug}/merge-tags`, optionally per version). Cross-check the list against what the calling code passes as `substitution_data` — a missing variable renders as an empty string, which is rarely intended.

## 7. Offer a preview / test

Don't blast a test silently. Two levels, in order of cost:

1. **Render only:** fetch the rendered HTML (`GET /templates/html`) to show the user what default values produce — no email sent.
2. **Live test (ask first):** send a real email using the slug + `substitution_data` to an address the user controls — the only way to know it renders in real clients. This is a send, so it's the `sending` skill's job; hand off with the slug. See [`references/testing.md`](./references/testing.md).

## What this skill does not do

- It doesn't author the *send* call — that's `sending`.
- It doesn't import templates from another provider; translate HTML with judgement if asked, but there's no conversion playbook.
- It doesn't sync templates to repo files unless the project already mirrors them (e.g. a Node `lettr-kit` or `php artisan lettr:pull` flow) — then edit the local file and let that tooling push.
