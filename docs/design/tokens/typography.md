# Design Tokens: Typography and Spacing

## Typography

Codex-Cryptica uses a refined serif-first typography system to maintain its thematic "fantasy" and "mystical" aesthetic.

### Fonts

- **Header Font (`--font-header`)**: `Alegreya`, serif. Used for all headings (H1-H6).
- **Body Font (`--font-body`)**: `Alegreya`, serif. Used for all primary text, inputs, and buttons.

### Scale (Utility Classes)

We use standard Tailwind typography scales with semantic overrides for prose:

- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)

### Formatting

- **Prose**: Content is styled using the `@tailwindcss/typography` plugin with custom theme mapping in `app.css`.
- **Code**: Inline code uses a high-contrast theme-aware style with a slight background tint and border.

## Spacing

We adhere to the standard Tailwind 4 spacing scale (multiples of 0.25rem / 4px).

### Layout Constants

- **Header Height**: `65px` (`--header-height`)
- **Border Radius**: Default `2px` (`--theme-border-radius`)

### Common Patterns

- **Standard Padding**: `p-4` (1rem) for container interiors.
- **Section Spacing**: `space-y-6` (1.5rem) between distinct content blocks.
- **Form Gaps**: `gap-4` (1rem) between input elements.
