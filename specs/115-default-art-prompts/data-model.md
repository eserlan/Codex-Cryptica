# Data Model: Default Art Prompts

## ArtDirectionTemplate

Prompt template that guides image style or composition.

| Field      | Type                 | Description                                                                      |
| ---------- | -------------------- | -------------------------------------------------------------------------------- |
| `id`       | `string`             | Stable id for shipped defaults, such as `category.character` or `theme.fantasy`. |
| `label`    | `string`             | Human-readable name for diagnostics/help.                                        |
| `template` | `string`             | Prompt text. May include `{subject}`.                                            |
| `source`   | `ArtDirectionSource` | Where this template came from.                                                   |

### Validation Rules

- Empty or whitespace-only templates are invalid.
- Shipped templates must avoid named living-artist imitation.
- If `{subject}` is missing, the resolver must still include the subject in the final prompt.
- Templates should stay concise and descriptive.

## ArtDirectionSource

Identifies the fallback level used.

Allowed values:

```text
entity-context
user-authored-context
category-default
theme-default
global-default
```

## DrawRequestContext

Input to the resolver.

| Field                      | Type                                                             | Description                                                           |
| -------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `subject`                  | `string`                                                         | User-facing subject to draw.                                          |
| `entityId`                 | `string?`                                                        | Optional entity id when the draw request maps to a known entity.      |
| `entityTitle`              | `string?`                                                        | Entity title when available.                                          |
| `categoryId`               | `string?`                                                        | Stable category id from entity metadata or command parsing.           |
| `categoryLabel`            | `string?`                                                        | Display category label when available.                                |
| `themeId`                  | `string?`                                                        | Active world theme id.                                                |
| `surface`                  | `"entity" \| "zen" \| "graph" \| "chat" \| "cover" \| "command"` | Entry point or surface requesting the image.                          |
| `entityArtDirection`       | `string?`                                                        | Entity-specific art direction when already available in context.      |
| `userAuthoredArtDirection` | `string?`                                                        | Relevant note/entity content selected by existing context mechanisms. |

### Validation Rules

- `subject` must be trimmed and non-empty before image generation.
- `entityId` is optional; non-entity cover requests still resolve with vault/theme/global context.
- `categoryId` should come from entity metadata when available; command category hints fill gaps only.
- `userAuthoredArtDirection` must be skipped if empty.

## ResolvedArtDirection

Output from the resolver.

| Field        | Type                 | Description                                  |
| ------------ | -------------------- | -------------------------------------------- |
| `prompt`     | `string`             | Final prompt passed to image generation.     |
| `source`     | `ArtDirectionSource` | Fallback level used.                         |
| `templateId` | `string?`            | Shipped/default template id when applicable. |
| `subject`    | `string`             | Subject used for insertion.                  |
| `categoryId` | `string?`            | Category context used, if any.               |
| `themeId`    | `string?`            | Theme context used, if any.                  |

### Validation Rules

- `prompt` must always include the subject.
- Resolver metadata should be available for tests and troubleshooting.
- Empty higher-priority values must not block lower-priority defaults.

## CategoryArtDirectionDefault

Shipped default for category composition.

| Field        | Type                   | Description                                                          |
| ------------ | ---------------------- | -------------------------------------------------------------------- |
| `categoryId` | `string`               | Stable category-like id, such as `character`, `location`, or `item`. |
| `template`   | `ArtDirectionTemplate` | Composition-focused default.                                         |

### Validation Rules

- Category defaults should focus on framing and useful visual structure.
- Defaults should be reusable across themes; theme defaults add mood/materials.
- Real category ids should be used where the vault has stable category metadata.

## ThemeArtDirectionDefault

Shipped default for world/theme mood.

| Field      | Type                   | Description                                                    |
| ---------- | ---------------------- | -------------------------------------------------------------- |
| `themeId`  | `string`               | Theme id such as `fantasy`, `scifi`, `cyberpunk`, or `modern`. |
| `template` | `ArtDirectionTemplate` | Mood/style-focused default.                                    |

### Validation Rules

- Theme defaults must avoid living-artist imitation.
- Missing theme defaults fall back to global default.
- Theme defaults must not override relevant user-authored art direction context.

## GlobalArtDirectionDefault

Final fallback used when no more specific art direction exists.

### Validation Rules

- Must be safe, concise, descriptive, and broadly useful.
- Must include or allow subject insertion.

## Integration Surfaces

Existing image generation entry points that must provide `DrawRequestContext`:

| Surface            | Context expectation                                                  |
| ------------------ | -------------------------------------------------------------------- |
| `/draw` command    | Subject, command category hint, matched entity metadata if resolved. |
| Entity sidebar     | Entity id, title, category, active theme.                            |
| Zen mode           | Active entity id, title, category, active theme.                     |
| Graph context menu | Selected node entity id, title, category, active theme.              |
| Front page cover   | World/vault subject, cover surface, active theme.                    |
| Oracle chat draw   | Message subject plus entity/category context where available.        |
