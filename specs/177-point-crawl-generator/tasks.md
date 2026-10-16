---
description: "Task list for Point Crawl Generator (177-point-crawl-generator)"
---

# Tasks: Point Crawl Generator (`177-point-crawl-generator`)

**Input**: Design documents from `/specs/177-point-crawl-generator/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/point-crawl-api.ts](./contracts/point-crawl-api.ts)

**Tests**: Tests are REQUIRED for all changed code behaviour (Constitution II), covering both the expected success path and at least one meaningful failure, cancellation, or negative path.

**User Help (Constitution VII)**: Includes a dedicated Help article and config registration explaining what users can do, how to find and use the Point Crawl Generator, and how to save all or selected points into the campaign vault.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) to enable independent implementation and verification of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure & Discovery Registration)

**Purpose**: Register public discovery intent before building the route (Constitution XIII) and declare shared slug/generator identifiers.

-- [X] T001 Register `generator-point-crawl` (`canonicalPath: "/generators/point-crawl"`, `primaryIntent: "point crawl generator"`, `userJob: "create"`, `subject: "point-crawl"`, `aliases: ["pointcrawl generator", "rpg point crawl generator", "dnd point crawl generator", "random point crawl", "point crawl map generator"]`, `relatedIds: ["answer-point-crawl"]`) in `apps/web/src/lib/content/discovery/entries/generators.ts` and link `answer-point-crawl` in `apps/web/src/lib/content/discovery/entries/answers.ts`

- [x] T002 [P] Add `"point-crawl"` to `GeneratorId` and `SUPPORTED_GENERATOR_IDS` (plus optional `pointCrawl?: PointCrawlNetwork` on `GeneratorOutput` and `GeneratedDraft`) in `packages/generator-engine/src/campaign-generator-types.ts`
- [x] T003 [P] Add `"point-crawl"` to `VALID_GENERATOR_SLUGS` in `apps/web/src/params/generator_slug.ts`

---

## Phase 2: Foundational (Core `point-crawl-*` Engine & Playability Invariants)

**Purpose**: Build the framework-free data model, scale/genre tables, topology builder, key-before-lock BFS normalizer, playability checker, and SVG layout geometry in `packages/generator-engine` that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Write foundational unit tests for `PointCrawlNetwork` state rendering, `6–15` node topology invariants (`start` at `layer: 0`, `>= 1` `goal`, `>= 2` branching nodes with `outDegree >= 2`, `>= 1` loop with `edges >= nodes`, `>= 1` `hidden` or `rumoured` shortcut, `>= 1` `gate`), key-before-lock BFS reachability (including negative tests where a key is placed behind its own locked edge), sibling route overlap (`textOverlap >= 0.6`), anti-vagueness (`!isVague`), and SVG layout coordinates in `packages/generator-engine/src/point-crawl.test.ts`
- [x] T005 [P] Implement `PointCrawlNetwork`, `PointCrawlNode` (`role: "start" | "hub" | "hazard" | "obstacle" | "secret" | "side" | "goal"`), `PointCrawlRoute` (`visibility: "obvious" | "hidden" | "rumoured"`, `direction: "bidirectional" | "one-way"`), `PointCrawlGate` (`kind: "key" | "clue" | "tool" | "guide" | "clearance"`), `formatRouteConnectionLabel`, `renderPointCrawlRouteSummary`, `renderPointCrawlMarkdown`, and `renderPointCrawlGmSheet` in `packages/generator-engine/src/point-crawl-state.ts`
- [x] T006 [P] Implement genre-and-scale local lookup tables covering all 13 canonical themes and scales (`Dungeon`, `Settlement`, `City`, `Wilderness`, `Region`, `Planet / System`) with scale-matched travel times, terrains, hazards, signposts, and concrete gate keys/clues in `packages/generator-engine/src/point-crawl-tables.ts`
- [x] T007 Implement `buildPointCrawlTopology` and `normalizePointCrawlTopology` enforcing `pointCount` clamped to `6..15`, density (`Linear-leaning`, `Balanced branching`, `Highly interconnected`), loop/shortcut invariants, and BFS key-before-lock verification in `packages/generator-engine/src/point-crawl-topology.ts`
- [x] T008 Implement `checkPointCrawlPlayability` and `repairPointCrawlPlayability` (reachability from `startNodeId`, key-before-lock BFS without crossing the locked route, sibling route `textOverlap < 0.6`, and `!isVague` gate/clue validation) in `packages/generator-engine/src/point-crawl-playability.ts`
- [x] T009 [P] Implement deterministic layered SVG graph layout (`buildPointCrawlDiagramLayout`) computing node `(x, y, radius)` and straight/curved bezier edge paths + badge midpoints in `packages/generator-engine/src/point-crawl-layout.ts`

**Checkpoint**: Foundation ready — `packages/generator-engine` can deterministically construct, validate, repair, and lay out 6–15 node point crawls.

---

## Phase 3: User Story 1 - Generate & Inspect an Explorable Point Crawl Network (Priority: P1) 🎯 MVP

**Goal**: Allow GMs (both on `/generators/point-crawl` without login and inside the campaign generator modal) to generate a 6–15 node point crawl locally (<200ms) or via staged AI generation with live progress and per-node template fallback, and inspect/drag nodes and routes on an interactive visual graph.

**Independent Test**: Open `/generators/point-crawl` or the in-app Campaign Generator Modal, generate crawls across scales (`Dungeon`, `Wilderness`, `Planet / System`) both locally and with AI, click nodes and routes on `PointCrawlGraph.svelte` to inspect details, drag nodes to rearrange layout, and verify all playability invariants hold.

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T010 [P] [US1] Add unit tests for `generatePointCrawlLocal` (including `< 200ms` execution-time assertion for a 15-node crawl + `buildPointCrawlDiagramLayout` per `SC-002`), `generatePointCrawlStaged` (including bounded concurrency `3`, partial node/route AI timeout fallback via `fillFailedPointCrawlParts`, and `AbortSignal` cancellation), and campaign registry wiring in `packages/generator-engine/src/point-crawl.test.ts` and `packages/generator-engine/src/campaign-generator-registry.test.ts`
- [x] T011 [P] [US1] Add unit and component tests for `PointCrawlGraph.svelte` (node selection, route selection, neighbour highlighting, node drag + layout reset, PNG export) and `/generators/point-crawl` generation handlers in `apps/web/src/lib/components/seo/point-crawl.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement `generatePointCrawlStaged` (`topology` → parallel `locations-and-routes` pool of 3 → `playability` check & repair) with live `OneShotProgressStep[]` callbacks and `fillFailedPointCrawlParts` local fallback in `packages/generator-engine/src/point-crawl-staged.ts`
- [x] T013 [US1] Implement `pointCrawlConfig`, `generatePointCrawlLocal`, `buildPointCrawlPrompt`, and `pointCrawlToOutput` in `packages/generator-engine/src/public-point-crawl.ts` and export all point-crawl symbols from `packages/generator-engine/src/index.ts`
- [x] T014 [US1] Register the `"point-crawl"` campaign generator definition (with scale, pointCount `6..15`, density, dangerLevel, secretFrequency options) and exemplar in `packages/generator-engine/src/campaign-generator-registry.ts` and `packages/generator-engine/src/campaign-generator-exemplars.ts`
- [x] T015 [P] [US1] Wire `pointCrawlConfig` and `generatePointCrawl` into `apps/web/src/lib/services/seo/generator-config.ts`, `apps/web/src/lib/services/seo/generator-engine-specialized.ts`, `apps/web/src/lib/services/seo/generator-engine-core.ts`, and `apps/web/src/lib/services/seo/generator-engine.ts`
- [x] T016 [P] [US1] Create `PointCrawlFormFields.svelte` (Genre, Crawl Scale, Number of Points `6–15`, Interconnection Density, Danger Level, Secret Route Frequency, and Free-Text Premise, preserving genre on "Surprise Me") in `apps/web/src/lib/components/seo/fields/PointCrawlFormFields.svelte`
- [x] T017 [P] [US1] Create interactive SVG graph component `PointCrawlGraph.svelte` (role-badged nodes, obvious/hidden/rumoured/one-way/gated route styling, click-to-inspect node/route detail card, neighbour highlighting, pointer drag repositioning + reset layout, save-subset checkboxes, `useAI` gating that hides AI steering inputs when AI is disabled/off, and `exportPng()`) in `apps/web/src/lib/components/seo/PointCrawlGraph.svelte`
- [x] T018 [US1] Wire `PointCrawlGraph.svelte` into `apps/web/src/lib/components/seo/layout/GeneratorDiagrams.svelte` and `apps/web/src/lib/components/generators/GeneratorDraftReview.svelte`
- [x] T019 [US1] Wire `"point-crawl"` into `apps/web/src/lib/components/seo/generator-page-meta.ts`, `apps/web/src/lib/components/seo/generator-page-drafts.ts`, `apps/web/src/lib/components/seo/generator-page-generation.ts` (with staged progress steps), `apps/web/src/lib/components/seo/GeneratorPageFormFields.svelte`, and `apps/web/src/lib/components/seo/GeneratorPageContent.svelte`

**Checkpoint**: User Story 1 is complete and independently testable on `/generators/point-crawl` and in the in-app generator modal.

---

## Phase 4: User Story 2 - Surgical Per-Node & Per-Route Regeneration (Priority: P2)

**Goal**: Enable GMs to replace or steer any single location node or route connection (`{ kind: "node" | "route", id }`) with an optional custom instruction while keeping graph topology, neighbouring nodes, and key-before-lock invariants intact.

**Independent Test**: Generate a point crawl, click Rewrite or enter a custom steering note on one node (including a node that holds a gate key) and one route, and verify only the targeted part changes while topology and key-before-lock validity remain intact.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T020 [P] [US2] Add unit tests for `regeneratePointCrawlPart` covering single-node rewrite, single-route rewrite, preservation of `unlocksRouteIds` key obligations, sibling route distinctness repair, and AI failure/abort fallback in `packages/generator-engine/src/point-crawl.test.ts`
- [x] T021 [P] [US2] Add component tests for `PointCrawlRefinePanel.svelte` (per-node and per-route regeneration, custom steering instruction input, `useAI={false}` / AI Disabled mode hiding AI steering controls and running local rewrite seamlessly, concurrent request token guard, and GM cheat-sheet copy) in `apps/web/src/lib/components/seo/point-crawl.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Implement `regeneratePointCrawlPart` (for `target: { kind: "node" | "route", id }` with optional `instruction` and `AbortSignal`, preserving topology and key-before-lock invariants) in `packages/generator-engine/src/point-crawl-repair.ts` and expose `regeneratePointCrawlPart` on `GeneratorEngine` in `apps/web/src/lib/services/seo/generator-engine-specialized.ts` and `apps/web/src/lib/services/seo/generator-engine-core.ts`
- [x] T023 [US2] Create `PointCrawlRefinePanel.svelte` (listing nodes and routes with 1-click Rewrite, optional steering input via `OneShotPartRow.svelte` gated on `useAI && !aiDisabled`, and Copy GM Sheet) in `apps/web/src/lib/components/seo/PointCrawlRefinePanel.svelte` and render it in `outputExtras` for `"point-crawl"` in `apps/web/src/lib/components/seo/GeneratorPageContent.svelte` and in `PointCrawlGraph.svelte`'s selected node/route inspector

**Checkpoint**: User Stories 1 and 2 work together; users can surgically refine any node or route.

---

## Phase 5: User Story 3 - Save Selected or All Points into the Campaign Vault as Connected Locations (Priority: P2)

**Goal**: Allow users to save all generated points or a user-selected subset into their Codex Cryptica vault, creating a `Location` entity per selected point (with concise route summary labels on graph connections and a full `"Routes & Exits"` section in each Location's lore) plus a master overview `Note` entity linking to those locations, with a 1-click action to open the network in the Entity Explorer / Relationship Graph.

**Independent Test**: Generate a point crawl, toggle a subset of nodes (e.g., 5 of 8) or keep all selected, save to the vault (both via `/generators/point-crawl` "Save to Codex" and via in-app `CampaignGeneratorModal`), and verify that `N` `Location` entities + `1` overview `Note` entity are created with accurate `route` connection labels, `"Routes & Exits"` markdown sections, and 0 dangling connections to unselected nodes.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T024 [P] [US3] Add unit tests for `buildPointCrawlSaveDrafts` covering full save, partial subset save (`selectedNodeIds` filtering out routes to unselected nodes), route connection label formatting (`"2 hrs · Mountain Pass [Locked: Iron Seal]"`), `"Routes & Exits"` section generation, and empty-selection guard in `packages/generator-engine/src/point-crawl.test.ts`
- [x] T025 [P] [US3] Add unit tests for in-app multi-entity vault save (`savePointCrawlToVault`) and public `__codex_pending_import` batch handoff (including partial failure / storage error paths) in `apps/web/src/lib/services/generators/point-crawl-vault-save.test.ts` and `apps/web/src/lib/components/seo/generator-save-flow.test.ts`

### Implementation for User Story 3

- [x] T026 [US3] Implement `buildPointCrawlSaveDrafts` producing `N` `Location` drafts (with `## Routes & Exits` in `lore` and labelled `route` relationships between selected nodes) plus `1` master overview `Note` draft (`kind: "point-crawl"`, `mapImageDataUrl`, and `contains` relationships to all selected locations) in `packages/generator-engine/src/point-crawl-save.ts`
- [x] T027 [US3] Update `saveGeneratorOutput` in `apps/web/src/lib/components/seo/generator-save-flow.ts` and `useGeneratorSave` in `apps/web/src/lib/components/seo/layout/use-generator-save.svelte.ts` so saving a `pointCrawl` output writes the `ImportDraft[]` batch (respecting `selectedNodeIds` and attaching `mapImageDataUrl` to the overview `Note`) to `__codex_pending_import` for `SeoImportService`
- [x] T028 [US3] Implement `savePointCrawlToVault` in `apps/web/src/lib/services/generators/point-crawl-vault-save.ts` and wire it into `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte` and `apps/web/src/lib/components/generators/GeneratorDraftReview.svelte` with node-subset selection and an action to open the saved network directly in the Entity Explorer / Relationship Graph

**Checkpoint**: User Stories 1, 2, and 3 are functional; both public and in-app saves hydrate full connected location networks in the Vault.

---

## Phase 6: User Story 4 - Discover the Point Crawl Generator via Public Search & Hubs (Priority: P3)

**Goal**: Expose `/generators/point-crawl` across all discovery surfaces (`/generators`, all 13 genre theme hubs `/generators/[theme]`, `/tools`, `GeneratorSwitcherMenu.svelte`, `random-idea.ts`, and Help documentation), capture and upload its real-browser OG card to Cloudflare R2, and pass `discovery-audit.mjs`.

**Independent Test**: Navigate to `/generators/point-crawl`, `/generators`, `/generators/[theme]`, `/tools`, and the in-app Help panel; run `bun scripts/discovery-audit.mjs` and verify 0 errors.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T029 [P] [US4] Add route/catalogue registration tests in `apps/web/src/lib/components/seo/generator-page-meta.test.ts`, `apps/web/src/lib/components/seo/generator-theme-maps.test.ts`, and `apps/web/src/lib/content/help-generators.test.ts`

### Implementation for User Story 4

- [x] T030 [P] [US4] Add `"point-crawl"` to prerender entry lists and hub theme maps in `apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/+page.ts`, `apps/web/src/routes/(marketing)/generators/[theme]/[slug=generator_slug]/+page.ts`, and `apps/web/src/lib/components/seo/generator-theme-maps.ts`
- [x] T031 [P] [US4] Add the Point Crawl Generator card/entry to `apps/web/src/routes/(marketing)/generators/+page.svelte`, `apps/web/src/routes/(marketing)/generators/[theme]/+page.svelte`, `apps/web/src/routes/(marketing)/tools/+page.svelte`, `apps/web/src/lib/components/seo/GeneratorSwitcherMenu.svelte`, `apps/web/src/lib/services/seo/random-idea.ts`, and `apps/web/src/lib/seo/llms-generators.ts`
- [x] T032 [P] [US4] Write the Point Crawl Generator help guide in `apps/web/src/lib/content/help/point-crawl-generator.md`, update `apps/web/src/lib/content/help/in-app-generators.md`, and register the help article and feature hint in `apps/web/src/lib/config/help-content.ts` (Constitution VII)
- [x] T033 [US4] Capture a real-browser OpenGraph screenshot (`1200x630` JPEG) of `/generators/point-crawl`, upload to Cloudflare R2 (`https://assets.codexcryptica.com/og/generator-point-crawl.jpg`), delete the local temporary image file, and set `ogImage` / `ogImageAlt` in `apps/web/src/lib/components/seo/generator-page-meta.ts`

**Checkpoint**: All 4 user stories are complete and discoverable across every public and in-app surface.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final impacted-only validation, discovery audit, and code hygiene checks before PR handoff.

- [x] T034 Run `bun scripts/discovery-audit.mjs` and verify 0 errors across the discovery intent registry
- [x] T035 Run impacted-only validation (`bun run lint:changed`, `bun run test:changed`, scoped `svelte-check` in `apps/web` and `lint:types` in `packages/generator-engine`) and `bunx fallow audit --format json --quiet --explain --gate-marker agent`, fixing any findings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS** all user stories.
- **Phase 3 (US1 - P1 MVP)**: Depends on Phase 2.
- **Phase 4 (US2 - P2 Surgical Regeneration)**: Depends on Phase 2 and integrates with US1 UI components (`GeneratorPageContent.svelte`, `PointCrawlGraph.svelte`).
- **Phase 5 (US3 - P2 Multi-Entity Vault Save)**: Depends on Phase 2 and integrates with US1 review/save surfaces.
- **Phase 6 (US4 - P3 Discovery Hubs, Help & R2 OG Image)**: Depends on US1 route being renderable.
- **Phase 7 (Polish)**: Depends on Phases 1–6 completion.

### Parallel Opportunities

- **Phase 1**: `T002` and `T003` can run in parallel with `T001`.
- **Phase 2**: `T005` (`point-crawl-state.ts`), `T006` (`point-crawl-tables.ts`), and `T009` (`point-crawl-layout.ts`) can be built in parallel after `T004`.
- **Phase 3 (US1)**: `T015`, `T016` (`PointCrawlFormFields.svelte`), and `T017` (`PointCrawlGraph.svelte`) can run in parallel once `T013` is complete.
- **Phase 4 (US2) & Phase 5 (US3)**: Engine modules `point-crawl-repair.ts` (`T022`) and `point-crawl-save.ts` (`T026`) can be developed and unit-tested in parallel.
- **Phase 6 (US4)**: `T030`, `T031`, and `T032` touch independent files and can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Run US1 engine and UI tests in parallel:
bunx vitest run packages/generator-engine/src/point-crawl.test.ts
bunx vitest run apps/web/src/lib/components/seo/point-crawl.test.ts

# Build independent US1 UI components in parallel after public-point-crawl.ts is ready:
# - apps/web/src/lib/components/seo/fields/PointCrawlFormFields.svelte (T016)
# - apps/web/src/lib/components/seo/PointCrawlGraph.svelte (T017)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Discovery registration & type IDs) + Phase 2 (Foundational `point-crawl-*` engine & playability checks).
2. Complete Phase 3 (User Story 1: Local + Staged AI generation + `PointCrawlGraph.svelte` + `/generators/point-crawl` + in-app generator).
3. **STOP and VALIDATE**: Verify <200ms local generation, staged AI fallback, and interactive SVG graph inspection.

### Incremental Delivery

1. **Foundation + US1 (P1)**: Playable Point Crawl Generator with interactive visual graph.
2. **Add US2 (P2)**: Surgical single-node and single-route regeneration (`PointCrawlRefinePanel.svelte`).
3. **Add US3 (P2)**: Full & subset multi-entity Vault Save (`N` connected `Location` entities + `1` overview `Note` entity).
4. **Add US4 (P3)**: Hub listings, Help article, R2 OG screenshot, and `discovery-audit.mjs` verification.
