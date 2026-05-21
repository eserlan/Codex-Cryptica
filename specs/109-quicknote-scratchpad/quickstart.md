# Quickstart: QuickNote & Elevation

## Performance Verification

- **Capture Speed**: Open the app, press `Ctrl+I`, and type a note. The UI must respond instantly (<100ms).
- **Auto-save**: Type a note and refresh the browser. The note should still be present in the history.

## Visual Verification

- **Graph Style**: Un-elevated notes must appear as golden nodes with dotted borders.
- **Elevation Flow**: Click 'Elevate' on a note. The AI sidebar should open with a draft. Upon clicking 'Approve', the dotted node must turn into a standard entity node.

## Integration Tests

- `QuickNoteService.test.ts`: Verify IndexedDB CRUD operations.
- `OracleElevation.test.ts`: Verify note content is correctly transformed into AI prompts.
