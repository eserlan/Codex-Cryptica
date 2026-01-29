# Implementation Plan: Oracle Image Generation

**Branch**: `011-oracle-image-gen` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)

## Summary
Extend the Lore Oracle to support on-demand image generation via Nano Banana (Gemini 2.5 Flash Image). Generated visuals will be rendered in the chat stream, persisted locally to the user's vault (OPFS), and can be linked to entities via buttons or intuitive drag-and-drop interactions.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: `@google/generative-ai` (for context), Browser Native `fetch` (for Nano Banana REST API), `idb` (for metadata)  
**Storage**: OPFS (Origin Private File System) for binary images, Markdown (frontmatter) for entity linkage.  
**Testing**: Vitest (Logic), Playwright (Drag & Drop UX)  
**Target Platform**: Modern Web Browsers (supporting File System Access API)
**Project Type**: Web application (SvelteKit)  
**Performance Goals**: Image generation < 15s, UI response < 100ms.  
**Constraints**: Requires active internet for generation, fully offline for viewing. No external image CDNs allowed.  
**Scale/Scope**: Supports individual world-building vaults.

## Constitution Check

_GATE: Pass_

1.  **Local-First**: YES. Images are stored in the user's local vault directory via OPFS.
2.  **Relational-First**: YES. Images are linked directly to Graph nodes.
3.  **Performance**: YES. Generation is asynchronous and does not block the UI thread.
4.  **No Phone Home**: YES. Image data flows only between the browser and Google's Generative API via the user's own key.

## Project Structure

### Documentation (this feature)

```text
specs/011-oracle-image-gen/
├── plan.md              # This file
├── research.md          # Implementation details & provider research
├── data-model.md        # ChatMessage and Entity schema updates
├── quickstart.md        # Implementation checklist
├── contracts/           # Imagen 3 REST API definition
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── services/
│   │   └── ai.ts        # Extended with Nano Banana support and Style Caching
│   ├── stores/
│   │   ├── oracle.svelte.ts # Updated to handle image messages and intent detection
│   │   └── vault.svelte.ts  # Updated with image persistence, thumbnail generation, and path resolution
│   └── components/
│       ├── oracle/
│       │   └── ChatMessage.svelte # Image rendering and drag support
│       └── EntityDetailPanel.svelte # Drop zone and async image resolution
└── tests/
    └── e2e/
        └── image-gen.spec.ts # Comprehensive visual workflow tests
```

**Structure Decision**: Standard SvelteKit layout. New logic is encapsulated in existing AI, Oracle, and Vault services/stores to maintain architectural consistency. Thumbnail generation is performed client-side using a hidden Canvas to minimize storage and processing overhead. Art Style lookups are memoized in an invalidation-aware cache to ensure zero-latency repeats.