# Theme Guide

How to add a new world theme to Codex Cryptica.

---

## Overview

Each theme is a `StylingTemplate` object with four parts:

| Field                       | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `tokens`                    | Color palette, fonts, border radius, optional texture |
| `graph`                     | Node/edge visual style                                |
| `jargon`                    | UI label overrides (see [Jargon keys](#jargon-keys))  |
| `id`, `name`, `description` | Identity and selector display                         |

Every theme ships as **two variants**: a primary mode and an alternate mode. Which is "primary" depends on the theme's natural register:

- **Dark-primary themes** (scifi, cyberpunk, horror, fallout, starwars, startrek, lancer): the dark variant lives in `THEMES` (no suffix), the light variant is a named export with `_light` suffix.
- **Light-primary themes** (workspace, fantasy, modern): the light variant lives in `THEMES`, the dark variant is a named export with `_dark` suffix.

The `ThemeStore` in `apps/web/src/lib/stores/theme.svelte.ts` picks the right variant at runtime based on the user's app appearance setting (light/dark/system).

---

## Step-by-step: adding a theme

### 1. Design the palette

Think in terms of **contrast role**, not just color:

| Token          | Role                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `background`   | Page/canvas fill                                                                                |
| `surface`      | Card, panel, modal fill (slightly lighter/darker than background)                               |
| `primary`      | Interactive elements, links, active states                                                      |
| `secondary`    | Muted interactive, placeholder text                                                             |
| `text`         | Body copy                                                                                       |
| `border`       | Dividers, outlines — use `rgba()` with low opacity for subtlety                                 |
| `accent`       | Highlights, badges, graph node focus, oracle/AI elements                                        |
| `fontHeader`   | Heading font — use a Google Font or system stack                                                |
| `fontBody`     | Body font                                                                                       |
| `borderRadius` | Optional. Defaults: `2px` (terminal/gothic), `8px` (workspace), `12px` (modern), `0px` (horror) |
| `texture`      | Optional SVG texture file in `apps/web/static/themes/`                                          |

Optional fine-grained tokens (all fall back to computed values if omitted):

| Token            | Falls back to                   |
| ---------------- | ------------------------------- |
| `titleInk`       | `text`                          |
| `sectionTitle`   | `secondary`                     |
| `metaText`       | `secondary`                     |
| `iconDefault`    | `secondary`                     |
| `iconActive`     | `primary`                       |
| `focus`          | `accent`                        |
| `panelFill`      | `surface`                       |
| `panelMuted`     | mix of `surface` + `background` |
| `selectedBg`     | mix of `primary` + `background` |
| `selectedBorder` | mix of `primary` + `background` |
| `focusBg`        | mix of `accent` + `background`  |
| `focusBorder`    | mix of `accent` + `background`  |
| `actionBg`       | `primary`                       |
| `actionHover`    | `secondary`                     |
| `actionText`     | `background`                    |

**Avoid excessive glow.** Glow is only applied automatically for `cyberpunk`, `horror`, and `fantasy` (see `applyTheme` in `theme.svelte.ts`). For a new theme that should glow, add a case there.

### 2. Pick a graph style

```ts
graph: {
  nodeShape: "ellipse",       // "ellipse" works for almost everything
  edgeStyle: "solid",         // "solid" | "dashed" | "dotted"
  nodeBorderWidth: 1,         // 1–2; use 2 for gothic/parchment/heavy aesthetics
  edgeWidth: 1,               // 1–2
  edgeColor: "#1a3a4a",       // Muted version of primary or border color
}
```

### 3. Write the jargon

Override only what fits the theme. Anything not specified falls back to `DEFAULT_JARGON`. See [Jargon keys](#jargon-keys) for the full list.

### 4. Add the primary variant to `THEMES`

In `packages/schema/src/theme.ts`, add your theme to the `THEMES` object:

```ts
export const THEMES = {
  // ... existing themes ...
  mytheme: {
    id: "mytheme",
    name: "Display Name",
    description: "One sentence: genre, vibe, use case.",
    tokens: { ... },
    graph: { ... },
    jargon: { ... },
  },
} as const satisfies Record<string, StylingTemplate>;
```

### 5. Add the alternate variant

Export it as a named constant after `STARTREK_LIGHT`/`LANCER_LIGHT`:

```ts
// Dark-primary theme → add a light variant
export const MYTHEME_LIGHT: StylingTemplate = {
  id: "mytheme_light",
  name: "Alternate Name",
  description: "Light-mode variant description.",
  tokens: { ... },
  graph: { ... },
  jargon: THEMES.mytheme.jargon,  // Share jargon with primary
};
```

The `id` must be `{themekey}_light` (or `_dark` for light-primary themes). The jargon should be identical between variants — share via reference.

### 6. Wire up the alternate variant in `ThemeStore`

In `apps/web/src/lib/stores/theme.svelte.ts`:

1. Import the new variant constant.
2. Add a `case "mytheme":` to the `activeTheme` derived switch, returning the variant for the appropriate appearance mode.

### 7. Add art direction

In `packages/schema/src/art-direction.ts`, add an entry to `THEME_ART_DIRECTION_DEFAULTS`. This controls the AI image generation style when the theme is active:

```ts
const mytheme: ArtDirectionTemplate = {
  id: "theme.mytheme",
  label: "My Theme Default",
  source: "theme-default",
  template: "{subject}. [Art style description — medium, palette, mood, texture].",
};

// Then in THEME_ART_DIRECTION_DEFAULTS:
mytheme: {
  id: "theme.mytheme",
  label: "My Theme Default",
  source: "theme-default",
  template: mytheme.template,
},
```

If the theme has common name aliases (e.g. `"my-theme"`, `"my_theme"`), add them to `THEME_ALIASES` so art direction resolves correctly.

### 8. Update tests

In `packages/schema/src/theme.test.ts`, add the theme pair to the counterparts record in the "defines light and dark counterparts" test:

```ts
mytheme: { light: MYTHEME_LIGHT, dark: THEMES.mytheme },
```

Run tests: `cd packages/schema && bun run test`

---

## Jargon keys

All keys are optional — unset keys fall back to `DEFAULT_JARGON`.

| Key                  | Default                 | Where it appears            |
| -------------------- | ----------------------- | --------------------------- |
| `vault`              | `"Vault"`               | Vault name, empty states    |
| `entity`             | `"Note"`                | Entity labels (singular)    |
| `entity_plural`      | `"Notes"`               | Entity labels (plural)      |
| `save`               | `"Save"`                | Save button                 |
| `delete`             | `"Delete"`              | Delete confirmation         |
| `new`                | `"New"`                 | Create action               |
| `syncing`            | `"Syncing"`             | Sync status                 |
| `search`             | `"Search"`              | Search input placeholder    |
| `lore_header`        | `"Detailed Records"`    | Lore section heading        |
| `lore_secrets`       | `"Deep Lore & Secrets"` | Secrets section heading     |
| `chronicle_header`   | `"Chronicle"`           | Chronicle/timeline heading  |
| `connections_header` | `"Connections"`         | Relations section heading   |
| `tab_status`         | `"Status"`              | Entity detail status tab    |
| `tab_lore`           | `"Lore & Notes"`        | Entity detail lore tab      |
| `tab_inventory`      | `"Inventory"`           | Entity detail inventory tab |
| `blog_entry`         | `"Archive Entry"`       | Blog/journal entry label    |
| `blog_action`        | `"Read Full Entry"`     | Blog read-more action       |
| `graph_loading`      | `"Initializing..."`     | Graph loading state         |

---

## Existing themes reference

| Theme key     | Primary mode         | Alternate                                      | Vibe                   |
| ------------- | -------------------- | ---------------------------------------------- | ---------------------- |
| `workspace`   | Light (`workspace`)  | Dark (`workspace_dark`)                        | Neutral warm gray      |
| `fantasy`     | Light (`fantasy`)    | Dark (`fantasy_dark` / Candlelit Tome)         | Parchment, inked serif |
| `modern`      | Light (`modern`)     | Dark (`modern_dark` / After Hours)             | Clean sans-serif       |
| `scifi`       | Dark (`scifi`)       | Light (`scifi_light` / Clean Room)             | Green terminal         |
| `cyberpunk`   | Dark (`cyberpunk`)   | Light (`cyberpunk_light` / Vapor Dawn)         | Pink/cyan neon         |
| `apocalyptic` | Dark (`apocalyptic`) | Light (`apocalyptic_light` / Sun-Bleached)     | Rust/orange wasteland  |
| `horror`      | Dark (`horror`)      | Light (`horror_light` / Autopsy Report)        | Crimson/black gothic   |
| `fallout`     | Dark (`fallout`)     | Light (`fallout_light` / Vault-Tec Bulletin)   | Pip-Boy phosphor green |
| `starwars`    | Dark (`starwars`)    | Light (`starwars_light` / Jedi Archives)       | Space opera            |
| `startrek`    | Dark (`startrek`)    | Light (`startrek_light` / Stellar Cartography) | LCARS Okudagram        |
| `lancer`      | Dark (`lancer`)      | Light (`lancer_light` / Hangar Briefing)       | Mech/tactical terminal |

---

## Checklist

- [ ] `THEMES.{key}` added to `theme.ts`
- [ ] `{KEY}_LIGHT` (or `_DARK`) export added to `theme.ts`
- [ ] Alternate variant imported and wired in `theme.svelte.ts`
- [ ] Art direction entry added in `art-direction.ts`
- [ ] Test counterpart added in `theme.test.ts`
- [ ] Tests pass: `cd packages/schema && bun run test`
