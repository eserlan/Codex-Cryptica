# UI Contract: Current Vault Import

## Input

- Accept one existing Codex Cryptica portable backup file from drag-and-drop or file picker.
- Reject non-backup, malformed, unsafe, incomplete, and unsupported newer backups before confirmation.

## Review

- Identify the source vault by name.
- State the number of files to add and number of conflicting paths to skip.
- Require an explicit confirmation to write.
- Do not offer overwrite or delete controls.

## Result

- On success, retain the current vault and report added/skipped counts.
- On cancellation, error, or all-conflict input, do not write files.
