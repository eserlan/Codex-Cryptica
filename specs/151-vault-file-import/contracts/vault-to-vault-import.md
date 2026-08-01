# UI Contract: Import Files from Another Vault

## Source selection

- List every vault registered in this browser other than the current vault; if none exist, communicate there's nothing to import from instead of showing an empty picker.
- Opening a source vault that fails to read shows a clear error and returns to source selection; the current vault is untouched.

## File selection

- Present the chosen source vault's files for individual, multi-, or select-all selection.
- Selecting zero files disables the confirm action.

## Review

- Identify the source vault by name.
- State the number of files (and their images) that will be added, the number of conflicting paths that will be skipped, and the number of referenced images that could not be found in the source vault.
- Require an explicit confirmation to write.
- Do not offer overwrite or delete controls.
- Disable the confirm action when nothing would be added (all-conflict selection).

## Result

- On success, keep the current vault active, report added/skipped/missing-image counts, and make imported files immediately visible/searchable (no manual reload).
- On cancellation, source-read error, or all-conflict selection, do not write anything.
- On a partial write failure, report exactly what was and wasn't added; never claim a false success, and never leave an existing target file modified.
