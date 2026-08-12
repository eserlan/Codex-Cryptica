# Phase 1 Contracts: Entity Shelf Ports

**Feature**: 156-entity-shelf | **Date**: 2026-08-12

`packages/entity-shelf` touches no browser API directly. Everything crossing into storage goes
through one of four ports, injected via constructor with production defaults and both class and
singleton exported (Principle VIII, ADR 007). This is what makes the title, connection,
conflict and rollback rules unit-testable against in-memory fakes, and the 70% coverage goal
(Principle X) reachable.

---

## `ShelfStore`

The shelf itself. Implemented in `apps/web` over IndexedDB.

```ts
interface ShelfStore {
  listEntries(): Promise<ShelfEntrySummary[]>; // newest first, no blobs (FR-022, FR-026)
  getEntry(id: string): Promise<ShelfEntry | null>; // full record including blobs
  putEntry(entry: ShelfEntry): Promise<void>; // replaces by sourceVaultId+sourceEntityId (FR-009)
  removeEntry(id: string): Promise<void>;
  clear(): Promise<void>; // FR-023
  totalBytes(): Promise<number>; // FR-025

  writeJournal(journal: ImportJournal): Promise<void>;
  markWritten(importId: string, artifactKey: string): Promise<void>;
  readJournals(): Promise<ImportJournal[]>; // crash recovery at startup
  deleteJournal(importId: string): Promise<void>;
}
```

**Guarantees the implementation must uphold**

- `listEntries` never loads blobs. The list view must stay cheap however large the entries are.
- `putEntry` is a replace, not an append, when an entry already exists for the same source
  entity in the same source vault (invariant I2).
- `removeEntry` and `clear` release the space the blobs occupied (FR-023).
- Journal writes are durable before the caller proceeds; that ordering is the whole point of
  J1.

---

## `VaultReader`

Reads the _source_ vault while shelving, and the _target_ vault while planning an import.
Implemented over OPFS and the existing template stores.

```ts
interface VaultReader {
  readEntityRecord(entityId: string): Promise<string>; // stringifyEntity output
  readAsset(path: string): Promise<{ bytes: Blob; mimeType: string } | null>;
  readStatSheetTemplate(id: string): Promise<StatSheetTemplate | null>;
  readPresentationTemplate(id: string): Promise<PresentationTemplate | null>;

  listTitles(): Promise<
    Array<{ id: string; title: string; aliases: string[] }>
  >;
  hasStatSheetTemplate(id: string): Promise<StatSheetTemplate | null>;
  hasPresentationTemplate(id: string): Promise<PresentationTemplate | null>;
}
```

**Guarantees**

- `readAsset` returns `null` for a missing file rather than throwing. An entity referencing an
  image that is already gone from its own vault shelves successfully, minus that asset — a
  broken source is not a reason to refuse the operation.
- `listTitles` is the single input to both title-collision detection and connection resolution,
  which is what keeps R5's consistency invariant true by construction.

---

## `VaultWriter`

Writes into the target vault, and undoes those writes on rollback. Implemented over the
existing entity persistence and `AssetManager`.

```ts
interface VaultWriter {
  createEntity(
    record: string,
    title: string,
  ): Promise<{ id: string; path: string[] }>;
  saveAsset(asset: {
    bytes: Blob;
    mimeType: string;
    originalName: string;
    entityId: string;
  }): Promise<{ path: string[]; ref: string }>;
  saveStatSheetTemplate(template: StatSheetTemplate): Promise<void>;
  savePresentationTemplate(template: PresentationTemplate): Promise<void>;

  deleteEntity(path: string[]): Promise<void>; // rollback only
  deleteAsset(path: string[]): Promise<void>; // rollback only
  deleteStatSheetTemplate(id: string): Promise<void>; // rollback only
  deletePresentationTemplate(id: string): Promise<void>;
}
```

**Guarantees**

- `createEntity` mints an identifier unique within the target vault and **never** overwrites an
  existing entity (FR-013). The caller has already ensured the title is free (FR-013a).
- Every `delete*` is idempotent — deleting something absent is a no-op, not an error (J3).
  Rollback runs against a journal that may list artifacts the failure prevented from existing.
- The writer is not responsible for atomicity. Sequencing and rollback live in the package.

---

## `Clock` and `IdFactory`

```ts
interface Clock {
  now(): number;
}
interface IdFactory {
  next(): string;
}
```

Matching the pattern `AssetManager` already uses in `packages/vault-engine`. Injected so that
`shelvedAt` ordering and entry identity are deterministic under test.

---

## Package surface

What `apps/web` actually calls:

```ts
class EntityShelfService {
  constructor(
    store: ShelfStore,
    reader: (vaultId: string) => VaultReader,
    writer: (vaultId: string) => VaultWriter,
    clock?: Clock,
    ids?: IdFactory,
  );

  shelve(
    vaultId: string,
    entityIds: string[],
    onProgress?: ProgressFn,
  ): Promise<ShelfGroup>;
  plan(entryIds: string[], targetVaultId: string): Promise<ImportPlan>;
  import(plan: ImportPlan, onProgress?: ProgressFn): Promise<ImportOutcome>;
  recoverCrashedImports(): Promise<void>;
}
```

`plan` and `import` are deliberately separate calls. Everything requiring a decision happens in
`plan`; `import` runs unattended from a plan whose conflicts are all resolved. That split is
what FR-016a asks for, and it also keeps the journalled write phase free of any pause that
could strand a journal behind an open dialog.

`onProgress` exists to satisfy SC-009's requirement that anything past one second shows
progress.

**Reader and writer are factories keyed by vault id**, not single instances — shelving reads
one vault while importing writes another, and both can be live in the same session.
