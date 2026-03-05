# SDK Installation

## Laravel (PHP)

```bash
composer require lettr/lettr-laravel
php artisan lettr:init
```

This automatically:
- Publishes the Lettr config file
- Adds `LETTR_API_KEY` to `.env`
- Sets `MAIL_MAILER=lettr` in `.env`
- Registers the Lettr mail transport

After setup, all Mailables sent via `Mail::to()->send()` are routed through Lettr with no code changes.

## PHP (non-Laravel)

```bash
composer require lettr/lettr-php
```

```php
use Lettr\Lettr;

$lettr = Lettr::client(getenv('LETTR_API_KEY'));

$response = $lettr->emails()->send(
    $lettr->emails()->create()
        ->from('sender@example.com', 'Sender Name')
        ->to(['recipient@example.com'])
        ->subject('Hello from Lettr')
        ->html('<h1>Hello!</h1>')
);
```

## Node.js / TypeScript

```bash
npm install lettr
# or
bun add lettr
# or
yarn add lettr
```

```typescript
import { Lettr } from 'lettr';

const lettr = new Lettr(process.env.LETTR_API_KEY);

await lettr.emails.send({
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Hello from Lettr',
    html: '<h1>Hello!</h1>',
});
```

## Python

```bash
pip install lettr
```

```python
import lettr
import os

client = lettr.Client(api_key=os.environ["LETTR_API_KEY"])

client.emails.send(
    from_email="sender@example.com",
    to=["recipient@example.com"],
    subject="Hello from Lettr",
    html="<h1>Hello!</h1>",
)
```

## Go

```bash
go get github.com/lettr/lettr-go
```

```go
package main

import (
    "os"
    "github.com/lettr/lettr-go"
)

func main() {
    client := lettr.NewClient(os.Getenv("LETTR_API_KEY"))

    _, err := client.Emails.Send(&lettr.SendEmailRequest{
        From:    "sender@example.com",
        To:      []string{"recipient@example.com"},
        Subject: "Hello from Lettr",
        Html:    "<h1>Hello!</h1>",
    })
}
```

## Rust

Add to `Cargo.toml`:

```toml
[dependencies]
lettr = "0.1"
```

```rust
use lettr::Client;

#[tokio::main]
async fn main() {
    let client = Client::new(std::env::var("LETTR_API_KEY").unwrap());

    client.emails().send(
        lettr::SendEmailRequest::new()
            .from("sender@example.com")
            .to(vec!["recipient@example.com"])
            .subject("Hello from Lettr")
            .html("<h1>Hello!</h1>"),
    ).await.unwrap();
}
```

## Java (Maven)

```xml
<dependency>
    <groupId>com.lettr</groupId>
    <artifactId>lettr-java</artifactId>
    <version>0.1.0</version>
</dependency>
```

## cURL

```bash
curl -X POST https://app.lettr.com/api/emails \
  -H "Authorization: Bearer $LETTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"email": "sender@example.com"},
    "to": [{"email": "recipient@example.com"}],
    "subject": "Hello from Lettr",
    "html": "<h1>Hello!</h1>"
  }'
```

## SMTP Relay

Use Lettr as an SMTP relay with any language or framework:

```
Host: smtp.lettr.com
Port: 587
Username: lettr
Password: <your LETTR_API_KEY>
Encryption: TLS
```
