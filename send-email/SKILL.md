---
name: send-email
description: Use when sending transactional emails (welcome messages, order confirmations, password resets, receipts), notifications, or template-based emails via the Lettr API.
inputs:
    - name: LETTR_API_KEY
      description: Lettr API key for sending emails. Get yours at https://app.lettr.com/settings/api-keys
      required: true
---

# Send Email with Lettr

## Overview

Lettr provides a single endpoint for sending emails with support for inline HTML, templates with merge tags, and attachments.

**Endpoint:** `POST /api/emails`

## Quick Start

1. **Detect project language** from config files (package.json, composer.json, go.mod, etc.)
2. **Install SDK** (preferred) or use cURL — see [references/installation.md](references/installation.md)
3. **Send email** using the appropriate SDK method

## SDK Installation

| Language | Install Command |
|----------|----------------|
| Laravel | `composer require lettr/lettr-laravel && php artisan lettr:init` |
| PHP | `composer require lettr/lettr-php` |
| Node.js | `npm install lettr` |
| Python | `pip install lettr` |
| Go | `go get github.com/lettr/lettr-go` |

See [references/installation.md](references/installation.md) for full examples per language.

## Sending with Inline HTML

```bash
curl -X POST https://app.lettr.com/api/emails \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"email": "sender@example.com", "name": "My App"},
    "to": [{"email": "recipient@example.com", "name": "User"}],
    "subject": "Welcome!",
    "html": "<h1>Welcome</h1><p>Thanks for signing up.</p>"
  }'
```

## Sending with Templates

Templates are stored on Lettr and referenced by slug. Merge tags use `{{variable}}` syntax.

```bash
curl -X POST https://app.lettr.com/api/emails \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"email": "sender@example.com"},
    "to": [{"email": "recipient@example.com"}],
    "template": "welcome-email",
    "data": {
      "name": "John",
      "company": "Acme Inc"
    }
  }'
```

## Response

```json
{
  "message": "Email sent successfully.",
  "data": {
    "request_id": "abc123"
  }
}
```

## Error Handling

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Invalid request | Fix parameters |
| 401 | Invalid API key | Check `LETTR_API_KEY` |
| 403 | Domain not verified / IP blocked | Verify domain or check IP whitelist |
| 422 | Validation error | Check required fields |
| 429 | Rate limited | Retry with backoff |
| 500 | Server error | Retry with backoff |

## SMTP Alternative

Use Lettr as an SMTP relay with any language:

```
Host: smtp.lettr.com
Port: 587
Username: lettr
Password: <your LETTR_API_KEY>
Encryption: TLS
```

## Resources

- [API Reference](https://docs.lettr.com/api-reference/emails)
- [Template Merge Tags](https://docs.lettr.com/templates/merge-tags)
