# Prevent Duplicate NPC Presence Records When Companions Move (#5176) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

When a named NPC (such as a companion or porter) accompanies the player across locations, `visiblePatch.activeCharacters.add` allocates a new `StateFact` ID on re-mention instead of updating the existing `activeCharacters` entry for that person. `applyPlaces` then parks the old ID at the previous `placeId` while tagging the new ID at the current `placeId`, leaving one in-world person simultaneously present in multiple places and producing duplicate `elsewhere` entries.

### Scope & Boundaries

- **In Scope**:
  - **Presence deduplication on commit** (`packages/adventure-engine/src/npc-presence.ts`, `completed-turn.ts`, `places.ts`): when `visiblePatch.activeCharacters.add` introduces a character that unambiguously resolves to an existing `activeCharacters` entry (via `sourceRecordId`, `personId`, `session.people` alias/name resolution, or unambiguous exact/base-name match when no same-name ambiguity exists), convert the `add` into an `update` on the existing `activeCharacters` ID so `applyPlaces` moves that single presence record instead of creating a clone.
  - **Companion travel vs. refusal**: on a `moveTo` turn, if the committed action/narration explicitly indicates an existing `activeCharacters` NPC at `previousId` accompanied/followed the player—and does not indicate refusal/staying behind—update that NPC's `placeId` to `currentId`. If they refuse or stay behind, keep them at `previousId`.
  - **Safe legacy reconciliation**: provide an idempotent `reconcileDuplicateActiveCharacters(session)` helper (applied in `applyCompletedTurn` and `projectVisibleState`) that collapses unambiguous duplicate `activeCharacters` entries in `visibleState` (retaining the latest presence/place and merged `cues`) without mutating historical `turns` or `provisionalFacts`, and never merging distinct `sourceRecordId`s or ambiguous same-name people.
  - **GM-only diagnostic integrity check** (`apps/web/src/lib/services/adventure/adventure-review-capture.ts`): add `duplicateActiveCharacterPresence` to `integrityChecks(session)` to report multiple `visibleState.activeCharacters` entries resolving to the same `AdventurePerson`.

- **Out of Scope**:
  - Rewriting historical committed `turns` or deleting `provisionalFacts`.
  - Auto-merging genuinely distinct NPCs who share a first name or `sourceRecordId`.
  - Inventing unprompted companion movement on behalf of the player.

### Acceptance Criteria

- [ ] **1. Companion travel**: Porter Mara joins at Market, walks to Office and then Alley, and leaves -> at most one live `activeCharacters` entry for Mara at each step, with the correct `placeId`, and no duplicate when revisiting Market.
- [ ] **2. Re-encounter after gap/reset**: Encountering Mara again after a gap or stateless reset reuses her existing identity/presence record and updates her `placeId`.
- [ ] **3. Same-name distinction**: Two different NPCs sharing a first name (e.g. two `"Mara"` entries in `session.people` or distinct `sourceRecordId`s) remain distinct and are never coalesced.
- [ ] **4. Companion refuses to follow**: When Mara refuses to follow or stays behind on a move turn, her `placeId` remains at the previous place.
- [ ] **5. Legacy recovery & idempotency**: An old session with duplicated `activeCharacters` IDs recovers cleanly without deleting `turns` or `provisionalFacts`; repeated reconciliation is idempotent.
- [ ] **6. Projection & diagnostic consistency**: `projectVisibleState()` renders no simultaneous clones in `activeCharacters` or `elsewhere`, and `adventureDiagnosticJson` reports `integrityChecks.duplicateActiveCharacterPresence`.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- `packages/adventure-engine/src/types.ts` & `state-schemas.ts`:
  - Add optional `personId?: string` on `StateFact` / `stateFactSchema` (non-breaking, optional).
- `packages/adventure-engine/src/npc-presence.ts` (new focused module):
  - `extractNpcPresenceName(text)`: extract the base character name from `"Mara, the porter"` or `"Mara"` (trimming role/descriptor clauses after `,` or `(`).
  - `resolveActiveCharacterMatch(entry, existing, people)`: match by `sourceRecordId`, `personId`, unambiguous `resolvePersonByReference(people, name)`, or unambiguous exact/base-name match when `people` has no ambiguity.
  - `deduplicateActiveCharactersPatch(patch, existingActive, people)`: rewrite matching `add` entries into `update` entries (preserving `id`, merging `cues` and `sourceRecordId`/`personId`).
  - `reconcileDuplicateActiveCharacters(activeCharacters, people)`: idempotent deduplication of existing `visibleState.activeCharacters` (preferring the latest/current-place entry, merging `cues`, preserving `turns`/`provisionalFacts`).
  - `findDuplicateActiveCharacterPresence(session)`: returns bounded integrity findings for `adventure-review-capture.ts`.
- `packages/adventure-engine/src/completed-turn.ts` & `places.ts`:
  - Run `deduplicateActiveCharactersPatch` before `applyVisiblePatch`, and in `applyPlaces` detect explicit companion travel vs. refusal for NPCs at `previousId` on `moveTo` turns.
- `packages/adventure-engine/src/prompt-state.ts`:
  - Run `reconcileDuplicateActiveCharacters` when projecting `activeCharacters` and `elsewhere` so legacy sessions never render simultaneous clones.
- `apps/web/src/lib/services/adventure/adventure-review-capture.ts`:
  - Add `duplicateActiveCharacterPresence` to `integrityChecks(session)`.

### Failure, Edge & Cancellation Paths

- **Ambiguous first name**: `resolvePersonByReference` returns `reason: "ambiguous"` -> do NOT deduplicate or merge; keep both entries distinct.
- **Refusal on travel**: Narration matches refusal/staying-behind patterns (`refuses to follow`, `stays behind`, `remains behind`, `won't come`, `declines to join`) -> companion stays at `previousId`.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Schema & NPC Presence Module** — Add optional `personId` to `StateFact` and implement `packages/adventure-engine/src/npc-presence.ts`.
- [ ] **Task 2: Reducer, Places & Projection Integration** — Wire into `completed-turn.ts`, `places.ts`, and `prompt-state.ts`, plus `syncActiveCharactersToPeople`.
- [ ] **Task 3: Diagnostics & Acceptance Tests (TDD)** — Add `duplicateActiveCharacterPresence` in `adventure-review-capture.ts`, and add all 6 acceptance tests in `packages/adventure-engine/tests/npc-presence.test.ts` and `adventure-review-capture.test.ts`.
- [ ] **Task 4: Verification Gate** — Run targeted tests in `adventure-engine` and `apps/web`, commit, push, and open stacked PR targeting `fix/5175-false-non-answer`.
