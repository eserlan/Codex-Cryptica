# Implementation Plan: Bounded Timeline and Agenda Rendering

**Branch**: `2147-timeline-agenda-bounded-rendering` | **Date**: 2026-08-11 | **Spec**: `specs/2147-timeline-agenda-bounded-rendering/spec.md`  
**Input**: GitHub issue #2147

## Summary

Add a deterministic date-heavy benchmark first, then bound rendering for Vertical Timeline, Horizontal Timeline, and Agenda only if measurements confirm the issue. Keep chronology-engine grouping and current date semantics as the source of truth; add a small UI-side visible-window projection with explicit reconciliation for selection, keyboard focus, navigation, and scroll restoration. CalendarMonthView remains out of scope unless measurement proves it is independently over budget.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Existing `chronology-engine`, Svelte components/stores, Playwright performance harness, Vitest  
**Storage**: N/A; deterministic benchmark data is synthetic and transient  
**Testing**: Vitest component/store tests, Playwright benchmark/smoke coverage, repository lint/type checks  
**Target Platform**: Browser-local Codex-Cryptica web app  
**Project Type**: Local-first Svelte web application  
**Performance Goals**: Mount only a bounded visible/overscan slice after the threshold; document baseline and post-change DOM/render measurements for the 1,600-entity date-heavy scenario  
**Constraints**: Preserve ordering, era grouping, filters, related entities, selection, keyboard access, and scroll restoration; no user-content telemetry; no CalendarMonthView change without evidence  
**Scale/Scope**: Existing large-vault benchmark scale, with dates distributed across multiple years/eras and concentrated same-day groups; three affected views only

## Constitution Check

| Gate                | Status | Evidence/plan                                                                                                                 |
| ------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Library-first       | PASS   | Reuse `chronology-engine`; introduce no package unless shared non-UI window logic is proven necessary.                        |
| TDD                 | PASS   | Add benchmark and focused success/failure/accessibility tests before implementation.                                          |
| Simplicity/YAGNI    | PASS   | Benchmark-first and one bounded policy; no new virtualization dependency unless existing primitives cannot meet the contract. |
| Privacy/client-side | PASS   | Synthetic fixture and aggregate metrics only; vault content remains local.                                                    |
| DI/testability      | PASS   | Keep window calculation pure or inject clock/measurement dependencies where stateful behavior is required.                    |
| Style/accessibility | PASS   | Svelte 5 Runes, semantic tokens, Iconify, preserved roles/focus behavior.                                                     |
| Validation/coverage | PASS   | Targeted Vitest/Playwright plus lint/type-check; include negative and stale-window paths where applicable.                    |

## Project Structure

### Documentation (this feature)

```text
specs/2147-timeline-agenda-bounded-rendering/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/timeline-window.md
```

### Source Code (repository root)

```text
apps/web/src/routes/(app)/timeline/+page.svelte
apps/web/src/lib/components/timeline/
  CalendarAgendaView.svelte
  HorizontalTimeline.svelte
  VerticalTimeline.svelte
  TimelineEntryItem.svelte
  [bounded-window helper/component selected during implementation]
apps/web/src/lib/stores/timeline.svelte.ts
apps/web/src/lib/stores/timeline.test.ts
apps/web/src/lib/components/timeline/CalendarViews.test.ts
apps/web/tests/performance/fixtures/large-vault.ts
apps/web/tests/performance/large-vault.operations.spec.ts
docs/performance/
```

**Structure Decision**: Keep the feature in the existing web Timeline surface and performance harness. Chronology normalization/grouping stays in `packages/chronology-engine`; only a reusable UI projection or component is added if the benchmark shows all three views need the same window behavior.

## Implementation Phases

1. **Benchmark**: Extend the deterministic performance fixture with date distributions, invalid/missing/approximate entries, same-day concentration, and multiple eras. Capture per-view entry count, mounted entry count, initial render, range change, scroll, and selection samples without content.
2. **Decision gate**: Compare measurements with the existing large-vault investigation and document whether each of the three views needs bounding. Do not modify month view based on assumptions.
3. **Bounded projection**: Add pure visible-window/range helpers or a shared component contract, then integrate the minimum required view-specific policies. Use overscan and stable keys; keep full normalized data available for filtering and selection, but mount only the window.
4. **Interaction reconciliation**: Preserve era/year headers, same-day ordering, related-entity selection, focus, keyboard movement, and scroll restoration. Define stale range-change behavior so rapid navigation cannot display an old window.
5. **Verification/docs**: Add unit/component and browser tests, rerun the date-heavy benchmark, document baseline and result, then run targeted checks and repository validation.

## Out of Scope

- #2149 baseline/budget enforcement work.
- Changes to CalendarMonthView unless the new benchmark supplies direct evidence.
- Server-side indexing, persistence-format changes, or user-content telemetry.

## Complexity Tracking

No constitution violations are expected; no complexity waiver is required.
