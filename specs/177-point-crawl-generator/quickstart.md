# Quickstart & Verification Guide: Point Crawl Generator (`177-point-crawl-generator`)

**Date**: 2026-10-16  
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## 1. Local Development & Verification Commands

Per the repository's **Impacted-Only Validation** rule (`AGENTS.md` / Constitution VI), always validate only the changed files and affected workspaces:

```bash
# 1. Run impacted unit tests across packages/generator-engine and apps/web
bun run test:changed

# 2. Run targeted Vitest files directly during TDD
bunx vitest run packages/generator-engine/src/point-crawl.test.ts
bunx vitest run apps/web/src/lib/components/seo/point-crawl.test.ts

# 3. Lint changed files
bun run lint:changed

# 4. Type-check affected workspaces
bun --cwd packages/generator-engine run lint:types
bun --cwd apps/web run check

# 5. Validate Discovery Intent Governance (Constitution XIII)
bun scripts/discovery-audit.mjs

# 6. Run Fallow local gate before committing
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

---

## 2. Interactive Walkthrough Scenarios

### Scenario A: Instant No-Login Public Generation (`/generators/point-crawl`)

1. Open `http://localhost:5173/generators/point-crawl` in a browser.
2. Verify that an initial 8-node Point Crawl network renders immediately (<200ms) with:
   - An interactive SVG node-and-edge graph (`PointCrawlGraph.svelte`) showing distinct visual badges for `Start`, `Goal`, `Obstacle/Hazard`, `Secret`, and `Side` nodes, plus solid/dashed/dotted route lines and lock icons on gated routes.
   - Full playable location and route dossier cards below the graph.
3. Change **Scale** to `Wilderness`, **Number of Points** to `12`, **Density** to `Highly interconnected`, and click **Generate** (with AI off).
4. Click any node in the graph to inspect its sensory details, why visit, encounter/hazard, and clue/reward; drag a node to adjust layout and click **Reset Layout** to restore topological positions.

### Scenario B: Staged AI Generation & Partial Fallback

1. Toggle **AI Lore Co-Author** on, enter a free-text premise (e.g., _"Sunken porcelain cathedral patrolled by clockwork eels"_), and click **Generate**.
2. Observe the live stage progress (`Establishing premise & topology` → `Stocking locations & routes` → `Checking playability & route trade-offs`).
3. Verify that all nodes are reachable from Start, at least one loop and one secret/shortcut exist, and any locked route's unlocking key is placed in a node reachable before the lock.

### Scenario C: Surgical Per-Node & Per-Route Regeneration

1. In the **Refine one part** panel (or directly in the selected node/route inspector on the graph), click **Rewrite** or **Steer** on a single node or route.
2. Enter an optional steering note (e.g., _"Turn this into a flooded bell-foundry with a territorial rust-crab"_).
3. Verify that only that node or route updates while all other nodes, connections, and key-before-lock invariants remain intact.

### Scenario D: Full or Subset Multi-Entity Vault Save

1. Toggle the save checkboxes on 5 of the generated nodes (or leave all selected).
2. Click **Save to Codex** (on `/generators/point-crawl`) or **Save Point Crawl** (inside the in-app `CampaignGeneratorModal`).
3. Verify that:
   - Each selected point is created as a `Location` entity with a `## Routes & Exits` section in its lore and concise route summary labels (e.g. `"2 hrs · Ridge Trail [Locked: Iron Seal]"`) on its graph connections.
   - A master overview `Note` entity is created holding the crawl premise/summary, linking to all saved locations, and attaching the rasterized point crawl graph image.
   - Clicking **Open in Relationship Graph** displays the connected location network in the Entity Explorer / Graph view.
