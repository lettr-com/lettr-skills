# Quotas and rate limits

Two distinct mechanisms can cause sends to fail with 429 / quota errors:

| | When it fires | What to look at |
|---|---|---|
| **Sending quota** | Free-tier teams have monthly and daily caps. Exceeding either rejects the send. | Quota is returned as **response headers**, not body fields: `X-Monthly-Remaining` / `X-Monthly-Limit` / `X-Monthly-Reset` and the `X-Daily-*` equivalents, present on both `200` and `429`. There is no `quota` object in the JSON body. Once either remaining count hits 0, sends fail until the window resets. |
| **Rate limit (per team)** | Bursting too many requests in a short window. Returns 429 with `Retry-After`. | Slow down. Either spread sends or batch into the scheduled-send endpoint. |

## How quota is counted

**Quota is denominated in recipients, not requests — and `cc` and `bcc` count too.** One call
with 5 addresses in `to`, 2 in `cc` and 1 in `bcc` consumes **8**, not 1 and not 5. This is
the usual explanation when a user insists their usage number is wrong: look for a `cc`/`bcc`
that rides along on every send (a compliance archive BCC is the classic one — it doubles
consumption for the whole account).

Two more behaviours worth knowing before you diagnose:

- **Enforcement is all-or-nothing.** A request that would cross the daily or monthly limit is
  rejected *in full* and the reservation rolled back. Lettr never partially delivers, so
  "some of my batch went out and some didn't" is **not** a quota symptom — look elsewhere
  (suppression, per-recipient rejection at handoff).
- **Quota is reserved up front, then reconciled to the accepted count.** Recipients refused
  at handoff are refunded, so the final counter can be lower than the number of addresses
  submitted. A small discrepancy in that direction is expected, not a bug.

## Quick triage

1. Validate the API key — confirms the user is using the right one and returns the team.
2. Send one small test. If it returns a quota error, the response payload tells you which limit was hit.
3. If validation passes but real sends fail with 429, it's a rate limit (transient) — back off and retry. If it's a quota, the user has to wait for the window or upgrade the plan.

## In SDKs

Each language SDK surfaces these as specific exceptions/errors so the agent can wire retry logic:

- **PHP / Laravel**: `RateLimitException` (with `retryAfter`), `QuotaExceededException`.
- **Python**: `lettr.RateLimitError`, a subclass of `lettr.LettrError`.
- **Node**: `error.type === "api"`; discriminate on `error.error_code`.
- **Go**: a single `*lettr.Error` — there is **no** `IsRateLimited` helper. Check `e.StatusCode == 429` and read `e.ErrorCode`.
- **Rust**: a single `Error::Api(e)` — there is **no** `RateLimit` variant. Read `e.error_code`.

In every language the 429 cause is carried by `error_code`, not the type: `rate_limit_exceeded` (transient, honour `Retry-After`) vs `quota_exceeded` / `daily_quota_exceeded` (plan limit, waiting won't help until the window resets).

When a rate-limit error includes a `retry_after`, respect it. Don't loop tighter than that value.

## Sandbox restrictions

Some operations (e.g., sending to addresses outside the team) are blocked while a team is in sandbox mode. The error message will say so. Ask the user to verify a sending domain to leave sandbox.
