# Webhook event types

Use this when reading webhook configuration, or when mapping between the names you register and the names that arrive in the payload.

## Event names

The canonical form is `<category>.<event>` — `message.delivery`, `engagement.click`. **Create and update behave identically**: both normalise whatever you send to the canonical form, and both accept all three of

- fully-prefixed — `message.delivery` ← write this
- short — `delivery`
- the legacy misspelled `engagament.*` prefix (missing an `e`) — accepted only for clients that subscribed before the rename

There is no create/update asymmetry and no 422 from picking the "wrong" form. Always write `engagement.*`; the misspelling is a backwards-compatibility shim, not the spelling — the SDK enums (`WebhookEventType`) only contain the correct one, so `WebhookEventType::from('engagament.click')` throws.

> **Registration names ≠ payload names.** What you register is namespaced; what arrives in the webhook body is the **short** name, nested under `msys.<category>.type`. See the `webhooks` skill for the payload shape.

## Complete list (22 events)

| Short name (payload & event filter) | Canonical name (registration) | Meaning |
|---|---|---|
| `injection` | `message.injection` | Accepted into the send queue |
| `delivery` | `message.delivery` | Receiving mail server accepted the message |
| `bounce` | `message.bounce` | Hard or soft bounce at delivery time |
| `delay` | `message.delay` | Temporary deferral (greylisted, retrying) |
| `out_of_band` | `message.out_of_band` | Asynchronous bounce after earlier successful delivery |
| `spam_complaint` | `message.spam_complaint` | Recipient marked as spam |
| `policy_rejection` | `message.policy_rejection` | Rejected pre-send (suppression list, invalid recipient) |
| `click` | `engagement.click` | Tracked link clicked |
| `open` | `engagement.open` | Tracking pixel loaded |
| `initial_open` | `engagement.initial_open` | First open for a recipient |
| `amp_click` | `engagement.amp_click` | Click in AMP content |
| `amp_open` | `engagement.amp_open` | Open in AMP-rendered client |
| `amp_initial_open` | `engagement.amp_initial_open` | First AMP open |
| `generation_failure` | `generation.generation_failure` | Could not render the message |
| `generation_rejection` | `generation.generation_rejection` | Render succeeded but rejected pre-injection |
| `list_unsubscribe` | `unsubscribe.list_unsubscribe` | One-click via `List-Unsubscribe` header |
| `link_unsubscribe` | `unsubscribe.link_unsubscribe` | Clicked in-body unsubscribe link |
| `relay_injection` | `relay.relay_injection` | Inbound relay — message injected |
| `relay_rejection` | `relay.relay_rejection` | Inbound relay — message rejected |
| `relay_delivery` | `relay.relay_delivery` | Inbound relay — message delivered |
| `relay_tempfail` | `relay.relay_tempfail` | Inbound relay — temporary failure |
| `relay_permfail` | `relay.relay_permfail` | Inbound relay — permanent failure |

## Diagnosing a silent webhook

1. Fetch the webhook by ID. Check `enabled` is `true`.
2. Compare `event_types` against what the user expects. If the webhook subscribes to `selected` events but the actual event isn't in the list, it'll never fire.
3. Check `last_successful_at` and `last_failure_at`. If `last_failure_at` is recent and `last_successful_at` is older, the receiver is rejecting deliveries — Lettr is trying. Inspect the user's endpoint (auth, response code, latency).
4. If both timestamps are null, no event has matched yet. Trigger one (send a test, then trigger an open by viewing the email) and re-check.

## Email-events filter

The `events` query parameter on `GET /api/emails/events` accepts **short names only**, and covers the 17 non-relay events above. The five `relay_*` events are not accepted there.
