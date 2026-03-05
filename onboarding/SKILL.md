---
name: onboarding
description: Use when migrating a project to Lettr from another email provider (Resend, Mailgun, SendGrid, Postmark, SES, Mandrill), setting up Lettr for the first time, or installing the Lettr SDK.
inputs:
    - name: LETTR_API_KEY
      description: Lettr API key for authentication. Get yours at https://app.lettr.com/settings/api-keys
      required: true
---

# Migrate to Lettr

Migrate your project to Lettr for transactional email delivery. This skill auto-detects your stack, installs the Lettr SDK, migrates email sending, imports provider-hosted templates, and sets up your sending domain.

## Step 1: Project Detection

Scan the project root for dependency files to detect the language and framework:

| File | Language | Framework Detection |
|------|----------|-------------------|
| `composer.json` | PHP | `laravel/framework` (Laravel), `symfony/symfony` (Symfony) |
| `package.json` | Node.js | `next` (Next.js), `express` (Express), `@nestjs/core` (NestJS) |
| `go.mod` | Go | Check module path |
| `Cargo.toml` | Rust | Check dependencies |
| `pom.xml` | Java | Check for Spring Boot |
| `requirements.txt` / `pyproject.toml` | Python | `django`, `flask`, `fastapi` |

Report what you found before proceeding.

## Step 2: Email Provider Detection

Search the project for current email provider usage. Check dependencies AND source code:

**Resend:**
- Dependencies: `resend/resend-php`, `resend/resend-laravel`, `resend` (npm)
- Env vars: `RESEND_API_KEY`
- Note: Resend has NO stored templates — skip template import

**Mailgun:**
- Dependencies: `mailgun/mailgun-php`, `mailgun.js`
- Env vars: `MAILGUN_SECRET`, `MAILGUN_DOMAIN`
- Config: `MAIL_MAILER=mailgun`
- Stored templates: YES (requires domain for import)

**SendGrid:**
- Dependencies: `sendgrid/sendgrid`, `@sendgrid/mail`
- Env vars: `SENDGRID_API_KEY`
- Stored templates: YES (dynamic templates)

**Postmark:**
- Dependencies: `wildbit/postmark-php`, `postmark` (npm)
- Env vars: `POSTMARK_TOKEN`
- Config: `MAIL_MAILER=postmark`
- Stored templates: YES

**AWS SES:**
- Dependencies: `aws/aws-sdk-php` with SES usage, `@aws-sdk/client-ses`
- Config: `MAIL_MAILER=ses`
- Stored templates: YES

**Mandrill:**
- Dependencies: `mandrill/mandrill`, `mailchimp_transactional`
- Env vars: `MANDRILL_API_KEY`
- Stored templates: YES (merge tags use `*|VARIABLE|*` format)

**No provider / SMTP only:**
- Config: `MAIL_MAILER=smtp` or direct SMTP credentials
- Action: Switch SMTP credentials to Lettr's SMTP relay

Report the detected provider and email patterns.

## Step 3: Categorize Email Patterns

Scan the codebase to categorize how emails are sent:

| Pattern | Detection | Migration Action |
|---------|-----------|-----------------|
| **Inline HTML** | HTML strings in code | Keep inline, swap send call to Lettr |
| **Framework templates** | Blade, Pug, Jinja, ERB files | Keep templates, swap mail driver to Lettr |
| **Provider-hosted templates** | Template IDs/slugs referencing provider | Import via API, update references |
| **SMTP relay** | SMTP host/port/credentials in config | Swap to Lettr SMTP credentials |
| **Direct API calls** | HTTP calls to provider endpoints | Replace with Lettr API calls |

## Step 4: Validate API Key

```bash
curl -s -H "Authorization: Bearer $LETTR_API_KEY" https://app.lettr.com/api/auth/check
```

If invalid, ask the user for a valid key. Keys start with `lttr_`.

## Step 5: Install SDK

See [references/installation.md](references/installation.md) for full installation instructions per language.

**Quick start by framework:**

**Laravel:**
```bash
composer require lettr/lettr-laravel
php artisan lettr:init
```
Set in `.env`: `LETTR_API_KEY=lttr_xxx` and `MAIL_MAILER=lettr`

**Node.js:** `npm install lettr` or `bun add lettr`

**PHP:** `composer require lettr/lettr-php`

**Python:** `pip install lettr`

**Go:** `go get github.com/lettr/lettr-go`

After installation, set the `LETTR_API_KEY` environment variable.

## Step 6: Domain Setup

Extract the sending domain from project config:
- Laravel: `MAIL_FROM_ADDRESS` in `.env` or `config/mail.php`
- Django: `DEFAULT_FROM_EMAIL` in `settings.py`
- Node.js: Look for `from` fields in email send calls
- General: Check env vars like `FROM_EMAIL`, `SENDER_EMAIL`

Extract the domain part (e.g., `noreply@example.com` → `example.com`).

```bash
# Create domain
curl -s -X POST \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "DOMAIN"}' \
  https://app.lettr.com/api/domains

# Verify (after DNS records are added)
curl -s -X POST \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  https://app.lettr.com/api/domains/DOMAIN/verify
```

Display the DNS records from the response (CNAME, DKIM TXT, DMARC TXT) and tell the user to add them. DNS propagation can take up to 48 hours.

## Step 7: Migrate Email Sending

See [references/migration-examples.md](references/migration-examples.md) for provider-specific migration code.

**Key principles:**
- Match the user's existing patterns exactly — don't change their architecture
- For Laravel with `MAIL_MAILER=lettr`: no code changes needed for Mailables
- For SMTP: just swap credentials (see [references/smtp.md](references/smtp.md))
- For direct API calls: replace with Lettr SDK equivalents

## Step 8: Template Import (Provider-Hosted Only)

**IMPORTANT:** Only import if the user stores templates on their email provider. If templates are in the codebase (Blade, Pug, Jinja, inline HTML), skip this step.

If provider-hosted templates are detected:

1. Ask for the old provider's API key
2. Start import:
```bash
curl -s -X POST \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"provider": "PROVIDER", "api_key": "OLD_KEY", "region": "us", "domain": "example.com"}' \
  https://app.lettr.com/api/templates/import
```
3. Poll status:
```bash
curl -s -H "Authorization: Bearer $LETTR_API_KEY" \
  https://app.lettr.com/api/templates/import/IMPORT_ID
```
4. Show old→new slug mapping and update template references in the codebase

Supported providers: `mailgun`, `sendgrid`, `postmark`, `ses`, `mandrill`

## Step 9: Verification

Send a test email:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "USER_EMAIL"}],
    "from": {"email": "test@DOMAIN"},
    "subject": "Lettr Setup Complete",
    "html": "<h1>Your Lettr setup is working!</h1><p>This email was sent via your new Lettr integration.</p>"
  }' \
  https://app.lettr.com/api/emails
```

Ask the user for their email address.

## Step 10: Complete Onboarding

```bash
curl -s -X POST \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://app.lettr.com/api/onboarding/complete
```

Summarize: SDK installed, domain configured, email sending migrated, templates imported (if applicable), test email sent.

## Fallback

If an SDK doesn't exist for the user's language, generate raw HTTP calls. Full API spec: `https://app.lettr.com/openapi.json`
