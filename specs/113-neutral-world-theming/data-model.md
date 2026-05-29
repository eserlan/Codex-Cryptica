# Data Model: Neutral App Chrome and World Theming

## AppAppearance

Represents the global workspace appearance for app chrome.

| Field | Type | Description |
| --- | --- | --- |
| `id` | `"neutral-light" \| "neutral-dark" \| "system"` | Stored app appearance choice. |
| `resolvedMode` | `"light" \| "dark"` | Runtime mode after resolving `system`. Not persisted as the user's choice. |
| `name` | `string` | User-facing label, for example "Light", "Dark", or "System". |
| `tokens` | `AppAppearanceTokens` | Neutral color and typography values for chrome. |

### Validation Rules

- Unknown appearance ids fall back to `system`.
- `system` must resolve from device preference without mutating the stored id.
- App appearance tokens must not define genre texture.

## AppAppearanceTokens

Neutral token set for app chrome.

| Field | Type | Description |
| --- | --- | --- |
| `background` | `string` | App document/chrome background. |
| `surface` | `string` | Header, sidebars, modal shells, search, and settings surfaces. |
| `text` | `string` | Primary chrome text. |
| `mutedText` | `string` | Secondary chrome text. |
| `border` | `string` | Low-emphasis chrome dividers. |
| `accent` | `string` | Restrained product accent, not genre-specific. |
| `fontHeader` | `string` | Neutral heading/display family. |
| `fontBody` | `string` | Neutral body/control family. |
| `borderRadius` | `string` | Chrome edge treatment. |

## WorldTheme

Existing `StylingTemplate` concept, scoped to world/canvas surfaces.

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Theme id such as `workspace`, `fantasy`, `scifi`, `modern`, or `horror`. |
| `tokens` | `ThemeTokens` | World/canvas colors, typography, texture, and state tokens. |
| `graph` | `GraphStyleConfig` | Graph node and edge style configuration. |
| `jargon` | `JargonMap?` | Genre vocabulary merged with defaults for world-level labels. |

### Validation Rules

- Unknown world theme ids fall back to the dedicated neutral `workspace` world theme without overwriting stored data.
- Texture may be present on world themes, but must only apply to world surfaces.
- Existing saved world theme ids remain valid.

## Neutral Workspace World Theme

The default world theme for worlds without saved theme data is a new dedicated theme with id `workspace`.

### Validation Rules

- `workspace` must be distinct from the existing `modern` theme.
- `workspace` should avoid genre-specific texture, jargon, and mood so it can serve as a quiet default for any world.
- `workspace` may still define world-surface accents, graph styling, and typography defaults where needed, but those choices must remain neutral and compatible with both neutral light and neutral dark app appearances.

## ThemePreference

Persisted app/world preference state.

| Field | Scope | Storage | Description |
| --- | --- | --- | --- |
| `appAppearanceId` | Global browser | `localStorage` or settings storage | Neutral app appearance selection. |
| `worldThemeId` | Per vault | Existing IndexedDB/OPFS theme config | Selected world theme for the active vault. |
| `previewWorldThemeId` | Runtime only | Not persisted | Temporary hover/preview world theme. |

### State Transitions

```text
No saved app appearance -> system -> user selects neutral-light/dark/system -> save global preference
No saved world theme -> workspace world theme -> user selects genre theme -> save per-vault preference
Preview world theme -> mouse leaves/cancel -> restore saved world theme
Preview world theme -> select/save -> persist as world theme
```

## TypographyLayer

Defines the role of fonts across the three-layer model.

| Layer | Owner | Rules |
| --- | --- | --- |
| App chrome | App appearance | Neutral, readable, stable across world themes. |
| World mood surfaces | World theme | May use genre heading/display voice for world headers, hero surfaces, graph labels, and accents. |
| Authored content | User content surface | Must remain comfortable for long-form reading and not be forced into decorative display styling. |

## AppChromeSurface

Global tool surfaces that must not adopt world texture or genre palette.

Examples: app header, activity bar, footer, search, settings, command palette, notifications, modal shells, app-level sidebar shells.

### Validation Rules

- Must use app appearance tokens.
- Must not use world texture overlays.
- Must preserve accessible contrast in neutral light, neutral dark, and system-resolved modes.

## WorldSurface

Content and canvas surfaces that may express the selected world theme.

Examples: front-page hero, cover surfaces, graph canvas, map/canvas world views, entity/world content surfaces, entity cards, in-world links and tab indicators.

### Validation Rules

- May use world theme texture and typography where readable.
- Light world themes must not receive dark overlay/vignette treatment that muddies the background.
- World theme changes must not mutate app appearance.

## Migration Rules

- Existing stored theme ids become `worldThemeId`.
- Existing users keep their saved genre theme as the active world theme.
- New users with no saved preferences receive neutral app appearance behavior and the `workspace` world theme.
- No destructive migration is allowed; invalid values are ignored at read time rather than overwritten unless the user saves a new choice.
