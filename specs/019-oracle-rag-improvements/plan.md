# Implementation Plan: Oracle RAG Improvements

**Branch**: `019-oracle-rag-improvements` | **Date**: 2026-01-30 | **Spec**: [specs/019-oracle-rag-improvements/spec.md]
**Input**: Feature specification from `/specs/019-oracle-rag-improvements/spec.md`

## Summary

This feature addresses RAG visibility issues (like the "Named Cat" problem) and improves conversational retrieval. We will implement **Context Fusion** (combining lore and content fields), **Query Expansion** (AI-driven subject resolution), and **Neighborhood Enrichment** (automatically including summaries of linked entities).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: @google/generative-ai FlexSearch, Svelte 5
**Storage**: IndexedDB (Chat History), Markdown (Vault)
**Testing**: Vitest, Playwright
**Target Platform**: Browser / Mobile
**Project Type**: Web Application
**Performance Goals**: Retrieval < 100ms
**Constraints**: 10k character context limit, Offline-first architecture

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Local-First Sovereignty**: PASS. Data retrieval remains purely local via FlexSearch and FS Access.
- **II. Relational-First Navigation**: PASS. Neighborhood enrichment leverages the Cytoscape connections.
- **III. Sub-100ms Performance**: PASS. synchronous BFS for 1-hop neighbors from cached state is extremely fast.
- **VI. Pure Functional Core**: PASS. Retrieval and expansion logic isolated from UI.
- **VIII. Test-First PWA Integrity**: PASS. Fail-safe messaging added for offline state.

## Project Structure

### Documentation (this feature)

```text
specs/019-oracle-rag-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── stores.md
└── tasks.md             # Phase 2 output
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── services/
│   │   ├── ai.ts        # RETRIEVAL LOGIC (Fusion, Enrichment, Expansion)
│   │   └── search.ts    # INDEXING LOGIC (Frontmatter indexing)
│   └── stores/
│       └── oracle.svelte.ts # STATE PERSISTENCE (Sources metadata)
```

**Structure Decision**: Enhancing existing services and stores in the web application.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |