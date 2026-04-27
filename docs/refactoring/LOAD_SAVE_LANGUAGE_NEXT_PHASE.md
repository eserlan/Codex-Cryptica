# Load/Save Language Next Phase

Related issue: [#731](https://github.com/eserlan/Codex-Cryptica/issues/731)

Related analysis: [LOAD_SAVE_LANGUAGE_ANALYSIS.md](/home/espen/proj/Codex-Arcana/docs/refactoring/LOAD_SAVE_LANGUAGE_ANALYSIS.md)

## What This PR Covers

This PR is the first phase of the terminology cleanup:

- user-facing vault actions now say `load` and `save`
- the vault boundary exposes explicit `loadFromFolder()` and `saveToFolder()` entry points
- help content and button labels use the directional language

## What It Does Not Cover

This PR does not rename the deeper internal sync implementation yet:

- `SyncStore`
- `SyncCoordinator`
- `syncHandle_*`
- other internal `sync`-named helpers and files

Those names remain in place intentionally so the change stays focused and mergeable.

## Codewise Next Step

The follow-up should remove `sync` terminology from the vault-facing code in layers, not as one giant rename.

### 1. Add A Thin Vault Facade

Keep `VaultStore` as the public entry point and introduce directional method names there first:

- `loadFromFolder()` for folder-to-app reads
- `saveToFolder()` for app-to-folder writes

Let those methods delegate to the existing sync engine for now. That keeps the behavior unchanged while the terminology changes.

### 2. Rename Vault Store Call Sites

Update app code to call the directional methods instead of `push()`, `pull()`, or `syncWithLocalFolder()`:

- `VaultControls.svelte`
- `VaultSwitcherModal.svelte`
- `VaultLifecycleManager`
- any other vault UI or orchestration code that triggers folder reads or writes

Keep `push()` and `pull()` only as compatibility aliases until the whole surface has moved over.

### 3. Split Internal Naming By Responsibility

Rename the implementation boundary only after the public facade is stable:

- `SyncStore` can become a more explicit vault-folder service/store name
- `SyncCoordinator` can become a folder reconciliation coordinator
- helper names like `syncHandle_*` should become `folderHandle_*` or `vaultFolderHandle_*`

The goal is to make internal names describe the actual responsibility instead of repeating `sync` everywhere.

### 4. Normalize Local Status Language

After the method names move, update the remaining status strings and errors to match the directional verbs:

- `loading`
- `saving`
- `Load failed`
- `Save failed`
- `Load from Folder`
- `Save to Folder`

This keeps the UI vocabulary consistent with the code vocabulary.

### 5. Clean Up Tests And Docs Together

The rename should land with matching test updates so the repo does not end up with mixed terms:

- update test names to `load` / `save`
- keep one compatibility test for any alias that remains temporarily
- rewrite docs/help content that still says “sync” when it really means load/save

## Recommended Next Step

If the repo wants to fully retire `sync` from the vault subsystem, do that in a separate follow-up PR after this one merges.

That follow-up should be scoped to internal naming and call-site migration only, so it can be reviewed independently from the user-facing wording change.
