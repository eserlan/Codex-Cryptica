# Implementation Plan: Business / Enterprise Generator

**Branch**: `180-business-enterprise-generator` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/180-business-enterprise-generator/spec.md`

## Summary

Add a Business / Enterprise Generator (#3627), both as an in-app campaign generator (`business`) and as a public no-login page at `/generators/business`.

The engine side lives in `packages/generator-engine/src/business-*.ts`, with the Point Crawl generator as the model:

- A typed `BusinessDocument` is the source of truth for the 14 sections and the optional management section.
- Genre-aware local tables always pass the deterministic checks.
- AI runs in three stages on one chat session (identity → connections → trouble), with live progress and per-stage fallback to local tables.
- Any single section can be regenerated, and a person's new name is replaced across the other sections.
- A pure save plan matches outside parties to existing vault entities by title.

The web side adds:

- form fields;
- one `BusinessRefinePanel` shared by the public page and the in-app draft review;
- a save step for ticking people, choosing parties and the source link;
- `business-vault-save.ts`, which creates one Faction plus Characters, wires the connections, and rolls back on failure;
- a "Generate a business here" button on Location, Character and Faction entities;
- the discovery entry, help article and changelog entry.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14

**Primary Dependencies**:

- Existing `packages/generator-engine`: the campaign registry, `staged-runtime` (`askChecked`, `readJsonObject`), `StagedProgress`, `naming-policy` and the public generator adapters.
- `aiGeneratorGateway` (`startChat`), `modalUIStore.openGeneratorWorkflowForEntity`, `vault.createEntity` / `addConnection` / `bulkDelete`, and the `SeoImportService` `ImportDraft[]` handoff.
- Tailwind 4 semantic tokens and Iconify classes.
- No new third-party dependency.

**Storage**:

- Generator state is transient.
- The public-to-app handoff uses the existing `__codex_pending_import`.
- An in-app save writes ordinary Faction and Character entities and connections to the vault (OPFS and IndexedDB).
- No new store, no schema change, no migration.

**Testing**:

- `bun test` in `packages/generator-engine`.
- Vitest with jsdom for `apps/web` components and services.
- `bun scripts/test-changed.mjs`, `bun scripts/lint-changed.mjs`, scoped `svelte-check`, `bun scripts/discovery-audit.mjs` and fallow.

**Target Platform**: Browser. SSR-compatible public page plus the local-first app.

**Project Type**: Monorepo web app (`apps/web`) plus the framework-free library `packages/generator-engine`.

**Performance Goals**:

- Local generation and render under 200 ms (SC-003).
- AI generation uses 3 sequential chat turns, plus at most one retry per stage.

**Constraints**:

- Works offline.
- Honours AI Disabled (FR-014).
- Never writes to existing entities except new connections.
- No half-saved business.
- 0 discovery-audit errors.
- Bounded Responsibility (XIV).

**Scale/Scope**:

- 14 sections plus the optional management section.
- 0 to 4 staff.
- 1 to 3 relationships and 1 to 2 dependencies per business.
- About 12 to 16 curated business types for each of the 8 genre groups.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: PASS.
  - The document, tables, local generation, checks, staged AI, section regeneration, rename propagation, rendering and the save plan all live in `packages/generator-engine`.
  - `apps/web` holds the UI and a thin vault-save service.
- **II. TDD**: PASS. Tests are written first for each engine module and the vault save. Each covers a success path and at least one failure path: AI stage failure, abort, a failed check, a save failure with rollback, and AI Disabled.
- **III. Simplicity & YAGNI**: PASS.
  - Reuses the staged runtime, the contextual launch mode, title matching and the import handoff.
  - Three AI stages, not per-section calls.
  - No money simulation.
- **IV. AI-First Extraction**: PASS. AI is the prominent default when available, with structured JSON per stage, deterministic checks and per-stage local fallback. Per the user memory, AI is first class and the generator still works offline.
- **V. Privacy & Client-Side**: PASS. Local generation is fully client-side, AI goes through the existing gateway and policy, and saves stay in the local vault. No new tracking (see the vault privacy rule).
- **VI. Clean Implementation**: PASS. Svelte 5 runes, semantic tokens, Iconify classes, impacted-only validation.
- **VII. User Documentation**: PASS. A new help article, an `in-app-generators.md` update and the help-engine registry sync.
- **VIII. DI**: PASS. Engine functions take an injected `send`, `rng` and `signal`. The vault save takes a `BusinessVaultGateway`.
- **IX. Natural Language**: PASS. Plain GM-facing labels such as "Current pressure", "Who depends on it", and "Players own this business".
- **X. Quality & Coverage**: PASS. Target over 80% coverage on the `business-*` modules.
- **XII. Labels Over Tags**: PASS. Saved entities use `labels`.
- **XIII. Discovery Intent Governance**: PASS. See below.
- **XIV. Bounded Responsibility**: PASS. See below.

### Discovery Intent Check

- [x] Existing ownership was checked in `apps/web/src/lib/content/discovery/entries/`. No entry owns "business generator", "shop generator" or "enterprise generator". `generator-tavern` owns "tavern generator" and "inn generator", and `generator-social-hub` owns "social hub generator".
- [x] The new page has its canonical path (`/generators/business`), primary intent ("business generator"), user job (create) and unique value ("one organisation as a living business: people, dependencies, rivals, pressure and hooks, not a shop inventory or a gathering place").
- [x] Variants are recorded as aliases: "rpg business generator", "shop generator", "rpg shop generator", "enterprise generator", "company generator".
- [x] The overlap with `generator-tavern` is recorded in `acknowledgedOverlap`, with the reason that a venue and an organisation are different jobs. Related intents: tavern, social-hub, settlement, faction.
- [ ] `bun scripts/discovery-audit.mjs` reports no errors. This is a task gate (T047).

### Bounded Responsibility Check

- [x] Files over 500 lines that this feature touches (tests and data-only modules excluded):
  1. `packages/generator-engine/src/campaign-generator-registry.ts` (4,185): the generator definition table.
  2. `packages/generator-engine/src/campaign-generator-types.ts` (564): shared generator types.
  3. `packages/generator-engine/src/campaign-generator-service-ai.ts` (755): the per-generator AI dispatch switch.
  4. `packages/generator-engine/src/index.ts` (954): the package barrel.
  5. `apps/web/src/lib/components/seo/GeneratorPageContent.svelte` (1,123): the public generator page orchestrator.
  6. `apps/web/src/lib/components/seo/GeneratorPageFormFields.svelte` (771): the form-field dispatcher by slug.
  7. `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte` (950): the in-app modal lifecycle.
  8. `apps/web/src/lib/services/seo/generator-engine-core.ts` (571): the public engine facade.
  9. `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` (586): the entity status tab, which hosts the entity actions.
  10. `apps/web/src/lib/config/help-content.ts` (873): the help article registry (data).
  11. `apps/web/src/lib/content/discovery/entries/generators.ts` (1,048): discovery entries (data).
- [x] Each file keeps its single responsibility. It gets only a one-to-ten-line delegation entry: a case, an import, a field, a registry row or a component mount. No business logic goes into any of them.
- [x] New behaviour has its own home:
  - Engine:
    - `business-state.ts`: types and rendering
    - `business-tables.ts`: data
    - `business-local.ts`: local generation
    - `business-checks.ts`: checks and repair
    - `business-staged.ts`: AI stages
    - `business-regenerate.ts`: section regeneration and rename propagation
    - `business-save.ts`: save plan and import drafts
    - `public-business.ts`: config, options, prompts, adapters
  - Web:
    - `BusinessFormFields.svelte`
    - `BusinessRefinePanel.svelte`
    - `BusinessFallbackNote.svelte`
    - `BusinessSaveStep.svelte`
    - `GenerateBusinessButton.svelte`
    - `services/generators/business-vault-save.ts`
- [x] Every new module has its own test file.

### User Help Check

- [x] A help article is planned: `apps/web/src/lib/content/help/business-generator.md`, registered in `help-content.ts`, plus an update to `in-app-generators.md` and the help-engine generator registry sync.
- [x] It explains what the generator makes, the players-own mode, regenerating a section, what saving creates (Faction, Characters, matched or new parties), and the AI Disabled behaviour.
- [x] `FeatureHint`: not needed. The save step's ticks are self-explanatory.

## Project Structure

### Documentation (this feature)

```text
specs/180-business-enterprise-generator/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── business-api.md
├── checklists/
│   └── requirements.md
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
packages/generator-engine/src/
├── business-state.ts            # BusinessDocument types, section ids, render content/lore, toOutput
├── business-tables.ts           # BUSINESS_TYPES per genre + section tables (data only)
├── business-local.ts            # generateBusinessLocal, resolveBusinessOptions
├── business-checks.ts           # checkBusiness, repairBusiness, criminal word list, staff ranges
├── business-staged.ts           # generateBusinessStaged: identity → connections → trouble
├── business-regenerate.ts       # regenerateBusinessSection, propagateRename
├── business-save.ts             # buildBusinessSavePlan, buildBusinessImportDrafts
├── public-business.ts           # businessConfig, prompts, parse, public + campaign adapters
├── business-*.test.ts           # one test file per module
├── staged-progress.ts           # + "identity" | "connections" | "trouble"
├── campaign-generator-types.ts  # + "business" GeneratorId, business?: BusinessDocument
├── campaign-generator-registry.ts # + business definition (fields)
├── campaign-generator-service-ai.ts # + case "business"
├── campaign-generator-service-core.ts # + "business" in the non-simple list
├── campaign-generator-service-persistence.ts # + business draft passthrough
└── index.ts                     # + exports

apps/web/src/
├── params/generator_slug.ts                         # + "business"
├── lib/components/seo/
│   ├── fields/BusinessFormFields.svelte             # genre-filtered type list, light inputs, toggle
│   ├── BusinessRefinePanel.svelte (+ .test.ts)      # per-section regenerate + steer (both surfaces)
│   ├── BusinessFallbackNote.svelte (+ .test.ts)     # names sections that came from local tables
│   ├── GeneratorPageFormFields.svelte               # mount BusinessFormFields
│   └── GeneratorPageContent.svelte                  # mount BusinessRefinePanel
├── lib/components/generators/
│   ├── BusinessSaveStep.svelte (+ .test.ts)         # people ticks, party choices, source label
│   ├── generator-categories.ts                      # + business in the in-app hub
│   ├── GeneratorDraftReview.svelte                  # mount BusinessRefinePanel + BusinessSaveStep
│   └── CampaignGeneratorModal.svelte                # delegate business save
├── lib/components/entity-detail/
│   ├── GenerateBusinessButton.svelte (+ .test.ts)   # Location/Character/Faction only
│   └── DetailStatusTab.svelte                       # mount the button
├── lib/services/generators/business-vault-save.ts (+ .test.ts)
├── lib/services/seo/{generator-config,generator-engine-core,generator-engine-specialized,random-idea}.ts
├── lib/seo/llms-generators.ts, lib/config/feature-groups.ts
├── lib/content/discovery/entries/generators.ts      # + generator-business
├── lib/content/answers/pages/{players-own-a-business,economic-pressures}.ts # + relatedTools link
├── lib/content/help/business-generator.md, in-app-generators.md
├── lib/config/help-content.ts
└── lib/content/changelog/releases.json              # one user-facing entry
packages/help-engine/src/registry/generators.generated.ts  # regenerated by scripts/sync-help-generators.ts
```

**Structure Decision**: Follows the Point Crawl split. Domain logic goes in `packages/generator-engine`, and `apps/web` gets UI, wiring and the vault save.

## Complexity Tracking

_No Constitution Check violations._
