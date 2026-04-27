# Load/Save Language Analysis

Issue: [#731](https://github.com/eserlan/Codex-Cryptica/issues/731)

## Situation

The repo currently uses `sync` for several different concepts:

- User-facing actions that actually mean `load from folder` or `save to folder`
- Internal coordination between the vault, OPFS, IndexedDB, and local folder handles
- Historical names in docs, help content, and store/service APIs

That makes the codebase harder to read because the same word is doing too much work. In the UI, users are not performing a vague sync action; they are either loading data from a folder or saving data to a folder. The internal engine still does reconciliation work, so `sync` is not wrong everywhere, but it is too broad for the app-facing surface.

## What Is Already Clear

- The vault UI already expresses parts of the flow directionally.
- The save and load buttons can be described in plain language without losing accuracy.
- The low-level engine and coordinator names are still serviceable as internal implementation details.

## Recommended Direction

Use `load` and `save` for anything the user sees or triggers directly.

Keep `sync` only where the code is truly doing bidirectional reconciliation or internal plumbing that does not leak into the UI.

This leads to a clean split:

- `Load from Folder` for pulling folder data into the app
- `Save to Folder` for writing app data back to the linked folder
- `sync` only for reconciliation logic, conflict handling, and internal engine helpers

## Proposed Scope

### Phase 1: User-Facing Language

Update the visible language in the vault UI first:

- Button labels
- Tooltips and aria labels
- Status text
- Help articles and docs that explain the folder workflow

This gives the biggest clarity gain with the lowest risk.

### Phase 2: Store API Wrappers

Add explicit wrapper methods at the vault store boundary:

- `loadFromFolder()`
- `saveToFolder()`

Keep the current `pull()` / `push()` methods as compatibility aliases for now if existing code still depends on them. That avoids a large breaking refactor while the terminology settles.

### Phase 3: Internal Renames Only If Needed

After the public surface is consistent, decide whether the internal names still need cleanup:

- `SyncStore`
- `SyncCoordinator`
- `syncHandle_*`
- file names and package names

These can stay as implementation terms unless they continue to leak confusing language into the app.

## What Not To Do Yet

- Do not bulk rename every `sync` token in the repository.
- Do not rename stable internal engine packages unless the current name is actively confusing users or maintainers.
- Do not change deep-link IDs or file names unless there is a concrete reason.

## Risks

- A broad rename can create mixed terminology if it is only partially applied.
- Renaming public APIs too early can create unnecessary churn in tests and call sites.
- Changing help/article IDs may break links, so content can be rewritten before identifiers are renamed.

## Practical Next Step

Start with a focused terminology pass over the vault UI and help content, then add explicit `loadFromFolder` / `saveToFolder` wrappers at the vault boundary. After that, review whether the internal `sync` names are still acceptable or should be scheduled for a separate cleanup.

## Current PR

This branch implements the first phase described above. For the merge-ready summary of what is included now versus what should stay for a later PR, see [LOAD_SAVE_LANGUAGE_NEXT_PHASE.md](/home/espen/proj/Codex-Arcana/docs/refactoring/LOAD_SAVE_LANGUAGE_NEXT_PHASE.md).
