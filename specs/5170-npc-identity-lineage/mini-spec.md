# Preserve NPC Identity and Correction Lineage Across Modes (#5170) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Committing an Ask GM decision is insufficient if later Play turns split one named character into multiple unrelated identities (e.g. _Ilona_ and _Envoy Marshall_) or if OOC corrections leave orphaned or duplicated provisional records. In addition, the GM-only diagnostic summary omits bounded OOC activity and entity consistency checks.

### Scope & Boundaries

- **In Scope**:
  - **Shared entity resolution** (`packages/adventure-engine/src/people.ts`): resolve partial names, titles, and composite names against `session.people` (names + aliases) so omitting a title or surname resolves to the same `AdventurePerson` rather than creating a duplicate NPC; refuse automatic resolution/merging when multiple distinct NPCs match ambiguously.
  - **Cross-mode person sync & visibility** (`ooc.ts`, `prompt-state.ts`, `prompt.ts`): sync `session.people` when OOC `person` decisions are committed, and ensure `projectVisibleState()` exposes `knownPeople` in both Play and Ask GM even before `places` are populated.
  - **Correction lineage**: allow OOC clarifications/corrections (`supersedesName`, `aliases`) to mark superseded `ProvisionalFact` entries with `supersededById`, merge aliases onto the surviving `AdventurePerson`, and re-link `linkedFactIds` without orphaned references or silent canonical overrides.
  - **GM-only diagnostics**: extend `diagnosticSummary()` and `integrityChecks()` in `adventure-review-capture.ts` with bounded OOC counts/IDs and entity-consistency findings (`orphanedPersonFactLinks`) without exposing raw OOC text or leaking into player transcripts/recaps.

- **Out of Scope**:
  - Remodelling Vault entities or auto-promoting session identities into shared Vault canon.
  - Triggering in-character actions/events merely because Ask GM established a fact.

### Acceptance Criteria

- [ ] A committed Ask GM `person` decision (e.g. _"Envoy Ilona Marshall"_) registers an `AdventurePerson` with derived aliases (`"Ilona Marshall"`, `"Ilona"`, `"Marshall"`), and `resolvePersonByReference(people, "Ilona")` or `"Envoy Marshall Ilona"` resolves to that single person.
- [ ] When two distinct `AdventurePerson` entries share a first name (e.g. two _"Ilona"_ NPCs), `resolvePersonByReference(people, "Ilona")` returns `reason: "ambiguous"` and never auto-merges them.
- [ ] An OOC correction specifying `supersedesName` marks the superseded provisional fact with `supersededById`, merges aliases onto the surviving person, and preserves valid `linkedFactIds` without orphaned links; canonical `sourceRecords` conflicts are not silently overridden.
- [ ] `projectVisibleState()` includes `knownPeople` even when `session.places` is empty, and both Play and Ask GM prompts instruct the GM to reuse `knownPeople` and clarify ambiguous names rather than inventing duplicates.
- [ ] `adventureDiagnosticJson` includes bounded `summary.ooc` (counts + latest IDs only, no raw answer text) and `integrityChecks.orphanedPersonFactLinks`, while `createPlayerTranscript` and `buildAdventureRecap` remain free of OOC history.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- `packages/adventure-engine/src/people.ts`: Add `derivePersonAliases`, `resolvePersonByReference`, `syncPersonFromFact`, and `mergeDuplicatePeople`.
- `packages/adventure-engine/src/types.ts` & `state-schemas.ts`: Add optional `supersededById` and `aliases` on `ProvisionalFact`, and optional `aliases` / `supersedesName` on `NewOocDecision`.
- `packages/adventure-engine/src/ooc.ts`: Update `commitAdventureOocExchange` to sync `session.people`, handle `supersedesName` lineage (`supersededById` + `mergeDuplicatePeople`), and update `buildAdventureOocPrompt` / `prompt.ts` with identity-reuse guidance.
- `packages/adventure-engine/src/prompt-state.ts`: Ensure `knownPeople` is included in `projectVisibleState` even when `session.places` is empty.
- `apps/web/src/lib/services/adventure/adventure-review-capture.ts`: Add bounded `summary.ooc` metrics and `integrityChecks.orphanedPersonFactLinks`.

### Failure, Edge & Cancellation Paths

- **Positive Path**: Ask GM establishes _Envoy Ilona Marshall_ -> `people` + `provisionalFacts` updated atomically -> Play sees `knownPeople` with aliases -> `"seek out Ilona"` resolves to the same person.
- **Negative / Edge Path**: Two NPCs share `"Ilona"` -> `resolvePersonByReference` returns `{ person: null, reason: "ambiguous" }` without merging. Two people with distinct `sourceRecordId`s -> `mergeDuplicatePeople` refuses unsafe merge.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Shared Entity Resolution & Lineage** — Implement `derivePersonAliases`, `resolvePersonByReference`, `syncPersonFromFact`, `mergeDuplicatePeople` in `people.ts`, plus schema updates in `types.ts` / `state-schemas.ts`.
- [ ] **Task 2: Cross-Mode Sync, Prompt & Visibility** — Wire into `ooc.ts`, `prompt-state.ts`, and `prompt.ts`.
- [ ] **Task 3: Diagnostics & Tests (TDD)** — Extend `adventure-review-capture.ts`, add comprehensive tests in `people.test.ts`, `ooc.test.ts`, and `adventure-review-capture.test.ts`.
- [ ] **Task 4: Verification Gate** — Run targeted tests, `svelte-check`, `lint:changed`, and `fallow:audit`.
