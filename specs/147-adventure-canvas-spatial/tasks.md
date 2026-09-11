# Implementation Tasks: Adventure Canvas Spatial Graph Builder

**Feature Branch**: `147-adventure-canvas-spatial`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Task Dependencies & Phasing

```
[Task 1: Graph Types & Converter] ---> [Task 2: Graph Validator Engine]
                                                |
                                                v
                                  [Task 3: Canvas Node UI Components]
                                                |
                                                v
                                  [Task 4: Interactive Drawer & Entity Linking]
                                                |
                                                v
                                  [Task 5: Validation HUD & Session Persistence]
```

---

## Phase 1: Core Graph Model & Topology Converter (P1)

- [x] **Task 1: Create Adventure Graph Schema & Converter**
  - **Goal**: Define `AdventureCanvasDocument`, `AdventureNode`, and `AdventureEdge` types in `packages/generator-engine/src/adventure/adventure-graph-types.ts`.
  - **Implementation**: Build `generateAdventureGraphTopology()` in `packages/generator-engine/src/adventure/adventure-graph-generator.ts` to convert `PublicGeneratorOutput` into an auto-layout spatial graph document with starting situation, key location, npc, clue, threat, and outcome nodes. Derived titles from bold markdown headers (`**Title**`) and embedded `sourceLore` in canvas metadata.
  - **Tests**: Create `packages/generator-engine/src/adventure/adventure-graph-generator.test.ts` verifying node type generation, typed relationship links, coordinate placement, and `sourceLore` metadata.

- [x] **Task 2: Create Adventure Graph Validation Engine**
  - **Goal**: Implement `validateAdventureGraph()` in `packages/generator-engine/src/adventure/adventure-graph-validator.ts`.
  - **Implementation**: Inspect graph document for non-blocking warnings: orphan nodes, unreachable outcome nodes, single mandatory bottlenecks, and unlinked clues.
  - **Tests**: Add unit tests in `packages/generator-engine/src/adventure/adventure-graph-validator.test.ts` checking validation warning generation.

---

## Phase 2: Canvas Node & Edge Svelte Components (P1 & P2)

- [x] **Task 3: Build `AdventureNode.svelte` and `AdventureEdge.svelte` Components & 4-Direction Handles**
  - **Goal**: Create Svelte 5 Rune-based node and edge components with 4-direction connection handles (Top, Bottom, Left, Right) and inline edge reconnection (`onReconnect`).
  - **Implementation**:
    - Build `AdventureNode.svelte` with semantic color tokens and icons for Location, NPC, Clue, Threat, Outcome, and Situation cards.
    - Added Top, Bottom, Left, and Right connection handles for dragging connections from any direction.
    - Implemented inline edge reconnection in `use-canvas-logic.svelte.ts` and `CanvasWorkspace.svelte`.
    - Render Role, Relation, Leverage, and Dilemma tags cleanly with sub-bullet layout.
    - Add action buttons: "Create Entity", "Open Entity", "Launch Dungeon Builder" (for Location nodes).
    - Register new node and edge types in `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte`.
  - **Tests**: Create `apps/web/src/lib/components/canvas/AdventureNode.test.ts` and `use-canvas-logic.test.ts` verifying rendering, handles, edge reconnection, and button callbacks.

---

## Phase 3: Interactive Dynamic Spawning, Drawer & Entity Linking (P2)

- [x] **Task 4: Build Dynamic Element Spawning, `AdventureNodeDrawer.svelte` & Dungeon Builder Launcher**
  - **Goal**: Allow spawning new Adventure Nodes (`Location`, `NPC`, `Clue`, `Threat`, `Outcome`, `Situation`) dynamically and editing node content, dilemma, leverage, and entity linking.
  - **Implementation**:
    - Added "+ Add Element" dropdown in `CanvasHUD.svelte` and right-click context menu items in `CanvasContextMenu.svelte` to spawn any of the 6 Adventure Node types directly onto the canvas.
    - Create `apps/web/src/lib/components/canvas/AdventureNodeDrawer.svelte`.
    - Wire "Launch Dungeon Builder" from Location nodes into the existing Dungeon Canvas flow.
    - Support creating and binding Codex Cryptica vault notes (`Concept`, `Location`, `Character`, `Faction`) to nodes.
  - **Tests**: Add component tests for `AdventureNodeDrawer.svelte` and `use-canvas-logic.test.ts`.

---

## Phase 4: Validation HUD & Session Persistence (P3)

- [x] **Task 5: Implement Validation Warnings HUD & Storage Persistence with Full 10-Section GM Lore Preservation**
  - **Goal**: Surface graph warnings in `CanvasHUD.svelte`, persist canvas layout to IndexedDB/OPFS, and preserve all 10 GM sections when exporting to a Vault Note.
  - **Implementation**:
    - Manage canvas document state and storage persistence in `use-canvas-logic.svelte.ts` and vault stores.
    - Connect `validateAdventureGraph()` warnings to `CanvasHUD.svelte` non-blocking badges.
    - Preserve `metadata.sourceLore` when creating or exporting Vault Notes from the canvas workspace (`CanvasWorkspace.svelte`), ensuring **all 10 GM sections** are retained in full detail in note `lore`.
    - Verify position persistence across page reloads and local single-node regeneration.
  - **Tests**: Add integration tests verifying storage persistence, note export lore retention, and HUD warnings.
