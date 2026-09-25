# Contract: `SessionJournalStore` public API

This is the internal contract the Quicknote/Scratchpad UI (this slice) and later slices — #3407 (global indicator), #3408 (automatic capture), #3409 (promote-to-entity) — depend on. Changing a signature here is a breaking change for those consumers.

## Reactive state

```ts
class SessionJournalStore {
  /** The vault's current journal — active if one exists, else the most
   *  recently ended one, else undefined. Reactive ($state-backed). */
  readonly current: SessionJournal | undefined;

  /** Derived control state for the three-way UI affordance (spec FR-010). */
  readonly controlState: "start" | "open" | "resume";
}
```

`controlState` derivation (pure, delegates to `session-journal-engine`):

- `"start"` — no journal exists for the active vault, or the most recent one has `status: "ended"`.
- `"open"` — a journal is `status: "active"` and has already been opened in this browser session (tracked in-memory, not persisted).
- `"resume"` — a journal is `status: "active"` but has not yet been opened in this browser session (e.g. after a reload).

## Methods

```ts
class SessionJournalStore {
  /** FR-001, FR-013. Idempotent: returns the existing active journal if one
   *  already exists for the vault, rather than creating a second one. */
  async start(): Promise<SessionJournal>;

  /** FR-009. Marks the current active journal as "opened" for this browser
   *  session so `controlState` becomes "open". No-op if already open. */
  open(): void;

  /** FR-007. Rejects (throws) if no journal is currently active. */
  async end(): Promise<void>;

  /** FR-002. Rejects if no journal is active, or if the active journal has
   *  ended (defensive — should be unreachable via the UI once end() has run).
   *  `entry` omits `id`/`timestamp`; the store/engine assigns both. */
  async appendEntry(entry: JournalEntryInput): Promise<JournalEntry>;

  /** FR-004. Returns the created section. */
  async createSection(name: string): Promise<JournalSection>;

  /** FR-005. Rejects (throws) for an empty/whitespace-only name; the
   *  section's prior name is unchanged on rejection. */
  async renameSection(sectionId: string, name: string): Promise<void>;

  /** Supports "browsable afterward" (spec Assumption) — every past journal
   *  for the active vault, newest first. Used by a simple history list, not
   *  required to be paginated in this slice. */
  async listJournals(): Promise<SessionJournal[]>;

  /** FR-016. All journals for the active vault, active and ended alike — the
   *  same records `listJournals()` resolves, exposed synchronously off
   *  reactive state so `app-init.ts`'s `buildPayload` wiring can read it the
   *  same way it reads `mapRegistry.allMaps`/`canvasRegistry.allCanvases`. */
  readonly allJournals: SessionJournal[];
}
```

## Concurrency guarantee (FR-011)

`start()`, `open()`, `end()`, `appendEntry()`, `createSection()`, and `renameSection()` all read the current record fresh from `session_journals` immediately before merging their change and writing back — never from `current`/`$state` alone. This is what makes FR-011's cross-tab guarantee true in practice: a `put` is always built from the latest persisted data, so a tab that has been open longer can never silently overwrite an entry or section a different tab already saved. See `data-model.md`'s Persistence Mapping for why the storage shape alone doesn't provide this — the store layer does.

## Cloud backup wiring (FR-016)

`allJournals` and `importSessionJournals` (a new hook on `cloud-backup.svelte.ts`'s existing `restore` dependency object, alongside `importMaps`/`importCanvases`) are the only two new surfaces cloud backup needs from this feature. See `data-model.md`'s Cloud Backup Mapping section and `research.md`'s corresponding Decision for the full wiring.

## Forward-compatibility note for #3408 (automatic capture)

`appendEntry`'s `JournalEntryInput` shape is plain data (no DOM/Svelte types), so a future `AppEventBus` listener can call `sessionJournalStore.appendEntry({ type: "dice-roll", content: ..., sourceRef: {...} })` directly from an event handler without any change to this method's signature. This slice does not add such a listener — it only avoids a signature that would need to change when #3408 does.
