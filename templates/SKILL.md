---
name: templates
description: Use when importing templates from another email provider (Mailgun, SendGrid, Postmark, SES, Mandrill) into Lettr, or when managing Lettr templates via API.
inputs:
    - name: LETTR_API_KEY
      description: Lettr API key. Get yours at https://app.lettr.com/settings/api-keys
      required: true
---

# Template Management & Import

## Overview

Lettr supports two template workflows:
1. **Create/manage templates** directly via API
2. **Import templates** from another email provider (Mailgun, SendGrid, Postmark, SES, Mandrill)

## Template CRUD

### List Templates

```bash
curl -H "Authorization: Bearer $LETTR_API_KEY" \
  https://app.lettr.com/api/templates
```

### Create Template

```bash
curl -X POST https://app.lettr.com/api/templates \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Email",
    "html": "<h1>Welcome {{name}}</h1><p>Thanks for joining {{company}}.</p>"
  }'
```

### Get Template

```bash
curl -H "Authorization: Bearer $LETTR_API_KEY" \
  https://app.lettr.com/api/templates/welcome-email
```

### Update Template

```bash
curl -X PUT https://app.lettr.com/api/templates/welcome-email \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Email v2",
    "html": "<h1>Welcome {{name}}!</h1>"
  }'
```

### Delete Template

```bash
curl -X DELETE https://app.lettr.com/api/templates/welcome-email \
  -H "Authorization: Bearer $LETTR_API_KEY"
```

## Merge Tags

Templates use `{{variable}}` syntax for dynamic content.

```html
<h1>Hello {{first_name}}</h1>
<p>Your order #{{order_id}} has shipped.</p>
```

Pass data when sending:

```json
{
  "template": "order-shipped",
  "data": {
    "first_name": "Jane",
    "order_id": "12345"
  }
}
```

## Template Import

Import stored templates from another email provider. Only needed for **provider-hosted** templates (not for templates in your codebase like Blade, Pug, or Jinja).

### Supported Providers

| Provider | Merge Tag Format | Conversion |
|----------|-----------------|------------|
| Mailgun | `%recipient.name%` | → `{{name}}` |
| SendGrid | `{{name}}` | Compatible (no conversion) |
| Postmark | `{{name}}` | Compatible (no conversion) |
| AWS SES | `{{name}}` | Compatible (no conversion) |
| Mandrill | `*\|NAME\|*` | → `{{name}}` |

Resend does not have stored templates — no import needed.

### Start Import

```bash
curl -X POST https://app.lettr.com/api/templates/import \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "postmark",
    "api_key": "your-postmark-server-token"
  }'
```

For Mailgun, also pass `domain` and optionally `region`:

```bash
curl -X POST https://app.lettr.com/api/templates/import \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mailgun",
    "api_key": "key-xxx",
    "domain": "mg.example.com",
    "region": "us"
  }'
```

Response:

```json
{
  "message": "Template import started.",
  "data": {
    "import_id": 42,
    "status": "queued"
  }
}
```

### Check Import Status

```bash
curl -H "Authorization: Bearer $LETTR_API_KEY" \
  https://app.lettr.com/api/templates/import/42
```

Response:

```json
{
  "data": {
    "status": "completed",
    "total": 5,
    "imported": 4,
    "failed": 1,
    "templates": [
      {"old_id": "welcome", "new_slug": "welcome", "name": "Welcome", "status": "imported"},
      {"old_id": "receipt", "new_slug": "receipt", "name": "Receipt", "status": "imported"},
      {"old_id": "empty", "name": "Empty Template", "status": "failed", "error": "Template has no HTML content"}
    ]
  }
}
```

### After Import

Update template references in your codebase to use the new Lettr slugs from the `templates` mapping in the import status response.
