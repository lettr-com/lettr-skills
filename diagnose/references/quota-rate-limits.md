# Quotas and rate limits

Two distinct mechanisms can cause sends to fail with 429 / quota errors:

| | When it fires | What to look at |
|---|---|---|
| **Sending quota** | Free-tier teams have monthly and daily caps. Exceeding either rejects the send. | The send response includes `quota.monthly_remaining` and `quota.daily_remaining`. Once either hits 0, sends fail until the window resets. |
| **Rate limit (per team)** | Bursting too many requests in a short window. Returns 429 with `Retry-After`. | Slow down. Either spread sends or batch into the scheduled-send endpoint. |

## Quick triage

1. Validate the API key — confirms the user is using the right one and returns the team.
2. Send one small test. If it returns a quota error, the response payload tells you which limit was hit.
3. If validation passes but real sends fail with 429, it's a rate limit (transient) — back off and retry. If it's a quota, the user has to wait for the window or upgrade the plan.

## In SDKs

Each language SDK surfaces these as specific exceptions/errors so the agent can wire retry logic:

- **PHP / Laravel**: `RateLimitException` (with `retryAfter`), `QuotaExceededException`.
- **Python**: subclasses of `lettr.LettrError`.
- **Node**: `error.type === "api"` with the response payload.
- **Go**: `lettr.IsRateLimited(err)`.
- **Rust**: `lettr::Error::RateLimit { retry_after }`.

When a rate-limit error includes a `retry_after`, respect it. Don't loop tighter than that value.

## Sandbox restrictions

Some operations (e.g., sending to addresses outside the team) are blocked while a team is in sandbox mode. The error message will say so. Ask the user to verify a sending domain to leave sandbox.
