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

Lettr surfaces SparkPost's numeric bounce classification, and sorts it into **three**
verdicts, not two. The middle one matters most: those addresses are fine, and deleting
them is wrong.

| Verdict | Classes | What it means | Action |
|---|---|---|---|
| **Hard** | 10, 30, 90 | The address is permanently bad. | Remove from your list. |
| **Blocked by provider** | 50, 51, 52, 53, 54 | The **recipient is valid**; the *receiver* refused *your mail*. | ⚠️ **Do not remove the contact.** Fix the sender side: domain auth, reputation, content, attachment policy. |
| **Soft** | 20, 21, 22, 25, 40, 70 | Temporary. Lettr retries automatically. | Leave the contact alone. |

Per-class detail:

| Class | Verdict | Meaning | Notes |
|---|---|---|---|
| 10 | Hard | Invalid recipient | Address doesn't exist. |
| 30 | Hard | Generic bounce: no `rcpt` | Recipient unknown. Treat as invalid. |
| 90 | Hard | Unsubscribe | Recipient unsubscribed. Honour it. |
| 50 | Blocked | Mail block | Receiver blocking the sending IP/domain. Check reputation, SPF/DKIM/DMARC. |
| 51 | Blocked | Spam block | Flagged as spam at IP/domain level. |
| 52 | Blocked | Spam content | Receiver flagged the message body. Tighten content. |
| 53 | Blocked | Prohibited attachment | Attachment type or size disallowed. |
| 54 | Blocked | Relaying denied | Confirm `from` is on a verified Lettr domain. |
| 20 | Soft | Generic soft bounce | Receiving server temporary issue. |
| 21 | Soft | DNS failure | Recipient domain didn't resolve. Often transient; a *persistent* 21 usually means a typo'd domain. |
| 22 | Soft | Mailbox full | Will likely succeed once the user clears space. |
| 25 | Soft | Admin failure | Policy at the receiver. Read the `reason` text. |
| 40 | Soft | Generic bounce | Temporary generic failure. |
| 70 | Soft | Transient failure | Retry will likely succeed. |

> **Unverified:** the Lettr product docs list a class `100` (Relay Denied, hard) that
> does not appear anywhere in the implementation, and omit 53/54/90 which do. The
> table above follows the implementation. If you hit a `100` in the wild, treat it as
> hard and flag it — the two sources have not been reconciled.

For uncommon classes, read the `reason` string returned with the event — it's the receiver's verbatim response and usually tells you exactly what to fix.

## Decision shortcut

- **One recipient bouncing class 10/30**: bad address. Remove it.
- **Multiple recipients bouncing class 50/51/52**: a *sender* problem, not a list problem. Check domain auth (`dns-failures.md`), reputation, and content. Removing these contacts fixes nothing and loses valid addresses.
- **Class 22**: leave it; transient.
- **`policy_rejection`**: the send never left Lettr. Almost always: `from` address on an unverified domain, or recipient on the suppression list. Check the team's verified domains and the `reason` field.

## When `delivery` is the latest event but the user "didn't receive"

Lettr's job ends when the receiving server accepts the message. After that:

1. Ask the user to check spam/junk.
2. Check engagement events — if `open` fired, they did receive it.
3. If still missing, the message is filtered inside the receiver. The user (or their IT) needs to whitelist the sending domain.
