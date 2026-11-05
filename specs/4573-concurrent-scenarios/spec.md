# Feature Specification: Concurrent Adventure situations

**Branch**: `4573-concurrent-scenarios` · **Created**: 2026-11-03 · **Status**: Implemented
**Issue**: [#4529](https://github.com/eserlan/Codex-Cryptica/issues/4529), under #4528.
**Foundation**: #4623 / PR #4628, now merged into staging (`d5c17dbaf`).

## User Scenarios & Testing

### US1 — Keep several situations alive (P1)

As a player, I want several unrelated situations to persist within my continuing adventure so I can investigate one, ignore another and return later.

**Independent test**: Three situations retain separate truths, discoveries and outcomes across fifteen further turns and reload.

1. Given three situations, when one is resolved, then the others retain their own knowledge, status and original truth; the Adventure remains active.
2. Given a new rumour and an active Adventure, when I choose to add it, then it joins the same session without archiving it, generating a new opening or accepting a quest.
3. Given a retry of the same import, when it is applied again, then it creates no duplicate or extra revision; changed truth under the same origin is rejected.

### US2 — Follow interests without exposing unseen situations (P1)

As a player, I want rumours to emerge through play and to change my attention freely, without being required to choose a scenario before acting.

**Independent test**: Two heard leads and one unheard situation coexist; only the heard leads can be inspected or explicitly focused.

1. Given an unheard situation, when it remains undiscovered, then its existence, count, title, identifiers and hidden outcomes are absent from player-facing lists and projections.
2. Given two heard leads and no pending roll, when I focus either or clear focus, then the scene, character, pending dice and other leads remain intact. Ignoring a lead leaves it open; abandoning it requires an explicit choice.
3. Given identical secret text in two independent situations, when one is revealed, then the other retains its own disclosure state.

### US3 — Resume existing play safely (P1)

As a returning player, I want earlier adventures to load without losing discovered facts, secrecy or progress.

**Independent test**: Ordinary, single-scenario and legacy world-entry records load repeatedly without generating additional situations or rewriting recorded reveals.

1. Given an older single-scenario record, when opened, then it becomes one known situation with the same baseline, status, events and reveal history.
2. Given older world-entry background threads, when opened, then those threads and their existing identities remain intact; prose is not guessed into structured scenarios.
3. Given a save conflict, cancellation or exhausted state limit, when changing a situation, then the prior committed session remains usable and no record is partially changed.

### Edge cases

Duplicate names across different batches; reused scenario/event/secret IDs; missing or changed source records; shared NPC references; pending rolls while changing focus; inactive sessions; malformed or future-version saves; both old and new scenario fields present; equal secret text with different disclosure; history and aggregate-state exhaustion.

## Requirements

- **FR-001**: Keep one effective active Adventure per Vault, containing a bounded collection of stable-identity situations. Original truths and provenance remain immutable.
- **FR-002**: Discovery, focus and outcome MUST be separate. Unheard situations remain hidden; hearing a rumour does not prove it true or accept a quest. Focus is optional and never restricts free action.
- **FR-003**: Add, focus, reveal and progress operations MUST use the existing revision-checked commit lifecycle. Retry is a no-op or safe duplicate result; conflicting IDs/origins and stale revisions never overwrite progress.
- **FR-004**: Existing-world background generation MUST create structured dormant situations for new batches. Preserve legacy unstructured background and its secrecy/time references without speculative reconstruction or automatic regeneration.
- **FR-005**: Prevent duplicate import using stable generation/source identity, independent of titles or similar wording. Shared canonical people/places use explicit references and do not merge independent situations.
- **FR-006**: Player views, recap, copy and resume MUST use player-safe projections. Independent scenarios MUST NOT share reveal state merely because their secret text matches.
- **FR-007**: Oracle and mandatory world retrieval MUST receive the persisted scenario collection through #4623's shared context boundary; player-known and GM-only material remain separate and bounded.
- **FR-008**: Read older ordinary and single-scenario saves through a deterministic migration to one authority. Preserve established secret IDs and committed historical references; ambiguous mixed representations fail safely without rewriting the stored file.
- **FR-009**: Preserve meaningful events and discoveries within explicit limits. Compact shared references and derived context rather than silently deleting facts, truths or event provenance; overflow fails without mutation.
- **FR-010**: Provide minimal controls within existing Adventure tools to inspect heard situations, change/clear focus and explicitly resolve or abandon a known open situation. Adding a selected rumour remains an optional shortcut; scenario selection is never a start/play prerequisite.

### Key entities

Situation: identity, immutable origin/truth, known lead, discovery, outcome, linked actors/places and progression. Focus: optional reference to one known open situation. Secret binding: the identity connecting one situation's hidden fact to its reveal history. Player projection: disclosed lead/status/events with hidden provenance excluded.

## Success Criteria

- **SC-001**: Three independent situations remain coherent through fifteen later turns, a pending roll, save/reload and returning attention to an earlier lead.
- **SC-002**: Importing the same origin twice yields one situation; importing different batches with the same title preserves separate situations.
- **SC-003**: All unheard-situation and independent-secret canary cases remain absent from deterministic player projections, including after reload and status changes.
- **SC-004**: Earlier ordinary/single-scenario/background fixtures retain their facts and reveal history through repeated loading; rejected changes preserve the last committed record.

## Boundaries and assumptions

Support up to eight structured situations when aggregate state allows. Per-situation events retain the existing maximum of 100; existing aggregate budgets may be reached earlier. These limits are ceilings, not a promise that every maximum-size combination fits. Scenario mutations wait until a pending roll is resolved or explicitly dismissed. A valid legacy record that cannot fit migration metadata remains inspectable through read-only recovery without rewriting it. Terminal outcomes remain terminal in this slice; clearing focus never abandons a situation. Contextual discovery selection/ranking (#4531), larger journal UI (#4532), automatic entity materialisation (#4533), simulation/time redesign (#4530), cross-scenario causality (#4536) and canon promotion (#4535) remain separate. This issue supplies their structured state and explicit reveal/progress hooks. Model-generated secrecy is evaluated separately from deterministic projections.
