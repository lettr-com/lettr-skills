# DNS verification failures

When a domain detail or verification result shows a record as invalid, this reference helps interpret which record failed and what the user has to fix at their DNS provider.

## What Lettr expects

A sending domain needs three records to fully verify:

| Record | Purpose | Type | Where Lettr publishes the expected value |
|---|---|---|---|
| **Return-path / bounce CNAME** | Lets Lettr handle bounces and FBLs on behalf of the domain. | CNAME | `dns.return_path_host` → `dns.return_path_value` on the domain detail response |
| **DKIM** | Signs outgoing mail so receivers can verify it wasn't tampered with. | TXT | `dns.dkim.selector._domainkey.<domain>` → `dns.dkim.public_key` |
| **SPF** | Authorizes Lettr's IPs to send for the domain. | TXT (root) | Add `include:sparkpostmail.com` to the existing SPF record |

DMARC is recommended but not required for Lettr to send. Add `_dmarc.<domain>` TXT with at least `v=DMARC1; p=none; rua=mailto:dmarc@<domain>` once SPF and DKIM are verified.

## Common failure modes

### `dkim` invalid

- **Most likely**: the user added the value with surrounding quotes that the DNS provider also added. Lettr sees the literal `"v=DKIM1; …"` instead of `v=DKIM1; …`. Re-paste without quotes.
- **Also common**: pasted the public key with line breaks. Most providers want the value on a single line, or they merge multi-line TXT chunks. Check the provider's UI.
- **TTL not yet expired**: the user updated a previous record and is hitting cache. Wait the TTL or change selector.

### `return_path` invalid

- **The CNAME points to the wrong target**. Re-fetch the domain detail and re-paste exactly. The host is something like `mail.<domain>` (subdomain) and the target is on `sparkpostmail.com`.
- **A wildcard CNAME at the apex** can shadow the specific record. Tell the user to add an explicit record for the bounce hostname.

### `spf` not aligned

SPF is a single TXT record at the apex (`example.com.` not `mail.example.com.`). If multiple SPF records exist, receivers will fail validation. Merge `include:sparkpostmail.com` into the existing record.

Example acceptable record:

```
v=spf1 include:_spf.google.com include:sparkpostmail.com ~all
```

## Workflow

1. Fetch the domain detail. The response has `dns.dkim`, `dns.return_path_host` / `_value`, and the SPF guidance.
2. Read the `status` of each sub-record. If `pending`, the user hasn't added it yet. If `error`, they added it but it doesn't match what Lettr expects — show them the expected value.
3. After the user updates DNS, re-run verification. DNS propagation can take minutes to hours; if verification fails immediately after a change, wait 5–10 minutes and try again.
4. Once verification reports the domain as fully verified, sending from any address on that domain will work.

## Sending from a specific subdomain

`example.com` and `mail.example.com` are separate sending domains in Lettr. Register the subdomain explicitly if the user wants to send from it.
