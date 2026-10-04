# Data Model: Shareable Generated Entities

## `SharedResultSnapshot`

An immutable, public, text-only projection. It deliberately is not `Entity` and not a vault bundle.

| Field           | Source                  | Validation / exposure                           |
| --------------- | ----------------------- | ----------------------------------------------- |
| `schemaVersion` | constant                | `1`                                             |
| `id`            | Worker-generated UUID   | public opaque identifier                        |
| `createdAt`     | Worker                  | ISO datetime                                    |
| `title`         | entity                  | trimmed, non-empty, bounded text                |
| `type`          | entity                  | bounded text; shown as origin context           |
| `kind`          | entity                  | optional bounded text                           |
| `labels`        | entity                  | bounded, de-duplicated text list                |
| `content`       | entity                  | Markdown text, bounded; no raw HTML output path |
| `lore`          | entity                  | optional Markdown text, bounded                 |
| `generatorSlug` | known generator adapter | optional, allowlisted route target only         |
| `generatorName` | known generator adapter | optional display text                           |

Excluded fields include entity id, vault id/name, aliases, connections, dates, image paths, stat sheets, sound bites, prompts, source context, author identity, and all unknown fields.

## `LocalShareCredential`

| Field              | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| `shareId`          | maps a public snapshot to its creator browser                     |
| `revocationSecret` | opaque browser-only random secret, never rendered or put in a URL |
| `createdAt`        | enables local management display                                  |
| `title`            | local-only management context                                     |

The Worker receives only `SHA-256(revocationSecret)` and stores that digest as protected object metadata. The browser removes the complete record after successful revocation.

## Lifecycle

```text
local entity/session result
  → Share clicked
  → consent confirmed
  → strict projection + local secret
  → immutable R2 object + local credential
  → public reader /share/:id
  → (creator only) credential-authenticated delete
  → R2 object unavailable + local credential removed
```
