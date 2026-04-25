# Vault Operations — Proposals

_Analysis date: 2026-04-25_

---

## Storage layers (clarified)

| Layer                 | What it is                          | Who writes it             |
| --------------------- | ----------------------------------- | ------------------------- |
| **Dexie (IndexedDB)** | In-browser cache of entity metadata | Auto-save (invisible)     |
| **OPFS**              | Canonical in-browser file store     | Auto-save (invisible)     |
| **Local folder**      | User-visible file system            | Explicit user action only |

Auto-save is purely about keeping Dexie + OPFS in sync with in-memory state.
It runs in the background, is always on, and users never need to think about it.

The local folder is a separate concern entirely. It is only touched when the user
explicitly asks to push to or pull from it.

---

## Proposed model: three operations

### Auto-save (no user action)

Memory → Dexie + OPFS. Debounced 400 ms per entity. Already works. No change needed.

### Save to filesystem (explicit button)

OPFS → local folder. Pure write. Always visible (same position as today's SYNC button),
but only enabled when there are changes that have not yet been pushed to the local folder.

```
[SAVE]  ← disabled + greyed when nothing to push
[SAVE]  ← enabled when OPFS has changes the local folder doesn't have yet
  ↓
saveToLocalFolder(opfs → localFolder)
  ↓
mark as clean
```

**Hover text (always shown):**

> "Save to file system — writes all changes from the internal archive to your linked folder."

**Dirty tracking:** a `lastSavedToFolder` timestamp is updated each time a successful push
completes. Any entity save to OPFS after that timestamp marks the vault as dirty and enables
the button. If no local folder is linked, button is always disabled with a different tooltip:

> "No folder linked — connect a local folder first to enable saving."

This is today's SYNC button renamed and made write-only. No reading from the local folder happens here.

### Load from filesystem (explicit button)

Local folder → OPFS → memory. Pure read. Only relevant if user has linked a local folder.

```
[LOAD FROM FOLDER]
  ↓
loadFromLocalFolder(localFolder → opfs)
  ↓
loadFiles()   ← opfs → memory
  ↓
done
```

The reverse direction. Use this after editing files externally.

---

## Vault switch (simplified)

Because auto-save keeps OPFS current at all times, switching only needs to drain the
in-memory debounce queue — it does not need to wait for any filesystem operation.

```
[Switch to X]
  ↓
flushPendingSaves()     ← drain 400 ms queue into OPFS (fast, already there)
clearCurrentVaultState()
loadVault(X)            ← OPFS/cache → memory for new vault
  ↓
done
```

No change to today's switch logic except removing `syncWithLocalFolder()` from the flow
(it was never the right thing to do on a switch anyway — the user didn't ask for it).

---

## Button placement

| Action               | Location                                                | Visibility               |
| -------------------- | ------------------------------------------------------- | ------------------------ |
| **SAVE TO FOLDER**   | `VaultControls.svelte` (replaces SYNC)                  | High — always visible    |
| **LOAD FROM FOLDER** | `VaultSwitcherModal.svelte` (next to active vault name) | Low — maintenance action |

Load is intentionally tucked away in the vault selector. It's a deliberate pull for users
who edit files externally (Obsidian, etc.) — not something most users need on every session.

---

## What changes in the code

### Engine (`sync-engine`)

Add a `direction` parameter to `SyncPlanner.plan()`:

```ts
type SyncDirection = "push" | "pull";

// Push mode — OPFS → local folder
// Keeps:  EXPORT_TO_FS, DELETE_FS
// Drops:  IMPORT_TO_OPFS, DELETE_OPFS, HANDLE_CONFLICT

// Pull mode — local folder → OPFS
// Keeps:  IMPORT_TO_OPFS, DELETE_OPFS
// Drops:  EXPORT_TO_FS, DELETE_FS, HANDLE_CONFLICT
```

`HANDLE_CONFLICT` is dropped in both modes — conflicts are structurally impossible
when only one direction is ever written at a time.

### Store (`apps/web`)

| Current                                              | Proposed                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `syncWithLocalFolder()` — bidirectional              | `vault.push()` and `vault.pull()`                          |
| SYNC button (bidirectional)                          | SAVE TO FOLDER (push) in VaultControls                     |
| _(missing)_                                          | LOAD FROM FOLDER (pull) in VaultSwitcherModal              |
| Switch calls flush + sync                            | Switch calls flush only (no filesystem touch)              |
| Two independent status fields                        | One shared `VaultStatus = "idle" \| "saving" \| "loading"` |
| `window CustomEvent` + `vaultEventBus` (dual events) | Consolidate to `vaultEventBus` only                        |

---

## Small fixes to land alongside

| Fix                                                                      | Where                    | Effort |
| ------------------------------------------------------------------------ | ------------------------ | ------ |
| Vault ID guard in `_persistEntity()` — discard if vault changed mid-save | `entity-store.svelte.ts` | 5 min  |
| Set `status → idle` only after maps + canvases finish loading            | `sync-store.svelte.ts`   | 15 min |
| Parallelize `loadMaps()` + `loadCanvases()`                              | `sync-store.svelte.ts`   | 10 min |
| Per-vault Oracle chat save/restore (issue #691)                          | `oracle.svelte.ts`       | 2–3 h  |
