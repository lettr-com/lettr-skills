# SMTP Relay

Use Lettr as an SMTP relay with any language or framework. No SDK needed.

## Credentials

```
Host: smtp.lettr.com
Port: 587
Username: lettr
Password: <your LETTR_API_KEY>
Encryption: TLS
```

## Laravel

In `.env`:

```
MAIL_MAILER=smtp
MAIL_HOST=smtp.lettr.com
MAIL_PORT=587
MAIL_USERNAME=lettr
MAIL_PASSWORD=lttr_your_api_key
MAIL_ENCRYPTION=tls
```

## Django

In `settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.lettr.com'
EMAIL_PORT = 587
EMAIL_HOST_USER = 'lettr'
EMAIL_HOST_PASSWORD = os.environ['LETTR_API_KEY']
EMAIL_USE_TLS = True
```

## Node.js (Nodemailer)

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.lettr.com',
    port: 587,
    secure: false,
    auth: {
        user: 'lettr',
        pass: process.env.LETTR_API_KEY,
    },
});
```

## Ruby (Action Mailer)

In `config/environments/production.rb`:

```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
    address: 'smtp.lettr.com',
    port: 587,
    user_name: 'lettr',
    password: ENV['LETTR_API_KEY'],
    authentication: 'plain',
    enable_starttls_auto: true,
}
```
