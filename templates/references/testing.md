# Preview and test a template

Two operations cover the loop:

| Operation | Use for |
|---|---|
| Fetch the rendered HTML for the active version | Fast structural check. Returns the rendered HTML with merge tags still in place (or with default values, depending on the version). Good for "did the layout change?" reviews. |
| Send a real email with the template slug | Real client rendering. Use a recipient the user controls. This catches client-specific bugs (Outlook, Gmail dark mode, etc.) that the rendered-HTML check cannot. |

Always test in this order — render fast first to fail on syntax/structure, then a real send.

## Test send recipe

Send with:

- `from`: an address on a verified sending domain
- `to`: the user's own inbox
- `template_slug`: the slug
- `substitution_data`: realistic test values

After the call returns a `request_id`:

1. Wait a few seconds.
2. Fetch the event timeline for that `request_id` to confirm `delivery` (or surface the bounce).
3. Tell the user to open their inbox.

## Test data tips

- Use **realistic** values for substitution data. Empty strings reveal layout collapse; long strings reveal overflow. Send at least one of each.
- For loops (`{{#each items}}`), test with 0, 1, and many items.
- For conditionals, test both branches.

## Schedule a delayed send if the test path needs lag

The scheduled-send endpoint accepts a future timestamp 5 min – 3 days out. Useful when verifying a drip flow without waiting for the real trigger.

## Don't open-loop

If a real send is failing repeatedly, switch to `diagnose/` — the bounce or rejection event will tell you why. Don't keep retrying blindly.
