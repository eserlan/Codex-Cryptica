# Quickstart: Multi-Campaign Switch

## Setup & Verification

### 1. Initial Migration

- Open the application.
- If you have an existing vault, it should automatically move to `vaults/default`.
- Verify by checking the "Vaults" modal (to be implemented) or console logs.

### 2. Creating a New Vault

- Open the Vault Switcher modal.
- Click "New Vault".
- Enter "Chronicles of Shadow".
- Verify that the graph clears and you are now in an empty workspace.

### 3. Switching and Isolation

- Create a node "Hero" in "Chronicles of Shadow".
- Switch back to "Default Vault".
- Verify "Hero" is NOT visible.
- Switch back to "Chronicles of Shadow".
- Verify "Hero" IS visible.

## Development Commands

### Performance Check

- Switching between vaults should feel instantaneous (< 500ms).
- Use `DebugConsole` (F12) to monitor load times.

### Manual Reset (Testing)

To reset vaults during development:

```javascript
// in browser console
await (await getDB()).clear("vaults");
await (await getDB()).put("settings", null, "activeVaultId");
// Clear OPFS manually via DevTools if needed
```
