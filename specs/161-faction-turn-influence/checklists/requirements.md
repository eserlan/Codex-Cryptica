# Specification Quality Checklist: Faction Turn — Influence Vertical Slice

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-21
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

## Validation Notes

**Iteration 1** — one issue found and corrected:

- SC-004 originally read "leaves the vault byte-for-byte identical", which describes a storage-level property rather than a user-observable one. Rewritten to state the observable outcome (no capability, relationship, entity or history change).

No [NEEDS CLARIFICATION] markers were needed. The three decisions that would normally have warranted them were settled in discussion before drafting:

1. **Where faction capabilities live** — GM-named capabilities with an explicit role mapping, so genre vocabulary stays free while resolution stays deterministic (FR-003, FR-004).
2. **How turns are paced** — eligibility is gated on the GM-set current world date; the system reads that clock and never writes it (FR-006, FR-010).
3. **Whether turns create world events** — never automatically; promotion is an explicit GM action (FR-037, FR-038).

**Iteration 2 (clarification session 2026-08-21)** — five questions asked and answered, all integrated. The three items previously listed as "settled in discussion" are now backed by explicit requirements rather than narrative, and four further gaps in resolution mechanics were closed: role vocabulary (FR-004/004a/005), opposition derivation (FR-020a–d), outcome effects (FR-031/032/032a/032b), band count (FR-017/017a/017b), and canonical terminology ("stats", "event").

**Iteration 3 (clarification session 2026-08-21, second pass)** — four questions asked and answered. Also corrected three defects found on re-scan: `a event` grammar left by iteration 2's automated term replacement, FR-015a sitting out of sequence (renumbered FR-019a), and a contradiction between Key Entities and FR-010 over whether an undone turn still counts as the most recent.

Resolved this pass: relationship directionality (FR-032/032c, FR-033, FR-020b), preview lifetime (FR-022a/022b), history growth bounds (FR-041/042, SC-011), and AI participation (FR-021a–h, FR-035a, SC-012).

**Scope change of note**: AI is now part of resolution, overruling the earlier assumption that no external generation service was involved. It participates in exactly two bounded ways — selecting the band within a mechanically determined range of at most one band either side, and writing the narrative account. It cannot set magnitudes or write stored values. Both uses are independently switchable and both fall back cleanly, so the feature remains fully functional offline. Determinism guarantees (FR-019, SC-006) were narrowed accordingly: they now hold when randomness _and_ AI band selection are both off.

**Deliberate scope decisions to revisit at plan time:**

- Undo is limited to the most recent committed turn (FR-028). Arbitrary rollback through history is not specified.
- Narrative outcome phrasing is derived from the structured result with no generation service involved. If AI narration is wanted in this slice rather than a later one, that is a spec change, not a plan detail.
- Staleness detection (FR-026) and reversal (FR-027) closely resemble behaviour that already exists elsewhere in the product. Whether to generalise that behaviour or implement it locally is a plan-stage decision, but the DRY principle in the constitution points at generalising.

- Magnitude values per band are left to plan-stage tuning; the spec constrains only their ordering (FR-017b) and determinism (FR-032a).
- FR-020b requires opposition to rise with an existing hold but does not fix the curve. That is a tuning decision, not a scope decision.

- The permitted range for AI band selection is fixed at "no more than one band either side" (FR-021a). Whether that width should itself be GM-tunable is deferred; it is a settings question, not a mechanics question.
- ~~What counts as "slow enough to interrupt the GM" (FR-021d) needs a concrete timeout at plan time.~~ **Resolved in plan**: `FACTION_AI_TIMEOUT_MS`, default 8000 ms, named export plus constructor override so it is trivially retunable. Not a per-vault setting by design (Principle IX).
- The outcome ruleset lives in code for this slice; expressing it as a GM-authored table is recorded in Out of Scope as a follow-up. Confirmed 2026-08-21 after weighing whether dice or AI should supply randomness — dice won on calibration, tunability, auditability and offline behaviour.

**Iteration 4 (post-`/speckit-analyze` remediation, 2026-08-21)** — all fourteen analysis findings remedied.

Spec changes:

- **FR-008a** added — a real-world-derived date MUST be treated as _no_ current world date. Previously this trap lived only in plan and research; it is now a requirement with acceptance scenarios (US2 7–8) and an edge case.
- **FR-025a** added — commit spans three writes with no transaction available, so a partial failure MUST roll back. This was a genuine **design** gap, not just a missing test: stats written without a history entry leave the GM with nothing to undo and no surviving inverse patch. Acceptance scenario 5a and an edge case added.
- **FR-020d merged into FR-020c** — near-duplicate, differing only by the word "exactly".
- **SC-011 quantified** — "no delay the GM perceives" replaced with "under 200 ms at 500 entries".
- **Dependencies corrected** — the entry claiming the calendar would be extended for a finer-grained date was false; research R1 established the resolved date already provides day precision.

Plan/research changes:

- **Research R10 added** — atomic commit via compensating rollback reusing the existing inverse patch, with history written last so a failure never leaves a record describing changes that did not happen.
- Research R1's claim that the spec "is corrected in this plan" was an overclaim; the correction has now actually been made.
- Build sequence gained step 8a; risk table gained the partial-commit row.

Tasks changes (80 → 89):

- **Ordering inversion fixed**: `patches.ts` moved from US4 into US3 — a proposal carries `changes`/`inverse`, so it cannot be assembled without it.
- **Ordering inversion fixed**: the preview component is now created in US3 (T049) and extended in US4 (T063), rather than being referenced before it existed.
- Nine coverage tasks added: atomic commit test + implementation, clock-immutability, year-only vault, type-unchanged-without-opt-in, hostile AI response, missing AI reason, create-at-neutral, no-pruning, and same-band-same-magnitude.

**Iteration 5 (post-`/codex-review` remediation, 2026-08-21)** — eight review findings remedied. The branch carried no code, so the review audited the design artifacts' factual claims against the real codebase.

- **Rune leak (HIGH)**: `entityContentHash` was specified as an import from the `@codex/oracle-engine` barrel, which re-exports `oracle-settings.svelte`, `chat-history.svelte` and `undo-redo.svelte`. That would pull Svelte runes into a package compiled and tested without the Svelte compiler, breaking `bun test` and contradicting the package's stated purity. Now deep-imported from `@codex/oracle-engine/src/lore-delta`, with T084 extended to assert no `.svelte.ts` enters the import graph.
- **Package name (HIGH)**: T001 said "mirror `chronology-engine/package.json`", which is unscoped. Every recently added package uses `@codex/`. The package is now explicitly **`@codex/faction-engine`**, and T001 declares its `dice-engine` and `@codex/oracle-engine` dependencies, which it previously omitted.
- **TDD ordering (MEDIUM)**: the earlier fix that moved `patches.ts` into US3 left it implemented before its tests. New **T039** writes `patches.test.ts` first; tasks renumbered T040–T090.
- **`Result<T, E>` (MEDIUM)**: origin was unspecified, and the only existing definition is in `adventure-engine` — an implementer would have imported it and created exactly the coupling research R7 declined. Now defined locally, with the rationale recorded.
- **Privacy disclosure (MEDIUM)**: the AI contract documented that faction and target names plus summaries leave the device, but nothing required telling the **GM**. T081 (help article) and T028 (settings toggles) now mandate plain-language disclosure. A contract file is developer documentation, not user disclosure (Principle V).
- **Wrong spec reference (LOW)**: `147-timeline-agenda-bounded-rendering` → `2147-`.
- **Dangling comment (LOW)**: `CommitPlan.record`'s "see notes" now explains what the field holds on `reverse`.
- **Missing input (LOW)**: data-model §6 omitted `WorldCalendar` from the eligibility inputs the contract requires.

**Status**: All items pass; clarification, analysis and code-review findings all remedied. Ready for implementation.
