# Implementation Plan: Support Multiple Calendar Eras / Epoch-Based Year Numbering

**Branch**: `169-calendar-eras` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/169-calendar-eras/spec.md`

## Summary

Extend `WorldCalendar` in `packages/chronology-engine` and `apps/web` with first-class calendar eras (`CalendarEra[]`), supporting forward/backward counting directions and era-relative displayed year resets (e.g., _Before the Fall / After the Fall_, _Ages 1–3_). The underlying chronology maintains continuous internal numeric integers for seamless sorting, timeline layouts, and calendar math, while centralizing all era conversions in `chronology-engine`. Provide settings management in Vault Settings and era-aware selection and direct text input in the Date Picker.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: `packages/chronology-engine` (internal framework-free package), Tailwind 4 semantic tokens, Floating UI, `@codex/events`. No new third-party dependency.  
**Storage**: Browser-local IndexedDB via existing `calendarStore` configuration persistence. No new database store or migration needed.  
**Testing**: Vitest (`bun test packages/chronology-engine`, `bun run test:changed`)  
**Target Platform**: Browser (Chromium, Firefox, Safari desktop and mobile)  
**Project Type**: Monorepo workspace package (`packages/chronology-engine`) + Web application (`apps/web`)  
**Performance Goals**: Era resolution and date formatting $< 0.1\text{ms}$ per date, zero performance impact on calendar month/agenda rendering.  
**Constraints**: 100% backward-compatibility with existing vaults using `epochLabel`; continuous linear sorting preserved across era boundaries.  
**Scale/Scope**: Vaults with 0 to dozens of eras; tens of thousands of dated entities.

## Constitution Check

_GATE: Passed before Phase 0 research. Re-evaluated after Phase 1 design._

- [x] **I. Library-First**: All era resolution, conversion, formatting, and string parsing logic is centralized in `packages/chronology-engine/src/eras.ts`. The web app is a thin UI presentation layer.
- [x] **II. TDD**: Tests defined upfront in `packages/chronology-engine/tests/eras.test.ts` and `apps/web` components covering both success and edge/failure paths.
- [x] **III. Simplicity & YAGNI**: No new dependencies, no separate calendar instance per era. Clean mathematical projection over the existing continuous integer chronology.
- [x] **V. Privacy & Client-Side**: All calendar data and era computations run 100% locally in the browser.
- [x] **VIII. Dependency Injection**: Stores and engine services follow constructor-based DI and export singletons.
- [x] **IX. Natural Language**: Clear labels and user-friendly documentation in settings and help guides.
- [x] **XII. Terminology Unification**: Uses "Labels" for era abbreviations.

### Discovery Intent Check

_Applies only when the feature adds or materially repositions a public, indexable discovery page. Mark N/A otherwise._

- **N/A**: This feature is an in-app worldbuilding calendar system enhancement; no public discovery pages are added or repositioned.

### Bounded Responsibility Check (Principle XIV)

- `packages/chronology-engine/src/engine.ts` is 515 lines. To avoid bloating it, all era-specific resolution, calculation, and parsing logic is extracted into a new module: `packages/chronology-engine/src/eras.ts`. `engine.ts` only delegates to it.
- `apps/web/src/lib/components/settings/VaultSettings.svelte` is 389 lines. To keep it well below the 500-line review trigger, era settings UI is extracted into a dedicated component: `apps/web/src/lib/components/settings/CalendarEraSettings.svelte`.
- `apps/web/src/lib/components/timeline/TemporalPicker.svelte` is 702 lines. Era selection interactions are encapsulated in a subcomponent or the existing `TemporalPickerEras.svelte`, keeping changes to `TemporalPicker.svelte` surgical.

## Project Structure

### Documentation (this feature)

```text
specs/169-calendar-eras/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research and math formulations
├── data-model.md        # Data models and interfaces
├── contracts/           # TypeScript contract definitions
│   └── calendar-eras.md
├── quickstart.md        # Feature overview and examples
├── checklists/          # Verification checklists
│   └── requirements.md
└── tasks.md             # Implementation tasks
```

### Source Code

```text
packages/chronology-engine/
├── src/
│   ├── types.ts          # Extended WorldCalendar with eras?: CalendarEra[]
│   ├── eras.ts           # Era resolution, conversion, formatting, parsing
│   ├── engine.ts         # CalendarEngine delegation to eras.ts
│   └── index.ts          # Exports
└── tests/
    ├── eras.test.ts      # Comprehensive era calculations and edge cases
    └── engine.test.ts    # Integration & backward-compatibility tests

apps/web/src/lib/
├── components/
│   ├── settings/
│   │   ├── CalendarEraSettings.svelte  # Era management UI
│   │   └── VaultSettings.svelte        # Incorporates CalendarEraSettings
│   └── timeline/
│       ├── TemporalPicker.svelte            # Era-aware date picker integration
│       ├── TemporalPickerEraSelector.svelte # Era dropdown/pill selector
│       ├── TemporalPickerEras.svelte        # Story timeline band list
│       └── utils/
│           └── temporal-picker-selection.ts # Era input parsing helper
└── config/
    └── help-content.ts   # User documentation for calendar eras
```

## Implementation Phases

### Phase 0: Research (Completed)

- Derived exact invertible formulas for forward and backward eras.
- Analyzed boundary resolution and legacy fallback semantics.
- Documented in [research.md](./research.md).

### Phase 1: Design & Contracts (Completed)

- Authored [data-model.md](./data-model.md) and [contracts/calendar-eras.md](./contracts/calendar-eras.md).
- Drafted [quickstart.md](./quickstart.md).
- Updated agent context.

### Phase 2: Implementation Tasks (Next)

- T1: Core Era Math & Engine Logic in `packages/chronology-engine/src/eras.ts` + tests.
- T2: `CalendarEngine.format()` & `parseDirectDateInput()` era integration in `chronology-engine`.
- T3: Calendar Era Settings Component (`CalendarEraSettings.svelte`) in `apps/web`.
- T4: Date Picker (`TemporalPicker`) era selection and direct date input handling.
- T5: Documentation & Help Guide updates.
- T6: Quality Gate verification (`test:changed`, `lint:changed`, type-check).
