# Feature Specification: Point Crawl Generator

**Feature Branch**: `177-point-crawl-generator`  
**Created**: 2026-10-16  
**Status**: Draft  
**Input**: User description: "Point Crawl Generator (#2479) incorporating architectural learnings from the One-Shot Adventure Builder (#4099-#4122): topology and route mechanics as data first, staged generation with live progress and granular fallback, deterministic playability/graph checks (key-before-lock reachability, distinct route trade-offs, anti-vagueness, loops and secret shortcuts), surgical per-node and per-route regeneration, interactive visual node-and-edge graph, multi-entity vault save with automatic connections, and public SEO landing page."

## Clarifications

### Session 2026-10-16

- Q: When a user saves a generated point crawl to their vault, what entities should be created? (FR-010) → A: Create a `Location` entity per selected point (with connections between them) plus a master overview `Note` entity that holds the crawl premise/summary and links to those locations.
- Q: How should route metadata (travel time, terrain, visibility, directionality, and gate requirements) be stored on the saved Location entities? (FR-005, FR-010) → A: Store a concise route summary as the entity connection label on the graph and write a full "Routes & Exits" section into each saved Location entity's markdown content/lore.
- Q: In the generator's interactive graph view, should users only inspect, drag-reposition, and regenerate existing nodes and routes, or also manually add, delete, and rewire nodes and routes? (FR-008, FR-009) → A: Visual inspection, node dragging for layout, save-subset toggling, and per-node/per-route content regeneration only (manual structural editing happens in the Vault / Graph / Canvas after saving).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate & Inspect an Explorable Point Crawl Network (Priority: P1)

A Game Master (GM) visiting the public Point Crawl Generator page (or opening the generator inside their campaign) configures or accepts defaults for genre/theme, crawl scale (dungeon, settlement, city, wilderness, region, planet/system, or custom), point count (6–15 locations), branching/interconnection density, danger/travel difficulty, secret route frequency, and an optional free-text premise. They receive a coherent, navigable network of locations and routes rendered both as an interactive node-and-edge graph and as a structured playable dossier.

**Why this priority**: Delivering an immediately playable, visually navigable point crawl with meaningful decision points—both instantly offline/without login and with AI enhancement—is the core user job for both public search visitors and in-app GMs.

**Independent Test**: Open the Point Crawl Generator, generate a crawl across different scales (e.g. a 6-node dungeon crawl and a 12-node wilderness region), click nodes and routes on the visual graph to inspect their details, and verify that every node is reachable from the starting point, at least one destination/goal is present, branching paths have distinct trade-offs, at least one loop and one secret/shortcut exist, and any locked route has its required key/clue placed in a node reachable before the lock.

**Acceptance Scenarios**:

1. **Given** a user arrives on `/generators/point-crawl`, **When** the page loads or they click Generate without AI, **Then** a complete 6–15 node point crawl with an interactive visual graph and full location/route reference is produced immediately.
2. **Given** a user generates a point crawl with AI enabled, **When** generation runs, **Then** the user sees live stage-by-stage progress (establishing premise & graph topology, stocking locations & routes, checking playability), and if any single location step fails, only that node falls back to local templates and is flagged for optional single-node re-roll rather than discarding the whole crawl.
3. **Given** a generated point crawl graph, **When** the user clicks a location node or hovers/clicks a route edge, **Then** the interface highlights the selected node and its neighbouring connections and displays its playable details (role, description, why visit, encounter/hazard, clue/reward for nodes; travel time/distance, terrain, risk, signpost/preview, visibility, directionality, and blocker/gate requirement for routes).
4. **Given** any generated point crawl, **When** structural and playability checks run, **Then** the graph is guaranteed to have a clear starting point, at least one goal/destination node, at least one explorable loop, at least one secret/shortcut route, distinct risk/find trade-offs at branching nodes, concrete (non-vague) gate/clue names, and every gated route's unlocking key/clue located in a node reachable from the start without crossing the locked route.

---

### User Story 2 - Surgical Per-Node & Per-Route Regeneration (Priority: P2)

After generating a point crawl, the GM likes the overall network and most locations, but wants to replace or steer a single location node or a specific route (for example, turning a side location into a sunken shrine or making a mountain pass more hazardous) without losing the rest of the crawl or breaking the graph's connections and key-lock logic.

**Why this priority**: Complex multi-node outputs are rarely 100% right on the first roll; surgical refinement prevents frustrating all-or-nothing re-rolls while keeping the network coherent.

**Independent Test**: Generate a point crawl, select a single node or route from the graph or refine list, optionally enter a steering instruction, click Regenerate on that part, and verify that only that node or route updates while all graph edges, neighbouring nodes, and key-before-lock invariants remain intact.

**Acceptance Scenarios**:

1. **Given** a generated point crawl, **When** the user selects an individual location node and triggers regeneration (with or without a custom steering note), **Then** only that node's content is replaced while its connections and any required unlocking clue/key role it holds in the crawl are preserved.
2. **Given** a generated point crawl, **When** the user selects an individual route and triggers regeneration, **Then** that route's terrain, travel time, hazard, and signpost details are updated so they remain distinct from sibling routes leaving the same node.

---

### User Story 3 - Save Selected or All Points into the Campaign Vault as Connected Locations (Priority: P2)

A GM wants to bring their generated point crawl (or specific locations from it) into their Codex Cryptica campaign vault so they can run it at the table, view it in the Entity Explorer / Relationship Graph, and expand individual nodes over time.

**Why this priority**: Native graph-to-graph integration turns a standalone generator output into persistent campaign infrastructure with zero manual copy-pasting of links.

**Independent Test**: Generate a point crawl, choose to save all points (or toggle a subset of points), save to the vault, and verify that each saved point is created as a Location entity, a master overview Note entity is created linking to those locations, and routes between saved points are automatically created as typed entity connections preserving route labels/metadata.

**Acceptance Scenarios**:

1. **Given** a generated point crawl, **When** the user saves the full crawl to their vault, **Then** each point is created as a Location entity with a "Routes & Exits" section in its body, a master overview Note entity is created holding the crawl premise/summary and linking to all saved locations, and every route between saved locations is created as a connection with a concise route summary label (travel time, terrain, and visibility/gate tag), plus an option to open the network directly in the Entity Explorer / Relationship Graph.
2. **Given** a generated point crawl, **When** the user deselects several optional locations and saves only the selected subset, **Then** the master overview Note entity and only the selected Location entities are created, and connections (plus "Routes & Exits" entries) are automatically created between all saved location pairs that share a route in the crawl.

---

### User Story 4 - Discover the Point Crawl Generator via Public Search & Hubs (Priority: P3)

A tabletop GM searching for a `point crawl generator`, `pointcrawl generator`, `rpg point crawl generator`, or `dnd point crawl generator` lands on the public `/generators/point-crawl` page, understands what a point crawl is and how to run the visual graph, and can also reach the tool from `/generators`, genre theme hubs, and `/tools`.

**Why this priority**: Captures existing search demand identified in Google Search Console and connects the educational `/answers/what-is-a-point-crawl` page to an actionable creation tool.

**Independent Test**: Navigate to `/generators/point-crawl`, `/generators`, `/generators/[theme]`, and `/tools`, and verify canonical metadata, educational overview, example visual graph, cross-links to `/answers/what-is-a-point-crawl`, and zero intent-collision errors.

**Acceptance Scenarios**:

1. **Given** a visitor lands on `/generators/point-crawl` without an account, **When** they view the page, **Then** they see a clear explanation of what a point crawl is, an interactive visual node-and-edge graph of a generated crawl, full generator controls, and links to related resources (including `/answers/what-is-a-point-crawl`).
2. **Given** a user browses `/generators`, any genre theme hub `/generators/[theme]`, or `/tools`, **Then** the Point Crawl Generator is listed and navigable.

---

### Edge Cases

- **Key-Behind-Lock Softlocks**: What happens if an AI response or random roll places the clue/key required for a locked route on the far side of that same locked route? Deterministic graph normalization relocates or reassigns the unlocking requirement to a node reachable from the start node before the locked edge, or flags and repairs it during the playability pass.
- **Disconnected or Tree-Only Graphs**: What happens if the model returns disconnected nodes, a single linear chain, or a pure tree with no loops? Deterministic topology normalization adds or repairs edges so every node is reachable from the start, at least one loop exists (`edges >= nodes`), and at least one secret/shortcut edge exists.
- **Identical Branching Routes**: What happens when two routes leaving the same node have nearly identical risks or discoveries? The route trade-off check detects high text overlap (`>= 60%`) and prompts/repairs the routes so each branch presents a distinct player choice (e.g., fast & hazardous vs. slow & concealed).
- **Partial AI Timeout on Large (12–15 Node) Crawls**: What happens if one or two node-stocking calls fail or time out during a 15-node crawl? Only the failed nodes are filled from scale-and-genre local templates; the user is notified which nodes used templates and can regenerate them individually.
- **Partial Subset Vault Save**: What happens when a user saves only 4 out of 10 nodes to their vault? Only edges where both endpoints are among the 4 selected nodes are created as location-to-location connections, and the overview Note links only to the 4 saved locations; no dangling connections to unsaved node IDs are written.
- **Free-Text Premise Override**: What happens when a user provides a specific free-text premise (e.g., _"Submerged porcelain cathedral haunted by clockwork eels"_) without changing dropdowns? The free-text premise steers location names, hazards, and route descriptions while still honouring the structural graph invariants.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a Point Crawl Generator accessible both as an in-app campaign generator and as a public, no-login tool at `/generators/point-crawl` (plus `/generators`, genre theme hubs, and `/tools`).
- **FR-002**: System MUST support configurable inputs for:
  - Genre / theme (using the canonical 13 themes plus custom input, where "Surprise Me" randomizes crawl parameters without overwriting the user's chosen genre)
  - Crawl scale (`Dungeon`, `Settlement`, `City`, `Wilderness`, `Region`, `Planet / System`, and custom)
  - Number of points (configurable within 6–15 points)
  - Branching / interconnection density (`Linear-leaning`, `Balanced branching`, `Highly interconnected`)
  - Danger level & travel difficulty
  - Secret route frequency
  - Free-text premise / campaign context
- **FR-003**: System MUST model the point crawl topology and route mechanics as structured data first, ensuring every generated crawl contains:
  - Exactly one clear **Start** node
  - One or more **Goal / Destination** nodes
  - Branching decision points (`outDegree >= 2` on at least two nodes)
  - Optional side / landmark / resource nodes
  - At least one **explorable loop** (cycle) so the network is not a single linear chain or strict tree
  - At least one **secret or shortcut** route
  - At least one **gated / blocked** route with an explicit unlocking requirement (key, clue, tool, guide, or faction clearance) linked to a specific unlocking node
- **FR-004**: Each generated location point MUST include structured, playable content:
  - Name
  - Node role (`start`, `hub`, `hazard`, `obstacle`, `secret`, `side`, `goal`)
  - Short sensory description
  - What makes it worth visiting (signposted attraction or opportunity)
  - Encounter, hazard, or active complication
  - Clue, treasure, resource, or unlocking key/leverage located there
  - Outgoing/incoming route connections
- **FR-005**: Each generated route / connection MUST include structured travel metadata and a deterministic summary line that never contradicts its data fields:
  - Source and target node IDs
  - Directionality (`bidirectional` or `one-way`)
  - Visibility (`obvious`, `hidden`, or `rumoured`)
  - Travel time / distance appropriate to the chosen crawl scale
  - Terrain or passage type
  - Risk (hazard or encounter pressure along the route)
  - Signpost / find (what players can observe from the current node or discover en route)
  - Optional gate / blocker (kind, unlocking node reference, and concrete requirement description)
- **FR-006**: System MUST enforce deterministic playability and graph integrity checks across both local and AI-generated crawls:
  - **Reachability & Key-Before-Lock**: Every node (including all goal nodes) MUST be reachable from the start node, and every gated route's unlocking node MUST be reachable from the start node without traversing the locked route itself.
  - **Distinct Route Trade-offs**: Outgoing routes from any branching node MUST offer distinct risk/find trade-offs (flagging and repairing near-duplicate route descriptions).
  - **Concrete Facts (Anti-Vagueness)**: Gate requirements, secret route triggers, and clues MUST state concrete names, items, or phrases rather than vague placeholders (e.g., forbidding unstated _"the secret password"_ or _"the correct key"_).
- **FR-007**: When AI generation is used, the system MUST execute in stages with live progress updates (premise & topology, location & route stocking, playability check & repair), falling back to local templates at the individual node/route level if a stage partially fails rather than discarding the entire crawl.
- **FR-008**: System MUST render an interactive visual node-and-edge graph of the generated point crawl where users can:
  - Visually distinguish node roles (start, goal, side, hazard/obstacle) and route types (obvious, hidden/secret, gated/locked, one-way)
  - Click a node to inspect its full details, toggle whether it is included when saving to the vault, and highlight its neighbouring nodes and connected routes
  - Hover or click a route edge to view its travel time, terrain, risk, and gate requirements
  - Drag nodes to rearrange visual layout or reset layout for readability (without manually adding, deleting, or rewiring graph topology inside the generator preview)
- **FR-009**: Users MUST be able to surgically regenerate any single location node or individual route's content (with an optional custom steering instruction) while keeping the graph topology fixed and preserving key-before-lock playability invariants.
- **FR-010**: Users MUST be able to save either all generated points or a user-selected subset of points into their Codex Cryptica vault, creating a `Location` entity per selected point (storing a concise route summary as the entity connection label on the graph and writing a full "Routes & Exits" section into each saved Location entity's markdown content/lore) plus a master overview `Note` entity holding the crawl premise/summary and linking to those saved locations, with a direct action to open the saved network in the Entity Explorer / Relationship Graph.
- **FR-011**: The public `/generators/point-crawl` page MUST be registered in the public discovery catalogue (with primary intent `point crawl generator` and related link to the point crawl reference guide) with an educational explanation of point crawls, FAQs, and a dedicated real-browser social preview card hosted on the asset CDN.

### Key Entities

- **Point Crawl Network**: The complete generated crawl document containing metadata (title, premise, genre, scale, danger level, density), an ordered list of Location Nodes, an array of Route Connections, and playability validation findings.
- **Point Crawl Node**: A single location in the crawl with identifier, name, role (`start`, `hub`, `obstacle`, `secret`, `side`, `goal`), summary, sensory description, reason to visit, encounter or hazard, reward or clue, and references to any routes it unlocks.
- **Point Crawl Route**: A directed or bidirectional connection between two nodes with visibility (`obvious`, `hidden`, `rumoured`), direction (`bidirectional`, `one-way`), travel time/distance, terrain, risk, signpost/discovery preview, and optional gate requirement (kind, unlocking node reference, and concrete requirement description).
- **Regeneration Target**: Identifies a single location node or route connection (plus optional steering instruction) for surgical regeneration.

## Assumptions

- Saving a point crawl to the vault creates each selected point as a `Location` entity plus a master overview `Note` entity that summarizes the crawl and links to the saved locations.
- Manual structural graph editing (adding/deleting nodes or rewiring route edges) is intentionally out of scope for the generator preview and is handled in the Entity Explorer / Relationship Graph / Spatial Canvas after saving to the vault.
- Scale-appropriate travel units default automatically by scale (e.g., minutes/turns for `Dungeon`, minutes/hours for `Settlement`/`City`, hours/days for `Wilderness`/`Region`, days/jumps for `Planet / System`) so GMs do not need to configure time units manually.
- As with all other generators, when `AI Disabled` is active in user settings, AI controls are hidden and local deterministic generation is used seamlessly.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of generated point crawls (both local and AI-assisted, across all 6–15 node sizes and scales) pass deterministic graph playability validation: connected from Start to Goal(s), at least 1 loop, at least 1 secret/shortcut route, 0 key-behind-lock softlocks, and 0 vague placeholder blockers.
- **SC-002**: Local no-login generation on `/generators/point-crawl` renders the complete 6–15 node crawl and interactive visual graph in under 200ms.
- **SC-003**: Users can inspect any node or route directly from the visual graph and regenerate a single node or route in 1 click without altering unselected nodes or breaking graph connectivity.
- **SC-004**: Saving a generated point crawl (full or partial selection) to a campaign vault creates 100% of selected Location entities and their corresponding interconnecting routes in a single workflow, immediately viewable in the relationship graph.
- **SC-005**: The public `/generators/point-crawl` page passes all discovery intent governance checks with 0 intent-collision errors and is reachable in 1 click from `/generators`, all shared genre hubs, and `/tools`.
