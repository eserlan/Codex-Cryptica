# Phase 0 Research: Solo Adventure Mode Foundation

**Feature**: 160-solo-adventure-mode | **Date**: 2026-08-15

All planning unknowns are resolved below. No `NEEDS CLARIFICATION` remains.

## R1. Continuity source — local state, not a provider-retained thread

**Decision**: Every adventure generation uses the existing stateless,
provider-neutral `structured-generation` operation pipeline, not the separate
Interactions API. Its request contains `operation`, `messages`, and `schema`,
and contains no Interactions `input`, `previous_interaction_id`, or conversation
storage field. The
versioned local session, complete compact state, bounded canonical context, and
recent committed turns are supplied on every request. Normal Oracle chat gets
an explicit `oracle:<vaultId>:normal` conversation key; Adventure never reads or
writes it.

**Rationale**: `DefaultAIClientManager` already maps JSON MIME type and response
schema onto `structured-generation`, and the proxy validates structured output.
Local state must survive backup/restore and is already required to be complete,
so a provider-retained thread would be a second, expiring source of truth. A
stateless generation call also makes retries, provider fallback, session
isolation, and privacy easier to prove.

**Alternatives rejected**: one retained interaction per adventure, including an
Interaction request with `store: false` (the wrong transport contract, while a
retained thread also duplicates state and requires replay after expiry); reuse normal chat interaction (directly
violates FR-009/010); free-form JSON parsing (weaker than the existing pipeline).

## R2. Durable storage — one authoritative file per session

**Decision**: Store each session as `.codex/adventures/<sessionId>.json`. The
document carries its schema version, metadata, full committed transcript,
visible state, hidden state, source references, and optional pending roll. The
archive list enumerates and validates these files, then sorts by `updatedAt`.
There is no authoritative index in Phase 1.

**Rationale**: `.codex` is existing vault-owned internal metadata and already
travels through supported backup, restore, and Drive transfer. A turn needs one
write boundary. Splitting metadata, transcript, and state across files would
require a transaction protocol OPFS does not provide. The expected Phase 1
archive scale is small enough to scan asynchronously.

Writes serialize a complete candidate document. The repository does not expose
that candidate to UI until the write closes successfully. Invalid, corrupted,
or newer-version files remain untouched and are returned as unreadable archive
entries. If multiple active files exist after external restore, the newest
valid `updatedAt` file is the **effective active** session. The others retain
their on-disk `active` status but load with the ephemeral condition
`duplicate-active-conflict`; they are read-only, cannot acquire control, and do
not count as playable active sessions. Nothing is silently rewritten.

**Alternatives rejected**: IndexedDB-only (does not travel with vault backups);
one active file plus archive files (rename/move introduces failure windows);
authoritative `index.json` (two-file transaction); JSONL transcript (partial
append and state reconciliation complexity).

## R3. Turn transaction — schema, validate, reduce, persist, publish

**Decision**: A generation response is an `AdventureTurnProposal` containing:

- player-facing narration;
- `complete` or `roll-required` resolution;
- explicit visible and hidden state patches;
- explicit secret reveal IDs;
- provisional facts and canonical source IDs used;
- an optional roll request, present only for `roll-required`.

The engine parses the proposal, rejects contradictory shapes, applies it to a
deep copy, checks state and secrecy invariants, and returns a candidate session.
The repository persists that candidate before the manager publishes it. Turn
IDs and input IDs are stable and idempotency-checked.

**Rationale**: This is the smallest sequence that ensures failures cannot leave
half a state transition. Explicit patches make attributable change reviewable
without asking the model to reproduce the entire session document.

**Alternatives rejected**: stream narration directly into the transcript
(exposes an uncommitted turn); accept a complete replacement state (omissions
can erase unrelated facts); mutate then roll back (harder to prove safe).

## R4. Rolls — persisted suspension around one unresolved action

**Decision**: A `roll-required` proposal may add player-facing setup and a
`PendingRoll`, but does not apply its proposed world-state changes or append a
completed Oracle turn. The pending record contains the original input ID,
uncertainty, stakes, optional basic dice expression, predeclared outcome bands,
and an optional supplied outcome with resolution status. It survives reload.

The player can:

- report a narrative or numerical outcome, which is authoritative and persisted
  before resolution;
- invoke existing `dice-engine` for the predeclared expression, recording the
  returned result and selected band exactly once before resolution; or
- withdraw/change approach, which clears the pending record without changing
  the last committed adventure state, provided no outcome has been recorded.

Resolution makes one new structured call containing the original action and
the persisted supplied outcome. Offline or failed resolution preserves that
outcome for retry without rerolling. A completed response copies the outcome to
one committed turn and clears the pending roll.

**Rationale**: A pending roll is a control-state pause, not completed fiction.
This prevents duplicate turns and makes withdrawal satisfy FR-029 without a
rollback.

## R5. Hidden-state boundary — explicit secrets and defense in depth

**Decision**: Hidden state consists of typed records with stable IDs, concise
secret text, optional reveal condition, and `hidden | revealed` status. A turn
can reveal only IDs listed in `revealSecretIds`; the reducer moves only those
facts into visible discoveries. Before commit, normalized unrevealed secret
strings and test canaries are scanned across narration, visible patches, roll
copy, provisional player-facing facts, and the serialized player transcript.

The prompt places hidden state in a separately labelled GM-only block and says
that it may inform consequences but must not be quoted, paraphrased as known,
or revealed without returning its ID. Scripted semantic evaluations cover cases
that exact-string scanning cannot prove.

**Rationale**: Schema separation prevents accidental rendering, reveal IDs
prevent wholesale disclosure, and the scan catches high-confidence leakage.
No text filter can prove semantic secrecy by itself, so evaluation is an
explicit release gate rather than an implied guarantee.

## R6. Canon versus provisional session material

**Decision**: `SourceRecordReference` stores identity and display metadata, not
an authoritative lore snapshot. Before each turn, the context adapter resolves
anchored IDs and action-relevant search results against the current vault. A
deleted/hidden/unavailable source is marked unavailable and excluded from the
prompt. Canonical excerpts are labelled with source IDs; provisional people,
places, clues, items, and events live only in session state with distinct IDs.

If a proposed provisional fact contradicts supplied canonical material, local
validation rejects known identity/source conflicts; the prompt contract requires
canon to win for broader semantic conflicts. The implementation never invokes
Oracle discovery, `DraftingEngine`, entity create/update, or automatic archive
paths.

**Rationale**: Live resolution prevents stale content from posing as canon, and
separate namespaces make accidental canonical writes testable.

## R7. Cross-tab ownership — atomic lease plus advisory broadcast

**Decision**: A foundational `AdventureControlAuthority` stores a lease record in the
existing Dexie `appSettings` table under
`adventure-control:<vaultId>:<sessionId>`. Acquisition is one read-check-write
Dexie transaction. The value contains a random owner ID, fencing token, and
expiry. The owner renews every 3 seconds with a 10-second lease; submit and roll
commands revalidate ownership in a transaction immediately before work.

Every commit path can therefore verify authority before the P1 state manager is
complete. A separate `AdventureControlCoordinator`, added with resume/tab UI,
renews the lease and uses `BroadcastChannel` to announce commits, releases, and
lease changes so observers refresh promptly. Broadcasts never grant authority.
`pagehide` performs a best-effort release; expiry covers crashes. A new owner
always reloads the last persisted session before accepting input. An owner token
plus input ID prevents late work from a former owner from committing.

**Rationale**: Existing broadcast patterns are useful notification mechanisms
but can race. A Dexie transaction provides a shared serialization point without
a schema migration, while expiry makes abandoned control recoverable.

**Alternatives rejected**: BroadcastChannel election alone (not atomic);
`localStorage` events (same race); Web Locks only (platform-availability risk);
permanent owner marker in the vault (device-transient state should not sync).

## R8. Oracle integration boundary — dedicated manager and worker method

**Decision**: Add `AdventureManager` beside the existing `ui`, `chat`,
`context`, `actions`, settings, and reconciliation managers. The Oracle facade
only constructs/exposes it. The worker gains `generateAdventureTurn`; it calls
the dedicated generation service and cannot enter normal proactive discovery or
chat history paths.

Large immutable session/transcript values use `$state.raw` and replacement;
computed UI state uses `$derived`. Network/storage work is initiated by explicit
handlers rather than broad `$effect` synchronization.

**Rationale**: The current facade is already decomposed. Extending
`OracleChatManager` or passing a mode flag through normal generation would make
FR-009/010/020 depend on every future branch remembering the flag.

## R9. Context budget — state first, lore second, transcript last

**Decision**: Enforce `MAX_SERIALIZED_STATE_CHARS = 32_000` after every proposed
patch and `MAX_GENERATION_INPUT_CHARS = 96_000` for every request. Individual
state text values are capped at 600 characters; collection-specific item caps
are defined in `data-model.md`. A post-patch overflow is invalid and leaves the
committed session unchanged; retry instructions tell Oracle to consolidate or
update existing facts rather than append duplicates.

Allocate the request budget in this order and within these ceilings:

1. behavior, agency, output-schema, canon, and secrecy rules — 16,000 chars;
2. complete compact state plus current input/outcome — 36,000 chars;
3. selected player-character and anchored canonical records — 24,000 chars;
4. action-relevant canonical excerpts — 12,000 chars;
5. newest committed transcript turns — 8,000 chars.

Unused capacity may flow only to later canonical/transcript sections; complete
state is never truncated. Oversized excerpts are truncated at plain-text
boundaries and labelled. The
engine records which source IDs were included. Full transcripts remain stored
but are never blindly replayed. There is no AI-generated recap in Phase 1;
structured state carries long-range continuity.

**Rationale**: This makes prompt growth bounded while preserving the facts
required for a 30-turn session. An AI recap would add another potentially
incorrect state layer and is explicitly a later capability.

## R10. UI, privacy, and accessibility

**Decision**: Adventure is an explicit Oracle surface with start, continue,
play, pending-roll, end confirmation, archive list, and read-only transcript
states. It uses native buttons/forms, visible labels, logical focus order,
keyboard submission that does not conflict with multiline entry, centralized
polite status announcements, and status text/icons rather than color alone.

The start flow displays: “GM notes are hidden while you play, but they are not
encrypted from the vault owner.” Read-only tabs explain where control lives and
when takeover becomes available. Save/generation failures preserve input and
offer a named retry.

Offline, active and archived sessions remain readable. Start, action, and
resolution forms remain visible but do not dispatch generation; typed actions
and recorded roll outcomes are preserved, announced as waiting for connection,
and can be retried after reconnection. Basic dice may be rolled locally only
after its expression and bands exist; its result is persisted before any
resolution attempt and cannot be rerolled on retry.

**Rationale**: Data minimization and transparency are part of the product
boundary, not help-text afterthoughts. The existing style guide requires Svelte
5 runes, Tailwind semantic tokens, Iconify utilities, motion preferences, and
accessible interaction patterns.

## R11. Verification strategy

**Decision**: Combine deterministic tests and scripted model evaluations:

- engine schema/reducer/state-machine property and fixture tests;
- persistence failure, corruption, newer-version, and backup round trips;
- lease race, expiry, stale-owner, rapid retry, and takeover tests with injected
  clock/IDs plus two-page Playwright coverage;
- normal/adventure/sequential-adventure context isolation tests;
- roll direct/report/dismiss/reload/use-once paths;
- 30-turn continuity and hidden-canary fixtures;
- pure agency/secrecy/roll scorers in `adventure-engine` plus an app-side runner
  that sends every fixture through `AdventureTurnGenerationService` against
  each configured structured-output provider and records threshold results;
- component accessibility checks and keyboard/focus journeys.

**Rationale**: Deterministic tests prove local invariants; evaluations measure
the behavioral properties that a schema cannot guarantee. Both are required
before Phase 1 can claim the spec's success criteria.
