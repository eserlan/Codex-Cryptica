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

## Recommended Next Step

If the repo wants to fully retire `sync` from the vault subsystem, do that in a separate follow-up PR after this one merges.

That follow-up should be scoped to internal naming only, so it can be reviewed independently from the user-facing wording change.
