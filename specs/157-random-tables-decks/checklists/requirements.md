# Specification Quality Checklist: Random Roll Tables and Custom Card Decks

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-14
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Validation findings addressed during authoring

- **Implementation leakage removed**: the source request named specific modules and files to reuse. Those were dropped from the spec body and expressed as a capability dependency instead ("existing dice rolling and roll history capabilities, which this feature extends"). Module-level reuse decisions belong in `plan.md`.
- **Two open questions resolved rather than deferred**: issue #2247 left "do decks share the table data model?" and "are tables an entity type or a distinct content kind?" open. Both are answered in Assumptions with reasoning, so no [NEEDS CLARIFICATION] markers were needed. Either can be reversed during planning without restructuring the requirements.
- **Success criteria de-technicalised**: initial drafts specified millisecond budgets. SC-003 now reads as a user-perceived outcome ("fast enough to feel instantaneous mid-conversation"); a concrete performance budget belongs in `plan.md`.

### Carried into planning

- The six user stories map to independently shippable slices in the priority order given. US1 alone is a viable MVP.
- ~~SC-010 requires product analytics that may not exist.~~ **Resolved in clarification (2026-08-14)**: analytics are wired only from the `(marketing)` route group and deliberately never fire inside the app, so the behavioural target was not measurable. SC-010 is now a design-verifiable discoverability criterion.
- Overlap with issue #2033 (VTT random room tile decks) is flagged under Related Work and needs a decision in `plan.md`: express room tile decks as a Random Source, or keep them separate.

### Clarification session 2026-08-14

Five questions asked and answered; all findings integrated into `spec.md` under `## Clarifications`. Resulting requirement changes: FR-003a (name uniqueness), FR-004/FR-004a/FR-005/FR-006 (selection modes), FR-012/FR-012a (reference scope), FR-024a (deck state merge), FR-031/FR-032 (import mode selection), SC-010 (rewritten).

### Implementation completion 2026-08-15

All 104 tasks in `tasks.md` are implemented and verified, with one exception recorded below.

Verification performed:

- **Coverage (T099)**: `random-source-engine` at 93.75% statements, 80.39% branches, 95.09% functions, 95.47% lines — comfortably past the 70% goal (Constitution X).
- **Roll budget (T100)**: `packages/random-source-engine/tests/engine.performance.test.ts` asserts p95 under 50 ms over 200 rolls of a 1,000-entry table resolving to the full depth cap (SC-003, R7). It is a budget, not a benchmark: it catches an accidental quadratic, not normal variation.
- **Plain language (T101)**: no "tag" wording anywhere in the feature's source or user-facing strings; the model calls them labels throughout (Constitution IX, XII).
- **Lint and tests (T103)**: `bun run lint` clean across all 21 packages; `bun run test` green — 439 web test files, 3,587 passing, 3 skipped.

**T102 is not done and is the one gap.** The manual quickstart pass needs a Google Drive push on one device and a pull on another to confirm deck draw state travels with the vault, plus a timed from-scratch table-creation run against the two-minute budget (SC-001). Neither is automatable here; both need a human on two real devices.

A defect the completion pass turned up and fixed: `ensureRandomSourcesLoaded` was fired and abandoned by both of its call sites, so a failed vault read surfaced as an unhandled promise rejection rather than as anything the user could act on. It now absorbs the failure, warns, and clears its loaded marker so a later mount retries instead of recording the failed read as a completed load.
