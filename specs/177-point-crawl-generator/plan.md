# Implementation Plan: Point Crawl Generator

**Branch**: `177-point-crawl-generator` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/177-point-crawl-generator/spec.md`

## Summary

Build the **Point Crawl Generator** (`#2479`) across both the in-app campaign generator workflow (`CampaignGeneratorService` / `CampaignGeneratorModal`) and the public no-login SEO surface (`/generators/point-crawl`, `/generators`, genre theme hubs, and `/tools`). Applying the architectural lessons from the One-Shot Adventure Builder (`#4099`–`#4122`), the generator models point crawl topology, node roles (`start`, `hub`, `hazard`, `obstacle`, `secret`, `side`, `goal`), route mechanics (`visibility`, `direction`, `travelTime`, `terrain`, `risk`, `signpost`, `gate`), and key-before-lock dependencies as structured data first (`packages/generator-engine/src/point-crawl-*.ts`). It executes AI generation in stages with live progress and granular per-node/per-route template fallback, enforces deterministic graph playability invariants (reachability from Start, `>= 1` loop, `>= 1` secret/shortcut, key-before-lock BFS verification, sibling route trade-off distinctness, and anti-vagueness), renders an interactive draggable SVG graph (`PointCrawlGraph.svelte`), supports surgical single-node/single-route regeneration (`PointCrawlRefinePanel.svelte`), and saves either all points or a user-toggled subset into the Vault as connected `Location` entities (with route connection labels and a `"Routes & Exits"` lore section) plus a master overview `Note` entity.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: `packages/generator-engine` (extended with `point-crawl-*` modules), `schema`, `@codex/ai-engine` / `aiGeneratorGateway`, existing `$lib/utils/svg-export.ts`, Tailwind 4 semantic tokens, Lucide Iconify utility classes (`icon-[lucide--*]`). Zero new third-party dependencies.  
**Storage**: Transient client-side reactive state during generation; `localStorage` (`__codex_pending_import` array of `ImportDraft[]` via existing `SeoImportService`) for public-to-vault handoff; OPFS & IndexedDB (via existing `vault.createEntity` and `vault.addConnection`) when saving `Location` entities and the master overview `Note` entity in-app. Zero database migrations required.  
**Testing**: Vitest (`bun run test:changed` / targeted `bunx vitest run`) for unit and component tests; `bun scripts/discovery-audit.mjs` for discovery intent governance.  
**Target Platform**: Web browser (SSR-compatible public SEO page + client-side local-first PWA).  
**Project Type**: Monorepo web application (`apps/web`) + standalone framework-free workspace library (`packages/generator-engine`).  
**Performance Goals**: `< 200ms` local no-login generation and interactive SVG graph layout for 6–15 node networks (SC-002); bounded concurrency (`3` parallel requests) during staged AI node/route stocking.  
**Constraints**: Offline-capable local mode; strict adherence to `AI Disabled` policy (`oracle.isEnabled`); 0 key-behind-lock softlocks; 0 intent collisions in `discovery-audit.mjs`; adherence to Bounded Responsibility (Constitution XIV).  
**Scale/Scope**: 6–15 location nodes and 6–24 routes per generated point crawl; 1 new public route (`/generators/point-crawl`) integrated into `/generators`, 13 theme hubs, and `/tools`, plus 1 in-app campaign generator (`point-crawl`) and 1 Help article.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: **PASS** — All topology construction, graph layout calculation, deterministic playability validation, staged AI orchestration, surgical part regeneration, and multi-entity vault save payload building live in framework-free `packages/generator-engine/src/point-crawl-*.ts`. `apps/web` provides thin Svelte 5 UI components and service wiring.
- **II. Test-Driven Development (TDD)**: **PASS** — Unit tests cover topology invariants, key-before-lock BFS, sibling route overlap detection, staged AI fallback, surgical node/route regeneration, interactive SVG layout, and full/subset vault batch save (including negative/cancellation/fallback paths).
- **III. Simplicity & YAGNI**: **PASS** — Reuses the proven `one-shot-*` staged/playability/repair patterns, `$lib/utils/svg-export.ts` for PNG export, and `SeoImportService`'s existing `ImportDraft[]` batch import with `relationships` instead of inventing a new import format or pulling in a heavy graph library.
- **IV. AI-First Extraction**: **PASS** — Structured JSON prompts per stage with deterministic normalization and repair so malformed or partial LLM responses degrade gracefully to local templates per node/route.
- **V. Privacy & Client-Side Processing**: **PASS** — Local generation is 100% client-side; AI generation respects `oracle.isEnabled` / `AIPolicy`; vault entities are stored locally in OPFS/IndexedDB.
- **VI. Clean Implementation**: **PASS** — Uses Svelte 5 Runes (`$state`, `$derived`, `$effect`), Tailwind 4 semantic tokens, Iconify `icon-[lucide--*]` classes, and impacted-only validation (`bun run lint:changed`, `bun run test:changed`, scoped `svelte-check`).
- **VII. User Documentation**: **PASS** — Adds a dedicated Help article (`apps/web/src/lib/content/help/point-crawl-generator.md`) and registers it in `apps/web/src/lib/config/help-content.ts`.
- **VIII. Dependency Injection (DI)**: **PASS** — Engine and vault-save helpers accept injected gateways/stores with sensible defaults.
- **IX. Natural Language**: **PASS** — Plain, table-ready GM language ("Start", "Goal", "Hidden Route", "Locked — requires key from...").
- **X. Quality & Coverage Enforcement**: **PASS** — New `point-crawl-*` modules in `packages/generator-engine` target `>80%` unit test coverage.
- **XII. Terminology Unification (Labels Over Tags)**: **PASS** — Uses `labels` exclusively across generated drafts and saved entities.
- **XIII. Discovery Intent Governance**: **PASS** — Checked and documented below.
- **XIV. Bounded Responsibility**: **PASS** — Checked and documented below.

### Discovery Intent Check

_Applies only when the feature adds or materially repositions a public, indexable discovery page (`/for`, `/answers`, `/examples`, `/solutions`, `/vs`, `/import`, generator or tool landing pages, evergreen reference posts). Mark N/A otherwise._

- [x] Existing intent ownership checked in `apps/web/src/lib/content/discovery/` before proposing any new URL (`answer-point-crawl` owns `"what is a point crawl"` with `userJob: "explain"`; no entry owns `"point crawl generator"`).
- [x] Each new page has a registered canonical path (`/generators/point-crawl`), primary intent (`point crawl generator`), user job (`create`), and unique-value rationale.
- [x] Synonyms and query variants (`pointcrawl generator`, `rpg point crawl generator`, `dnd point crawl generator`, `random point crawl`, `point crawl map generator`) are recorded as aliases, not as new URLs.
- [x] Any deliberate overlap with an existing page (`answer-point-crawl`, which serves `explain` vs `create`) is justified by a materially different user job and recorded with `relatedIds` / `acknowledgedOverlap`.
- [x] `bun scripts/discovery-audit.mjs` reports no errors.

See Principle XIII and `docs/discovery-intent-registry.md`.

### Bounded Responsibility Check

_Applies when the feature adds behaviour to existing files. Mark N/A when every file it touches is new or data-only._

- [x] Files this feature will touch that already exceed 500 lines are listed, excluding tests and data-only modules:
  1. `packages/generator-engine/src/campaign-generator-registry.ts` (3,962 lines) — Holds the registry dispatch table mapping `GeneratorId` to each generator's definition.
  2. `packages/generator-engine/src/campaign-generator-types.ts` (544 lines) — Shared type definitions for `GeneratorId`, `GeneratorOutput`, and `GeneratedDraft`.
  3. `apps/web/src/lib/components/seo/GeneratorPageContent.svelte` (1,091 lines) — Top-level state/props orchestrator for public `/generators/[slug]` routes.
  4. `apps/web/src/lib/components/seo/GeneratorPageFormFields.svelte` (875 lines) — Slug-switched form-field dispatcher for `/generators/[slug]`.
  5. `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte` (848 lines) — Modal lifecycle orchestrator (`configure` → `generating` → `review` → `saving`) for in-app campaign generators.
  6. `apps/web/src/lib/services/seo/generator-engine-core.ts` (646 lines) — Public generator engine class facade.
- [x] For each, either the single responsibility it still holds is named, or a decomposition is planned as part of this work:
  - Each of the 6 files above is a slug/generator-ID switchboard or type contract. None of the new point-crawl domain, graph layout, staged generation, refine UI, or batch vault-save logic will be embedded inside them; each receives only a 1–5 line delegation entry.
- [x] New behaviour that does not belong to a listed file's existing responsibility has an extraction target — a `packages/` workspace when the logic is not app-specific, a sibling module when it is:
  - `packages/generator-engine/src/point-crawl-state.ts` (types, markdown & route-label rendering)
  - `packages/generator-engine/src/point-crawl-tables.ts` (genre & scale-aware local tables)
  - `packages/generator-engine/src/point-crawl-topology.ts` (6–15 node graph builder, BFS reachability & key-before-lock normalizer)
  - `packages/generator-engine/src/point-crawl-playability.ts` (playability checks & route trade-off overlap detector)
  - `packages/generator-engine/src/point-crawl-staged.ts` (staged AI generation with concurrency pool & per-part fallback)
  - `packages/generator-engine/src/point-crawl-repair.ts` (surgical single-node/single-route regeneration & playability repair)
  - `packages/generator-engine/src/point-crawl-layout.ts` (deterministic layered SVG node/edge geometry)
  - `packages/generator-engine/src/point-crawl-save.ts` (multi-entity `Location` + overview `Note` batch draft builder)
  - `packages/generator-engine/src/public-point-crawl.ts` (public & campaign generator adapter)
  - `apps/web/src/lib/components/seo/PointCrawlGraph.svelte` (interactive draggable SVG graph + node/route inspector + save-subset toggles)
  - `apps/web/src/lib/components/seo/PointCrawlRefinePanel.svelte` (surgical per-node & per-route regeneration UI)
  - `apps/web/src/lib/components/seo/fields/PointCrawlFormFields.svelte` (form controls for `/generators/point-crawl`)
  - `apps/web/src/lib/services/generators/point-crawl-vault-save.ts` (in-app multi-entity vault creation & connection hydration)
- [x] Any planned split carries its tests across, or gains its own.

See Principle XIV and ADR 003.

### User Help Check

_Applies when a feature adds or materially changes user-facing behaviour. Mark N/A only for internal tooling or infrastructure with no user-facing behaviour._

- [x] A help article or description is planned in the app's Help system for each user-facing feature (`apps/web/src/lib/content/help/point-crawl-generator.md` + `apps/web/src/lib/config/help-content.ts` + update to `apps/web/src/lib/content/help/in-app-generators.md`).
- [x] Help content explains what users can do (generate 6–15 node point crawls across scales, inspect/drag nodes on the visual graph, surgically regenerate individual nodes or routes, and save all or selected points as connected Location entities + overview Note), how to find and use the feature, and important prerequisites or limitations.
- [x] Consider a `FeatureHint` for features with complex interactions (interactive graph controls & save-subset toggles).

See Principle VII.

## Project Structure

### Documentation (this feature)

```text
specs/177-point-crawl-generator/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── point-crawl-api.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/generator-engine/
├── src/
│   ├── point-crawl-state.ts          # Data-first types, route summary & markdown/GM-sheet renderers
│   ├── point-crawl-tables.ts         # Genre & scale local lookup tables (Dungeon..Planet/System)
│   ├── point-crawl-topology.ts       # 6-15 node graph builder, loops, shortcuts & key-before-lock BFS
│   ├── point-crawl-playability.ts    # Reachability, sibling route overlap & anti-vagueness checks
│   ├── point-crawl-staged.ts         # Staged AI generation, concurrency pool (3) & per-part fallback
│   ├── point-crawl-repair.ts         # Surgical per-node & per-route regeneration
│   ├── point-crawl-layout.ts         # Deterministic layered SVG node & curved-edge layout
│   ├── point-crawl-save.ts           # Multi-entity Vault Save batch builder (Locations + Overview Note)
│   ├── public-point-crawl.ts         # Public & campaign generator entrypoints + config
│   ├── point-crawl.test.ts           # Comprehensive unit tests for topology, playability, staged, repair, save
│   ├── campaign-generator-types.ts   # Add "point-crawl" to GeneratorId & pointCrawl?: PointCrawlNetwork
│   ├── campaign-generator-registry.ts# Register "point-crawl" definition
│   ├── campaign-generator-exemplars.ts
│   └── index.ts                      # Export point-crawl public API

apps/web/
├── src/
│   ├── params/
│   │   └── generator_slug.ts         # Add "point-crawl" to VALID_GENERATOR_SLUGS
│   ├── lib/
│   │   ├── components/
│   │   │   ├── seo/
│   │   │   │   ├── PointCrawlGraph.svelte        # Interactive draggable SVG graph + inspector + subset toggle
│   │   │   │   ├── PointCrawlRefinePanel.svelte  # Surgical node/route regeneration panel
│   │   │   │   ├── fields/
│   │   │   │   │   └── PointCrawlFormFields.svelte
│   │   │   │   ├── layout/
│   │   │   │   │   └── GeneratorDiagrams.svelte  # Render PointCrawlGraph when output.pointCrawl present
│   │   │   │   ├── GeneratorPageContent.svelte
│   │   │   │   ├── GeneratorPageFormFields.svelte
│   │   │   │   ├── generator-page-meta.ts
│   │   │   │   ├── generator-page-drafts.ts
│   │   │   │   ├── generator-page-generation.ts
│   │   │   │   ├── generator-save-flow.ts        # Multi-entity batch save support for pointCrawl
│   │   │   │   └── point-crawl.test.ts
│   │   │   └── generators/
│   │   │       ├── CampaignGeneratorModal.svelte # Delegate point-crawl batch save to point-crawl-vault-save.ts
│   │   │       └── GeneratorDraftReview.svelte   # Embed PointCrawlGraph & subset save controls for point-crawl
│   │   ├── services/
│   │   │   ├── generators/
│   │   │   │   ├── point-crawl-vault-save.ts     # Create Location entities + Overview Note + route connections
│   │   │   │   └── point-crawl-vault-save.test.ts
│   │   │   └── seo/
│   │   │       ├── generator-config.ts
│   │   │       ├── generator-engine-core.ts
│   │   │       ├── generator-engine-specialized.ts
│   │   │       └── random-idea.ts
│   │   ├── seo/
│   │   │   └── llms-generators.ts
│   │   ├── content/
│   │   │   ├── discovery/entries/
│   │   │   │   ├── generators.ts                 # Register generator-point-crawl
│   │   │   │   └── answers.ts                    # Link answer-point-crawl <-> generator-point-crawl
│   │   │   ├── help/
│   │   │   │   ├── point-crawl-generator.md
│   │   │   │   └── in-app-generators.md
│   │   │   └── help-generators.test.ts
│   │   └── config/
│   │       └── help-content.ts
│   └── routes/(marketing)/
│       ├── generators/
│       │   ├── +page.svelte
│       │   ├── [slug=generator_slug]/+page.ts
│       │   └── [theme]/
│       │       ├── +page.svelte
│       │       └── [slug=generator_slug]/+page.ts
│       └── tools/
│           └── +page.svelte
```

**Structure Decision**: Follows the established Codex Cryptica monorepo architecture (`packages/generator-engine` for pure domain/AI/graph/save logic + `apps/web` for Svelte 5 components, routes, vault hydration, and discovery metadata).

## Complexity Tracking

_No Constitution Check violations._
