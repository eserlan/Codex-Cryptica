# Research: Dungeon & Delve Structural Builder (#1843)

## Research Summary

### Research Topic 1: Topology Generation Algorithm for Dungeon Graphs

- **Decision**: Implement a procedural graph generation strategy in `packages/generator-engine` that constructs a planar/semi-planar graph of sectors, rooms, and first-class connections based on dungeon size parameters (small: 5-8 rooms, medium: 9-14 rooms, sprawling: 15+ rooms).
- **Rationale**: Public generator concept metadata contains sector names, size, and themes, but no room layout. The topology generator builds an initial spanning tree across sectors to guarantee connectivity, then adds cross-links, loops, secret passages, and vertical connections based on dungeon hazards and premise.
- **Alternatives Considered**:
  - _Fixed graph templates_: Rejected because templates lack variety and fail to adapt to dynamic sector counts.
  - _Full Delaunay triangulation + Minimum Spanning Tree_: Overly complex for narrative room graphs; simple sector-aware graph growth produces more readable, RPG-friendly dungeon layouts.

### Research Topic 2: Graph Visualization & Interaction Engine

- **Decision**: Reuse `Cytoscape.js` (already established in `packages/graph-engine` and Codex UI) or a lightweight, direct Svelte 5 Cytoscape canvas integration for rendering dungeon nodes, sector compound boundaries, and styled edge types (hidden, conditional, vertical).
- **Rationale**: Cytoscape natively supports compound nodes (sectors containing rooms), custom edge styling (dashed for hidden, colored/dotted for vertical), and interactive node drag/selection.
- **Alternatives Considered**:
  - _Pure SVG custom layout engine_: Requires writing custom force/grid layout algorithms from scratch.
  - _HTML5 Canvas from scratch_: Reinvents graph interactions, layout physics, and selection state.

### Research Topic 3: Context-Aware Room Stocking & Single-Room Regeneration

- **Decision**: Create a `DungeonStockingService` in `packages/generator-engine` that maps concept lore attributes (factions, conflict, hazards, signature feature, secrets) to room roles (entrance, hazard, encounter, treasure, secret, lore, faction, special). Room stocking can be executed deterministically (rule-based templates) or enhanced via AI (`aiClientManager`).
- **Rationale**: Fulfills FR-009, FR-010, and FR-012. Single-room regeneration targets only a specific `DungeonRoom` node ID, querying Gemini with concept context + current room role without touching neighboring nodes or edge topology.
- **Alternatives Considered**:
  - _Regenerating entire subgraphs_: Risky because it can overwrite manual GM modifications in adjacent rooms.

### Research Topic 4: Structural Data Model & Persistence

- **Decision**: Define standard TypeScript schemas (`BuiltDungeonData`, `DungeonRoomData`, `DungeonConnectionData`, `DungeonSectorData`) in `packages/generator-engine/src/dungeon/types.ts` and export workspace types. Persist built dungeons via a reactive Svelte 5 store (`dungeonBuilderStore`) integrated with local vault storage (`IndexedDB` / `OPFS`).
- **Rationale**: Fulfills FR-011 and adheres to Dependency Injection (Principle VIII) and local-first persistence (Principle V).
