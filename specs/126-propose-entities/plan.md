# Implementation Plan: Propose Entities

**Branch**: `126-propose-entities` | **Date**: 2026-05-30 | **Spec**: [specs/126-propose-entities/spec.md](./spec.md)
**Input**: Feature specification from `/specs/126-propose-entities/spec.md`

## Summary

Implement entity proposals based on bolded text within entity content in both Sidebar and Zen mode detail views. When an unlinked bold term is detected, it is listed as a proposed entity. Accepting a proposal intelligently infers its category, uses the corresponding template, and feeds the current page's content as context.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes
**Primary Dependencies**: SvelteKit, `@google/generative-ai` (for category inference and template filling), `zod`
**Storage**: OPFS (Vault Files), IndexedDB (Registry)
**Testing**: Vitest
**Target Platform**: Browser (Web Application)
**Project Type**: web-service (SvelteKit app)
**Performance Goals**: Proposal parsing should happen without noticeable degradation to view rendering.
**Constraints**: Client-side processing. AI operations must gracefully handle loading states or API limitations.
**Scale/Scope**: Vault-wide entity proposals.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: Follows existing architecture. Parsing logic can live in `packages/editor-core` or similar utility layer, UI in web.
- **II. TDD**: Will write tests for parsing rules (bold extraction, link exclusion) before implementing UI.
- **V. Privacy**: Parsing is fully local. AI inference happens locally or via configured user keys.
- **VII. User Documentation**: A new feature hint or help guide section will explain entity proposal logic.
- **IX. Natural Language**: Clear UI terms like "Propose Entities".

## Project Structure

### Documentation (this feature)

```text
specs/126-propose-entities/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/editor-core/
├── src/utils/
│   └── text-parsing.ts

apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── entity-detail/
│   │   │   │   └── DetailProposals.svelte
│   │   │   └── zen/
│   │   │       └── ZenSidebar.svelte
│   │   ├── services/
│   │   │   └── entity-proposal.service.ts
└── tests/
```

**Structure Decision**: Add utility to parse Markdown for proposals (excluding links), service to coordinate AI extraction, and integrate UI in existing Sidebar and Zen views.

## Complexity Tracking

_No violations._
