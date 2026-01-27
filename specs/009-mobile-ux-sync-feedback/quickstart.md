# Quickstart: Mobile UX & Sync Feedback

## Prerequisites
- Cloud Sync must be configured (see `003-gdrive-mirroring`) to test the full feedback loop.

## Development Steps

1. **Verify Responsive Header**:
   - Open browser devtools and toggle device emulation (iPhone SE).
   - Ensure the logo collapses to "CA" and the search bar wraps correctly.

2. **Trigger Sync Animation**:
   - Enable Cloud Bridge in settings.
   - Click "SYNC NOW" in the cloud menu.
   - Verify the ⚡ icon pulses and the "SYNCING" text appears.

3. **Test Mobile Entity Panel**:
   - With mobile emulation active, select an entity in the graph.
   - Verify the `EntityDetailPanel` occupies the full screen width and can be closed via the 'X' button.

## Verification
```bash
# Run unit tests for the sync-stats store
npm run test:unit --prefix apps/web src/stores/sync-stats.test.ts

# Run E2E tests for responsiveness and visual feedback
npm run test:e2e --prefix apps/web
```
