# Reading bounce events

When the latest event for a transmission is a `bounce` (or `out_of_band`, `policy_rejection`), the `bounce_class` and `reason` fields tell you what happened.

## Hard vs soft

| Event type | Meaning |
|---|---|
| `bounce` | Synchronous bounce at delivery time. Hard or soft depending on `bounce_class`. |
| `out_of_band` | Delivery initially succeeded, then the receiver bounced asynchronously (e.g. mailbox unknown after the fact). Treat as a hard bounce. |
| `policy_rejection` | Rejected before send — usually the recipient is on the suppression list or the address is malformed. The `from` domain may be unverified. |
| `delay` | Greylisted or temporarily deferred. Lettr is retrying. Not a final failure. |

## Common bounce classes

Lettr surfaces SparkPost's bounce classification. The classes you'll see most:

| Class | Hard? | Meaning | Action |
|---|---|---|---|
| 10 | Hard | Invalid recipient | Address doesn't exist. Remove from your list. |
| 20 | Soft | Generic soft bounce | Receiving server temporary issue. Retry later. |
| 21 | Hard | DNS failure | Recipient domain has no MX or doesn't resolve. Likely typo. |
| 22 | Soft | Mailbox full | Inbox full. Will likely succeed once the user clears space. |
| 25 | Hard | Admin failure | Policy at the receiver. Investigate `reason` text. |
| 30 | Hard | Generic bounce: no `rcpt` | Recipient unknown. Treat as invalid. |
| 50 | Hard | Mail block | Receiver is blocking the sending IP/domain. Check sender reputation; verify SPF/DKIM/DMARC are aligned. |
| 51 | Hard | Spam block | Receiver flagged as spam at IP/domain level. |
| 52 | Hard | Spam content | Receiver flagged the message body. Tighten content. |
| 53 | Hard | Prohibited attachment | Attachment type or size disallowed by receiver. |
| 54 | Hard | Relaying denied | Receiver doesn't accept relay from this sender. Confirm `from` is on a verified Lettr domain. |
| 70 | Soft | Transient failure | Retry will likely succeed. |
| 90 | Hard | Unsubscribe | Recipient unsubscribed. Honor it. |

For uncommon classes, read the `reason` string returned with the event — it's the receiver's verbatim response and usually tells you exactly what to fix.

## Decision shortcut

- **One recipient bouncing class 10/30**: bad address. Remove it.
- **Multiple recipients bouncing class 50/51**: deliverability issue. Check domain auth (`dns-failures.md`), reputation, and content.
- **Class 22**: leave it; transient.
- **`policy_rejection`**: the send never left Lettr. Almost always: `from` address on an unverified domain, or recipient on the suppression list. Check the team's verified domains and the `reason` field.

## When `delivery` is the latest event but the user "didn't receive"

Lettr's job ends when the receiving server accepts the message. After that:

1. Ask the user to check spam/junk.
2. Check engagement events — if `open` fired, they did receive it.
3. If still missing, the message is filtered inside the receiver. The user (or their IT) needs to whitelist the sending domain.
