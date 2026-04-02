# Implementation Plan: Vault Front Page

**Branch**: `077-vault-front-page` | **Date**: 2026-04-02 | **Spec**: [/specs/077-vault-front-page/spec.md]
**Input**: Feature specification from `/specs/077-vault-front-page/spec.md`

## Summary

Implement a dedicated landing page for vaults that provides a cohesive campaign overview. This includes rendering campaign metadata, a rich description (optionally from a "frontpage" tagged entity), a responsive "recent entities" card grid, and a cover image system supporting local files, external URLs, and AI generation via the Lore Oracle. All metadata and activity queries will be powered by **Dexie** (`CodexEntityDb`).

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes) + SvelteKit  
**Primary Dependencies**: Tailwind CSS 4, `@google/generative-ai`, **Dexie 4.x**, `lucide-svelte`  
**Storage**: OPFS (Vault Files, Local Images), **Dexie IndexedDB** (Metadata, Entity Cache)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Web (Modern Browsers)
**Project Type**: Web Application + Workspace Packages  
**Performance Goals**: Front Page metadata render < 500ms; Image generation < 10s  
**Constraints**: Offline-first, Privacy-preserving (Local-only processing)  
**Scale/Scope**: Feature addition to `apps/web`, metadata extension in `packages/vault-engine`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Logic for resolving the "frontpage" entity and fetching recent activity MUST be encapsulated in `packages/vault-engine`. [PASS]
2. **TDD**: All new services and Dexie queries MUST have unit tests. [PASS]
3. **Simplicity**: Use Dexie's structured query API for efficient activity tracking and tag resolution. [PASS]
4. **AI-First**: Use Oracle for cover image generation and prompt enhancement. [PASS]
5. **Privacy**: All images and metadata stored locally via OPFS and Dexie. [PASS]
6. **Clean Implementation**: Adhere to Dexie schema versioning (Version 4). [PASS]
7. **Documentation**: Update `help-content.ts`. [PASS]
8. **Dependency Injection**: **CRITICAL**. All new services (`CampaignService`, `ActivityService`) and stores (`CampaignStore`) MUST use constructor-based DI to ensure unit-testability with mocked databases and services. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/077-vault-front-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── campaign/
│   │   │   ├── FrontPage.svelte      # Main landing view
│   │   │   ├── EntityCard.svelte    # Component for recent items
│   │   │   └── CoverImage.svelte    # Header image component
│   ├── stores/
│   │   └── campaign.svelte.ts       # UI state for front page (Uses DI for Services)
│   ├── utils/
│   │   └── entity-db.ts             # UPDATED: Dexie Schema Version 4
└── routes/
    └── (app)/vault/[id]/+page.svelte # Default to FrontPage if no entity selected

packages/
├── vault-engine/
│   ├── src/
│   │   ├── services/
│   │   │   ├── CampaignService.ts   # Metadata and frontpage tag logic (Uses DI for EntityDb)
│   │   │   └── ActivityService.ts   # Tracking recent changes (Uses DI for EntityDb)
```

**Structure Decision**: Integration into `apps/web` for UI and `packages/vault-engine` for Dexie-backed logic.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
