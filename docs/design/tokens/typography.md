# Design Tokens: Typography and Spacing

## Typography

Codex-Cryptica uses a semantic typography system that separates typographic roles from theme-specific font choices. Typography guidance should stay theme agnostic, while the active theme decides which font families and tone those roles resolve to.

### Fonts

- **Header Font (`--font-header`)**: Semantic functional-heading font token used for card titles, section/output headings, sidebar headings, and other small or repeated headings.
- **Display Font (`--font-display`)**: Expressive hero font token used for major page titles and intentional high-emphasis moments. Falls back to `--font-header` when the active theme defines no display face.
- **Body Font (`--font-body`)**: Semantic body font token used for all primary text, inputs, and buttons.

### Scale (Utility Classes)

We use standard Tailwind typography scales with semantic overrides for prose:

- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)

### Mobile Typography Scale (#3718)

Prefer these semantic tokens over `text-[10px]`/`text-[11px]`/`text-xs` for UI text. They grow below the `sm` breakpoint (640px) and keep today's sizes above it.

| Utility        | Desktop/tablet | Mobile | Use for                                   |
| -------------- | -------------- | ------ | ----------------------------------------- |
| `text-nano`    | 9px            | 13px   | Legacy 8–9px labels (prefer `text-micro`) |
| `text-micro`   | 10px           | 13px   | Tiny uppercase labels, badges             |
| `text-meta`    | 11px           | 13px   | Chips, tags, source labels, metadata      |
| `text-helper`  | 12px           | 14px   | Helper/privacy copy, captions, tooltips   |
| `text-body-ui` | 12px           | 16px   | Panel/answer body text, compact inputs    |

- `text-xs` itself resolves to the helper size (12px → 14px on mobile).
- Run `bun scripts/mobile-type-codemod.mjs --write` to migrate stray `text-[8..11px]` uses.
- Inputs, textareas and selects are forced to at least 16px below `sm` by a global rule in `app.css`.
- Use `touch-target` (44×44px minimum on mobile only) on icon buttons, chips and small controls.
- Do not add new `text-[Npx]` below 12px; `app.css.test.ts` guards the token contract.

### Themed Typography

Font families are not hardcoded but are mapped to theme-specific variables. This allows the aesthetic to shift across themes without requiring component-level typography changes.

- **Header Font Mapping**: `--font-header` maps to `--font-header-val` defined in the active theme.
- **Display Font Mapping**: `--font-display` maps to `--font-display-val` (falling back to `--font-header-val`) defined in the active theme.
- **Body Font Mapping**: `--font-body` maps to `--font-body-val` defined in the active theme.
- **Supers hierarchy (#3145)**: the Superhero theme resolves `--font-header-val` to Oswald (readable bold condensed for functional headings) and `--font-display-val` to Bangers (hero titles only). The first-paint bootstrap in `app.html` mirrors these stacks so headings do not flash/swap before hydration.

### Formatting

- **Prose**: Content is styled using custom `.prose` theme variables and rules defined in `apps/web/src/app.css`.
- **Code**: Inline code within prose uses the same custom theme-aware styling, including a slight background tint and border.

### Applying the Current Theme

The current default theme is Fantasy. That theme should be expressed by assigning Fantasy-appropriate font values to the semantic typography tokens rather than hardcoding Fantasy fonts into component rules.

For the current Fantasy theme, that means:

1.  **Header Font**: `--font-header` currently resolves to `Alegreya`, serif.
2.  **Body Font**: `--font-body` currently resolves to `Alegreya`, serif.
3.  **Tone**: The current Fantasy theme uses serif typography to support its present visual direction, but the typography roles remain reusable for future themes.

## Spacing

We adhere to the standard Tailwind 4 spacing scale (multiples of 0.25rem / 4px).

### Layout Constants

- **Header Height**: `65px` (`--header-height`)
- **Border Radius**: Default `2px` (`--theme-border-radius`)

### Common Patterns

- **Standard Padding**: `p-4` (1rem) for container interiors.
- **Section Spacing**: `space-y-6` (1.5rem) between distinct content blocks.
- **Form Gaps**: `gap-4` (1rem) between input elements.
