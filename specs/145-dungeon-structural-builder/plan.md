# Implementation Plan: Dungeon & Delve Structural Builder (#145 / #1843)

**Feature Branch**: `145-dungeon-structural-builder` | **Date**: 2026-07-26 | **Spec**: [spec.md](file:///home/espen/proj/Codex-Arcana/specs/1843-dungeon-structural-builder/spec.md)  
**Input**: Feature specification from `/specs/1843-dungeon-structural-builder/spec.md`

## Summary

Build a Delve Spatial Canvas Builder that transforms Dungeon/Delve concepts into interactive `.canvas` spatial maps. Using `@xyflow/svelte`, high-level dungeon sectors become group container frames, room nodes render via a specialized `DelveRoomNode` component (with role badges and stocking summary chips), and room connections render via a custom `DelveEdge` component (supporting standard, hidden 👁️, conditional 🔒, vertical 🪜, and one-way passages). Rooms are stocked using concept lore context, with single-room AI regeneration and full offline/manual editing capabilities.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), Bun 1.3.14  
**Primary Dependencies**: SvelteKit 2, `@xyflow/svelte` (Spatial Canvas), `@google/generative-ai` (Gemini SDK via `aiClientManager`), `packages/generator-engine`  
**Storage**: OPFS & IndexedDB (via Vault Repository storing `.canvas` JSON documents and linked Concept notes)  
**Testing**: Vitest (`bun run test`)  
**Target Platform**: Web Browser (Local-first)  
**Project Type**: Monorepo library (`packages/generator-engine`) + Web application (`apps/web`)  
**Performance Goals**: Canvas load & layout render < 100ms, single-room AI regeneration < 3 seconds  
**Constraints**: Client-side local-first, full offline functionality without AI, strict adherence to `docs/STYLE_GUIDE.md`  
**Scale/Scope**: Dungeons up to 30+ room nodes across 6+ sector group frames per canvas

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Principle I (Library-First)**: Core graph topology algorithms, sector flow layout calculation, and room stocking services MUST be placed in `packages/generator-engine/src/dungeon/`. Web app components act as a thin UI layer over these workspace modules. -> **PASS**
2. **Principle II (TDD)**: Comprehensive unit tests MUST cover graph generation, sector flow layout, room stocking, edge condition toggling, single-room AI regeneration, and `.canvas` export/import. -> **PASS**
3. **Principle III (Simplicity & YAGNI)**: Reuses existing `@xyflow/svelte` Spatial Canvas workspace (`CanvasWorkspace.svelte`) and `.canvas` schema from spec 061 rather than creating a duplicate canvas or graph renderer. -> **PASS**
4. **Principle IV (AI-First Extraction)**: Uses `aiClientManager` for context-aware single room stocking and regeneration. -> **PASS**
5. **Principle V (Privacy & Client-Side)**: Local-first persistence in browser OPFS/IndexedDB as `.canvas` JSON. -> **PASS**
6. **Principle VI (Clean Implementation)**: Svelte 5 Runes, Tailwind 4 semantic tokens, Iconify icons (`icon-[lucide--...]`). -> **PASS**
7. **Principle VII (User Documentation)**: Delve Spatial Canvas guide entry added to `apps/web/src/lib/config/help-content.ts`. -> **PASS**
8. **Principle VIII (Dependency Injection)**: Constructor-based DI for `DungeonDelveService` with sensible production defaults. -> **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/1843-dungeon-structural-builder/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code

```text
packages/generator-engine/
└── src/
    └── dungeon/
        ├── delve-builder-types.ts      # Delve room, sector, edge, stocking schemas
        ├── delve-topology-generator.ts # Procedural room & connection topology generator
        ├── delve-flow-layout.ts        # Sector-aware hierarchical flow layout calculator
        ├── delve-stocking-service.ts   # Lore context-aware room stocking & single-room generator
        └── index.ts

apps/web/
└── src/
    └── lib/
        ├── components/
        │   └── canvas/
        │       ├── DelveRoomNode.svelte        # Custom Svelte Flow canvas node for rooms
        │       ├── DelveEdge.svelte            # Custom Svelte Flow edge for passages (hidden/vertical/locked)
        │       ├── EdgeAttributeModal.svelte   # Modal popover to edit connection properties
        │       └── RoomStockingDrawer.svelte   # Side drawer/inspector for room stocking & AI regen
        ├── services/
        │   └── dungeon-delve-service.ts        # Service converting Concept notes <-> Delve .canvas
        └── config/
            └── help-content.ts                 # Help article for Delve Spatial Canvas Builder
```

**Structure Decision**: Core topology, layout, and room stocking logic reside in `packages/generator-engine/src/dungeon/`. Custom Svelte Flow components (`DelveRoomNode`, `DelveEdge`, `EdgeAttributeModal`, `RoomStockingDrawer`) integrate into `apps/web/src/lib/components/canvas/`.

## Complexity Tracking

| Violation                       | Why Needed                                                                                                   | Simpler Alternative Rejected Because                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Custom Canvas Node & Edge types | Delve rooms require specialized role badges, stocking chips, and passage indicators (hidden, locked, stairs) | Generic EntityNode lacks delve-specific tactical role badges and passage condition controls |
