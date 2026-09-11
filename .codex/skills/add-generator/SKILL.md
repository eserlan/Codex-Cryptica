---
name: add-generator
description: Add a Codex Cryptica content generator across both the in-app campaign workflow and public /generators surface. Use when asked to add, create, implement, wire, or publish a generator; make a new generator type; or expose a generator in the in-app campaign workflow, public /generators pages, theme hubs, or /tools.
---

# Add a Generator

Codex Cryptica has two separate generator surfaces. A new generator MUST be implemented on both surfaces by default. They have independent registration and UI wiring; completing one never exposes it on the other.

| Surface     | In-app campaign generator                                      | Public generator pages                                           |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Entry point | Campaign generator HUD/modal via `listGenerators()`            | `/generators/<slug>`, theme hubs, and optional `/tools` listing  |
| Context     | Vault-aware: entities, world theme, banned names               | Session-only: no login or vault                                  |
| Core        | `packages/generator-engine/src/campaign-generator-registry.ts` | `packages/generator-engine/src/public-<name>.ts` plus web wiring |
| Output      | `GeneratorOutput`                                              | `PublicGeneratorOutput`                                          |

Implement both surfaces for every new generator. An explicit user request to limit work to one surface is the only exception; confirm that scope in the handoff. Shared content design does not make either surface discover the other automatically.

## Before editing

1. Read `docs/STYLE_GUIDE.md` and `.specify/memory/constitution.md`.
2. Inspect a comparable current generator and its tests.
3. Reuse existing theme terminology; do not invent synonyms for established theme values.
4. Decide whether generated `content` belongs in the main document and `lore` in the reference rail. Inspect `apps/web/src/lib/components/seo/generator-document-layout.ts` before adding a layout rule.
5. Keep the change library-first: prompt construction and local fallbacks belong in `packages/generator-engine`, not Svelte components.

## In-app campaign generator (required)

1. Pick the matching implementation tier.
   - Use an inline registry prompt and fallback for simple NPC/faction/event-shaped generators.
   - Reuse `build<Name>Prompt` and `generate<Name>Local` from `public-<name>.ts` for rich structured generators.
   - Do not add canvas/graph topology unless explicitly requested.
2. In `campaign-generator-types.ts`, add the id to both `GeneratorId` and `SUPPORTED_GENERATOR_IDS`, in matching order.
3. In `campaign-generator-registry.ts`:
   - Map the generator to its correct vault entity type.
   - Add a few-shot entry in `campaign-generator-exemplars.ts`.
   - Use the existing prompt helpers (`contextChain`, `OUTPUT_SCHEMA`, `exemplarBlock`, `groundingNote`, `loreGuidance`) rather than assembling duplicate context.
   - Add the local fallback and complete `REGISTRY` definition, including a valid Iconify/Lucide icon name.
   - Use `mapOutputToDraft(id)` unless a proven custom mapping is necessary.
4. Update the hardcoded exact-match registry tests for ordered IDs and entity-type mappings.
5. Add dedicated tests for entity mapping, prompt content, and fallback output.

The generic campaign modal and form consume `listGenerators()`; do not add special-case UI wiring unless the generator genuinely requires it.

## Public `/generators` surface (required)

Implement this alongside the in-app generator unless the user explicitly excludes the public surface.

1. Create `packages/generator-engine/src/public-<name>.ts`, following a comparable current generator:
   - config option pools and typed options;
   - a resolver for defaults;
   - a prompt builder returning system instruction, user message, and resolved options;
   - fenced-JSON parsing into `PublicGeneratorOutput`;
   - deterministic local fallback.
2. Add a sibling unit test that covers deterministic fallback, option pass-through, required prompt content, and malformed AI response fallback.
3. Export the generator API from `packages/generator-engine/src/index.ts`.
4. Add a typed `generate<Name>` method and config re-export to `apps/web/src/lib/services/seo/generator-engine.ts`, using its existing AI-with-local-fallback seam.
5. Add `<Name>FormFields.svelte` using Svelte 5 runes, bindable option props, existing input components, and a Surprise Me action. Preserve user-selected genre when randomizing unless the user explicitly asks otherwise.
6. Wire the slug and metadata everywhere public routes enumerate generators:
   - `generator-page-meta.ts`;
   - `apps/web/src/params/generator_slug.ts`;
   - both generator route `+page.ts` files, including prerender `entries()`;
   - `GeneratorPageContent.svelte` imports, state, handler, and form branch;
   - generator index, theme-hub index, generator switcher dropdown pill/menu, and generator route tests.
7. Add the generator to `random-idea.ts` only when it is a meaningful random category; update its exact-match tests and engine mock.
8. Add a `/tools` listing link when appropriate. Do not create a dedicated `/tools` page unless explicitly requested.
9. Verify the public catalogue is consistent: the generator slug and label must
   appear in the generator index, every shared theme-hub card list, the
   generator switcher dropdown pill/menu, and the `/tools` listing. Add or
   update focused catalogue tests. These links are required for every public
   generator; do not treat any of them as optional discoverability work.
10. Create a dedicated SEO image for the new public generator. Capture the
    rendered `/generators/<slug>` page in a real browser at a social-card
    viewport; do not use generated artwork, mock UI, or another generator's
    screenshot. Upload it to remote R2 as
    `codex-cryptica-statics/screenshots/generator-<slug>.png` with
    `image/png`, verify the public
    `https://assets.codexcryptica.com/screenshots/generator-<slug>.png` URL,
    and set that exact URL plus accurate alt text in `generator-page-meta.ts`.
    If R2 access is unavailable, report it rather than silently pointing at a
    reused image.

## Theme-aware generators

Use the canonical theme vocabulary already defined by comparable generators. If public output is genre-sensitive:

1. Add `genre?: string` from the start, with an established default.
2. Synchronize the form's genre/theme selection with the page's visual theme.
   A manual selection of a canonical CC theme must update `activeTheme`, so
   `SEOGeneratorLayout` re-skins immediately; use a mapping when the
   generator has a different genre vocabulary. Preserve custom free-text
   genres for generation without assigning an unknown visual skin.
3. Surprise Me must not change the genre or visual theme. Only the genre
   selector's own change callback may update `activeTheme`; cover manual
   selection and Surprise Me in the component test.
4. Add the slug to both `GENERATOR_SLUGS_WITH_THEME` and `SLUGS_USING_STORED_THEME` in `generator-theme-maps.ts`.
5. Update the real theme map, not the orphaned `generator-theme.ts`; verify imports before changing lookalike files.
6. Use per-theme option pools only for options that genuinely vary by genre. Preserve custom user values when changing theme.
7. Make the AI prompt explicitly require theme fidelity: respect the selected genre's era, technology, institutions, and vocabulary. Prohibit modern terminology, institutions, or technology unless the selected theme supports them, and add a prompt regression test for that rule.

## Structured visuals and saved entities

Only add this path when a generator explicitly produces a diagram, map, or other visual that should be attached to a saved entity.

1. Carry structured data through both public and in-app output types and all parsing/mapping seams.
2. Export images with the shared SVG-to-PNG utility.
3. Link the result through `EntityMapLinkingService` after the entity saves.
4. Make visual export and upload best-effort: never block saving the generated entity.

## Quality gates

1. Add success-path and meaningful malformed-response, cancellation, or fallback coverage.
2. Run focused generator-engine tests and the affected web tests.
3. Run `bun --filter generator-engine lint`, `bun --filter web check`, and `bun run lint`; report any unrelated baseline failures precisely.
4. For public pages, verify the route entries and a representative rendered generator page.
5. Verify both surfaces are discoverable: `listGenerators()` includes the in-app generator; the public generator appears in `/generators`, every shared theme hub, the switcher, and `/tools`.
6. Verify the dedicated public SEO screenshot resolves from R2 and is the same
   URL referenced by the generator's `ogImage` metadata.

Follow the repository’s constructor-DI, privacy, Svelte 5, semantic-token, Iconify, and plain-language rules throughout.
