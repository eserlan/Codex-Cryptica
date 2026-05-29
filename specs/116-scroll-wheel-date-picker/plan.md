# Implementation Plan: Scroll Wheel Date Picker

**Branch**: `116-scroll-wheel-date-picker` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/116-scroll-wheel-date-picker/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the current campaign date picker detail controls with a scroll-wheel picker that supports partial-date precision, named calendar values, intercalary anchors, repair states, direct numeric jumps, and accessible keyboard/listbox operation. Calendar validation, stable identities, snapshots, repair decisions, and formatting remain in `packages/chronology-engine`; `apps/web` owns the Svelte wheel UI, vault calendar persistence, and help documentation.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace
**Primary Dependencies**: `chronology-engine`, `schema`, Svelte 5, Floating UI, IndexedDB `idb`, existing Tailwind 4 theme tokens
**Storage**: Browser-local vault settings in IndexedDB via `apps/web/src/lib/stores/calendar.svelte.ts`; entity temporal metadata in local vault data
**Testing**: Vitest for `chronology-engine` and Svelte component/store tests; Playwright only if manual/touch viewport behavior needs browser-level coverage
**Target Platform**: Browser PWA on desktop, tablet, and phone-sized mobile viewports
**Project Type**: Bun workspace with a reusable TypeScript chronology package plus Svelte web app integration
**Performance Goals**: Wheel value changes and dependent range recalculation complete within 100ms for calendars with 400+ selectable day positions; no visible layout overlap at 320px viewport width
**Constraints**: Local-first privacy, no server calendar processing, preserve existing partial dates, no silent calendar repair, constructor-injected services where new services are introduced, clear user-facing copy
**Scale/Scope**: One reusable date picker used for entity `date`, `start_date`, and `end_date`; supports custom calendars with stable named values, intercalary anchors, revisioned calendar configs, and large numeric ranges

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: PASS. Calendar rules, selection validation, repair decisions, and formatting contracts are planned in `packages/chronology-engine`; the web app remains a UI/persistence layer.
- **TDD**: PASS. Plan requires chronology-engine tests before implementation plus component tests for wheel interaction, accessibility, and repair states.
- **Simplicity & YAGNI**: PASS. Reuse the existing package, store, picker, Floating UI popover, and theme system; avoid adding a new wheel dependency unless native scroll/listbox implementation fails measurable requirements.
- **AI-First Extraction**: PASS. Not directly affected; temporal metadata remains structured and validated.
- **Privacy & Client-Side Processing**: PASS. Calendar config, snapshots, and date selections stay browser-local.
- **Clean Implementation**: PASS. Planned work follows Svelte 5 runes, Tailwind 4 tokens, type safety, lint, and tests.
- **User Documentation**: PASS. Update the existing Custom Chronology help article for scroll wheels, precision, anchors, and repair behavior.
- **Dependency Injection**: PASS. Any new chronology service/facade must be constructor-injected with production defaults and test doubles.
- **Natural Language**: PASS. UI copy uses plain language: "Date needs review", "Use current calendar", "Keep original", "Enter a valid day".
- **Quality & Coverage**: PASS. New engine logic targets the package's 70% coverage goal; web tests cover success and failure paths.
- **Agent Operational Protocol**: PASS. Scope is limited to the date picker and supporting chronology contracts.
- **Terminology Unification**: PASS. No user-facing "tags" terminology introduced.

## Project Structure

### Documentation (this feature)

```text
specs/116-scroll-wheel-date-picker/
|-- plan.md
|-- research.md
|-- data-model.md
|-- ui-mockups.md
|-- quickstart.md
|-- contracts/
|   `-- scroll-wheel-date-picker.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
packages/chronology-engine/
|-- src/
|   |-- types.ts
|   |-- engine.ts
|   `-- index.ts
`-- tests/
    `-- engine.test.ts

packages/schema/
`-- src/
    |-- entity.ts
    `-- schema.test.ts

apps/web/src/lib/
|-- components/timeline/
|   |-- TemporalPicker.svelte
|   |-- TemporalEditor.svelte
|   `-- TemporalPicker.test.ts
|-- stores/
|   |-- calendar.svelte.ts
|   `-- calendar.test.ts
|-- components/settings/
|   `-- VaultSettings.svelte
`-- content/help/
    `-- chronology.md
```

**Structure Decision**: Extend the existing library-plus-web chronology architecture. `packages/chronology-engine` owns date semantics and validation. `packages/schema` mirrors persisted temporal metadata constraints. `apps/web` owns picker presentation, settings persistence, and help documentation.

## Complexity Tracking

No constitution violations require justification.

## Phase 0 Research

See [research.md](./research.md). All planning unknowns are resolved without introducing a new runtime dependency.

## Phase 1 Design

See [data-model.md](./data-model.md), [ui-mockups.md](./ui-mockups.md), [contracts/scroll-wheel-date-picker.md](./contracts/scroll-wheel-date-picker.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Library-First**: PASS. Contracts keep semantic date operations in `chronology-engine` and UI state in `apps/web`.
- **TDD / Quality**: PASS. Data model and contracts define engine, schema, store, and component tests before implementation.
- **Privacy & Client-Side Processing**: PASS. All revisions and repair states are local vault data.
- **Dependency Injection**: PASS. New service/facade boundaries are contractable and testable with injected calendar engines/config stores.
- **User Documentation / Natural Language**: PASS. Quickstart includes the chronology help update and plain repair-state copy.
