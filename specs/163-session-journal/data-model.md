# Phase 1 Data Model: Session Journal (data model, persistence & lifecycle)

## Entities

### SessionJournal

One vault's ongoing or completed play-session record (spec Key Entity, FR-001–FR-013).

| Field       | Type                  | Notes                                                                      |
| ----------- | --------------------- | -------------------------------------------------------------------------- |
| `id`        | `string`              | Stable identifier; primary key.                                            |
| `vaultId`   | `string`              | Owning vault. Indexed (`by-vault`) — FR-012.                               |
| `title`     | `string`              | User-editable; defaults to a generated title (e.g. session date) on start. |
| `status`    | `"active" \| "ended"` | FR-007, FR-013.                                                            |
| `startedAt` | `number` (epoch ms)   | Set on creation.                                                           |
| `endedAt`   | `number \| undefined` | Set only when `status` transitions to `"ended"` (FR-007).                  |
| `sections`  | `JournalSection[]`    | Ordered. May be empty (FR-006).                                            |
| `entries`   | `JournalEntry[]`      | Ordered by `timestamp` (FR-003).                                           |

**Invariants** (enforced in `session-journal-engine`, not the store):

- At most one `SessionJournal` per `vaultId` may have `status: "active"` at a time (FR-013).
- `endedAt` is set if and only if `status === "ended"`.
- `entries` is always sorted by `timestamp` ascending; append inserts in order rather than requiring a separate sort step downstream (FR-003).
- No entry may be appended to a journal whose `status` is `"ended"` (FR-007).

### JournalSection

An optional, user-named grouping within a journal (FR-004, FR-005, FR-006).

| Field  | Type     | Notes                                                                    |
| ------ | -------- | ------------------------------------------------------------------------ |
| `id`   | `string` | Stable identifier, unique within the journal.                            |
| `name` | `string` | Non-empty after trimming (FR-005) — validated by the engine, not the DB. |

**Invariants**:

- `name` MUST NOT be empty or whitespace-only; a rename attempt with such a value is rejected and the prior `name` is kept (FR-005). This is a pure validation function in the engine (`validateSectionName`), independent of storage.

### JournalEntry

One timestamped item within a journal (FR-002, FR-003, FR-014).

| Field       | Type                                   | Notes                                                                                                                                                                                           |
| ----------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | `string`                               | Stable identifier, unique within the journal.                                                                                                                                                   |
| `timestamp` | `number` (epoch ms)                    | Determines display/sort order (FR-003).                                                                                                                                                         |
| `type`      | `string`                               | `"manual-note"` is the only value this slice produces; the field exists so slice 3 (#3408) can introduce `"dice-roll"`, `"card-draw"`, `"table-result"`, etc. without a schema change (FR-014). |
| `content`   | `string`                               | The note text (this slice) or, for future types, a short rendered summary.                                                                                                                      |
| `sectionId` | `string \| undefined`                  | References a `JournalSection.id` in the same journal; `undefined` means "ungrouped."                                                                                                            |
| `sourceRef` | `Record<string, unknown> \| undefined` | Opaque structured reference to where an automatically-captured entry came from. Unused (always `undefined`) in this slice; reserved for #3408/#3409 (FR-014).                                   |

**Invariants**:

- `sectionId`, if set, MUST reference a `JournalSection.id` that exists in the same `SessionJournal.sections`. The engine validates this on append; the store never constructs a dangling reference in the first place.

## State Transitions (SessionJournal.status)

```
        start()                          end()
(none) ────────► "active" ──────────────────────► "ended"
                    ▲                                 │
                    │         (no status change —      │
                    └── open() [marks controlState     │
                        "open" for this browser        │
                        session] ───────────────────────┘
                                                    (terminal;
                                                  a new start()
                                                 creates a NEW
                                                 SessionJournal,
                                                 per FR-013)
```

- `start()`: only valid when no `SessionJournal` for this `vaultId` currently has `status: "active"`. If one exists, `start()` is a no-op that resolves to the existing active journal (this _is_ "resume" from the caller's point of view — FR-013, matching the spec's Assumption that Start/Open/Resume is a single per-vault control state, not three independent actions).
- `open()`: purely a UI/session affordance, not a `SessionJournal` field change — it flips this browser session's `controlState` from `"resume"` to `"open"` once the user has actually opened the already-active journal (contracts/session-journal-store-api.md). Naming this the same as the public contract's method avoids the drift an earlier draft of this document had (calling it `resume()` here while the contract calls it `open()` — same concept, one name).
- `end()`: valid only when `status === "active"`. Sets `status: "ended"`, `endedAt: now()`. Terminal — an ended journal never transitions again (FR-007, FR-008).

## Persistence Mapping (`apps/web/src/lib/utils/idb.ts`)

New object store, added to `CodexDB` (`DB_VERSION` bumped by 1 from its value at implementation time):

```ts
session_journals: {
  key: string; // SessionJournal.id
  value: SessionJournal; // full record, including nested sections[]/entries[]
  indexes: {
    "by-vault": string; // vaultId
  };
};
```

Added in `upgrade()`, guarded like every other store in the file:

```ts
if (!db.objectStoreNames.contains("session_journals")) {
  const store = db.createObjectStore("session_journals", { keyPath: "id" });
  store.createIndex("by-vault", "vaultId");
}
```

**Why one record per journal, not one per entry**: a whole-journal document keeps reads and the schema simple (single key, single `put`), mirroring how `canvases` and `dice_history` store whole small documents rather than field-level records. Storing one record per journal does **not** by itself satisfy FR-011's no-silent-entry-loss guarantee across tabs, though — a naive `put` of a whole document built from a tab's own stale in-memory state would silently overwrite an entry another tab added in the meantime. FR-011 is satisfied instead by a read-merge-write discipline at the store layer, not by the storage shape: every mutating `SessionJournalStore` method (`appendEntry`, `createSection`, `renameSection`, `end`) re-reads the current record from `session_journals` immediately before merging its change and writing back, rather than trusting the store's own `$state` as the source of truth for what to write. Two tabs can still race on the exact same field of the exact same entry (last write wins there, which FR-011 explicitly allows), but neither tab's `put` is built from data old enough to not know about the other tab's already-saved entry. If a future slice needs true concurrent-write throughput (not just correctness), splitting `entries` into their own keyed store (`[journalId, entryId]`) is a compatible follow-up, not a breaking change to this shape.

## Cloud Backup Mapping (FR-016)

When a vault has cloud backup enabled (existing, opt-in feature — see research.md), each `SessionJournal` record maps directly into the backup bundle, no transformation:

```ts
// packages/cloud-backup-sync bundle/delta shape, alongside existing maps/canvases:
sessionJournals?: SessionJournal[]; // whole-array replace on change, same as maps/canvases
```

Restore is symmetric: a restored `SessionJournal[]` is written back via a new `importSessionJournals(vaultId, journals)` hook on `cloud-backup.svelte.ts`'s `restore` dependency, mirroring `importMaps`/`importCanvases` exactly — no field remapping, since the IndexedDB record shape and the backup bundle shape are the same `SessionJournal`.

**Explicitly not included**: the player-facing/guest vault export (`GuestExporter`). A journal is GM-private; that export path exists to filter vault content _for players_, which a private journal has no place in (spec FR-016, Edge Cases).

## Package Boundary

| Location                                            | Contents                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/session-journal-engine/src/types.ts`      | `SessionJournal`, `JournalSection`, `JournalEntry`, `JournalEntryInput` (append-time shape, no `id`/`timestamp` — the engine assigns those).                                                                                   |
| `packages/session-journal-engine/src/engine.ts`     | Pure functions: `startOrResumeJournal`, `endJournal`, `appendEntry`, `createSection`, `renameSection`, `validateSectionName`. No I/O.                                                                                          |
| `packages/session-journal-engine/src/index.ts`      | Re-exports.                                                                                                                                                                                                                    |
| `apps/web/src/lib/stores/session-journal.svelte.ts` | `SessionJournalStore` class: `$state` for the active/loaded journal(s), constructor DI of `vaultRegistry` + `idb.ts` access, calls into `session-journal-engine` for every state transition, persists the result via `idb.ts`. |
| `apps/web/src/lib/components/quicknote/`            | Three-state control (Start/Open/Resume) added to the existing `QuickNoteScratchpad.svelte`, plus a new minimal journal view component for adding notes/sections.                                                               |
