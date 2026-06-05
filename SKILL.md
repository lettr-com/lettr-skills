---
name: lettr
description: Use when working with the Lettr email platform in a user's codebase — installing the SDK, sending transactional email, authoring templates, managing audience and campaigns, wiring webhooks, and diagnosing delivery problems. Routes to the matching sub-skill.
license: MIT
metadata:
    author: lettr
    version: "3.0.0"
    homepage: https://lettr.com
    source: https://github.com/lettr-com/lettr-skills
inputs:
    - name: LETTR_API_KEY
      description: Lettr API key. Get yours at https://app.lettr.com/settings/api-keys
      required: true
---

# Lettr

Lettr is an email platform — transactional sending plus marketing (audience + campaigns). These skills cover working with it in code across 6 official SDKs (PHP, Node, Python, Go, Rust, Java) plus the Laravel framework integration.

## Sub-skills

| Skill | Use when |
|---|---|
| [`install`](./install) | Adding Lettr to a project for the first time. Picks the right SDK based on the stack, configures the key, verifies a sending domain. |
| [`sending`](./sending) | Sending transactional email — HTML/text/template, attachments, cc/bcc, tracking, batch, scheduling, idempotency. |
| [`templates`](./templates) | Writing or editing a Lettr-managed template, validating merge tags, previewing. |
| [`audience`](./audience) | Managing lists, contacts (incl. double opt-in, bulk import), topics, properties, and segments. |
| [`campaigns`](./campaigns) | Sending, scheduling, or reporting on dashboard-authored campaigns. |
| [`webhooks`](./webhooks) | Registering webhook endpoints and writing the event handler (auth, fast-ack, idempotency). |
| [`diagnose`](./diagnose) | An email isn't delivering, a domain won't verify, a webhook is silent, or quotas/rate-limits are firing. |

## Shared resources

- [`_shared/detect-stack.md`](./_shared/detect-stack.md) — how every skill resolves the project's `<lang>`.
- [`_generated/sdk/<lang>/<topic>.md`](./_generated/sdk) — exact, current SDK calls per language. **Generated** from the Lettr docs/SDKs; never hand-edited.
- [`_generated/api/index.md`](./_generated/api/index.md) — condensed catalog of all API endpoints, with the full `openapi.json` bundled alongside for deep reads.

Maintainers: `_generated/` is built by `npm run sync` from `../lettr-docs` + the SDK repos — see [`README.md`](./README.md).

## Common context

- **Base URL**: `https://app.lettr.com/api`
- **Auth**: `Authorization: Bearer $LETTR_API_KEY`
- **API key format**: `lttr_…`
- **Rate limit**: 3 requests/second per team (429 = back off and retry).
- **Optional**: the [Lettr MCP server](https://github.com/lettr-com/lettr-mcp) gives agents direct API access; these skills work with or without it.
