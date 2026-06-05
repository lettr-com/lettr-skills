# Merge tags

Lettr templates use `{{variable}}` for variable substitution. Whatever's in `substitution_data` on the send call replaces the matching tag.

## Syntax

| Form | Renders | Notes |
|---|---|---|
| `{{name}}` | The value of `name` from `substitution_data` | Empty string if missing. |
| `{{user.name}}` | Nested access | Pass `substitution_data: { user: { name: "..." } }`. |
| `{{items[0].title}}` | Array indexing | Combine with nested objects as needed. |
| `{{#if condition}}…{{/if}}` | Conditional | `condition` must be a value in `substitution_data` (truthy → render). |
| `{{#each items}}…{{/each}}` | Loop over an array | Inside the block, `{{this}}` is the current item; nested keys work like `{{this.name}}`. |

The exact engine is documented at [docs.lettr.com/learn/templates/template-language](https://docs.lettr.com/learn/templates/template-language). Follow that page for edge cases (escaping, helpers).

## Subjects

A template stores its own subject. When sending with `template_slug`, omit `subject` to use the template's, or pass one to override.

The subject can also contain merge tags: `Welcome, {{first_name}}!`.

## Naming conventions

- Use `snake_case` for variable names (`first_name`, `order_id`). Some SDKs auto-generate DTOs from merge tags (e.g. `php artisan lettr:generate-dtos` in Laravel) — snake_case maps to PHP property names cleanly.
- Avoid spaces and dashes in tag names; the parser is permissive but the generated DTO names won't be.
- Don't put HTML inside variables. Render it from the template, pass values as plain strings.

## Verifying which tags a template expects

Fetch the merge tags for the slug. The response lists every variable referenced by the active (or specified) version. Use it as the contract between the template and the calling code.

For Laravel projects using `lettr-laravel`, run `php artisan lettr:generate-dtos` after editing a template — it regenerates the DTO so the type system catches missing variables at compile time.

## Common mistakes

- **Tag never substitutes**: the variable name in the template doesn't match what the code passes. `{{first_name}}` ≠ `firstName`.
- **Empty rendered value**: the key exists but the value is `null` or `undefined`. Most SDKs serialize those as missing.
- **Conditional always false**: in `{{#if x}}`, `x` must be truthy in the data. `0`, `""`, `false`, and missing all render the `{{else}}` branch (or nothing).
- **Loop renders nothing**: the array is empty or the variable is the wrong type. Pass a non-empty array or guard with `{{#if items}}`.
