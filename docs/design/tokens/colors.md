# Design Tokens: Colors

Codex-Cryptica uses a semantic color system powered by Tailwind 4 `@theme` variables. The token layer should stay theme agnostic so components can remain structurally stable while each active theme supplies its own visual values.

## Core Theme Variables

Use these variables for all primary UI elements:

| Variable                  | Description                 | Tailwind Class                           |
| :------------------------ | :-------------------------- | :--------------------------------------- |
| `--color-theme-bg`        | Main application background | `bg-theme-bg`                            |
| `--color-theme-surface`   | Card and panel backgrounds  | `bg-theme-surface`                       |
| `--color-theme-primary`   | Primary brand/action color  | `text-theme-primary`, `bg-theme-primary` |
| `--color-theme-secondary` | Subtle/dimmed action color  | `text-theme-secondary`                   |
| `--color-theme-accent`    | Highlight and focal points  | `text-theme-accent`, `bg-theme-accent`   |
| `--color-theme-border`    | Standard UI borders         | `border-theme-border`                    |
| `--color-theme-text`      | Primary body text color     | `text-theme-text`                        |
| `--color-theme-muted`     | Muted/de-emphasized text    | `text-theme-muted`                       |

## Feedback and Status

| Type        | Purpose                           | Variable                |
| :---------- | :-------------------------------- | :---------------------- |
| **Danger**  | Error states, destructive actions | `--color-theme-danger`  |
| **Warning** | Cautionary states, alerts         | `--color-theme-warning` |

## Domain Specifics

- **Oracle**: Uses `--color-oracle-*` variants (Primary, Dim, Dark).
- **Timeline**: Uses `--color-timeline-*` variants.
- **Labels**: Tailwind default colors (e.g., `amber`, `blue`, `red`) are mapped to theme-aware versions using `color-mix` in `app.css`.

## Implementation Guideline

Prefer semantic variables over hex codes or hardcoded Tailwind colors (e.g., `text-amber-500`) whenever possible. Use hardcoded Tailwind colors only for documented exceptions, such as label mappings and established destructive-action patterns (e.g., `bg-red-600`).

## Applying the Current Theme

The current default theme is Fantasy. That theme should be implemented by assigning Fantasy-specific values to the semantic tokens above rather than by bypassing the token system in component markup.

For the current Fantasy theme, that means:

1.  **Background and Surfaces**: `--color-theme-bg` and `--color-theme-surface` map to the current Fantasy base materials.
2.  **Primary and Accent**: `--color-theme-primary`, `--color-theme-secondary`, and `--color-theme-accent` map to the current Fantasy action and highlight palette.
3.  **Borders and Text**: `--color-theme-border`, `--color-theme-text`, and `--color-theme-muted` map to the current Fantasy contrast system.
4.  **Future Themes**: New themes should override the same semantic token set instead of introducing component-specific color exceptions.
