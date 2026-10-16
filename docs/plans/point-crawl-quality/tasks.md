# Tasks: Point Crawl generation quality improvements

**Input**: [plan.md](./plan.md)
**Tests**: Required before implementation for every changed behaviour, with a success path and a meaningful negative, fallback, or repair path.
**Scope**: Existing Point Crawl Generator only; no new public route, dependency, or persistence layer.

## Phase 1: Graph analysis and density foundation

**Goal**: Give all subsequent work a tested graph-analysis API and distinct, bounded density settings.

**Independent test**: Generate every point count from 6–15 at each density. Each result hits its density target, remains playable, has at least two genuine choices and one loop, and never requires pruning a protected gate or secret route.

- [x] T001 Add table-driven tests for route budgets, density separation, connectivity, branching and loops across 6–15 nodes in `packages/generator-engine/src/point-crawl.test.ts`
- [x] T002 [P] Add graph-analysis tests for incident routes, degree, dominance and optional nodes, including one-way cases, in `packages/generator-engine/src/point-crawl-graph-analysis.test.ts`
- [x] T003 Implement framework-free graph analysis and density target calculation in `packages/generator-engine/src/point-crawl-graph-analysis.ts`
- [x] T004 Refactor edge construction in `packages/generator-engine/src/point-crawl-topology.ts` to build a connected backbone and add edges only up to the selected density target
- [x] T005 Extend normalisation in `packages/generator-engine/src/point-crawl-topology.ts` and validation in `packages/generator-engine/src/point-crawl-playability.ts` to prune only unprotected excess edges, re-check all invariants, and report an explicit density issue when repair is impossible

**Checkpoint**: Density options are mechanically distinct and all generated networks remain playable.

## Phase 2: Honest structural roles

**Goal**: Ensure every displayed structural label is earned by the final graph.

**Independent test**: In crafted graphs, only true goal-dominating nodes are labelled chokepoints, hubs have at least three usable incident routes, secret sites require hidden or rumoured access, and optional sites can be removed without blocking every Goal.

- [x] T006 Add failing role-classification tests covering real and false chokepoints, hubs reached through reversed bidirectional edges, secret sites with an accidental obvious entrance, optional sites, connectors, and multiple Goals in `packages/generator-engine/src/point-crawl-graph-analysis.test.ts`
- [x] T007 Update the node contract in `packages/generator-engine/src/point-crawl-state.ts` to separate `PointCrawlStructuralRole` from `PointCrawlSiteTrait`, including renderer labels and backward-safe parsing defaults
- [x] T008 Assign structural roles after final topology normalisation and assign hazard/obstacle traits independently in `packages/generator-engine/src/point-crawl-topology.ts`
- [x] T009 Extend `checkPointCrawlPlayability()` and repair handling in `packages/generator-engine/src/point-crawl-playability.ts` so stale or dishonest structural roles are detected and recomputed
- [x] T010 Update graph layout badges, save labels, campaign/public adapters, and affected tests for the revised role/trait contract in `packages/generator-engine/src/point-crawl-layout.ts`, `packages/generator-engine/src/point-crawl-save.ts`, `packages/generator-engine/src/public-point-crawl.ts`, and `packages/generator-engine/src/campaign-generator-registry.test.ts`

**Checkpoint**: “Chokepoint”, “Hub”, “Secret”, and “Optional” describe graph behaviour rather than a fixed role sequence.

## Phase 3: Structured travel, clocks, and shared adventure plan

**Goal**: Make timing and major narrative dependencies shared, referentially valid, and mechanically checkable.

**Independent test**: A crawl with a Start-triggered deadline always has at least one playable route to a Goal within budget; an impossible deadline, incompatible unit, missing discovery node, or outcome pointing to an unknown requirement is rejected or repaired deterministically.

- [x] T011 Add focused tests for duration parsing/formatting and weighted paths with gate acquisition in `packages/generator-engine/src/point-crawl-graph-analysis.test.ts`
- [x] T012 Add structured duration, clock, discoveries, outcomes, detour payoffs, and adventure plan state types
- [x] T013 Implement duration conversion and weighted playable-path search over node and acquired-gate state
- [x] T014 Generate a local adventure plan and structured route durations in topology generation
- [x] T015 Validate clock feasibility and plan references in `packages/generator-engine/src/point-crawl-playability.ts`
- [x] T016 Filter overview plan references when saving a node subset

**Checkpoint**: Travel and adventure logic can be validated independently of prose in local and saved-subset outputs.

## Phase 4: Plan-aware staged enrichment and regeneration

**Goal**: Give every AI batch the same immutable adventure logic and prevent prose enrichment from changing mechanics.

**Independent test**: All detail batches receive identical adventure-plan context; AI attempts to change duration, endpoints, gates, assigned discoveries, clocks, or outcome requirements are ignored, while valid atmosphere and route detail are accepted. Abort and malformed-response behaviour still falls back at the smallest affected unit.

- [x] T017 Cover shared plan context across concurrent Stage 2 batches, forbidden duration overrides, partial batch failure, and cancellation in `packages/generator-engine/src/point-crawl.test.ts`
- [x] T018 Extend the Stage 1 prompt and parser to return a compact plan mapped to existing IDs and include the shared plan in every Stage 2 batch prompt
- [x] T019 Remove AI ownership of route duration and other mandatory mechanics from enrichment and full-response compatibility parsing
- [x] T020 Add forward/reverse approach fields and per-route fallbacks for bidirectional routes
- [x] T021 Verify node/route regeneration preserves plan assignments, duration, direction, visibility, endpoints, and gates; existing malformed-response and cancellation paths remain covered
- [x] T022 Pass the full plan into surgical prompts and reject mechanical edits during commit
- [x] T023 Compare sibling choices against usable incident routes at both endpoints

**Checkpoint**: Concurrent creative enrichment remains coherent because every batch shares one validated plan and cannot mutate its mechanics.

## Phase 5: Lean output and graph UI integration

**Goal**: Present the richer structure clearly while removing deterministic repetition.

**Independent test**: The overview contains each route exactly once, the GM sheet contains only operational secrets/dependencies, each saved Location still contains its own incident routes, and graph inspection shows correct direction-specific details and structural labels.

- [x] T024 Verify one overview entry per route, no duplicated node exits, concise GM reference, and per-Location `Routes & Exits` in focused renderer/save tests
- [x] T025 Simplify the overview and GM sheet and add plan, clock, role/trait, and directional-route rendering
- [x] T026 Component tests cover role badges, directional route inspection, selection, dragging, regeneration, and PNG export
- [x] T027 Extract node/route inspection and regeneration controls into `PointCrawlInspector.svelte` and `PointCrawlInspectorActions.svelte`
- [x] T028 [P] Extract selection, layout, fullscreen, and PNG controls into `PointCrawlGraphToolbar.svelte`
- [x] T029 Integrate structural role/trait and directional route presentation into graph inspection
- [x] T030 Verify public pending-import and in-app vault-save flows preserve the overview, Location exits, filtered references, and map attachment in the focused save-flow suites

**Checkpoint**: The public page, campaign modal, saved overview, saved Locations, and relationship graph present one coherent version of the crawl.

## Phase 6: Documentation and verification

**Goal**: Correct user guidance and complete repository quality gates.

- [x] T031 Update Help to document 6–15 locations, density behaviour, structural labels, clocks, directional inspection, PNG export, refinement, and selective saving
- [x] T032 Confirm Help article registration assertions pass; no generated fixtures needed changes
- [x] T033 Targeted tests, `bun run test:changed`, `bun run lint:changed`, and affected-workspace type checks pass; Fallow audit passes with no introduced complexity findings
- [x] T034 Run `bunx fallow review --base staging --brief` and the `codex-review` specialist review, resolving confident findings before PR handoff

## Dependencies and execution order

- Phase 1 blocks every later phase because density budgets and graph analysis define the revised topology contract.
- Phase 2 depends on Phase 1 because structural roles are derived from the final bounded graph.
- Phase 3 depends on Phase 1 and can begin alongside late Phase 2 adapter updates once graph-analysis APIs stabilise.
- Phase 4 depends on the Phase 3 data contract.
- Phase 5 depends on Phases 2–4 so the UI and renderers target the final shape once.
- Phase 6 follows all implementation phases.

Parallel work is deliberately limited where files overlap. Tasks marked `[P]` touch independent files and have no incomplete behavioural dependency.

## Suggested delivery slices

1. **Mechanical MVP**: T001–T010 — bounded density and truthful structural roles.
2. **Consistency slice**: T011–T023 — structured timing, shared plan, immutable mechanics, and correct bidirectional choices.
3. **Presentation slice**: T024–T032 — lean output, UI decomposition, integration, and Help.
4. **Handoff**: T033–T034 — impacted validation and specialist review.
