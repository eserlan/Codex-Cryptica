# Implementation Plan: AI Regenerate Entity Description

**Branch**: `095-ai-regen-button` | **Date**: 2026-04-28 | **Spec**: [/specs/095-ai-regen-button/spec.md](/specs/095-ai-regen-button/spec.md)
**Input**: Feature specification from `/specs/095-ai-regen-button/spec.md`

## Summary

The feature introduces an AI-powered regeneration button for entity descriptions in the Codex-Arcana web application. It will leverage the existing Oracle (Gemini) infrastructure to produce two distinct outputs: a player-facing **Chronicle** and a GM-facing **Lore** entry. The implementation will follow a "Read-Only Inline Preview" pattern, allowing Hosts/GMs to review and accept changes before persistence.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)  
**Primary Dependencies**: SvelteKit, `@google/generative-ai`, `@codex/vault-engine`, `@codex/oracle-engine`  
**Storage**: OPFS (Vault Markdown Files), IndexedDB (Sync Metadata)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E)  
**Target Platform**: Web (Modern Browsers with OPFS support)  
**Project Type**: Web Application (Monorepo)  
**Performance Goals**: AI content generation < 15s (SC-002)  
**Constraints**: Client-side privacy, Host/GM-only access (FR-007), Theme-aware output (FR-004)  
**Scale/Scope**: Entity-level content generation within the sidepanel and Zen Mode.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1.  **Library-First**: [x] Core AI logic added to `packages/oracle-engine`.
2.  **Test-Driven Development**: [x] Unit tests for `RegenerationService` and `OracleParser` updates.
3.  **Simplicity & YAGNI**: [x] Reusing existing Oracle and Svelte patterns.
4.  **AI-First Extraction**: [x] Prompt design using clear headers for extraction.
5.  **Privacy**: [x] Client-side context gathering and processing.
6.  **Clean Implementation**: [x] Svelte 5 Runes for transient preview state.
7.  **User Documentation**: [x] `quickstart.md` created; `help-content.ts` update tasks included.
8.  **Dependency Injection**: [x] `RegenerationService` follows DI patterns.

## Project Structure

### Documentation (this feature)

```text
specs/095-ai-regen-button/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── entity/
│   │   │   │   ├── SidepanelRegenButton.svelte
│   │   │   │   └── ZenModeRegenAction.svelte
│   │   │   └── ui/
│   │   │       └── InlinePreviewOverlay.svelte
│   │   └── services/
│   │       └── RegenerationService.ts
└── tests/

packages/
├── oracle-engine/       # Updated with regeneration prompts/logic
├── vault-engine/        # Used for context gathering
└── schema/              # Updated for any lore field definitions
```

**Structure Decision**: Monorepo structure with UI components in `apps/web` and core logic in `packages/oracle-engine`.

## Complexity Tracking

_N/A - No violations identified._
