# Research: Solo Oracle and Threads

Decisions for [plan.md](./plan.md). Each has a decision, a rationale and the alternatives considered.

## R1. Where the yes/no roll comes from

**Decision**: Reuse `rollOracleOutcome` in `packages/oracle-engine/src/quick-oracle.ts` and widen its `OracleOdds` additively with `"very_likely"` and `"very_unlikely"`. Its six tiers map to our answer scale: Yes, and / Yes / Yes, but / No, but / No / No, and.

**Rationale**: The roll already exists, uses an injectable random source and is tested. Adding two odds is additive, so Character Chat and guest chat keep their behaviour. The spec's assumption says to extend the quick oracle.

**Alternatives**: A new roller in `solo-session-engine` would duplicate the d100 tier logic. Changing the existing three odds would alter Character Chat.

## R2. When a random event happens

**Decision**: Each answer also rolls a separate d100 "event die". An event happens when it is at most `2 × tension`, from 2% at tension 1 to 18% at tension 9. The player can also ask for an event directly.

**Rationale**: It is our own procedure (FR-008), easy to explain in Help, and meets FR-012 and SC-003 with a nine-fold difference. A separate die keeps the answer odds independent of tension.

**Alternatives**: A "doubles on the answer die" rule resembles a published procedure, and its odds are harder to tune. A fixed event chance ignores tension.

## R3. Random event tables

**Decision**: Three original, genre-neutral tables live in `solo-session-engine`: 10 foci, 30 actions and a subject resolver. A focus names what the event is about (a thread, a party member, the place, someone new, the past, a danger, …). The resolver picks the subject: an open thread, a party member or the place, falling back in a fixed order when none exists (FR-015). The event is written as one sentence.

**Rationale**: Engine data is pure, testable and translatable later. Fallbacks make sure an event never names a closed thread or an empty party.

**Alternatives**: Rolling on the player's own random tables gives no structure. Leaving the event as AI-only breaks FR-007.

## R4. Where threads are stored

**Decision**: In the vault (clarification A), as one file, `.codex/threads.json`, written through the existing OPFS helpers (`getVaultDir`, `writeOpfsFile`, `readOpfsBlob`) by a repository with injected file access. The file is versioned (`version: 1`) and holds at most 200 threads.

**Rationale**: The vault archive (`.codex.zip`) and Save to Folder (`syncCoordinator.push`) both walk every file in the vault directory, so `.codex/threads.json` travels with exports and folder saves. Templates already live in `.codex/templates/` the same way. One small file is cheap to read and write atomically at this size.

**Not covered**: CC Cloud Backup builds an explicit payload (entries, labels, notes, media and journals) under its consent screen, so threads are not in it. Adding them means updating the consent text, which is left as a follow-up (spec, Out of Scope).

**Alternatives**: One file per thread complicates listing and deletes. IndexedDB would not travel with the vault, which the clarification rules out. Vault entities (one Note per thread) would clutter the graph and the entity list.

## R5. Thread rules

**Decision**: Pure functions in `packages/solo-session-engine/src/threads.ts`: parse (with defaults and validation), add, edit, close, reopen, delete, link and unlink, prune dead links, filter by status and kind, search, and pick a random open thread with an injected random source.

**Rationale**: Library-first (Constitution I). The web store only orchestrates storage, the journal and reactivity.

## R6. Tension

**Decision**: An optional `tension` field (1 to 9, default 5) on the solo session record. The record stays at `version: 1`, and a record without the field reads as 5.

**Rationale**: Tension belongs to the session's story state and should survive a reload. Phase 1 and 2 records stay valid (FR-031), as with Phase 2's `partyIds` and `scenes`.

## R7. Journal capture controls

**Decision**: Add an optional `captureOff?: CaptureKind[]` field to the journal record. Ten kinds cover the event types: dice, tables, decks, map moves, scenes, oracle (answers and events), tension, threads, party, generated. One engine function, `isCaptured(journal, entryType)`, maps entry types to kinds. The capture listener checks it in place of the current map-move check. `captureMapMoves: false` still counts as "map moves off" (FR-024). The solo store checks the scenes kind before creating a journal section.

**Rationale**: It generalises the one existing flag without a migration, since the IndexedDB record gains an optional field. A single mapping function keeps the rule in one tested place.

**Alternatives**: Ten separate boolean fields would grow the record and the UI code. Filtering in each publisher would scatter the rule.

## R8. New journal entries

**Decision**: Four new entry types through the existing `JOURNAL:CAPTURE` path, each with a formatter in `session-journal-engine`: `oracle-answer`, `random-event`, `tension-change` and `thread-change` (opened, closed, reopened).

**Rationale**: It reuses Phase 2's capture path, so Recent and Save to Vault work for these entries without extra code.

## R9. UI placement

**Decision**: Two new solo menus, plus one item added to an existing menu:

- **Yes or no**: the question, likelihood, answer and event, plus "Random event" and tension − / +.
- **Threads**: the open and closed list, add and edit through a small dialog, links, filter and search.
- **"Let the Oracle run a scene"** goes in the existing AI-only Ask Oracle menu. "Interpret with the Oracle" uses Phase 2's pending-prompt prefill with a new shortcut kind.
- **Capture choices** replace the single "Map moves" toggle in the journal header with a "Capture" menu of switches.

**Rationale**: No new app shell. AI-only items stay inside the menu that is already hidden when AI is off, which satisfies FR-009, FR-027 and FR-028 for free.

## R10. Help and Cif

**Decision**: Add solo-session article sections for the oracle, events, tension and threads, plus a journal capture section in the session journal article. Add three Cif controls (`solo-yes-no-menu`, `solo-threads-menu`, `journal-capture-menu`), workflows and evaluation questions, then regenerate the bundle and embeddings.

**Rationale**: Constitution VII and FR-033. This matches how Phase 2 handled help.
