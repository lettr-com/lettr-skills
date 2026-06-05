# Detect the stack

Every Lettr skill that runs SDK code needs to know which language/framework the project uses, so it can load the right `_generated/sdk/<lang>/` reference. Check, in this order, until one matches:

| File found | `<lang>` | Notes |
|-|-|-|
| `composer.json` containing `laravel/framework` | `laravel` | Use the Laravel package, not bare PHP. |
| `composer.json` (no Laravel) | `php` | |
| `package.json` | `node` | TypeScript and JS both use this. |
| `pyproject.toml` / `requirements.txt` / `setup.py` | `python` | |
| `go.mod` | `go` | |
| `Cargo.toml` | `rust` | |
| `pom.xml` / `build.gradle` / `build.gradle.kts` | `java` | |
| none of the above | — | No official SDK for this stack. Fall back to raw HTTP against [`../_generated/api/index.md`](../_generated/api/index.md) with `Authorization: Bearer $LETTR_API_KEY`, or SMTP relay (`smtp.lettr.com:587`, STARTTLS) for simple sends. |

Notes:

- **Monorepos / mixed stacks.** If email is sent from more than one place (e.g. a Laravel API plus a Node worker), detect per send-location and load each language's reference as needed.
- **`<lang>` is stable.** The value you resolve here is the directory name under `_generated/sdk/`. Confirm the file exists before reading it; if a language is missing a topic file it will be a short pointer to its combined guide.
