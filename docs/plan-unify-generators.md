# Plan: Unify SEO and in-app generators under `generator-engine`

> **Tracking issue:** [#1351](https://github.com/eserlan/Codex-Cryptica/issues/1351)
> **Related:** PR #1350 (feature 131 — package + adapters introduced)

## Goal

Make the public SEO generator pages consume `packages/generator-engine` as
their single source of truth, deleting the duplicate generation logic in
`apps/web/src/lib/services/seo/generators/` (4486 lines, 13 generators) one
generator type at a time, behind no user-visible behaviour change.

## Current state (verified in staging)

- **In-app path:** `packages/generator-engine` — 5 generator ids (`npc`,
  `faction`, `settlement`, `magic-item`, `event`). Output =
  `{ title, summary, lore, labels, connections?, unmappedDetails? }`. AI via
  injected `AIGeneratorGateway`; local `generate()` always produces a result.
- **SEO path:** `apps/web/src/lib/services/seo/generators/*` — 13 generators
  (npc, faction, vampire, settlement, magic-item, quest, social-hub/tavern,
  kingdom, nation, pantheon, names). Output =
  `{ type, title, summary, content, lore, labels, status }`. AI-first via
  `aiClientManager`, local fallback inline. Consumed by
  `(marketing)/tools/*/+page.svelte` and `(marketing)/generators/*` via
  `$lib/services/seo/generator-engine.ts`.
- **Bridge today:** `public-generator-adapters.ts` maps `GeneratedDraft →
PublicGeneratorOutput` for **4** types only (npc, faction, settlement,
  magic-item), local-only (`useAI:false`), and sets `content: draft.summary`
  (lossy — drops the rich SEO body). **No page imports it yet.**

## Confirmed decisions (2026-06-17)

- **Theme taxonomy:** port the rich SEO content-theme data (Classic Fantasy,
  Cyberpunk / Corporate, Vampire / Gothic Noir, …) into `generator-engine` as
  canonical; map the vault `themeId` onto it. Preserves all public-page richness.
- **Cadence:** one generator type per PR, end-to-end (expand → migrate page →
  port tests → delete SEO source), each verified in-app before the next. NPC
  first. Phase 0 (shared output + adapters) already merged onto the branch.

## Blocker resolution (decisions)

1. **Output shape.** Extend the package `GeneratorOutput` with an optional
   `content?: string` rich body, carried through `mapOutputToDraft`. The public
   adapter (`toPublic`) then renders `content`, falling back to the first
   non-blank of `lore` then `summary` (so an empty `content` never yields a
   blank body) instead of aliasing `summary`. Keep `type`/`status` in the
   adapter layer (public-only concerns), not in the core type.
2. **Option richness.** Expand each migrated generator's
   `GeneratorOptionDefinition[]` + local tables to cover the SEO option surface
   (e.g. npc: race, role, alignment, trait, secret, motive, faction, plotHook,
   naming style, campaign context). Port the SEO `*Config` tables into the
   package as the canonical data.
3. **AI-first vs local-first.** Public pages keep AI-first **at the call site**:
   they call the package `buildPrompt(request)` + their own `aiClientManager`,
   then fall back to the package's local `generate()` on AI failure. The package
   stays policy-free (`AIPolicy` already models this); we do **not** move
   `aiClientManager` into the package.
4. **Test coverage.** Port SEO option-specific assertions to run against the
   package generators (seeded `Rng` already supported in `base.ts` →
   `generate(request)` must accept an injectable rng for stable snapshots).

## Phases

### Phase 0 — Shared output + adapter fidelity (no page changes)

- [ ] 0.1 Add `content?: string` to package `GeneratorOutput`; populate in each
      `mapOutputToDraft` / `GeneratedDraft`.
- [ ] 0.2 Fix `toPublic()` to pass `content` through; keep `summary` distinct.
- [ ] 0.3 Add `adaptVampire` / `adaptEvent` to cover existing package ids.
- [ ] 0.4 Unit tests: adapter output matches the SEO `GeneratorOutput` contract
      field-for-field for the 4 (→6) covered types.

### Phase 1 — Migrate the 4 already-bridged types (npc, faction, settlement, magic-item)

- [ ] 1.1 Expand package option schemas + local tables to SEO parity (port
      `npcConfig`, `factionConfig`, `settlementConfig`, `magicItemConfig`).
- [ ] 1.2 Port SEO `buildPrompt` content into the package `buildPrompt` per type.
- [ ] 1.3 In each `(marketing)/tools/*` page, swap
      `generatorEngine.generateNPC()` → package adapter + page-level AI-first
      wrapper. One PR per type for reviewable, revertable steps.
- [ ] 1.4 Port the type's SEO tests; delete the migrated
      `seo/generators/<type>.ts` and its export from `generator-engine.ts`.

### Phase 2 — Add the 6 missing generator types to the package

- [ ] 2.1 Add ids: `quest`, `social-hub` (tavern as option), `kingdom`,
      `nation`, `pantheon`, `names`. Define option schemas, local tables,
      `generate`, `mapOutputToDraft`, `buildPrompt` for each.
- [ ] 2.2 Decide vault `entityType` mapping for each new type (names → no vault
      entity; may stay public-only with an adapter but no in-app registration).
- [ ] 2.3 Adapters + tests, then migrate the matching pages and delete the SEO
      source, as in Phase 1.

### Phase 3 — Remove the SEO generator path

- [ ] 3.1 Once all pages call package adapters, delete
      `apps/web/src/lib/services/seo/generators/` and
      `seo/generator-engine.ts`; redirect `random-idea.ts` and any other
      consumers to the package.
- [ ] 3.2 Move shared data still living in SEO (`banned-names`,
      `session-context`, name tables) into the package or a shared location.

### Phase 4 — Verify

- [ ] 4.1 Snapshot a generation per public tool page before/after (seeded rng)
      to prove output parity.
- [ ] 4.2 Full `tools/*` and `generators/*` route smoke test; confirm AI-first +
      local-fallback still behaves identically.

## Sequencing note

Phases 0–1 are low-risk and deliver the architecture proof on the 4 easy types.
Phase 2 is the bulk of the work (6 new generators). Ship **one generator type
per PR** end-to-end (expand → migrate page → delete SEO source) so each step is
independently reviewable and revertable, and the two paths never both own a type
at once.

## Non-goals

- Changing public page UX or option surface (parity only).
- Moving `aiClientManager` into the package (stays at the call site).
- Touching the in-app campaign generator flow beyond additive option/type work.
