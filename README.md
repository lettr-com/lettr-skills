# Lettr Skills

Agent skills for working with [Lettr](https://lettr.com) in code — installing the SDK, sending transactional email, authoring templates, managing audience and campaigns, wiring webhooks, and diagnosing delivery problems.

Works with Claude Code, Cursor, Codex, Windsurf, and other AI coding agents, across 6 official SDKs (PHP, Node, Python, Go, Rust, Java) plus the Laravel framework integration.

## Available skills

| Skill | Use when |
|-|-|
| [`install`](./install) | Adding Lettr to a project: detect stack, install SDK, configure key, verify a sending domain. |
| [`sending`](./sending) | Send transactional email — HTML/text/template, attachments, tracking, batch, scheduling. |
| [`templates`](./templates) | Author Lettr-managed templates and validate merge tags. |
| [`audience`](./audience) | Lists, contacts (double opt-in, bulk), topics, properties, segments. |
| [`campaigns`](./campaigns) | Send, schedule, and report on dashboard-authored campaigns. |
| [`webhooks`](./webhooks) | Register endpoints and write the event handler. |
| [`diagnose`](./diagnose) | Triage delivery problems — bounces, unverified domains, silent webhooks, rate limits. |

Each skill is a small, hand-written judgment layer. The exact SDK code and API details it points at live in [`_generated/`](./_generated) and are built from the Lettr docs.

## Installation (end users)

```bash
npx skills add lettr-com/lettr-skills
```

## Prerequisites

- A Lettr account and an API key from [app.lettr.com/settings/api-keys](https://app.lettr.com/settings/api-keys), set as `LETTR_API_KEY` (keys start with `lttr_`).
- A verified sending domain in [app.lettr.com/domains](https://app.lettr.com/domains). The `install` skill walks through this.

## Pair with the Lettr MCP server (optional)

The [Lettr MCP server](https://github.com/lettr-com/lettr-mcp) gives agents direct API access. These skills work with or without it.

---

## For maintainers

The per-language SDK references and the API catalog under [`_generated/`](./_generated) are **generated, not hand-written** — they're distilled from the docs and SDK repos that already exist as siblings of this repo:

```
../lettr-docs/quickstart/<lang>/*.mdx   →  _generated/sdk/<lang>/<topic>.md
../lettr-docs/openapi.json              →  _generated/api/index.md  (+ bundled openapi.json)
```

### Workflow

You edit the upstream docs/SDK (which you already maintain), then:

```bash
npm run sync         # regenerate _generated/ from ../lettr-docs
npm run sync:check   # CI-friendly: exits 1 (and names stale files) if out of date
```

Commit the regenerated `_generated/` along with your change. The committed output is what end users get — they don't have the source repos.

- **Sources** are declared in [`scripts/sources.json`](./scripts/sources.json) (languages, topics, paths).
- **Generation logic** is [`scripts/sync.mjs`](./scripts/sync.mjs) — strips Mintlify components from the docs and condenses the OpenAPI spec.
- **CI** ([`.github/workflows/sync-check.yml`](./.github/workflows/sync-check.yml)) runs `sync:check` against a fresh checkout of `lettr-docs` so drift can't be merged.

Never hand-edit anything under `_generated/` — it's overwritten on the next sync. To change that content, change the upstream source and re-run sync.

## License

MIT
