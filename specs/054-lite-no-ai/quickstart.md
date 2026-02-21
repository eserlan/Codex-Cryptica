# Quickstart: Lite Version (No AI Support)

## Development Setup

1. **Enable Lite Mode**: Open Application Settings and toggle "Lite Mode" to ON.
2. **Verify UI**: Ensure the "Draw" buttons are gone from Entity Detail panels and the Oracle window shows a restricted command list.
3. **Test Network**: Open browser DevTools (Network tab) and verify no requests are sent to `generativelanguage.googleapis.com`.

## Key Files

- `apps/web/src/lib/stores/ui.svelte.ts`: Main `liteMode` state.
- `apps/web/src/lib/stores/oracle.svelte.ts`: Logic for **Restricted Mode** command handling.
- `apps/web/src/lib/services/ai.ts`: Gatekeeping AI SDK initialization.

## Manual Verification

| Action                     | Expected Result                                               |
| -------------------------- | ------------------------------------------------------------- |
| Toggle Lite Mode ON        | UI immediately refreshes, AI elements disappear.              |
| Type `/help` in Oracle     | Shows list of available utility commands.                     |
| Type `/connect "A" to "B"` | Connection created successfully without AI delay.             |
| Type "Hello" in Oracle     | Oracle responds with "AI features are disabled in Lite Mode." |
