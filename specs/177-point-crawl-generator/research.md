# Phase 0 Research: Point Crawl Generator (`177-point-crawl-generator`)

**Date**: 2026-10-16  
**Feature**: [spec.md](./spec.md) | **Issue**: [#2479](https://github.com/eserlan/Codex-Cryptica/issues/2479)

---

## 1. Interactive Graph Visualization Component (`PointCrawlGraph.svelte`)

### Decision

Build a dedicated, self-contained interactive SVG component `apps/web/src/lib/components/seo/PointCrawlGraph.svelte` backed by a pure, deterministic layout and geometry module `packages/generator-engine/src/point-crawl-layout.ts` (following the exact pattern of `StarSystemDiagram.svelte` + `packages/generator-engine/src/star-system-diagram.ts` and `ConstellationChart.svelte`).

### Rationale

- **Instant (<200ms) SSR & No-Login Rendering (SC-002)**: Pure SVG calculated from deterministic topological layers (`start` at depth 0 → intermediate branching layers → `goal` at max depth, with side/secret nodes offset onto upper/lower rails) renders immediately on both SSR and client mount without waiting for heavy canvas/WebGL initialization.
- **Interactive Inspection, Dragging & Save-Subset Selection (FR-008, FR-010)**:
  - Clicking a node selects it for inspection in a side/bottom detail card, highlights its immediate neighbour nodes and incident routes, and lets the user toggle whether the node is included in the Vault Save subset (`selectedNodeIds`) or trigger 1-click surgical regeneration (`FR-009`).
  - Clicking or hovering a route edge selects the route, displaying its travel time, terrain, risk, signpost preview, visibility (`obvious` solid line, `hidden` dashed line, `rumoured` dotted line), directionality (arrow markers for `one-way`), and gate badge (lock icon + unlocking node highlight).
  - Pointer drag handlers (`onpointerdown` / `onpointermove` / `onpointerup` with SVG coordinate conversion via `getScreenCTM()`) update a reactive `nodePositions` map (`Record<string, { x: number; y: number }>`) so GMs can rearrange node positions for readability and reset to the computed layout at any time.
- **Zero-Config PNG Rasterization (`exportPng`)**: Reuses `$lib/utils/svg-export.ts` (`svgToPngBlob`) so the graph can be copied to clipboard, viewed fullscreen, or attached as a rasterized map image on the master overview `Note` entity when saving to the vault.

### Alternatives Considered

- **Cytoscape.js inside the SEO Generator**: Rejected for the generator preview because Cytoscape is a heavy client-only canvas library (~400KB) that cannot SSR, requires complex style synchronization for multi-badge route labels, and is unnecessary when structural graph rewiring (adding/deleting nodes/edges) is explicitly out of scope for the generator preview (Clarification Q3). Once saved to the vault, entities open natively in the app's Cytoscape-backed Relationship Graph.
- **Mermaid static diagrams**: Rejected because Mermaid does not support node dragging, save-subset checkboxes, or interactive per-node/per-route surgical regeneration controls.

---

## 2. Data-First State & Deterministic Playability / Graph Invariants

### Decision

Adopt the `one-shot-*` architecture (`packages/generator-engine/src/one-shot-state.ts`, `one-shot-playability.ts`, `one-shot-state-checks.ts`, `one-shot-dedupe.ts`) into a sibling module family `packages/generator-engine/src/point-crawl-*.ts`:

1. `point-crawl-state.ts`: Defines `PointCrawlNetwork`, `PointCrawlNode`, `PointCrawlRoute`, `PointCrawlGate`, and deterministic `renderPointCrawlRouteSummary(route)` + `renderPointCrawlMarkdown(crawl)` + `renderPointCrawlGmSheet(crawl)`.
2. `point-crawl-topology.ts`: Builds and normalizes scale-aware topologies (`6–15` nodes) across the 3 interconnection densities (`Linear-leaning`, `Balanced branching`, `Highly interconnected`), guaranteeing:
   - Exactly 1 `start` node and `>= 1` `goal` node.
   - `>= 2` branching decision nodes (`outDegree >= 2`).
   - Every node reachable from `start` via directed/bidirectional traversal.
   - At least 1 cycle/loop (`undirectedEdges >= nodes`).
   - At least 1 `hidden` or `rumoured` shortcut route.
   - At least 1 gated route whose `gate.unlockedByNodeId` is guaranteed by BFS to be reachable from `start` **without** traversing the gated route itself (preventing key-behind-lock softlocks).
3. `point-crawl-playability.ts`: Runs deterministic checks on both local and AI-generated crawls:
   - Graph reachability & key-before-lock BFS verification.
   - Sibling route trade-off distinctness (`textOverlap(routeA, routeB) < 0.6` for routes sharing a `fromNodeId`).
   - Concrete facts / anti-vagueness check (`isVague` on gate requirements, signposts, and node clues/keys).
   - Automatic repair pass (`repairPointCrawlPlayability`) that fixes softlocks by reassigning `unlockedByNodeId` to a pre-gate reachable node and rewrites vague/overlapping routes before surfacing any residual warnings.

### Rationale

- Guarantees **SC-001** (100% of generated point crawls pass reachability, loop, shortcut, key-before-lock, and anti-vagueness invariants) regardless of LLM output quality.
- Ensures route prose and graph connection labels never contradict each other because both are rendered deterministically from `PointCrawlRoute` fields.

---

## 3. Staged AI Generation, Bounded Concurrency & Granular Fallback

### Decision

Implement `packages/generator-engine/src/point-crawl-staged.ts` and `point-crawl-repair.ts` following `one-shot-staged.ts` and `one-shot-repair.ts`:

- **Stage 1 (`topology`)**: Generate crawl title, premise, scale-matched travel units, node skeleton (names, roles, initial hooks), and route topology (or normalize AI-proposed edges through `normalizePointCrawlTopology`).
- **Stage 2 (`locations-and-routes`)**: Stock rich node details (sensory description, why visit, encounter/hazard, clue/reward/key) and route trade-offs using a bounded concurrency pool (`runPool(..., 3)`) so 6–15 node crawls complete fast without hitting rate limits. If any individual node or route call fails or times out, `fillFailedPointCrawlParts` populates only that node/route from local genre-and-scale tables and records a `PointCrawlGap` warning.
- **Stage 3 (`playability`)**: Run `checkPointCrawlPlayability` and targeted repair (`repairPointCrawlParts`) for any overlapping sibling routes or vague gate requirements.
- **Surgical Regeneration (`regeneratePointCrawlPart`)**: Accepts `target: { kind: "node" | "route"; id: string }` and optional `instruction?: string`. Regenerates only that node or route while locking topology, node IDs, and any unlocking key obligation (`unlocksRouteIds`) held by that node.

### Rationale

- Prevents 12–15 node crawls from timing out in a single monolithic LLM call or discarding 90% good work when one node fails (FR-007, Edge Case 4).
- Allows sharing the progress indicator pattern (`OneShotProgressStep` / `GeneratorProgressStep`) in `SEOGeneratorLayout.svelte` and phase events in `CampaignGeneratorModal.svelte`.

---

## 4. Multi-Entity Vault Save & Connection Hydration (`FR-010`)

### Decision

Build a pure batch-builder helper `packages/generator-engine/src/point-crawl-save.ts` (`buildPointCrawlImportDrafts` / `buildPointCrawlVaultBatch`) used by both the public `/generators/point-crawl` "Save to Codex" flow and the in-app `CampaignGeneratorModal` save flow:

1. **Entities Created**:
   - **1 Master Overview `Note` Entity**:
     - `type: "note"`, `kind: "point-crawl"`, `title: crawl.title`
     - `content` / `lore`: Full crawl premise, overview table, playability summary, and `[[Location Title]]` wiki links to every selected location node.
     - `relationships`: Explicit `{ title: locationTitle, type: "contains", label: node.role }` relationships to all selected locations.
     - `mapImageDataUrl`: Optional rasterized PNG of the `PointCrawlGraph` SVG so the overview note has the visual network diagram attached.
   - **`N` `Location` Entities** (one for each node in `selectedNodeIds`, defaulting to all nodes):
     - `type: "location"`, `title: node.name`
     - `content`: Node summary, sensory description, and reason to visit.
     - `lore`: Encounter/hazard, clue/reward/key, plus a deterministic **`## Routes & Exits`** Markdown section listing every route connecting to another _selected_ location (with `[[Target Location]]`, travel time, terrain, visibility, directionality, risk, signpost, and gate requirement).
     - `relationships`: For every route where both `fromNodeId` and `toNodeId` are in `selectedNodeIds`, emit a relationship entry `{ title: targetNode.name, type: "route", label: formatRouteConnectionLabel(route) }` where `label` is a concise graph edge label such as `"2 hrs · Mountain Pass [Locked: Iron Key]"` or `"20 min · Flooded Culvert [Hidden]"` (Clarification Q2).
2. **Public Save Flow (`__codex_pending_import`)**:
   - `SeoImportService.checkAndHandlePendingImport()` in `apps/web/src/lib/services/seo/import-handler.ts` **already** supports an array of `ImportDraft[]` with `relationships: [{ title, type, label }]` and `mapImageDataUrl`!
   - When saving a point crawl from `/generators/point-crawl`, `saveGeneratorOutput` writes the `ImportDraft[]` array (selected `Location` drafts + master overview `Note` draft last so `lastImportedId` selects the overview note, plus an optional `?view=graph` or notification action to open the Relationship Graph).
3. **In-App Save Flow (`CampaignGeneratorModal.svelte` / `point-crawl-vault-save.ts`)**:
   - In `GeneratorDraftReview.svelte` (via a dedicated `PointCrawlDraftReviewSection.svelte`), the user can inspect the interactive `PointCrawlGraph`, toggle which nodes are included in `selectedNodeIds`, and click **Save Point Crawl (`N` Locations + Overview Note)** (with an option to open directly in the Relationship Graph).
   - A dedicated helper `apps/web/src/lib/services/generators/point-crawl-vault-save.ts` creates the selected `Location` entities and master overview `Note` entity via `vault.createEntity` and wires the labelled route connections via `vault.addConnection(sourceId, targetId, "route", connectionLabel)`, then navigates to the created network (either selecting the overview entity or switching `layoutUIStore` to the Graph view).

### Rationale

- Zero schema migrations required: leverages `Entity.connections` (`{ target, type, label }`) and `SeoImportService`'s existing `ImportDraft[]` batch importer.
- Filtering routes by `selectedNodeIds.has(fromNodeId) && selectedNodeIds.has(toNodeId)` guarantees 0 dangling connections when a user saves a partial subset of nodes (Edge Case 5).

---

## 5. Discovery Intent Governance & Bounded Responsibility Strategy

### Decision

- **Discovery Intent Registry (`apps/web/src/lib/content/discovery/entries/generators.ts`)**:
  - Register `id: "generator-point-crawl"` with `canonicalPath: "/generators/point-crawl"`, `primaryIntent: "point crawl generator"`, `aliases: ["pointcrawl generator", "rpg point crawl generator", "dnd point crawl generator", "random point crawl", "point crawl map generator"]`, `userJob: "create"`, `subject: "point-crawl"`, and `relatedIds: ["answer-point-crawl"]`.
  - Update `answer-point-crawl` in `apps/web/src/lib/content/discovery/entries/answers.ts` to cross-link `relatedIds: ["generator-point-crawl"]` (and record `acknowledgedOverlap` if flagged by `discovery-audit.mjs` since `answer-point-crawl` has `userJob: "explain"` and `generator-point-crawl` has `userJob: "create"`).
- **Bounded Responsibility (Constitution XIV)**:
  - Keep all point-crawl logic in focused new files under 400 lines each (`packages/generator-engine/src/point-crawl-*.ts`, `PointCrawlGraph.svelte`, `PointCrawlRefinePanel.svelte`, `PointCrawlFormFields.svelte`, `point-crawl-vault-save.ts`).
  - Existing large orchestrator files (`GeneratorPageContent.svelte`, `GeneratorPageFormFields.svelte`, `CampaignGeneratorModal.svelte`, `campaign-generator-registry.ts`) receive only thin 1-to-5 line dispatch entries delegating to the extracted modules.
