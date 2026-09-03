# Theme Guide

How to add a new world theme to Codex Cryptica.

> A theme is more than a colour palette. If it has a public generator hub, it
> must provide its own generator choices and generated vocabulary for every
> generator advertised by that hub. Never present a new theme while silently
> selecting a different genre's data as its default.

---

## Overview

Each visual theme is a `StylingTemplate` object with four parts:

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

## Decide the scope before writing code

Write down which of these the new theme includes. A visual-only theme stops at
the first section below. A public generator theme must complete every relevant
section.

| Scope                | What it includes                                                                  | What it must not imply                         |
| -------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| Visual theme         | App palette, graph treatment, jargon, art direction, and both appearance variants | A generator genre or public hub                |
| Generator genre      | Dedicated selectable options and local-generation vocabulary                      | A public hub unless one is intentionally added |
| Public generator hub | A landing page that advertises a selected set of generators under the theme       | Support from a nearest or similar genre        |

For a public hub, list its generator cards first. That list is the support
contract: every listed card needs a dedicated theme entry or must be removed
from the hub. Do not use a related genre as an undocumented fallback. If a
fallback is genuinely intended, document it in the hub copy and in the mapping
table, then add a test for it.

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

**Entity-type node colours are not yours to pick.** A theme never lists a colour
per entity type. `packages/schema/src/entity-palette.ts` derives them from the
tokens above — the category's own colour supplies the hue, while saturation and
lightness come from `surface`, `background`, `primary`, and `accent`, so a new
theme gets a muted, coherent set of type tones for free. It also holds node
rings and node icons at 3:1 (see the
[accessibility contract](./accessibility-contract.md)). Give the theme a
`primary` and `accent` you are happy to see on a node icon, and the rest
follows.

### 3. Write the jargon

Override only what fits the theme. Anything not specified falls back to `DEFAULT_JARGON`. See [Jargon keys](#jargon-keys) for the full list.

### 4. Add the primary variant to `THEMES`

In `packages/schema/src/theme-templates.ts`, add your theme to the `THEMES` object:

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

In `packages/schema/src/art-direction-catalogue.ts`, add an `ArtTheme` entry to
`ART_THEMES`. It controls the AI image-generation direction for the active
theme. Define its medium, palette, lighting, craft and terrain materials, and
the name-free fallback. The catalogue derives `THEME_ALIASES` from the entry's
`aliases` field, so include common forms such as `"my-theme"` and `"my_theme"`
there instead of maintaining a separate alias map.

### 8. Register a generator genre (when the theme has generators)

Use one canonical display label, such as `"Cosmic Horror"`, everywhere the
same theme is selectable. Add its own option arrays and local-generation
tables—do not reuse a neighbouring genre's arrays just because the moods
overlap.

At minimum, inspect the generator configuration for every card the proposed
hub will show:

| Hub card                                 | Generator data to review                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| NPC                                      | `public-npc-constants.ts` and the local prompt voice/data in `public-npc.ts`                                                 |
| Faction                                  | `public-faction-constants.ts` and local faction prompt data                                                                  |
| Quest                                    | `public-quest.ts`: genre mapping, tone, scope, locations, threats, rewards, and any theme-specific twists                    |
| Name                                     | `public-names-constants.ts` and the form's culture/default mapping                                                           |
| Settlement                               | `public-settlement-constants.ts`: size, environment, function, tone, tension, authority, locations, factions, and name parts |
| Dungeon                                  | A new dedicated file under `dungeon/genres/`, registered in `dungeon/genres/index.ts`                                        |
| Adventure                                | A new dedicated file under `adventure/genres/`, registered in `adventure/genres/index.ts`                                    |
| Social hub, nation, news sheet, language | The corresponding public generator's genres, option lists, and prompt hints                                                  |

The selector must show the new label, and arriving from its hub must select it
by default. An unfamiliar label that falls through to `Fantasy`, `Horror`, or
another established genre is a defect, even if generation still succeeds.

### 9. Add or extend the public hub (when promised)

1. Add the hub configuration in
   `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.svelte`.
   Make each card's copy truthful to the generator support it has.
2. Add the hub slug, generator label, visible hub label, stored visual theme id,
   and social-hub mapping (when applicable) in
   `apps/web/src/lib/components/seo/generator-theme-maps.ts`.
3. Add the visual theme mapping in
   `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`, so pages opened
   from the hub preserve the theme rather than defaulting to Workspace.
4. Add the hub to public discovery surfaces only after its listed generator
   contract is complete.

### 10. Update tests

In `packages/schema/src/theme.test.ts`, add the theme pair to the counterparts record in the "defines light and dark counterparts" test:

```ts
mytheme: { light: MYTHEME_LIGHT, dark: THEMES.mytheme },
```

Run tests: `cd packages/schema && bun run test`

For generator themes, add focused tests that prove the label is selectable and
that every displayed option comes from its own data. Include a negative
assertion where it is meaningful: for example, the Cosmic Horror default must
not resolve to a Fantasy or Vampire/Gothic Noir table. Keep the cross-generator
coverage test current so a newly selectable theme cannot silently fall back.

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

| Theme key       | Primary mode           | Alternate                                      | Vibe                                       |
| --------------- | ---------------------- | ---------------------------------------------- | ------------------------------------------ |
| `workspace`     | Light (`workspace`)    | Dark (`workspace_dark`)                        | Neutral warm gray                          |
| `fantasy`       | Light (`fantasy`)      | Dark (`fantasy_dark` / Candlelit Tome)         | Parchment, inked serif                     |
| `modern`        | Light (`modern`)       | Dark (`modern_dark` / After Hours)             | Clean sans-serif                           |
| `scifi`         | Dark (`scifi`)         | Light (`scifi_light` / Clean Room)             | Green terminal                             |
| `cyberpunk`     | Dark (`cyberpunk`)     | Light (`cyberpunk_light` / Vapor Dawn)         | Pink/cyan neon                             |
| `apocalyptic`   | Dark (`apocalyptic`)   | Light (`apocalyptic_light` / Sun-Bleached)     | Rust/orange wasteland                      |
| `horror`        | Dark (`horror`)        | Light (`horror_light` / Autopsy Report)        | Crimson/black gothic                       |
| `cosmic_horror` | Dark (`cosmic_horror`) | Light (`cosmic_horror_light` / Field Notes)    | Sea-green field notes, impossible geometry |
| `fallout`       | Dark (`fallout`)       | Light (`fallout_light` / Vault-Tec Bulletin)   | Pip-Boy phosphor green                     |
| `starwars`      | Dark (`starwars`)      | Light (`starwars_light` / Jedi Archives)       | Space opera                                |
| `startrek`      | Dark (`startrek`)      | Light (`startrek_light` / Stellar Cartography) | LCARS Okudagram                            |
| `lancer`        | Dark (`lancer`)        | Light (`lancer_light` / Hangar Briefing)       | Mech/tactical terminal                     |

---

## Checklist

Use the detailed [Theme Creation Checklist](./THEME_CREATION_CHECKLIST.md) for
each new theme. It separates visual-only work from generator and public-hub
work, and includes the required regression tests.
