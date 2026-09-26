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

## Panel host API (slice 2, #3407)

`SessionJournalStore`'s public API above is unchanged by slice 2. The only new surface is on `QuickNoteStore` (`apps/web/src/lib/stores/quicknote.svelte.ts`), which hosts the panel the journal renders in:

```ts
class QuickNoteStore {
  /** Which tab the scratchpad panel is showing. Transient UI state, not
   *  persisted. Was local `$state` in QuickNoteScratchpad.svelte. */
  activeTab: "notes" | "journal";

  /** FR-020. Sets isOpen = true and activeTab = "journal" directly. Does NOT
   *  call open(), which auto-selects/creates a Quicknote note (FR-023). If the
   *  panel is already open it only switches the tab. Idempotent, never toggles
   *  the panel closed. Leaves currentNote and activeNotes untouched. */
  openJournal(): void;
}
```

Behaviour changes to existing methods:

- `open(note)` with a specific note sets `activeTab = "notes"`.
- `open()` and `toggle()` without a note keep the last `activeTab`, exactly as the previous local state did (FR-023). `close()` and a vault switch do not reset `activeTab`.

Global control wiring (in `nav-items.ts`, not a store method): the `session-journal` item's action calls `quickNoteStore.openJournal()`, and additionally `sessionJournalStore.open()` only when `controlState === "resume"` (FR-021). It never calls `sessionJournalStore.start()`.

## Capture event and store additions (slice 3, #3408)

### The shared event

Defined in `packages/session-journal-engine/src/events.ts`, registered on `@codex/events`:

```ts
export const JOURNAL_EVENTS = { CAPTURE: "JOURNAL:CAPTURE" } as const;

declare module "@codex/events" {
  interface AppEventRegistry {
    "JOURNAL:CAPTURE": AppEventDefinition<
      "journal",
      {
        /** Open string: "dice-roll" | "card-draw" | "table-result" today; any
         *  future source may add its own without a journal change (FR-014). */
        entryType: string;
        /** One-line, plain-language summary. Capped by the engine. */
        content: string;
        /** Small, plain, JSON-safe reference to the source. No resolution
         *  chain, no reactive proxies. Bounded by the engine. */
        sourceRef?: Record<string, unknown>;
      }
    >;
  }
}
```

Publishing is `bus.emit({ type: "JOURNAL:CAPTURE", domain: "journal", payload, metadata: { timestamp } })`. A publisher never imports the journal, and MUST NOT set `metadata.sync`: `CrossTabBroadcaster` relays only `sync` events, and a capture belongs to the tab that made the roll (FR-031).

### Engine functions (`capture.ts`, pure)

```ts
/** The fields the engine reads from a recorded result. Structural, so the
 *  engine depends on no app or dice-engine type. */
interface CapturableRoll {
  total: number;
  parts: unknown[];
  formula?: string;
  label?: string;
  context: "chat" | "modal" | "table";
  source?: {
    sourceId: string;
    sourceName: string;
    kind: "table" | "deck";
    finalText: string;
    drawnCards?: Array<{ cardId: string; title: string; reversed: boolean }>;
  };
}

/** Limits enforced by captureToEntryInput (FR-027): summary 500 characters
 *  (ellipsis when cut); result text in sourceRef 1,000 characters; at most 30
 *  drawn cards; sourceRef at most 4 KB serialised, largest parts dropped
 *  first. */

/** Recorded dice / table / deck result -> payload, or undefined when there is
 *  nothing worth recording (blank summary). */
function buildCaptureFromRoll(
  roll: CapturableRoll,
): JournalCapturePayload | undefined;

/** Validate and bound a payload into a JournalEntryInput. Returns
 *  { ok: false, error } for a blank type or summary; caps the summary;
 *  reduces sourceRef to plain JSON-safe data. Never throws. */
function captureToEntryInput(
  payload: JournalCapturePayload,
  sectionId?: string,
): { ok: true; input: JournalEntryInput } | { ok: false; error: string };
```

### `SessionJournalStore` additions

```ts
class SessionJournalStore {
  /** FR-032. The section new entries (typed or captured) go into. Lives here
   *  so it is known while the panel is closed. Undefined = no section. */
  readonly activeSectionId: string | undefined;

  /** Ignores an id that is not a section of the current journal. */
  setActiveSection(id: string | undefined): void;
}
```

- `createSection` sets `activeSectionId` to the new section.
- `activeSectionId` is in memory only: it is `undefined` after a reload (FR-032).
- `end()` and a vault change clear it. A stored id whose section no longer exists reads as `undefined`.
- Slice 1's methods and their signatures are unchanged.

### `SessionJournalCapture` (`apps/web/src/lib/stores/session-journal-capture.ts`)

```ts
class SessionJournalCapture {
  constructor(deps: {
    store: Pick<
      SessionJournalStore,
      "current" | "activeSectionId" | "appendEntry"
    >;
    bus: AppEventBus;
    isCaptureAllowed: () => boolean; // false in guest mode (FR-033)
    log?: (message: string, error: unknown) => void;
  });
  start(): void; // subscribes as the named listener "session-journal-capture"
  stop(): void;
}
```

Handler rules, in order: ignore when `!isCaptureAllowed()`; ignore when `event.metadata.remote`; ignore unless `store.current?.status === "active"`; validate with `captureToEntryInput`; `await store.appendEntry(input)`; catch and log every failure, surface nothing.

### `DiceHistoryStore` change

`new DiceHistoryStore(idGenerator?, bus?)` — `bus` defaults to the shared `appEventBus`. `addResult` emits exactly one `JOURNAL:CAPTURE` per recorded roll, after the in-memory push and before persistence, inside try/catch. History trimming and `init()` never emit.
