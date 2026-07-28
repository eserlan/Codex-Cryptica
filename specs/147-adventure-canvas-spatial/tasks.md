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

- [ ] **Task 1: Create Adventure Graph Schema & Converter**
  - **Goal**: Define `AdventureCanvasDocument`, `AdventureNode`, and `AdventureEdge` types in `packages/generator-engine/src/adventure/adventure-graph-types.ts`.
  - **Implementation**: Build `generateAdventureGraphTopology()` in `packages/generator-engine/src/adventure/adventure-graph-generator.ts` to convert `PublicGeneratorOutput` into an auto-layout spatial graph document with starting situation, key location, npc, clue, threat, and outcome nodes.
  - **Tests**: Create `packages/generator-engine/src/adventure/adventure-graph-generator.test.ts` verifying node type generation, typed relationship links, and coordinate placement.

- [ ] **Task 2: Create Adventure Graph Validation Engine**
  - **Goal**: Implement `validateAdventureGraph()` in `packages/generator-engine/src/adventure/adventure-graph-validator.ts`.
  - **Implementation**: Inspect graph document for non-blocking warnings: orphan nodes, unreachable outcome nodes, single mandatory bottlenecks, and unlinked clues.
  - **Tests**: Add unit tests in `packages/generator-engine/src/adventure/adventure-graph-validator.test.ts` checking validation warning generation.

---

## Phase 2: Canvas Node & Edge Svelte Components (P1 & P2)

- [ ] **Task 3: Build `AdventureNode.svelte` and `AdventureEdge.svelte` Components**
  - **Goal**: Create Svelte 5 Rune-based node and edge components in `apps/web/src/lib/components/canvas/`.
  - **Implementation**:
    - Build `AdventureNode.svelte` with semantic color tokens and icons for Location, NPC, Clue, Threat, Outcome, and Situation cards.
    - Render Role, Relation, Leverage, and Dilemma tags cleanly with sub-bullet layout.
    - Add action buttons: "Create Entity", "Open Entity", "Launch Dungeon Builder" (for Location nodes).
    - Register new node and edge types in `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte`.
  - **Tests**: Create `apps/web/src/lib/components/canvas/AdventureNode.test.ts` verifying rendering and button callbacks.

---

## Phase 3: Interactive Drawer & Entity Linking (P2)

- [ ] **Task 4: Build `AdventureNodeDrawer.svelte` & Dungeon Builder Launcher**
  - **Goal**: Allow full inline editing of node content, dilemma, leverage, and entity linking.
  - **Implementation**:
    - Create `apps/web/src/lib/components/canvas/AdventureNodeDrawer.svelte`.
    - Wire "Launch Dungeon Builder" from Location nodes into the existing Dungeon Canvas flow.
    - Support creating and binding Codex Cryptica vault notes (`Concept`, `Location`, `Character`, `Faction`) to nodes.
  - **Tests**: Add component tests for `AdventureNodeDrawer.svelte`.

---

## Phase 4: Validation HUD & Session Persistence (P3)

- [ ] **Task 5: Implement Validation Warnings HUD & Storage Persistence**
  - **Goal**: Surface graph warnings in `CanvasHUD.svelte` and persist canvas layout to IndexedDB/OPFS.
  - **Implementation**:
    - Create `apps/web/src/lib/stores/canvas/adventure-canvas.svelte.ts` to manage canvas document state and storage persistence.
    - Connect `validateAdventureGraph()` warnings to `CanvasHUD.svelte` non-blocking badges.
    - Verify position persistence across page reloads and local single-node regeneration.
  - **Tests**: Add integration tests verifying storage persistence and HUD warnings.
