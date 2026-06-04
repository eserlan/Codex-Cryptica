# Implementation Plan: Default Art Prompts

**Branch**: `115-default-art-prompts` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/data/data/com.termux/files/home/proj/Codex-Cryptica/specs/115-default-art-prompts/spec.md`

**Note**: This plan is aligned to the Speckit plan template and stops at Phase 2 planning artifacts. Implementation tasks will be generated separately.

## Summary

Add a single art direction resolver that prepares prompts before the existing image generation service is called. The resolver uses available entity/user-authored context first, then shipped category defaults, theme defaults, and a global default. It must serve all existing image generation entry points: `/draw`, entity sidebar draw, Zen mode draw, graph context menu image generation, front page cover generation, and Oracle chat draw where context is available. The first implementation does not add a dedicated Vault Settings art-style editor; custom style guidance remains ordinary notes/entities.

## Technical Context

**Language/Version**: TypeScript 6.x, Svelte 5, Bun 1.3.x package workflow
**Primary Dependencies**: SvelteKit, workspace `schema`, existing Oracle/image generation services, existing vault/entity/category stores, Vitest, Playwright
**Storage**: No new settings storage. Shipped defaults live in code/shared package definitions. User-authored art direction remains ordinary vault content using existing entity/note persistence.
**Testing**: Vitest for resolver/default/template behavior and draw integration units; Playwright for draw entry points where current E2E coverage already exists.
**Target Platform**: Modern desktop and mobile browsers
**Project Type**: Web application monorepo with shared packages
**Performance Goals**: Prompt resolution must be synchronous or near-instant relative to image generation and must not add network calls before generation.
**Constraints**: Do not add new runtime dependencies; do not add a dedicated art direction settings editor; preserve existing tier/capability gating; preserve current image model calls; avoid named living-artist imitation in shipped defaults; keep prompts concise.
**Scale/Scope**: Shared resolver/defaults, prompt preparation integration in existing Oracle/image draw paths, draw command category parsing, front page cover context, graph/Zen/sidebar/chat entry point coverage, focused help copy if needed.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Resolver and shipped defaults should live in reusable code rather than inside individual Svelte components. Shared types/defaults belong in workspace packages where appropriate; web entry points consume the resolver. [PASS]
2. **TDD**: Resolver fallback order, template insertion, category parsing, safety of empty values, and draw entry point integration require tests before implementation is complete. [PASS]
3. **Simplicity & YAGNI**: No dedicated settings editor, no new storage layer, and no new image generation pipeline. The plan extends existing prompt preparation. [PASS]
4. **AI-First Extraction**: Existing Oracle/image generation remains the model-facing layer. This feature prepares cleaner prompt input before the existing service call. [PASS]
5. **Privacy & Client-Side Processing**: Resolver uses local vault content/defaults and does not introduce server persistence. [PASS]
6. **Clean Implementation**: Implementation must follow Svelte 5 runes, TypeScript types, DI-friendly service construction, existing Iconify icon conventions where UI is touched, and repo lint hygiene. [PASS]
7. **User Documentation**: Help copy should explain that art direction can be expressed in normal notes/entities and that defaults fill gaps automatically. [PASS]
8. **Dependency Injection**: Resolver usage in Oracle/action flows must remain mockable in unit tests. [PASS]
9. **Natural Language**: Labels and help text use plain terms: "Art Direction", "Default Art Style", and "Category Defaults"; no dedicated settings UI is implied. [PASS]
10. **Coverage Enforcement**: New resolver and integration logic must be covered by focused tests. [PASS]

**Post-Design Recheck**: Phase 1 artifacts preserve the same scope and introduce no new dependency, server storage, or dedicated settings editor. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/115-default-art-prompts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── art-direction-resolver-contract.md
└── tasks.md                 # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
packages/
└── schema/
    └── src/
        ├── art-direction.ts        # Shared types, defaults, resolver contract helpers
        ├── art-direction.test.ts
        └── index.ts

apps/
└── web/
    ├── src/
    │   ├── lib/
    │   │   ├── services/
    │   │   │   └── ai/
    │   │   │       ├── image-generation.service.ts
    │   │   │       └── image-generation.service.test.ts
    │   │   ├── stores/
    │   │   │   ├── oracle.svelte.ts
    │   │   │   └── oracle/
    │   │   │       ├── action-manager.svelte.ts
    │   │   │       ├── types.ts
    │   │   │       ├── context-manager.svelte.ts
    │   │   │       └── tests/
    │   │   │           └── action-manager.test.ts
    │   │   ├── config/
    │   │   │   ├── chat-commands.ts
    │   │   │   └── chat-commands.test.ts
    │   │   ├── components/
    │   │   │   ├── graph/
    │   │   │   │   ├── graph-context-menu-controller.svelte.ts
    │   │   │   │   └── graph-context-menu-controller.test.ts
    │   │   │   └── world/
    │   │   │       ├── FrontPage.svelte
    │   │   │       ├── CoverImage.svelte
    │   │   │       └── FrontPage.test.ts
    │   │   └── content/
    │   │       └── help/
    │   │           └── chat-commands.md
    │   └── tests/
    │       └── ai/
    │           └── image-generation.svelte.spec.ts
    └── tests/
        ├── draw-autocomplete.spec.ts
        ├── draw-button.spec.ts
        └── graph-image-gen.spec.ts
```

**Structure Decision**: Put reusable art direction types/defaults and pure resolver behavior in `packages/schema` so Oracle, tests, and future non-web clients can share it. Keep web-specific context collection in existing Oracle/action-manager, graph, front-page, and command code. Do not put resolver rules inside Svelte components. Do not add new persistence; normal vault content stays in existing entity/note storage.

## Phase 0: Research

Research output is captured in [research.md](./research.md). Key decisions:

- Use a pure resolver with a deterministic fallback order.
- Ship category/theme/global defaults as code defaults, not user settings.
- Treat user-authored art direction as ordinary content already available in draw context.
- Integrate before the current image generation model call instead of replacing the image service.
- Avoid named living-artist style references in shipped defaults.

## Phase 1: Design And Contracts

Design outputs:

- [data-model.md](./data-model.md): Art direction templates, draw context, defaults, and resolved prompt model.
- [contracts/art-direction-resolver-contract.md](./contracts/art-direction-resolver-contract.md): Resolver input/output, fallback, parsing, and integration contract.
- [quickstart.md](./quickstart.md): Focused validation flow for resolver and draw entry points.

## Complexity Tracking

N/A - No constitution violations identified.

---

## 2026-05-23 Update: Art Direction Clarification (#874)

### Proposed Changes

#### packages/schema/src/art-direction.ts

- Modify `resolveArtDirection` to compose the final prompt from the category default (if any), the theme default (if any), and the global default (always) when no custom overrides (`entityArtDirection` or `userAuthoredArtDirection`) are present.
- Implement theme normalization mapping using `THEME_ALIASES` to ensure theme IDs used in `theme.ts` map correctly.
- Update global, cover, and theme prompt wording according to the explicit prompt list (adding medium, palette, and conditional lighting; removing "cinematic"; making the global default genre-neutral).
- Add new theme prompts: `fallout`, `starwars`, `startrek`.

#### packages/schema/src/art-direction.test.ts

- Update the unit tests to assert composed prompts instead of single selected ones.
- Add test coverage for all 9 theme templates resolving correctly.
