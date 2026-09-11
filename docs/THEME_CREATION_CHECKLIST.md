# Theme Creation Checklist

Use this checklist before opening a pull request for a new theme. A checked
item means the work is applicable and complete; mark non-applicable items
`N/A` with a brief reason in the pull request.

Related guide: [Theme Guide](./THEME_GUIDE.md).

## Scope and concept

- [ ] The theme has a stable key, display label, and one-sentence description.
- [ ] The scope is explicitly marked as visual-only, generator genre, or public generator hub.
- [ ] The public hub's proposed generator cards are listed before implementation.
- [ ] Every advertised card has dedicated theme data, or the card is omitted.
- [ ] Any intentional fallback is named in the product copy, mapping, and tests; no fallback is implicit.

## Visual theme

- [ ] Primary and alternate `StylingTemplate` variants exist in `packages/schema/src/theme-templates.ts`.
- [ ] The variants use the correct `{key}_light` or `{key}_dark` naming convention and share jargon.
- [ ] The theme is selected for the matching app appearance in `apps/web/src/lib/stores/theme.svelte.ts`.
- [ ] Text, controls, focus states, borders, surfaces, and graph connections have sufficient contrast in both variants.
- [ ] The graph style, texture, typography, and jargon reinforce the genre without making ordinary app tasks harder to read.
- [ ] Art direction and aliases are registered in the schema art-direction catalogue when image generation uses the theme.
- [ ] Schema and store tests cover both variants and theme selection.

## Generator data

- [ ] A canonical generator label is used consistently across mapping tables, selectors, local data, and tests.
- [ ] Each advertised NPC, faction, quest, name, settlement, dungeon, adventure, social hub, nation, news sheet, or language generator has been reviewed against the hub-card contract.
- [ ] Each exposed dropdown has dedicated, genre-appropriate choices; none default to an unrelated genre.
- [ ] Local/offline generation uses the same genre-specific vocabulary as AI-assisted generation.
- [ ] Dungeon and adventure tables have their own files and registrations; they do not alias a different horror or fantasy genre.
- [ ] Generated descriptions and prompt hints describe this theme's own setting assumptions, not a neighbouring genre's.

## Hub and navigation

- [ ] The hub slug, label, generator genre, stored theme id, and applicable social-hub mapping are registered in `generator-theme-maps.ts`.
- [ ] `SEOGeneratorLayout.svelte` maps the hub to the correct visual theme.
- [ ] Every hub card has accurate, genre-specific copy and points to a supported generator.
- [ ] Direct links and hub-origin links select the same genre by default.
- [ ] The hub appears on public discovery pages only after its cards are ready.

## Tests and review

- [ ] Focused tests cover each new option table and generator mapping.
- [ ] At least one negative test proves the new theme does not fall back to an unrelated genre where that risk exists.
- [ ] Coverage tests reject any selector theme that lacks a dedicated dungeon or adventure table.
- [ ] Public hub tests cover the new route, card list, and visual theme mapping.
- [ ] `bun run lint` passes.
- [ ] `bun run test` passes.
- [ ] The guide and any user-facing help are updated if the theme changes a public workflow.
