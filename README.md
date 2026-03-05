# Lettr Skills

Agent skills for working with [Lettr](https://lettr.com) to send emails, manage domains, and migrate from other providers.

Works with Claude Code, Cursor, Codex, Windsurf, and [other AI coding agents](https://github.com/vercel-labs/skills#available-agents).

## Available Skills

### [`onboarding`](./onboarding)

Migrate your project to Lettr from any email provider. Auto-detects your stack, installs the SDK, rewires email sending, sets up your domain, and imports provider-hosted templates.

### [`send-email`](./send-email)

Send transactional emails using the Lettr API. Covers single sends, template-based sends, and SMTP relay configuration across all supported SDKs.

### [`domains`](./domains)

Add and verify sending domains. Includes DNS record setup for CNAME, DKIM, and DMARC.

### [`templates`](./templates)

Import stored templates from Mailgun, SendGrid, Postmark, AWS SES, or Mandrill. Handles merge tag conversion automatically.

## Installation

```bash
npx skills add lettr-com/lettr-skills
```

## Usage

Skills activate automatically when relevant tasks are detected. Example prompts:

- "Migrate my project from Resend to Lettr"
- "Send a welcome email with Lettr"
- "Set up my sending domain on Lettr"
- "Import my SendGrid templates into Lettr"

## Prerequisites

- A Lettr account with a verified domain
- API key stored in `LETTR_API_KEY` environment variable

Get your API key at [app.lettr.com/settings/api-keys](https://app.lettr.com/settings/api-keys)

## License

MIT
