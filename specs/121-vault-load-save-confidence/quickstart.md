# Quickstart Guide: Vault Load/Save Confidence

This guide explains how to run, test, and verify the new directional vault load and save behaviors.

## Verification of Permission States

To simulate expired browser permissions (triggering the `needs-permission` state):

1. Open the application.
2. Link a vault to a local folder by clicking **OPEN FOLDER** in the Vault Switcher.
3. Once linked, **reload the browser tab** or open the page in a new window. Browser security will automatically reset the folder permissions to `"prompt"`.
4. Observe the page load:
   - No automatic file picker dialog appears.
   - The vault successfully displays entities from the cache.
   - The header displays an amber **GRANT ACCESS** button.
5. Click **GRANT ACCESS** and allow permissions. The vault will save/load and the status will transition to **SAVED** (then back to **IDLE** after 3 seconds).

## Verification of Vault Switch Timeout

To verify that vault switching is non-blocking:

1. Run the application in developmental mode:
   ```bash
   bun run dev
   ```
2. Link folders on multiple vaults.
3. Switch vaults. If write operations take too long (simulated or actual), notice that the vault switch still completes within 5 seconds without blocking the UI indefinitely.

## Running Tests

To run the updated test suites specifically covering these behaviors:

```bash
# Run vault-engine tests
bun run --filter @codex/vault-engine test

# Run web app tests
bun run --filter web test
```
