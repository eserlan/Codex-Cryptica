# Contracts: Solo Oracle and Threads

Interfaces the implementation must provide. Each section lists the tests it needs, including failure paths. Shapes are in [data-model.md](../data-model.md).

## oracle-engine (extended)

```ts
type OracleOdds = "very_unlikely" | "unlikely" | "even" | "likely" | "very_likely";
rollOracleOutcome(odds?: OracleOdds, rng?: () => number): OracleOutcome
```

Tests:

- The two new odds produce valid tiers.
- At the same roll, "very likely" gives a yes answer at least as often as "likely", and "very unlikely" at most as often as "unlikely".
- The existing three odds give the same tiers as before for fixed rolls (no regression).

## solo-session-engine: oracle

```ts
askOracle(input: { question: string; likelihood: Likelihood; tension: number;
  context: EventContext }, rng: () => number): OracleAnswer
rollRandomEvent(context: EventContext, rng: () => number): RandomEvent
eventHappens(eventRoll: number, tension: number): boolean   // eventRoll <= 2 * tension
answerLabel(tier: OracleTier): Answer
interface EventContext { openThreads: { id: string; title: string }[];
  partyNames: string[]; placeName: string | null }
```

Tests:

- Every likelihood returns an answer from the scale.
- The question is trimmed and clamped to 200 characters.
- `eventHappens` holds at the boundary (2t and 2t + 1) for t = 1 and t = 9.
- Each focus resolves a subject. The thread focus with no open threads falls back. The party focus with no party falls back. A closed thread is never chosen.
- An injected rng makes results deterministic.
- An empty or invalid tension is treated as 5.

## solo-session-engine: threads

```ts
parseThreadsFile(raw: unknown): { threads: Thread[]; valid: boolean }
createThread(input, deps: { ids; clock }): Thread
editThread / closeThread(thread, note?) / reopenThread / linkEntity / unlinkEntity
pruneLinks(threads, existingIds: Set<string>): Thread[]
filterThreads(threads, { status?, kind?, search? }): Thread[]
pickOpenThread(threads, rng): Thread | null
withTension(session, value): SoloSession          // clamps to 1..9
```

Tests:

- Title limits (empty is refused, over 120 is refused). Note limits.
- The cap of 200 is refused on the 201st thread.
- Close and reopen keep the closing note.
- A file with the wrong version reads as `valid: false`, and invalid items are skipped.
- Duplicate links are ignored, and there are at most 20 links.
- A Phase 2 session parses with tension 5.

## session-journal-engine (extended)

```ts
type CaptureKind = "dice" | "tables" | "decks" | "map-moves" | "scenes" | "oracle"
  | "tension" | "threads" | "party" | "generated";
captureKindOf(entryType: string): CaptureKind | null
isCaptured(journal: { captureOff?: CaptureKind[]; captureMapMoves?: boolean }, entryType: string): boolean
withCaptureChoice(journal, kind, on): SessionJournal
formatOracleAnswer(answer): JournalCapturePayload
formatRandomEvent(event): JournalCapturePayload
formatTensionChange(from, to): JournalCapturePayload | null    // null when unchanged
formatThreadChange(change: "opened" | "closed" | "reopened", thread): JournalCapturePayload
```

Tests:

- Every existing entry type maps to a kind. Manual notes and unknown types are always captured.
- `captureMapMoves: false` still blocks map moves.
- Formatters produce the contents in the data model.

## Web stores and services

- **`SoloThreadsStore`** (`stores/solo-threads.svelte.ts`). Deps: `vaultId()`, `readFile(vaultId)`, `writeFile(vaultId, text)`, `entityIds()`, `ids`, `clock`, `publishCapture`, `isReadOnly()`.
  - API: `threads`, `open`, `closed`, `add`, `edit`, `close`, `reopen`, `remove`, `link`, `unlink`, `load(vaultId)`.
  - Writes are serialised, so the last write wins and no change is lost.
  - Tests: load on vault change; persistence round trip; a write failure keeps the in-memory state and notifies; read-only vaults refuse edits; open, close and reopen each publish a capture.
- **`SoloSessionStore`** gains `tension`, `raiseTension()`, `lowerTension()` (journaled), `ask(question, likelihood)` and `randomEvent()`. The last two return the result and publish captures.
  - `setScene` skips creating a journal section when the scenes kind is off.
  - Tests: tension bounds, persistence, scenes off, AI never called.
- **`SessionJournalCapture`** uses `isCaptured`. Tests cover each kind switched off.
- **`sessionJournalStore`** gains `setCaptureChoice(kind, on)`. Tests cover persistence and a new journal having everything on.

## Components (`components/solo/*`, `components/quicknote/*`)

| Component                   | Test id                | Must                                                                                                                                                                                              |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SoloYesNoMenu`             | `solo-yes-no-menu`     | Question field (200 characters), likelihood choice, Roll, answer with roll, event line, "Random event", tension − / + with bounds. "Interpret with the Oracle" only when AI is on.                |
| `SoloThreadsMenu`           | `solo-threads-menu`    | Open list, the closed list one choice away, filter by kind, search, add, edit, close, reopen, delete with confirmation, linked entries that open on choice. An empty state that explains threads. |
| `SoloThreadDialog`          | `solo-thread-dialog`   | Title (120), kind, note (500), entity links. Refuses an empty title with a message.                                                                                                               |
| `SoloOracleMenu` (extended) | `solo-adventure-entry` | "Let the Oracle run a scene" opens `/adventure`. Absent when AI is off.                                                                                                                           |
| `PlayPage` (extended)       | `solo-threads-menu`    | Threads reachable with no session running; absent for a read-only vault.                                                                                                                          |
| `JournalCaptureMenu`        | `journal-capture-menu` | One switch per kind, saved per journal. Replaces the map-moves toggle.                                                                                                                            |

All new controls are in the phone sheet, keyboard operable, and have accessible names (FR-030).
