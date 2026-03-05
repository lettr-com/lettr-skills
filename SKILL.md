---
name: lettr
description: Use when working with Lettr email platform — routes to specific sub-skills for onboarding, sending emails, managing domains, or importing templates.
license: MIT
metadata:
    author: lettr
    version: "1.0.0"
    homepage: https://lettr.com
    source: https://github.com/lettr-com/lettr-skills
inputs:
    - name: LETTR_API_KEY
      description: Lettr API key for sending emails and managing resources. Get yours at https://app.lettr.com/settings/api-keys
      required: true
---

# Lettr

## Overview

Lettr is an email delivery platform for developers. This skill routes to feature-specific sub-skills.

## Sub-Skills

| Feature | Skill | Use When |
|---------|-------|----------|
| **Onboarding & migration** | `onboarding` | Migrating from another email provider, initial project setup, SDK installation |
| **Sending emails** | `send-email` | Transactional emails, notifications, template-based sends |
| **Domain management** | `domains` | Adding sending domains, DNS verification, domain status |
| **Template import** | `templates` | Importing templates from Mailgun, SendGrid, Postmark, SES, or Mandrill |

## Quick Routing

**Migrating from another provider?** Use `onboarding` skill
- Auto-detects your stack and current email provider
- Installs Lettr SDK, migrates send calls, sets up domain
- Imports provider-hosted templates if applicable

**Need to send emails?** Use `send-email` skill
- Single transactional emails
- Template-based sends with merge tags
- SMTP relay configuration

**Setting up a sending domain?** Use `domains` skill
- Add and verify sending domains via API
- DNS record setup (CNAME, DKIM, DMARC)

**Importing templates from another provider?** Use `templates` skill
- Bulk import from Mailgun, SendGrid, Postmark, SES, Mandrill
- Automatic merge tag conversion

## Common Setup

### API Key

Store in environment variable:

```bash
export LETTR_API_KEY=lttr_xxxxxxxxx
```

### SDK Installation

See `onboarding` or `send-email` skill for installation instructions across all supported languages.

## Resources

- [Lettr Documentation](https://docs.lettr.com)
- [API Reference](https://docs.lettr.com/api-reference)
- [Dashboard](https://app.lettr.com)
