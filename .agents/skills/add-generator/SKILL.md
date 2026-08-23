---
name: add-generator
description: Add a new Codex Cryptica content generator across the in-app campaign workflow and public no-login /generators + /tools SEO pages. Use when asked to "add a generator", "make a new generator type", "create a [thing] generator", or to expose an existing generator on /generators, theme hubs, or /tools.
---

# Add a Generator

There are **two separate, non-interoperating generator systems** in this repo. Confusing them is the single biggest source of missed wiring. A new generator MUST be implemented in both systems by default.

|              | In-app campaign generator                                                                      | Public `/generators` SEO surface                                              |
| ------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Entry point  | The existing generator HUD/modal, driven off `listGenerators()`                                | `/generators/<slug>` pages, theme hubs, `/tools`                              |
| Context      | Vault-aware (existing entities, world theme, banned names)                                     | Session-only, no login, no vault                                              |
| Core files   | `packages/generator-engine/src/campaign-generator-registry.ts` + `campaign-generator-types.ts` | `packages/generator-engine/src/public-<name>.ts` + a pile of `apps/web` files |
| Output shape | `GeneratorOutput` (title/summary/lore/labels/connections)                                      | `PublicGeneratorOutput` (adds `type`/`status`/`kind`)                         |

They always share _content design_ (pools of options, per-councillor/per-NPC structure). Code sharing is tier-dependent: **simple**-tier in-app generators have their own inline prompt builder and local fallback, no shared code; **rich**-tier in-app generators (see Part A step 1) deliberately import `generateXLocal`/`buildXPrompt` from the matching `public-x.ts` file. Either way, building one does not expose the generator anywhere the other system reads from — that wiring is separate (Part A vs Part B below).

Complete both Part A and Part B for every new generator. An explicit user request to limit work to one surface is the only exception; record that scope in the handoff.

---

## Part A — In-app campaign generator (required)

1. **Pick a complexity tier**, matching an existing generator of similar shape:
   - **Simple** (npc/faction/event-tier): local fallback + prompt builder live as small inline functions directly in `campaign-generator-registry.ts`, using inline `const FOO_OPTIONS = [...]` arrays. No separate file.
   - **Rich, reuses a public generator's local/prompt logic** (adventure/dungeon/ship/language/news-sheet/world-tier): the registry imports `generateXLocal`/`buildXPrompt` from the matching `public-x.ts` and wraps the prompt with `contextChain(request)` for vault grounding. Use this tier if the content is genuinely complex (many structured sub-fields per item, e.g. council members) — it keeps the registry file from ballooning.
   - Do **not** invent a third, bespoke canvas-node/graph system unless the user explicitly asks for graph/canvas integration — that tier (dungeon/adventure's topology parsing) is a much bigger lift and usually isn't what "add a generator" means.

2. **`campaign-generator-types.ts`**: add the new id to both `GeneratorId` (union type) and `SUPPORTED_GENERATOR_IDS` (array) — keep them in the same order.

3. **`campaign-generator-registry.ts`**:
   - `GENERATOR_ENTITY_TYPE[id]` — the vault category this generator writes to (`"note"` for adventure/quest-shaped content, `"character"` for NPCs, etc.)
   - Add an entry to `EXEMPLARS` in `packages/generator-engine/src/campaign-generator-exemplars.ts` (the few-shot JSON example) — every generator needs one; several tests assert this.
   - In the options helper `fooOptions(request)`, pass `avoidNames: [...(request.vaultContext?.bannedNames ?? []), ...(request.vaultContext?.existingTitles ?? [])]` so the model avoids reusing existing campaign names.
   - Write the prompt-builder function using the shared helpers: `contextChain(request)`, `OUTPUT_SCHEMA`, `exemplarBlock(id)`, `groundingNote(request)`, `loreGuidance(request, checklist)`. Don't hand-roll context assembly.
   - Write the `generate*` local-fallback function (simple tier: inline with `pick()`/`optionString()`/`generateName()`; rich tier: wraps the imported `generateXLocal`).
   - Add the `REGISTRY` block: `id`, `label`, `description`, `entityType`, `defaultInstruction`, `icon` (a plain `lucide:name` string, no build-time validation — verify the icon exists via the `@iconify-json/lucide` icons.json before assuming), `options` (`GeneratorOptionDefinition[]`), `defaults`, `generate`, `mapOutputToDraft: mapOutputToDraft(id)`, `buildPrompt`.
   - No separate UI wiring needed — `CampaignGeneratorModal`/`GeneratorConfigForm` drive off `listGenerators()`/`isSupportedGenerator()` generically.

4. **Update the two hardcoded exact-match tests in `campaign-generator-registry.test.ts`** — these WILL fail otherwise, they don't iterate `SUPPORTED_GENERATOR_IDS` dynamically:
   - `"lists all generators in order"` — full `listGenerators().map(g => g.id)` array.
   - `"maps each generator to its distinct vault category"` — full `GENERATOR_ENTITY_TYPE` object via `toEqual`.

5. Add dedicated tests for the new generator (entity-type mapping, prompt content assertions, local-fallback shape) — mirror an existing generator's test block.

---

## Part B — Public `/generators` + theme hubs + `/tools` (required)

Implement alongside Part A unless the user explicitly excludes the no-login web tool. This is genuinely ~13 files; budget for it.

1. **`packages/generator-engine/src/public-<name>.ts`** — new file, mirror `public-quest.ts`'s shape exactly:
   - `<name>Config` object (option pools).
   - `<Name>GeneratorOptions` interface (always include `avoidNames?: string[];` for session diversification).
   - `resolve<Name>()` — picks defaults for unset options and avoids picking suggested names in `options.avoidNames`.
   - `build<Name>Prompt(options, sessionContext, rng)` → `{ systemInstruction, userMessage, resolved }`.
     - **Session Anti-Repetition / Diversification:** Use `avoidNamesExcludingContext(options.avoidNames ?? [], resolved.campaignContext)` from `./campaign-context` to format an `"Already created or used this session — do NOT reuse these names or generate duplicate concepts:"` block before `${NAME_BAN_PROMPT}` so consecutive generation turns stay diverse.
     - **Consistency Pass:** If the generator has cross-section constraints the model could violate without noticing (counts that must match a stated number, claims in one section that must agree with another, "at least N distinct X" requirements, entities whose state depends on other entities), end the prompt with an explicit consistency-pass instruction naming the specific things to check by their actual field/section names — not a generic "double check your work." For council-vote this reads: "Before returning, run a consistency pass: the voting rule and tally must be mathematically correct for N seats; every councillor's stance matches across all sections; each persuasion route directly addresses that councillor's stated motive; the possible paths can actually achieve the required result; the best solution genuinely resolves both sides of the dilemma; and any dependency where influencing one entity changes another's options is stated explicitly." Place it right before the "return only JSON" formatting line, and assert its presence (and the field-specific phrases, not just that _some_ text exists) in the prompt test.
   - `parse<Name>Response(text, resolved)` → `PublicGeneratorOutput` (via `parseFencedJson`).
   - `generate<Name>Local(options, rng)` → `PublicGeneratorOutput`.
   - Include a `genre?: string` option from the start if the content should vary by world theme (see Part C) — cheaper to add now than retrofit.
   - Write a matching `public-<name>.test.ts` (seeded-RNG determinism, option pass-through, prompt content including `avoidNames` filtering, parse fallback-on-bad-JSON).

2. **`packages/generator-engine/src/index.ts`** — export `build<Name>Prompt`, `parse<Name>Response`, `generate<Name>Local`, `<name>Config`, and the option/prompt types.

3. **`apps/web/src/lib/services/seo/generator-engine.ts`**:
   - Import the new exports from `"generator-engine"`.
   - Re-export `<name>Config` (form fields need it): `export { <name>Config } from "generator-engine";`
   - Add a `generate<Name>()` method on the engine class matching `generateQuestHook`'s shape: `runWithAIFallback(useAI, aiPath, () => generate<Name>Local(options))`.
   - Use `generationInputHistoryStore.recent("<slug>")` + `formatRecentInputsNote` and `generationInputHistoryStore.record("<slug>", summarizeResolvedInputs(resolved))` so the prompt receives context about recent rolls in the session.

4. **New `apps/web/src/lib/components/seo/<Name>FormFields.svelte`** — mirror `QuestFormFields.svelte`: `$bindable` props per option (defaulted from `<name>Config`), `SelectWithCustomOption` per select field, a "Surprise Me" randomizer button, free-text fields as plain `<textarea>`/`<input>`. Only declare a `selectClass` var if you actually use it separately from `inputClass` — eslint's `no-unused-vars` will fail the commit otherwise.

5. **`apps/web/src/lib/components/seo/generator-page-meta.ts`**: add the slug to `ValidSlug`, add a `slugMeta[slug]` entry (`pageTitle`, `metaDescription`, `introTitle`, `eyebrow`, `introText`, `canonicalPath`, `faqs`, optional `relatedLinks`).

6. **`apps/web/src/lib/components/seo/GeneratorPageContent.svelte`** (the ~800-line per-slug switch — every edit here is additive, don't restructure):
   - Import the new `<Name>FormFields` component and `<name>Config`.
   - Add a `let <name> = $state({...})` block with defaults from `<name>Config`.
   - Add to the generate-handlers `Record`: `"<slug>": (useAI) => generatorEngine.generate<Name>({ ...<name>, useAI, avoidNames: collectSessionNames(sessionHubStore.entities) })`.
   - Add a `{:else if slug === "<slug>"}` render branch instantiating `<Name>FormFields` with all the `bind:` props.
   - **Only** add a theme-sync branch to the big `$effect` (`else if (slug === "<slug>") <name>.genre = activeTheme;`) if you're doing Part C.

7. **`apps/web/src/params/generator_slug.ts`** — add `<slug>` to `validSlugs`.

8. **`apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/+page.ts`** — add to `validSlugs`, the inline union type, and the `entries()` prerender array. Missing `entries()` breaks the static build for the new slug.

9. **`apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/[slug=generator_slug]/+page.ts`** — same `validSlugs` addition, for the theme+slug combo route. Easy to miss since it's a sibling directory, not the same file as #8.

10. **`apps/web/src/routes/(marketing)/generators/+page.svelte`** — add `{href, label, summary, icon}` to the right group in the `generators` array. This is required for every public generator.

11. **`apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.svelte`** — add a card to `sharedCards()` (the pool shared by every theme hub's `...sharedCards(...)` spread) so every generator appears on every shared theme hub. Adding it once here propagates to all ~13 hub pages.

12. **`apps/web/src/lib/components/seo/GeneratorSwitcherMenu.svelte`** — add `{label, path}` to the matching `GENERATOR_GROUPS` entry (cross-nav while viewing another generator page).

13. **`apps/web/src/lib/services/seo/random-idea.ts`** — if the generator makes sense as a "Surprise Me" pick, add its `key` to `RandomIdeaCategory["key"]` and a `{ key, label, generate }` entry to `randomIdeaCategories`. Update `random-idea.test.ts`'s exact-match `.sort()` array and the `dispatches each category` test's mock engine (it calls **every** category's `generate()`, so a missing mock method throws).

14. **`apps/web/src/routes/(marketing)/tools/+page.svelte`** — add a required listing entry pointing at `/generators/<slug>`. A dedicated `/tools/<slug>-generator` page remains optional and requires an explicit user request.

15. **`apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/generators.test.ts`** — has a hardcoded exact-match `entries()` array; add the new slug.

### Known trap: two lookalike theme files

- `apps/web/src/lib/components/seo/generator-theme-maps.ts` — **the real one**, imported by `GeneratorPageContent.svelte`. Has `GENERATOR_SLUGS_WITH_THEME` (→ `shouldSyncGeneratorTheme`, gates `isThemeCustomizable`) and `SLUGS_USING_STORED_THEME` (localStorage persistence).
- `apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/generator-theme.ts` — a **dead/orphaned duplicate** with a similarly-named `shouldSyncGeneratorTheme`, imported only by its own test file. Do not bother updating it; verify with `grep -rn "from \"./generator-theme\""` that nothing outside its test imports it before assuming otherwise (this can change).

---

## Part B.5 — Main column vs. right rail (content ownership, #1283)

`SEOGeneratorLayout.svelte` renders three columns on desktop: **left** (params/form, `formFields` snippet — this is what `<Name>FormFields.svelte` fills), **middle/main** (`GeneratorOutputCard`, the primary reading column), **right** ("At the Table" rail, GM-only reference). Decide which of your two output fields — `content` (player/table-facing prose) vs `lore` (GM-only reference) — should hold what _before_ writing the prompt schema and local fallback, because the split is driven by `getGeneratorDocumentLayout()` in `apps/web/src/lib/components/seo/generator-document-layout.ts`, not by anything the generator itself controls at render time.

**Default (do nothing):** if none of the generator's `labels` match an entry in that file's `LAYOUT_RULES` array, `content` renders whole in the main column and `lore` renders whole in the right rail — no splitting. This is fine for most generators (it's what `council-vote` does today) and is the right choice when `lore` is genuinely all reference-shaped (short bullets, stat-block-like) rather than narrative.

**Opt into finer splitting** by adding a `LayoutRule` to `LAYOUT_RULES`, keyed by one of your generator's own `labels` strings:

```ts
{
  label: "<one-of-your-labels>",
  // Lore ## / ### sections that STAY in the right rail. Every other lore
  // section — including headings the AI invents that you didn't ask for —
  // moves into the main document instead. Only list truly reference-shaped
  // sections here (quick lookups, stat blocks); narrative sections belong
  // in `content` or should be left out of railSections so they migrate to
  // main automatically.
  railSections: new Set(["Voting Procedure", "Current Vote Estimate"]),
  // Optional: pull specific "- **Label**: ..." bullets OUT of a kept rail
  // section and group them under a new heading in the main document —
  // for narrative payload (secrets, hooks) that got authored inside an
  // otherwise-compact rail section.
  documentBullets: { labels: new Set(["Secret"]), heading: "Secrets & Hooks" },
}
```

Match is by **exact string** against the generator's actual output `labels` array — the rule does nothing if no label matches. Two gotchas that bite:

- If your prompt schema's example `labels` (or your local fallback's `labels`) happens to reuse **another generator's** label string (e.g. copying `"quest-generator"` into a new generator's exemplar because it was a handy template), you'll silently inherit _that_ generator's `railSections` rule against your own, differently-headed lore — sections you expected in the rail move to main (or vice versa) with no error. Grep `LAYOUT_RULES` for your chosen labels before finalizing them.
- `railSections` matches on the exact markdown heading text your prompt/fallback produces. If the AI phrases a heading slightly differently than the schema asked for, that section falls through to "moves to main" by default (safe default, but check real output).
- **Judge rail-worthiness by actual generated density, not the section's name.** A section can sound compact ("Council Members") while the model actually writes a full paragraph per entry — that's narrative payoff, not a quick lookup, and belongs in main even though it looked like reference material on paper. Generate a real draft and look at it before finalizing `railSections`; don't decide purely from the prompt schema's description.

---

## Part C — Theme/genre selector (optional, Part B only)

If the generator's content should flavor itself to the picked world theme (fantasy/cyberpunk/etc.):

0. **Don't invent new genre/theme strings.** Before adding any genre value, check whether it already exists — grep `factionConfig.themes` (the canonical 13: `Classic Fantasy`, `Pirate`, `Cyberpunk / Corporate`, `Vampire / Gothic Noir`, `Cosmic Horror`, `Sci-Fi / Space Opera`, `Modern Conspiracy`, `Post-Apocalyptic`, `Western / Frontier`, `Steampunk`, `Lancer`, `Space Opera Resistance`, `Optimistic Exploration Sci-Fi` in `public-faction-constants.ts`) and sibling generators' own genre lists (e.g. `worldConfig.genres`) for a value that already means the same thing. A generator is free to use its own shorter/flavored genre vocabulary instead of the 13 canonical strings directly (world/star-system do this — `Hard Sci-Fi`, `Space Opera`, `Cyberpunk`, `Post-Apocalyptic`, mapped to a theme skin via step 3 below), but every value in that vocabulary should reuse existing terminology. Don't coin a synonym for a concept that's already named elsewhere (`"Post-Collapse"` when `"Post-Apocalyptic"` already exists) and don't add a genre with no established counterpart unless the user explicitly confirms it's a genuinely new concept the app doesn't cover yet (ask, don't assume) — a real instance of this shipped and had to be walked back post-review (#1935 → PR #2045). If a value doesn't map cleanly to any existing theme, that's a sign to either reuse the closest existing one or drop it, not invent a new label.
1. Add `genre?: string` to the public options interface (Part B step 1) and weave it into the prompt text and local-fallback flavor text. Default it to `"Classic Fantasy"` in `resolve<Name>()`.
2. In `<Name>FormFields.svelte`, add a `theme` bindable prop + a `SelectWithCustomOption` using `factionConfig.themes` (the canonical 13-theme list), labeled "Choose a vibe" — copy `QuestFormFields.svelte`'s first field verbatim.
3. In `GeneratorPageContent.svelte`:
   - Pass `bind:theme={activeTheme}` into the FormFields component.
   - Wire the theme-sync `$effect` branch. Two patterns exist — pick based on whether `genre` needs a lookup table:
     - **Direct** (dungeon-generator/adventure-generator pattern): `<name>.genre = activeTheme;` — use when the theme label IS the genre value.
     - **Mapped** (quest/world/star-system pattern): `<name>.genre = themeTo<Name>Genre[activeTheme] ?? "Classic Fantasy";` (or, for a generator with its own bespoke genre vocab like world/star-system, the reverse — `activeTheme = map<Name>GenreToTheme(<name>.genre);`) — use whenever the generator's genre vocabulary doesn't match the theme labels 1:1.
   - **Default: "Surprise Me" must NOT randomize `genre`.** Genre is a user-controlled axis (user feedback, 2026-08-05) — Surprise Me should only re-roll the other fields and leave whatever genre the user already picked untouched. This is World's and star-system's behavior; copy it. Do not call `onGenreChange?.()` from the Surprise Me handler at all — only the genre `<SelectWithCustomOption>`'s own `onvaluechange` should ever report a genre change. If a future generator has a genuine product reason to randomize genre too, confirm with the user first (don't default into it by copy-pasting an older pattern), and if so the handler must call `onGenreChange?.(genre)` with the freshly-rolled value before/alongside `onSurprise?.()` so `activeTheme` (the page's visual skin) doesn't stay stuck on the pre-reroll genre. Write a component test asserting `onGenreChange` is **not** called on Surprise Me click (only on manual select changes) unless that exception applies.
   - If the form's field is named `genre` rather than directly bound as `theme`, pass an `onGenreChange` callback from `GeneratorPageContent.svelte` to its `SelectWithCustomOption`. The callback must map a manually selected built-in genre to `activeTheme`, while custom free-text genres remain generation input only and keep the current visual skin.
4. Add the slug to **both** `GENERATOR_SLUGS_WITH_THEME` and `SLUGS_USING_STORED_THEME` in `generator-theme-maps.ts`. These are separate sets for separate concerns and it's easy to add one and forget the other:
   - Missing `GENERATOR_SLUGS_WITH_THEME` → theme selector changes generated content but the page's visual skin (`themeStore.worldThemeId`) never re-syncs, so picking "Cyberpunk" doesn't re-skin the page.
   - Missing `SLUGS_USING_STORED_THEME` → the theme choice doesn't persist across visits via localStorage.
5. (Optional, do this when at least one option field has genuinely genre-specific values, e.g. governing-body types or location types) Add a `<field>ByTheme: Record<string, string[]>` map to `<name>Config` in `public-<name>.ts`, mirroring `public-quest.ts`'s `locationTypesByTheme`/`tonesByTheme` pattern:
   - In `resolve<Name>()`, prefer `config.<field>ByTheme[genre] ?? config.<field>` when picking a random default.
   - In the FormFields component, add `const active<Field> = $derived(config.<field>ByTheme[theme] ?? config.<field>)`, use it for the select's `choices` and the "Surprise Me" pick, and add a `$effect` that resets the bound value to `active<Field>[0]` only if the current value is still one of the **built-in** options and no longer in the active pool (preserve custom user-typed values — check `builtIn<Field>.includes(value) && !active<Field>.includes(value)` before resetting).
   - Don't filter every field — only the ones that are genuinely genre-flavored. A field like "voting rule" or "scope" that's equally plausible in any setting doesn't need a per-theme pool; adding one would just be noise.

---

## Part D — Structured visual data + linking a rasterized image to the saved entity (optional)

Only relevant if a generator's output includes a client-rendered visual (a diagram, chart, or map, like star-system's SVG orbital diagram) that should become part of the saved entity — e.g. auto-populating the entity's **Map tab** (every entity has one, `apps/web/src/lib/components/entity-detail/DetailMapTab.svelte`) with an image derived from the generator's own output, not a user upload.

1. Carry the structured data (not just markdown) through the whole pipeline as an optional field on `PublicGeneratorOutput` (`public-generator-adapters.ts`) **and** on `GeneratorOutput`/`GeneratedDraft` (`campaign-generator-types.ts`) — the in-app AI path silently drops any field not explicitly whitelisted in `campaign-generator-service.ts`'s generic JSON-parse block (around `const output: GeneratorOutput = {...}`), so a field only added to the public type never reaches the in-app surface. Add it there too, and to the REGISTRY entry's custom `mapOutputToDraft` override if the generator has one.
2. Make the diagram component export a `bind:this`-reachable `exportPng(): Promise<Blob | null>` (see `StarSystemDiagram.svelte`) built on the shared `svgToPngBlob()` util (`apps/web/src/lib/utils/svg-export.ts`) — don't hand-roll SVG-to-canvas rasterization per component.
3. Use `EntityMapLinkingService` (`apps/web/src/lib/services/entity-map-linking.ts`) to upload the rasterized image and set `parentEntityId` on the resulting `vault.maps` entry — this is the same mechanism `DetailMapTab.svelte`'s manual "Upload Map" uses, so the result is indistinguishable from a manual upload.
4. Wire the linking at **both** save paths if the generator supports both surfaces, since they diverge structurally:
   - **In-app** (`CampaignGeneratorModal.svelte`): render the diagram off-screen (`class="absolute h-px w-px overflow-hidden opacity-0"`) whenever the reviewed draft carries the structured data, bind its ref, and call `exportPng()` + `entityMapLinkingService.linkImageToEntity()` right after `svc.saveDraft(...)` resolves (the entity id is available immediately, even though its content/lore populate later via the pending-revision flow).
   - **Public SEO surface** (`SEOGeneratorLayout.svelte` + `import-handler.ts`): the public page has no live vault, so rasterize at "Save to Codex" time, base64-encode via `blobToDataUrl()`, and stash it on the `__codex_pending_import` payload (extend `ImportDraftSchema` with the new optional field). Decode it back with `dataUrlToFile()` and call `EntityMapLinkingService` only after `checkAndHandlePendingImport()` actually creates the entity.
5. Every step here must be best-effort and wrapped in its own try/catch — a rasterization or upload failure must never block saving the entity itself, which already succeeded by the time linking runs.

---

## Verification

Run these **from the correct directory** — `svelte-check`/`vitest` silently pick up the wrong project's config (and a much smaller file count) if run from the repo root or the other package by mistake:

```bash
cd packages/generator-engine && bunx vitest run && bunx tsc --noEmit   # expect 1 known-unrelated pre-existing failure: adventure-graph-generator.test.ts (bun:test import)
cd apps/web && bunx vitest run && bunx svelte-check --tsconfig ./tsconfig.json   # expect 0 errors
```

If `svelte-check` reports ~429 files instead of ~2380, you're in `packages/generator-engine`, not `apps/web` — `cd` and rerun.
