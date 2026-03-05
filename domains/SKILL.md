---
name: domains
description: Use when adding or verifying sending domains on Lettr, checking domain DNS status, or managing domain configuration.
inputs:
    - name: LETTR_API_KEY
      description: Lettr API key. Get yours at https://app.lettr.com/settings/api-keys
      required: true
---

# Domain Management

## Overview

Before sending emails through Lettr, you must add and verify your sending domain. Verification requires adding DNS records (CNAME, DKIM, DMARC) to your domain provider.

## Add a Domain

```bash
curl -X POST https://app.lettr.com/api/domains \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "mail.example.com"}'
```

Response includes DNS records to add:

```json
{
  "message": "Domain created successfully.",
  "data": {
    "domain": "mail.example.com",
    "status": "pending",
    "dkim": {
      "selector": "scph1234",
      "public": "MIGfMA0GCSq..."
    }
  }
}
```

## Required DNS Records

After adding a domain, configure these DNS records:

### CNAME Record

| Field | Value |
|-------|-------|
| Hostname | `mail.example.com` |
| Value | `sparkpostmail.com` |

### DKIM (TXT Record)

| Field | Value |
|-------|-------|
| Hostname | `{selector}._domainkey.mail.example.com` |
| Value | `v=DKIM1;k=rsa;h=sha256;p={public_key}` |

### DMARC (TXT Record — Recommended)

| Field | Value |
|-------|-------|
| Hostname | `_dmarc.mail.example.com` |
| Value | `v=DMARC1;p=none;` |

## Verify Domain

After adding DNS records (propagation can take up to 48 hours):

```bash
curl -X POST https://app.lettr.com/api/domains/mail.example.com/verify \
  -H "Authorization: Bearer $LETTR_API_KEY"
```

Response includes per-record verification status:

```json
{
  "success": true,
  "cname_status": "valid",
  "dkim_status": "valid",
  "dmarc_status": "valid"
}
```

## List Domains

```bash
curl -H "Authorization: Bearer $LETTR_API_KEY" \
  https://app.lettr.com/api/domains
```

## Delete Domain

```bash
curl -X DELETE https://app.lettr.com/api/domains/mail.example.com \
  -H "Authorization: Bearer $LETTR_API_KEY"
```

## Common Issues

| Problem | Solution |
|---------|----------|
| CNAME not verifying | Check for typos, ensure no conflicting A records on the subdomain |
| DKIM not verifying | Make sure the full TXT value is pasted without line breaks |
| DMARC not verifying | DMARC record goes on `_dmarc.domain`, not `domain` itself |
| Still pending after 48h | Try deleting and re-adding the domain |
