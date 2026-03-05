# Migration Examples

Provider-specific code migration patterns. Match the user's existing patterns — don't change their architecture.

## From Resend

### Node.js

```typescript
// Before (Resend)
import { Resend } from 'resend';
const resend = new Resend('re_xxx');
await resend.emails.send({
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Hello',
    html: '<h1>Hello World</h1>',
});

// After (Lettr)
import { Lettr } from 'lettr';
const lettr = new Lettr(process.env.LETTR_API_KEY);
await lettr.emails.send({
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Hello',
    html: '<h1>Hello World</h1>',
});
```

### PHP (Laravel with Resend package)

```php
// Before: config/mail.php uses 'resend' mailer
// After: set MAIL_MAILER=lettr in .env
// No code changes needed — Mailables work transparently
```

### PHP (direct Resend SDK)

```php
// Before (Resend)
$resend = Resend::client('re_xxx');
$resend->emails->send([
    'from' => 'sender@example.com',
    'to' => ['recipient@example.com'],
    'subject' => 'Hello',
    'html' => '<h1>Hello</h1>',
]);

// After (Lettr)
$lettr = Lettr::client(env('LETTR_API_KEY'));
$lettr->emails()->send(
    $lettr->emails()->create()
        ->from('sender@example.com')
        ->to(['recipient@example.com'])
        ->subject('Hello')
        ->html('<h1>Hello</h1>')
);
```

## From SendGrid

### Node.js

```typescript
// Before (SendGrid)
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
await sgMail.send({
    to: 'recipient@example.com',
    from: 'sender@example.com',
    subject: 'Hello',
    html: '<h1>Hello</h1>',
});

// After (Lettr)
import { Lettr } from 'lettr';
const lettr = new Lettr(process.env.LETTR_API_KEY);
await lettr.emails.send({
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Hello',
    html: '<h1>Hello</h1>',
});
```

### SendGrid Dynamic Templates

```typescript
// Before (SendGrid template)
await sgMail.send({
    to: 'recipient@example.com',
    from: 'sender@example.com',
    templateId: 'd-xxxxx',
    dynamicTemplateData: { name: 'John' },
});

// After (Lettr — import templates first, then use slug)
await lettr.emails.send({
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    template: 'imported-template-slug',
    data: { name: 'John' },
});
```

## From Postmark

### Node.js

```typescript
// Before (Postmark)
import { ServerClient } from 'postmark';
const client = new ServerClient('xxx');
await client.sendEmail({
    From: 'sender@example.com',
    To: 'recipient@example.com',
    Subject: 'Hello',
    HtmlBody: '<h1>Hello</h1>',
});

// After (Lettr)
import { Lettr } from 'lettr';
const lettr = new Lettr(process.env.LETTR_API_KEY);
await lettr.emails.send({
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Hello',
    html: '<h1>Hello</h1>',
});
```

## From Mailgun

### PHP

```php
// Before (Mailgun)
$mg = Mailgun::create('key-xxx');
$mg->messages()->send('example.com', [
    'from' => 'sender@example.com',
    'to' => 'recipient@example.com',
    'subject' => 'Hello',
    'html' => '<h1>Hello</h1>',
]);

// After (Lettr)
$lettr = Lettr::client(env('LETTR_API_KEY'));
$lettr->emails()->send(
    $lettr->emails()->create()
        ->from('sender@example.com')
        ->to(['recipient@example.com'])
        ->subject('Hello')
        ->html('<h1>Hello</h1>')
);
```

## From AWS SES

### PHP (Laravel)

```php
// Before: MAIL_MAILER=ses in .env
// After: MAIL_MAILER=lettr in .env
// No code changes needed for Mailables
```

## SMTP Relay Migration

For any framework using SMTP:

```
# Before (any provider)
MAIL_HOST=smtp.old-provider.com
MAIL_PORT=587
MAIL_USERNAME=old-user
MAIL_PASSWORD=old-password

# After (Lettr)
MAIL_HOST=smtp.lettr.com
MAIL_PORT=587
MAIL_USERNAME=lettr
MAIL_PASSWORD=lttr_your_api_key
MAIL_ENCRYPTION=tls
```
