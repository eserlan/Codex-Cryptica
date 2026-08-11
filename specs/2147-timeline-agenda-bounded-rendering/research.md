# Research: Bounded Timeline and Agenda Rendering

## Decision: Benchmark before choosing the exact policy

The issue explicitly makes the implementation conditional on a representative date-heavy benchmark. Extend the existing deterministic 1,600-entity performance fixture rather than creating a second unrelated fixture. Distribute exact dates across years and eras, concentrate a large cohort on several dates, and include approximate, invalid, and missing-date records.

**Rationale**: The current fixture is not date-heavy, and the investigation says the Timeline/Agenda risk is conditional. A benchmark prevents optimizing the wrong view and supplies a before/after record.

**Alternatives considered**: A synthetic unit-only fixture would not measure DOM/component work; a production-content benchmark would violate privacy and repeatability.

## Decision: Choose the policy after baseline measurements

Keep the complete normalized and filtered entry arrays available for ordering, filters, related-entity lookup, and selection. If the benchmark confirms a DOM/component bottleneck, choose a bounded policy per view: visible-row/range rendering, pagination, or another approach that fits its geometry.

**Rationale**: `content-visibility` can reduce layout/paint but does not prevent Svelte component creation or DOM instantiation. The current `each` blocks in all three views mount every entry. Bounded mounting addresses the measured cost directly.

**Alternatives to evaluate after measurement**:

- Pagination: bounded, but changes continuous scroll and makes scroll restoration/navigation less natural.
- CSS `content-visibility` alone: insufficient because components and DOM are still instantiated.
- New virtualization dependency: defer until existing Svelte patterns prove insufficient; it adds bundle and behavior risk.
- Rebuilding chronology-engine around viewport queries: rejected because grouping/date semantics are already library-owned and should remain reusable.

## Decision: Preserve chronology-engine as the semantic boundary

Continue using `TimelineStore` and `chronology-engine` for date normalization, sorting, calendar grouping, approximate/missing-date classification, and month rendering. The new window contract is a presentation concern.

**Rationale**: This follows library-first architecture and avoids duplicating date logic in Svelte components.

## Decision: Preserve logical identity across any bounded policy

Use stable entry keys. If a bounded policy is introduced, keep the selected entity recoverable and restore focus/scroll by logical entry identity rather than DOM index. Keyboard movement must navigate the full logical sequence, not only currently rendered nodes. Add generation/cancellation state only if range computation becomes asynchronous.

**Rationale**: Windowing can otherwise cause selection loss, focus jumps, or stale content during rapid navigation.

## Decision: Keep CalendarMonthView unchanged by default

The month grid renders a fixed number of days, with only per-day entry overflow potentially growing. Measure it in the benchmark, but do not change it unless that path independently exceeds the agreed budget.

**Rationale**: The issue explicitly excludes calendar month view absent evidence, and changing it expands risk without a demonstrated need.

## Decision: Privacy-safe aggregate measurement

Record fixture version/checksum, view, counts, timings, and interaction phase only. Do not emit titles, content, or user-authored entity data.

**Rationale**: Large-vault instrumentation is local-first and privacy-sensitive.
