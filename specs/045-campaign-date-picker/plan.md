# Implementation Plan: Campaign Date Picker

**Branch**: `045-campaign-date-picker` | **Date**: 2026-02-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/045-campaign-date-picker/spec.md`

## Summary

Implement a theme-aware, era-centric popover date picker that supports custom campaign calendars (custom months and variable days per month). The technical approach involves creating a core `chronology-engine` package for calendar logic and integrating a new `TemporalPicker` Svelte component into the existing `TemporalEditor`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Svelte 5 (Runes), Tailwind CSS 4.x, Floating UI (for popover positioning)  
**Storage**: IndexedDB (via `idb`) for campaign settings, OPFS for vault metadata  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Modern Browsers (WASM/OPFS support required)
**Project Type**: Web (Monorepo)  
**Performance Goals**: Picker interaction latency < 100ms, Calendar calculations < 10ms  
**Constraints**: Must handle negative years (pre-history), offline-capable  
**Scale/Scope**: Support for calendars with up to 100 months and variable month lengths

## Constitution Check

_GATE: Passed on 2026-02-17._

1. **Library-First**: Calendar logic is encapsulated in `packages/chronology-engine`. [PASS]
2. **TDD**: 100% unit test coverage planned for the new package. [PASS]
3. **Simplicity**: Leverages Floating UI for positioning rather than custom math. [PASS]
4. **AI-First**: N/A for this UI feature. [PASS]
5. **Privacy**: Data persists strictly in local vault OPFS/IndexedDB. [PASS]
6. **Clean Implementation**: Adheres to Svelte 5 and Tailwind 4 standards. [PASS]
7. **User Documentation**: Updated help guides included in plan. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/045-campaign-date-picker/
├── plan.md              # This file
├── research.md          # Decision log for Positioning and Engine
├── data-model.md        # CampaignCalendar and Month entities
├── quickstart.md        # Setup guide for chronology-engine
├── contracts/           # ICalendarEngine interface
└── tasks.md             # Implementation breakdown
```

### Source Code (repository root)

```text
packages/
├── chronology-engine/   # NEW: Core calendar logic
│   ├── src/
│   │   ├── index.ts
│   │   ├── engine.ts    # Calendar math
│   │   └── types.ts     # Schema-aligned types
│   └── tests/
│       └── engine.test.ts
apps/
└── web/
    └── src/
        └── lib/
            ├── components/
            │   └── timeline/
            │       ├── TemporalPicker.svelte # Popover UI
            │       └── TemporalEditor.svelte # Integration layer
            └── stores/
                └── calendar.svelte.ts # Store for campaign calendar settings
```

**Structure Decision**: Monorepo. Decoupled engine ensures high testability and potential reuse in other RPG tools.
