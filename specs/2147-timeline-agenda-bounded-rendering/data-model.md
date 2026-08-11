# Data Model: Bounded Timeline and Agenda Rendering

This feature adds no persisted data. The following are transient view models and benchmark metadata.

## Date-heavy fixture

| Field               | Type     | Rules                                                                          |
| ------------------- | -------- | ------------------------------------------------------------------------------ |
| `fixtureVersion`    | string   | Stable version identifier.                                                     |
| `fixtureChecksum`   | string   | Hash of deterministic synthetic data; no content is logged.                    |
| `entityCount`       | number   | Existing large-vault scale, currently 1,600.                                   |
| `datedDistribution` | metadata | Counts by exact, approximate, invalid, missing, year/era, and same-day cohort. |

## Visible render window

| Field                     | Type                               | Rules                                                                      |
| ------------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| `startIndex` / `endIndex` | number                             | Half-open logical entry bounds; clamped to the full sequence.              |
| `overscan`                | number                             | Additional entries before/after the viewport; bounded and deterministic.   |
| `anchor`                  | string                             | Logical entry or section identity used for scroll/focus restoration.       |
| `viewMode`                | `agenda \| vertical \| horizontal` | Policy is view-specific.                                                   |
| `generation`              | number                             | Monotonic identity; stale range computations cannot overwrite newer state. |

## Logical grouping

- `TimelineEntry`: existing normalized entry with entity ID, title, type, date, and era ID.
- `AgendaSection`: existing chronology-engine section with stable section ID and entries.
- `VisibleTimelineGroup`: existing year/era grouping projected to visible child entries; headers remain mounted when they label a visible slice.

## Invariants

1. Visible entries are an ordered subsequence of the complete filtered sequence.
2. Every visible entry has a stable key based on entity identity and occurrence identity; title alone is not sufficient.
3. Approximate/missing/invalid entries are not silently promoted into exact-date windows.
4. Selection is keyed by entity ID and remains valid even when its DOM node is temporarily outside the window.
5. A newer `generation` always wins over a stale scroll/range result.
