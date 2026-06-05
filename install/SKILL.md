---
name: install
description: Use when adding Lettr to a project for the first time. Detects the stack, installs the right SDK or framework integration, configures LETTR_API_KEY, verifies a sending domain, and optionally runs a test send.
---

# Install Lettr

Get Lettr into the user's project: add the dependency, configure the key, make sure there's a verified domain to send from, and leave them with a working first send call.

## 1. Detect the stack

Use [`../_shared/detect-stack.md`](../_shared/detect-stack.md) to resolve `<lang>`. If nothing matches, follow its fallback (raw HTTP or SMTP relay) — there's no SDK to install in that case.

## 2. Install the SDK

Read [`../_generated/sdk/<lang>/installation.md`](../_generated/sdk) and follow it exactly — install command, client construction, where the key goes. It's generated from the official SDK docs, so the package name and API surface are current; don't install from memory.

For Laravel, prefer the package's own init command if the reference shows one (it writes config + env in one step).

## 3. Configure the API key

Ask the user for `LETTR_API_KEY` if it isn't already in the environment or `.env`. Keys start with `lttr_`. Put it in `.env` (never hardcoded), and confirm `.env` is gitignored.

Validate it: `GET /auth/check` returns the team ID on success. On `401`, the key is wrong or revoked — have the user recreate it at [app.lettr.com/settings/api-keys](https://app.lettr.com/settings/api-keys).

## 4. Make sure there's a verified sending domain

Sending from an unverified domain returns `422`, and this is the single most common first-send failure. Check `GET /domains`. If the user's intended `from` domain isn't verified:

1. Create it (`POST /domains` with `domain`). The response carries the DNS records to add (CNAME / DKIM / return-path).
2. Hand those records to the user to apply at their DNS provider — this skill does not touch their registrar.
3. When they confirm, run `POST /domains/{domain}/verify` and re-check.

## 5. Offer a test send

Ask whether to send a real test (it sends an actual email and uses quota). If yes, send a minimal email with a verified `from` to an address the user controls, and confirm the response includes a `request_id`. For composing anything beyond a hello-world, hand off to the `sending` skill.

## 6. Report what changed

Summarize: dependency added, files edited, env vars expected, domain status, and where the first real send call should go.

## Replacing an existing email provider

No per-provider migration playbook ships here. Run this install alongside the old code, then read the existing send calls and rewrite them using the `sending` skill + the generated SDK reference. Remove the old dependency last, after a successful send.
