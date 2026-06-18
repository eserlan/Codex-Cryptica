# Research: Calendar / Agenda View for Events

## Decision 1: Reuse `packages/chronology-engine` for calendar bucketing and month-grid shaping

- **Decision**: Implement pure helpers in `packages/chronology-engine` for month-grid construction, agenda ordering, exact-date bucketing, and exclusion/grouping of approximate or missing dates.
- **Rationale**: The constitution requires library-first design for major features. The repo already keeps date logic in `chronology-engine`, so extending it preserves testability and avoids embedding date rules inside Svelte components or stores.
- **Alternatives considered**:
  - Put all month-grid math in `timeline.svelte.ts`: rejected because it would couple date rules to UI state and weaken reuse/testing.
  - Create a brand-new `calendar-engine` package: rejected because `chronology-engine` already owns the relevant date semantics.

## Decision 2: Build on the existing timeline route and store rather than creating a separate calendar route/store

- **Decision**: Extend the current timeline experience with an additional month-calendar mode plus agenda/list mode, reusing `apps/web/src/routes/(app)/timeline/+page.svelte` and evolving `timelineStore` to carry calendar-specific view state and filters.
- **Rationale**: The current app already has a timeline route, filter bar, and event extraction path from vault entities. Reusing that flow is simpler than inventing a parallel calendar subsystem, and it keeps the chronology feature set discoverable in one place.
- **Alternatives considered**:
  - Add a separate `/calendar` route and new store: rejected because it duplicates chronology state and navigation.
  - Embed the first release only inside the world front page: rejected because the spec requires a full calendar view, not just a dashboard widget.

## Decision 3: Scope visible data to the active world in the app layer

- **Decision**: Filter event entries in `apps/web` using the existing active vault/world context before passing them into month-grid and agenda helpers.
- **Rationale**: The spec requires world-scoped visibility, while the current timeline store traverses all vault entities. Scoping belongs in the app layer because it depends on active world context and existing stores rather than on generic chronology math.
- **Alternatives considered**:
  - Let package helpers inspect world metadata directly: rejected because package helpers should remain pure and store-agnostic.
  - Leave the current cross-vault/cross-world extraction unchanged: rejected because it violates FR-008.

## Decision 4: Use existing entity detail navigation instead of a calendar-specific preview or modal

- **Decision**: Calendar and agenda entries will open the existing related entity/event detail experience already used elsewhere in the app.
- **Rationale**: The user explicitly clarified this. It also avoids duplicating detail UI and keeps the calendar feature focused on chronology browsing rather than content rendering.
- **Alternatives considered**:
  - A calendar-only preview modal: rejected because it introduces a second detail surface with less capability.
  - A bespoke day drawer with embedded detail content: rejected because it increases scope without changing the core value.

## Decision 5: Represent crowded days with a capped inline list plus an interactive overflow surface

- **Decision**: Each month cell shows a fixed number of inline entries and an interactive `+N more` control that opens the full list for that date.
- **Rationale**: The spec requires all same-day events to remain accessible while preserving mobile usability. The overflow pattern avoids unbounded cell growth and is testable.
- **Alternatives considered**:
  - Expand cells vertically to show every event: rejected because it breaks scanability and mobile layout.
  - Non-interactive overflow text only: rejected because it would violate the accessibility requirement for hidden items.

## Decision 6: Treat uncertain dates as agenda-only in v1

- **Decision**: Exact month cells render only exact dates; approximate or missing dates are grouped under `Undated/Approximate` in agenda mode.
- **Rationale**: The clarified requirement prioritizes trustworthiness in the month grid. This avoids misleading users by pinning fuzzy dates to exact days.
- **Alternatives considered**:
  - Infer a nearest day or month bucket: rejected because it misrepresents uncertain chronology.
  - Show approximate entries in separate month-cell buckets: rejected because it complicates the first release with limited extra value.

## Decision 7: Derive the calendar's "current date" from a three-level priority chain (FR-012)

- **Decision**: When the calendar opens, it resolves its starting date using: (1) an active-world vault entity whose title matches a controlled set (`"current date"`, `"today"`, `"present day"`, `"current day"`, `"now"`) and has an exact date; (2) the vault's `currentYear` setting in `calendar.svelte.ts`; (3) real-world `new Date()`.
- **Rationale**: Worldbuilders often track an in-world "present day" as a named entity, and a vault-level year setting is already a lightweight way to anchor chronology. Falling through to the real-world date guarantees the calendar always opens somewhere useful without requiring any configuration. All three tiers are read-only at derivation time; no new schema fields or entity types are introduced.
- **Alternatives considered**:
  - Always open to real-world date: rejected because it is meaningless for fantasy or historical worlds.
  - Require explicit user configuration: rejected because it adds friction and the entity-title lookup is zero-config for users who already track a "current date" node.
  - Use only the vault year setting: rejected because it forces manual maintenance even when a "current date" entity exists.
