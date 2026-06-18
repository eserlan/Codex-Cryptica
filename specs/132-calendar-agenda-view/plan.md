# Implementation Plan: Calendar / Agenda View for Events

**Branch**: `132-calendar-agenda-view` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/132-calendar-agenda-view/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a month-grid calendar and agenda view for world-scoped events using the existing chronology and vault data model. The implementation will keep calendar math and event bucketing in reusable `packages/chronology-engine` helpers, extend the existing timeline filtering/navigation flow in `apps/web`, and surface the feature in the chronology route plus a dedicated world front-page/dashboard section with mobile-safe overflow handling and navigation into the existing entity detail view.

## Technical Context

**Language/Version**: TypeScript 6.0.3 + Svelte 5 runes  
**Primary Dependencies**: SvelteKit, Tailwind 4 semantic tokens, existing `packages/chronology-engine`, existing `schema` types, existing vault/world/timeline stores  
**Storage**: Existing vault entity data plus browser-local IndexedDB-backed calendar settings via `apps/web/src/lib/stores/calendar.svelte.ts`; no new persistence format  
**Testing**: Vitest, Svelte Testing Library, `bun run --filter chronology-engine test`, `bun run --filter web test -- src/lib/components/timeline`, existing workspace lint/typecheck commands  
**Target Platform**: Browser-based SvelteKit app, desktop and mobile  
**Project Type**: SvelteKit web app with reusable workspace package helpers  
**Performance Goals**: Calendar view renders visible month events within 2 seconds of navigation; filter changes complete within 500ms; crowded cells remain interactive without horizontal scrolling on mobile  
**Constraints**: Local-first behavior, no new server dependency, world-scoped event visibility only, approximate/missing dates excluded from exact day cells, existing detail navigation reused, Svelte 5 runes + Tailwind semantic tokens + Iconify only  
**Scale/Scope**: One month-grid view and one agenda view for world events, one active filter state, hundreds of events per month, v1 excludes custom fantasy calendar month names and multi-day span rendering beyond start-date placement

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: PASS. Calendar bucketing, month-grid generation, and agenda ordering will live in `packages/chronology-engine` as pure helpers; `apps/web` remains the UI and store integration layer.
2. **TDD**: PASS. The implementation will add failing package and component tests before logic changes, including success and empty/overflow/undated paths.
3. **Simplicity & YAGNI**: PASS. Reuse existing chronology types, timeline store concepts, world front-page context, and detail navigation instead of adding a new persistence layer or parallel detail surface.
4. **AI-First Extraction**: PASS. No AI dependency is introduced.
5. **Privacy & Client-Side Processing**: PASS. All calendar derivation remains local in the browser against existing vault data.
6. **Clean Implementation**: PASS. UI stays within the style guide: Svelte 5 runes, Tailwind semantic tokens, Iconify classes, and accessible controls.
7. **User Documentation**: PASS. The feature will extend chronology/world help content and include empty-state guidance.
8. **Dependency Injection**: PASS. New service/store boundaries will use constructor-based DI where introduced; pure helpers stay package-local.
9. **Natural Language**: PASS. User-facing copy will use plain terms such as "Calendar", "Agenda", "No events", and "Undated/Approximate".
10. **Coverage Enforcement**: PASS. New chronology helpers and timeline/calendar UI tests must maintain or improve coverage.
11. **Agent Protocol**: PASS. Scope is constrained to the requested feature, with explicit verification targets.
12. **Labels Over Tags**: PASS. Filters and user-facing chronology UI will use existing "Labels" terminology only.

## Project Structure

### Documentation (this feature)

```text
specs/132-calendar-agenda-view/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/src/
├── routes/
│   └── (app)/
│       └── timeline/
│           └── +page.svelte
├── lib/
│   ├── components/
│   │   ├── timeline/
│   │   │   ├── CalendarMonthView.svelte
│   │   │   ├── CalendarAgendaView.svelte
│   │   │   ├── CalendarDayOverflow.svelte
│   │   │   ├── TimelineFilterBar.svelte
│   │   │   └── *.test.ts
│   │   └── world/
│   │       ├── FrontPage.svelte
│   │       └── front-page/
│   │           └── front-page-controller.ts
│   ├── stores/
│   │   ├── timeline.svelte.ts
│   │   ├── world.svelte.ts
│   │   └── calendar.svelte.ts
│   └── content/
│       └── help/
│           └── chronology.md

packages/chronology-engine/
├── src/
│   ├── engine.ts
│   ├── calendar-view.ts
│   └── types.ts
└── tests/
    ├── engine.test.ts
    └── calendar-view.test.ts
```

**Structure Decision**: Keep the feature as a web-app UI enhancement over reusable chronology helpers. Calendar and agenda derivation, month-grid shaping, and date-bucketing rules belong in `packages/chronology-engine` to satisfy the library-first constitution and keep them unit-testable. `apps/web` owns the Svelte UI, world scoping, filter state integration, navigation into existing detail views, and help-content updates.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations.

## Phase Plan

### Phase 0: Research And Boundaries

- Confirm how existing timeline entries are derived from vault entities and where world-scoping should be applied.
- Define pure chronology helpers for month-grid shaping, agenda grouping, and exact-vs-uncertain date handling.
- Preserve the resolved terminology decision so UI filters use existing "Labels" language and related-entity filter wording consistently.

### Phase 1: Core Chronology Helpers

- Add pure `packages/chronology-engine` helpers for:
  - filtering with AND semantics
  - month-grid construction
  - crowded-day overflow counts
  - agenda grouping including `Undated/Approximate`
- Add unit tests for exact, approximate, missing, empty, and crowded-day scenarios.

### Phase 2: App Store Integration

- Extend `apps/web/src/lib/stores/timeline.svelte.ts` to derive world-scoped calendar entries from existing vault entities.
- Add calendar/agenda view mode state, active month navigation state, and filter inputs that feed the chronology helpers.
- Keep existing detail navigation wiring in the app layer rather than in package helpers.

### Phase 3: Timeline UI

- Add `CalendarMonthView.svelte`, `CalendarAgendaView.svelte`, and `CalendarDayOverflow.svelte`.
- Update the existing timeline route to switch between month-grid and agenda/list presentations.
- Preserve mobile usability with no horizontal scrolling and tappable overflow/detail targets.

### Phase 4: World Context And Help

- Surface the calendar experience in both required locations from the spec: the existing chronology route and a dedicated calendar section on the world front page/dashboard.
- Update chronology help content and empty-state copy so users understand exact-date limits and undated handling.

### Phase 5: Verification

- Run chronology-engine tests, timeline component tests, store tests, lint/typecheck, and changed-workspace tests.
- Complete a manual smoke pass covering month navigation, agenda switching, AND filters, overflow access, empty states, and detail navigation.

## Verification Plan

- `bun run --filter chronology-engine test`
- `bun run --filter web test -- src/lib/components/timeline`
- `bun run --filter web test -- src/lib/stores/timeline.test.ts`
- `bun run --filter '*' lint:types`
- `bun run --filter '*' lint`
- `bun run --filter '*' test -- --changed`
- Manual smoke-check timing for SC-001 and SC-003 on a representative populated world
