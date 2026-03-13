# Implementation Plan: Pop-out Help Window

**Branch**: `069-pop-out-help-window` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/069-pop-out-help-window/spec.md`

## Summary

Implement a **Standalone Help** route and a "Pop out Window" trigger in the help modal. This allows users to work in the main application (Graph/Canvas) while keeping documentation visible in a separate browser window.

## Technical Context

**Language/Version**: TypeScript 5.9.3 + Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit 2, FlexSearch, isomorphic-dompurify, Lucide Svelte
**Storage**: LocalStorage (for help state persistence)
**Testing**: Vitest (`npm test`), Playwright (`npm run test:e2e`)
**Target Platform**: Modern Desktop Browsers
**Project Type**: Web Application (SvelteKit)
**Performance Goals**: Instant search rendering via FlexSearch; <500ms launch for pop-out window.
**Constraints**: Must maintain theme consistency between main app and standalone window.
**Scale/Scope**: ~20-30 help articles; standalone route only renders help components.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **V. Privacy**: All help searching and rendering is client-side.
- **VI. Clean Implementation**: New components will use `$derived` and strictly typed props.
- **VIII. Dependency Injection**: `helpStore` is already a singleton with explicit `init()`.

## Project Structure

### Documentation (this feature)

```text
specs/069-pop-out-help-window/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── help/
│   │       ├── HelpTab.svelte       # [MODIFIED] Added pop-out trigger/filtering
│   │       └── HelpHeader.svelte    # [NEW] Common header with search/actions
│   └── stores/
│       └── help.svelte.ts           # [MODIFIED] State for standalone checks
└── routes/
    ├── +layout.svelte               # [MODIFIED] Whitelisted /help as popup
    └── help/
        └── +page.svelte             # [NEW] Standalone help entry point
```

**Structure Decision**: Standard SvelteKit route structure. We reuse the existing `HelpTab.svelte` component as the primary view for the new route.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
