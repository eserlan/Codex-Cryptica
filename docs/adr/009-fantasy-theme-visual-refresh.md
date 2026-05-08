# Fantasy Theme Visual Refresh

- Status: accepted
- Deciders: Espen
- Date: 2026-04-12

## Context and Problem Statement

The fantasy theme ("Ancient Parchment") was functional but visually flat compared to other themes — particularly cyberpunk ("Neon Night"), which the project considers a high-water mark for theme distinctiveness. The key issues were:

1. **No glow effect** — every other "character" theme (cyberpunk, horror) has a `--theme-glow` that gives UI elements energy. Fantasy had `none`.
2. **Muted gold accent** — `#b08b57` reads as aged bronze, not gold. It was too close to the background palette to stand out.
3. **Weak primary** — `#6f4a2a` (warm brown) lacked contrast against the parchment background, making interactive elements feel soft and indistinct.
4. **Faint borders** — `rgba(111, 74, 42, 0.34)` was too transparent to frame UI elements effectively.
5. **Low panel layering** — surface (`#f2e3c5`) and background (`#fdf6e3`) were too similar, making the depth of the layout feel flat.

The goal was to make the theme more distinctive and "popping" while keeping it grounded — no neon, no drastic hue shifts, just a richer, more deliberate version of the same earthy palette.

## Decision Outcome

Chosen option: **Saturate and deepen within the existing palette**, because it achieves visual punch without breaking the thematic identity. All changes are within the warm brown/gold/parchment family.

### Changes Made

#### `packages/schema/src/theme.ts`

| Token                                                        | Before                      | After                              | Reason                                              |
| ------------------------------------------------------------ | --------------------------- | ---------------------------------- | --------------------------------------------------- |
| `primary`                                                    | `#6f4a2a` (Warm Brown)      | `#5e3018` (Rich Mahogany)          | Deeper, more contrast against parchment             |
| `accent`                                                     | `#b08b57` (Soft Gold)       | `#c8973a` (Jeweller's Gold)        | More saturated — reads as gold, not bronze          |
| `surface`                                                    | `#f2e3c5` (Warm Aged Paper) | `#ead4a8` (Aged Vellum)            | Meaningfully darker than background for panel depth |
| `border`                                                     | `rgba(111, 74, 42, 0.34)`   | `rgba(94, 48, 24, 0.52)`           | Stronger opacity + updated to match richer primary  |
| `iconActive`                                                 | `#5c3a20`                   | `#5e3018`                          | Aligned to new primary                              |
| `focus`                                                      | `#b08b57`                   | `#c8973a`                          | Aligned to new accent gold                          |
| `panelFill` / `panelMuted`                                   | blended from old surface    | blended from new surface `#ead4a8` | Consistent with surface change                      |
| `selectedBg` / `selectedBorder` / `actionBg` / `actionHover` | blended from old primary    | blended from new primary `#5e3018` | Consistent with primary change                      |
| `focusBg` / `focusBorder`                                    | blended from old accent     | blended from new accent `#c8973a`  | Consistent with accent change                       |
| Graph `edgeColor`                                            | `#5F4B3B` (Sepia Ink)       | `#6b3820` (Deep Mahogany)          | Complement to richer primary                        |

#### `apps/web/src/lib/stores/theme.svelte.ts`

Added fantasy to the theme-specific glow block:

```typescript
// Warm candlelight/arcane glow using the gold accent — evokes magic without neon
if (theme.id === "fantasy") glow = `0 0 14px ${tokens.accent}44`;
```

This applies a `14px` warm gold glow (at ~26% opacity) to: tooltips, notification toasts, zen mode modal, timeline filter bar, and timeline entries — the same components that receive cyberpunk's neon glow. The effect reads as candlelight or arcane shimmer rather than neon.

## Pros and Cons

### Saturate and deepen within palette

- **Good**, because no thematic identity is lost — still parchment, brown, and gold.
- **Good**, because the glow addresses the single biggest gap vs. cyberpunk (energy/life in UI elements).
- **Good**, because panel layering now works as intended (surface is visually distinct from background).
- **Bad**, because slightly higher contrast may surface text/icon colors that were previously hidden by low contrast — worth monitoring.

### Alternative considered: Shift to a dark parchment (dark background)

Rejected. A dark-background variant would read more like "gothic" than "ancient parchment." The light background is part of what makes this theme legible and grounded.
