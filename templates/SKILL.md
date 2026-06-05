---
name: templates
description: Use when authoring or editing Lettr-managed email templates — writing HTML with merge tags, validating tags against a template version, and previewing or test-sending before shipping.
---

# Author Lettr templates

Templates live in Lettr and are referenced by `slug` when sending. This skill is about writing the HTML and merge tags correctly and verifying the result before it goes to real recipients.

## 1. Load the references

- **SDK calls:** detect the stack via [`../_shared/detect-stack.md`](../_shared/detect-stack.md), then read [`../_generated/sdk/<lang>/templates.md`](../_generated/sdk) for create/update/get and merge-tag calls.
- **Wire contract:** [`../_generated/api/index.md`](../_generated/api/index.md) — the Templates section (`POST /templates`, `PUT /templates/{slug}`, `GET /templates/{slug}/merge-tags`, `GET /templates/html`).
- **Merge-tag syntax & conventions:** [`references/merge-tags.md`](./references/merge-tags.md).

## 2. Find the project

Templates are project-scoped. List projects (`GET /projects`) to get the right `project_id`. If the team has only one, use it.

## 3. Author the HTML

Write standard email-safe HTML. Use `{{variable}}` for merge tags; see the merge-tags reference for conditionals and loops. Keep in mind email-client constraints (inline-friendly CSS, table layouts) — the `sending` options control CSS inlining at send time.

## 4. Create or update

- **New:** create with `name`, `html` (or `json` for the visual-editor format), and `project_id` if applicable. The response returns a `slug` — that's the send-time identifier.
- **Existing:** update by slug. Each update creates a **new version**; merge tags are re-extracted automatically. Older versions stay pinnable at send time (`template_version`), which is how you keep production stable while drafting.

## 5. Confirm merge tags

Fetch the template's merge tags (`GET /templates/{slug}/merge-tags`, optionally per version). Cross-check the list against what the calling code passes as `substitution_data` — a missing variable renders as an empty string, which is rarely intended.

## 6. Offer a preview / test

Don't blast a test silently. Two levels, in order of cost:

1. **Render only:** fetch the rendered HTML (`GET /templates/html`) to show the user what default values produce — no email sent.
2. **Live test (ask first):** send a real email using the slug + `substitution_data` to an address the user controls — the only way to know it renders in real clients. This is a send, so it's the `sending` skill's job; hand off with the slug. See [`references/testing.md`](./references/testing.md).

## What this skill does not do

- It doesn't author the *send* call — that's `sending`.
- It doesn't import templates from another provider; translate HTML with judgement if asked, but there's no conversion playbook.
- It doesn't sync templates to repo files unless the project already mirrors them (e.g. a Node `lettr-kit` or `php artisan lettr:pull` flow) — then edit the local file and let that tooling push.
