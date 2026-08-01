# Research: Current Vault File Import

## Decision: Reuse portable `.codex.zip` backups as the source

**Rationale**: The app already exports a versioned manifest plus all vault files to this browser-portable format and validates it before restore. It is the only format that reliably represents files from another local vault without requiring direct browser filesystem access.

**Alternatives considered**:

- Raw dropped Markdown files: lacks the backup manifest and cannot safely include associated assets or vault metadata.
- Directly selecting another local vault: unnecessary new UI and a less portable workflow; the browser already supports the backup/download/upload path everywhere.

## Decision: Build a copy plan before writing

**Rationale**: A source file is safe to add only if its relative path does not already exist in the target vault. Calculating added and skipped sets before confirmation provides an understandable review and prevents accidental overwrites.

**Alternatives considered**:

- Overwrite target paths after confirmation: risks losing current-vault work and exceeds the requested import/include workflow.
- Auto-rename every conflict: would create duplicate entity and metadata files without a meaningful user decision.

## Decision: Keep the existing restore-as-new-vault action

**Rationale**: Restoring an isolated backup remains the safest recovery workflow. Current-vault import is a separate additive action and must not change that behavior.

## Decision: Use the existing confirmation modal rather than a new custom dialog

**Rationale**: It already provides accessible focus management and confirmation/cancellation semantics. The prepared import summary supplies the details needed for an informed choice.
