# Implementation Plan: Adventure Canvas Spatial Graph Builder

**Branch**: `147-adventure-canvas-spatial` | **Spec**: [spec.md](./spec.md) | **Issue**: [#1881](https://github.com/eserlan/Codex-Cryptica/issues/1881)

## Summary & Architecture

Extend the spatial canvas infrastructure (`@xyflow/svelte`) to support the **Adventure Canvas Spatial Graph Builder**. Converts generated or authored adventure concepts into interactive, non-linear node-and-edge networks with typed relationships, entity creation/linking, dungeon builder launching, contextual validation warnings, and local storage persistence.

```
+-----------------------------------------------------------------------------------+
|                            Adventure Canvas Workspace                             |
|                                                                                   |
|  +---------------------+        +--------------------+        +----------------+  |
|  |  Starting Situation |------->|    Key Location    |------->|    Outcome     |  |
|  |      (Node)         | holds  |   (Delve Launch)   | leads  |     (Node)     |  |
|  +---------------------+        +--------------------+        +----------------+  |
|             |                              |                                      |
|             | threatens                    | reveals                              |
|             v                              v                                      |
|  +---------------------+        +--------------------+                            |
|  |     NPC / Threat    |<-------|   Clue / Secret    |                            |
|  |      (Node)         | fears  |      (Node)        |                            |
|  +---------------------+        +--------------------+                            |
|                                                                                   |
|  [Validation Warnings HUD]  [Node Detail Drawer]  [Entity Linker / Vault Creation]|
+-----------------------------------------------------------------------------------+
```

## User Stories & Phased Implementation

### Phase 1: Core Graph Model & Converter (P1)

- Create `AdventureCanvasDocument` schema in `packages/generator-engine/src/adventure/adventure-graph-types.ts`.
- Build `generateAdventureGraphTopology()` in `packages/generator-engine/src/adventure/adventure-graph-generator.ts` to convert `PublicGeneratorOutput` into an auto-layout spatial graph.
- Add unit tests verifying node types, typed edge links, and auto-layout coordinate distribution.

### Phase 2: Canvas Node & Edge Svelte Components (P1 & P2)

- Create `AdventureNode.svelte` in `apps/web/src/lib/components/canvas/AdventureNode.svelte`:
  - Visually distinct cards for Location, NPC, Clue, Threat, Outcome, and Situation.
  - 4-direction handles (Top, Bottom, Left, Right) for flexible connection dragging from any direction.
  - Render Role, Relation, Leverage, and Dilemma tags cleanly.
  - Action buttons: "Create Vault Entity", "Open Entity", "Launch Dungeon Builder" (for Location nodes).
- Create `AdventureEdge.svelte` for typed relationship display.
- Wire `onReconnect` in `use-canvas-logic.svelte.ts` and `CanvasWorkspace.svelte` for drag-reconnecting edge endpoints.
- Wire into `CanvasWorkspace.svelte` and `CanvasSelectionModal.svelte`.

### Phase 3: Dynamic Node Spawning & Interactive Drawer & Entity Linking (P2)

- Add "+ Add Element" dropdown in `CanvasHUD.svelte` and pane context menu options in `CanvasContextMenu.svelte` to spawn any of the 6 Adventure Node types directly onto the canvas.
- Create `AdventureNodeDrawer.svelte` for editing node content, dilemma, leverage, and relationship edges.
- Wire "Launch Dungeon Builder" from suitable Location nodes directly into the existing Dungeon Canvas flow.
- Support creating and binding Codex Cryptica vault notes (`Concept`, `Location`, `Character`, `Faction`) to nodes.

### Phase 4: Non-Blocking Graph Validation & Full 10-Section GM Lore Persistence (P3)

- Create `validateAdventureGraph()` in `packages/generator-engine/src/adventure/adventure-graph-validator.ts`:
  - Detect orphan nodes, unreachable outcome nodes, single mandatory progression bottlenecks, and unlinked clues.
- Render contextual warning badges in `CanvasHUD.svelte` without blocking editing.
- Embed `sourceLore` metadata in `AdventureCanvasDocument` so Vault Note exports retain **ALL 10 GM Sections** in full detail.
- Persist node positions, `sourceLore` metadata, and manual edits in browser IndexedDB/OPFS across sessions.

## File Touches & Additions

### Packages (`packages/generator-engine`)

- `src/adventure/adventure-graph-types.ts` (New schema & types)
- `src/adventure/adventure-graph-generator.ts` (Topology generator & converter)
- `src/adventure/adventure-graph-validator.ts` (Graph validation rules)
- `src/adventure/adventure-graph-generator.test.ts` (Unit tests)
- `src/index.ts` (Exports)

### Web App (`apps/web`)

- `src/lib/components/canvas/AdventureNode.svelte` (New node UI component)
- `src/lib/components/canvas/AdventureEdge.svelte` (New edge UI component)
- `src/lib/components/canvas/AdventureNodeDrawer.svelte` (New node drawer UI component)
- `src/lib/components/canvas/CanvasWorkspace.svelte` (Register new node/edge types)
- `src/lib/stores/canvas/adventure-canvas.svelte.ts` (New reactive canvas store)

## Verification & Test Plan

- Run `bun test packages/generator-engine` to confirm all graph generator & validator unit tests pass.
- Run `vitest run apps/web/src/lib/components/canvas` to confirm canvas UI tests pass.
- Verify `bun run lint` passes cleanly with zero TypeScript or Svelte errors.
