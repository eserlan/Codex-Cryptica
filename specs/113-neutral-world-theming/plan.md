# Implementation Plan: Neutral App Chrome and World Theming

**Branch**: `113-neutral-world-theming` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/data/data/com.termux/files/home/proj/Codex-Cryptica/specs/113-neutral-world-theming/spec.md`

**Note**: This plan is aligned to the Speckit plan template and stops at Phase 2 planning artifacts. Implementation tasks will be generated separately.

## Summary

Split the current one-layer theme system into a neutral app appearance layer and a per-world theme layer. App chrome gets neutral light, neutral dark, and system appearances with stable typography and no texture. Existing genre themes remain per-world and continue to drive world/canvas mood, graph styling, and jargon. The first implementation must preserve existing saved theme choices, remove texture from global chrome/body surfaces, expose independent controls in Appearance settings, and polish the fantasy world theme where issue #860 identified hierarchy, edge, overlay, and graph-weight problems.

## Technical Context

**Language/Version**: TypeScript 6.x, Svelte 5, Bun 1.3.x package workflow  
**Primary Dependencies**: SvelteKit, Tailwind CSS 4 semantic tokens, Vitest, Playwright, Cytoscape, workspace `schema` and `graph-engine` packages  
**Storage**: Existing browser persistence: `localStorage`, IndexedDB settings, and per-vault OPFS config. Add app-appearance preference as global browser preference; keep world theme per vault.  
**Testing**: Vitest for schema/store/graph style behavior; Playwright for app appearance, settings controls, texture scoping, and cross-theme visual flows  
**Target Platform**: Modern desktop and mobile browsers  
**Project Type**: Web application monorepo with shared packages  
**Performance Goals**: Theme/app appearance switch should remain CSS-variable driven with no full reload, no avoidable layout shift, and no perceptible delay beyond current theme switching.  
**Constraints**: Preserve existing saved world themes; keep vault data client-side; do not add new runtime dependencies; follow Svelte 5 runes and Tailwind 4 semantic-token patterns; avoid decorative typography on long-form authored content; ensure light-surface overlays do not muddy light themes.  
**Scale/Scope**: Shared theme schema and store changes plus focused UI updates in app chrome, Appearance settings, world/front-page surfaces, graph style generation, and help guidance.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Shared theme, app-appearance, graph, and jargon contracts stay in workspace packages where reusable. Web UI remains a consumer of shared definitions. [PASS]
2. **TDD**: Store migration, schema defaults, graph styling, and UI behavior require automated coverage before implementation is complete. [PASS]
3. **Simplicity & YAGNI**: The plan extends the existing theme store/schema flow instead of adding a new styling framework or dependency. Full genre light/dark variants and onboarding genre selection are deferred. [PASS]
4. **AI-First Extraction**: Not applicable; no AI extraction path changes. [PASS]
5. **Privacy & Client-Side Processing**: All preferences remain browser/vault local. No server persistence is introduced. [PASS]
6. **Clean Implementation**: Implementation must follow Svelte 5 runes, Tailwind 4 tokens, repo style guide, and explicit tests. [PASS]
7. **User Documentation**: Appearance help text must explain app appearance versus world theme. [PASS]
8. **Dependency Injection**: Store/storage changes must preserve injectable storage dependencies for tests. [PASS]
9. **Natural Language**: Settings labels use plain terms: "App appearance" and "World theme"; avoid over-themed neutral labels. [PASS]
10. **Coverage Enforcement**: New logic must maintain or improve relevant coverage. [PASS]

**Post-Design Recheck**: Phase 1 artifacts preserve the same scope and introduce no new dependency, server storage, or architecture violation. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/113-neutral-world-theming/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── appearance-theme-contract.md
└── tasks.md                 # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
packages/
├── schema/
│   └── src/
│       └── theme.ts         # Theme/app appearance definitions, defaults, schemas
└── graph-engine/
    └── src/
        ├── GraphStyles.ts
        ├── GraphStyles.test.ts
        ├── transformer.ts
        └── transformer.test.ts

apps/
└── web/
    ├── src/
    │   ├── app.css          # App chrome variables and scoped world/canvas variables
    │   ├── app.html         # Initial paint map for app appearance/world theme
    │   ├── lib/
    │   │   ├── stores/
    │   │   │   └── theme.svelte.ts
    │   │   ├── components/
    │   │   │   ├── layout/
    │   │   │   │   ├── AppHeader.svelte
    │   │   │   │   ├── ActivityBar.svelte
    │   │   │   │   ├── AppFooter.svelte
    │   │   │   │   └── SidebarPanelHost.svelte
    │   │   │   ├── settings/
    │   │   │   │   ├── SettingsModal.svelte
    │   │   │   │   └── ThemeSelector.svelte
    │   │   │   └── world/
    │   │   │       ├── FrontPage.svelte
    │   │   │       ├── FrontPageHero.svelte
    │   │   │       └── EntityCard.svelte
    │   │   └── config/
    │   │       └── help-content.ts
    │   └── tests/
    │       └── themes.spec.ts
```

**Structure Decision**: Keep reusable theme definitions in `packages/schema`, graph rendering style in `packages/graph-engine`, and browser preference/UI concerns in `apps/web`. The existing `themeStore` remains the central web-facing preference store, but it must distinguish global app appearance from per-vault world theme and keep storage injectable for tests. CSS should expose app-chrome variables at the root and world-theme variables through scoped selectors/containers so chrome cannot inherit parchment or other genre textures by accident.

## Phase 0: Research

Research output is captured in [research.md](./research.md). Key decisions:

- Add app appearance as a separate preference scope with `light`, `dark`, and `system` resolution.
- Treat existing saved theme ids as per-world world themes for migration and backwards compatibility.
- Scope genre texture and typography to world/canvas surfaces rather than document body or chrome.
- Keep first implementation to neutral app appearances and fantasy refinement; defer all-genre light/dark variants and onboarding genre picker.

## Phase 1: Design And Contracts

Design outputs:

- [data-model.md](./data-model.md): App appearance, world theme preference, typography layer, and scoped surface model.
- [contracts/appearance-theme-contract.md](./contracts/appearance-theme-contract.md): Store, persistence, DOM, and settings behavior contracts.
- [quickstart.md](./quickstart.md): Manual and automated validation flow for implementation.

## Complexity Tracking

N/A - No constitution violations identified.
