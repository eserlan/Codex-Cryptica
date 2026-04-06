# Tasks: Core Entity & Relationship Schema

**Input**: Design documents from `specs/001-core-entity-schema/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo and packages structure.

- [x] T001 Initialize Turborepo/Monorepo structure at root
- [x] T002 Create `apps/web` (SvelteKit 2+ PWA)
- [x] T003 Create `packages/schema` (TypeScript shared types)
- [x] T004 Create `packages/graph-engine` (Cytoscape logic)
- [x] T005 Create `packages/editor-core` (Tiptap extensions)
- [x] T006 [P] Configure root `package.json` workspaces
- [x] T007 [P] Setup Vitest and ESLint across monorepo

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data layer and schema definitions.

- [x] T008 Define `Entity` Zod schema in `packages/schema/src/entity.ts`
- [x] T009 Define `Connection` Zod schema in `packages/schema/src/connection.ts`
- [x] T010 Implement RxDB initialization logic in `apps/web/src/lib/db.ts`
- [x] T011 Implement OPFS storage adapter configuration in `apps/web`
- [x] T012 Setup Svelte store for "Graph State" in `apps/web/src/store/graph-store.ts`

## Phase 3: User Story 1 - The "Sync Loop" (MVP)

**Goal**: Achieve the "Triangle of Truth" (Editor ↔ Graph ↔ File System).
**Independent Test**: Typing `[[Link]]` updates graph and local file.

### Tests for User Story 1

- [x] T013 [P] [US1] Unit test: Tiptap extension parses `[[Link]]` correctly (`packages/editor-core`)
- [x] T014 [P] [US1] Unit test: Graph engine adds node on event (`packages/graph-engine`)

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement Tiptap "Wiki-Link" extension in `packages/editor-core`
- [x] T016 [P] [US1] Implement Cytoscape graph initialization in `packages/graph-engine`
- [x] T017 [US1] Integrate Editor and Graph components in `apps/web/src/routes/+page.svelte`
- [x] T018 [US1] Implement Web Worker for background sync logic (`apps/web/src/workers/sync.ts`)
- [x] T019 [US1] Wire up Svelte Stores to trigger worker updates on editor changes

**Checkpoint**: Typing a link updates the visual graph.

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T020 **Offline Functionality Verification**: Verify Service Worker caches app shell and OPFS data persists offline.
- [x] T021 Performance Check: Ensure graph updates stay under 100ms.
- [x] T022 Documentation: Update `README.md` with "Getting Started".
