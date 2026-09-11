# Feature Specification: Bounded Timeline and Agenda Rendering

**Feature Branch**: `2147-timeline-agenda-bounded-rendering`  
**Created**: 2026-08-11  
**Status**: Draft  
**Input**: GitHub issue #2147 — Bound Timeline and Agenda rendering in date-heavy vaults

## User Scenarios & Testing

### User Story 1 - Browse a date-heavy chronology (Priority: P1)

As a vault author, I want Timeline and Agenda views to remain responsive when many entities have dates, so I can browse history without mounting the whole chronology at once.

**Why this priority**: This is the issue’s primary risk: the current views create one component and DOM subtree per matching entry.

**Independent Test**: Open each affected view with the deterministic date-heavy benchmark fixture and verify bounded mounted work and usable interaction.

**Acceptance Scenarios**:

1. **Given** a date-heavy fixture, **when** a Timeline or Agenda view opens, **then** rendered work is bounded by the visible range/rows once the threshold is exceeded.
2. **Given** entries spanning multiple years and eras, **when** the user scrolls or navigates, **then** chronological ordering, era grouping, and selection remain correct.

### User Story 2 - Preserve ordinary and edge-case chronology (Priority: P2)

As a vault author, I want empty, approximate, invalid, and missing dates to retain their current behavior while the large-vault path is bounded.

**Why this priority**: Correctness must not be traded for the performance improvement.

**Independent Test**: Use focused store and component tests with small fixtures containing each date category.

**Acceptance Scenarios**:

1. **Given** empty, invalid, approximate, or undated entries, **when** the relevant view renders, **then** its current empty/agenda behavior remains intact.

### User Story 3 - Navigate accessibly through bounded content (Priority: P3)

As a keyboard or assistive-technology user, I want bounded rendering to preserve focus, selection, keyboard navigation, and scroll restoration.

**Why this priority**: Windowing that loses focus or navigation state would make the views unusable even if they are faster.

**Independent Test**: Exercise keyboard, selection, and scroll behavior in component tests and a browser smoke path.

**Acceptance Scenarios**:

1. **Given** a selected entry or restored scroll position, **when** the visible window changes, **then** selection and navigation remain stable and keyboard behavior remains available.

### Edge Cases

- The fixture spans multiple eras and years, including many same-day entries.
- Empty filters produce the existing empty state rather than an unbounded placeholder list.
- Invalid and missing dates do not enter the exact-date window and retain current representation.
- A range or era change reconciles the visible window without stale entries.
- A selected entry leaving the window remains selectable/recoverable through navigation.
- Calendar month view is not changed unless measurement demonstrates a separate bottleneck.

## Requirements

### Functional Requirements

- **FR-001**: The project MUST provide a documented, deterministic date-heavy benchmark fixture based on the existing large-vault scale and containing enough dated entries to exercise the failure mode.
- **FR-002**: Vertical Timeline, Horizontal Timeline, and Agenda MUST bound mounted rendering by visible date range or visible rows when the configured threshold is exceeded.
- **FR-003**: Bounded rendering MUST preserve chronological ordering, era grouping, related-entity behavior, selection, keyboard navigation, and scroll restoration.
- **FR-004**: Bounded rendering MUST preserve existing empty, approximate, invalid-date, missing-date, filter, and range-change behavior.
- **FR-005**: Calendar month view MUST remain unchanged unless benchmark evidence identifies a material rendering bottleneck there.
- **FR-006**: The benchmark and tests MUST avoid recording or emitting user-authored lore; only aggregate counts, timings, and fixture metadata may be reported.
- **FR-007**: Tests MUST cover the date-heavy success path, range/era changes, invalid or missing dates, keyboard/accessibility behavior, selection, and scroll restoration.

### Key Entities

- **Date-heavy benchmark fixture**: Deterministic synthetic entities with exact, approximate, invalid, missing, same-day, and multi-era dates; includes fixture version and checksum metadata.
- **Timeline entry**: Existing normalized dated entity representation used by vertical and horizontal views.
- **Agenda section**: Existing chronology-engine grouping of calendar entries, including the undated/approximate section.
- **Visible render window**: UI-only range/row projection identifying what may be mounted and how navigation/selection reconciles when it changes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The date-heavy fixture produces a repeatable baseline for all three affected views before implementation.
- **SC-002**: After bounding, mounted entry/card work stays within the documented visible-window budget rather than scaling linearly with all matching dated entities.
- **SC-003**: Automated tests demonstrate stable order, era grouping, filters, selection, keyboard behavior, and scroll restoration across window/range changes.
- **SC-004**: Calendar month view has no changed behavior or DOM policy unless benchmark evidence explicitly justifies it.
