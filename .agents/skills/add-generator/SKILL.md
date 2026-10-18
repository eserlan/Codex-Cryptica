---
name: add-generator
description: Add a new Codex Cryptica content generator across the in-app campaign workflow and public no-login /generators + /tools SEO pages. Use when asked to "add a generator", "make a new generator type", "create a [thing] generator", or to expose an existing generator on /generators, theme hubs, or /tools.
---

# Add a Generator

There are **two separate, non-interoperating generator systems** in this repo. Confusing them is the single biggest source of missed wiring.

|              | In-app campaign generator                                                                      | Public `/generators` SEO surface                                              |
| ------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Entry point  | The existing generator HUD/modal, driven off `listGenerators()`                                | `/generators/<slug>` pages, theme hubs, `/tools`                              |
| Context      | Vault-aware (existing entities, world theme, banned names)                                     | Session-only, no login, no vault                                              |
| Core files   | `packages/generator-engine/src/campaign-generator-registry.ts` + `campaign-generator-types.ts` | `packages/generator-engine/src/public-<name>.ts` + a pile of `apps/web` files |
| Output shape | `GeneratorOutput` (title/summary/lore/labels/connections)                                      | `PublicGeneratorOutput` (adds `type`/`status`/`kind`)                         |

They share _content design_ (option pools, per-item structure). Code sharing depends on the tier (Part A step 1). Building one never exposes the generator on the other surface.

Complete both Part A and Part B for every new generator. An explicit user request to limit work to one surface is the only exception; record that scope in the handoff.

**Optional extras: read the reference only when it applies.**

| Read                                                               | When                                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [references/staged-generation.md](references/staged-generation.md) | Sections depend on each other (history → places → factions), or one-pass output keeps contradicting itself |
| [references/theme-selector.md](references/theme-selector.md)       | Content should take its flavour from the chosen world theme                                                |
| [references/visual-linking.md](references/visual-linking.md)       | The output includes a rendered diagram or map that should be saved with the entity                         |

---

## Part A — In-app campaign generator (required)

1. **Pick a complexity tier**, matching an existing generator of similar shape:
   - **Simple** (npc/faction/event-tier): local fallback and prompt builder are small inline functions in `campaign-generator-registry.ts`, with inline `const FOO_OPTIONS = [...]` arrays. No separate file.
   - **Rich** (adventure/dungeon/ship/language/news-sheet/world-tier): the registry imports `generateXLocal`/`buildXPrompt` from the matching `public-x.ts` and wraps the prompt with `contextChain(request)` for vault grounding. Use this when the content is genuinely complex (many structured sub-fields per item); it keeps the registry from ballooning. If its sections depend on each other, also read [staged generation](references/staged-generation.md).
   - Do **not** invent a bespoke canvas-node/graph system unless the user explicitly asks for graph/canvas integration.

2. **`campaign-generator-types.ts`**: add the id to both `GeneratorId` (union) and `SUPPORTED_GENERATOR_IDS` (array), in the same order.

3. **`campaign-generator-registry.ts`**:
   - `GENERATOR_ENTITY_TYPE[id]`: the vault category it writes to (`"note"` for adventure/quest-shaped content, `"character"` for NPCs, etc.).
   - Add an `EXEMPLARS` entry in `campaign-generator-exemplars.ts` (the few-shot JSON example). Every generator needs one; several tests assert it.
   - In the options helper, pass `avoidNames: [...(request.vaultContext?.bannedNames ?? []), ...(request.vaultContext?.existingTitles ?? [])]` so the model avoids existing campaign names.
   - Build the prompt with the shared helpers `contextChain(request)`, `OUTPUT_SCHEMA`, `exemplarBlock(request, id)`, `groundingNote(request)`, `loreGuidance(request, checklist)`. Don't hand-roll context assembly.
   - Write the local fallback (simple tier: inline with `pick()`/`optionString()`/`generateName()`; rich tier: wrap the imported `generateXLocal`).
   - Add the `REGISTRY` block: `id`, `label`, `description`, `entityType`, `defaultInstruction`, `icon` (a plain `lucide:name` string with no build-time check, so confirm it exists in `@iconify-json/lucide`'s icons.json), `options`, `defaults`, `generate`, `mapOutputToDraft: mapOutputToDraft(id)`, `buildPrompt`.
   - No UI wiring: `CampaignGeneratorModal`/`GeneratorConfigForm` drive off `listGenerators()`/`isSupportedGenerator()`.

4. **Update the two hard-coded exact-match tests in `campaign-generator-registry.test.ts`**. They do not iterate `SUPPORTED_GENERATOR_IDS`, so they WILL fail:
   - `"lists all generators in order"`: the full `listGenerators().map(g => g.id)` array.
   - `"maps each generator to its distinct vault category"`: the full `GENERATOR_ENTITY_TYPE` object.

5. Add dedicated tests (entity-type mapping, prompt content, local-fallback shape), mirroring an existing generator's block.

---

## Part B — Public `/generators` + theme hubs + `/tools` (required)

Implement alongside Part A unless the user explicitly excludes the no-login tool. This touches about 20 files; budget for it.

### Engine

1. **`packages/generator-engine/src/public-<name>.ts`**: a new file mirroring `public-quest.ts`:
   - `<name>Config` (option pools) and `<Name>GeneratorOptions` (always include `avoidNames?: string[]`).
   - `resolve<Name>()`: picks defaults for unset options and avoids names in `options.avoidNames`.
   - `build<Name>Prompt(options, sessionContext, rng)` → `{ systemInstruction, userMessage, resolved }`.
     - **Session diversification:** use `avoidNamesExcludingContext(options.avoidNames ?? [], resolved.campaignContext)` from `./campaign-context` to add an `"Already created or used this session — do NOT reuse these names or generate duplicate concepts:"` block before `${NAME_BAN_PROMPT}`.
     - **Consistency pass:** if sections constrain each other (counts that must match, claims that must agree, "at least N distinct X", entities whose state depends on other entities), end the prompt with a consistency-pass instruction that names the specific fields to check, not a generic "double check your work". Council-vote's reads: "Before returning, run a consistency pass: the voting rule and tally must be mathematically correct for N seats; every councillor's stance matches across all sections; each persuasion route directly addresses that councillor's stated motive; …". Place it right before the "return only JSON" line, and assert the field-specific phrases in the prompt test. If the constraints run deep enough that this isn't enough, see [staged generation](references/staged-generation.md).
   - `parse<Name>Response(text, resolved)` → `PublicGeneratorOutput` (via `parseFencedJson`).
   - `generate<Name>Local(options, rng)` → `PublicGeneratorOutput`.
   - Include `genre?: string` from the start if the content should vary by world theme ([theme selector](references/theme-selector.md)); it's cheaper than retrofitting.
   - Write `public-<name>.test.ts`: seeded-RNG determinism, option pass-through, prompt content including `avoidNames` filtering, parse fallback on bad JSON.

2. **`packages/generator-engine/src/index.ts`**: export `build<Name>Prompt`, `parse<Name>Response`, `generate<Name>Local`, `<name>Config` and the option/prompt types.

3. **Engine method** in `apps/web/src/lib/services/seo/`. `generator-engine.ts` is only a facade; add `generate<Name>()` next to its closest sibling: `generator-engine-core.ts` (NPC, items, quest, rumour, villain, one-shot), `generator-engine-worldbuilding.ts` (heist, council vote, tavern, kingdom, ship, language) or `generator-engine-specialized.ts` (dungeon, adventure, world and space, creature, tome, point crawl). Match `generateQuestHook`'s shape: `runWithAIFallback(useAI, aiPath, () => generate<Name>Local(options))`, with `generationInputHistoryStore.recent("<slug>")` + `formatRecentInputsNote` in the prompt and `generationInputHistoryStore.record("<slug>", summarizeResolvedInputs(resolved))` after resolving. Re-export `<name>Config` from `generator-config.ts`; form fields import from there.

### Page wiring

4. **New `apps/web/src/lib/components/seo/<Name>FormFields.svelte`**, mirroring `QuestFormFields.svelte`: `$bindable` props per option (defaulted from `<name>Config`), `SelectWithCustomOption` per select, a "Surprise Me" button, plain `<textarea>`/`<input>` for free text. Only declare a `selectClass` if you use it separately from `inputClass`, or eslint's `no-unused-vars` fails the commit.

5. **`generator-page-meta.ts`**: add the slug to `ValidSlug` and a `slugMeta[slug]` entry (`pageTitle`, `metaDescription`, `introTitle`, `eyebrow`, `introText`, `canonicalPath`, `faqs`, optional `relatedLinks`).

6. **`generator-page-generation.ts`**: add the state field to `GenerationContext` and a handler: `"<slug>": (useAI) => engine.generate<Name>({ ...(ctx.<name> as object), useAI, avoidNames: collectSessionNames(ctx.getSessionEntities() as never[]) } as never)`. If the AI response can't be shown as a streaming preview (custom parser, multi-call), add the slug to `NON_STREAMABLE_SLUGS` here and to the `supportsStreaming` exclusion list in `GeneratorPageContent.svelte`.

7. **`GeneratorPageContent.svelte`** (additive edits only, don't restructure): add `let <name> = $state({...})` with defaults from `<name>Config`, pass it into `createGeneratorHandlers({...})`, and add `bind:<name>` on `<GeneratorPageFormFields>`.

8. **`GeneratorPageFormFields.svelte`**: add the `<name> = $bindable()` prop and its type, add the slug to the matching group set (`coreSlugs`, `socialSlugs`, `identitySlugs`, `storySlugs` or `worldSlugs`), and add a `{:else if slug === "<slug>"}` branch rendering `<Name>FormFields` **inside that group's snippet**. A slug missing from its group set renders no form at all.

### Routes and listings

9. **`apps/web/src/params/generator_slug.ts`**: add the slug to `validSlugs`.

10. **`routes/(marketing)/generators/[slug=generator_slug]/+page.ts`**: add to `validSlugs`, the inline union type and the `entries()` prerender array. Missing `entries()` breaks the static build for the slug.

11. **`routes/(marketing)/generators/[theme=theme_hub]/[slug=generator_slug]/+page.ts`**: the same `validSlugs` addition for the theme+slug route. Easy to miss: it's a sibling directory, not the same file as step 10.

12. **`routes/(marketing)/generators/+page.svelte`**: add `{href, label, summary, icon}` to the right group in `generators`.

13. **`routes/(marketing)/generators/[theme=theme_hub]/+page.svelte`**: add a card to `sharedCards()`. It propagates to every theme hub.

14. **`GeneratorSwitcherMenu.svelte`**: add `{label, path}` to the matching `GENERATOR_GROUPS` entry.

15. **`services/seo/random-idea.ts`**: if it suits "Surprise Me", add its `key` to `RandomIdeaCategory["key"]` and an entry to `randomIdeaCategories`. Update `random-idea.test.ts`'s exact-match sorted array and the `dispatches each category` mock engine, which calls **every** category's `generate()`.

16. **`routes/(marketing)/tools/+page.svelte`**: add a listing entry pointing at `/generators/<slug>`. A dedicated `/tools/<slug>-generator` page needs an explicit user request.

17. **`routes/(marketing)/generators/[slug=generator_slug]/generators.test.ts`**: add the slug to its hard-coded `entries()` array.

### Discovery and machine-readable listings

18. **Discovery registry (Constitution XIII).** A generator page is a public discovery page. Before building it, check whether the intent already has an owner (`findIntentOwner`); if it does, extend that page or add an alias instead. Otherwise add an entry to `apps/web/src/lib/content/discovery/entries/generators.ts`: `id: "generator-<slug>"`, `pageKind: "generator"`, `canonicalPath`, `primaryIntent`, `intentAliases`, `userJob`, `uniqueValue`, `parentCluster`, `relatedIntents`, and an `acknowledgedOverlap` with a reason for each intentional overlap. `generator-point-crawl` is a good model. Run `bun scripts/discovery-audit.mjs`; it also runs in `prebuild`, so an error fails CI. See [docs/discovery-intent-registry.md](../../../docs/discovery-intent-registry.md).

19. **`llms.txt`**: run `bun run sync:llms-generators`. It rebuilds the generator section from `slugMeta` and the discovery entries; its `--check` mode fails when the file is stale.

20. **Social image (required).** Capture the rendered `/generators/<slug>` page in a real browser at a social-card viewport: an actual screenshot, not generated art, a mockup or another generator's image. Upload it with Wrangler to `codex-cryptica-statics/screenshots/generator-<slug>.png` using `--content-type image/png --remote`, check that `https://assets.codexcryptica.com/screenshots/generator-<slug>.png` returns the image, and use that URL with accurate alt text for `ogImage` in `generator-page-meta.ts`. Delete the local file afterwards; images never go in git. If authenticated R2 upload is unavailable, stop and report it rather than reusing another image.

---

## Part B.5 — Main column vs. right rail (content ownership, #1283)

`SEOGeneratorLayout.svelte` renders three columns on desktop: **left** (the form), **main** (`GeneratorOutputCard`, the primary reading column) and **right** ("At the Table", GM-only reference). Decide what goes in `content` (table-facing prose) and what goes in `lore` (GM reference) **before** writing the prompt schema and local fallback. The split is driven by `getGeneratorDocumentLayout()` in `apps/web/src/lib/components/seo/generator-document-layout.ts`, not by the generator at render time.

**Default (do nothing):** if none of the generator's `labels` match an entry in that file's `LAYOUT_RULES`, `content` renders whole in the main column and `lore` whole in the rail. This suits most generators (council-vote does this), as long as `lore` is genuinely reference-shaped (short bullets, stat-block-like) rather than narrative.

**Finer splitting:** add a `LayoutRule` to `LAYOUT_RULES`, keyed by one of the generator's own `labels`:

```ts
{
  label: "<one-of-your-labels>",
  // Lore ## / ### sections that STAY in the rail. Every other lore section,
  // including headings the AI invents, moves into the main document.
  railSections: new Set(["Voting Procedure", "Current Vote Estimate"]),
  // Optional: pull specific "- **Label**: ..." bullets out of a kept rail
  // section into a new main-document heading (narrative payload like secrets).
  documentBullets: { labels: new Set(["Secret"]), heading: "Secrets & Hooks" },
}
```

Gotchas:

- Matching is by **exact string** against the output's `labels`. If your exemplar or fallback copies **another generator's** label (e.g. `"quest-generator"` from a handy template), you silently inherit its `railSections` rule. Grep `LAYOUT_RULES` for your labels before finalising them.
- `railSections` matches the exact heading text. A heading the AI phrases differently moves to main (a safe default, but check real output).
- **Judge rail-worthiness by the density of real output, not the section name.** "Council Members" sounds compact, but if the model writes a paragraph per member it belongs in main. Generate a real draft before finalising `railSections`.

---

## Verification

Validate only what changed (AGENTS.md); never run the repository-wide suites:

```bash
bun run test:changed     # impacted tests (generator-engine runs on bun test, apps/web on vitest)
bun run lint:changed     # changed-file lint and formatting
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error   # expect 0 errors
bun scripts/discovery-audit.mjs   # Part B step 18
bunx fallow audit --format json --quiet --explain --gate-marker agent   # before committing
```

Run `svelte-check` from `apps/web`. From the repo root or `packages/generator-engine` it silently picks up the wrong config and checks far fewer files. For `packages/generator-engine` types, run `bunx tsc --noEmit -p .` there and compare the error count with `staging`: some test files already have errors.

Before opening the PR, run the `codex-review` specialist review (AGENTS.md PR quality gate).
