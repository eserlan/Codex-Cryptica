# Point Crawl generation quality improvements

**Branch**: `feat/point-crawl-quality-plan`
**Date**: 2026-10-16
**Builds on**: `specs/177-point-crawl-generator/`
**Scope**: Improve the existing Point Crawl Generator without replacing its architecture or adding a new public route.

## Goal

Keep the current deterministic-topology → AI-enrichment → deterministic-repair pipeline, while making the generated network's labels, density, timing, dependencies, route prose, and rendered output agree with one another.

The work is successful when:

- each density option produces a measurably different, bounded route count;
- structural node labels describe actual graph properties;
- every enrichment batch receives the same structured adventure plan;
- AI prose cannot change route duration, gate placement, topology, or other mandatory dependencies;
- a structured countdown, when present, is achievable through at least one playable Start-to-Goal path;
- bidirectional routes render coherent approach information from both ends;
- each route appears once in the overview while saved Location entities retain their own relevant exits;
- local generation, AI fallback, surgical regeneration, selective saving, and the existing public URL continue to work.

## Current foundation

The existing architecture remains the foundation:

- `point-crawl-topology.ts` constructs and normalises the graph.
- `point-crawl-playability.ts` validates reachability, loops, secrets, gates, key placement, route overlap, and vague facts.
- `point-crawl-staged.ts` builds a deterministic skeleton, enriches it in concurrent batches, and repairs the result.
- `point-crawl-repair.ts` regenerates one node or route while preserving topology.
- `point-crawl-state.ts` owns the domain types and deterministic renderers.
- `PointCrawlGraph.svelte` visualises the resulting structured network.

The main gaps are inside the mechanical rules and the mechanics/prose boundary. A separate graph package, another creative writing pass, new persistence, and a new discovery page are outside this plan.

## Technical context

- **Runtime**: TypeScript 6.0.3, Svelte 5, SvelteKit 2, Bun 1.3.14.
- **Core workspace**: framework-free `packages/generator-engine`.
- **Web integration**: existing public generator and campaign generator surfaces in `apps/web`.
- **Dependencies**: no new third-party dependency.
- **Storage**: unchanged; generated state remains transient and saved entities use the existing vault/import paths.
- **Performance**: retain local generation and layout below 200 ms for 15 nodes.
- **Compatibility**: no URL, database, OPFS, IndexedDB, or entity-schema migration.

## Design

### 1. Bound route density before assigning semantic roles

Replace the current additive edge construction with an edge-budgeted builder.

For `N` nodes, use these deterministic targets:

| Density               |              Route target | Eight-node result | Intent                                                                    |
| --------------------- | ------------------------: | ----------------: | ------------------------------------------------------------------------- |
| Linear-leaning        |                   `N + 1` |                 9 | A connected network with one principal loop and at least two real choices |
| Balanced branching    |          `ceil(1.35 × N)` |                11 | Several alternatives without making most sites adjacent                   |
| Highly interconnected | `min(24, ceil(1.75 × N))` |                14 | Many cross-links and bypasses while retaining readable structure          |

Construction order:

1. Build a connected layered backbone from Start to every Goal.
2. Add the minimum edges needed for at least two branching nodes.
3. Add one cycle and the configured number of secret routes.
4. Add ranked candidate edges until the selected density target is reached.
5. Protect connectivity, gate progression, secret access, and the required cycle when normalising or pruning excess edges.

The normaliser must enforce both a lower and upper edge bound. It may remove only non-protected edges and must re-run reachability and key-before-lock checks after pruning.

Move reusable graph calculations into a new `point-crawl-graph-analysis.ts` module. This keeps new behaviour out of the existing 594-line topology module and gives tests a focused API for degree, incident routes, goal dominance, optionality, and edge protection.

### 2. Separate structural roles from site traits

The current `role` field mixes topology (`hub`, `start`, `goal`) with fiction (`hazard`, `obstacle`) and assigns both before edges exist. Replace it with:

```ts
type PointCrawlStructuralRole =
  "start" | "goal" | "hub" | "chokepoint" | "secret" | "optional" | "connector";

type PointCrawlSiteTrait = "hazard" | "obstacle";
```

Assign structural roles after the final edge set is known:

- **start / goal**: fixed by the generated objective structure;
- **chokepoint**: a non-start, non-goal node that lies on every playable path from Start to at least one Goal;
- **secret**: a node whose usable access is hidden or rumoured rather than ordinary;
- **hub**: a remaining node with at least three incident usable routes;
- **optional**: removing the node still leaves every Goal reachable;
- **connector**: any remaining transit node.

`hazard` and `obstacle` become independent traits chosen from local tables or enrichment. A crawl is not required to contain a chokepoint; the label appears only when the graph earns it.

The graph analysis must treat a bidirectional route as incident to both endpoints and a one-way route according to its actual direction. Goal-dominance checks must use playable paths, including gate state, rather than raw undirected connectivity.

### 3. Add a compact shared adventure plan

Extend `PointCrawlNetwork` with an `adventurePlan` produced locally and optionally enriched during Stage 1:

```ts
interface PointCrawlAdventurePlan {
  objective: string;
  travelAssumption: string;
  discoveries: PointCrawlDiscovery[];
  outcomes: PointCrawlOutcome[];
  detourPayoffs: PointCrawlDetourPayoff[];
  clock?: PointCrawlClock;
}
```

The nested records use stable IDs and references to existing node, route, gate, discovery, and outcome IDs. The plan records:

- the shared objective and travel assumption;
- which node contains each major discovery;
- which discoveries or gates enable each ending or major outcome;
- why optional nodes are strategically useful;
- one optional clock with an explicit trigger, budget, and consequence.

Every Stage 2 batch receives the complete immutable adventure plan in addition to its local node and route slice. This supplies shared context without adding another model call.

Malformed or incomplete Stage 1 plan data falls back per field to the local plan. Unknown references are discarded and reported as repair warnings. Existing per-batch fallback behaviour remains unchanged.

### 4. Make travel time mechanical and clocks verifiable

Replace free-form route duration with structured data:

```ts
interface PointCrawlDuration {
  value: number;
  unit: "minute" | "hour" | "day" | "turn" | "jump";
}
```

Formatting remains deterministic. Physical units are normalised for comparison; `jump` clocks compare only with jump routes. Stage 2 and route regeneration may enrich terrain, risks, and approach details, but they do not alter duration.

`PointCrawlClock` records:

- a label;
- `startsAt: "crawl-start" | { nodeId: string }`;
- a duration budget in a compatible unit family;
- the consequence of expiry.

Add a weighted playable-path calculation whose state includes the current node and acquired gate permissions. A clock is valid only when at least one relevant Goal is reachable from its trigger before the budget expires. Repair expands an undersized budget to the fastest playable route plus a small deterministic margin; it never silently moves the trigger.

Prompts must keep numeric countdowns out of free-form premise and location prose. The renderer owns the canonical clock statement from structured data.

### 5. Tighten the enrichment boundary

Stage 1 may enrich names, premise, and the structured adventure plan while preserving node IDs, endpoints, layers, and edge count.

Stage 2 may enrich:

- sensory description;
- reason to visit;
- encounter or hazard;
- the discovery already assigned to that node;
- route terrain, route-wide risk, and directional approach information.

Stage 2 may not introduce a new mandatory key, ritual, vehicle, countdown, finale requirement, or route duration. Optional colour and complications are allowed when they do not become prerequisites.

Add separate directional approach fields for bidirectional routes. Rendering a route from either endpoint selects the corresponding approach text; one-way routes expose only the permitted approach. Sibling-route distinctness must compare every usable choice incident to a node, including bidirectional routes stored with that node as `toNodeId`.

Surgical regeneration receives the full adventure plan and preserves duration, endpoints, gate data, direction, visibility, assigned discoveries, and outcome requirements. Invalid AI edits fall back locally for the targeted part.

### 6. Reduce deterministic repetition

Change the overview renderer to produce:

1. a compact network summary, including the structured clock when present;
2. keyed locations without repeated exit paragraphs;
3. one canonical route table/list containing each route once.

Restrict the GM sheet to operational information that is not already obvious in the overview:

- clocks and triggers;
- keys, gates, and discovery locations;
- outcome requirements;
- secret routes and optional-site payoffs.

Keep `buildLocationLore()` unchanged in purpose: every saved Location entity still receives its own incident `Routes & Exits`. The graph inspector remains the primary interactive place for complete route detail.

Update the Help article so it accurately documents 6–15 locations, the existing controls, PNG map export, structural labels, clocks, and selective vault saving.

## Validation rules

The final playability pass must report or repair all of the following:

- route count falls within the selected density budget;
- Start and every Goal remain reachable under direction and gate rules;
- at least two nodes present genuine route choices;
- the graph contains the required loop and configured secret-route count;
- every structural role matches the final graph;
- every plan reference resolves to an existing object;
- every gate key is obtainable before its route;
- every clock has compatible units and an achievable playable path;
- sibling choices are distinct from either endpoint of bidirectional routes;
- every bidirectional route has coherent approach text for both directions;
- no saved subset produces dangling routes or plan references.

Warnings must identify the affected node, route, clock, discovery, or outcome so surgical regeneration and debugging remain possible.

## File layout

```text
packages/generator-engine/src/
├── point-crawl-state.ts              # Revised domain types and lean renderers
├── point-crawl-graph-analysis.ts     # New degrees, dominance, path and edge-budget helpers
├── point-crawl-topology.ts           # Edge-budgeted construction and orchestration
├── point-crawl-playability.ts        # Expanded validation and repair
├── point-crawl-staged.ts             # Shared Stage 1 plan and immutable Stage 2 mechanics
├── point-crawl-repair.ts             # Plan-aware surgical regeneration
├── point-crawl-save.ts               # Subset filtering for plan references and saved lore
├── public-point-crawl.ts             # Prompt/parser compatibility
└── point-crawl.test.ts               # Engine behaviour and regressions

apps/web/src/lib/components/seo/
├── PointCrawlGraph.svelte            # Thin graph composition shell
├── PointCrawlInspector.svelte        # Extracted node/route details and regeneration controls
├── PointCrawlGraphToolbar.svelte      # Extracted selection, layout and export controls
└── point-crawl.test.ts               # UI and service integration coverage

apps/web/src/lib/content/help/
└── point-crawl-generator.md           # Corrected workflow and limitations
```

`PointCrawlGraph.svelte` already exceeds the Constitution XIV review trigger. Any required role, route, or clock UI changes must extract the inspector and toolbar rather than further enlarging the component. `point-crawl-topology.ts` also exceeds the trigger, so graph analysis and path algorithms belong in the new sibling module.

## Constitution check

- **Library-first**: graph semantics, duration handling, plan validation, and rendering stay in `packages/generator-engine`; Svelte remains a thin UI.
- **TDD**: each changed behaviour starts with a failing success-path test and a meaningful negative or repair-path test.
- **Simplicity**: extend the existing PC engine; add no package and no third-party dependency.
- **AI validation**: all model output is parsed against stable IDs and repaired or rejected per field.
- **Privacy**: AI opt-in and local fallback behaviour remain unchanged; no new data leaves the browser.
- **User documentation**: update the existing Help article in the same change.
- **Dependency injection**: no new service singleton or hidden dependency is introduced.
- **Natural language**: use “chokepoint” only for a mechanically unavoidable location and explain clocks in plain language.
- **Bounded responsibility**: extract graph analysis from the oversized topology module and UI controls/inspection from the oversized graph component.
- **Discovery governance**: no new or repositioned discovery page; the existing canonical intent and URL remain unchanged.

## Delivery sequence

1. Add graph analysis and density budgets, then derive honest structural roles.
2. Add structured duration, playable weighted paths, and clock validation.
3. Add the shared adventure plan and pass it through local, staged, fallback, and regeneration flows.
4. Tighten enrichment contracts and directional route rendering.
5. Simplify overview/GM output and split the oversized graph UI while integrating new fields.
6. Correct Help content and run impacted-only verification plus specialist review.

This order keeps each stage testable and avoids changing prompts before the mechanical contract is stable.
