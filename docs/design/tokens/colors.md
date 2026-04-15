# Design Tokens: Colors

Codex-Cryptica uses a semantic color system powered by Tailwind 4 `@theme` variables. This ensures that components remain theme-aware and consistent across the application.

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

**ALWAYS** prefer semantic variables over hex codes or hardcoded Tailwind colors (e.g., `text-amber-500`). This ensures the UI adapts correctly when the theme shifts from "Fantasy" to other potential modes.
